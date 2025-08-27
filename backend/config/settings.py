from pydantic import field_validator
from pydantic_settings import BaseSettings
from pathlib import Path
import os

class DatabaseSettings(BaseSettings):
    """Database configuration settings."""
    
    host: str = "db"
    port: int = 5432
    user: str
    password: str
    database: str = "my_spotify_data"
    
    @property
    def connection_string(self) -> str:
        """Generate PostgreSQL connection string."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    @property
    def psycopg2_params(self) -> dict:
        """Generate psycopg2 connection parameters."""
        return {
            'host': self.host,
            'port': self.port,
            'user': self.user,
            'password': self.password,
            'database': self.database
        }

    model_config = {
        "env_file": "../.env",
        "env_prefix": "POSTGRES_",
        "extra": "ignore"
    }


class ETLSettings(BaseSettings):
    """ETL pipeline configuration settings."""
    
    data_directory: str = str(Path(__file__).parent.parent.parent / "data")
    batch_size: int = 1000
    log_level: str = "INFO"
    max_retries: int = 3
    retry_delay: int = 5
    
    @field_validator('log_level')
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return v.upper()

    model_config = {
        "env_file": "../.env",
        "env_prefix": "ETL_",
        "extra": "ignore"
    }


class SpotifySettings(BaseSettings):
    """Spotify API configuration settings."""
    
    client_id: str
    client_secret: str
    redirect_uri: str = "http://127.0.0.1:3000/callback"
    
    model_config = {
        "env_file": "../.env",
        "env_prefix": "SPOTIFY_",
        "extra": "ignore"
    }


class Settings(BaseSettings):
    """Main application settings."""
    
    database: DatabaseSettings = DatabaseSettings()
    etl: ETLSettings = ETLSettings()
    spotify: SpotifySettings = SpotifySettings()
    environment: str = "development"
    debug: bool = False
    
    @field_validator('environment')
    def validate_environment(cls, v):
        """Validate environment setting."""
        valid_envs = ["development", "staging", "production"]
        if v.lower() not in valid_envs:
            raise ValueError(f"Invalid environment: {v}. Must be one of {valid_envs}")
        return v.lower()

    model_config = {
        "env_file": "../.env",
        "case_sensitive": False,
        "extra": "ignore"
    }


def get_settings() -> Settings:
    """Get application settings instance."""
    return Settings()