from abc import ABC, abstractmethod
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Type

from app.config import get_settings

settings = get_settings()

Base = declarative_base()


class DatabaseStrategy(ABC):
    """Abstract base class for database strategy pattern"""
    
    @abstractmethod
    def get_engine(self):
        """Get SQLAlchemy engine"""
        pass
    
    @abstractmethod
    def get_session_local(self) -> Type[sessionmaker]:
        """Get session local factory"""
        pass
    
    @abstractmethod
    def init_db(self):
        """Initialize database (create tables)"""
        pass


class SQLiteStrategy(DatabaseStrategy):
    """SQLite database strategy for prototyping"""
    
    def __init__(self):
        self.database_url = settings.database_url
        self.engine = create_engine(
            self.database_url,
            connect_args={"check_same_thread": False}  # Needed for SQLite
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_engine(self):
        return self.engine
    
    def get_session_local(self) -> Type[sessionmaker]:
        return self.SessionLocal
    
    def init_db(self):
        """Create all tables for SQLite"""
        Base.metadata.create_all(bind=self.engine)


class PostgreSQLStrategy(DatabaseStrategy):
    """PostgreSQL database strategy for production"""
    
    def __init__(self):
        self.database_url = settings.database_url
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_engine(self):
        return self.engine
    
    def get_session_local(self) -> Type[sessionmaker]:
        return self.SessionLocal
    
    def init_db(self):
        """Create all tables for PostgreSQL"""
        Base.metadata.create_all(bind=self.engine)


class DatabaseContext:
    """Context class that uses the database strategy"""
    
    def __init__(self, strategy: DatabaseStrategy):
        self._strategy = strategy
    
    def set_strategy(self, strategy: DatabaseStrategy):
        """Change the database strategy at runtime"""
        self._strategy = strategy
    
    def get_engine(self):
        return self._strategy.get_engine()
    
    def get_session_local(self) -> Type[sessionmaker]:
        return self._strategy.get_session_local()
    
    def init_db(self):
        """Initialize database using current strategy"""
        self._strategy.init_db()


def get_database_strategy() -> DatabaseStrategy:
    """Factory function to get the appropriate database strategy"""
    if settings.DB_TYPE == "postgresql":
        return PostgreSQLStrategy()
    else:
        return SQLiteStrategy()


# Create default database context with strategy from settings
db_context = DatabaseContext(get_database_strategy())

# Dependency to get DB session
def get_db():
    db = db_context.get_session_local()()
    try:
        yield db
    finally:
        db.close()
