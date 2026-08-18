from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # Database Configuration
    DATABASE_TYPE: Literal["sqlite", "postgresql"] = "sqlite"
    
    # SQLite Configuration
    SQLITE_DB_PATH: str = "./payment_calendar.db"
    
    # PostgreSQL Configuration
    POSTGRES_USER: str = "payment_user"
    POSTGRES_PASSWORD: str = "payment_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "payment_calendar"
    
    # Application Settings
    APP_ENV: str = "development"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    @property
    def database_url(self) -> str:
        """Get database URL based on DATABASE_TYPE"""
        if self.DATABASE_TYPE == "postgresql":
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        else:  # sqlite
            return f"sqlite:///{self.SQLITE_DB_PATH}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
