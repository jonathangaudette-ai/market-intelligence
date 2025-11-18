# API Reference - Plateforme Market Intelligence

**Version:** 1.0
**Base URL:** `https://app.market-intel.com`
**Public:** Intégrateurs, développeurs API
**Niveau:** Intermédiaire

---

## Table des matières

1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Endpoints RFP](#endpoints-rfp)
4. [Endpoints Chat](#endpoints-chat)
5. [Endpoints Documents](#endpoints-documents)
6. [Endpoints Competitors](#endpoints-competitors)
7. [Codes d'erreur](#codes-derreur)
8. [Rate limiting](#rate-limiting)
9. [Webhooks](#webhooks)
10. [SDKs et exemples](#sdks-et-exemples)

---

## Introduction

### Convention d'URL

Toutes les APIs sont scopées par **company slug** :

```
/api/companies/{slug}/...
```

**Exemple :**
```
GET /api/companies/acme-corp/rfps
POST /api/companies/acme-corp/chat
```

### Format des réponses

**Succès :**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erreur :**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Headers requis

```http
Content-Type: application/json
Cookie: authjs.session-token=...
```

---

## Authentification

### Login

Authentification via NextAuth credentials provider.

**Endpoint :**
```
POST /api/auth/callback/credentials
```

**Request Body :**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response :**
```http
HTTP/1.1 200 OK
Set-Cookie: authjs.session-token=...; HttpOnly; Secure; SameSite=Lax

{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Erreurs possibles :**

| Code | Message |
|------|---------|
| `401` | Invalid credentials |
| `400` | Email ou password manquant |

### Vérification de session

**Endpoint :**
```
GET /api/auth/session
```

**Response :**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "expires": "2025-12-31T23:59:59.000Z"
}
```

### Logout

**Endpoint :**
```
POST /api/auth/signout
```

**Response :**
```json
{
  "url": "/login"
}
```

---

## Endpoints RFP

### Liste des RFPs

Récupère tous les RFPs d'une company.

**Endpoint :**
```
GET /api/companies/{slug}/rfps
```

**Query Parameters :**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filtrer par status (optional) |
| `limit` | number | Nombre de résultats (default: 20) |
| `cursor` | string | Cursor pour pagination (optional) |

**Exemple :**
```http
GET /api/companies/acme-corp/rfps?status=completed&limit=10
```

**Response :**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "rfp-123",
        "title": "RFP - Ville de Montréal 2025",
        "description": "Infrastructure IT",
        "status": "completed",
        "deadline": "2025-12-31T23:59:59.000Z",
        "fileUrl": "https://blob.vercel-storage.com/...",
        "fileType": "pdf",
        "createdAt": "2025-11-01T10:00:00.000Z",
        "updatedAt": "2025-11-15T14:30:00.000Z",
        "stats": {
          "totalQuestions": 47,
          "answeredQuestions": 45,
          "completionRate": 95.7
        }
      }
    ],
    "nextCursor": "2025-11-01T10:00:00.000Z",
    "hasMore": true
  }
}
```

---

### Créer un RFP (Upload)

Upload un document RFP pour parsing.

**Endpoint :**
```
POST /api/companies/{slug}/rfps
```

**Content-Type :** `multipart/form-data`

**Form Fields :**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF, DOCX ou XLSX (max 10MB) |
| `title` | string | ✅ | Titre du RFP |
| `description` | string | ❌ | Description optionnelle |
| `deadline` | string | ❌ | Date limite (ISO 8601) |

**Exemple (curl) :**
```bash
curl -X POST https://app.market-intel.com/api/companies/acme-corp/rfps \
  -H "Cookie: authjs.session-token=..." \
  -F "file=@rfp-document.pdf" \
  -F "title=RFP Ville de Québec" \
  -F "description=Infrastructure réseau" \
  -F "deadline=2025-12-31T23:59:59.000Z"
```

**Response :**
```json
{
  "success": true,
  "data": {
    "id": "rfp-456",
    "title": "RFP Ville de Québec",
    "status": "parsing",
    "fileUrl": "https://blob.vercel-storage.com/rfp-456.pdf",
    "createdAt": "2025-11-18T10:00:00.000Z"
  }
}
```

**Erreurs possibles :**

| Code | Message |
|------|---------|
| `400` | File too large (max 10MB) |
| `400` | Invalid file type |
| `403` | Insufficient permissions |
| `500` | Upload failed |

---

### Détails d'un RFP

Récupère les détails complets d'un RFP incluant les questions.

**Endpoint :**
```
GET /api/companies/{slug}/rfps/{id}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "id": "rfp-123",
    "title": "RFP - Ville de Montréal 2025",
    "description": "Infrastructure IT",
    "status": "completed",
    "deadline": "2025-12-31T23:59:59.000Z",
    "fileUrl": "https://blob.vercel-storage.com/...",
    "fileType": "pdf",
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-15T14:30:00.000Z",
    "questions": [
      {
        "id": "q-1",
        "text": "Décrivez votre expérience en gestion de projets complexes",
        "category": "experience",
        "page": 5,
        "section": "Section 2.1",
        "order": 1,
        "response": {
          "id": "resp-1",
          "content": "Notre entreprise possède plus de 15 ans d'expérience...",
          "status": "approved",
          "confidence": 0.92,
          "sources": [
            {
              "documentId": "doc-789",
              "title": "Portfolio projets 2024",
              "text": "Projet Infrastructure Hôpital...",
              "page": 12
            }
          ],
          "generatedBy": "ai",
          "createdAt": "2025-11-10T10:00:00.000Z"
        }
      }
    ],
    "stats": {
      "totalQuestions": 47,
      "answeredQuestions": 45,
      "completionRate": 95.7,
      "averageConfidence": 0.87
    }
  }
}
```

---

### Enrichir les questions

Enrichit les questions d'un RFP avec contexte RAG.

**Endpoint :**
```
POST /api/companies/{slug}/rfps/{id}/enrich
```

**Request Body :**
```json
{
  "questionIds": ["q-1", "q-2", "q-3"]  // Optional, all if omitted
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "enrichedCount": 3,
    "questions": [
      {
        "id": "q-1",
        "enrichment": {
          "sources": [
            {
              "documentId": "doc-123",
              "relevance": 0.89,
              "snippet": "Experience with healthcare projects..."
            }
          ],
          "historicalResponses": [
            {
              "rfpId": "rfp-old-1",
              "response": "Similar response from 2024...",
              "similarity": 0.92
            }
          ],
          "suggestedCategory": "experience",
          "complexity": "medium"
        }
      }
    ]
  }
}
```

---

### Générer les réponses

Génère des réponses IA pour les questions d'un RFP.

**⚠️ Endpoint streaming (SSE)**

**Endpoint :**
```
POST /api/companies/{slug}/rfps/{id}/generate
```

**Request Body :**
```json
{
  "questionIds": ["q-1", "q-2"],
  "config": {
    "length": "medium",        // short | medium | long
    "tone": "professional",    // professional | technical | commercial
    "instructions": "Focus on healthcare experience"
  }
}
```

**Response (Server-Sent Events) :**

```
data: {"type":"progress","questionId":"q-1","status":"started"}

data: {"type":"token","questionId":"q-1","token":"Notre"}

data: {"type":"token","questionId":"q-1","token":" entreprise"}

data: {"type":"token","questionId":"q-1","token":" possède"}

...

data: {"type":"completed","questionId":"q-1","response":{"id":"resp-1","content":"...","sources":[...]}}

data: {"type":"progress","questionId":"q-2","status":"started"}

...
```

**Consommation côté client (JavaScript) :**

```javascript
const response = await fetch('/api/companies/acme-corp/rfps/123/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ questionIds: ['q-1', 'q-2'] })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));

      if (event.type === 'token') {
        // Append token to UI
        appendToken(event.questionId, event.token);
      } else if (event.type === 'completed') {
        // Finalize response
        finalizeResponse(event.questionId, event.response);
      }
    }
  }
}
```

---

### Exporter un RFP

Exporte un RFP complété vers Word ou Excel.

**Endpoint :**
```
POST /api/companies/{slug}/rfps/{id}/export
```

**Request Body :**
```json
{
  "format": "docx",           // docx | xlsx
  "layout": "qa",             // qa | table | sections
  "includeOnlyApproved": true // Optional, default false
}
```

**Response :**
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="RFP-Ville-Montreal-2025.docx"

[Binary DOCX file]
```

