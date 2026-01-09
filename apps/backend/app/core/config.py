from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings"""

    # App
    app_name: str = "Productify Pro"
    debug: bool = True
    app_env: str = "development"

    # Database
    database_path: str = str(Path.home() / ".productify" / "data.db")
    database_url: str = ""  # PostgreSQL URL (if empty, uses SQLite)
    use_sqlite: bool = True  # Default to SQLite for local development

    # Screenshots
    screenshots_path: str = str(Path.home() / ".productify" / "screenshots")

    # ActivityWatch
    activitywatch_url: str = "http://localhost:5600"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Security
    encryption_key: str = ""
    jwt_secret_key: str = "your-super-secret-key-change-in-production"

    # Firebase Storage
    firebase_credentials_path: str = ""  # Path to firebase-credentials.json
    firebase_storage_bucket: str = ""  # e.g., "productify-pro.appspot.com"

    # Supabase (Production Database)
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_db_url: str = ""  # PostgreSQL connection string

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure directories exist
Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
Path(settings.screenshots_path).mkdir(parents=True, exist_ok=True)
