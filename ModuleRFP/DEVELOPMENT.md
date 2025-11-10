# Development Guide - Module RFP Response Assistant

**Dernière mise à jour :** 2025-11-10

---

## ⚠️ Important: Module Intégré à la Plateforme Existante

Ce module fait partie de la **MarketIQ AI Platform** et s'intègre dans le projet `market-intelligence` existant.

**Infrastructure réutilisée:**
- Base de données Neon PostgreSQL (déjà configurée)
- Pinecone vector database (index partagé: `market-intelligence`)
- APIs Anthropic & OpenAI (clés déjà configurées)
- Next.js App Router (projet principal existant)

**Ne créez PAS de nouveau projet Next.js.** Travaillez dans le projet existant.

---

## 🚀 Quick Start

### Prérequis

Avant de commencer, assurez-vous d'avoir :

- **Accès au repository** : `market-intelligence`
- **Node.js** 20+ : `node --version`
- **npm** ou **pnpm** : `npm --version`
- **Git** : `git --version`
- **Variables d'environnement** : Fichier `.env.local` à la racine du projet

### Setup Initial (15 minutes)

#### 1. Vérifier l'accès au projet existant

```bash
# Vous devez déjà être dans le projet market-intelligence
cd market-intelligence

# Vérifier que le projet Next.js existe
ls -la  # Devrait voir: package.json, app/, components/, etc.

# Installer les dépendances (si pas déjà fait)
npm install
```

#### 2. Vérifier les variables d'environnement

**Les variables d'environnement sont déjà configurées** dans `.env.local` à la racine du projet.

```bash
# Vérifier que le fichier existe
cat .env.local | grep -E "(DATABASE_URL|ANTHROPIC|OPENAI|PINECONE)"
```

**Variables utilisées par le Module RFP** (déjà configurées dans la plateforme):
```bash
# Database (Neon) - Base partagée de la plateforme
DATABASE_URL="postgresql://..."  # ✅ Déjà configuré

# AI APIs - Clés partagées de la plateforme
ANTHROPIC_API_KEY="sk-ant-..."   # ✅ Déjà configuré
OPENAI_API_KEY="sk-..."          # ✅ Déjà configuré

# Vector DB - Index partagé "market-intelligence"
PINECONE_API_KEY="..."           # ✅ Déjà configuré
PINECONE_INDEX="market-intelligence"  # ✅ Index existant

# Auth - Système d'auth de la plateforme
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."  # ✅ Déjà configuré
CLERK_SECRET_KEY="..."           # ✅ Déjà configuré

# File Storage - Stockage partagé
BLOB_READ_WRITE_TOKEN="..."      # ✅ Déjà configuré

# Background Jobs - Inngest de la plateforme
INNGEST_EVENT_KEY="..."          # ✅ Déjà configuré
```

**Aucune nouvelle variable à ajouter!** Tout est déjà configuré.

#### 3. Setup Database (Neon) - Ajouter les tables RFP

**La base de données Neon existe déjà** pour la plateforme. Vous devez simplement ajouter les tables du Module RFP.

```bash
# Naviguer vers le dossier ModuleRFP
cd ModuleRFP

# Appliquer le schéma SQL au database existant
psql $DATABASE_URL -f schema.sql
```

**Vérification:**
```bash
# Vérifier que les tables ont été créées
psql $DATABASE_URL -c "\dt rfp*"

# Devrait afficher: rfps, rfp_questions, rfp_responses, response_library, etc.
```

**Note:** Les tables RFP s'ajoutent au schéma existant de la plateforme sans conflit. Le schéma RFP est conçu pour coexister avec les autres modules.

#### 4. Vérifier Pinecone

**L'index Pinecone existe déjà** pour la plateforme (index: `market-intelligence`).

Le Module RFP **réutilise cet index partagé** avec un namespace dédié:

```typescript
// lib/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('market-intelligence');

// Utiliser un namespace pour le module RFP
const rfpNamespace = index.namespace('rfp-library');
```

**Aucune configuration Pinecone supplémentaire nécessaire!**

#### 5. Vérifier l'installation

