from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.database import get_db, engine, Base
from app.models.user import User, UserRole
from app.core.config import settings
from app.core.security import create_access_token
from app.api.v1.endpoints import router as api_router


# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.post("/api/v1/auth/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    """Login and get access token"""
    from app.core.security import verify_password
    
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return {"error": "Invalid credentials"}
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role.value,
        }
    }


@app.get("/")
def read_root():
    return {"message": "Payment Calendar API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
