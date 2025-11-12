# Market Intelligence RAG Backend

FastAPI backend with RAG (Retrieval-Augmented Generation) for competitive intelligence.

## Features

- 🤖 **RAG Engine**: Claude Sonnet 4.5 + Pinecone for intelligent Q&A
- 📄 **Document Processing**: PDF, TXT, MD, DOCX with smart chunking
- 🔍 **Vector Search**: Pinecone serverless for fast retrieval
- 💬 **Conversation Management**: PostgreSQL-backed chat history
- 🌐 **MCP Integrations**: Firecrawl (web crawling) & Brave Search
- 🚀 **Production Ready**: Docker support, async operations, error handling

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐       ┌──────────┐
  │  Claude  │        │ Pinecone │       │PostgreSQL│
  │Sonnet 4.5│        │  Vector  │       │   Chat   │
  │   API    │        │   Store  │       │ History  │
  └──────────┘        └──────────┘       └──────────┘
        │
        ▼
  ┌──────────┐
  │  OpenAI  │
  │Embeddings│
  │   API    │
  └──────────┘
```

## Prerequisites

- Python 3.11+
- Poetry (package manager)
- PostgreSQL 15+
- API Keys:
  - Anthropic (Claude)
  - OpenAI (embeddings)
  - Pinecone

## Quick Start

### 1. Install Dependencies

```bash
cd backend
poetry install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

**Required configuration:**
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/market_intelligence
```

### 3. Start PostgreSQL

Using Docker:
```bash
# From project root
docker-compose up postgres -d
```

Or use your own PostgreSQL instance.

### 4. Run the Backend

```bash
poetry run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

### 5. Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Docker Setup (Recommended)

Run everything with Docker Compose:

```bash
# From project root
docker-compose up
```

This starts:
- PostgreSQL on port 5432
- Backend API on port 8000

## API Endpoints

### Chat

**POST /api/chat**
```json
{
  "message": "What are Acme Corp's main features?",
  "conversation_id": "conv_abc123",
  "top_k": 5
}
```

Response:
```json
{
  "answer": "According to the documents...",
  "sources": [
    {
      "source": "acme-report.pdf",
      "page": 12,
      "relevance_score": 0.92
    }
  ],
  "conversation_id": "conv_abc123",
  "model_used": "claude-sonnet-4-20250514",
  "tokens_used": 1234,
  "processing_time_ms": 2500
}
```

**GET /api/chat/history/{conversation_id}**

Get full conversation history.

**GET /api/chat/conversations**

List all conversations.

**DELETE /api/chat/{conversation_id}**

Delete a conversation.

### Documents

**POST /api/documents/upload**

Upload a document (multipart/form-data):
```
file: [PDF/TXT/MD/DOCX file]
title: "Document Title"
metadata: "{}"
```

Response:
```json
{
  "document_id": "doc_abc123",
  "title": "Acme Corp Report",
  "status": "completed",
  "file_size_bytes": 1234567,
  "message": "Document processed successfully. 58 chunks indexed."
}
```

**GET /api/documents/{document_id}**

Get document metadata.

**GET /api/documents/**

List all documents.

**DELETE /api/documents/{document_id}**

Delete a document and its chunks.

## RAG Pipeline

### 1. Document Upload
```
PDF → Extract Text → Chunk (1000 tokens) → Embed → Store in Pinecone
```

### 2. Query Processing
```
User Query → Embed → Search Pinecone → Retrieve Top-K → Claude Synthesis → Response
```

### 3. Chunking Strategy

- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Page Tracking**: Preserved for PDFs
- **Metadata**: Source, page, document_id

### 4. Embedding Model

OpenAI `text-embedding-3-large` (3072 dimensions)

## Configuration

All configuration via environment variables (see [.env.example](backend/.env.example)):

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `PINECONE_API_KEY` | Pinecone API key | - |
| `DATABASE_URL` | PostgreSQL connection | - |
| `CLAUDE_MODEL` | Claude model | `claude-sonnet-4-20250514` |
| `CHUNK_SIZE` | Text chunk size | 1000 |
| `RETRIEVAL_TOP_K` | Documents to retrieve | 5 |
| `SIMILARITY_THRESHOLD` | Min similarity score | 0.7 |

## Development

### Run Tests

```bash
poetry run pytest
```

### Code Quality

```bash
# Format code
poetry run black app/

# Lint
poetry run ruff app/

# Type check
poetry run mypy app/
```

### Database Migrations

```bash
# Create migration
poetry run alembic revision --autogenerate -m "description"

# Apply migrations
poetry run alembic upgrade head
```

## MCP Integrations

### Firecrawl (Web Crawling)

```python
from app.services.mcp_client import get_mcp_client

mcp = get_mcp_client()

# Scrape single page
result = await mcp.firecrawl_scrape("https://example.com")

# Crawl website
job = await mcp.firecrawl_crawl("https://example.com", max_depth=2)
```

### Brave Search

```python
# Search web
results = await mcp.brave_search("Acme Corp news", count=10)
```

## Production Deployment

### Environment Variables

Set all required environment variables in your hosting platform.

### Recommended Hosting

- **Backend**: Railway, Render, Fly.io
- **Database**: Supabase, Railway, Neon
- **Vector DB**: Pinecone Serverless

### Health Checks

- **Health**: `GET /health`
- **Status**: `GET /`

## Performance

### Typical Response Times

- Document upload (10 pages PDF): ~5-10 seconds
- Chat query: ~2-4 seconds
- Vector search: ~100-300ms

### Scaling

- Pinecone: Serverless auto-scales
- PostgreSQL: Use connection pooling
- FastAPI: Deploy multiple instances behind load balancer

## Troubleshooting

### Pinecone Index Not Found

```bash
# Index is created automatically on first startup
# Or create manually via Pinecone console
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
psql $DATABASE_URL
```

### Out of Memory

Increase `CHUNK_SIZE` to reduce number of chunks:
```env
CHUNK_SIZE=2000
```

## Cost Estimates (Monthly)

- **Claude API**: $50-200 (varies by usage)
- **OpenAI Embeddings**: $10-50
- **Pinecone**: $0-20 (serverless)
- **PostgreSQL**: $0-25 (free tier available)

**Total**: $60-295/month for small-medium usage

## License

Proprietary - Market Intelligence Platform

## Support

For issues or questions, contact the development team.
