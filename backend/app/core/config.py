import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareConnect Elder Care Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "careconnect-super-secret-jwt-key-chennai-2026"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./careconnect.db"
    )
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    CHENNAI_PINCODES: List[str] = [
        "600020", "600090", "600041", "600042", "600004",
        "600017", "600018", "600034", "600040", "600010",
        "600014", "600096", "600119", "600028", "600085",
        "600024", "600033", "600083", "600078", "600100",
        "600115", "600001", "600002", "600006", "600025",
    ]

    JITSI_DOMAIN: str = "meet.jit.si"

    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://192.168.29.24:5173",
        "http://192.168.29.24:5174",
        "http://192.168.29.24:3000",
        "http://192.168.29.24:8000",
        "https://localhost",
        "http://localhost",
    ]

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

settings = Settings()
