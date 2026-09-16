from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CareConnect"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./careconnect_phaseb.db"
    SECRET_KEY: str = "careconnect_phaseb_secret_key_change_in_prod"
    JITSI_DOMAIN: str = "meet.jit.si"
    
    # Razorpay Settings (Standard sandbox keys / configurable via .env)
    RAZORPAY_KEY_ID: str = "rzp_test_CareConnect2026"
    RAZORPAY_KEY_SECRET: str = "test_secret_CareConnectKey9988"
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )


settings = Settings()
