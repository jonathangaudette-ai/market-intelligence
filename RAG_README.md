# Market Intelligence RAG Application

Complete RAG (Retrieval-Augmented Generation) application for competitive intelligence with FastAPI backend and Next.js frontend.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- API Keys: Anthropic (Claude), OpenAI, Pinecone

### 1-Command Startup (Docker)

```bash
# Clone and navigate to project
cd market-intelligence

# Create backend .env
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start everything
docker-compose up
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS FRONTEND                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Chat Interface│  │Document Upload│  │  RAG UI      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                     FASTAPI BACKEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  RAG Engine  │  │Doc Processor │  │ MCP Client   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬─────────────────┬──────────────────┬──────────────────┘
         │                 │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Claude  │       │Pinecone │       │PostgreSQL│
    │Sonnet4.5│       │ Vectors │       │   DB     │
    └─────────┘       └─────────┘       └──────────┘
```

## 📦 Project Structure

```
market-intelligence/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # REST endpoints
│   │   │   ├── chat.py        # Chat API
│   │   │   └── documents.py   # Document management
│   │   ├── services/          # Business logic
│   │   │   ├── rag_engine.py         # Core RAG
│   │   │   ├── embedding.py          # Embeddings
│   │   │   ├── document_processor.py # PDF processing
│   │   │   └── mcp_client.py         # Integrations
│   │   ├── models/            # Pydantic models
│   │   ├── db/                # Database clients
│   │   ├── config.py          # Configuration
│   │   └── main.py            # FastAPI app
│   ├── pyproject.toml         # Poetry dependencies
│   ├── Dockerfile
│   └── .env.example
│
├── src/                       # Next.js frontend
│   ├── components/
│   │   └── rag/              # RAG components
│   │       ├── chat-interface.tsx
│   │       ├── message-list.tsx
│   │       ├── chat-input.tsx
│   │       └── document-upload.tsx
│   └── app/                  # Next.js app router
│
├── docker-compose.yml        # Dev environment
└── RAG_README.md            # This file
```

## 🎯 Features

### Backend (FastAPI)

- ✅ **RAG Engine**: Claude Sonnet 4.5 + Pinecone vector search
- ✅ **Document Processing**: PDF, TXT, MD, DOCX with smart chunking
- ✅ **Embeddings**: OpenAI text-embedding-3-large (3072d)
- ✅ **Conversation Memory**: PostgreSQL-backed chat history
- ✅ **REST API**: Complete CRUD for chat and documents
- ✅ **MCP Integrations**: Firecrawl & Brave Search foundation

### Frontend (Next.js)

- ✅ **Chat Interface**: Real-time conversation with RAG
- ✅ **Source Citations**: Clickable sources with page numbers
- ✅ **Document Upload**: Drag & drop PDF/text files
- ✅ **Conversation History**: Browse previous chats
- ✅ **Responsive Design**: Works on desktop and mobile

## 🛠️ Development Setup

### Backend

```bash
cd backend

# Install dependencies
poetry install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start PostgreSQL
docker-compose up postgres -d

# Run backend
poetry run uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000

### Frontend

```bash
# Install dependencies
npm install

# Configure environment
# Add to .env.local:
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Run frontend
npm run dev
```

Frontend runs on http://localhost:3000

## 🔧 Configuration

### Backend Environment (.env)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
DATABASE_URL=postgresql://...

# Optional
FIRECRAWL_API_KEY=...
BRAVE_API_KEY=...
```

### Frontend Environment (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 📖 Usage Guide

### 1. Upload a Document

1. Navigate to the "Documents" tab
2. Select a PDF, TXT, or MD file
3. Give it a title
4. Click "Upload Document"
5. Wait for processing (~5-10 seconds)

### 2. Ask Questions

1. Go to the "Chat" tab
2. Type your question about the uploaded documents
3. Get AI-generated answers with source citations
4. Click sources to see page numbers and snippets

### Example Queries

