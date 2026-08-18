from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.project import Project
from app.api.auth import get_current_user

router = APIRouter()


class ProjectResponse(BaseModel):
    id: int
    cfo_code: str
    name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    cfo_code: str
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("/", response_model=List[ProjectResponse])
async def get_all_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # RP sees only their projects, others see all
    if current_user.role == UserRole.RP:
        # Get user's projects through user_project mapping
        from app.models.user_project import UserProject
        user_projects = db.query(UserProject).filter(UserProject.user_id == current_user.id).all()
        project_ids = [up.project_id for up in user_projects]
        
        if not project_ids:
            return []
        
        projects = db.query(Project).filter(Project.id.in_(project_ids)).offset(skip).limit(limit).all()
    else:
        projects = db.query(Project).offset(skip).limit(limit).all()
    
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check access for RP
    if current_user.role == UserRole.RP:
        from app.models.user_project import UserProject
        user_project = db.query(UserProject).filter(
            UserProject.user_id == current_user.id,
            UserProject.project_id == project_id
        ).first()
        
        if not user_project and current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
    
    return project


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can create projects
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can create projects"
        )
    
    # Check if cfo_code already exists
    existing = db.query(Project).filter(Project.cfo_code == project_data.cfo_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project with this CFO code already exists"
        )
    
    db_project = Project(**project_data.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can update projects
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can update projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can delete projects
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}
