from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class UserProject(Base):
    __tablename__ = "user_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    project = relationship("Project", back_populates="users")
    
    def __repr__(self):
        return f"<UserProject user_id={self.user_id} project_id={self.project_id}>"
