from pydantic_settings import BaseSettings
from typing import Literal
from functools import lru_cache


class Settings(BaseSettings):
    # Database Strategy
    DB_TYPE: Literal["sqlite", "postgresql"] = "sqlite"
    
    # PostgreSQL Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "bdds_payment_calendar"
    
    # SQLite Configuration
    SQLITE_DB_PATH: str = "./bdds_dev.db"
    
    # Application Settings
    APP_ENV: str = "development"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Ollama Configuration
    OLLAMA_API_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    
    @property
    def database_url(self) -> str:
        """Returns database URL based on DB_TYPE strategy"""
        if self.DB_TYPE == "postgresql":
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        else:  # sqlite
            return f"sqlite:///{self.SQLITE_DB_PATH}"
    
    @property
    def async_database_url(self) -> str:
        """Returns async database URL based on DB_TYPE strategy"""
        if self.DB_TYPE == "postgresql":
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        else:  # sqlite
            return f"sqlite+aiosqlite:///{self.SQLITE_DB_PATH}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
