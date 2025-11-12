"""Embedding service using OpenAI."""

import asyncio
from typing import Any
from openai import AsyncOpenAI
import tiktoken

from app.config import get_settings


class EmbeddingService:
    """Service for creating text embeddings."""

    def __init__(self) -> None:
        """Initialize embedding service."""
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_embedding_model
        self.encoding = tiktoken.encoding_for_model("gpt-4")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))

    async def embed_text(self, text: str) -> list[float]:
        """
        Create embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            Embedding vector
        """
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
            encoding_format="float"
        )
        return response.data[0].embedding

    async def embed_batch(
        self,
        texts: list[str],
        batch_size: int = 100
    ) -> list[list[float]]:
        """
        Create embeddings for multiple texts with batching.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts per batch

        Returns:
            List of embedding vectors
        """
        all_embeddings: list[list[float]] = []

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            response = await self.client.embeddings.create(
                model=self.model,
                input=batch,
                encoding_format="float"
            )

            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

            # Small delay to avoid rate limits
            if i + batch_size < len(texts):
                await asyncio.sleep(0.1)

        return all_embeddings

    async def embed_documents(
        self,
        documents: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Embed documents with their metadata.

        Args:
            documents: List of document dicts with 'text' and other fields

        Returns:
            Documents with 'embedding' field added
        """
        texts = [doc["text"] for doc in documents]
        embeddings = await self.embed_batch(texts)

        for doc, embedding in zip(documents, embeddings):
            doc["embedding"] = embedding

        return documents
