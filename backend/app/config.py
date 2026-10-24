import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    """Application configuration settings."""
    app_name: str = "Cava Macro System API"
    environment: str = "development"
    port: int = 8000
    
    # External APIs
    fred_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    
    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
