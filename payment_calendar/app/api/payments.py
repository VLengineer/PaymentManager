from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentStatus
from app.api.auth import get_current_user

router = APIRouter()


class PaymentResponse(BaseModel):
    id: int
    project_id: int
    contractor_id: int
    category_id: int
    parent_payment_id: Optional[int] = None
    period_start: date
    amount_plan: Decimal
    amount_fact: Decimal
    amount_rollover: Decimal
    status: PaymentStatus
    is_locked: bool
    comment: Optional[str] = None
    
    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    project_id: int
    contractor_id: int
    category_id: int
    period_start: date
    amount_plan: Decimal
    comment: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount_plan: Optional[Decimal] = None
    comment: Optional[str] = None


class PaymentFactUpdate(BaseModel):
    amount_fact: Decimal


@router.get("/", response_model=List[PaymentResponse])
async def get_all_payments(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = None,
    status_filter: Optional[PaymentStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Payment)
    
    # RP sees only their projects
    if current_user.role == UserRole.RP:
        from app.models.user_project import UserProject
        user_projects = db.query(UserProject).filter(UserProject.user_id == current_user.id).all()
        project_ids = [up.project_id for up in user_projects]
        
        if not project_ids:
            return []
        
        query = query.filter(Payment.project_id.in_(project_ids))
    
    if project_id:
        query = query.filter(Payment.project_id == project_id)
    
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    
    payments = query.offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Check access for RP
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
    
    return payment


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user has access to the project
    if current_user.role == UserRole.RP:
        from app.models.user_project import UserProject
        user_project = db.query(UserProject).filter(
            UserProject.user_id == current_user.id,
            UserProject.project_id == payment_data.project_id
        ).first()
        
        if not user_project:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
    
    # Check if period is locked
    from app.models.project import Project
    # Add logic to check if period is locked based on your business rules
    
    db_payment = Payment(**payment_data.dict(), status=PaymentStatus.DRAFT)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    return db_payment


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
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
    
    # Cannot edit locked or paid payments
    if payment.is_locked or payment.status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit locked or paid payments"
        )
    
    # Update fields
    if payment_data.amount_plan is not None:
        payment.amount_plan = payment_data.amount_plan
    if payment_data.comment is not None:
        payment.comment = payment_data.comment
    
    db.commit()
    db.refresh(payment)
    
    return payment


@router.patch("/{payment_id}/fact", response_model=PaymentResponse)
async def update_payment_fact(
    payment_id: int,
    fact_data: PaymentFactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only FIN_DIRECTOR or ADMIN can update fact amounts
    if current_user.role not in [UserRole.FIN_DIRECTOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only financial directors can update fact amounts"
        )
    
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Cannot edit locked payments
    if payment.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit locked payments"
        )
    
    # Update fact amount
    payment.amount_fact = fact_data.amount_fact
    
    # Update status based on fact vs plan
    if payment.amount_fact >= payment.amount_plan:
        payment.status = PaymentStatus.PAID
        payment.amount_rollover = 0
    elif payment.amount_fact > 0:
        payment.status = PaymentStatus.PARTIAL
        payment.amount_rollover = payment.amount_plan - payment.amount_fact
    else:
        payment.status = PaymentStatus.DRAFT
        payment.amount_rollover = 0
    
    db.commit()
    db.refresh(payment)
    
    return payment


@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
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
    
    # Cannot delete locked or paid payments
    if payment.is_locked or payment.status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete locked or paid payments"
        )
    
    db.delete(payment)
    db.commit()
    
    return {"message": "Payment deleted successfully"}
