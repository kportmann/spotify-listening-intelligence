from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.settings import get_settings

settings = get_settings()
engine = create_engine(settings.database.connection_string)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Get database session for dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()