from typing import List, Optional, Dict, Any
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from collections import defaultdict

from app.database import get_db
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentStatus
from app.models.project import Project
from app.models.contractor import Contractor
from app.models.budget_category import BudgetCategory
from app.api.auth import get_current_user

router = APIRouter()


class CalendarMatrixRow(BaseModel):
    """Represents a row in the calendar matrix"""
    id: int
    project_id: int
    project_name: str
    contractor_id: int
    contractor_name: str
    category_id: int
    category_name: str
    period_start: date
    amount_plan: Decimal
    amount_fact: Decimal
    amount_rollover: Decimal
    status: PaymentStatus
    is_locked: bool
    comment: Optional[str] = None


class CalendarMatrixResponse(BaseModel):
    """Response for calendar matrix endpoint"""
    rows: List[CalendarMatrixRow]
    periods: List[date]
    totals: Dict[str, Decimal]


@router.get("/matrix", response_model=CalendarMatrixResponse)
async def get_calendar_matrix(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    project_ids: Optional[List[int]] = None,
    group_by: str = "project",  # Options: project, category
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get calendar matrix data for the payment calendar view.
    Returns data grouped by periods (weeks/months) with payments as rows.
    """
    # Set default date range if not provided (next 3 months)
    if not date_from:
        date_from = date.today()
    if not date_to:
        date_to = date_from + timedelta(days=90)
    
    # Build query
    query = db.query(Payment).join(Project).join(Contractor).join(BudgetCategory)
    
    # Apply date filter
    query = query.filter(
        Payment.period_start >= date_from,
        Payment.period_start <= date_to
    )
    
    # Apply project filter based on user role
    if current_user.role == UserRole.RP:
        from app.models.user_project import UserProject
        user_projects = db.query(UserProject).filter(UserProject.user_id == current_user.id).all()
        project_ids_from_user = [up.project_id for up in user_projects]
        
        if not project_ids_from_user:
            return CalendarMatrixResponse(rows=[], periods=[], totals={})
        
        # If specific project_ids provided, intersect with user's projects
        if project_ids:
            project_ids = list(set(project_ids) & set(project_ids_from_user))
        else:
            project_ids = project_ids_from_user
        
        query = query.filter(Payment.project_id.in_(project_ids))
    elif project_ids:
        query = query.filter(Payment.project_id.in_(project_ids))
    
    # Execute query
    payments = query.all()
    
    # Generate periods (weekly or monthly based on range)
    days_diff = (date_to - date_from).days
    if days_diff <= 90:
        # Weekly periods
        periods = []
        current = date_from
        while current <= date_to:
            periods.append(current)
            current += timedelta(days=7)
    else:
        # Monthly periods
        periods = []
        current = date_from.replace(day=1)
        while current <= date_to:
            periods.append(current)
            # Move to next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
    
    # Build matrix rows
    rows = []
    for payment in payments:
        row = CalendarMatrixRow(
            id=payment.id,
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
            is_locked=payment.is_locked,
            comment=payment.comment
        )
        rows.append(row)
    
    # Calculate totals
    total_plan = sum(p.amount_plan for p in payments)
    total_fact = sum(p.amount_fact for p in payments)
    total_rollover = sum(p.amount_rollover for p in payments)
    
    totals = {
        "total_plan": total_plan,
        "total_fact": total_fact,
        "total_rollover": total_rollover,
        "cash_gap": total_plan - total_fact
    }
    
    return CalendarMatrixResponse(rows=rows, periods=periods, totals=totals)


class RolloverRequest(BaseModel):
    payment_id: int
    target_period_start: date


class RolloverResponse(BaseModel):
    message: str
    original_payment_id: int
    new_payment_id: Optional[int] = None


@router.post("/rollover", response_model=RolloverResponse)
async def create_rollover(
    rollover_data: RolloverRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a rollover payment for the remaining amount.
    This is used when a payment is partially paid and the remainder needs to be moved to a future period.
    """
    # Get the original payment
    payment = db.query(Payment).filter(Payment.id == rollover_data.payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check access
    if current_user.role == UserRole.RP:
        from app.models.user_project import UserProject
        user_project = db.query(UserProject).filter(
            UserProject.user_id == current_user.id,
            UserProject.project_id == payment.project_id
        ).first()
        
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this payment"
            )
    
    # Check if payment has rollover amount
    if payment.amount_rollover <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rollover amount available"
        )
    
    # Check if target period is in the future
    if rollover_data.target_period_start <= payment.period_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target period must be in the future"
        )
    
    # Create new payment for the rollover amount
    new_payment = Payment(
        project_id=payment.project_id,
        contractor_id=payment.contractor_id,
        category_id=payment.category_id,
        parent_payment_id=payment.id,
        period_start=rollover_data.target_period_start,
        amount_plan=payment.amount_rollover,
        amount_fact=0,
        amount_rollover=0,
        status=PaymentStatus.DRAFT,
        is_locked=False,
        comment=f"Перенос от платежа #{payment.id}"
    )
    
    # Lock the original payment
    payment.is_locked = True
    payment.status = PaymentStatus.CANCELLED
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    return RolloverResponse(
        message="Rollover created successfully",
        original_payment_id=payment.id,
        new_payment_id=new_payment.id
    )


class LockPeriodRequest(BaseModel):
    lock_until: date


@router.post("/lock-period")
async def lock_period(
    lock_data: LockPeriodRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lock all payments until the specified date.
    Only FIN_DIRECTOR or ADMIN can lock periods.
    """
    if current_user.role not in [UserRole.FIN_DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only financial directors or administrators can lock periods"
        )
    
    # Lock all payments until the specified date
    db.query(Payment).filter(
        Payment.period_start < lock_data.lock_until
    ).update({Payment.is_locked: True})
    
    db.commit()
    
    return {
        "message": f"Period locked until {lock_data.lock_until}",
        "locked_until": lock_data.lock_until
    }
