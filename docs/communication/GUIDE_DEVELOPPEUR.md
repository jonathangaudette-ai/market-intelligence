# Guide Développeur - Plateforme Market Intelligence

**Version:** 1.0
**Public:** Développeurs, contributeurs techniques
**Temps de lecture:** 1-2 heures
**Niveau:** Intermédiaire à Avancé

---

## 📚 Table des matières

1. [Setup environnement](#setup-environnement)
2. [Architecture technique](#architecture-technique)
3. [Structure du code](#structure-du-code)
4. [Modules principaux](#modules-principaux)
5. [API et services](#api-et-services)
6. [Base de données](#base-de-données)
7. [Tests](#tests)
8. [Contribution](#contribution)
9. [Débogage](#débogage)

---

## Setup environnement

### Prérequis

```bash
# Versions requises
Node.js >= 18.x
npm >= 9.x
PostgreSQL >= 14.x (ou Supabase)
```

**Comptes externes nécessaires:**
- Supabase (ou PostgreSQL hébergé)
- Pinecone (vector database)
- Anthropic API (Claude)
- OpenAI API (GPT-5 + embeddings)

---

### Installation locale

#### 1. Clone et dépendances

```bash
# Clone
git clone <repo-url>
cd market-intelligence

# Installation
npm install
```

#### 2. Configuration environnement

```bash
# Copier le template
cp .env.example .env
```

**Fichier `.env` complet:**

```env
# ======================
# DATABASE
# ======================
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# ======================
# AUTHENTICATION
# ======================
# Générer avec: openssl rand -base64 32
AUTH_SECRET="your-secret-key-here"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="http://localhost:3010"

# ======================
# AI APIs
# ======================
# Anthropic (Claude Sonnet 4.5 / Haiku 4.5)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# OpenAI (GPT-5 + text-embedding-3-large)
OPENAI_API_KEY="sk-..."

# ======================
# VECTOR DATABASE
# ======================
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="us-east-1-aws"  # ou votre région
PINECONE_INDEX_NAME="market-intelligence-prod"

# ======================
# OPTIONAL
# ======================
# Vercel Blob Storage (pour fichiers)
BLOB_READ_WRITE_TOKEN="..."

# Analytics
NEXT_PUBLIC_ANALYTICS_ID="..."
```

#### 3. Setup base de données

```bash
# Générer les migrations Drizzle
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Seed initial (user admin + demo company)
npm run db:seed
```

**Vérification:**
```bash
# Ouvrir Drizzle Studio pour inspecter la DB
npm run db:studio
```

Accès: http://localhost:4983

#### 4. Setup Pinecone

```bash
# Via Pinecone Console (console.pinecone.io)
# OU via CLI:

# Installer Pinecone CLI
npm install -g @pinecone-database/cli

# Login
pinecone login

# Créer l'index
pinecone index create \
  --name market-intelligence-prod \
  --dimension 1536 \
  --metric cosine \
  --cloud aws \
  --region us-east-1
```

**Paramètres critiques:**
- **Dimension**: 1536 (OpenAI text-embedding-3-large en mode compatibilité)
- **Metric**: cosine
- **Cloud**: AWS ou GCP (au choix)

#### 5. Lancer l'application

```bash
# Mode développement (port 3010)
npm run dev

# Application accessible à:
http://localhost:3010

# Identifiants par défaut (seed):
# Email: admin@example.com
# Password: password123
```

---

### Scripts npm disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lancer en mode développement (port 3010) |
| `npm run build` | Build production |
| `npm start` | Lancer le build production |
| `npm run lint` | Linter ESLint |
| `npm run db:generate` | Générer migrations Drizzle |
| `npm run db:migrate` | Appliquer migrations |
| `npm run db:studio` | Interface DB Drizzle Studio |
| `npm run db:seed` | Seed base de données |
| `npm test` | Lancer tests (Vitest) |
| `npm run test:watch` | Tests en mode watch |
| `npm run test:ui` | Interface UI pour tests |
| `npm run test:coverage` | Coverage report |

---

## Architecture technique

### Stack technologique complet

```
FRONTEND
├── Next.js 15 (App Router)
├── React 19 (RC)
├── TypeScript 5.9
├── Tailwind CSS 3.4
└── shadcn/ui (Radix UI)

BACKEND (Next.js API Routes)
├── NextAuth v5 (authentication)
├── Drizzle ORM 0.36
└── API Routes (REST)

DATABASES
├── PostgreSQL (Supabase)
│   └── Drizzle ORM
└── Pinecone (vectors)
    └── 1536 dimensions

AI/ML
├── OpenAI
│   ├── GPT-5 (extraction, parsing, matching)
│   └── text-embedding-3-large (embeddings)
└── Anthropic
    ├── Claude Sonnet 4.5 (génération, synthèse)
    └── Claude Haiku 4.5 (analyse rapide)

LIBRARIES
├── TipTap (rich text editor)
├── React Hook Form + Zod (formulaires)
├── Recharts (graphiques)
├── docx, xlsx (export Office)
├── pdf-parse, mammoth (parsing)
└── date-fns (dates)
```

---

### Architecture en couches

```
┌─────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                 │
│                                                     │
│  src/app/              src/components/             │
│  ├── (auth)/           ├── ui/        (shadcn)     │
│  ├── (dashboard)/      ├── rfp/       (business)   │
│  └── api/              └── layout/                 │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  BUSINESS LOGIC LAYER               │
│                                                     │
│  src/lib/                                           │
│  ├── rfp/               (RFP management)            │
│  │   ├── parser/        (PDF/DOCX/XLSX parsers)    │
│  │   ├── services/      (AI enrichment, analysis)  │
│  │   └── ai/            (Claude, embeddings)       │
│  ├── rag/               (RAG engine)                │
│  │   ├── engine.ts                                 │
│  │   └── dual-query-engine.ts                      │
│  └── auth/              (Authentication helpers)    │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                     DATA LAYER                      │
│                                                     │
│  src/db/                                            │
│  ├── schema.ts          (Drizzle schema)            │
│  └── index.ts           (DB client)                 │
│                                                     │
│  External:                                          │
│  ├── PostgreSQL (metadata, users, RFPs)            │
│  └── Pinecone (vectors, RAG)                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Structure du code

### Arborescence complète

```
market-intelligence/
│
├── 📁 src/
│   │
│   ├── 📁 app/                          # Next.js App Router
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Home (redirect)
│   │   ├── globals.css                  # Global styles + theme
│   │   │
│   │   ├── 📁 (auth)/                   # Auth routes (grouped)
│   │   │   └── login/page.tsx
│   │   │
│   │   ├── 📁 (dashboard)/              # Dashboard routes (grouped)
│   │   │   ├── layout.tsx               # Dashboard layout + nav
│   │   │   └── companies/[slug]/        # Slug-based routing
│   │   │       ├── dashboard/
│   │   │       ├── rfps/
│   │   │       │   ├── page.tsx         # RFP list
│   │   │       │   └── [id]/page.tsx    # RFP detail
│   │   │       ├── intelligence/        # Chat RAG
│   │   │       ├── knowledge-base/      # Documents
│   │   │       ├── competitors/         # Competitors
│   │   │       └── settings/
│   │   │
│   │   └── 📁 api/                      # API Routes
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── companies/[slug]/
│   │           ├── rfps/
│   │           │   ├── route.ts         # POST /api/companies/[slug]/rfps
│   │           │   └── [id]/
│   │           │       ├── route.ts     # GET/PATCH/DELETE
│   │           │       ├── enrich/route.ts
│   │           │       ├── generate/route.ts
│   │           │       └── export/route.ts
│   │           ├── chat/route.ts        # POST /chat
│   │           ├── documents/
│   │           │   └── upload/route.ts
│   │           └── competitors/route.ts
│   │
│   ├── 📁 components/                   # React components
│   │   ├── 📁 ui/                       # shadcn/ui base (35+ composants)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   │
│   │   ├── 📁 rfp/                      # RFP business components
│   │   │   ├── upload-form.tsx
│   │   │   ├── question-list.tsx
│   │   │   ├── enrichment-form.tsx
│   │   │   ├── bulk-generator.tsx
│   │   │   ├── export-button.tsx
│   │   │   ├── intelligence-brief.tsx
│   │   │   └── ...
│   │   │
│   │   └── 📁 layout/                   # Layout components
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── company-switcher.tsx
│   │
│   ├── 📁 lib/                          # Business logic
│   │   │
│   │   ├── 📁 rfp/                      # RFP module
│   │   │   ├── 📁 parser/               # Document parsers
│   │   │   │   ├── parser-service.ts    # Main parser dispatcher
│   │   │   │   ├── pdf-parser.ts        # PDF extraction
│   │   │   │   ├── docx-parser.ts       # DOCX extraction
│   │   │   │   ├── xlsx-parser.ts       # Excel extraction
│   │   │   │   └── question-extractor.ts # GPT-5 extraction
│   │   │   │
│   │   │   ├── 📁 services/             # Business services
│   │   │   │   ├── ai-enrichment.service.ts
│   │   │   │   └── document-analysis.service.ts
│   │   │   │
│   │   │   ├── 📁 ai/                   # AI integrations
│   │   │   │   ├── claude.ts            # Claude wrapper
│   │   │   │   └── embeddings.ts        # OpenAI embeddings
│   │   │   │
│   │   │   ├── historical-import.ts     # Import historique
│   │   │   ├── streaming-generator.ts   # Bulk generation
│   │   │   ├── intelligence-brief.ts    # Briefs auto
│   │   │   ├── smart-defaults.ts        # Configuration
│   │   │   └── pinecone.ts              # Pinecone client
│   │   │
│   │   ├── 📁 rag/                      # RAG module
│   │   │   ├── engine.ts                # Main RAG engine
│   │   │   ├── dual-query-engine.ts     # Dual search
│   │   │   └── document-processor.ts    # Chunking
│   │   │
│   │   ├── 📁 auth/                     # Auth module
│   │   │   ├── config.ts                # NextAuth config
│   │   │   └── helpers.ts               # Auth helpers
│   │   │
│   │   ├── 📁 constants/                # Constants
│   │   │   ├── ai-models.ts             # Model configs
│   │   │   └── app-config.ts            # App config
│   │   │
│   │   └── utils.ts                     # Utilities
│   │
│   ├── 📁 db/                           # Database
│   │   ├── schema.ts                    # Drizzle schema (10 tables)
│   │   └── index.ts                     # DB client
│   │
│   ├── 📁 types/                        # TypeScript types
│   │   ├── rfp.ts
│   │   ├── rag.ts
│   │   └── database.ts
│   │
│   ├── 📁 hooks/                        # React hooks
│   │   ├── use-toast.ts
│   │   └── use-company.ts
│   │
│   └── middleware.ts                    # Next.js middleware (auth)
│
├── 📁 scripts/                          # Utilitaires
│   └── seed.ts                          # DB seeding
│
├── 📁 public/                           # Static assets
│   └── ...
│
├── 📁 docs/                             # Documentation
│   ├── communication/
│   │   ├── GUIDE_UTILISATEUR.md
│   │   ├── GUIDE_DEVELOPPEUR.md (ce fichier)
│   │   ├── ARCHITECTURE.md
│   │   └── API_REFERENCE.md
│   └── ...
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.ts
├── .env.example
└── README.md
```

---

## Modules principaux

### 1. Module RFP

**Localisation:** `src/lib/rfp/`

#### Parser Service

**Fichier:** `src/lib/rfp/parser/parser-service.ts`

```typescript
// Interface principale
export class ParserService {
  async parseRFPDocument(
    buffer: Buffer,
    fileType: 'pdf' | 'docx' | 'xlsx',
    metadata: ParserMetadata
  ): Promise<ParsedRFP> {
    // Dispatch vers le bon parser
    // Retourne: { rawText, questions, metadata }
  }
}
```

**Parsers spécialisés:**

| Parser | Fichier | Description |
|--------|---------|-------------|
| PDF | `pdf-parser.ts` | Utilise `pdf-parse` pour extraction texte par page |
| DOCX | `docx-parser.ts` | Utilise `mammoth` pour conversion HTML→text |
| XLSX | `xlsx-parser.ts` | Utilise `xlsx` pour extraction cellules |

#### Question Extractor

**Fichier:** `src/lib/rfp/parser/question-extractor.ts`

**Technologie:** GPT-5 avec `reasoning.effort: 'low'`

```typescript
export async function extractQuestions(
  rawText: string,
  options: ExtractorOptions
): Promise<Question[]> {
  // 1. Découpage du texte en sections
  // 2. Prompt GPT-5 pour extraction
  // 3. Parsing de la réponse JSON
  // 4. Validation avec Zod
  // 5. Retour des questions structurées
}
```

**Prompt Engineering:**

```typescript
const systemPrompt = `
Tu es un expert en analyse de RFPs (Requests for Proposal).
Ton rôle est d'extraire TOUTES les questions demandant une réponse du soumissionnaire.

Format de sortie JSON:
{
  "questions": [
    {
      "text": "Question complète telle qu'écrite",
      "category": "technical" | "pricing" | "experience" | "other",
      "page": 12,
      "section": "Section 3.2"
    }
  ]
}
`;
```

**Configuration GPT-5:**

```typescript
// Fichier: src/lib/constants/ai-models.ts
export const GPT5_CONFIGS = {
  extraction: {
    model: 'gpt-5',
    reasoning: { effort: 'low' },      // Fast extraction
    text: { verbosity: 'low' }         // Concise output
  },
  parsing: {
    model: 'gpt-5',
    reasoning: { effort: 'low' },
    text: { verbosity: 'medium' }
  },
  matching: {
    model: 'gpt-5',
    reasoning: { effort: 'medium' },   // Better reasoning
    text: { verbosity: 'medium' }
  }
};
```

#### Enrichment Service

**Fichier:** `src/lib/rfp/services/ai-enrichment.service.ts`

```typescript
export class AIEnrichmentService {
  // Enrichir une question avec contexte RAG
  async enrichQuestion(
    question: Question,
    companyId: string
  ): Promise<EnrichedQuestion> {
    // 1. Recherche RAG dans Pinecone (top-5)
    // 2. Extraction de réponses historiques similaires
    // 3. Analyse avec Claude Haiku 4.5
    // 4. Retour enrichment
  }

  // Enrichir en bulk
  async enrichQuestions(
    questions: Question[],
    companyId: string
  ): Promise<EnrichedQuestion[]> {
    // Parallélisation avec concurrency limit
  }
}
```

**Modèle:** Claude Haiku 4.5 (rapide, cost-effective)

#### Streaming Generator

**Fichier:** `src/lib/rfp/streaming-generator.ts`

**Génération de réponses en streaming** (temps réel dans l'UI):

```typescript
export async function* generateResponsesStream(
  questions: EnrichedQuestion[],
  config: GenerationConfig
): AsyncGenerator<GenerationEvent> {
  for (const question of questions) {
    yield { type: 'progress', questionId: question.id, status: 'started' };

    // 1. Recherche RAG
    const sources = await searchSources(question);

    // 2. Construction du prompt
    const prompt = buildPrompt(question, sources, config);

    // 3. Appel Claude Sonnet 4.5 (streaming)
    const stream = await anthropic.messages.stream({
      model: CLAUDE_MODELS.sonnet,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    });

    // 4. Stream des tokens
    for await (const chunk of stream) {
      yield {
        type: 'token',
        questionId: question.id,
        token: chunk.delta?.text
      };
    }

    yield { type: 'completed', questionId: question.id };
  }
}
```

**Utilisation côté API:**

```typescript
// src/app/api/companies/[slug]/rfps/[id]/generate/route.ts
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of generateResponsesStream(questions, config)) {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Utilisation côté client:**

```typescript
// Composant React
const response = await fetch('/api/companies/acme/rfps/123/generate', {
  method: 'POST',
  body: JSON.stringify({ questionIds })
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
      handleEvent(event); // Update UI
    }
  }
}
```

#### Intelligence Brief

**Fichier:** `src/lib/rfp/intelligence-brief.ts`

**Génération automatique d'insights** sur un RFP:

```typescript
export async function generateIntelligenceBrief(
  rfpId: string,
  companyId: string
): Promise<IntelligenceBrief> {
  // 1. Récupération RFP + questions + réponses
  // 2. Agrégation des données
  // 3. Analyse avec Claude Sonnet 4.5
  // 4. Retour brief structuré
}
```

**Contenu du brief:**
- Statistiques (nb questions, catégories, sources)
- Thèmes principaux (clustering)
- Exigences critiques (extraction)
- Gaps identifiés (questions sans réponse de qualité)
- Recommandations stratégiques
- Score de complétude (0-100%)

---

### 2. Module RAG

**Localisation:** `src/lib/rag/`

#### RAG Engine

**Fichier:** `src/lib/rag/engine.ts`

**Architecture:**

```typescript
export class RAGEngine {
  private pinecone: Pinecone;
  private openai: OpenAI;
  private anthropic: Anthropic;

  // === INDEXATION ===

  async upsertDocument(
    content: string,
    metadata: DocumentMetadata,
    companyId: string
  ): Promise<void> {
    // 1. Chunking intelligent
    const chunks = await this.chunkText(content);

    // 2. Génération embeddings (OpenAI)
    const embeddings = await this.generateEmbeddings(chunks);

    // 3. Upsert Pinecone avec metadata + tenant filtering
    await this.pinecone.upsert({
      vectors: embeddings.map((embedding, i) => ({
        id: `${metadata.documentId}-chunk-${i}`,
        values: embedding,
        metadata: {
          companyId,        // ← CRITICAL pour isolation
          documentId: metadata.documentId,
          chunkIndex: i,
          text: chunks[i],
          ...metadata
        }
      }))
    });
  }

  // === RECHERCHE ===

  async query(
    query: string,
    companyId: string,
    options: QueryOptions = {}
  ): Promise<SearchResult[]> {
    // 1. Embed query
    const queryEmbedding = await this.generateEmbedding(query);

    // 2. Search Pinecone avec filtre tenant
    const results = await this.pinecone.query({
      vector: queryEmbedding,
      topK: options.topK || 5,
      filter: {
        companyId: { $eq: companyId },  // ← Isolation multi-tenant
        ...(options.competitorId && {
          competitorId: { $eq: options.competitorId }
        })
      },
      includeMetadata: true
    });

    return results.matches;
  }

  // === SYNTHÈSE ===

  async synthesize(
    query: string,
    sources: SearchResult[],
    options: SynthesisOptions = {}
  ): Promise<SynthesisResponse> {
    // 1. Construction du contexte
    const context = sources
      .map((s, i) => `[${i + 1}] ${s.metadata.text}`)
      .join('\n\n');

    // 2. Construction du prompt
    const prompt = `
Contexte (sources):
${context}

Question: ${query}

Instructions:
- Réponds en te basant UNIQUEMENT sur le contexte fourni
- Cite tes sources avec [1], [2], etc.
- Si aucune info pertinente, dis-le clairement
    `;

    // 3. Appel Claude Sonnet 4.5
    const response = await this.anthropic.messages.create({
      model: CLAUDE_MODELS.sonnet,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    return {
      answer: response.content[0].text,
      sources: sources.map(s => ({
        documentId: s.metadata.documentId,
        text: s.metadata.text,
        score: s.score
      }))
    };
  }

  // === PIPELINE COMPLET ===

  async chat(
    message: string,
    companyId: string,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    // 1. Search
    const sources = await this.query(message, companyId, options);

    // 2. Synthesize
    const synthesis = await this.synthesize(message, sources, options);

    return {
      message: synthesis.answer,
      sources: synthesis.sources
    };
  }
}
```

#### Dual Query Engine

**Fichier:** `src/lib/rag/dual-query-engine.ts`

**Amélioration:** Recherche hybride (vectorielle + keyword)

```typescript
export class DualQueryEngine extends RAGEngine {
  async query(
    query: string,
    companyId: string,
    options: QueryOptions = {}
  ): Promise<SearchResult[]> {
    // 1. Recherche vectorielle (semantic)
    const vectorResults = await super.query(query, companyId, options);

    // 2. Recherche keyword (exact match)
    const keywordResults = await this.keywordSearch(query, companyId);

    // 3. Fusion des résultats (Reciprocal Rank Fusion)
    const merged = this.fuseResults(vectorResults, keywordResults);

    // 4. Re-ranking (optionnel)
    if (options.rerank) {
      return await this.rerank(query, merged);
    }

    return merged;
  }

  private fuseResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    // Reciprocal Rank Fusion (RRF) algorithm
    const k = 60;
    const scores = new Map<string, number>();

    // Score from vector search
    vectorResults.forEach((result, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(result.id, (scores.get(result.id) || 0) + score);
    });

    // Score from keyword search
    keywordResults.forEach((result, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(result.id, (scores.get(result.id) || 0) + score);
    });

    // Sort by fused score
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => vectorResults.find(r => r.id === id)!)
      .filter(Boolean);
  }
}
```

---

### 3. Module Auth

**Localisation:** `src/lib/auth/`

#### NextAuth Configuration

**Fichier:** `src/lib/auth/config.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",  // JWT pour scalabilité
    maxAge: 30 * 24 * 60 * 60  // 30 jours
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Validation
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 2. Recherche user
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string)
        });

        if (!user) return null;

        // 3. Vérification password
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        // 4. Retour user (sera ajouté au JWT)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Ajouter user info au JWT
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Ajouter JWT info à la session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
});
```

#### Auth Helpers

**Fichier:** `src/lib/auth/helpers.ts`

```typescript
import { auth } from "./config";
import { db } from "@/db";

// Vérifier authentification
export async function verifyAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Récupérer company depuis slug + vérifier accès
export async function getCurrentCompany(slug: string, userId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.slug, slug),
    with: {
      members: {
        where: eq(companyMembers.userId, userId)
      }
    }
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const membership = company.members[0];
  if (!membership) {
    throw new Error("Access denied");
  }

  return { company, role: membership.role };
}

// Vérifier permission
export async function hasPermission(
  userId: string,
  companyId: string,
  requiredRole: "admin" | "editor" | "viewer"
): Promise<boolean> {
  const member = await db.query.companyMembers.findFirst({
    where: and(
      eq(companyMembers.userId, userId),
      eq(companyMembers.companyId, companyId)
    )
  });

  if (!member) return false;

  const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
}
```

---

## API et services

### Structure des API Routes

**Convention:** Toutes les APIs sont scopées par company slug

```
/api/companies/[slug]/...
```

**Avantages:**
- ✅ Contexte company dans l'URL (pas de cookies requis)
- ✅ Isolation multi-tenant garantie
- ✅ URLs explicites et partageables
- ✅ CDN-friendly

### Protection des routes

**Pattern standard** pour toutes les API routes:

```typescript
// src/app/api/companies/[slug]/example/route.ts

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. Authentification
    const user = await verifyAuth();

    // 2. Vérification company access
    const { company, role } = await getCurrentCompany(params.slug, user.id);

    // 3. Vérification permission (si nécessaire)
    if (!hasPermission(user.id, company.id, "editor")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // 4. Business logic
    const body = await req.json();
    // ... traitement ...

    // 5. Response
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

### Endpoints principaux

Voir [API_REFERENCE.md](./API_REFERENCE.md) pour la documentation complète.

**Résumé:**

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/companies/[slug]/rfps` | POST | Upload RFP |
| `/api/companies/[slug]/rfps` | GET | Liste RFPs |
| `/api/companies/[slug]/rfps/[id]` | GET | Détails RFP |
| `/api/companies/[slug]/rfps/[id]/enrich` | POST | Enrichir questions |
| `/api/companies/[slug]/rfps/[id]/generate` | POST | Générer réponses (streaming) |
| `/api/companies/[slug]/rfps/[id]/export` | POST | Export Word/Excel |
| `/api/companies/[slug]/chat` | POST | Chat RAG |
| `/api/companies/[slug]/documents/upload` | POST | Upload document |
| `/api/companies/[slug]/competitors` | GET/POST | Competitors CRUD |

---

## Base de données

### Schéma Drizzle

**Fichier:** `src/db/schema.ts`

**10 tables principales:**

```typescript
// 1. USERS
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").notNull().default("user"), // user | admin | super_admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// 2. COMPANIES
export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),  // ← Pour routing
  createdAt: timestamp("created_at").defaultNow()
});

// 3. COMPANY_MEMBERS (jonction users ↔ companies)
export const companyMembers = pgTable("company_members", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("viewer"), // admin | editor | viewer
  joinedAt: timestamp("joined_at").defaultNow()
});

// 4. RFPS
export const rfps = pgTable("rfps", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name"),
  fileUrl: text("file_url"),        // Vercel Blob URL
  fileType: text("file_type"),      // pdf | docx | xlsx
  status: text("status").notNull().default("pending"),
  // Status: pending | parsing | parsed | enriching | enriched | generating | completed | error
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// 5. RFP_QUESTIONS
export const rfpQuestions = pgTable("rfp_questions", {
  id: text("id").primaryKey(),
  rfpId: text("rfp_id").references(() => rfps.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  category: text("category"),       // technical | pricing | experience | other
  page: integer("page"),
  section: text("section"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// 6. RFP_RESPONSES
export const rfpResponses = pgTable("rfp_responses", {
  id: text("id").primaryKey(),
  questionId: text("question_id").references(() => rfpQuestions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: text("status").default("draft"), // draft | approved | final
  sources: jsonb("sources").$type<Source[]>(),  // Sources utilisées
  confidence: real("confidence"),   // 0-1
  generatedBy: text("generated_by"), // ai | human
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// 7. DOCUMENTS
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  competitorId: text("competitor_id").references(() => competitors.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  status: text("status").default("processing"),
  pineconeId: text("pinecone_id"),  // Pour cleanup
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});

// 8. COMPETITORS
export const competitors = pgTable("competitors", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});

// 9. CONVERSATIONS (pour chat RAG)
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow()
});

// 10. MESSAGES (messages du chat)
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),  // user | assistant
  content: text("content").notNull(),
  sources: jsonb("sources").$type<Source[]>(),
  createdAt: timestamp("created_at").defaultNow()
});
```

### Migrations

```bash
# Générer migration après modification du schema
npm run db:generate

# Appliquer migrations
npm run db:migrate
```

**Fichiers générés:** `drizzle/migrations/*.sql`

### Seed script

**Fichier:** `scripts/seed.ts`

```bash
npm run db:seed
```

**Crée:**
- 1 super admin user (`admin@example.com` / `password123`)
- 1 demo company (`demo-company`)
- Association user ↔ company

---

## Tests

### Stack de tests

```
Vitest          # Test runner
@testing-library/react    # React testing
happy-dom       # DOM simulation
@vitest/coverage-v8       # Coverage
```

### Lancer les tests

```bash
# Tous les tests
npm test

# Mode watch
npm run test:watch

# Interface UI
npm run test:ui

# Coverage
npm run test:coverage
```

### Structure des tests

```
src/
├── lib/
│   └── rfp/
│       └── services/
│           ├── document-analysis.service.ts
│           └── __tests__/
│               └── document-analysis.service.test.ts
```

### Exemple de test

```typescript
// src/lib/rfp/services/__tests__/document-analysis.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentAnalysisService } from '../document-analysis.service';

describe('DocumentAnalysisService', () => {
  let service: DocumentAnalysisService;

  beforeEach(() => {
    service = new DocumentAnalysisService();
  });

  it('should analyze document content', async () => {
    const content = "Sample RFP content...";
    const result = await service.analyze(content);

    expect(result).toBeDefined();
    expect(result.categories).toBeInstanceOf(Array);
  });

  it('should detect technical questions', async () => {
    const content = "Describe your technical architecture";
    const result = await service.categorize(content);

    expect(result.category).toBe('technical');
  });
});
```

### Bonnes pratiques

✅ **À faire:**
- Tester la logique métier (services)
- Mocker les APIs externes (OpenAI, Anthropic, Pinecone)
- Tests unitaires pour fonctions pures
- Tests d'intégration pour flows complets

❌ **À éviter:**
- Tester les composants UI exhaustivement (trop de maintenance)
- Tests qui appellent les vraies APIs (coûteux)

---

## Contribution

### Workflow Git

```bash
# 1. Créer une branche feature
git checkout -b feature/my-feature

# 2. Développer et commit
git add .
git commit -m "feat: add new feature"

# 3. Push
git push origin feature/my-feature

# 4. Créer une Pull Request
```

### Conventions de commit

Format: `type(scope): message`

**Types:**
- `feat`: Nouvelle fonctionnalité
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Refactoring
- `test`: Ajout de tests
- `chore`: Tâches de maintenance

**Exemples:**
```
feat(rfp): add bulk export to Excel
fix(auth): resolve session timeout issue
docs(readme): update installation guide
refactor(rag): improve chunking algorithm
```

### Code Style

**ESLint + Prettier** (configurés)

```bash
# Linter
npm run lint

# Auto-fix
npm run lint -- --fix
```

**Règles clés:**
- TypeScript strict mode
- 2 espaces d'indentation
- Single quotes pour strings
- Trailing commas
- Max line length: 100

### Pull Request Checklist

Avant de soumettre une PR :

- [ ] Code respecte ESLint
- [ ] Tests passent (`npm test`)
- [ ] Types TypeScript valides
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de secrets dans le code
- [ ] Commits suivent les conventions

---

## Débogage

### Logs serveur

```typescript
// Utiliser console.log pour debugging local
console.log('[DEBUG] User:', user);

// Production: utiliser un logger structuré
import { logger } from '@/lib/logger';
logger.info('User logged in', { userId: user.id });
```

### Drizzle Studio

Inspecter la DB en temps réel :

```bash
npm run db:studio
# Accès: http://localhost:4983
```

### API debugging

**Postman / Insomnia:**

1. Importer collection (à venir)
2. Configurer env variable `BASE_URL=http://localhost:3010`
3. Tester endpoints

**curl:**

```bash
# Login
curl -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}' \
  -c cookies.txt

# Test protected endpoint
curl http://localhost:3010/api/companies/demo-company/rfps \
  -b cookies.txt
```

### Pinecone debugging

**Vérifier les vecteurs:**

```typescript
// Script debug: scripts/debug-pinecone.ts
import { getPineconeClient } from '@/lib/rfp/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

// Récupérer stats
const stats = await index.describeIndexStats();
console.log('Total vectors:', stats.totalRecordCount);

// Query test
const results = await index.query({
  vector: [...], // test vector
  topK: 5,
  includeMetadata: true
});
console.log('Results:', results);
```

### React DevTools

**Chrome Extension:** React Developer Tools

Inspecter:
- Component tree
- Props
- State
- Hooks

### Next.js DevTools

**Activé automatiquement en dev:**
- Fast Refresh
- Error overlay
- Build indicators

---

## Ressources

### Documentation externe

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 19 Docs](https://react.dev)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [NextAuth v5](https://authjs.dev)
- [Anthropic Claude API](https://docs.anthropic.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Pinecone Docs](https://docs.pinecone.io)
- [shadcn/ui](https://ui.shadcn.com)

### Fichiers importants

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture système
- [API_REFERENCE.md](./API_REFERENCE.md) - Référence API complète
- [CLAUDE.md](../../CLAUDE.md) - Instructions pour Claude Code
- [FILE_STRUCTURE.md](../../FILE_STRUCTURE.md) - Structure des fichiers

---

## Support

**Questions ?**
- Consulter cette documentation
- Vérifier les GitHub issues
- Demander à l'équipe sur Slack

---

**Dernière mise à jour:** Novembre 2025
**Version:** 1.0
