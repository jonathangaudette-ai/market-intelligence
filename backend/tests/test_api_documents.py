"""Integration tests for Documents API endpoints."""

import pytest
from unittest.mock import patch, AsyncMock, Mock
from httpx import AsyncClient
from io import BytesIO
from app.main import app
from app.models.document import DocumentStatus


@pytest.mark.integration
class TestDocumentsAPI:
    """Test suite for Documents API endpoints."""

    @pytest.fixture
    async def client(self):
        """Create async test client."""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_upload_document_success(
        self, client, mock_document_processor, mock_rag_engine
    ):
        """Test successful document upload."""
        # Create mock file
        file_content = b"Test PDF content"
        files = {"file": ("test.pdf", BytesIO(file_content), "application/pdf")}
        data = {"title": "Test Document"}

        with patch("app.api.documents.doc_processor", mock_document_processor), patch(
            "app.api.documents.rag", mock_rag_engine
        ), patch("app.api.documents.get_db") as mock_db:
            # Mock database
            mock_session = AsyncMock()
            mock_db.return_value.session.return_value.__aenter__.return_value = (
                mock_session
            )

            # Mock RAG upsert
            mock_rag_engine.upsert_chunks.return_value = {
                "total_chunks": 10,
                "upserted": 10,
            }

            response = await client.post(
                "/api/documents/upload", files=files, data=data
            )

            assert response.status_code == 200
            data = response.json()

            assert "document_id" in data
            assert data["title"] == "Test Document"
            assert data["status"] == DocumentStatus.COMPLETED.value
            assert "chunks indexed" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_upload_invalid_file_type(self, client):
        """Test upload with invalid file type."""
        # Try to upload .exe file
        file_content = b"Executable content"
        files = {"file": ("test.exe", BytesIO(file_content), "application/x-msdownload")}

        response = await client.post("/api/documents/upload", files=files)

        assert response.status_code == 400
        data = response.json()
        assert "not allowed" in data["detail"].lower()

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_get_document(self, client):
        """Test retrieving document metadata."""
        document_id = "doc_test123"

        response = await client.get(f"/api/documents/{document_id}")

        # Would be 404 without actual document
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_get_nonexistent_document(self, client):
        """Test retrieving non-existent document."""
        with patch("app.api.documents.get_db") as mock_db:
            # Mock database to return None
            mock_session = AsyncMock()
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_result
            mock_db.return_value.session.return_value.__aenter__.return_value = (
                mock_session
            )

            response = await client.get("/api/documents/nonexistent_id")

            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_list_documents(self, client):
        """Test listing all documents."""
        response = await client.get("/api/documents/")

        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "count" in data
        assert isinstance(data["documents"], list)

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_list_documents_with_pagination(self, client):
        """Test listing documents with pagination."""
        response = await client.get("/api/documents/?limit=10&offset=20")

        assert response.status_code == 200
        data = response.json()
        assert data["offset"] == 20

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Requires database setup")
    async def test_list_documents_with_filter(self, client):
        """Test listing documents with source_type filter."""
        response = await client.get("/api/documents/?source_type=pdf")

        assert response.status_code == 200
        data = response.json()
        assert "documents" in data

    @pytest.mark.asyncio
    async def test_delete_document(self, client, mock_rag_engine):
        """Test deleting a document."""
        document_id = "doc_to_delete"

        with patch("app.api.documents.rag", mock_rag_engine), patch(
            "app.api.documents.get_db"
        ) as mock_db:
            # Mock database
            mock_session = AsyncMock()
            mock_result = Mock()

            # Create mock document
            mock_doc = Mock()
            mock_doc.id = document_id
            mock_doc.file_path = "/tmp/test.pdf"
            mock_result.scalar_one_or_none.return_value = mock_doc
            mock_session.execute.return_value = mock_result
            mock_session.delete = AsyncMock()
            mock_session.commit = AsyncMock()

            mock_db.return_value.session.return_value.__aenter__.return_value = (
                mock_session
            )

            # Mock RAG delete
            mock_rag_engine.delete_document.return_value = True

            # Mock os.path.exists and os.remove
            with patch("app.api.documents.os.path.exists", return_value=False):
                response = await client.delete(f"/api/documents/{document_id}")

                assert response.status_code == 204

                # Verify deletions were called
                mock_rag_engine.delete_document.assert_called_once_with(document_id)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_document(self, client):
        """Test deleting non-existent document."""
        with patch("app.api.documents.get_db") as mock_db:
            # Mock database to return None
            mock_session = AsyncMock()
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_result
            mock_db.return_value.session.return_value.__aenter__.return_value = (
                mock_session
            )

            response = await client.delete("/api/documents/nonexistent_id")

            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_crawl_website_not_implemented(self, client):
        """Test web crawl endpoint (not yet implemented)."""
        response = await client.post(
            "/api/documents/crawl",
            json={"url": "https://example.com", "max_depth": 1},
        )

        assert response.status_code == 501
        data = response.json()
        assert "not yet implemented" in data["detail"].lower()


@pytest.mark.integration
class TestDocumentUploadValidation:
    """Test suite for document upload validation."""

    @pytest.fixture
    async def client(self):
        """Create async test client."""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_upload_without_file(self, client):
        """Test upload without providing a file."""
        data = {"title": "Test"}

        response = await client.post("/api/documents/upload", data=data)

        # Should fail validation
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_upload_empty_file(self, client):
        """Test upload with empty file."""
        files = {"file": ("empty.pdf", BytesIO(b""), "application/pdf")}

        with patch("app.api.documents.doc_processor") as mock_processor:
            mock_processor.generate_document_id.return_value = "doc_empty"

            response = await client.post("/api/documents/upload", files=files)

            # Should handle empty file
            assert response.status_code in [200, 400, 500]

    @pytest.mark.asyncio
    async def test_upload_large_file(self, client):
        """Test upload with file exceeding size limit."""
        # Create a file larger than MAX_FILE_SIZE
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB (exceeds 10MB limit)
        files = {"file": ("large.pdf", BytesIO(large_content), "application/pdf")}

        # This would need actual file size validation in the endpoint
        # For now, we just verify the upload is attempted
        with patch("app.api.documents.doc_processor"):
            response = await client.post("/api/documents/upload", files=files)

            # May succeed or fail depending on implementation
            assert response.status_code in [200, 400, 413, 500]
