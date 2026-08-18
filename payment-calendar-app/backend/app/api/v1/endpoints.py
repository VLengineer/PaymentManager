from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.payment import (
    UserCreate,
    UserResponse,
    ProjectCreate,
    ProjectResponse,
    ContractorCreate,
    ContractorResponse,
    BudgetCategoryCreate,
    BudgetCategoryResponse,
    PaymentCreate,
    PaymentUpdate,
    PaymentFactUpdate,
    PaymentRolloverRequest,
    PaymentResponse,
    CalendarMatrixRequest,
    CalendarMatrixResponse,
)
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_password_hash
from app.services import payment_service


router = APIRouter()


@router.post("/auth/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    from app.models.user import User
    
    # Check if user exists
    existing = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/calendar/plan", response_model=PaymentResponse)
def create_payment_plan(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new payment plan (RP role)"""
    try:
        payment = payment_service.create_payment(
            db=db,
            payment_data=payment_data,
            user=current_user,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/calendar/plan/{payment_id}", response_model=PaymentResponse)
def update_payment_plan(
    payment_id: int,
    update_data: PaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update payment plan (only DRAFT status)"""
    try:
        payment = payment_service.update_payment_plan(
            db=db,
            payment_id=payment_id,
            update_data=update_data,
            user=current_user,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/calendar/fact/{payment_id}", response_model=PaymentResponse)
def update_payment_fact(
    payment_id: int,
    fact_data: PaymentFactUpdate,
    current_user: User = Depends(require_role([UserRole.FIN_DIRECTOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Update fact amount (FinDirector only)"""
    try:
        payment = payment_service.update_payment_fact(
            db=db,
            payment_id=payment_id,
            fact_data=fact_data,
            user=current_user,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calendar/rollover", response_model=PaymentResponse)
def rollover_payment(
    rollover_data: PaymentRolloverRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rollover payment remainder to next period"""
    try:
        payment = payment_service.rollover_payment(
            db=db,
            payment_id=rollover_data.payment_id,
            target_period_start=rollover_data.target_period_start,
            user=current_user,
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calendar/matrix", response_model=CalendarMatrixResponse)
def get_calendar_matrix(
    request: CalendarMatrixRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get calendar matrix data"""
    return payment_service.get_calendar_matrix(
        db=db,
        user=current_user,
        date_from=request.date_from,
        date_to=request.date_to,
        project_ids=request.project_ids,
        group_by=request.group_by,
    )


@router.post("/calendar/lock-period")
def lock_period(
    period_end: date,
    current_user: User = Depends(require_role([UserRole.FIN_DIRECTOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Lock all payments before specified date (FinDirector only)"""
    try:
        count = payment_service.lock_period(
            db=db,
            period_end=period_end,
            user=current_user,
        )
        return {"message": f"Locked {count} payments"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Dictionary endpoints (CRUD for reference data)
@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get accessible projects"""
    from app.models.project import Project
    from app.services.payment_service import get_user_project_ids
    
    project_ids = get_user_project_ids(db, current_user)
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    return projects


@router.post("/projects", response_model=ProjectResponse)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Create new project (Admin only)"""
    from app.models.project import Project
    
    project = Project(**project_data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/contractors", response_model=List[ContractorResponse])
def get_contractors(db: Session = Depends(get_db)):
    """Get all contractors"""
    from app.models.project import Contractor
    
    return db.query(Contractor).filter(Contractor.is_active == True).all()


@router.post("/contractors", response_model=ContractorResponse)
def create_contractor(
    contractor_data: ContractorCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Create new contractor (Admin only)"""
    from app.models.project import Contractor
    
    contractor = Contractor(**contractor_data.model_dump())
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return contractor


@router.get("/categories", response_model=List[BudgetCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Get all budget categories"""
    from app.models.project import BudgetCategory
    
    return db.query(BudgetCategory).filter(BudgetCategory.is_active == True).all()


@router.post("/categories", response_model=BudgetCategoryResponse)
def create_category(
    category_data: BudgetCategoryCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db),
):
    """Create new budget category (Admin only)"""
    from app.models.project import BudgetCategory
    
    category = BudgetCategory(**category_data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
