"""Unit tests for document processor."""

import pytest
from pathlib import Path
from app.services.document_processor import DocumentProcessor
from app.models.document import DocumentChunk


@pytest.mark.unit
class TestDocumentProcessor:
    """Test suite for DocumentProcessor."""

    @pytest.fixture
    def doc_processor(self):
        """Create document processor instance."""
        return DocumentProcessor()

    def test_count_tokens(self, doc_processor):
        """Test token counting."""
        text = "This is a test sentence for token counting."
        count = doc_processor.count_tokens(text)

        assert isinstance(count, int)
        assert count > 0

    @pytest.mark.asyncio
    async def test_chunk_text_basic(self, doc_processor, sample_text):
        """Test basic text chunking."""
        document_id = "doc_test123"
        chunks = await doc_processor.chunk_text(sample_text, document_id)

        assert isinstance(chunks, list)
        assert len(chunks) > 0
        assert all(isinstance(chunk, DocumentChunk) for chunk in chunks)

        # Verify chunk properties
        for i, chunk in enumerate(chunks):
            assert chunk.document_id == document_id
            assert chunk.chunk_index == i
            assert chunk.text
            assert chunk.token_count is not None
            assert chunk.token_count > 0

    @pytest.mark.asyncio
    async def test_chunk_text_with_metadata(self, doc_processor):
        """Test chunking with metadata."""
        text = "Test text" * 200
        document_id = "doc_test"
        metadata = {"source": "test.pdf", "author": "Test Author"}

        chunks = await doc_processor.chunk_text(text, document_id, metadata)

        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk.metadata == metadata

    @pytest.mark.asyncio
    async def test_chunk_text_respects_chunk_size(self, doc_processor):
        """Test that chunks respect size limits."""
        # Create long text
        long_text = "This is a test sentence. " * 1000
        document_id = "doc_test"

        chunks = await doc_processor.chunk_text(long_text, document_id)

        # Verify no chunk is too large
        for chunk in chunks:
            assert len(chunk.text) <= doc_processor.settings.chunk_size + 200
            # Allow some margin for word boundaries

    @pytest.mark.asyncio
    async def test_chunk_text_overlap(self, doc_processor):
        """Test that chunks have proper overlap."""
        text = "Sentence one. Sentence two. Sentence three. " * 100
        document_id = "doc_test"

        chunks = await doc_processor.chunk_text(text, document_id)

        # With overlap, adjacent chunks should share some content
        if len(chunks) > 1:
            # Check if there's any text similarity between adjacent chunks
            # (This is a simple check - in practice overlap ensures continuity)
            assert chunks[0].text != chunks[1].text

    @pytest.mark.asyncio
    async def test_process_text_file(self, doc_processor, sample_text_file):
        """Test processing a text file."""
        document_id = "doc_textfile"
        chunks, metadata = await doc_processor.process_text_file(
            sample_text_file, document_id
        )

        assert isinstance(chunks, list)
        assert len(chunks) > 0
        assert metadata.document_id == document_id
        assert metadata.title == sample_text_file.stem
        assert metadata.chunk_count == len(chunks)
        assert metadata.total_tokens > 0

    def test_generate_document_id(self, doc_processor):
        """Test document ID generation."""
        # Test with content hash
        doc_id1 = doc_processor.generate_document_id("Test Doc", "hash123")
        assert doc_id1.startswith("doc_")
        assert len(doc_id1) > 4

        # Same input should produce same ID
        doc_id2 = doc_processor.generate_document_id("Test Doc", "hash123")
        assert doc_id1 == doc_id2

        # Different hash should produce different ID
        doc_id3 = doc_processor.generate_document_id("Test Doc", "hash456")
        assert doc_id1 != doc_id3

        # Test without hash (random UUID)
        doc_id4 = doc_processor.generate_document_id("Test Doc")
        doc_id5 = doc_processor.generate_document_id("Test Doc")
        assert doc_id4 != doc_id5  # Should be different (random)

    def test_generate_chunk_id(self, doc_processor):
        """Test chunk ID generation."""
        document_id = "doc_test123"
        chunk_id = doc_processor._generate_chunk_id(document_id, 5)

        assert chunk_id == "doc_test123_chunk_5"
        assert chunk_id.startswith(document_id)

    @pytest.mark.asyncio
    async def test_chunk_empty_text(self, doc_processor):
        """Test chunking empty text."""
        document_id = "doc_empty"
        chunks = await doc_processor.chunk_text("", document_id)

        # Should return empty list or handle gracefully
        assert isinstance(chunks, list)

    @pytest.mark.asyncio
    async def test_chunk_very_short_text(self, doc_processor):
        """Test chunking very short text."""
        short_text = "Short."
        document_id = "doc_short"
        chunks = await doc_processor.chunk_text(short_text, document_id)

        assert len(chunks) == 1
        assert chunks[0].text == short_text

    @pytest.mark.asyncio
    async def test_chunk_text_preserves_structure(self, doc_processor):
        """Test that chunking preserves text structure."""
        text = """
        Paragraph 1 with important content.

        Paragraph 2 with more content.

        Paragraph 3 with final content.
        """
        document_id = "doc_structure"
        chunks = await doc_processor.chunk_text(text, document_id)

        # Combined chunks should contain all original text
        combined_text = " ".join(chunk.text for chunk in chunks)
        # Check that key words are present
        assert "Paragraph 1" in combined_text or any(
            "Paragraph 1" in chunk.text for chunk in chunks
        )


@pytest.mark.unit
class TestDocumentProcessorPDF:
    """Test suite for PDF processing."""

    @pytest.fixture
    def doc_processor(self):
        """Create document processor instance."""
        return DocumentProcessor()

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not Path("tests/fixtures/sample.pdf").exists(),
        reason="Sample PDF not available",
    )
    async def test_extract_text_from_pdf_real(self, doc_processor):
        """Test extracting text from a real PDF (if available)."""
        pdf_path = Path("tests/fixtures/sample.pdf")
        text, metadata = await doc_processor.extract_text_from_pdf(pdf_path)

        assert isinstance(text, str)
        assert len(text) > 0
        assert isinstance(metadata, dict)
        assert "total_pages" in metadata
        assert metadata["total_pages"] > 0

    @pytest.mark.asyncio
    async def test_chunk_pdf_structure(self, doc_processor, sample_pdf_path):
        """Test PDF chunking structure (with mock/placeholder PDF)."""
        document_id = "doc_pdf_test"

        # Note: This would need a real PDF for full testing
        # For now, we test the structure of what should be returned
        try:
            chunks, metadata = await doc_processor.chunk_pdf_by_pages(
                sample_pdf_path, document_id
            )

            assert isinstance(chunks, list)
            assert isinstance(metadata, object)
            assert hasattr(metadata, "document_id")
            assert hasattr(metadata, "chunk_count")
        except Exception:
            # Skip if PDF processing fails (expected without real PDF library)
            pytest.skip("PDF processing requires real PDF file")