**Exemple (curl) :**
```bash
curl -X POST https://app.market-intel.com/api/companies/acme-corp/rfps/123/export \
  -H "Cookie: authjs.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"format":"docx","layout":"qa"}' \
  --output rfp-export.docx
```

---

### Supprimer un RFP

Supprime un RFP et toutes ses données associées.

**Endpoint :**
```
DELETE /api/companies/{slug}/rfps/{id}
```

**Response :**
```json
{
  "success": true,
  "message": "RFP deleted successfully"
}
```

**⚠️ Attention :** Opération irréversible. Supprime :
- Le RFP
- Toutes les questions
- Toutes les réponses
- Le fichier uploadé

---

## Endpoints Chat

### Envoyer un message (RAG)

Envoie une question au chat RAG.

**Endpoint :**
```
POST /api/companies/{slug}/chat
```

**Request Body :**
```json
{
  "message": "Quelles sont nos certifications ISO ?",
  "conversationId": "conv-123",  // Optional, creates new if omitted
  "filters": {
    "competitorId": "comp-456",  // Optional
    "documentIds": ["doc-1", "doc-2"]  // Optional
  }
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-123",
    "message": {
      "id": "msg-789",
      "role": "assistant",
      "content": "Nous détenons les certifications ISO 27001 et ISO 9001 [1][2].",
      "sources": [
        {
          "index": 1,
          "documentId": "doc-123",
          "title": "Certifications Acme Corp 2024",
          "text": "ISO 27001 certifié depuis 2020...",
          "page": 3,
          "score": 0.92
        },
        {
          "index": 2,
          "documentId": "doc-456",
          "title": "Documentation qualité",
          "text": "ISO 9001 renouvelé en 2024...",
          "page": 5,
          "score": 0.87
        }
      ],
      "createdAt": "2025-11-18T10:30:00.000Z"
    }
  }
}
```

