"""Documents API endpoints."""

import os
import uuid
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select

from app.models.document import (
    DocumentMetadata,
    DocumentUploadResponse,
    DocumentStatus,
    DocumentType,
    WebCrawlRequest,
    WebCrawlResponse
)
from app.services.document_processor import DocumentProcessor
from app.services.rag_engine import RAGEngine
from app.db import get_db
from app.db.postgres import Document as DBDocument
from app.config import get_settings

router = APIRouter(prefix="/api/documents", tags=["documents"])
doc_processor = DocumentProcessor()
rag = RAGEngine()
settings = get_settings()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    metadata: str = Form("{}")  # JSON string
):
    """
    Upload and process a document (PDF, TXT, etc.).

    The document will be:
    1. Saved to disk
    2. Processed and chunked
    3. Embedded and indexed in Pinecone
    4. Metadata saved to PostgreSQL
    """
    try:
        # Validate file type
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.allowed_file_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed types: {settings.allowed_file_types}"
            )

        # Generate document ID
        document_id = doc_processor.generate_document_id(
            title=title or file.filename,
            content_hash=None
        )

        # Create upload directory if it doesn't exist
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = upload_dir / f"{document_id}{file_ext}"
        content = await file.read()

        with open(file_path, "wb") as f:
            f.write(content)

        file_size = len(content)

        # Process document based on type
        if file_ext == ".pdf":
            chunks, doc_metadata = await doc_processor.chunk_pdf_by_pages(
                file_path=file_path,
                document_id=document_id
            )
        else:
            chunks, doc_metadata = await doc_processor.process_text_file(
                file_path=file_path,
                document_id=document_id
            )

        # Update title if provided
        if title:
            doc_metadata.title = title

        # Prepare chunks for embedding
        chunk_dicts = [
            {
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "text": chunk.text,
                "chunk_index": chunk.chunk_index,
                "metadata": {
                    "source": doc_metadata.title,
                    "page": chunk.page_number,
                    "document_id": document_id,
                    **chunk.metadata
                }
            }
            for chunk in chunks
        ]

        # Embed and upsert to Pinecone
        upsert_stats = await rag.upsert_chunks(chunk_dicts)

        # Save to PostgreSQL
        db = get_db()
        async with db.session() as session:
            db_doc = DBDocument(
                id=document_id,
                title=doc_metadata.title,
                source_type=doc_metadata.source_type.value,
                file_path=str(file_path),
                total_pages=doc_metadata.total_pages,
                total_tokens=doc_metadata.total_tokens,
                chunk_count=doc_metadata.chunk_count,
                status=DocumentStatus.COMPLETED.value,
                processed_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            session.add(db_doc)
            await session.commit()

        return DocumentUploadResponse(
            document_id=document_id,
            title=doc_metadata.title,
            status=DocumentStatus.COMPLETED,
            file_size_bytes=file_size,
            message=f"Document processed successfully. {upsert_stats['upserted']} chunks indexed."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.post("/crawl", response_model=WebCrawlResponse)
async def crawl_website(request: WebCrawlRequest):
    """
    Crawl a website and index its content.

    Note: This is a placeholder for MCP Firecrawl integration.
    For now, it returns a not implemented error.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Web crawling not yet implemented. Use MCP Firecrawl integration."
    )


@router.get("/{document_id}", response_model=DocumentMetadata)
async def get_document(document_id: str):
    """
    Get document metadata.

    Args:
        document_id: Document identifier

    Returns:
        Document metadata
    """
    try:
        db = get_db()

        async with db.session() as session:
            stmt = select(DBDocument).where(DBDocument.id == document_id)
            result = await session.execute(stmt)
            doc = result.scalar_one_or_none()

            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {document_id} not found"
                )

            return DocumentMetadata(
                document_id=doc.id,
                title=doc.title,
                source_type=DocumentType(doc.source_type),
                source_url=doc.source_url,
                file_path=doc.file_path,
                total_pages=doc.total_pages,
                total_tokens=doc.total_tokens,
                chunk_count=doc.chunk_count,
                status=DocumentStatus(doc.status),
                created_at=doc.created_at,
                processed_at=doc.processed_at,
                metadata=doc.metadata or {}
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching document: {str(e)}"
        )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str):
    """
    Delete a document and all its chunks.

    This will:
    1. Delete all chunks from Pinecone
    2. Delete document metadata from PostgreSQL
    3. Delete the physical file if it exists
    """
    try:
        db = get_db()

        async with db.session() as session:
            # Fetch document
            stmt = select(DBDocument).where(DBDocument.id == document_id)
            result = await session.execute(stmt)
            doc = result.scalar_one_or_none()

            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {document_id} not found"
                )

            # Delete from Pinecone
            await rag.delete_document(document_id)

            # Delete physical file
            if doc.file_path and os.path.exists(doc.file_path):
                os.remove(doc.file_path)

            # Delete from database
            await session.delete(doc)
            await session.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )


@router.get("/")
async def list_documents(
    limit: int = 50,
    offset: int = 0,
    source_type: str | None = None
):
    """
    List all documents.

    Args:
        limit: Maximum number of documents to return
        offset: Number of documents to skip
        source_type: Optional filter by source type

    Returns:
        List of documents with metadata
    """
    try:
        db = get_db()

        async with db.session() as session:
            stmt = select(DBDocument).order_by(
                DBDocument.created_at.desc()
            )

            if source_type:
                stmt = stmt.where(DBDocument.source_type == source_type)

            stmt = stmt.limit(limit).offset(offset)

            result = await session.execute(stmt)
            documents = result.scalars().all()

            return {
                "documents": [
                    {
                        "id": doc.id,
                        "title": doc.title,
                        "source_type": doc.source_type,
                        "total_pages": doc.total_pages,
                        "chunk_count": doc.chunk_count,
                        "status": doc.status,
                        "created_at": doc.created_at.isoformat(),
                        "processed_at": doc.processed_at.isoformat() if doc.processed_at else None
                    }
                    for doc in documents
                ],
                "count": len(documents),
                "offset": offset
            }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing documents: {str(e)}"
        )
