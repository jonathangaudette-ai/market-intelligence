# RAG Application - Quick Start Guide

This guide will help you get the RAG (Retrieval-Augmented Generation) application running in **under 5 minutes**.

## What You'll Get

- ✅ FastAPI backend with RAG capabilities
- ✅ Next.js frontend with chat interface
- ✅ PostgreSQL database
- ✅ Pinecone vector search
- ✅ Claude Sonnet 4.5 for AI responses

## Prerequisites Checklist

- [ ] Docker & Docker Compose installed
- [ ] API Keys ready:
  - Anthropic (already in `.env.local`)
  - OpenAI (already in `.env.local`)
  - Pinecone (already in `.env.local`)

## 🚀 3-Step Setup

### Step 1: Start Backend & Database

```bash
# Start PostgreSQL and Backend
docker-compose up -d

# Wait 30 seconds for initialization...
```

**Check it works:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Step 2: Verify Frontend Config

Your frontend is already configured! The `.env.local` file now includes:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
```

### Step 3: Start Frontend

```bash
npm run dev
```

**Open**: http://localhost:3000

## 🎉 You're Ready!

### Test the Application

1. **Access the Frontend**: http://localhost:3000
2. **Navigate to RAG Chat**: Add `/rag` to the URL or integrate into your app
3. **Upload a Document**:
   - Click "Documents" tab
   - Upload a PDF file
   - Wait for processing (~5-10 seconds)
4. **Ask Questions**:
   - Click "Chat" tab
   - Ask: "What is this document about?"
   - Get AI-powered answers with sources!

## 📝 Quick Test with curl

### Test Document Upload

```bash
# Upload a PDF
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@your-document.pdf" \
  -F "title=Test Document"
```

### Test Chat

```bash
# Ask a question
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is this document about?",
    "top_k": 5
  }'
```

## 🔍 Available Endpoints

### Backend API
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health
- **Chat**: `POST /api/chat`
- **Upload**: `POST /api/documents/upload`
- **Documents**: `GET /api/documents/`

### Frontend
- **App**: http://localhost:3000
- **RAG Interface**: Create a page at `src/app/rag/page.tsx`

## 🎨 Integrate RAG into Your App

### Option 1: Create a Dedicated RAG Page

```bash
mkdir -p src/app/rag
```

Create `src/app/rag/page.tsx`:
```typescript
import { ChatInterface } from "@/components/rag";

export default function RAGPage() {
  return (
    <div className="container mx-auto">
      <ChatInterface />
    </div>
  );
}
```

Now visit: http://localhost:3000/rag

### Option 2: Add to Existing Dashboard

```typescript
import { ChatInterface } from "@/components/rag";

// In your dashboard component:
<ChatInterface />
```

## 📊 Verify Services

```bash
# Check all services
docker-compose ps

# Should show:
# - market-intel-postgres (healthy)
# - market-intel-backend (running)

# Check logs
docker-compose logs backend
docker-compose logs postgres
```

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. PostgreSQL not ready → Wait 30 seconds
# 2. API keys missing → Check backend/.env
# 3. Port 8000 in use → Stop other services
```

### Can't upload documents

```bash
# Check backend is running
curl http://localhost:8000/health

# Check upload directory exists
docker-compose exec backend ls -la /app/uploads
```

### Frontend can't connect

```bash
# Verify backend URL
cat .env.local | grep NEXT_PUBLIC_BACKEND_URL

# Should be: http://localhost:8000

# Restart frontend
npm run dev
```

### Pinecone errors

The Pinecone index will be **automatically created** on first run. If you see errors:

1. Check API key in `backend/.env`
2. Index name is set to `market-intelligence-rag`
3. Wait 1-2 minutes for index creation

## 🎯 Next Steps

### 1. Upload Your First Document

- Go to Documents tab
- Upload a competitor report or PDF
- Wait for "Document processed successfully"

### 2. Start Chatting

- Switch to Chat tab
- Ask: "What are the key findings?"
- Get AI responses with source citations

### 3. Explore API

- Visit http://localhost:8000/docs
- Try different endpoints
- Check conversation history

### 4. Customize

- Adjust chunk size in `backend/.env`
- Change similarity threshold
- Modify UI in `src/components/rag/`

## 📚 Documentation

- **Full README**: [RAG_README.md](RAG_README.md)
- **Backend Docs**: [backend/README.md](backend/README.md)
- **API Reference**: http://localhost:8000/docs

## 💰 Cost Monitoring

Track your API usage:
- **Claude**: https://console.anthropic.com
- **OpenAI**: https://platform.openai.com/usage
- **Pinecone**: https://app.pinecone.io

## 🛑 Stop Services

```bash
# Stop everything
docker-compose down

# Stop and remove data
docker-compose down -v
```

## ✅ Quick Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] PostgreSQL healthy
- [ ] Uploaded test document
- [ ] Received AI response
- [ ] Sources showing correctly

## 🎉 Success!

You now have a fully functional RAG application for competitive intelligence!

**Happy building!** 🚀

---

**Need help?** Check the full documentation in [RAG_README.md](RAG_README.md)
