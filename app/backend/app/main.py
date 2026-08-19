from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta, datetime
from jose import JWTError, jwt

from app.database import get_db, db_context
from app.models import User, Project, Contractor, BudgetCategory, Payment, UserRole, PaymentStatus, UserProject
from passlib.context import CryptContext

# Initialize FastAPI app
app = FastAPI(
    title="Платежный календарь (БДДС)",
    description="Система управления платежным календарем с ролевой моделью",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# Pydantic models
class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.RP


class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class ProjectCreate(BaseModel):
    cfo_code: str
    name: str


class ProjectResponse(BaseModel):
    id: int
    cfo_code: str
    name: str
    
    class Config:
        from_attributes = True


class ContractorCreate(BaseModel):
    name: str


class ContractorResponse(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True


class BudgetCategoryCreate(BaseModel):
    name: str
    category_type: str  # "INCOME" or "EXPENSE"


class BudgetCategoryResponse(BaseModel):
    id: int
    name: str
    category_type: str
    
    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    project_id: int
    contractor_id: int
    category_id: int
    period_start: date
    amount_plan: float
    comment: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount_fact: Optional[float] = None
    comment: Optional[str] = None


class PaymentRollover(BaseModel):
    payment_id: int
    target_period_start: date


class PaymentResponse(BaseModel):
    id: int
    project_id: int
    contractor_id: int
    category_id: int
    parent_payment_id: Optional[int]
    period_start: date
    amount_plan: float
    amount_fact: float
    amount_rollover: float
    status: PaymentStatus
    is_locked: bool
    comment: Optional[str]
    
    class Config:
        from_attributes = True


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Startup event - initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print(f"Using database type: {db_context._strategy.__class__.__name__}")
    db_context.init_db()
    print("Database initialized successfully!")
    
    # Create sample data if empty
    db = db_context.get_session_local()()
    try:
        if db.query(User).count() == 0:
            # Create default users
            admin_user = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN
            )
            fin_director = User(
                username="fin_director",
                hashed_password=hash_password("fin123"),
                role=UserRole.FIN_DIRECTOR
            )
            rp_user = User(
                username="rp_user",
                hashed_password=hash_password("rp123"),
                role=UserRole.RP
            )
            db.add_all([admin_user, fin_director, rp_user])
            
            # Create sample projects
            project1 = Project(cfo_code="25_004_РВК", name="ООО_СЭ_ЛИПЕЦК_ВНС 3")
            project2 = Project(cfo_code="25_005_МСК", name="ООО_СТРОЙ_МОСКВА")
            db.add_all([project1, project2])
            db.commit()
            
            # Link rp_user to project1
            user_project = UserProject(user_id=rp_user.id, project_id=project1.id)
            db.add(user_project)
            db.commit()
            
            # Create sample contractors
            contractor1 = Contractor(name="ЭЛЕКТРОТЕХМОНТАЖ ТД АО")
            contractor2 = Contractor(name="ИП Горетый")
            db.add_all([contractor1, contractor2])
            
            # Create sample budget categories
            category1 = BudgetCategory(name="Технологическое присоединение", category_type="EXPENSE")
            category2 = BudgetCategory(name="Услуги спецтехники", category_type="EXPENSE")
            category3 = BudgetCategory(name="Выручка от реализации", category_type="INCOME")
            db.add_all([category1, category2, category3])
            
            db.commit()
            print("Sample data created successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
    finally:
        db.close()


# API Endpoints
@app.get("/")
async def root():
    return {"message": "Платежный календарь (БДДС) API", "version": "1.0.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "db_type": db_context._strategy.__class__.__name__}


# Auth endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = get_user_by_username(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user.id, username=user.username, role=user.role)
    )


# User endpoints
@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = User(
        username=user.username,
        hashed_password=hash_password(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


# Project endpoints
@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.cfo_code == project.cfo_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project with this CFO code already exists")
    
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.get("/api/projects", response_model=List[ProjectResponse])
async def get_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


# Contractor endpoints
@app.post("/api/contractors", response_model=ContractorResponse)
async def create_contractor(contractors: ContractorCreate, db: Session = Depends(get_db)):
    existing = db.query(Contractor).filter(Contractor.name == contractors.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contractor already exists")
    
    db_contractor = Contractor(**contractors.model_dump())
    db.add(db_contractor)
    db.commit()
    db.refresh(db_contractor)
    return db_contractor


@app.get("/api/contractors", response_model=List[ContractorResponse])
async def get_contractors(db: Session = Depends(get_db)):
    return db.query(Contractor).all()


# Budget Category endpoints
@app.post("/api/categories", response_model=BudgetCategoryResponse)
async def create_category(category: BudgetCategoryCreate, db: Session = Depends(get_db)):
    db_category = BudgetCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@app.get("/api/categories", response_model=List[BudgetCategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    return db.query(BudgetCategory).all()


# Payment endpoints
@app.post("/api/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    db_payment = Payment(**payment.model_dump(), status=PaymentStatus.DRAFT)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@app.get("/api/payments", response_model=List[PaymentResponse])
async def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()


@app.patch("/api/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: int, payment_update: PaymentUpdate, db: Session = Depends(get_db)):
    db_payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if db_payment.is_locked:
        raise HTTPException(status_code=400, detail="Payment is locked")
    
    update_data = payment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)
    
    # Update status based on amounts
    if db_payment.amount_fact is not None and db_payment.amount_plan is not None:
        if db_payment.amount_fact >= db_payment.amount_plan:
            db_payment.status = PaymentStatus.PAID
        elif db_payment.amount_fact > 0:
            db_payment.status = PaymentStatus.PARTIAL
            db_payment.amount_rollover = db_payment.amount_plan - db_payment.amount_fact
    
    db.commit()
    db.refresh(db_payment)
    return db_payment


@app.post("/api/payments/rollover", response_model=PaymentResponse)
async def rollover_payment(rollover: PaymentRollover, db: Session = Depends(get_db)):
    db_payment = db.query(Payment).filter(Payment.id == rollover.payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if db_payment.status != PaymentStatus.PARTIAL:
        raise HTTPException(status_code=400, detail="Can only rollover partial payments")
    
    # Create new payment for the rollover amount
    new_payment = Payment(
        project_id=db_payment.project_id,
        contractor_id=db_payment.contractor_id,
        category_id=db_payment.category_id,
        parent_payment_id=db_payment.id,
        period_start=rollover.target_period_start,
        amount_plan=db_payment.amount_rollover,
        amount_fact=0,
        amount_rollover=0,
        status=PaymentStatus.DRAFT,
        is_locked=False,
        comment=f"Перенос остатка от платежа #{db_payment.id}"
    )
    
    # Lock the original payment
    db_payment.is_locked = True
    db_payment.status = PaymentStatus.CANCELLED
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
