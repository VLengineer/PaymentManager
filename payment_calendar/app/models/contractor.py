from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class Contractor(Base):
    __tablename__ = "contractors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "ЭЛЕКТРОТЕХМОНТАЖ ТД АО"
    inn = Column(String, nullable=True)  # Tax ID
    kpp = Column(String, nullable=True)  # Tax registration code
    
    # Relationships
    payments = relationship("Payment", back_populates="contractor")
    
    def __repr__(self):
        return f"<Contractor {self.name}>"
