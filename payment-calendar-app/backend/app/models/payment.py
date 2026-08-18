from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Date, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum
from datetime import date


class PaymentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    PARTIAL = "PARTIAL"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("budget_categories.id"), nullable=False, index=True)
    parent_payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, index=True)  # For rollovers
    
    # Period
    period_start = Column(Date, nullable=False, index=True)  # Start of week/month
    period_end = Column(Date, nullable=True)  # End of week/month (optional, can be calculated)
    
    # Amounts
    amount_plan = Column(Numeric(15, 2), nullable=False)  # Planned amount
    amount_fact = Column(Numeric(15, 2), default=0)  # Fact amount (paid by FinDirector)
    amount_rollover = Column(Numeric(15, 2), default=0)  # Rollover remainder
    
    # Status and flags
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.DRAFT, nullable=False)
    is_locked = Column(Boolean, default=False)  # Locked period (past/closed)
    
    # Metadata
    comment = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(Date, default=date.today)
    updated_at = Column(Date, default=date.today, onupdate=date.today)

    # Relationships
    project = relationship("Project", back_populates="payments")
    contractor = relationship("Contractor", back_populates="payments")
    category = relationship("BudgetCategory", back_populates="payments")
    parent_payment = relationship("Payment", remote_side=[id], backref="child_payments")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
