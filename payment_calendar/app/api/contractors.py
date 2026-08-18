from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.contractor import Contractor
from app.api.auth import get_current_user

router = APIRouter()


class ContractorResponse(BaseModel):
    id: int
    name: str
    inn: Optional[str] = None
    kpp: Optional[str] = None
    
    class Config:
        from_attributes = True


class ContractorCreate(BaseModel):
    name: str
    inn: Optional[str] = None
    kpp: Optional[str] = None


class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None


@router.get("/", response_model=List[ContractorResponse])
async def get_all_contractors(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Contractor)
    
    if search:
        query = query.filter(Contractor.name.ilike(f"%{search}%"))
    
    contractors = query.offset(skip).limit(limit).all()
    return contractors


@router.get("/{contractor_id}", response_model=ContractorResponse)
async def get_contractor(
    contractor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found"
        )
    
    return contractor


@router.post("/", response_model=ContractorResponse)
async def create_contractor(
    contractor_data: ContractorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can create contractors
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can create contractors"
        )
    
    # Check if name already exists
    existing = db.query(Contractor).filter(Contractor.name == contractor_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contractor with this name already exists"
        )
    
    db_contractor = Contractor(**contractor_data.dict())
    db.add(db_contractor)
    db.commit()
    db.refresh(db_contractor)
    
    return db_contractor


@router.put("/{contractor_id}", response_model=ContractorResponse)
async def update_contractor(
    contractor_id: int,
    contractor_data: ContractorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can update contractors
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can update contractors"
        )
    
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found"
        )
    
    # Update fields
    if contractor_data.name is not None:
        contractor.name = contractor_data.name
    if contractor_data.inn is not None:
        contractor.inn = contractor_data.inn
    if contractor_data.kpp is not None:
        contractor.kpp = contractor_data.kpp
    
    db.commit()
    db.refresh(contractor)
    
    return contractor


@router.delete("/{contractor_id}")
async def delete_contractor(
    contractor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can delete contractors
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete contractors"
        )
    
    contractor = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor not found"
        )
    
    db.delete(contractor)
    db.commit()
    
    return {"message": "Contractor deleted successfully"}
