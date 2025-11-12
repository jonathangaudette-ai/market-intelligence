"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    app_name: str = "Market Intelligence RAG API"
    app_version: str = "0.1.0"
    debug: bool = False

    # API Keys
    anthropic_api_key: str
    openai_api_key: str
    pinecone_api_key: str

    # Pinecone Configuration
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "market-intelligence"
    pinecone_dimension: int = 3072  # text-embedding-3-large dimension

    # Database Configuration
    database_url: str

    # Claude Configuration
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4000

    # OpenAI Configuration
    openai_embedding_model: str = "text-embedding-3-large"

    # RAG Configuration
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_top_k: int = 5
    similarity_threshold: float = 0.7

    # File Upload Configuration
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list[str] = [".pdf", ".txt", ".md", ".docx"]
    upload_dir: str = "./uploads"

    # MCP Configuration (optional for now)
    firecrawl_api_key: str | None = None
    brave_api_key: str | None = None

    # CORS Configuration
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://market-intelligence-kappa.vercel.app"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
