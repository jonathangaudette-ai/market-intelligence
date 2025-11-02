# Architecture Multi-Tenant pour RAG
## Comment Gérer Plusieurs Clients avec Isolation des Données

**Date:** 1er novembre 2025
**Question Centrale:** "Si j'ai multi-clients, j'aurais multi-RAG?"
**Réponse Courte:** NON, 1 seul RAG mais avec **isolation par metadata filtering**

---

## Table des Matières

1. [Le Problème du Multi-Tenant](#1-le-problème-du-multi-tenant)
2. [4 Approches Possibles](#2-quatre-approches-possibles)
3. [Architecture Recommandée (Metadata Filtering)](#3-architecture-recommandée)
4. [Implémentation Concrète](#4-implémentation-concrète)
5. [Sécurité & Isolation](#5-sécurité--isolation)
6. [Performance & Coûts](#6-performance--coûts)
7. [Scalabilité](#7-scalabilité)

---

## 1. Le Problème du Multi-Tenant

### 1.1 Scénario

```
Vous avez 3 clients:
─────────────────────
Client A (Acme Inc)
  • Veut tracker: Competitor X, Competitor Y
  • A uploadé: 50 PDFs, 20 sites crawlés
  • 500 documents total dans sa knowledge base

Client B (BigCo)
  • Veut tracker: Competitor Z, Competitor W
  • A uploadé: 100 PDFs, 50 sites
  • 1,200 documents total

Client C (StartupXYZ)
  • Veut tracker: Competitor A (qui est Client A!)
  • A uploadé: 10 PDFs
  • 80 documents total
```

### 1.2 Requirements Critiques

```
✓ ISOLATION ABSOLUE
  → Client A ne doit JAMAIS voir les données de Client B
  → Même si Client C track Client A comme concurrent,
     Client A ne voit pas les docs de Client C sur eux

✓ PERFORMANCE
  → Query de Client A ne doit pas ralentir si Client B a 1M docs
  → Search doit être aussi rapide avec 1 client que 100

✓ COÛTS RAISONNABLES
  → Pas de duplication d'infrastructure par client
  → Scalable sans explosion des coûts

✓ SIMPLE À GÉRER
  → Pas de complexité opérationnelle folle
  → Pas besoin de DevOps army pour gérer
```

---

## 2. Quatre Approches Possibles

### Approche 1: Index Pinecone par Client ❌

```python
# Chaque client = 1 index Pinecone séparé

Client A → pinecone.Index("client-a-acme-inc")
Client B → pinecone.Index("client-b-bigco")
Client C → pinecone.Index("client-c-startupxyz")
```

**Avantages:**
- ✅ Isolation parfaite (physiquement séparés)
- ✅ Simple conceptuellement

**Inconvénients:**
- ❌ **COÛT EXPLOSIF**: $70/mois par index (serverless)
  → 100 clients = $7,000/mois juste pour Pinecone!
- ❌ **Complexité opérationnelle**: Gérer 100+ indexes
- ❌ **Pas scalable**: Limite de indexes par account
- ❌ **Migration complexe**: Bouger un client = créer nouvel index

**Verdict:** ❌ **NE PAS UTILISER** (sauf si très gros clients payant $10K+/mois)

---

### Approche 2: Namespace Pinecone par Client ⚠️

```python
# 1 seul index, mais namespaces séparés

index = pinecone.Index("production")

# Client A
index.upsert(
    vectors=[...],
    namespace="client-a"
)

# Client B
index.upsert(
    vectors=[...],
    namespace="client-b"
)

# Query isolé par namespace
results = index.query(
    vector=[...],
    namespace="client-a",  # Voit seulement ses données
    top_k=10
)
```

**Avantages:**
- ✅ 1 seul index = 1 coût fixe ($70/mois total)
- ✅ Isolation physique (namespaces séparés)
- ✅ Performance prévisible

**Inconvénients:**
- ⚠️ **Limite de namespaces**: ~10,000 par index
  → OK pour 10K clients, mais après?
- ⚠️ **Pas de cross-namespace search** (si besoin futur)
- ⚠️ **Metadata filtering limité** à l'intérieur du namespace

**Verdict:** ⚠️ **MOYEN** (acceptable, mais pas optimal)

---

### Approche 3: Metadata Filtering (Recommandée) ✅

```python
# 1 seul index, isolation par metadata

index = pinecone.Index("production")

# Client A upload
index.upsert(
    vectors=[{
        "id": "doc-123",
        "values": embedding,
        "metadata": {
            "tenant_id": "client-a",      # ← ISOLATION KEY
            "document_name": "rapport.pdf",
            "competitor": "Competitor X",
            "uploaded_at": "2025-11-01"
        }
    }]
)

# Client B upload (même index!)
index.upsert(
    vectors=[{
        "id": "doc-456",
        "values": embedding,
        "metadata": {
            "tenant_id": "client-b",      # ← Different tenant
            "document_name": "analysis.pdf",
            "competitor": "Competitor Z"
        }
    }]
)

# Query Client A - voit SEULEMENT ses données
results = index.query(
    vector=query_embedding,
    filter={
        "tenant_id": {"$eq": "client-a"}  # ← Automatic isolation
    },
    top_k=10
)
# → Retourne SEULEMENT les docs de Client A
```

**Avantages:**
- ✅ **1 seul index** = coût fixe minimal
- ✅ **Scalabilité infinie** (millions de clients OK)
- ✅ **Flexible**: Metadata additionnel facile (competitors, dates, types)
- ✅ **Cross-tenant analytics possibles** (si admin/analytics)
- ✅ **Simple à gérer**: 1 seule infrastructure

**Inconvénients:**
- ⚠️ **Dépend de l'application** pour enforce isolation
  → BUG = possible data leak (mais facile à prévenir)
- ⚠️ **Performance légèrement impactée** si index ÉNORME (>10M vectors)
  → Mais OK jusqu'à plusieurs millions

**Verdict:** ✅ **RECOMMANDÉ** pour 95% des cas

---

### Approche 4: Hybrid (Metadata + Namespaces) 🎯

```python
# Pour la plupart des clients: metadata filtering
# Pour GROS clients (Enterprise): namespace dédié

# Client SMB (metadata)
index.query(
    namespace="shared",  # Namespace partagé
    filter={"tenant_id": "client-small"},
    ...
)

# Client Enterprise (namespace dédié)
index.query(
    namespace="client-enterprise-bigcorp",  # Leur propre namespace
    filter={"tenant_id": "client-enterprise-bigcorp"},
    ...
)
```

**Avantages:**
- ✅ Meilleur des deux mondes
- ✅ Performance garantie pour gros clients
- ✅ Coût optimisé pour petits clients

**Inconvénients:**
- ⚠️ Complexité accrue (2 patterns à gérer)

**Verdict:** 🎯 **OPTIMAL** si vous avez mix SMB + Enterprise

---

## 3. Architecture Recommandée (Metadata Filtering)

### 3.1 Schema Pinecone

```python
# Structure d'un vector dans Pinecone

{
    "id": "doc_uuid",              # Unique ID (UUID)
    "values": [0.123, 0.456, ...], # Embedding (1536 dimensions)
    "metadata": {
        # ═══════════════════════════════════════
        # ISOLATION (Critical!)
        # ═══════════════════════════════════════
        "tenant_id": "acme-inc-uuid",   # ← Client unique ID

        # ═══════════════════════════════════════
        # DOCUMENT INFO
        # ═══════════════════════════════════════
        "document_id": "doc-uuid",
        "document_name": "competitor-analysis.pdf",
        "document_type": "pdf",         # pdf, website, news_article
        "chunk_index": 5,               # Chunk number dans le doc
        "total_chunks": 58,

        # ═══════════════════════════════════════
        # COMPETITIVE INTELLIGENCE
        # ═══════════════════════════════════════
        "competitor_id": "competitor-x-uuid",
        "competitor_name": "Competitor X Inc",

        # ═══════════════════════════════════════
        # CATEGORIZATION
        # ═══════════════════════════════════════
        "category": "pricing",          # pricing, product, hiring, news
        "subcategory": "enterprise_tier",

        # ═══════════════════════════════════════
        # TIME-BASED
        # ═══════════════════════════════════════
        "uploaded_at": 1698825600,      # Unix timestamp
        "source_date": 1698739200,      # Date du document original

        # ═══════════════════════════════════════
        # SOURCE TRACKING
        # ═══════════════════════════════════════
        "source_type": "manual_upload", # manual_upload, web_crawl, api
        "source_url": "https://...",    # Si crawled
        "uploaded_by_user": "user-uuid",

        # ═══════════════════════════════════════
        # CONTENT (pour citations)
        # ═══════════════════════════════════════
        "text": "Full chunk text here...",  # Le texte réel (pour citations)
        "page_number": 12,               # Si PDF
    }
}
```

### 3.2 PostgreSQL Schema (Complementary)

```sql
-- ═══════════════════════════════════════
-- TENANTS (Clients)
-- ═══════════════════════════════════════
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- acme-inc, bigco, etc.

    -- Subscription
    plan VARCHAR(50) NOT NULL,          -- free, pro, enterprise
    max_documents INT DEFAULT 100,
    max_competitors INT DEFAULT 5,

    -- Billing
    stripe_customer_id VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- USERS (belong to tenants)
-- ═══════════════════════════════════════
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',  -- admin, member, viewer

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- ═══════════════════════════════════════
-- COMPETITORS (tracked by each tenant)
-- ═══════════════════════════════════════
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    linkedin_id VARCHAR(255),
    website VARCHAR(500),

    -- Tracking status
    is_active BOOLEAN DEFAULT true,
    priority VARCHAR(50) DEFAULT 'medium',  -- high, medium, low

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, name)  -- Un tenant ne peut pas avoir 2x même concurrent
);

CREATE INDEX idx_competitors_tenant_id ON competitors(tenant_id);

-- ═══════════════════════════════════════
-- DOCUMENTS (metadata registry)
-- ═══════════════════════════════════════
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,

    name VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,          -- pdf, website, news_article
    source_type VARCHAR(50) NOT NULL,   -- manual_upload, web_crawl, api
    source_url TEXT,

    -- File info (if uploaded)
    file_size_bytes BIGINT,
    storage_path TEXT,                  -- S3 path or similar

    -- Processing status
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    total_chunks INT,
    vectors_created BOOLEAN DEFAULT false,

    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_competitor_id ON documents(competitor_id);
CREATE INDEX idx_documents_status ON documents(status);

-- ═══════════════════════════════════════
-- CONVERSATIONS (chat history)
-- ═══════════════════════════════════════
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(500),  -- Auto-generated or user-defined

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- ═══════════════════════════════════════
-- MESSAGES (individual chat messages)
-- ═══════════════════════════════════════
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL,        -- user, assistant
    content TEXT NOT NULL,

    -- RAG metadata (if assistant message)
    sources JSONB,                    -- Array of sources used
    model VARCHAR(100),               -- claude-sonnet-4.5-20250514
    tokens_used INT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

---

## 4. Implémentation Concrète

### 4.1 RAG Engine avec Tenant Isolation

```python
# backend/app/services/rag_engine.py

from typing import Optional
import uuid
from datetime import datetime

class MultiTenantRAGEngine:
    def __init__(self, pinecone_index):
        self.index = pinecone_index

    async def upsert_document(
        self,
        tenant_id: str,
        document_id: str,
        text_chunks: list[str],
        metadata: dict
    ):
        """
        Upload document chunks pour un tenant spécifique

        CRITICAL: tenant_id MUST be included in metadata
        """

        vectors = []

        for idx, chunk in enumerate(text_chunks):
            # Create embedding
            embedding = await self.embed(chunk)

            # Build vector with tenant isolation
            vector = {
                "id": f"{document_id}_chunk_{idx}",
                "values": embedding,
                "metadata": {
                    # ═══ ISOLATION ═══
                    "tenant_id": tenant_id,  # ← CRITICAL!

                    # ═══ DOCUMENT INFO ═══
                    "document_id": document_id,
                    "document_name": metadata.get("document_name"),
                    "document_type": metadata.get("document_type"),
                    "chunk_index": idx,
                    "total_chunks": len(text_chunks),

                    # ═══ COMPETITIVE INTEL ═══
                    "competitor_id": metadata.get("competitor_id"),
                    "competitor_name": metadata.get("competitor_name"),
                    "category": metadata.get("category"),

                    # ═══ TIMESTAMPS ═══
                    "uploaded_at": int(datetime.now().timestamp()),

                    # ═══ CONTENT (pour citations) ═══
                    "text": chunk,  # Store text for retrieval
                    "page_number": metadata.get("page_number"),
                    "source_url": metadata.get("source_url"),
                }
            }

            vectors.append(vector)

        # Upsert to Pinecone (batch)
        self.index.upsert(vectors=vectors)

        return len(vectors)

    async def query(
        self,
        tenant_id: str,           # ← REQUIRED for isolation
        query_text: str,
        filters: dict = None,
        top_k: int = 5
    ) -> list[dict]:
        """
        Query avec isolation automatique par tenant
        """

        # Create query embedding
        query_embedding = await self.embed(query_text)

        # Build filter with MANDATORY tenant_id
        base_filter = {"tenant_id": {"$eq": tenant_id}}

        # Merge avec filters additionnels si fournis
        if filters:
            # User peut filtrer sur competitor, category, etc.
            # Mais tenant_id est TOUJOURS appliqué
            final_filter = {
                "$and": [
                    base_filter,
                    filters
                ]
            }
        else:
            final_filter = base_filter

        # Query Pinecone
        results = self.index.query(
            vector=query_embedding,
            filter=final_filter,
            top_k=top_k,
            include_metadata=True
        )

        # Extract results
        retrieved_docs = []
        for match in results.matches:
            retrieved_docs.append({
                "text": match.metadata["text"],
                "source": match.metadata["document_name"],
                "competitor": match.metadata.get("competitor_name"),
                "page": match.metadata.get("page_number"),
                "score": match.score,
                "document_id": match.metadata["document_id"]
            })

        return retrieved_docs

    async def delete_document(
        self,
        tenant_id: str,    # ← For safety
        document_id: str
    ):
        """
        Delete tous les vectors d'un document

        SAFETY: Vérifie que le document appartient au tenant
        """

        # Delete avec filter (safety check)
        self.index.delete(
            filter={
                "$and": [
                    {"tenant_id": {"$eq": tenant_id}},
                    {"document_id": {"$eq": document_id}}
                ]
            }
        )

    async def get_tenant_stats(self, tenant_id: str) -> dict:
        """
        Stats pour un tenant (combien de vectors, documents, etc.)
        """

        # Query pour count (Pinecone doesn't have direct count API)
        # Workaround: describe_index_stats avec filter
        stats = self.index.describe_index_stats(
            filter={"tenant_id": {"$eq": tenant_id}}
        )

        return {
            "total_vectors": stats.total_vector_count,
            # Note: Pinecone ne retourne pas filtered count directement
            # Il faut query et compter, ou tracker dans PostgreSQL
        }
```

### 4.2 API avec Tenant Context

```python
# backend/app/api/dependencies.py

from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

async def get_current_user(authorization: str = Header(...)):
    """
    Extract user from JWT token
    """
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")  # ← Tenant dans le JWT!

        if not user_id or not tenant_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ───────────────────────────────────────────────────

# backend/app/api/chat.py

from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.services.rag_engine import MultiTenantRAGEngine

router = APIRouter(prefix="/api/chat")
rag = MultiTenantRAGEngine(pinecone_index)

@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)  # ← Automatic tenant context
):
    """
    Chat endpoint - tenant isolation automatique
    """

    tenant_id = current_user["tenant_id"]  # ← From JWT

    # Query RAG avec tenant isolation
    retrieved_docs = await rag.query(
        tenant_id=tenant_id,        # ← TOUJOURS passé
        query_text=request.message,
        filters=request.filters,    # Optional user filters
        top_k=5
    )

    # Generate response avec Claude
    answer = await generate_answer(
        query=request.message,
        context=retrieved_docs,
        tenant_id=tenant_id  # Peut être utile pour custom prompts
    )

    return {
        "answer": answer,
        "sources": retrieved_docs
    }
```

### 4.3 Upload Document avec Tenant

```python
# backend/app/api/documents.py

@router.post("/upload")
async def upload_document(
    file: UploadFile,
    competitor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload PDF avec tenant isolation automatique
    """

    tenant_id = current_user["tenant_id"]

    # 1. Verify competitor belongs to tenant (SECURITY!)
    competitor = await db.fetch_one(
        "SELECT id FROM competitors WHERE id = $1 AND tenant_id = $2",
        competitor_id, tenant_id
    )

    if not competitor:
        raise HTTPException(
            status_code=403,
            detail="Competitor not found or access denied"
        )

    # 2. Save file to storage
    document_id = str(uuid.uuid4())
    storage_path = await save_file(file, tenant_id, document_id)

    # 3. Create document record
    await db.execute("""
        INSERT INTO documents (
            id, tenant_id, competitor_id, name, type,
            source_type, storage_path, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    """,
        document_id, tenant_id, competitor_id, file.filename,
        "pdf", "manual_upload", storage_path,
        current_user["user_id"], "processing"
    )

    # 4. Process PDF asynchronously
    await process_document_async(
        tenant_id=tenant_id,      # ← Pass tenant context
        document_id=document_id,
        storage_path=storage_path,
        competitor_id=competitor_id
    )

    return {
        "document_id": document_id,
        "status": "processing"
    }


async def process_document_async(
    tenant_id: str,
    document_id: str,
    storage_path: str,
    competitor_id: str
):
    """
    Background task: Extract text, chunk, embed, upsert to Pinecone
    """

    # 1. Extract text from PDF
    text = await extract_pdf_text(storage_path)

    # 2. Chunk text
    chunks = chunk_text(text, chunk_size=1000, overlap=200)

    # 3. Get competitor info
    competitor = await db.fetch_one(
        "SELECT name FROM competitors WHERE id = $1",
        competitor_id
    )

    # 4. Upsert to Pinecone with tenant_id
    num_vectors = await rag.upsert_document(
        tenant_id=tenant_id,      # ← CRITICAL: Tenant isolation
        document_id=document_id,
        text_chunks=chunks,
        metadata={
            "document_name": file.filename,
            "document_type": "pdf",
            "competitor_id": competitor_id,
            "competitor_name": competitor["name"],
            "category": "general",  # Could be auto-detected
        }
    )

    # 5. Update document status
    await db.execute("""
        UPDATE documents
        SET status = 'completed',
            total_chunks = $1,
            vectors_created = true,
            processed_at = NOW()
        WHERE id = $2
    """, num_vectors, document_id)
```

---

## 5. Sécurité & Isolation

### 5.1 Checklist de Sécurité

```python
# ═══════════════════════════════════════
# ✓ MUST-HAVE Security Measures
# ═══════════════════════════════════════

# 1. JWT avec tenant_id
JWT_PAYLOAD = {
    "user_id": "...",
    "tenant_id": "...",  # ← ALWAYS in JWT
    "role": "admin",
    "exp": ...
}

# 2. TOUJOURS vérifier tenant_id en DB queries
# ❌ BAD (SQL injection + no tenant check)
competitor = await db.fetch_one(
    f"SELECT * FROM competitors WHERE id = '{competitor_id}'"
)

# ✓ GOOD (parameterized + tenant check)
competitor = await db.fetch_one(
    "SELECT * FROM competitors WHERE id = $1 AND tenant_id = $2",
    competitor_id, current_user["tenant_id"]
)

# 3. Pinecone filters TOUJOURS include tenant_id
# ❌ BAD (no tenant isolation)
results = index.query(
    vector=embedding,
    filter={"category": "pricing"}
)

# ✓ GOOD (tenant isolated)
results = index.query(
    vector=embedding,
    filter={
        "$and": [
            {"tenant_id": {"$eq": tenant_id}},
            {"category": {"$eq": "pricing"}}
        ]
    }
)

# 4. Rate limiting par tenant (éviter abuse)
@router.post("/chat")
@rate_limit(max_requests=100, window=3600, key="tenant_id")
async def chat(...):
    ...

# 5. Audit logging (qui accède à quoi)
await audit_log.create(
    tenant_id=tenant_id,
    user_id=user_id,
    action="query_rag",
    resource_id=document_id,
    ip_address=request.client.host
)
```

### 5.2 Tests de Sécurité

```python
# tests/test_tenant_isolation.py

async def test_tenant_cannot_access_other_tenant_data():
    """
    CRITICAL: Verify tenant A cannot see tenant B's data
    """

    # Setup: Tenant A uploads document
    tenant_a_doc = await upload_document(
        tenant_id="tenant-a",
        content="Tenant A secret data"
    )

    # Attack: Tenant B tries to query
    results = await rag.query(
        tenant_id="tenant-b",  # Different tenant
        query_text="secret data"
    )

    # Assert: No results (isolation works)
    assert len(results) == 0, "SECURITY BREACH: Tenant B accessed Tenant A data!"


async def test_tenant_cannot_delete_other_tenant_document():
    """
    Verify deletion is also tenant-isolated
    """

    # Tenant A has document
    doc_id = "tenant-a-document"

    # Tenant B tries to delete
    await rag.delete_document(
        tenant_id="tenant-b",
        document_id=doc_id
    )

    # Verify document still exists for Tenant A
    results = await rag.query(
        tenant_id="tenant-a",
        query_text="test"
    )

    assert any(r["document_id"] == doc_id for r in results), \
        "Document was deleted by wrong tenant!"
```

---

## 6. Performance & Coûts

### 6.1 Scalabilité par Nombre de Clients

```
METADATA FILTERING APPROACH
────────────────────────────

Clients    Vectors      Pinecone Cost    Performance
──────────────────────────────────────────────────────
10         50K          $70/month        Excellent
100        500K         $70/month        Excellent
1,000      5M           $70/month        Good (slight slowdown)
10,000     50M          $70-140/month    OK (may need optimization)
100,000    500M         $140-350/month   Needs sharding/optimization

KEY INSIGHT: Coût scale avec DATA SIZE, pas nombre de clients!
→ 1,000 clients avec peu de data < 10 clients avec beaucoup de data
```

### 6.2 Optimizations pour Scale

```python
# ═══════════════════════════════════════
# Optimization 1: Caching per tenant
# ═══════════════════════════════════════

from cachetools import TTLCache

# Cache tenant-specific queries (1 hour TTL)
tenant_cache = TTLCache(maxsize=1000, ttl=3600)

async def query_with_cache(tenant_id: str, query_text: str):
    cache_key = f"{tenant_id}:{hash(query_text)}"

    if cache_key in tenant_cache:
        return tenant_cache[cache_key]

    results = await rag.query(tenant_id, query_text)
    tenant_cache[cache_key] = results

    return results


# ═══════════════════════════════════════
# Optimization 2: Batching embeddings
# ═══════════════════════════════════════

# ❌ BAD: 1 API call per chunk
for chunk in chunks:
    embedding = await embed(chunk)

# ✓ GOOD: Batch embeddings
embeddings = await embed_batch(chunks)  # 1 API call for all


# ═══════════════════════════════════════
# Optimization 3: Partial updates
# ═══════════════════════════════════════

# Don't re-embed entire document if small change
# Update only changed chunks
await rag.update_chunks(
    tenant_id=tenant_id,
    document_id=document_id,
    changed_chunks=[5, 6, 7]  # Only these chunks changed
)
```

### 6.3 Monitoring par Tenant

```python
# Track usage per tenant (pour billing, limits)

await metrics.track(
    tenant_id=tenant_id,
    metric="rag_queries",
    value=1,
    metadata={
        "model": "claude-sonnet-4.5",
        "tokens_used": 2500
    }
)

# Enforce limits
tenant_usage = await get_tenant_usage(tenant_id, period="month")

if tenant_usage.queries > tenant.plan.max_queries:
    raise HTTPException(
        status_code=429,
        detail="Monthly query limit exceeded. Please upgrade plan."
    )
```

---

## 7. Scalabilité (Quand Passer à Autre Chose?)

### 7.1 Quand Metadata Filtering Suffit

```
✓ Vous êtes OK si:
──────────────────
• < 10,000 clients
• < 10M vectors total
• Query latency < 500ms acceptable
• Coût Pinecone < $200/month OK

→ Metadata filtering est PARFAIT
```

### 7.2 Quand Migrer vers Hybrid (Metadata + Namespaces)

```
⚠️ Considérer si:
──────────────────
• Vous avez quelques GROS clients (Enterprise)
• Ces clients veulent guaranties performance
• Ils paient $10K+/mois
• Ils ont chacun 1M+ vectors

→ Donnez-leur un namespace dédié
→ Gardez metadata filtering pour les autres
```

### 7.3 Quand Considérer Index Séparés

```
🔴 Seulement si:
──────────────────
• Exigences réglementaires (data residency)
• Client paie $50K+/année
• Isolation physique absolue requise (banking, healthcare)

→ Très rare, coûteux, complexe
```

---

## Résumé: Réponse à Votre Question

### Question: "Si j'ai multi-clients, j'aurais multi-RAG?"

**Réponse:** NON, vous avez **1 seul RAG engine** mais avec **isolation par metadata**

```python
# Pseudocode simplifié:

# Setup (1 fois)
rag_engine = RAGEngine()      # 1 seul engine
pinecone_index = "production"  # 1 seul index

# Client A upload
rag_engine.upsert(
    tenant_id="client-a",  # ← Metadata isolation
    document="rapport-acme.pdf"
)

# Client B upload (même engine, même index!)
rag_engine.upsert(
    tenant_id="client-b",  # ← Different tenant
    document="analysis-bigco.pdf"
)

# Client A query
results_a = rag_engine.query(
    tenant_id="client-a",  # ← Voit seulement ses données
    query="pricing info"
)
# → Retourne SEULEMENT rapport-acme.pdf

# Client B query
results_b = rag_engine.query(
    tenant_id="client-b",  # ← Voit seulement ses données
    query="pricing info"
)
# → Retourne SEULEMENT analysis-bigco.pdf

# ISOLATION AUTOMATIQUE via metadata filtering!
```

**Avantages:**
- ✅ 1 seul code base
- ✅ 1 seul infrastructure (Pinecone, PostgreSQL)
- ✅ Coût fixe minimal ($70-200/mois)
- ✅ Scale à 1,000+ clients facilement
- ✅ Simple à gérer

**Vous êtes prêt à implémenter?** 🚀
