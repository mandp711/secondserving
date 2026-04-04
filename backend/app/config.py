from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    GOOGLE_MAPS_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    PINECONE_API_KEY: str = ""
    APP_SECRET_KEY: str = "change-me-in-production"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    APP_ENV: str = "development"

    model_config = {"env_file": ("../.env", ".env"), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
