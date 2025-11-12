"""Integration tests for Chat API endpoints."""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from app.main import app


@pytest.mark.integration
class TestChatAPI:
    """Test suite for Chat API endpoints."""

    @pytest.fixture
    async def client(self):
        """Create async test client."""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_chat_basic(self, client, mock_rag_engine):
        """Test basic chat endpoint."""
        with patch("app.api.chat.rag", mock_rag_engine):
            response = await client.post(
                "/api/chat/",
                json={"message": "What is Acme Corp?", "top_k": 5},
            )

            assert response.status_code == 200
            data = response.json()

            assert "answer" in data
            assert "sources" in data
            assert "conversation_id" in data
            assert "model_used" in data

            # Verify conversation was created
            assert data["conversation_id"].startswith("conv_")
            assert len(data["sources"]) > 0

    @pytest.mark.asyncio
    async def test_chat_with_conversation_id(self, client, mock_rag_engine):
        """Test chat with existing conversation ID."""
        conversation_id = "conv_test123"

        with patch("app.api.chat.rag", mock_rag_engine), patch(
            "app.api.chat.get_conversation_history", return_value=[]
        ), patch("app.api.chat.save_message", new_callable=AsyncMock):
            response = await client.post(
                "/api/chat/",
                json={
                    "message": "Follow-up question",
                    "conversation_id": conversation_id,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["conversation_id"] == conversation_id

    @pytest.mark.asyncio
    async def test_chat_validation_empty_message(self, client):
        """Test validation for empty message."""
        response = await client.post(
            "/api/chat/",
            json={"message": ""},
        )

        # Should return validation error
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_chat_with_filters(self, client, mock_rag_engine):
        """Test chat with metadata filters."""
        with patch("app.api.chat.rag", mock_rag_engine):
            response = await client.post(
                "/api/chat/",
                json={
                    "message": "What is Acme Corp?",
                    "filters": {"document_type": "competitor_report"},
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert "answer" in data

            # Verify RAG engine was called with filters
            mock_rag_engine.query.assert_called_once()
            call_kwargs = mock_rag_engine.query.call_args.kwargs
            assert call_kwargs["filters"] == {"document_type": "competitor_report"}

    @pytest.mark.asyncio
    async def test_chat_with_custom_top_k(self, client, mock_rag_engine):
        """Test chat with custom top_k parameter."""
        with patch("app.api.chat.rag", mock_rag_engine):
            response = await client.post(
                "/api/chat/",
                json={"message": "What is Acme Corp?", "top_k": 10},
            )

            assert response.status_code == 200

            # Verify top_k was passed correctly
            call_kwargs = mock_rag_engine.query.call_args.kwargs
            assert call_kwargs["top_k"] == 10

    @pytest.mark.asyncio
    async def test_chat_error_handling(self, client):
        """Test error handling in chat endpoint."""
        with patch("app.api.chat.rag") as mock_rag:
            mock_rag.query.side_effect = Exception("RAG engine error")

            response = await client.post(
                "/api/chat/",
                json={"message": "Test message"},
            )

            assert response.status_code == 500
            data = response.json()
            assert "detail" in data


@pytest.mark.integration
class TestConversationAPI:
    """Test suite for Conversation management endpoints."""

    @pytest.fixture
    async def client(self):
        """Create async test client."""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_get_conversation_history(self, client):
        """Test retrieving conversation history."""
        # This would require actual database setup
        conversation_id = "conv_test123"

        response = await client.get(f"/api/chat/history/{conversation_id}")

        # Would be 404 in test without DB
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_list_conversations(self, client):
        """Test listing all conversations."""
        response = await client.get("/api/chat/conversations")

        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert "count" in data
        assert isinstance(data["conversations"], list)

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_list_conversations_with_pagination(self, client):
        """Test listing conversations with pagination."""
        response = await client.get("/api/chat/conversations?limit=10&offset=20")

        assert response.status_code == 200
        data = response.json()
        assert data["offset"] == 20

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_delete_conversation(self, client):
        """Test deleting a conversation."""
        conversation_id = "conv_to_delete"

        response = await client.delete(f"/api/chat/{conversation_id}")

        # Would be 404 without actual conversation
        assert response.status_code in [204, 404]

    @pytest.mark.asyncio
    async def test_get_nonexistent_conversation(self, client):
        """Test retrieving non-existent conversation."""
        with patch("app.api.chat.get_db") as mock_db:
            # Mock database to return None
            mock_session = AsyncMock()
            mock_session.__aenter__.return_value.execute.return_value.scalar_one_or_none.return_value = (
                None
            )
            mock_db.return_value.session.return_value = mock_session

            response = await client.get("/api/chat/history/nonexistent_id")

            assert response.status_code == 404
            data = response.json()
            assert "detail" in data