```bash
# Démarrer le serveur de dev
npm run dev

# Ouvrir dans le navigateur
open http://localhost:3000
```

---

## 📁 Structure du projet

```
rfp-assistant/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected pages
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home
│   │       └── rfps/
│   │           ├── page.tsx      # RFPs list
│   │           ├── new/
│   │           │   └── page.tsx  # Upload new RFP
│   │           └── [id]/
│   │               └── page.tsx  # RFP detail (questions + editor)
│   ├── api/
│   │   └── v1/
│   │       └── rfp/
│   │           ├── rfps/
│   │           │   ├── route.ts          # POST /api/v1/rfp/rfps (upload)
│   │           │   └── [id]/
│   │           │       ├── route.ts      # GET/PUT /api/v1/rfp/rfps/:id
│   │           │       ├── parse/
│   │           │       │   └── route.ts  # POST /api/v1/rfp/rfps/:id/parse
│   │           │       └── export/
│   │           │           └── route.ts  # POST /api/v1/rfp/rfps/:id/export
│   │           ├── questions/
│   │           │   └── [id]/
│   │           │       ├── route.ts              # GET /api/v1/rfp/questions/:id
│   │           │       └── generate-response/
│   │           │           └── route.ts          # POST /api/v1/rfp/questions/:id/generate-response
│   │           └── library/
│   │               ├── search/
│   │               │   └── route.ts      # GET /api/v1/rfp/library/search
│   │               └── responses/
│   │                   └── route.ts      # GET/POST /api/v1/rfp/library/responses
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components (Button, Input, etc.)
│   ├── rfp/
│   │   ├── upload-form.tsx
│   │   ├── file-dropzone.tsx
│   │   ├── question-list.tsx
│   │   ├── question-filters.tsx
│   │   ├── progress-bar.tsx
│   │   └── suggestions-panel.tsx
│   ├── editor/
│   │   └── response-editor.tsx   # Tiptap rich text editor
│   └── layout/
│       ├── header.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
│
├── lib/                          # Business logic
│   ├── db/
│   │   ├── index.ts              # Drizzle DB client
│   │   ├── schema.ts             # Drizzle schema
│   │   └── queries.ts            # Common queries
│   ├── ai/
│   │   ├── claude.ts             # Claude Sonnet 4.5 client
│   │   └── openai.ts             # OpenAI client
│   ├── pinecone/
│   │   └── client.ts             # Pinecone client
│   ├── parser/
│   │   ├── pdf-parser.ts
│   │   ├── docx-parser.ts
│   │   ├── xlsx-parser.ts
│   │   ├── question-extractor.ts # GPT-4o extraction
│   │   └── parser-service.ts     # Main orchestrator
│   ├── rag/
│   │   ├── generate-response.ts  # RAG pipeline
│   │   ├── embed.ts              # Embedding service
│   │   └── retrieve.ts           # Vector search
│   ├── categorization/
│   │   └── categorize.ts         # Question categorization
│   ├── export/
│   │   ├── docx-exporter.ts
│   │   └── pdf-exporter.ts
│   ├── auth/
│   │   └── session.ts            # Auth helpers
│   └── utils/
│       ├── formatting.ts
│       ├── validation.ts
│       └── constants.ts
│
├── inngest/                      # Background jobs
│   ├── client.ts
│   └── functions/
│       ├── parse-rfp.ts
│       ├── generate-batch.ts
│       └── index-document.ts
│
├── scripts/                      # Utility scripts
│   ├── index-documents.ts        # Index docs in Pinecone
│   ├── migrate-db.ts             # DB migrations
│   └── seed-data.ts              # Seed sample data
│
├── tests/                        # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│       └── rfp-flow.spec.ts
│
├── public/
│   ├── examples/                 # Sample RFP files for testing
│   └── templates/                # Export templates (DOCX)
│
├── .env.example
├── .env.local
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

---

## 🛠️ Workflows de développement

### Workflow 1 : Ajouter une nouvelle fonctionnalité

```bash
# 1. Créer une branche
git checkout -b feat/TASK-XXX-description

