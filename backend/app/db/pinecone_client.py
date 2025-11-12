"""Pinecone client initialization and utilities."""

from pinecone import Pinecone, ServerlessSpec
from app.config import get_settings


_pinecone_client: Pinecone | None = None
_pinecone_index = None


def get_pinecone_client() -> Pinecone:
    """Get or create Pinecone client."""
    global _pinecone_client

    if _pinecone_client is None:
        settings = get_settings()
        _pinecone_client = Pinecone(api_key=settings.pinecone_api_key)

    return _pinecone_client


def get_pinecone_index():
    """Get or create Pinecone index."""
    global _pinecone_index

    if _pinecone_index is None:
        settings = get_settings()
        pc = get_pinecone_client()

        # Check if index exists
        existing_indexes = pc.list_indexes()
        index_names = [idx.name for idx in existing_indexes]

        if settings.pinecone_index_name not in index_names:
            # Create index if it doesn't exist
            pc.create_index(
                name=settings.pinecone_index_name,
                dimension=settings.pinecone_dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=settings.pinecone_environment
                )
            )

        _pinecone_index = pc.Index(settings.pinecone_index_name)

    return _pinecone_index


async def init_pinecone() -> None:
    """Initialize Pinecone index."""
    get_pinecone_index()
