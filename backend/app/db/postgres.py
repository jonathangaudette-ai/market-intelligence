"""PostgreSQL database client and models."""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import Column, String, Integer, Text, DateTime, JSON, Float, ForeignKey, create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship

from app.config import get_settings

Base = declarative_base()


class Document(Base):
    """Document metadata table."""

    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    total_pages = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    chunk_count = Column(Integer, default=0)
    status = Column(String, default="pending")
    doc_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    """Document chunk table."""

    __tablename__ = "chunks"

    id = Column(String, primary_key=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)
    chunk_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class Conversation(Base):
    """Conversation table."""

    __tablename__ = "conversations"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=True)
    conv_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Message table."""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list)  # List of source references
    tokens_used = Column(Integer, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    msg_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class DatabaseSession:
    """Database session manager."""

    def __init__(self) -> None:
        """Initialize database session."""
        settings = get_settings()

        # Convert postgresql:// to postgresql+asyncpg://
        db_url = settings.database_url
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        self.engine = create_async_engine(
            db_url,
            echo=settings.debug,
            future=True
        )
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    async def init_db(self) -> None:
        """Initialize database tables."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        """Close database connection."""
        await self.engine.dispose()

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session context manager."""
        async with self.async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# Global database session instance
_db_session: DatabaseSession | None = None


def get_db() -> DatabaseSession:
    """Get database session instance."""
    global _db_session
    if _db_session is None:
        _db_session = DatabaseSession()
    return _db_session


async def init_db() -> None:
    """Initialize database."""
    db = get_db()
    await db.init_db()
