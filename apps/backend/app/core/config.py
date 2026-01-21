from pydantic_settings import BaseSettings
from pydantic import field_validator
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings"""

    # App
    app_name: str = "Productify Pro"
    debug: bool = True
    app_env: str = "development"
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL

    # Database
    database_path: str = str(Path.home() / ".productify" / "data.db")

    database_url: str = ""  # PostgreSQL URL (if empty, uses SQLite)
    use_sqlite: bool = True  # Default to SQLite for local development

    @field_validator('database_path', mode='before')
    @classmethod
    def expand_database_path(cls, v):
        """Expand ~ to home directory"""
        if isinstance(v, str) and v.startswith('~'):
            return str(Path(v).expanduser())
        return v

    # Screenshots
    screenshots_path: str = str(Path.home() / ".productify" / "screenshots")

    # ActivityWatch
    activitywatch_url: str = "http://localhost:5600"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Deepgram (Real-time transcription)
    deepgram_api_key: str = ""

    # Properties for uppercase access
    @property
    def OPENAI_API_KEY(self) -> str:
        return self.openai_api_key

    @property
    def DEEPGRAM_API_KEY(self) -> str:
        return self.deepgram_api_key

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

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/calendar/callback"

    # Google Calendar API Scopes
    google_calendar_scopes: str = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_personal: str = ""
    stripe_price_pro: str = ""
    stripe_price_team: str = ""

    # CORS
    cors_origins: str = "http://localhost:1420,http://localhost:3000,tauri://localhost"

    # Redis (optional)
    redis_url: str = ""

    # Sentry (optional)
    sentry_dsn: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    from_email: str = "noreply@productifypro.com"
    frontend_url: str = "http://localhost:1420"

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure directories exist
Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
Path(settings.screenshots_path).mkdir(parents=True, exist_ok=True)
