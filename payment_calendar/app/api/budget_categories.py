from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.budget_category import BudgetCategory, BudgetCategoryType
from app.api.auth import get_current_user

router = APIRouter()


class BudgetCategoryResponse(BaseModel):
    id: int
    name: str
    category_type: BudgetCategoryType
    parent_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class BudgetCategoryCreate(BaseModel):
    name: str
    category_type: BudgetCategoryType
    parent_id: Optional[int] = None


class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_type: Optional[BudgetCategoryType] = None
    parent_id: Optional[int] = None


@router.get("/", response_model=List[BudgetCategoryResponse])
async def get_all_categories(
    skip: int = 0,
    limit: int = 100,
    category_type: Optional[BudgetCategoryType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(BudgetCategory)
    
    if category_type:
        query = query.filter(BudgetCategory.category_type == category_type)
    
    categories = query.offset(skip).limit(limit).all()
    return categories


@router.get("/{category_id}", response_model=BudgetCategoryResponse)
async def get_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(BudgetCategory).filter(BudgetCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.post("/", response_model=BudgetCategoryResponse)
async def create_category(
    category_data: BudgetCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can create categories
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can create categories"
        )
    
    db_category = BudgetCategory(**category_data.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category


@router.put("/{category_id}", response_model=BudgetCategoryResponse)
async def update_category(
    category_id: int,
    category_data: BudgetCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin or fin_director can update categories
    if current_user.role not in [UserRole.ADMIN, UserRole.FIN_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or financial directors can update categories"
        )
    
    category = db.query(BudgetCategory).filter(BudgetCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Update fields
    if category_data.name is not None:
        category.name = category_data.name
    if category_data.category_type is not None:
        category.category_type = category_data.category_type
    if category_data.parent_id is not None:
        category.parent_id = category_data.parent_id
    
    db.commit()
    db.refresh(category)
    
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only admin can delete categories
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete categories"
        )
    
    category = db.query(BudgetCategory).filter(BudgetCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}
