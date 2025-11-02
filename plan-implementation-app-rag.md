# Plan d'Implémentation - Application RAG Intelligence Compétitive
## De la Vision au Code: Construisons Ensemble

**Date:** 1er novembre 2025
**Objectif:** Créer une application fonctionnelle avec RAG pour l'intelligence compétitive
**Philosophie:** Start small, iterate fast, scale progressively

---

## 1. Qu'allons-nous Construire?

### 1.1 MVP - Application RAG Fonctionnelle (Semaine 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPETITIVE INTEL APP v0.1                │
└─────────────────────────────────────────────────────────────┘

USER INTERFACE (Web)
  ├─ Chat conversationnel (interface principale)
  ├─ Upload de documents (PDFs, sites web)
  └─ Affichage des sources citées

BACKEND (FastAPI)
  ├─ API REST endpoints
  ├─ RAG Engine (Claude Sonnet 4.5 + Pinecone)
  ├─ Document processing pipeline
  └─ MCP integrations (Firecrawl, Brave Search)

DATA LAYER
  ├─ Pinecone (vector store)
  ├─ PostgreSQL (metadata, chat history)
  └─ S3 / Local storage (raw documents)

CORE FEATURES
  ✓ Upload PDF (rapport concurrent, case study)
  ✓ Crawl website concurrent (via Firecrawl)
  ✓ Chat avec contexte RAG
  ✓ Citations avec sources
  ✓ Mémoire de conversation
  ✓ Multi-document synthesis
```

### 1.2 Ce que vous pourrez faire (MVP)

```
Example 1: Analyser un concurrent
────────────────────────────────
YOU: "Upload rapport-acme-corp.pdf"
APP: ✓ Document uploaded (47 pages, 12,000 tokens)
     ✓ Chunked into 58 segments
     ✓ Embedded and indexed in Pinecone

YOU: "Quelles sont les principales forces d'Acme Corp?"
APP: [Analyse le PDF via RAG, répond avec citations]
     "D'après le rapport (page 12), les principales forces sont:
     1. Strong brand recognition (mentionné 8 fois)
     2. Enterprise customer base (45% de leur revenue)
     3. Technical expertise in AI (15 ML engineers hired Q3)

     Sources: rapport-acme-corp.pdf (p.12, p.23, p.31)"

YOU: "Compare leur pricing au nôtre"
APP: [Se souvient du contexte, continue la conversation]
     "Le rapport indique leur pricing à $899/mo pour Enterprise
     (page 18). Si je compare à votre pricing actuel...

     [Peut je crawler votre site de pricing pour comparaison?]"

YOU: "Oui, crawl https://ourcompany.com/pricing"
APP: ✓ Crawling with Firecrawl...
     ✓ Extracted pricing: $799/mo Enterprise

     "Comparaison:
     • Vous: $799/mo (100 cheaper)
     • Acme: $899/mo
     • Votre avantage: 11% moins cher

     Recommandation: Emphasize price advantage in battlecard"
```

```
Example 2: Recherche web augmentée
───────────────────────────────────
YOU: "Trouve les dernières news sur Acme Corp"
APP: [Utilise Brave Search MCP]
     ✓ Found 12 recent articles
     ✓ Analyzing with Claude...

     "Résumé des news (last 30 days):

     1. 🎯 Series B Funding - $45M (Oct 15)
        Source: TechCrunch
        Implication: Expect aggressive hiring & expansion

     2. 💼 New Enterprise Tier Launch (Oct 28)
        Source: Company blog
        Pricing: $899/mo (↑ from $799 previous)

     3. 🤝 Partnership with BigCo (Oct 20)
        Source: Press release
        Impact: Access to 1,500 BigCo customers

     [View all sources] [Add to knowledge base]"

YOU: "Ajoute ces news à ma knowledge base"
APP: ✓ 12 articles embedded in Pinecone
     ✓ Available for future queries

     "Knowledge base updated. Vous pouvez maintenant demander:
     • 'Analyse l'impact de leur funding sur nous'
     • 'Compare leur partnership à nos partenaires'
     • etc."
```

---

## 2. Architecture Technique

### 2.1 Stack Choisi (Simple mais Scalable)

```yaml
FRONTEND:
  framework: Next.js 14 (App Router)
  ui: Tailwind CSS + shadcn/ui
  chat: Vercel AI SDK (streaming)

BACKEND:
  framework: FastAPI (Python 3.11+)
  async: asyncio + httpx

AI/LLM:
  primary: Claude Sonnet 4.5 (Anthropic API)
  embeddings: text-embedding-3-large (OpenAI)

VECTOR DB:
  pinecone: Serverless (pay-per-use, easy setup)

DATABASE:
  postgresql: Supabase (managed, free tier)

STORAGE:
  files: Supabase Storage (ou S3 si préféré)

INTEGRATIONS (MCP):
  - Firecrawl (web crawling)
  - Brave Search (recherche web)
  - (Extensible: Apify, etc.)

DEPLOYMENT:
  backend: Railway / Render (free tier disponible)
  frontend: Vercel (free tier)