# 2. Implémenter la fonctionnalité
# ... code ...

# 3. Tester localement
npm run dev
# Tester manuellement + unit tests
npm run test

# 4. Commit
git add .
git commit -m "feat(module): description"

# 5. Push & créer PR
git push origin feat/TASK-XXX-description
# Créer PR sur GitHub

# 6. Code review → Merge
```

### Workflow 2 : Debugging

**Dev Tools:**
```bash
# Console logs
console.log('[DEBUG]', variable);

# React DevTools (browser extension)
# Install: https://react.dev/learn/react-developer-tools

# Network tab pour inspecter API calls
# Chrome DevTools → Network

# VS Code debugger
# .vscode/launch.json configuré pour Next.js
```

**Common Issues:**
| Erreur | Solution |
|--------|----------|
| `ECONNREFUSED` lors d'appel DB | Vérifier `DATABASE_URL` dans `.env.local` |
| `Unauthorized` sur API Claude | Vérifier `ANTHROPIC_API_KEY` |
| `Module not found` | `rm -rf node_modules && npm install` |
| Build error TypeScript | `npm run type-check` pour voir erreurs |

---

## 🧪 Testing

### Unit Tests (Jest)

```bash
# Installer Jest
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Créer jest.config.js
npx jest --init

# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Exemple de test :**
```typescript
// tests/unit/lib/parser/pdf-parser.test.ts
import { parsePDF } from '@/lib/parser/pdf-parser';

describe('PDF Parser', () => {
  it('should extract text from PDF', async () => {
    const text = await parsePDF('/path/to/sample.pdf');
    expect(text).toContain('Request for Proposal');
    expect(text.length).toBeGreaterThan(100);
  });

  it('should handle invalid PDF', async () => {
    await expect(parsePDF('/invalid.pdf')).rejects.toThrow();
  });
});
```

### Integration Tests

```bash
# Test avec DB locale (Docker)
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:15

# Set test DB URL
export DATABASE_URL="postgresql://postgres:test@localhost:5433/test"

# Run integration tests
npm run test:integration
```

### E2E Tests (Playwright)

```bash
# Installer Playwright
npm install --save-dev @playwright/test

# Init
npx playwright install

# Run E2E tests
npm run test:e2e

# Debug mode
npm run test:e2e -- --debug
```

**Exemple de test E2E :**
```typescript
// tests/e2e/rfp-flow.spec.ts
import { test, expect } from '@playwright/test';

test('upload RFP and generate responses', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Upload RFP
  await page.goto('/dashboard/rfps/new');
  await page.fill('[name=title]', 'Test RFP');
  await page.fill('[name=client_name]', 'Acme Corp');
  await page.setInputFiles('input[type=file]', 'public/examples/sample-rfp.pdf');
  await page.click('button:has-text("Upload & Parse RFP")');

  // Wait for parsing
  await expect(page.locator('text=Parsing complete')).toBeVisible({ timeout: 30000 });

  // Generate response for first question
  await page.click('[data-testid=question-0]');
  await page.click('button:has-text("Generate Answer")');
  await expect(page.locator('[data-testid=ai-response]')).toBeVisible({ timeout: 15000 });

  // Verify response generated
  const responseText = await page.locator('[data-testid=editor]').textContent();
  expect(responseText.length).toBeGreaterThan(50);
});
```

---

## 📦 Déploiement

### Déploiement sur Vercel

**Option 1 : Via CLI**
```bash
# Installer Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Production
vercel --prod
```

**Option 2 : Via GitHub Integration (recommandé)**
1. Aller sur https://vercel.com/dashboard
2. New Project
3. Import GitHub repo
4. Configure environment variables
5. Deploy

**Environment Variables (Production) :**
Ajouter dans Vercel Dashboard → Settings → Environment Variables :
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX_NAME`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `BLOB_READ_WRITE_TOKEN`

---

## 🐛 Debugging Avancé

### Debugging Backend API Routes

**VS Code launch.json :**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Debugging LLM Prompts

```typescript
// lib/rag/generate-response.ts

