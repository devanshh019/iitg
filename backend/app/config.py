"""Configuration settings for HACKOS."""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "HACKOS"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = "postgresql://postgres@localhost:5433/hackos"
    TEST_DATABASE_URL: str = "postgresql://postgres@localhost:5433/hackos_test"

    # Authentication & JWT
    SECRET_KEY: str = "hackos_super_secret_jwt_hmac_signing_key_change_in_prod_min_32_bytes_long!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Field-level PII encryption (Fernet url-safe base64 key)
    PII_ENCRYPTION_KEY: str = "OFIYEpprvIcFxcPHnPeEDp_gfqEpEqdTHW7DgPCl8as="

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000"

    # Sentry & Email
    SENTRY_DSN: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "mission-control@hackos.local"
    SMTP_FROM_NAME: str = "HACKOS Mission Control"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
