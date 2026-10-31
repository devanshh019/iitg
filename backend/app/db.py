"""Database configuration, engine creation, and session factories."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.app.config import settings

# Determine sync database URL
database_url = settings.DATABASE_URL
if os.getenv("TESTING") == "1":
    database_url = settings.TEST_DATABASE_URL

# Sync Engine (for migrations, worker scripts, sync testing)
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=15,
    max_overflow=25
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async Engine (for high-throughput async routes)
async_db_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
async_engine = create_async_engine(
    async_db_url,
    pool_pre_ping=True,
    pool_size=15,
    max_overflow=25
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()


def get_db():
    """Dependency for synchronous database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db():
    """Dependency for asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
