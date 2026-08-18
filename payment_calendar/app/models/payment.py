from sqlalchemy import Column, Integer, String, Date, Numeric, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


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
    
    # Amounts
    amount_plan = Column(Numeric(15, 2), nullable=False)  # Planned amount
    amount_fact = Column(Numeric(15, 2), default=0)  # Actual paid amount
    amount_rollover = Column(Numeric(15, 2), default=0)  # Rollover amount
    
    # Status and flags
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.DRAFT, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)  # Locked past periods
    comment = Column(String, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="payments")
    contractor = relationship("Contractor", back_populates="payments")
    category = relationship("BudgetCategory", back_populates="payments")
    parent_payment = relationship("Payment", remote_side=[id], backref="rollover_payments")
    
    def __repr__(self):
        return f"<Payment {self.id}: {self.amount_plan} ({self.status})>"
