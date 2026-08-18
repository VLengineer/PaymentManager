from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    cfo_code = Column(String, unique=True, index=True, nullable=False)  # e.g., "25_004_РВК"
    name = Column(String, nullable=False)  # e.g., "ООО_СЭ_ЛИПЕЦК_ВНС 3"
    description = Column(String, nullable=True)
    
    # Relationships
    payments = relationship("Payment", back_populates="project")
    users = relationship("UserProject", back_populates="project")
    
    def __repr__(self):
        return f"<Project {self.cfo_code}: {self.name}>"
