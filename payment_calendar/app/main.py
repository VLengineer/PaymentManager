from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.strategies.database import db_context
from app.api import auth, users, projects, contractors, budget_categories, payments, calendar

app = FastAPI(
    title="Платежный календарь (БДДС)",
    description="Система управления платежным календарем с ролевой моделью и переносом остатков",
    version="1.0.0"
)

# CORS middleware for Vue.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vue dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup"""
    print(f"Initializing database with {settings.DATABASE_TYPE}...")
    db_context.init_db()
    print("Database initialized successfully!")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(contractors.router, prefix="/api/contractors", tags=["Contractors"])
app.include_router(budget_categories.router, prefix="/api/budget-categories", tags=["Budget Categories"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])


@app.get("/")
async def root():
    return {
        "message": "Платежный календарь (БДДС) API",
        "version": "1.0.0",
        "database": settings.DATABASE_TYPE,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": settings.DATABASE_TYPE
    }