// Activer logging des prompts
const DEBUG_PROMPTS = process.env.DEBUG_PROMPTS === 'true';

if (DEBUG_PROMPTS) {
  console.log('[PROMPT]', prompt);
}

const message = await anthropic.messages.create({...});

if (DEBUG_PROMPTS) {
  console.log('[RESPONSE]', message.content[0].text);
}
```

Ajouter dans `.env.local` :
```
DEBUG_PROMPTS=true
```

### Monitoring en Production

**Sentry (Error Tracking) :**
```bash
npm install @sentry/nextjs

# Init
npx @sentry/wizard@latest -i nextjs
```

**Vercel Analytics :**
```bash
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 📝 Conventions de Code

### Naming Conventions

```typescript
// Files: kebab-case
lib/rag/generate-response.ts

// Components: PascalCase
components/RFPUploadForm.tsx

// Functions: camelCase
async function generateResponse(questionId: string) {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 50_000_000;

// Types/Interfaces: PascalCase
interface GeneratedResponse {}

// Database tables: snake_case
rfp_responses, response_library
```

### TypeScript Best Practices

```typescript
// ✅ DO: Use explicit types
function parseRFP(file: File): Promise<ParsedDocument> {}

// ❌ DON'T: Use any
function parseRFP(file: any): any {}

// ✅ DO: Use enums for constants
enum RFPStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
}

// ✅ DO: Use interfaces for objects
interface RFP {
  id: string;
  title: string;
  status: RFPStatus;
}

// ✅ DO: Use optional chaining
const clientName = rfp?.client?.name ?? 'Unknown';
```

### React Best Practices

```typescript
// ✅ DO: Use client components only when needed
'use client'; // Only for components that need interactivity

// ✅ DO: Use server components by default
// app/dashboard/rfps/page.tsx (no 'use client')

// ✅ DO: Use SWR for data fetching
import useSWR from 'swr';

function RFPList() {
  const { data, error, isLoading } = useSWR('/api/v1/rfp/rfps', fetcher);

  if (isLoading) return <Loading />;
  if (error) return <Error />;
  return <List data={data} />;
}

// ✅ DO: Use React Server Actions for mutations
'use server';

export async function uploadRFP(formData: FormData) {
  // Server-side logic
}
```

---

## 🔧 Scripts Utiles

```bash
# Développement
npm run dev                 # Start dev server
npm run build               # Build production
npm run start               # Start production server

# Testing
npm run test                # Run unit tests
npm run test:watch          # Watch mode
npm run test:e2e            # E2E tests
npm run test:coverage       # Coverage report

# Linting & Formatting
npm run lint                # ESLint
npm run lint:fix            # Auto-fix
npm run format              # Prettier format
npm run type-check          # TypeScript check

# Database
npm run db:migrate          # Run migrations
npm run db:seed             # Seed data
npm run db:studio           # Drizzle Studio (GUI)

# Scripts custom
npm run index-documents     # Index docs in Pinecone
npm run export-sample       # Test export with sample RFP
```

---

## 📚 Ressources

### Documentation

- **Next.js 14** : https://nextjs.org/docs
- **Anthropic Claude** : https://docs.anthropic.com
- **OpenAI** : https://platform.openai.com/docs
- **Pinecone** : https://docs.pinecone.io
- **Neon** : https://neon.tech/docs
- **Drizzle ORM** : https://orm.drizzle.team
- **shadcn/ui** : https://ui.shadcn.com
- **Tiptap** : https://tiptap.dev

### Exemples de Code

- **RAG avec Claude** : https://github.com/anthropics/anthropic-cookbook/tree/main/skills/retrieval_augmented_generation
- **Next.js + Pinecone** : https://github.com/pinecone-io/semantic-search-nextjs
- **Document parsing** : https://github.com/mozilla/pdf.js/tree/master/examples

---

## 💬 Support

**Questions ? Problèmes ?**
- 💬 Slack : #rfp-assistant-dev
- 📧 Email : dev-team@company.com
- 📝 GitHub Issues : https://github.com/.../issues

---

**Bonne chance avec le développement ! 🚀**
