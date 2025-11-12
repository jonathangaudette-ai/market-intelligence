"""Document-related Pydantic models."""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl


class DocumentType(str, Enum):
    """Document type enumeration."""

    PDF = "pdf"
    WEB_PAGE = "web_page"
    TEXT = "text"
    MARKDOWN = "markdown"
    WORD = "word"


class DocumentStatus(str, Enum):
    """Document processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentMetadata(BaseModel):
    """Document metadata."""

    document_id: str = Field(..., description="Unique document identifier")
    title: str = Field(..., description="Document title")
    source_type: DocumentType = Field(..., description="Type of document")
    source_url: HttpUrl | None = Field(None, description="Original URL if web content")
    file_path: str | None = Field(None, description="Local file path")
    total_pages: int | None = Field(None, description="Number of pages (for PDFs)")
    total_tokens: int | None = Field(None, description="Estimated token count")
    chunk_count: int = Field(0, description="Number of chunks created")
    status: DocumentStatus = Field(DocumentStatus.PENDING, description="Processing status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime | None = None
    metadata: dict[str, str] = Field(default_factory=dict, description="Additional metadata")


class DocumentChunk(BaseModel):
    """Individual document chunk."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Parent document ID")
    text: str = Field(..., description="Chunk text content")
    chunk_index: int = Field(..., description="Position in document")
    page_number: int | None = Field(None, description="Page number if available")
    token_count: int | None = Field(None, description="Token count for this chunk")
    metadata: dict[str, str] = Field(default_factory=dict, description="Chunk-level metadata")


class DocumentUploadRequest(BaseModel):
    """Request for document upload."""

    title: str = Field(..., min_length=1, description="Document title")
    source_type: DocumentType = Field(DocumentType.PDF, description="Type of document")
    metadata: dict[str, str] = Field(default_factory=dict, description="Additional metadata")


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""

    document_id: str = Field(..., description="Generated document ID")
    title: str = Field(..., description="Document title")
    status: DocumentStatus = Field(..., description="Processing status")
    file_size_bytes: int | None = Field(None, description="File size")
    message: str = Field(..., description="Status message")


class WebCrawlRequest(BaseModel):
    """Request to crawl a website."""

    url: HttpUrl = Field(..., description="URL to crawl")
    title: str | None = Field(None, description="Optional document title")
    max_depth: int = Field(1, ge=1, le=3, description="Crawl depth (1 = single page)")
    include_patterns: list[str] = Field(
        default_factory=list,
        description="URL patterns to include"
    )
    exclude_patterns: list[str] = Field(
        default_factory=list,
        description="URL patterns to exclude"
    )
    metadata: dict[str, str] = Field(default_factory=dict, description="Additional metadata")


class WebCrawlResponse(BaseModel):
    """Response after web crawl."""

    document_id: str = Field(..., description="Generated document ID")
    url: str = Field(..., description="Crawled URL")
    pages_crawled: int = Field(..., description="Number of pages processed")
    status: DocumentStatus = Field(..., description="Processing status")
    message: str = Field(..., description="Status message")
