# API Endpoints Documentation - Module RFP Response Assistant

**Version:** 1.0
**Date:** 2025-11-10
**Base URL:** `/api/v1/rfp`

---

## Table des Matières

1. [Technical Stack](#technical-stack)
2. [Authentification](#authentification)
3. [RFPs](#rfps)
4. [Questions](#questions)
5. [Responses](#responses)
6. [Library](#library)
7. [Analytics](#analytics)
8. [Export](#export)
9. [Comments](#comments)

---

## Technical Stack

### AI & Machine Learning

**LLM pour génération de réponses:**
- **Primary**: Claude Sonnet 4.5 (Anthropic) - `claude-sonnet-4-5-20250929`
- **Secondary**: GPT-4o (OpenAI) - pour extraction structurée JSON

**Embeddings:**
- **Model**: OpenAI `text-embedding-3-large` (1536 dimensions)
- **Vector Database**: Pinecone (semantic search pour bibliothèque de réponses)

**Background Jobs:**
- **Infrastructure**: Inngest (parsing de RFPs, génération de réponses)
- **Polling**: Utiliser les endpoints `/parse-status` pour vérifier le statut

**File Storage:**
- **Options**: Vercel Blob ou Cloudflare R2
- **Types supportés**: PDF, DOCX, XLSX (max 50MB)

**Database:**
- **Primary**: Neon PostgreSQL (données structurées)
- **Vector DB**: Pinecone (embeddings pour RAG)

### RAG Pipeline (Generate Response)

Quand vous appelez `/questions/:id/generate-response`, voici le processus :

1. **Vectorisation de la question** → OpenAI text-embedding-3-large
2. **Recherche sémantique** → Pinecone query (top-K documents pertinents)
3. **Construction du prompt** → Question + Context + Guidelines
4. **Génération** → Claude Sonnet 4.5 (avec RAG context)
5. **Post-processing** → Calcul de confidence_score, char_count, etc.

---

## Authentification

Tous les endpoints requièrent une authentification via JWT token.

```http
Authorization: Bearer <jwt_token>
```

**Obtenir un token :**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "contributor"
  }
}
```

---

## RFPs

### List RFPs

Récupère la liste des RFPs avec filtres et pagination.

```http
GET /api/v1/rfp/rfps
```

**Query Parameters :**
- `status` (optional): Filter by status (`draft`, `in_progress`, `submitted`, `won`, `lost`)
- `client_name` (optional): Filter by client name (partial match)
- `owner_id` (optional): Filter by owner
- `assigned_to_me` (optional): Boolean - show only RFPs assigned to current user
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sort` (optional): Sort field (`created_at`, `deadline`, `title`)
- `order` (optional): Sort order (`asc`, `desc`)

**Response :**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Enterprise SaaS Platform RFP",
      "client_name": "Acme Corporation",
      "client_industry": "fintech",
      "status": "in_progress",
      "completion_percentage": 67.42,
      "submission_deadline": "2025-11-30T23:59:59Z",
      "known_competitors": ["Competitor A", "Competitor B"],
      "owner": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@company.com"
      },
      "assigned_users": [
        { "id": "uuid", "name": "Jane Smith" }
      ],
      "stats": {
        "total_questions": 89,
        "completed_questions": 60,
        "pending_questions": 29
      },
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-10T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### Get RFP

Récupère les détails d'un RFP spécifique.

```http
GET /api/v1/rfp/rfps/:id
```

**Response :**
```json
{
  "id": "uuid",
  "title": "Enterprise SaaS Platform RFP",
  "client_name": "Acme Corporation",
  "client_industry": "fintech",
  "client_contact_name": "Sarah Johnson",
  "client_contact_email": "sarah@acme.com",
  "estimated_deal_value": 250000.00,
  "submission_deadline": "2025-11-30T23:59:59Z",
  "known_competitors": ["Competitor A", "Competitor B"],
  "status": "in_progress",
  "completion_percentage": 67.42,
  "original_filename": "acme_rfp_2025.pdf",
  "original_file_url": "https://storage.../acme_rfp.pdf",
  "parsing_status": "completed",
  "parsed_at": "2025-11-01T10:15:00Z",
  "owner": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@company.com"
  },
  "assigned_users": [...],
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-10T15:30:00Z",
  "submitted_at": null,
  "result": null,
  "metadata": {}
}
```

---

### Create RFP

Crée un nouveau RFP et upload le fichier.

> **Note:** Le fichier est uploadé vers Vercel Blob ou Cloudflare R2. Le parsing est effectué de manière asynchrone via Inngest. Utilisez l'endpoint `/rfps/:id/parse-status` pour suivre la progression.

```http
POST /api/v1/rfp/rfps
Content-Type: multipart/form-data
```

**Body (form-data) :**
- `title` (required): string
- `client_name` (required): string
- `client_industry` (optional): string
- `submission_deadline` (optional): ISO 8601 date
- `known_competitors` (optional): JSON array of strings
- `estimated_deal_value` (optional): number
- `file` (required): File (PDF, DOCX, XLSX - max 50MB)

**Response :**
```json
{
  "id": "uuid",
  "title": "Enterprise SaaS Platform RFP",
  "parsing_status": "processing",
  "message": "RFP created successfully. Parsing in progress..."
}
```

---

### Update RFP

Met à jour les métadonnées d'un RFP.

```http
PUT /api/v1/rfp/rfps/:id
Content-Type: application/json
```

**Body :**
```json
{
  "title": "Updated title",
  "client_name": "Acme Corp",
  "submission_deadline": "2025-12-15T23:59:59Z",
  "known_competitors": ["Competitor A", "Competitor C"],
  "assigned_users": ["user_id_1", "user_id_2"]
}
```

**Response :**
```json
{
  "id": "uuid",
  "message": "RFP updated successfully",
  "updated_at": "2025-11-10T16:00:00Z"
}
```

---

### Parse RFP

Déclenche le parsing d'un RFP (si parsing échoué ou re-parsing nécessaire).

```http
POST /api/v1/rfp/rfps/:id/parse
```

**Response :**
```json
{
  "message": "Parsing initiated",
  "job_id": "uuid",
  "status": "processing"
}
```

**Polling status :**
```http
GET /api/v1/rfp/rfps/:id/parse-status
```

---

### Submit RFP

Marque le RFP comme soumis au client.

```http
POST /api/v1/rfp/rfps/:id/submit
```

**Response :**
```json
{
  "message": "RFP submitted successfully",
  "submitted_at": "2025-11-15T14:30:00Z"
}
```

---

### Record Result

Enregistre le résultat du RFP (Won/Lost).

```http
PUT /api/v1/rfp/rfps/:id/result
Content-Type: application/json
```

**Body :**
```json
{
  "result": "won",  // "won", "lost", "no_decision"
  "result_competitor": "Competitor A",  // if lost
  "result_notes": "We won due to superior integration capabilities and pricing."
}
```

**Response :**
```json
{
  "message": "Result recorded successfully",
  "result": "won"
}
```

---

### Delete RFP

Supprime un RFP (soft delete).

```http
DELETE /api/v1/rfp/rfps/:id
```

**Response :**
```json
{
  "message": "RFP deleted successfully"
}
```

---

## Questions

### List Questions

Récupère toutes les questions d'un RFP.

```http
GET /api/v1/rfp/rfps/:rfp_id/questions
```

**Query Parameters :**
- `category` (optional): Filter by category
- `status` (optional): Filter by response status
- `assigned_to` (optional): Filter by assigned user
- `section_id` (optional): Filter by section

**Response :**
```json
{
  "data": [
    {
      "id": "uuid",
      "rfp_id": "uuid",
      "question_number": "1.1",
      "question_text": "Describe your company history and mission",
      "question_type": "text",
      "is_mandatory": true,
      "char_limit": 500,
      "category": "company",
      "response_status": "approved",
      "assigned_to": {
        "id": "uuid",
        "name": "John Doe"
      },
      "current_response": {
        "id": "uuid",
        "response_text": "Founded in 2020...",
        "confidence_score": 0.92,
        "status": "approved"
      },
      "created_at": "2025-11-01T10:15:00Z"
    }
  ],
  "stats": {
    "total": 89,
    "pending": 29,
    "draft": 15,
    "in_review": 5,
    "approved": 40
  }
}
```

---

### Get Question

Récupère les détails d'une question avec son historique de réponses.

```http
GET /api/v1/rfp/questions/:id
```

**Response :**
```json
{
  "id": "uuid",
  "rfp_id": "uuid",
  "question_number": "2.3",
  "question_text": "What security certifications do you hold?",
  "question_type": "text",
  "is_mandatory": true,
  "char_limit": 300,
  "category": "security",
  "subcategory": "compliance",
  "tags": ["security", "certifications"],
  "assigned_to": {...},
  "response_status": "in_review",
  "current_response": {...},
  "response_history": [
    {
      "id": "uuid",
      "version": 2,
      "response_text": "Updated response...",
      "status": "in_review",
      "created_by": {...},
      "created_at": "2025-11-10T14:00:00Z"
    },
    {
      "id": "uuid",
      "version": 1,
      "response_text": "Initial AI generated response...",
      "status": "draft",
      "created_at": "2025-11-05T10:00:00Z"
    }
  ],
  "similar_questions": [
    {
      "id": "uuid",
      "question_text": "List your security certifications",
      "source_rfp": "BigCo RFP",
      "similarity_score": 0.94
    }
  ]
}
```

---

### Update Question

Met à jour les métadonnées d'une question.

```http
PUT /api/v1/rfp/questions/:id
Content-Type: application/json
```

**Body :**
```json
{
  "category": "security",
  "tags": ["security", "compliance", "soc2"],
  "assigned_to": "user_id",
  "response_status": "in_review"
}
```

---

### Generate Response

Génère automatiquement une réponse via IA (RAG pipeline avec Claude Sonnet 4.5).

> **Note:** Ce endpoint utilise le RAG pipeline décrit dans la section [Technical Stack](#technical-stack). Le processus est asynchrone et peut prendre 5-15 secondes selon la complexité.

```http
POST /api/v1/rfp/questions/:id/generate-response
Content-Type: application/json
```

**Body (optional) :**
```json
{
  "additional_context": "Emphasize our recent SOC 2 Type II certification",
  "tone": "professional",  // "professional", "friendly", "technical"
  "length": "medium"  // "short", "medium", "long"
}
```

**Response :**
```json
{
  "response_id": "uuid",
  "response_text": "We hold the following security certifications:\n\n- SOC 2 Type II (2024)\n- ISO 27001...",
  "response_html": "<p>We hold the following...</p>",
  "confidence_score": 0.87,
  "sources_used": [
    {
      "doc_id": "uuid",
      "doc_name": "Security Compliance Page",
      "relevance_score": 0.95
    }
  ],
  "competitive_suggestions": "Emphasize that unlike Competitor A, we have SOC 2 Type II...",
  "char_count": 287,
  "word_count": 52,
  "alternative_responses": [
    {
      "response_text": "Alternative version 1...",
      "tone": "technical"
    }
  ]
}
```

---

## Responses

### Create/Update Response

Crée ou met à jour une réponse (manuelle ou édition d'une réponse AI).

```http
POST /api/v1/rfp/questions/:question_id/responses
Content-Type: application/json
```

**Body :**
```json
{
  "response_text": "Our company was founded in 2020...",
  "response_html": "<p>Our company was founded...</p>",
  "generation_method": "manual",  // "ai_generated", "library_reused", "manual", "hybrid"
  "library_response_id": "uuid",  // if reused from library
  "status": "draft"  // "draft", "in_review"
}
```

**Response :**
```json
{
  "id": "uuid",
  "version": 2,
  "message": "Response saved successfully",
  "char_count": 247,
  "word_count": 45
}
```

---

### Approve/Reject Response

Approuve ou rejette une réponse.

```http
POST /api/v1/rfp/responses/:id/review
Content-Type: application/json
```

**Body :**
```json
{
  "action": "approve",  // "approve" or "reject"
  "comments": "Looks good, minor typo fixed."
}
```

**Response :**
```json
{
  "message": "Response approved successfully",
  "status": "approved"
}
```

---

## Library

### Search Library

Recherche sémantique dans la bibliothèque de réponses (Pinecone vector search).

> **Note:** Utilise OpenAI text-embedding-3-large pour vectoriser votre query, puis recherche dans Pinecone pour trouver les réponses les plus similaires. Le `similarity_score` est le cosine similarity entre les vecteurs.

```http
GET /api/v1/rfp/library/search
```

**Query Parameters :**
- `q` (required): Search query
- `category` (optional): Filter by category
- `industry` (optional): Filter by industry
- `min_quality_score` (optional): Minimum quality score (0-1)
- `only_golden` (optional): Boolean - show only golden responses
- `limit` (optional): Results limit (default: 10, max: 50)

**Response :**
```json
{
  "data": [
    {
      "id": "uuid",
      "question_pattern": "Describe your pricing model",
      "response_text": "We offer transparent per-user pricing...",
      "category": "pricing",
      "quality_score": 0.92,
      "times_reused": 15,
      "win_rate": 78.5,
      "is_golden": true,
      "similarity_score": 0.94,
      "applicable_industries": ["fintech", "saas"],
      "created_at": "2025-09-15T10:00:00Z",
      "last_used_at": "2025-11-08T14:30:00Z"
    }
  ],
  "total": 23
}
```

---

### Get Library Response

Récupère une réponse spécifique de la bibliothèque.

```http
GET /api/v1/rfp/library/responses/:id
```

**Response :**
```json
{
  "id": "uuid",
  "question_pattern": "What security certifications do you hold?",
  "question_keywords": ["security", "certifications", "compliance"],
  "response_text": "We hold the following certifications...",
  "response_html": "<p>We hold...</p>",
  "category": "security",
  "tags": ["security", "soc2", "iso27001"],
  "applicable_industries": ["all"],
  "competitive_context": "Strong vs competitors without SOC 2",
  "quality_score": 0.89,
  "times_reused": 12,
  "win_rate": 83.3,
  "is_approved": true,
  "is_golden": true,
  "source_rfp": {
    "id": "uuid",
    "title": "BigCo RFP",
    "result": "won"
  },
  "usage_history": [
    {
      "rfp_title": "Acme Corp RFP",
      "used_at": "2025-11-05T10:00:00Z",
      "was_modified": false,
      "result": "won"
    }
  ],
  "created_by": {...},
  "created_at": "2025-09-15T10:00:00Z",
  "updated_at": "2025-11-01T12:00:00Z"
}
```

---

### Add to Library

Ajoute une réponse à la bibliothèque.

```http
POST /api/v1/rfp/library/responses
Content-Type: application/json
```

**Body :**
```json
{
  "question_pattern": "What is your uptime SLA?",
  "question_keywords": ["uptime", "sla", "availability"],
  "response_text": "We guarantee 99.9% uptime...",
  "category": "technical",
  "tags": ["sla", "uptime"],
  "applicable_industries": ["all"],
  "source_rfp_id": "uuid"
}
```

**Response :**
```json
{
  "id": "uuid",
  "message": "Response added to library successfully"
}
```

---

### Mark as Golden

Marque une réponse comme "golden" (recommandée).

```http
POST /api/v1/rfp/library/responses/:id/mark-golden
```

**Response :**
```json
{
  "message": "Response marked as golden",
  "is_golden": true
}
```

---

## Analytics

### RFP Performance

Analytics de performance des RFPs.

```http
GET /api/v1/rfp/analytics/rfps/performance
```

**Query Parameters :**
- `start_date` (optional): ISO 8601 date
- `end_date` (optional): ISO 8601 date
- `client_industry` (optional): Filter by industry

**Response :**
```json
{
  "summary": {
    "total_rfps": 45,
    "won": 28,
    "lost": 12,
    "pending": 5,
    "win_rate": 70.0,
    "avg_response_time_hours": 32.5,
    "total_revenue_influenced": 4250000.00
  },
  "by_competitor": [
    {
      "competitor": "Competitor A",
      "competed_against": 15,
      "won": 11,
      "lost": 4,
      "win_rate": 73.3
    }
  ],
  "by_category": [
    {
      "category": "security",
      "total_questions": 234,
      "avg_confidence_score": 0.87,
      "avg_time_spent_minutes": 8.5
    }
  ],
  "time_savings": {
    "total_questions_answered": 3567,
    "ai_generated_percentage": 65.4,
    "estimated_hours_saved": 850
  }
}
```

---

### Library Performance

Analytics de la bibliothèque de réponses.

```http
GET /api/v1/rfp/analytics/library/performance
```

**Response :**
```json
{
  "summary": {
    "total_responses": 342,
    "golden_responses": 45,
    "avg_quality_score": 0.78,
    "total_reuses": 1245
  },
  "top_responses": [
    {
      "id": "uuid",
      "question_pattern": "Describe your security measures",
      "times_reused": 45,
      "win_rate": 82.5,
      "quality_score": 0.94
    }
  ],
  "underperforming_responses": [
    {
      "id": "uuid",
      "question_pattern": "What is your roadmap?",
      "times_reused": 3,
      "win_rate": 33.3,
      "quality_score": 0.52,
      "suggested_action": "Review and update"
    }
  ]
}
```

---

### User Workload

Visualise la charge de travail des utilisateurs.

```http
GET /api/v1/rfp/analytics/user/workload
```

**Query Parameters :**
- `user_id` (optional): Specific user (defaults to current user)

**Response :**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe"
  },
  "workload": {
    "assigned_rfps": 3,
    "assigned_questions": 45,
    "pending_questions": 12,
    "in_progress_questions": 8,
    "completed_this_week": 25
  },
  "upcoming_deadlines": [
    {
      "rfp_id": "uuid",
      "rfp_title": "Acme Corp RFP",
      "deadline": "2025-11-15T23:59:59Z",
      "days_remaining": 5,
      "your_pending_questions": 3
    }
  ]
}
```

---

## Export

### Export RFP

Exporte un RFP vers Word ou PDF.

```http
POST /api/v1/rfp/rfps/:id/export
Content-Type: application/json
```

**Body :**
```json
{
  "format": "docx",  // "docx" or "pdf"
  "template": "default",  // template name
  "include_sources": false,  // include source citations
  "branding": {
    "logo_url": "https://...",
    "company_name": "Our Company",
    "colors": {
      "primary": "#0066CC"
    }
  }
}
```

**Response :**
```json
{
  "export_id": "uuid",
  "file_url": "https://storage.../exports/rfp_export.docx",
  "file_size_bytes": 1245000,
  "format": "docx",
  "exported_at": "2025-11-10T16:00:00Z",
  "expires_at": "2025-11-17T16:00:00Z"
}
```

---

### List Exports

Liste l'historique des exports d'un RFP.

```http
GET /api/v1/rfp/rfps/:id/exports
```

**Response :**
```json
{
  "data": [
    {
      "id": "uuid",
      "format": "pdf",
      "file_url": "https://...",
      "file_size_bytes": 2450000,
      "exported_by": {
        "id": "uuid",
        "name": "John Doe"
      },
      "exported_at": "2025-11-08T14:30:00Z"
    }
  ]
}
```

---

## Comments

### Add Comment

Ajoute un commentaire sur une question ou réponse.

```http
POST /api/v1/rfp/comments
Content-Type: application/json
```

**Body :**
```json
{
  "target_type": "response",  // "question", "response", "rfp"
  "target_id": "uuid",
  "comment_text": "Great response, but let's emphasize our 24/7 support more.",
  "comment_type": "feedback"  // "feedback", "suggestion", "question"
}
```

**Response :**
```json
{
  "id": "uuid",
  "message": "Comment added successfully",
  "created_at": "2025-11-10T16:30:00Z"
}
```

---

### List Comments

Liste les commentaires d'une question/réponse/RFP.

```http
GET /api/v1/rfp/comments
```

**Query Parameters :**
- `target_type` (required): "question", "response", or "rfp"
- `target_id` (required): UUID
- `include_resolved` (optional): Boolean (default: false)

**Response :**
```json
{
  "data": [
    {
      "id": "uuid",
      "comment_text": "Let's add more details about our integration capabilities",
      "comment_type": "suggestion",
      "is_resolved": false,
      "created_by": {
        "id": "uuid",
        "name": "Jane Smith"
      },
      "created_at": "2025-11-10T14:00:00Z",
      "replies": [
        {
          "id": "uuid",
          "comment_text": "Good idea, I'll update it.",
          "created_by": {...},
          "created_at": "2025-11-10T14:15:00Z"
        }
      ]
    }
  ]
}
```

---

## Error Responses

Tous les endpoints peuvent retourner les erreurs suivantes :

### 400 Bad Request
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": [
    {
      "field": "title",
      "message": "Title must be at least 3 characters"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "RFP not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again in 60 seconds.",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "request_id": "uuid"
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| List/Read operations | 100 requests / 15 min |
| Create/Update operations | 30 requests / 15 min |
| AI Generation | 10 requests / 15 min |
| Export | 5 requests / hour |

**Rate limit headers :**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1699556400
```

---

## Webhooks (Future)

Webhooks pour événements asynchrones (Phase 2).

**Événements disponibles :**
- `rfp.parsed` - RFP parsing complété
- `response.generated` - Réponse AI générée
- `rfp.submitted` - RFP soumis
- `rfp.result_recorded` - Résultat enregistré

---

**Version History:**
- v1.0 (2025-11-10) : API documentation initiale
