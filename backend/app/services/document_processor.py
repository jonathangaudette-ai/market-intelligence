"""Document processing service for chunking and extracting text."""

import hashlib
import uuid
from pathlib import Path
from typing import Any

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import tiktoken

from app.config import get_settings
from app.models.document import DocumentChunk, DocumentMetadata, DocumentType, DocumentStatus


class DocumentProcessor:
    """Service for processing documents into chunks."""

    def __init__(self) -> None:
        """Initialize document processor."""
        self.settings = get_settings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        self.encoding = tiktoken.encoding_for_model("gpt-4")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))

    async def extract_text_from_pdf(self, file_path: str | Path) -> tuple[str, dict[str, Any]]:
        """
        Extract text from PDF file.

        Args:
            file_path: Path to PDF file

        Returns:
            Tuple of (full_text, metadata)
        """
        file_path = Path(file_path)
        reader = PdfReader(str(file_path))

        # Extract metadata
        metadata = {
            "total_pages": len(reader.pages),
            "file_name": file_path.name,
            "file_size_bytes": file_path.stat().st_size
        }

        # Extract PDF metadata if available
        if reader.metadata:
            if reader.metadata.title:
                metadata["pdf_title"] = reader.metadata.title
            if reader.metadata.author:
                metadata["pdf_author"] = reader.metadata.author
            if reader.metadata.subject:
                metadata["pdf_subject"] = reader.metadata.subject

        # Extract text from all pages
        pages_text = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            pages_text.append({
                "page": page_num,
                "text": text
            })

        # Combine all text
        full_text = "\n\n".join([p["text"] for p in pages_text])

        return full_text, metadata

    async def chunk_text(
        self,
        text: str,
        document_id: str,
        metadata: dict[str, Any] | None = None
    ) -> list[DocumentChunk]:
        """
        Split text into chunks.

        Args:
            text: Text to chunk
            document_id: Parent document ID
            metadata: Optional metadata to attach to chunks

        Returns:
            List of DocumentChunk objects
        """
        if metadata is None:
            metadata = {}

        # Split text
        text_chunks = self.text_splitter.split_text(text)

        # Create chunk objects
        chunks: list[DocumentChunk] = []
        for idx, chunk_text in enumerate(text_chunks):
            chunk_id = self._generate_chunk_id(document_id, idx)
            token_count = self.count_tokens(chunk_text)

            chunk = DocumentChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                text=chunk_text,
                chunk_index=idx,
                token_count=token_count,
                metadata=metadata.copy()
            )
            chunks.append(chunk)

        return chunks

    async def chunk_pdf_by_pages(
        self,
        file_path: str | Path,
        document_id: str
    ) -> tuple[list[DocumentChunk], DocumentMetadata]:
        """
        Process PDF and create chunks, preserving page information.

        Args:
            file_path: Path to PDF file
            document_id: Document identifier

        Returns:
            Tuple of (chunks list, document metadata)
        """
        file_path = Path(file_path)
        reader = PdfReader(str(file_path))

        all_chunks: list[DocumentChunk] = []
        chunk_counter = 0

        # Process each page
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()

            # Split page text into chunks
            page_chunks = self.text_splitter.split_text(page_text)

            for chunk_text in page_chunks:
                chunk_id = self._generate_chunk_id(document_id, chunk_counter)
                token_count = self.count_tokens(chunk_text)

                chunk = DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    text=chunk_text,
                    chunk_index=chunk_counter,
                    page_number=page_num,
                    token_count=token_count,
                    metadata={
                        "page": page_num,
                        "source": file_path.name
                    }
                )
                all_chunks.append(chunk)
                chunk_counter += 1

        # Calculate total tokens
        total_tokens = sum(chunk.token_count or 0 for chunk in all_chunks)

        # Create document metadata
        doc_metadata = DocumentMetadata(
            document_id=document_id,
            title=file_path.stem,
            source_type=DocumentType.PDF,
            file_path=str(file_path),
            total_pages=len(reader.pages),
            total_tokens=total_tokens,
            chunk_count=len(all_chunks),
            status=DocumentStatus.PROCESSING
        )

        return all_chunks, doc_metadata

    async def process_text_file(
        self,
        file_path: str | Path,
        document_id: str
    ) -> tuple[list[DocumentChunk], DocumentMetadata]:
        """
        Process plain text file.

        Args:
            file_path: Path to text file
            document_id: Document identifier

        Returns:
            Tuple of (chunks list, document metadata)
        """
        file_path = Path(file_path)

        # Read file
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

        # Create chunks
        chunks = await self.chunk_text(
            text=text,
            document_id=document_id,
            metadata={"source": file_path.name}
        )

        # Calculate total tokens
        total_tokens = sum(chunk.token_count or 0 for chunk in chunks)

        # Create document metadata
        doc_metadata = DocumentMetadata(
            document_id=document_id,
            title=file_path.stem,
            source_type=DocumentType.TEXT,
            file_path=str(file_path),
            total_tokens=total_tokens,
            chunk_count=len(chunks),
            status=DocumentStatus.PROCESSING
        )

        return chunks, doc_metadata

    def _generate_chunk_id(self, document_id: str, chunk_index: int) -> str:
        """Generate unique chunk ID."""
        return f"{document_id}_chunk_{chunk_index}"

    def generate_document_id(self, title: str, content_hash: str | None = None) -> str:
        """
        Generate unique document ID.

        Args:
            title: Document title
            content_hash: Optional content hash for uniqueness

        Returns:
            Document ID
        """
        if content_hash:
            # Use hash for deterministic ID
            combined = f"{title}_{content_hash}"
            hash_obj = hashlib.md5(combined.encode())
            return f"doc_{hash_obj.hexdigest()[:16]}"
        else:
            # Generate random UUID
            return f"doc_{uuid.uuid4().hex[:16]}"
