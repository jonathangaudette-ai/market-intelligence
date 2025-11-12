"""Unit tests for embedding service."""

import pytest
from unittest.mock import patch, AsyncMock, Mock
from app.services.embedding import EmbeddingService


@pytest.mark.unit
class TestEmbeddingService:
    """Test suite for EmbeddingService."""

    @pytest.fixture
    def embedding_service(self):
        """Create embedding service instance."""
        return EmbeddingService()

    def test_count_tokens(self, embedding_service):
        """Test token counting."""
        text = "This is a test sentence."
        count = embedding_service.count_tokens(text)

        assert isinstance(count, int)
        assert count > 0
        assert count < 100  # Should be small for this text

    @pytest.mark.asyncio
    async def test_embed_text(self, embedding_service, mock_openai_response):
        """Test embedding a single text."""
        with patch.object(
            embedding_service.client.embeddings,
            "create",
            return_value=mock_openai_response,
        ):
            text = "Sample text for embedding"
            embedding = await embedding_service.embed_text(text)

            assert isinstance(embedding, list)
            assert len(embedding) == 3072  # text-embedding-3-large dimension
            assert all(isinstance(x, float) for x in embedding)

    @pytest.mark.asyncio
    async def test_embed_batch(self, embedding_service, mock_embedding_vector):
        """Test batch embedding."""
        texts = ["Text 1", "Text 2", "Text 3"]

        # Mock the OpenAI response for batch
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=mock_embedding_vector) for _ in range(len(texts))
        ]

        with patch.object(
            embedding_service.client.embeddings,
            "create",
            return_value=mock_response,
        ):
            embeddings = await embedding_service.embed_batch(texts)

            assert isinstance(embeddings, list)
            assert len(embeddings) == len(texts)
            assert all(len(emb) == 3072 for emb in embeddings)

    @pytest.mark.asyncio
    async def test_embed_batch_with_batching(
        self, embedding_service, mock_embedding_vector
    ):
        """Test batch embedding with automatic batching."""
        # Test with more than batch_size texts
        texts = [f"Text {i}" for i in range(150)]

        # Mock responses for each batch: first 100, then 50
        mock_response_1 = Mock()
        mock_response_1.data = [
            Mock(embedding=mock_embedding_vector) for _ in range(100)
        ]

        mock_response_2 = Mock()
        mock_response_2.data = [
            Mock(embedding=mock_embedding_vector) for _ in range(50)
        ]

        with patch.object(
            embedding_service.client.embeddings,
            "create",
            side_effect=[mock_response_1, mock_response_2],
        ) as mock_create:
            embeddings = await embedding_service.embed_batch(texts, batch_size=100)

            # Should be called twice (100 + 50)
            assert mock_create.call_count == 2
            assert len(embeddings) == 150

    @pytest.mark.asyncio
    async def test_embed_documents(self, embedding_service, mock_embedding_vector):
        """Test embedding documents with metadata."""
        documents = [
            {"text": "Document 1 text", "id": "doc1", "metadata": {"type": "test"}},
            {"text": "Document 2 text", "id": "doc2", "metadata": {"type": "test"}},
        ]

        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=mock_embedding_vector) for _ in range(len(documents))
        ]

        with patch.object(
            embedding_service.client.embeddings,
            "create",
            return_value=mock_response,
        ):
            embedded_docs = await embedding_service.embed_documents(documents)

            assert len(embedded_docs) == len(documents)
            for doc in embedded_docs:
                assert "embedding" in doc
                assert len(doc["embedding"]) == 3072
                # Original fields should still be present
                assert "text" in doc
                assert "id" in doc
                assert "metadata" in doc

    @pytest.mark.asyncio
    async def test_embed_empty_text(self, embedding_service, mock_openai_response):
        """Test embedding empty text."""
        with patch.object(
            embedding_service.client.embeddings,
            "create",
            return_value=mock_openai_response,
        ):
            embedding = await embedding_service.embed_text("")

            assert isinstance(embedding, list)
            assert len(embedding) == 3072

    def test_count_tokens_long_text(self, embedding_service):
        """Test token counting for long text."""
        long_text = "This is a test. " * 1000
        count = embedding_service.count_tokens(long_text)

        assert count > 1000  # Should be substantial
        assert count < 10000  # But not unreasonably large