DEV TOOLS:
  package_manager: Poetry (Python), pnpm (JS)
  code_quality: ruff, mypy, eslint
  env: docker-compose (dev local)
```

### 2.2 Pourquoi ce Stack?

| Choix | Raison |
|-------|--------|
| **FastAPI** | Async native, excellent pour RAG (I/O bound), auto-docs |
| **Claude Sonnet 4.5** | 200K context, extended thinking, meilleur raisonnement |
| **Pinecone Serverless** | Zero ops, pay-per-use, fast setup |
| **Supabase** | PostgreSQL managé, auth built-in, free tier généreux |
| **Next.js 14** | SSR, streaming, excellent DX |
| **Vercel AI SDK** | Streaming chat out-of-the-box |

**Coûts estimés (MVP, 1-10 users):**
- Pinecone: $0-20/mois (serverless)
- Supabase: $0 (free tier suffit)
- Claude API: ~$50-200/mois (selon usage)
- Hosting: $0 (Vercel + Railway free tiers)
- **Total: $50-220/mois** pour démarrer

---

## 3. Structure du Projet

```
market-intelligence-app/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry
│   │   ├── config.py          # Configuration
│   │   ├── models/            # Pydantic models
│   │   │   ├── chat.py
│   │   │   ├── document.py
│   │   │   └── competitor.py
│   │   ├── services/          # Business logic
│   │   │   ├── rag_engine.py      # Core RAG logic
│   │   │   ├── embedding.py       # Embeddings
│   │   │   ├── document_processor.py
│   │   │   ├── mcp_client.py      # MCP integrations
│   │   │   └── claude_client.py   # Claude API wrapper
│   │   ├── api/               # API routes
│   │   │   ├── chat.py
│   │   │   ├── documents.py
│   │   │   └── competitors.py
│   │   └── db/                # Database
│   │       ├── postgres.py
│   │       └── pinecone.py
│   ├── tests/
│   ├── pyproject.toml         # Poetry dependencies
│   └── Dockerfile
│
├── frontend/                   # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Home / Chat interface
│   │   ├── layout.tsx
│   │   └── api/               # API routes (proxy)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── documents/
│   │   │   └── DocumentUpload.tsx
│   │   └── ui/                # shadcn components
│   ├── lib/
│   │   └── api-client.ts      # Backend API client
│   ├── package.json
│   └── next.config.js
│
├── docker-compose.yml         # Dev environment
├── .env.example              # Environment variables template
└── README.md                 # Setup instructions
```

---

## 4. Plan d'Implémentation (Progressive)

### Phase 1: Setup & Foundation (Jour 1-2)

```bash
✓ Tâches
──────────
□ Créer structure projet (backend + frontend)
□ Setup Poetry (backend dependencies)
□ Setup Next.js (frontend)
□ Configuration .env (API keys)
□ Docker compose (PostgreSQL local)
□ Test connections (Pinecone, Claude, PostgreSQL)

Résultat: Projet prêt, connexions validées
```

### Phase 2: RAG Core Engine (Jour 3-5)

```bash
✓ Tâches
──────────
□ Implement embedding service (OpenAI)
□ Implement Pinecone client (upsert, query)
□ Implement document processor (PDF → chunks)
□ Implement RAG engine (retrieve + synthesize)
□ Test RAG pipeline end-to-end

Résultat: RAG engine fonctionnel (sans UI)
```

### Phase 3: API Backend (Jour 6-7)

```bash
✓ Tâches
──────────
□ POST /api/documents/upload (upload PDF)
□ POST /api/documents/crawl (crawl website)
□ POST /api/chat (chat avec RAG)
□ GET /api/chat/history (historique)
□ PostgreSQL schema (conversations, documents)

Résultat: API REST complète et testée
```

### Phase 4: Frontend Chat (Jour 8-10)

```bash
✓ Tâches
──────────
□ Chat interface (composant React)
□ Message streaming (Vercel AI SDK)
□ Document upload UI
□ Citations display (sources avec liens)
□ Conversation history

Résultat: Interface utilisable, belle, responsive
```

### Phase 5: MCP Integrations (Jour 11-12)

```bash
✓ Tâches
──────────
□ Firecrawl integration (crawl websites)
□ Brave Search integration (recherche web)
□ Tool calling avec Claude (dynamic MCP use)
□ Test intégrations end-to-end

Résultat: Agent peut crawler web et chercher info
```

### Phase 6: Polish & Deploy (Jour 13-14)

```bash
✓ Tâches
──────────
□ Error handling & validation
□ Loading states & feedback
□ Deploy backend (Railway/Render)
□ Deploy frontend (Vercel)
□ Documentation README

Résultat: App déployée, utilisable en production
```

---

## 5. Exemples de Code (Aperçu)

### 5.1 RAG Engine (Core Logic)

```python
# backend/app/services/rag_engine.py

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
import pinecone