---

### Récupérer l'historique

Liste toutes les conversations d'une company.

**Endpoint :**
```
GET /api/companies/{slug}/chat/conversations
```

**Response :**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-123",
        "title": "Certifications et conformité",
        "createdAt": "2025-11-15T09:00:00.000Z",
        "updatedAt": "2025-11-18T10:30:00.000Z",
        "messageCount": 12
      }
    ]
  }
}
```

---

### Récupérer une conversation

Récupère tous les messages d'une conversation.

**Endpoint :**
```
GET /api/companies/{slug}/chat/conversations/{id}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "id": "conv-123",
    "title": "Certifications et conformité",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Quelles sont nos certifications ISO ?",
        "createdAt": "2025-11-18T10:29:00.000Z"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "Nous détenons ISO 27001 et ISO 9001 [1][2].",
        "sources": [...],
        "createdAt": "2025-11-18T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Endpoints Documents

### Liste des documents

Récupère tous les documents de la knowledge base.

**Endpoint :**
```
GET /api/companies/{slug}/documents
```

**Query Parameters :**

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filtrer par type (optional) |
| `competitorId` | string | Filtrer par concurrent (optional) |
| `limit` | number | Nombre de résultats (default: 50) |

**Response :**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc-123",
        "title": "Portfolio Projets Healthcare 2024",
        "fileType": "pdf",
        "fileSize": 2456789,
        "fileUrl": "https://blob.vercel-storage.com/...",
        "status": "indexed",
        "competitorId": null,
        "uploadedBy": {
          "id": "user-123",
          "name": "John Doe"
        },
        "createdAt": "2025-11-01T10:00:00.000Z"
      }
    ],
    "total": 147
  }
}
```

---

### Upload un document

Upload un document vers la knowledge base.

**Endpoint :**
```
POST /api/companies/{slug}/documents/upload
```

**Content-Type :** `multipart/form-data`

**Form Fields :**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF, DOCX, TXT, MD (max 10MB) |
| `title` | string | ✅ | Titre du document |
| `competitorId` | string | ❌ | ID du concurrent |
| `tags` | string | ❌ | Tags séparés par virgules |

**Response :**
```json
{
  "success": true,
  "data": {
    "id": "doc-456",
    "title": "Analyse Concurrent X",
    "status": "processing",
    "fileUrl": "https://blob.vercel-storage.com/doc-456.pdf",
    "createdAt": "2025-11-18T10:00:00.000Z"
  }
}
```

**Processing flow :**
```
status: "processing"  → Parsing + chunking
       ↓
status: "embedding"   → Generating embeddings
       ↓
status: "indexing"    → Upserting to Pinecone
       ↓
