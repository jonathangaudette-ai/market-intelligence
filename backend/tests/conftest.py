"""Pytest configuration and shared fixtures."""

import os
import pytest
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from httpx import AsyncClient
import sys

# Mock Pinecone BEFORE importing app modules to avoid connection attempts
mock_pinecone_module = MagicMock()
mock_pinecone_module.Pinecone = MagicMock
mock_pinecone_module.ServerlessSpec = MagicMock
sys.modules['pinecone'] = mock_pinecone_module

from app.main import app
from app.config import Settings
from app.db.postgres import DatabaseSession, Base


@pytest.fixture(scope="session")
def test_settings():
    """Test configuration settings."""
    return Settings(
        app_name="Test Market Intelligence API",
        debug=True,
        anthropic_api_key="test_anthropic_key",
        openai_api_key="test_openai_key",
        pinecone_api_key="test_pinecone_key",
        database_url="postgresql://postgres:postgres@localhost:5432/market_intelligence_test",
        pinecone_index_name="test-index",
    )


@pytest.fixture
async def async_client():
    """Async HTTP client for API testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_text():
    """Sample text for testing."""
    return """
    Acme Corporation is a leading technology company specializing in AI solutions.
    Founded in 2020, Acme has grown to serve over 500 enterprise customers worldwide.

    Key Products:
    - Acme AI Platform: Enterprise-grade AI infrastructure
    - Acme Analytics: Real-time business intelligence
    - Acme Security: AI-powered threat detection

    The company raised $50M in Series B funding in 2024 and plans to expand
    into European markets in 2025. Main competitors include TechCorp and InnoSoft.
    """


@pytest.fixture
def sample_chunks():
    """Sample document chunks for testing."""
    return [
        {
            "chunk_id": "doc_test_chunk_0",
            "document_id": "doc_test",
            "text": "Acme Corporation is a leading technology company.",
            "chunk_index": 0,
            "metadata": {"source": "test.pdf", "page": 1},
        },
        {
            "chunk_id": "doc_test_chunk_1",
            "document_id": "doc_test",
            "text": "Key products include AI Platform and Analytics.",
            "chunk_index": 1,
            "metadata": {"source": "test.pdf", "page": 1},
        },
    ]


@pytest.fixture
def mock_embedding_vector():
    """Mock embedding vector (3072 dimensions)."""
    return [0.1] * 3072


@pytest.fixture
def mock_openai_response(mock_embedding_vector):
    """Mock OpenAI embeddings API response."""
    mock_response = Mock()
    mock_response.data = [Mock(embedding=mock_embedding_vector)]
    return mock_response


@pytest.fixture
def mock_anthropic_response():
    """Mock Anthropic (Claude) API response."""
    mock_response = Mock()
    mock_response.content = [Mock(text="This is a test answer from Claude.")]
    mock_response.usage = Mock(input_tokens=100, output_tokens=50)
    mock_response.stop_reason = "end_turn"
    return mock_response


@pytest.fixture
def mock_pinecone_query_result():
    """Mock Pinecone query result."""
    match1 = Mock()
    match1.id = "doc_test_chunk_0"
    match1.score = 0.95
    match1.metadata = {
        "text": "Acme Corporation is a leading technology company.",
        "source": "test.pdf",
        "page": 1,
        "document_id": "doc_test",
    }

    match2 = Mock()
    match2.id = "doc_test_chunk_1"
    match2.score = 0.87
    match2.metadata = {
        "text": "Key products include AI Platform and Analytics.",
        "source": "test.pdf",
        "page": 1,
        "document_id": "doc_test",
    }

    result = Mock()
    result.matches = [match1, match2]
    return result


@pytest.fixture
def sample_pdf_path(tmp_path):
    """Create a simple test PDF file."""
    # For testing, we'll create a text file that simulates a PDF path
    pdf_file = tmp_path / "test_document.pdf"

    # Note: In real tests, you'd need a real PDF
    # For now, we'll just create a placeholder
    pdf_file.write_text("This is a test PDF content.\n" * 100)

    return pdf_file


@pytest.fixture
def sample_conversation():
    """Sample conversation data."""
    return {
        "conversation_id": "conv_test123",
        "messages": [
            {"role": "user", "content": "What is Acme Corp?"},
            {
                "role": "assistant",
                "content": "Acme Corp is a technology company...",
            },
        ],
    }


@pytest.fixture
async def mock_rag_engine():
    """Mock RAG engine for testing."""
    engine = AsyncMock()
    engine.query.return_value = {
        "answer": "Acme Corp is a leading technology company specializing in AI solutions.",
        "sources": [
            {
                "source": "test.pdf",
                "page": 1,
                "chunk_id": "doc_test_chunk_0",
                "relevance_score": 0.95,
                "text_snippet": "Acme Corporation is a leading...",
            }
        ],
        "model_used": "claude-sonnet-4-20250514",
        "tokens_used": 150,
        "processing_time_ms": 2500,
        "retrieved_doc_count": 2,
    }
    return engine


@pytest.fixture
async def mock_embedding_service():
    """Mock embedding service."""
    service = AsyncMock()
    service.embed_text.return_value = [0.1] * 3072
    service.embed_batch.return_value = [[0.1] * 3072] * 5
    service.count_tokens.return_value = 50
    return service


@pytest.fixture
async def mock_document_processor():
    """Mock document processor."""
    from app.models.document import DocumentChunk, DocumentMetadata, DocumentType, DocumentStatus

    processor = AsyncMock()

    # Mock chunk_pdf_by_pages
    chunks = [
        DocumentChunk(
            chunk_id="doc_test_chunk_0",
            document_id="doc_test",
            text="Sample chunk text",
            chunk_index=0,
            page_number=1,
            token_count=10,
            metadata={"source": "test.pdf", "page": 1},
        )
    ]

    metadata = DocumentMetadata(
        document_id="doc_test",
        title="Test Document",
        source_type=DocumentType.PDF,
        file_path="/test/path.pdf",
        total_pages=1,
        total_tokens=10,
        chunk_count=1,
        status=DocumentStatus.PROCESSING,
    )

    processor.chunk_pdf_by_pages.return_value = (chunks, metadata)
    processor.generate_document_id.return_value = "doc_test123"
    processor.count_tokens.return_value = 50

    return processor


@pytest.fixture(scope="function")
async def test_db():
    """Test database session."""
    # For integration tests, you'd create a test database here
    # For now, we'll use mocks for unit tests
    db = Mock()
    yield db
    # Cleanup would go here


@pytest.fixture
def mock_pinecone_index():
    """Mock Pinecone index."""
    index = Mock()
    index.upsert = Mock(return_value=None)
    index.query = Mock(return_value=Mock(matches=[]))
    index.delete = Mock(return_value=None)
    return index


# Fixtures for sample files
@pytest.fixture
def sample_text_file(tmp_path):
    """Create sample text file."""
    file_path = tmp_path / "test.txt"
    file_path.write_text("This is a test document about Acme Corp.")
    return file_path


@pytest.fixture
def sample_markdown_file(tmp_path):
    """Create sample markdown file."""
    file_path = tmp_path / "test.md"
    content = """
# Acme Corporation

## Overview
Acme is a technology company.

## Products
- AI Platform
- Analytics Tool
"""
    file_path.write_text(content)
    return file_path
