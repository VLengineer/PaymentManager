from sqlalchemy import Column, Integer, String, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
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
    is_active = Column(String, default="true")
    
    # Relationships
    projects = relationship("UserProject", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
