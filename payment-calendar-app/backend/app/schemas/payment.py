from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import date
from enum import Enum
from decimal import Decimal


class UserRoleEnum(str, Enum):
    RP = "RP"
    FIN_DIRECTOR = "FIN_DIRECTOR"
    ADMIN = "ADMIN"


class PaymentStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRoleEnum = UserRoleEnum.RP


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# Project schemas
class ProjectBase(BaseModel):
    cfo_code: str
    name: str


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# Contractor schemas
class ContractorBase(BaseModel):
    name: str
    inn: Optional[str] = None


class ContractorCreate(ContractorBase):
    pass


class ContractorResponse(ContractorBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# Budget Category schemas
class BudgetCategoryBase(BaseModel):
    name: str
    category_type: str  # INCOME or EXPENSE
    parent_id: Optional[int] = None


class BudgetCategoryCreate(BudgetCategoryBase):
    pass


class BudgetCategoryResponse(BudgetCategoryBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


# Payment schemas
class PaymentBase(BaseModel):
    project_id: int
    contractor_id: int
    category_id: int
    period_start: date
    amount_plan: Decimal = Field(..., ge=0)
    comment: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    amount_plan: Optional[Decimal] = None
    comment: Optional[str] = None


class PaymentFactUpdate(BaseModel):
    amount_fact: Decimal = Field(..., ge=0)


class PaymentRolloverRequest(BaseModel):
    payment_id: int
    target_period_start: date


class PaymentResponse(PaymentBase):
    id: int
    amount_fact: Decimal = Decimal(0)
    amount_rollover: Decimal = Decimal(0)
    status: PaymentStatusEnum
    is_locked: bool = False
    parent_payment_id: Optional[int] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


# Calendar Matrix schemas
class CalendarMatrixCell(BaseModel):
    payment_id: Optional[int] = None
    project_id: int
    project_name: str
    contractor_id: int
    contractor_name: str
    category_id: int
    category_name: str
    period_start: date
    amount_plan: Decimal
    amount_fact: Decimal = Decimal(0)
    amount_rollover: Decimal = Decimal(0)
    status: PaymentStatusEnum
    is_locked: bool = False


class CalendarMatrixRequest(BaseModel):
    project_ids: Optional[List[int]] = None
    date_from: date
    date_to: date
    group_by: str = "category"  # "category" or "project"


class CalendarMatrixResponse(BaseModel):
    rows: List[CalendarMatrixCell]
    columns: List[date]  # Period starts
    totals: dict = {}  # Totals by column/row
