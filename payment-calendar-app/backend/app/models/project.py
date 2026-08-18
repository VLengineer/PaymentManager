from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    cfo_code = Column(String, unique=True, index=True, nullable=False)  # e.g., "25_004_РВК"
    name = Column(String, nullable=False)  # e.g., "ООО_СЭ_ЛИПЕЦК_ВНС 3"
    is_active = Column(Boolean, default=True)

    # Relationships
    payments = relationship("Payment", back_populates="project")
    users = relationship("UserProject", back_populates="project")


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # e.g., "ЭЛЕКТРОТЕХМОНТАЖ ТД АО"
    inn = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    payments = relationship("Payment", back_populates="contractor")


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Технологическое присоединение"
    category_type = Column(String, nullable=False)  # "INCOME" or "EXPENSE"
    parent_id = Column(Integer, ForeignKey("budget_categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    children = relationship("BudgetCategory", backref="parent", remote_side=[id])
    payments = relationship("Payment", back_populates="category")


class UserProject(Base):
    __tablename__ = "user_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', name='unique_user_project'),
    )

    # Relationships
    user = relationship("User", back_populates="projects")
    project = relationship("Project", back_populates="users")
