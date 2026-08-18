from sqlalchemy import Column, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum


class BudgetCategoryType(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class BudgetCategory(Base):
    __tablename__ = "budget_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Технологическое присоединение"
    category_type = Column(SQLEnum(BudgetCategoryType), nullable=False)
    parent_id = Column(Integer, nullable=True)  # For hierarchical categories
    
    # Relationships
    payments = relationship("Payment", back_populates="category")
    
    def __repr__(self):
        return f"<BudgetCategory {self.name} ({self.category_type})>"
