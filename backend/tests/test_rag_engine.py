"""Unit tests for RAG engine."""

import pytest
from unittest.mock import patch, Mock, AsyncMock
from app.services.rag_engine import RAGEngine


@pytest.mark.unit
class TestRAGEngine:
    """Test suite for RAGEngine."""

    @pytest.fixture
    async def rag_engine(self, mock_pinecone_index):
        """Create RAG engine with mocked Pinecone."""
        with patch("app.services.rag_engine.Pinecone") as mock_pc:
            mock_pc.return_value.Index.return_value = mock_pinecone_index
            engine = RAGEngine()
            engine.index = mock_pinecone_index
            yield engine

    @pytest.mark.asyncio
    async def test_retrieve_basic(
        self, rag_engine, mock_pinecone_query_result, mock_embedding_vector
    ):
        """Test basic document retrieval."""
        # Mock embedding service
        with patch.object(
            rag_engine.embedding_service,
            "embed_text",
            return_value=mock_embedding_vector,
        ):
            # Mock Pinecone query
            rag_engine.index.query.return_value = mock_pinecone_query_result

            query = "What is Acme Corp?"
            results = await rag_engine.retrieve(query, top_k=5)

            assert isinstance(results, list)
            assert len(results) == 2  # Based on mock_pinecone_query_result
            assert all(isinstance(doc, dict) for doc in results)

            # Check first result structure
            result = results[0]
            assert "text" in result
            assert "source" in result
            assert "score" in result
            assert result["score"] >= 0.7  # Above threshold

    @pytest.mark.asyncio
    async def test_retrieve_with_filters(
        self, rag_engine, mock_pinecone_query_result, mock_embedding_vector
    ):
        """Test retrieval with metadata filters."""
        with patch.object(
            rag_engine.embedding_service,
            "embed_text",
            return_value=mock_embedding_vector,
        ):
            rag_engine.index.query.return_value = mock_pinecone_query_result

            query = "What is Acme Corp?"
            filters = {"document_type": "competitor_report"}

            results = await rag_engine.retrieve(query, filter_dict=filters)

            # Verify filter was passed to Pinecone
            rag_engine.index.query.assert_called_once()
            call_kwargs = rag_engine.index.query.call_args.kwargs
            assert call_kwargs["filter"] == filters

    @pytest.mark.asyncio
    async def test_retrieve_with_min_score(
        self, rag_engine, mock_embedding_vector
    ):
        """Test retrieval with minimum score threshold."""
        # Create results with varying scores
        low_score_match = Mock()
        low_score_match.id = "chunk_low"
        low_score_match.score = 0.5  # Below threshold
        low_score_match.metadata = {
            "text": "Low relevance text",
            "source": "test.pdf",
        }

        high_score_match = Mock()
        high_score_match.id = "chunk_high"
        high_score_match.score = 0.9  # Above threshold
        high_score_match.metadata = {
            "text": "High relevance text",
            "source": "test.pdf",
        }

        mock_result = Mock()
        mock_result.matches = [high_score_match, low_score_match]

        with patch.object(
            rag_engine.embedding_service,
            "embed_text",
            return_value=mock_embedding_vector,
        ):
            rag_engine.index.query.return_value = mock_result

            results = await rag_engine.retrieve(query="test", min_score=0.7)

            # Should only return high score match
            assert len(results) == 1
            assert results[0]["score"] >= 0.7

    @pytest.mark.asyncio
    async def test_synthesize_basic(
        self, rag_engine, sample_chunks, mock_anthropic_response
    ):
        """Test answer synthesis with Claude."""
        # Convert sample_chunks to retrieval format
        context_docs = [
            {
                "text": chunk["text"],
                "source": chunk["metadata"]["source"],
                "page": chunk["metadata"].get("page"),
                "score": 0.9,
            }
            for chunk in sample_chunks
        ]

        with patch.object(
            rag_engine.claude.messages, "create", new=AsyncMock(return_value=mock_anthropic_response)
        ):
            query = "What is Acme Corp?"
            answer, metadata = await rag_engine.synthesize(query, context_docs)

            assert isinstance(answer, str)
            assert len(answer) > 0
            assert isinstance(metadata, dict)
            assert "tokens_used" in metadata
            assert "processing_time_ms" in metadata
            assert metadata["tokens_used"] == 150  # From mock

    @pytest.mark.asyncio
    async def test_synthesize_with_history(
        self, rag_engine, sample_chunks, mock_anthropic_response
    ):
        """Test synthesis with conversation history."""
        context_docs = [
            {
                "text": chunk["text"],
                "source": chunk["metadata"]["source"],
                "page": chunk["metadata"].get("page"),
                "score": 0.9,
            }
            for chunk in sample_chunks
        ]

        history = [
            {"role": "user", "content": "Tell me about Acme"},
            {"role": "assistant", "content": "Acme is a tech company"},
        ]

        mock_create = AsyncMock(return_value=mock_anthropic_response)
        with patch.object(
            rag_engine.claude.messages, "create", new=mock_create
        ):
            query = "What are their products?"
            answer, metadata = await rag_engine.synthesize(
                query, context_docs, history
            )

            # Verify history was included
            call_args = mock_create.call_args
            messages = call_args.kwargs["messages"]
            assert len(messages) >= len(history) + 1  # History + new query

    @pytest.mark.asyncio
    async def test_query_full_pipeline(
        self,
        rag_engine,
        mock_pinecone_query_result,
        mock_embedding_vector,
        mock_anthropic_response,
    ):
        """Test full RAG query pipeline."""
        with patch.object(
            rag_engine.embedding_service,
            "embed_text",
            return_value=mock_embedding_vector,
        ), patch.object(
            rag_engine.claude.messages, "create", new=AsyncMock(return_value=mock_anthropic_response)
        ):
            rag_engine.index.query.return_value = mock_pinecone_query_result

            query = "What is Acme Corp?"
            result = await rag_engine.query(query)

            assert isinstance(result, dict)
            assert "answer" in result
            assert "sources" in result
            assert "model_used" in result
            assert "tokens_used" in result
            assert "retrieved_doc_count" in result

            assert len(result["sources"]) > 0
            assert result["retrieved_doc_count"] == 2

    @pytest.mark.asyncio
    async def test_query_no_results(self, rag_engine, mock_embedding_vector):
        """Test query when no documents are found."""
        # Mock empty Pinecone result
        empty_result = Mock()
        empty_result.matches = []

        with patch.object(
            rag_engine.embedding_service,
            "embed_text",
            return_value=mock_embedding_vector,
        ):
            rag_engine.index.query.return_value = empty_result

            query = "Non-existent topic"
            result = await rag_engine.query(query)

            assert isinstance(result, dict)
            assert "don't have enough information" in result["answer"].lower()
            assert result["sources"] == []
            assert result["retrieved_doc_count"] == 0

    @pytest.mark.asyncio
    async def test_upsert_chunks(self, rag_engine, sample_chunks):
        """Test upserting document chunks to Pinecone."""
        # Mock embedding service
        mock_embeddings = [[0.1] * 3072 for _ in sample_chunks]

        with patch.object(
            rag_engine.embedding_service,
            "embed_documents",
            return_value=[
                {**chunk, "embedding": emb}
                for chunk, emb in zip(sample_chunks, mock_embeddings)
            ],
        ):
            stats = await rag_engine.upsert_chunks(sample_chunks)

            assert isinstance(stats, dict)
            assert stats["total_chunks"] == len(sample_chunks)
            assert stats["upserted"] == len(sample_chunks)

            # Verify Pinecone upsert was called
            assert rag_engine.index.upsert.called

    @pytest.mark.asyncio
    async def test_upsert_large_batch(self, rag_engine):
        """Test upserting large batch of chunks with batching."""
        # Create large number of chunks
        large_chunks = [
            {
                "chunk_id": f"chunk_{i}",
                "document_id": "doc_test",
                "text": f"Text {i}",
                "chunk_index": i,
                "metadata": {"source": "test.pdf"},
            }
            for i in range(250)
        ]

        mock_embeddings = [[0.1] * 3072 for _ in large_chunks]

        with patch.object(
            rag_engine.embedding_service,
            "embed_documents",
            return_value=[
                {**chunk, "embedding": emb}
                for chunk, emb in zip(large_chunks, mock_embeddings)
            ],
        ):
            stats = await rag_engine.upsert_chunks(large_chunks, batch_size=100)

            # Verify batching occurred (250 chunks / 100 batch size = 3 batches)
            assert rag_engine.index.upsert.call_count == 3
            assert stats["upserted"] == 250

    @pytest.mark.asyncio
    async def test_delete_document(self, rag_engine):
        """Test deleting document from Pinecone."""
        document_id = "doc_to_delete"

        success = await rag_engine.delete_document(document_id)

        assert success is True
        rag_engine.index.delete.assert_called_once()
        call_kwargs = rag_engine.index.delete.call_args.kwargs
        assert call_kwargs["filter"] == {"document_id": document_id}

    @pytest.mark.asyncio
    async def test_delete_document_error(self, rag_engine):
        """Test error handling during document deletion."""
        rag_engine.index.delete.side_effect = Exception("Pinecone error")

        document_id = "doc_error"
        success = await rag_engine.delete_document(document_id)

        assert success is False