```
"What are Acme Corp's main product features?"
"Compare their pricing to our pricing"
"Summarize the competitive landscape from the report"
"What are their key differentiators?"
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
poetry run pytest
```

### Integration Test

```bash
# Upload a document
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@test.pdf" \
  -F "title=Test Document"

# Ask a question
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is this document about?"}'
```

## 📊 RAG Pipeline Explained

### Document Ingestion

```
1. Upload PDF
   ↓
2. Extract text by page
   ↓
3. Chunk text (1000 chars, 200 overlap)
   ↓
4. Generate embeddings (OpenAI)
   ↓
5. Store in Pinecone with metadata
   ↓
6. Save metadata in PostgreSQL
```

### Query Processing

```
1. User asks question
   ↓
2. Embed question (OpenAI)
   ↓
3. Search Pinecone (top-5 similar chunks)
   ↓
4. Build context from chunks
   ↓
5. Send to Claude with context
   ↓
6. Return answer + sources
   ↓
7. Save to conversation history
```

## 🚀 Deployment

### Backend Deployment

**Option 1: Railway**
```bash
cd backend
railway up
```

**Option 2: Render**
```bash
# Connect GitHub repo
# Add environment variables
# Deploy from dashboard
```

**Option 3: Fly.io**
```bash
cd backend
fly launch
fly secrets set ANTHROPIC_API_KEY=...
fly deploy
```

### Frontend Deployment

**Vercel (Recommended)**
```bash
vercel deploy
```

Set environment variable:
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

### Database

- **Supabase**: Free PostgreSQL tier
- **Railway**: PostgreSQL plugin
- **Neon**: Serverless PostgreSQL

### Vector Database

- **Pinecone**: Serverless tier (free to start)

## 💰 Cost Breakdown

For 100 documents, 1000 queries/month:

| Service | Cost/Month |
|---------|-----------|
| Claude API | $50-150 |
| OpenAI Embeddings | $10-30 |
| Pinecone Serverless | $0-20 |
| PostgreSQL (Supabase) | $0 (free tier) |
| Backend Hosting (Railway) | $0-5 (free tier) |
| Frontend Hosting (Vercel) | $0 (free tier) |
| **Total** | **$60-205** |

## 🔍 API Examples

### Upload Document

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@competitor-report.pdf" \
  -F "title=Acme Corp Q4 Report"
```

### Chat Query

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key features?",
    "top_k": 5
  }'
```

### List Documents

```bash
curl http://localhost:8000/api/documents/
```

### Get Conversation History

```bash
curl http://localhost:8000/api/chat/history/{conversation_id}
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check environment variables
cat backend/.env

# View logs
docker-compose logs backend
```

### Frontend can't connect to backend

```bash
# Verify backend is running
curl http://localhost:8000/health

# Check NEXT_PUBLIC_BACKEND_URL
echo $NEXT_PUBLIC_BACKEND_URL
```

### Pinecone errors

```bash
# Verify API key
# Check index name matches config
# Pinecone index is auto-created on first run
```

### Out of memory

```bash
# Increase chunk size
echo "CHUNK_SIZE=2000" >> backend/.env

# Or reduce batch size in embedding service
```

## 📚 Documentation

- [Backend README](backend/README.md) - Complete backend documentation
- [API Docs](http://localhost:8000/docs) - Interactive API documentation
- [Plan Implementation](plan-implementation-app-rag.md) - Original planning document

## 🎓 Learning Resources

- [Claude API Docs](https://docs.anthropic.com/)
- [Pinecone Docs](https://docs.pinecone.io/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## 📝 License

Proprietary - Market Intelligence Platform

## 🆘 Support

For questions or issues:
- Check backend logs: `docker-compose logs backend`
- Check frontend logs: Browser console
- Review API docs: http://localhost:8000/docs

---

**Built with**: FastAPI + Next.js + Claude Sonnet 4.5 + Pinecone + PostgreSQL
