# Market Intelligence Platform

Plateforme d'intelligence concurrentielle alimentée par l'IA avec capacités RAG (Retrieval Augmented Generation) multi-tenant.

## Architecture

Cette application utilise:
- **Next.js 15** avec App Router
- **React 19** pour l'interface utilisateur
- **Drizzle ORM** avec PostgreSQL pour la base de données
- **NextAuth v5** pour l'authentification
- **Pinecone** pour la recherche vectorielle (RAG)
- **Claude Sonnet 4.5** pour la synthèse intelligente
- **OpenAI text-embedding-3-large** pour les embeddings
- **Tailwind CSS** avec design system Teal
- **shadcn/ui** pour les composants UI

### 🏗️ Architecture Multi-Tenant Slug-Based

L'application utilise une **architecture slug-based** pour l'isolation multi-tenant:

**Principe clé**: Le contexte de la compagnie est **extrait de l'URL** (`/companies/[slug]/*`), éliminant les race conditions et garantissant une isolation robuste.

**Avantages**:
- ✅ Pas de cookies requis - Le slug est dans l'URL
- ✅ Aucune race condition - Le contexte existe avant toute requête
- ✅ URLs partageables et explicites
- ✅ Sécurité renforcée - Vérification d'accès à chaque requête
- ✅ Cache-friendly - URLs statiques pour CDN

**Structure des routes**:
```
/companies/[slug]/dashboard          → Dashboard principal
/companies/[slug]/rfps               → Gestion des RFPs
/companies/[slug]/intelligence       → Chat RAG
/companies/[slug]/competitors        → Gestion concurrents
```

**API endpoints**:
```
/api/companies/[slug]/rfps           → Upload & List RFPs
/api/companies/[slug]/documents      → Documents
/api/companies/[slug]/chat           → RAG chat
```

Pour plus de détails, voir [`docs/REUSABLE_MULTI_TENANT_ARCHITECTURE.md`](docs/REUSABLE_MULTI_TENANT_ARCHITECTURE.md).

## 📚 Documentation

- **[Guide de Déploiement Production 2025](DEPLOYMENT_PRODUCTION_2025.md)** - Guide complet et à jour
- **[Architecture Multi-Tenant](docs/REUSABLE_MULTI_TENANT_ARCHITECTURE.md)** - Architecture slug-based
- **[Module Pricing](module-pricing/README.md)** - Intelligence de prix concurrentiels
- **[Worker Railway](worker/README.md)** - Worker de scraping Playwright

## Fonctionnalités

### 💰 Intelligence de Prix (Pricing Module)

**Surveillance automatisée des prix concurrentiels**:
- ✅ Gestion de catalogue produits (import CSV/XLSX)
- ✅ Surveillance de concurrents multiples
- ✅ Scraping automatisé via Railway worker + Playwright
- ✅ Comparaisons de prix en temps réel
- ✅ Alertes et insights IA (GPT-5)
- ✅ Historique et tendances de prix
- ✅ Dashboard avec KPIs cliquables

**Pages disponibles**:
```
/companies/[slug]/pricing                → Dashboard principal
/companies/[slug]/pricing/products       → Catalogue produits
/companies/[slug]/pricing/competitors    → Gestion concurrents
/companies/[slug]/pricing/matches        → Comparaisons détaillées
/companies/[slug]/pricing/catalog        → Import de catalogue
/companies/[slug]/pricing/settings       → Paramètres & actions
```

**Architecture**:
- **Next.js API Routes** → Orchestration et gestion de données
- **Railway Worker** → Scraping web avec Playwright (headless Chromium)
- **PostgreSQL** → Stockage produits, concurrents, matches
- **GPT-5** → Extraction et matching intelligent

### RAG Multi-Tenant
- ✅ Un seul index Pinecone pour tous les clients (isolation par metadata)
- ✅ Upload de documents PDF avec extraction automatique
- ✅ Chat conversationnel avec sources citées
- ✅ Filtrage automatique par tenant (companyId)

### Gestion des Concurrents
- ✅ Création et suivi des concurrents
- ✅ Association de documents à des concurrents spécifiques
- ✅ Requêtes filtrées par concurrent

### Authentification & Multi-Tenant
- ✅ NextAuth avec JWT sessions
- ✅ Architecture multi-compagnies
- ✅ Permissions par rôle (admin, editor, viewer)
- ✅ Super admin avec accès global

## Installation

### 1. Prérequis

- Node.js 18+ et npm
- Compte Supabase (PostgreSQL gratuit)
- Compte Pinecone (plan gratuit disponible)
- Clé API Anthropic (Claude)
- Clé API OpenAI

### 2. Cloner et installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

Copier `.env.example` vers `.env` et remplir les valeurs:

```bash
cp .env.example .env
```

**Variables requises:**

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_TRUST_HOST=true

# Pinecone
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="market-intelligence-prod"

# Anthropic (Claude)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# OpenAI (embeddings)
OPENAI_API_KEY="your-openai-api-key"
```

**Générer AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Configurer Pinecone

1. Créer un compte sur [pinecone.io](https://www.pinecone.io)
2. Créer un index avec ces paramètres:
   - **Name**: `market-intelligence-prod`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Cloud**: `AWS` ou `GCP`
   - **Region**: Choisir la plus proche

### 5. Configurer la base de données

```bash
# Générer les migrations Drizzle
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

### 6. Créer un utilisateur initial

Pour créer le premier utilisateur, vous devrez insérer directement dans la DB:

