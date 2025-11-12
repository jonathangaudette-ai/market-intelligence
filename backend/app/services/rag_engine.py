"""Core RAG engine for retrieval and synthesis."""

import time
from typing import Any

from anthropic import AsyncAnthropic
from pinecone import Pinecone

from app.config import get_settings
from app.models.chat import Source
from app.services.embedding import EmbeddingService


class RAGEngine:
    """RAG engine for retrieval-augmented generation."""

    def __init__(self) -> None:
        """Initialize RAG engine."""
        self.settings = get_settings()
        self.claude = AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        self.embedding_service = EmbeddingService()

        # Initialize Pinecone
        pc = Pinecone(api_key=self.settings.pinecone_api_key)
        self.index = pc.Index(self.settings.pinecone_index_name)

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filter_dict: dict[str, Any] | None = None,
        min_score: float | None = None
    ) -> list[dict[str, Any]]:
        """
        Retrieve relevant documents from Pinecone.

        Args:
            query: Search query
            top_k: Number of results to return
            filter_dict: Metadata filters
            min_score: Minimum similarity score threshold

        Returns:
            List of retrieved documents with metadata
        """
        # Create query embedding
        query_embedding = await self.embedding_service.embed_text(query)

        # Query Pinecone
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            filter=filter_dict,
            include_metadata=True
        )

        # Apply minimum score filter if specified
        min_score = min_score or self.settings.similarity_threshold

        # Format results
        retrieved_docs = []
        for match in results.matches:
            if match.score >= min_score:
                doc = {
                    "id": match.id,
                    "text": match.metadata.get("text", ""),
                    "source": match.metadata.get("source", "Unknown"),
                    "page": match.metadata.get("page"),
                    "chunk_id": match.id,
                    "score": match.score,
                    "document_id": match.metadata.get("document_id", ""),
                    "metadata": match.metadata
                }
                retrieved_docs.append(doc)

        return retrieved_docs

    async def synthesize(
        self,
        query: str,
        context_docs: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None
    ) -> tuple[str, dict[str, Any]]:
        """
        Generate answer using Claude with RAG context.

        Args:
            query: User question
            context_docs: Retrieved context documents
            conversation_history: Previous messages

        Returns:
            Tuple of (answer text, metadata)
        """
        # Build context from retrieved documents
        context_parts = []
        for idx, doc in enumerate(context_docs, start=1):
            source_info = f"Source: {doc['source']}"
            if doc.get('page'):
                source_info += f", Page: {doc['page']}"

            context_parts.append(
                f"[Document {idx}] {source_info}\n{doc['text']}\n"
            )

        context_text = "\n".join(context_parts)

        # Build messages
        messages = []

        # Add conversation history if exists
        if conversation_history:
            messages.extend(conversation_history)

        # Add current query with context
        user_message = f"""Answer the following question using ONLY the provided context documents.
Always cite your sources using [Document X] notation.

<context>
{context_text}
</context>

<question>
{query}
</question>

Instructions:
- Answer in the same language as the question
- Be concise but comprehensive
- Always cite sources for claims using [Document X] format
- If the context doesn't contain enough information to answer fully, say so clearly
- Synthesize information from multiple sources when relevant
- For competitive intelligence queries, provide actionable insights"""

        messages.append({
            "role": "user",
            "content": user_message
        })

        # Call Claude
        start_time = time.time()

        response = await self.claude.messages.create(
            model=self.settings.claude_model,
            max_tokens=self.settings.claude_max_tokens,
            messages=messages
        )

        processing_time = (time.time() - start_time) * 1000  # Convert to ms

        # Extract answer
        answer = response.content[0].text

        # Collect metadata
        metadata = {
            "model": self.settings.claude_model,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "processing_time_ms": processing_time,
            "stop_reason": response.stop_reason
        }

        return answer, metadata

    async def query(
        self,
        user_query: str,
        conversation_history: list[dict[str, str]] | None = None,
        filters: dict[str, Any] | None = None,
        top_k: int = 5
    ) -> dict[str, Any]:
        """
        Full RAG pipeline: retrieve → synthesize → return with sources.

        Args:
            user_query: User question
            conversation_history: Previous conversation messages
            filters: Metadata filters for retrieval
            top_k: Number of documents to retrieve

        Returns:
            Dictionary with answer, sources, and metadata
        """
        # Step 1: Retrieve relevant documents
        retrieved_docs = await self.retrieve(
            query=user_query,
            top_k=top_k,
            filter_dict=filters
        )

        if not retrieved_docs:
            # No relevant documents found
            return {
                "answer": "I don't have enough information in my knowledge base to answer this question. Please upload relevant documents or try a different query.",
                "sources": [],
                "model_used": self.settings.claude_model,
                "tokens_used": 0,
                "processing_time_ms": 0,
                "retrieved_doc_count": 0
            }

        # Step 2: Synthesize answer
        answer, gen_metadata = await self.synthesize(
            query=user_query,
            context_docs=retrieved_docs,
            conversation_history=conversation_history
        )

        # Step 3: Format sources
        sources = [
            Source(
                source=doc["source"],
                page=doc.get("page"),
                chunk_id=doc["chunk_id"],
                relevance_score=doc["score"],
                text_snippet=doc["text"][:200] + "..." if len(doc["text"]) > 200 else doc["text"]
            )
            for doc in retrieved_docs
        ]

        # Step 4: Return complete response
        return {
            "answer": answer,
            "sources": [s.model_dump() for s in sources],
            "model_used": gen_metadata["model"],
            "tokens_used": gen_metadata["tokens_used"],
            "processing_time_ms": gen_metadata["processing_time_ms"],
            "retrieved_doc_count": len(retrieved_docs),
            "metadata": gen_metadata
        }

    async def upsert_chunks(
        self,
        chunks: list[dict[str, Any]],
        batch_size: int = 100
    ) -> dict[str, int]:
        """
        Embed and upsert document chunks to Pinecone.

        Args:
            chunks: List of chunk dictionaries with text and metadata
            batch_size: Number of chunks per batch

        Returns:
            Statistics about the upsert operation
        """
        total_chunks = len(chunks)
        upserted_count = 0

        # Embed all chunks
        embedded_chunks = await self.embedding_service.embed_documents(chunks)

        # Upsert in batches
        for i in range(0, len(embedded_chunks), batch_size):
            batch = embedded_chunks[i:i + batch_size]

            # Format for Pinecone
            vectors = []
            for chunk in batch:
                vector = {
                    "id": chunk["chunk_id"],
                    "values": chunk["embedding"],
                    "metadata": {
                        "text": chunk["text"],
                        "source": chunk["metadata"].get("source", ""),
                        "document_id": chunk["document_id"],
                        "chunk_index": chunk["chunk_index"],
                        **chunk["metadata"]  # Include all other metadata
                    }
                }
                vectors.append(vector)

            # Upsert to Pinecone
            self.index.upsert(vectors=vectors)
            upserted_count += len(vectors)

        return {
            "total_chunks": total_chunks,
            "upserted": upserted_count
        }

    async def delete_document(self, document_id: str) -> bool:
        """
        Delete all chunks for a document from Pinecone.

        Args:
            document_id: Document identifier

        Returns:
            Success status
        """
        try:
            self.index.delete(filter={"document_id": document_id})
            return True
        except Exception:
            return False
