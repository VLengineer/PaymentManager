from abc import ABC, abstractmethod
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings


class DatabaseStrategy(ABC):
    """Abstract base class for database strategies"""
    
    @abstractmethod
    def get_engine(self):
        """Get SQLAlchemy engine"""
        pass
    
    @abstractmethod
    def get_session_local(self):
        """Get session local factory"""
        pass
    
    @abstractmethod
    def init_db(self):
        """Initialize database (create tables)"""
        pass


class SQLiteStrategy(DatabaseStrategy):
    """SQLite database strategy for prototyping"""
    
    def __init__(self):
        self.database_url = f"sqlite:///{settings.SQLITE_DB_PATH}"
        self.engine = create_engine(
            self.database_url,
            connect_args={"check_same_thread": False}  # Needed for SQLite
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_engine(self):
        return self.engine
    
    def get_session_local(self):
        return self.SessionLocal
    
    def init_db(self):
        """Create all tables for SQLite"""
        from app.models.base import Base
        Base.metadata.create_all(bind=self.engine)


class PostgreSQLStrategy(DatabaseStrategy):
    """PostgreSQL database strategy for production"""
    
    def __init__(self):
        self.database_url = (
            f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_engine(self):
        return self.engine
    
    def get_session_local(self):
        return self.SessionLocal
    
    def init_db(self):
        """Create all tables for PostgreSQL"""
        from app.models.base import Base
        Base.metadata.create_all(bind=self.engine)


class DatabaseContext:
    """Context class that uses a database strategy"""
    
    def __init__(self, strategy: DatabaseStrategy):
        self._strategy = strategy
    
    def set_strategy(self, strategy: DatabaseStrategy):
        """Change the database strategy at runtime"""
        self._strategy = strategy
    
    def get_engine(self):
        return self._strategy.get_engine()
    
    def get_session_local(self):
        return self._strategy.get_session_local()
    
    def init_db(self):
        """Initialize database using current strategy"""
        self._strategy.init_db()
    
    def get_db(self):
        """Dependency for FastAPI to get database session"""
        db = self._strategy.get_session_local()()
        try:
            yield db
        finally:
            db.close()


# Create database context with appropriate strategy based on settings
def create_database_context() -> DatabaseContext:
    """Factory function to create database context with appropriate strategy"""
    if settings.DATABASE_TYPE == "postgresql":
        strategy = PostgreSQLStrategy()
    else:  # default to sqlite
        strategy = SQLiteStrategy()
    
    return DatabaseContext(strategy)


# Global database context instance
db_context = create_database_context()