```sql
-- Créer un super admin (mot de passe: "password123")
INSERT INTO users (id, email, password_hash, name, is_super_admin)
VALUES (
  'user_initial',
  'admin@example.com',
  '$2a$10$YourBcryptHashHere', -- Hash de "password123"
  'Admin',
  true
);

-- Créer une première compagnie
INSERT INTO companies (id, name, slug)
VALUES ('company_initial', 'Ma Première Compagnie', 'ma-premiere-compagnie');

-- Associer l'utilisateur à la compagnie
INSERT INTO company_members (user_id, company_id, role)
VALUES ('user_initial', 'company_initial', 'admin');
```

**Note**: Pour hasher un mot de passe avec bcrypt:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('password123', 10);
console.log(hash);
```

### 7. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Structure du Projet

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth endpoint
│   │   └── companies/[slug]/     # Company-scoped APIs
│   │       ├── chat/             # RAG chat endpoint
│   │       ├── documents/        # Document management
│   │       └── competitors/      # Competitor management
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected dashboard pages
│   │   └── companies/[slug]/     # Company-specific pages
│   │       ├── intelligence/     # RAG chat interface
│   │       ├── competitors/      # Competitor management
│   │       └── settings/         # Settings
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles (Teal theme)
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── chat/                     # Chat interface components
│   ├── documents/                # Document management components
│   └── competitors/              # Competitor components
├── db/                           # Database
│   ├── schema.ts                 # Drizzle schema
│   └── index.ts                  # DB client
├── lib/                          # Utilities
│   ├── auth/                     # NextAuth config & helpers
│   │   ├── config.ts             # NextAuth configuration
│   │   └── helpers.ts            # verifyAuth, getCurrentCompany
│   ├── rag/                      # RAG engine
│   │   ├── engine.ts             # MultiTenantRAGEngine
│   │   └── document-processor.ts # PDF processing, chunking
│   └── utils.ts                  # Utility functions
└── types/                        # TypeScript types
```

## Architecture RAG Multi-Tenant

### Isolation des Données

Chaque compagnie a ses propres données isolées dans Pinecone via le champ `tenant_id`:

```typescript
// Upload de document - ajoute automatiquement tenant_id
await ragEngine.upsertDocument({
  companyId: "company-123",  // ← Utilisé comme tenant_id
  documentId: "doc-456",
  chunks: ["chunk 1", "chunk 2"],
  metadata: { documentName: "rapport.pdf" }
});

// Requête - filtre automatiquement par tenant_id
await ragEngine.query({
  companyId: "company-123",  // ← Voit SEULEMENT ses données
  queryText: "Quelles sont les forces de notre concurrent?",
});
```

### Coûts Pinecone

- **1 client**: ~$70/mois (100k vecteurs)
- **100 clients**: ~$70/mois (même coût!)
- **1000 clients**: ~$70-140/mois

Le coût augmente avec la QUANTITÉ DE DONNÉES, pas le nombre de clients.

## API Endpoints

### POST /api/companies/[slug]/chat

Chat avec le RAG (requiert authentification).

**Body:**
```json
{
  "message": "Quelles sont les forces de Competitor X?",
  "conversationId": "conv-123", // optionnel
  "filters": { // optionnel
    "competitor_name": "Competitor X"
  }
}
```

**Response:**
```json
{
  "answer": "D'après nos documents, Competitor X...",
  "sources": [
    {
      "text": "Excerpt from document...",
      "source": "rapport-q4.pdf",
      "competitor": "Competitor X",
      "relevance": 0.89
    }
  ],
  "conversationId": "conv-123",
  "model": "claude-sonnet-4-20250514"
}
```

### POST /api/companies/[slug]/documents/upload

Upload d'un document PDF (requiert permissions editor/admin).

**FormData:**
- `file`: PDF file
- `competitorId`: ID du concurrent (optionnel)

**Response:**
```json
{
  "documentId": "doc-789",
  "name": "rapport.pdf",
  "status": "completed",
  "chunksCreated": 42
}
```

## Prochaines Étapes

### Phase 1 - Composants UI (À implémenter)
- [ ] Créer les composants shadcn/ui de base (Button, Card, Input, etc.)
- [ ] Interface de chat avec messages bubbles
- [ ] Composant d'upload de documents
- [ ] Liste des documents avec statuts
- [ ] Cartes de concurrents

### Phase 2 - Pages Dashboard (À implémenter)
- [ ] Page d'intelligence (chat interface)
- [ ] Page de gestion des concurrents
- [ ] Page de gestion des documents
- [ ] Dashboard avec statistiques

### Phase 3 - Fonctionnalités Avancées
- [ ] Scraping web avec Firecrawl
- [ ] Collecte de données LinkedIn via Apify
- [ ] Alertes et notifications
- [ ] Analytics et métriques d'utilisation

## Documentation

Documentation complète disponible dans `/docs`:
- `REUSABLE_AUTHENTICATION_SECURITY.md` - Architecture auth
- `REUSABLE_MULTI_TENANT_ARCHITECTURE.md` - Architecture multi-tenant
- `REUSABLE_DESIGN_SYSTEM.md` - Design system Teal
- `INTEGRATION_RAG_MULTI_TENANT.md` - Intégration RAG
- `RAG_UI_COMPONENTS.md` - Composants UI pour RAG

## Support

Pour toute question ou problème, créer une issue dans le dépôt.

## Licence

Propriétaire - Tous droits réservés