class RAGEngine:
    def __init__(self):
        self.claude = AsyncAnthropic()
        self.openai = AsyncOpenAI()
        self.pinecone = pinecone.Index("intelligence")

    async def embed(self, text: str) -> list[float]:
        """Create embedding"""
        response = await self.openai.embeddings.create(
            model="text-embedding-3-large",
            input=text
        )
        return response.data[0].embedding

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filter: dict = None
    ) -> list[dict]:
        """Retrieve relevant documents from Pinecone"""

        # Embed query
        query_embedding = await self.embed(query)

        # Vector search
        results = self.pinecone.query(
            vector=query_embedding,
            top_k=top_k,
            filter=filter,
            include_metadata=True
        )

        return [
            {
                "text": match.metadata["text"],
                "source": match.metadata["source"],
                "page": match.metadata.get("page"),
                "score": match.score
            }
            for match in results.matches
        ]

    async def synthesize(
        self,
        query: str,
        context_docs: list[dict],
        conversation_history: list[dict] = None
    ) -> str:
        """Generate answer using Claude with RAG context"""

        # Build context
        context_text = "\n\n".join([
            f"[Source: {doc['source']}, Page: {doc.get('page', 'N/A')}]\n{doc['text']}"
            for doc in context_docs
        ])

        # Build messages
        messages = conversation_history or []
        messages.append({
            "role": "user",
            "content": f"""
Answer the following question using ONLY the provided context.
Always cite your sources with [Source: filename, Page: X].

<context>
{context_text}
</context>

<question>
{query}
</question>

Instructions:
- Answer in the same language as the question
- Be concise but complete
- Always cite sources for claims
- If context doesn't contain the answer, say so clearly
"""
        })

        # Call Claude
        response = await self.claude.messages.create(
            model="claude-sonnet-4.5-20250514",
            max_tokens=4000,
            messages=messages
        )

        return response.content[0].text

    async def query(
        self,
        user_query: str,
        conversation_history: list[dict] = None,
        filter: dict = None
    ) -> dict:
        """
        Full RAG pipeline: retrieve → synthesize → return with sources
        """

        # 1. Retrieve relevant documents
        retrieved_docs = await self.retrieve(
            query=user_query,
            top_k=5,
            filter=filter
        )

        # 2. Synthesize answer
        answer = await self.synthesize(
            query=user_query,
            context_docs=retrieved_docs,
            conversation_history=conversation_history
        )

        # 3. Return answer with sources
        return {
            "answer": answer,
            "sources": [
                {
                    "source": doc["source"],
                    "page": doc.get("page"),
                    "relevance_score": doc["score"]
                }
                for doc in retrieved_docs
            ]
        }
```

### 5.2 Chat API Endpoint

```python
# backend/app/api/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.rag_engine import RAGEngine

router = APIRouter(prefix="/api/chat", tags=["chat"])
rag = RAGEngine()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    filters: dict | None = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    conversation_id: str

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with RAG
    """
    try:
        # Get conversation history if exists
        history = []
        if request.conversation_id:
            history = await get_conversation_history(request.conversation_id)

        # RAG query
        result = await rag.query(
            user_query=request.message,
            conversation_history=history,
            filter=request.filters
        )

        # Save to database
        conversation_id = request.conversation_id or create_new_conversation()
        await save_message(
            conversation_id=conversation_id,
            user_message=request.message,
            assistant_message=result["answer"],
            sources=result["sources"]
        )

        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            conversation_id=conversation_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 5.3 Frontend Chat Component

```typescript
// frontend/components/chat/ChatInterface.tsx

'use client';

import { useChat } from 'ai/react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">Competitive Intelligence Assistant</h1>
        <p className="text-sm text-gray-600">Ask me anything about your competitors</p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Ask about a competitor..."
        />
      </div>
    </div>
  );
}
```

---

## 6. Démarrage Immédiat

### Option A: Je crée tout le code maintenant

Je peux créer TOUT le code de base (backend + frontend) dans ce repo, et vous pourrez:
1. Clone le repo
2. `docker-compose up` (démarre PostgreSQL)
3. `poetry install && poetry run uvicorn app.main:app` (backend)
4. `pnpm install && pnpm dev` (frontend)
5. Ouvrir http://localhost:3000
6. **Commencer à utiliser l'app RAG** 🚀

### Option B: Approche Progressive

On construit ensemble, étape par étape:
1. Je crée la structure de base aujourd'hui
2. On teste ensemble demain
3. On itère selon vos besoins
4. On ajoute features progressivement

### Option C: Prototype Minimal d'Abord

Je crée un **script Python standalone** (1 fichier, 200 lignes) qui fait RAG avec Claude + Pinecone, juste pour tester le concept aujourd'hui même.

---

## 7. Quelle Option Préférez-Vous?

**A. "Crée tout maintenant, je veux tester rapidement"**
→ Je génère la structure complète + code de base + README

**B. "Commençons petit, script standalone d'abord"**
→ Je crée un prototype minimal fonctionnel en 1 fichier

**C. "Construisons ensemble, étape par étape"**
→ Je crée la structure, puis on implémente feature par feature

**D. "Explique-moi d'abord comment ça marche techniquement"**
→ Je détaille chaque composant avant de coder

Quelle approche vous convient le mieux? 🚀
