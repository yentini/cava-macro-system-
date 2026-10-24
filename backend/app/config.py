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
    
    # External APIs and URLs
    fred_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    frontend_url: str = "https://cava-macro-system.vercel.app"
    
    # CORS
    cors_origins: str | list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins safely from list, comma-separated string, or JSON."""
        if isinstance(self.cors_origins, list):
            return self.cors_origins
        if isinstance(self.cors_origins, str):
            val = self.cors_origins.strip()
            if val.startswith("[") and val.endswith("]"):
                try:
                    import json
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except Exception:
                    pass
            return [origin.strip() for origin in val.split(",") if origin.strip()]
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
