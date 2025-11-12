"""Chat-related Pydantic models."""

from datetime import datetime
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Single message in a conversation."""

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime | None = Field(default=None, description="Message timestamp")


class Source(BaseModel):
    """Source citation for RAG response."""

    source: str = Field(..., description="Source file name")
    page: int | None = Field(None, description="Page number if available")
    chunk_id: str | None = Field(None, description="Chunk identifier")
    relevance_score: float = Field(..., description="Similarity score (0-1)")
    text_snippet: str | None = Field(None, description="Relevant text snippet")


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""

    message: str = Field(..., min_length=1, description="User message")
    conversation_id: str | None = Field(None, description="Existing conversation ID")
    filters: dict[str, str] | None = Field(
        None,
        description="Metadata filters for retrieval (e.g., {'source_type': 'competitor_report'})"
    )
    top_k: int = Field(5, ge=1, le=20, description="Number of documents to retrieve")
    stream: bool = Field(False, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""

    answer: str = Field(..., description="Generated answer")
    sources: list[Source] = Field(default_factory=list, description="Source citations")
    conversation_id: str = Field(..., description="Conversation identifier")
    model_used: str = Field(..., description="Model used for generation")
    tokens_used: int | None = Field(None, description="Tokens consumed")
    processing_time_ms: float | None = Field(None, description="Processing time in milliseconds")


class ConversationHistory(BaseModel):
    """Full conversation history."""

    conversation_id: str
    messages: list[Message]
    created_at: datetime
    updated_at: datetime
    metadata: dict[str, str] | None = None