status: "indexed"     → Ready for search
```

---

### Supprimer un document

Supprime un document de la knowledge base.

**Endpoint :**
```
DELETE /api/companies/{slug}/documents/{id}
```

**Response :**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**⚠️ Attention :** Supprime :
- Le fichier (Vercel Blob)
- Les métadonnées (DB)
- Les vecteurs (Pinecone)

---

## Endpoints Competitors

### Liste des concurrents

**Endpoint :**
```
GET /api/companies/{slug}/competitors
```

**Response :**
```json
{
  "success": true,
  "data": {
    "competitors": [
      {
        "id": "comp-123",
        "name": "Acme Corp",
        "url": "https://acmecorp.com",
        "description": "Leader en solutions IT",
        "documentCount": 23,
        "createdAt": "2025-10-01T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Créer un concurrent

**Endpoint :**
```
POST /api/companies/{slug}/competitors
```

**Request Body :**
```json
{
  "name": "Competitor XYZ",
  "url": "https://xyz.com",
  "description": "Concurrent principal en cybersécurité"
}
```

**Response :**
```json
{
  "success": true,
  "data": {
    "id": "comp-456",
    "name": "Competitor XYZ",
    "url": "https://xyz.com",
    "createdAt": "2025-11-18T10:00:00.000Z"
  }
}
```

---

### Supprimer un concurrent

**Endpoint :**
```
DELETE /api/companies/{slug}/competitors/{id}
```

**Response :**
```json
{
  "success": true,
  "message": "Competitor deleted successfully"
}
```

**Note :** Les documents associés ne sont PAS supprimés (juste dissociés).

---

## Codes d'erreur

### HTTP Status Codes

| Code | Signification |
|------|---------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (not authenticated) |
| `403` | Forbidden (not authorized for this company) |
| `404` | Not Found |
| `413` | Payload Too Large (file > 10MB) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `503` | Service Unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Not authorized for this company |
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `FILE_TOO_LARGE` | File exceeds 10MB limit |
| `INVALID_FILE_TYPE` | File type not supported |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

**Exemple de réponse d'erreur :**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "field": "title",
      "issue": "Title is required"
    }
  }
}
```

---

## Rate Limiting

### Limites par endpoint

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| `/chat` | 60 requêtes | 1 minute |
| `/rfps` (POST) | 10 uploads | 1 heure |
| `/documents/upload` | 20 uploads | 1 heure |
| `/generate` | 5 générations | 10 minutes |
| Autres endpoints | 100 requêtes | 1 minute |

### Headers de rate limiting

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1700000000
```

### Réponse 429 (Rate Limited)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Webhooks

**⚠️ Coming Soon**

Les webhooks permettront de recevoir des notifications pour :
- Fin de parsing d'un RFP
- Fin de génération de réponses
- Upload de document terminé
- Erreurs de traitement

---

## SDKs et exemples

### JavaScript/TypeScript

**Installation :**
```bash
npm install @market-intel/sdk
```

**Exemple :**
```typescript
import { MarketIntelClient } from '@market-intel/sdk';

const client = new MarketIntelClient({
  apiKey: 'your-api-key',
  company: 'acme-corp'
});

// Upload RFP
const rfp = await client.rfps.create({
  file: pdfFile,
  title: 'RFP Ville de Québec'
});

// Chat
const response = await client.chat.send({
  message: 'Quelles sont nos certifications ?'
});

console.log(response.message.content);
console.log(response.message.sources);
```

### Python

**Installation :**
```bash
pip install market-intel-sdk
```

**Exemple :**
```python
from market_intel import MarketIntelClient

client = MarketIntelClient(
    api_key="your-api-key",
    company="acme-corp"
)

# Upload RFP
rfp = client.rfps.create(
    file=open("rfp.pdf", "rb"),
    title="RFP Ville de Québec"
)

# Chat
response = client.chat.send(
    message="Quelles sont nos certifications ?"
)

print(response.message.content)
for source in response.message.sources:
    print(f"- {source.title} (page {source.page})")
```

### cURL Examples

**Upload RFP :**
```bash
curl -X POST https://app.market-intel.com/api/companies/acme-corp/rfps \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@rfp.pdf" \
  -F "title=RFP Ville de Québec"
```

**Chat :**
```bash
curl -X POST https://app.market-intel.com/api/companies/acme-corp/chat \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quelles sont nos certifications ?"
  }'
```

**Liste RFPs :**
```bash
curl https://app.market-intel.com/api/companies/acme-corp/rfps \
  -H "Cookie: authjs.session-token=YOUR_SESSION_TOKEN"
```

---

## Postman Collection

**Télécharger la collection Postman :**

```bash
curl -o market-intel-api.json \
  https://app.market-intel.com/api/postman-collection
```

**Importer dans Postman :**
1. Ouvrir Postman
2. File → Import
3. Sélectionner `market-intel-api.json`
4. Configurer les variables d'environnement :
   - `base_url`: `https://app.market-intel.com`
   - `company_slug`: `acme-corp`
   - `session_token`: votre token de session

---

## Changelog

### Version 1.0 (Novembre 2025)

**Initial release :**
- Authentication endpoints
- RFP management (CRUD)
- RAG chat
- Document upload
- Competitor management

---

## Support

**Documentation :**
- [Guide Utilisateur](./GUIDE_UTILISATEUR.md)
- [Guide Développeur](./GUIDE_DEVELOPPEUR.md)
- [Architecture](./ARCHITECTURE.md)

**Contact :**
- Email: api-support@market-intel.com
- GitHub Issues: https://github.com/market-intel/api/issues

---

**Dernière mise à jour :** Novembre 2025
**Version API :** 1.0
