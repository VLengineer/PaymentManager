from sqlalchemy import Column, Integer, String, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    RP = "RP"
    FIN_DIRECTOR = "FIN_DIRECTOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.RP, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    projects = relationship("UserProject", back_populates="user")
