from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal

from app.models.payment import Payment, PaymentStatus
from app.models.project import Project, Contractor, BudgetCategory, UserProject
from app.models.user import User, UserRole
from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
    PaymentFactUpdate,
    CalendarMatrixCell,
    CalendarMatrixResponse,
)


def get_user_project_ids(db: Session, user: User) -> List[int]:
    """Get all project IDs accessible by user based on role"""
    if user.role == UserRole.ADMIN or user.role == UserRole.FIN_DIRECTOR:
        # Admin and FinDirector can see all projects
        all_projects = db.query(Project.id).filter(Project.is_active == True).all()
        return [p[0] for p in all_projects]
    
    # RP can only see assigned projects
    user_projects = db.query(UserProject.project_id).filter(
        UserProject.user_id == user.id
    ).all()
    return [up[0] for up in user_projects]


def is_period_locked(db: Session, period_start: date) -> bool:
    """Check if a period is locked (past periods are automatically locked)"""
    today = date.today()
    # Lock periods that ended before today
    # You can add custom logic here (e.g., lock previous month)
    return period_start < today


def create_payment(
    db: Session,
    payment_data: PaymentCreate,
    user: User,
    period_end: Optional[date] = None
) -> Payment:
    """Create a new payment plan"""
    # Check if period is locked
    if is_period_locked(db, payment_data.period_start):
        raise ValueError("Cannot create payment in locked period")
    
    # Check user has access to project
    user_project_ids = get_user_project_ids(db, user)
    if payment_data.project_id not in user_project_ids:
        raise ValueError("User does not have access to this project")
    
    payment = Payment(
        **payment_data.model_dump(),
        period_end=period_end,
        status=PaymentStatus.DRAFT,
        created_by=user.id,
        updated_by=user.id,
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def update_payment_plan(
    db: Session,
    payment_id: int,
    update_data: PaymentUpdate,
    user: User
) -> Payment:
    """Update payment plan (only for DRAFT status and unlocked periods)"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError("Payment not found")
    
    # Check permissions
    user_project_ids = get_user_project_ids(db, user)
    if payment.project_id not in user_project_ids:
        raise ValueError("User does not have access to this payment")
    
    # Can only edit DRAFT payments
    if payment.status != PaymentStatus.DRAFT:
        raise ValueError("Can only edit DRAFT payments")
    
    # Check if period is locked
    if payment.is_locked or is_period_locked(db, payment.period_start):
        raise ValueError("Cannot edit payment in locked period")
    
    # Update fields
    if update_data.amount_plan is not None:
        payment.amount_plan = update_data.amount_plan
    if update_data.comment is not None:
        payment.comment = update_data.comment
    
    payment.updated_by = user.id
    db.commit()
    db.refresh(payment)
    return payment


def update_payment_fact(
    db: Session,
    payment_id: int,
    fact_data: PaymentFactUpdate,
    user: User
) -> Payment:
    """Update fact amount (FinDirector only)"""
    if user.role != UserRole.FIN_DIRECTOR and user.role != UserRole.ADMIN:
        raise ValueError("Only FinDirector can update fact amounts")
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError("Payment not found")
    
    # Update fact amount
    payment.amount_fact = fact_data.amount_fact
    payment.updated_by = user.id
    
    # Determine status based on fact vs plan
    if payment.amount_fact >= payment.amount_plan:
        payment.status = PaymentStatus.PAID
        payment.amount_rollover = Decimal(0)
    elif payment.amount_fact > 0:
        payment.status = PaymentStatus.PARTIAL
        payment.amount_rollover = payment.amount_plan - payment.amount_fact
    else:
        payment.status = PaymentStatus.DRAFT
        payment.amount_rollover = Decimal(0)
    
    db.commit()
    db.refresh(payment)
    return payment


def rollover_payment(
    db: Session,
    payment_id: int,
    target_period_start: date,
    user: User,
    target_period_end: Optional[date] = None
) -> Payment:
    """Create rollover payment for the remainder"""
    original_payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not original_payment:
        raise ValueError("Payment not found")
    
    # Check permissions
    user_project_ids = get_user_project_ids(db, user)
    if original_payment.project_id not in user_project_ids:
        raise ValueError("User does not have access to this payment")
    
    # Can only rollover PARTIAL payments
    if original_payment.status != PaymentStatus.PARTIAL:
        raise ValueError("Can only rollover PARTIAL payments")
    
    if original_payment.amount_rollover <= 0:
        raise ValueError("No amount to rollover")
    
    # Check if target period is locked
    if is_period_locked(db, target_period_start):
        raise ValueError("Target period is locked")
    
    # Create new payment for the rollover amount
    rollover_payment = Payment(
        project_id=original_payment.project_id,
        contractor_id=original_payment.contractor_id,
        category_id=original_payment.category_id,
        parent_payment_id=original_payment.id,
        period_start=target_period_start,
        period_end=target_period_end,
        amount_plan=original_payment.amount_rollover,
        amount_fact=Decimal(0),
        amount_rollover=Decimal(0),
        status=PaymentStatus.DRAFT,
        comment=f"Перенос от платежа #{payment_id}",
        created_by=user.id,
        updated_by=user.id,
    )
    
    # Lock original payment
    original_payment.status = PaymentStatus.APPROVED  # Or keep as PARTIAL but mark as processed
    original_payment.is_locked = True
    
    db.add(rollover_payment)
    db.commit()
    db.refresh(rollover_payment)
    return rollover_payment


def get_calendar_matrix(
    db: Session,
    user: User,
    date_from: date,
    date_to: date,
    project_ids: Optional[List[int]] = None,
    group_by: str = "category"
) -> CalendarMatrixResponse:
    """Get calendar matrix data for UI"""
    # Get accessible projects
    accessible_project_ids = get_user_project_ids(db, user)
    
    # Filter by provided project_ids if specified
    if project_ids:
        project_ids = list(set(project_ids) & set(accessible_project_ids))
    else:
        project_ids = accessible_project_ids
    
    if not project_ids:
        return CalendarMatrixResponse(rows=[], columns=[], totals={})
    
    # Generate periods (weeks or months)
    periods = generate_periods(date_from, date_to)
    
    # Query payments
    payments = db.query(Payment).options(
        joinedload(Payment.project),
        joinedload(Payment.contractor),
        joinedload(Payment.category)
    ).filter(
        Payment.project_id.in_(project_ids),
        Payment.period_start >= date_from,
        Payment.period_start <= date_to
    ).all()
    
    # Build matrix rows
    rows = []
    for payment in payments:
        cell = CalendarMatrixCell(
            payment_id=payment.id,
            project_id=payment.project_id,
            project_name=payment.project.name,
            contractor_id=payment.contractor_id,
            contractor_name=payment.contractor.name,
            category_id=payment.category_id,
            category_name=payment.category.name,
            period_start=payment.period_start,
            amount_plan=payment.amount_plan,
            amount_fact=payment.amount_fact,
            amount_rollover=payment.amount_rollover,
            status=payment.status,
            is_locked=payment.is_locked or is_period_locked(db, payment.period_start),
        )
        rows.append(cell)
    
    # Calculate totals
    totals = calculate_totals(rows, periods)
    
    return CalendarMatrixResponse(
        rows=rows,
        columns=periods,
        totals=totals
    )


def generate_periods(date_from: date, date_to: date, period_type: str = "week") -> List[date]:
    """Generate list of period start dates"""
    periods = []
    current = date_from
    
    while current <= date_to:
        periods.append(current)
        if period_type == "week":
            current += timedelta(weeks=1)
        else:  # month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1, day=1)
            else:
                current = current.replace(month=current.month + 1, day=1)
    
    return periods


def calculate_totals(rows: List[CalendarMatrixCell], periods: List[date]) -> Dict[str, Any]:
    """Calculate totals by column and row"""
    column_totals = {str(p): Decimal(0) for p in periods}
    row_totals = {}
    
    for row in rows:
        key = f"{row.project_id}_{row.contractor_id}_{row.category_id}"
        if key not in row_totals:
            row_totals[key] = {
                "project_name": row.project_name,
                "contractor_name": row.contractor_name,
                "category_name": row.category_name,
                "total_plan": Decimal(0),
                "total_fact": Decimal(0),
            }
        
        row_totals[key]["total_plan"] += row.amount_plan
        row_totals[key]["total_fact"] += row.amount_fact
        
        period_key = str(row.period_start)
        if period_key in column_totals:
            column_totals[period_key] += row.amount_plan
    
    return {
        "by_column": {k: float(v) for k, v in column_totals.items()},
        "by_row": row_totals,
    }


def lock_period(db: Session, period_end: date, user: User) -> int:
    """Lock all payments before specified date (FinDirector/Admin only)"""
    if user.role != UserRole.FIN_DIRECTOR and user.role != UserRole.ADMIN:
        raise ValueError("Only FinDirector can lock periods")
    
    payments = db.query(Payment).filter(
        Payment.period_start < period_end,
        Payment.is_locked == False
    ).all()
    
    count = 0
    for payment in payments:
        payment.is_locked = True
        count += 1
    
    db.commit()
    return count
