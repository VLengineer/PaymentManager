from sqlalchemy import Column, Integer, String, ForeignKey, Date, Numeric, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    RP = "RP"
    FIN_DIRECTOR = "FIN_DIRECTOR"
    ADMIN = "ADMIN"


class PaymentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.RP, nullable=False)
    
    # Relationships
    projects = relationship("UserProject", back_populates="user")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    cfo_code = Column(String, unique=True, index=True, nullable=False)  # e.g., "25_004_РВК"
    name = Column(String, nullable=False)  # e.g., "ООО_СЭ_ЛИПЕЦК_ВНС 3"
    
    # Relationships
    payments = relationship("Payment", back_populates="project")
    users = relationship("UserProject", back_populates="project")


class Contractor(Base):
    __tablename__ = "contractors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    
    # Relationships
    payments = relationship("Payment", back_populates="contractor")


class BudgetCategory(Base):
    __tablename__ = "budget_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_type = Column(SQLEnum("INCOME", "EXPENSE", name="category_type_enum"), nullable=False)
    
    # Relationships
    payments = relationship("Payment", back_populates="category")


class UserProject(Base):
    """Mapping table for User <-> Project access control"""
    __tablename__ = "user_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    project = relationship("Project", back_populates="users")


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("budget_categories.id"), nullable=False, index=True)
    parent_payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)  # For rollovers
    
    period_start = Column(Date, nullable=False, index=True)  # Start of week/month
    amount_plan = Column(Numeric(15, 2), nullable=False)
    amount_fact = Column(Numeric(15, 2), default=0)
    amount_rollover = Column(Numeric(15, 2), default=0)
    
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.DRAFT, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    comment = Column(String, nullable=True)
    
    created_at = Column(Date, server_default=func.now())
    updated_at = Column(Date, onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="payments")
    contractor = relationship("Contractor", back_populates="payments")
    category = relationship("BudgetCategory", back_populates="payments")
    parent_payment = relationship("Payment", remote_side=[id], backref="rollover_payments")
