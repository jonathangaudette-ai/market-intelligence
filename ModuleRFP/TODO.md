# TODO - Module RFP Response Assistant

**Dernière mise à jour :** 2025-11-10
**Statut :** Ready for development

---

## 📋 Vue d'ensemble

Ce fichier contient toutes les tâches de développement du Module RFP Response Assistant, organisées en sprints avec priorités, story points, et dépendances.

### Légende

**Priorité :**
- 🔴 **P0** - Bloquant, requis pour MVP
- 🟡 **P1** - Important, Phase 2
- 🟢 **P2** - Nice to have, Phase 3

**Story Points :**
- **1 SP** = ~0.5 jour (tâche simple, bien définie)
- **2 SP** = ~1 jour (tâche moyenne)
- **3 SP** = ~1.5 jours (tâche complexe)
- **5 SP** = ~2-3 jours (epic, nécessite découpage)
- **8 SP** = ~1 semaine (très complexe, doit être découpé)

**Statut :**
- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ⏸️ Blocked
- ❌ Cancelled

---

## 🎯 Sprint 0 : Setup & Infrastructure (Semaine 1)

### Infrastructure & Setup

#### TASK-001 : Setup projet Next.js
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** Aucune

**Description:**
Initialiser le projet Next.js 14 avec App Router et TypeScript.

**Critères d'acceptation:**
- [ ] Projet Next.js 14+ créé
- [ ] TypeScript configuré (strict mode)
- [ ] App Router utilisé
- [ ] ESLint + Prettier configurés
- [ ] Git repository initialisé
- [ ] .env.example créé avec toutes les variables

**Fichiers à créer:**
```
/app
  /layout.tsx
  /page.tsx
/lib
  /config.ts
  /types.ts
.env.example
.eslintrc.json
.prettierrc
tsconfig.json
next.config.js
```

**Commandes:**
```bash
npx create-next-app@latest rfp-assistant --typescript --tailwind --app --eslint
cd rfp-assistant
npm install --save-dev prettier eslint-config-prettier
```

---

#### TASK-002 : Setup Neon PostgreSQL
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001

**Description:**
Configurer la base de données Neon PostgreSQL et l'ORM.

**Critères d'acceptation:**
- [ ] Compte Neon créé
- [ ] Database créée (dev + staging)
- [ ] Drizzle ORM installé et configuré
- [ ] Connexion testée
- [ ] Schéma initial appliqué

**Commandes:**
```bash
npm install drizzle-orm @neondatabase/serverless
npm install --save-dev drizzle-kit
# Appliquer le schéma
psql $DATABASE_URL < schema.sql
# Ou avec Drizzle
npx drizzle-kit push:pg
```

**Variables d'environnement:**
```
DATABASE_URL=postgresql://...@ep-xyz.neon.tech/rfp_db
```

---

#### TASK-003 : Setup Pinecone Vector DB
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001

**Description:**
Configurer Pinecone pour la recherche vectorielle (RAG).

**Critères d'acceptation:**
- [ ] Compte Pinecone créé
- [ ] Index créé (dimensions: 1536 pour OpenAI embeddings)
- [ ] Client Pinecone configuré
- [ ] Test d'insertion/recherche réussi

**Commandes:**
```bash
npm install @pinecone-database/pinecone
```

**Configuration index:**
```typescript
// Create index with 1536 dimensions (OpenAI text-embedding-3-large)
{
  name: 'rfp-library',
  dimension: 1536,
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
}
```

---

#### TASK-004 : Setup AI APIs (Claude + OpenAI)
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001

**Description:**
Configurer les clients API pour Claude Sonnet 4.5 et GPT-4o.

**Critères d'acceptation:**
- [ ] Compte Anthropic créé + API key
- [ ] Compte OpenAI créé + API key
- [ ] Clients configurés avec rate limiting
- [ ] Test d'appel réussi pour chaque API

**Commandes:**
```bash
npm install @anthropic-ai/sdk openai
```

**Configuration:**
```typescript
// lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// lib/ai/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Variables d'environnement:**
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

---

#### TASK-005 : Setup Authentication
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001, TASK-002

**Description:**
Implémenter l'authentification avec NextAuth.js ou Clerk.

**Critères d'acceptation:**
- [ ] NextAuth.js ou Clerk configuré
- [ ] Login/Logout fonctionnel
- [ ] Session management
- [ ] Protected routes (middleware)
- [ ] User table dans DB

**Commandes (NextAuth):**
```bash
npm install next-auth @auth/drizzle-adapter
```

**Routes protégées:**
- `/dashboard/*` - Require authentication
- `/api/*` - Require authentication (except /api/auth)

---

#### TASK-006 : Setup UI Components (shadcn/ui)
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001

**Description:**
Installer et configurer shadcn/ui pour les composants UI.

**Critères d'acceptation:**
- [ ] shadcn/ui CLI configuré
- [ ] Components de base installés (Button, Input, Card, etc.)
- [ ] Thème configuré (dark mode support)
- [ ] Typography system défini

**Commandes:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog tabs table
```

---

## 🚀 Sprint 1 : Upload & Parsing de RFPs (Semaines 2-3)

### US-RFP-001 : Upload d'un RFP

#### TASK-101 : API endpoint pour upload de fichiers
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001, TASK-002

**Description:**
Créer l'endpoint API POST /api/rfps/upload pour gérer l'upload de fichiers RFP.

**Critères d'acceptation:**
- [ ] Endpoint POST /api/v1/rfp/rfps créé
- [ ] Validation des fichiers (format, taille)
- [ ] Upload vers Vercel Blob ou R2
- [ ] Insertion dans DB (table rfps)
- [ ] Tests unitaires (success + error cases)

**Fichier:**
```typescript
// app/api/v1/rfp/rfps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validation
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (file.size > 50_000_000) return NextResponse.json({ error: 'File too large' }, { status: 400 });

    // Upload
    const { url } = await put(file.name, file, { access: 'public' });

    // Insert DB
    const rfp = await db.rfps.insert({
      title: formData.get('title'),
      client_name: formData.get('client_name'),
      original_file_url: url,
      parsing_status: 'pending',
      owner_id: session.user.id
    });

    // Trigger parsing job (async)
    await triggerParsingJob(rfp.id);

    return NextResponse.json({ id: rfp.id, status: 'pending' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Tests à écrire:**
- [ ] Upload successful PDF
- [ ] Upload successful DOCX
- [ ] Reject file too large
- [ ] Reject unsupported format
- [ ] Reject unauthenticated request

---

#### TASK-102 : UI pour upload de RFP
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-101

**Description:**
Créer l'interface utilisateur pour uploader un RFP.

**Critères d'acceptation:**
- [ ] Page /dashboard/rfps/new créée
- [ ] Drag & drop zone pour fichiers
- [ ] Formulaire avec champs (title, client_name, deadline, etc.)
- [ ] Preview du fichier avant upload
- [ ] Barre de progression pendant upload
- [ ] Redirect vers RFP detail page après success

**Composants à créer:**
```
/app/dashboard/rfps/new/page.tsx
/components/rfp/upload-form.tsx
/components/rfp/file-dropzone.tsx
```

**UI Mockup:**
```
┌────────────────────────────────────────────┐
│  New RFP                          [Cancel] │
├────────────────────────────────────────────┤
│                                            │
│  Title *                                   │
│  ┌────────────────────────────────────┐   │
│  │ Enterprise SaaS Platform RFP       │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Client Name *                             │
│  ┌────────────────────────────────────┐   │
│  │ Acme Corporation                   │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Upload RFP Document *                     │
│  ┌────────────────────────────────────┐   │
│  │   📄 Drag & drop file here or      │   │
│  │   [Click to browse]                │   │
│  │   Supported: PDF, DOCX, XLSX       │   │
│  │   Max size: 50 MB                  │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Deadline (optional)                       │
│  ┌────────────────┐                        │
│  │ 2025-12-31     │                        │
│  └────────────────┘                        │
│                                            │
│            [Upload & Parse RFP]            │
└────────────────────────────────────────────┘
```

---

### US-RFP-002 : Extraction automatique des questions

#### TASK-103 : Service de parsing PDF/DOCX
- **Priorité:** 🔴 P0
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-001

**Description:**
Créer le service de parsing pour extraire le texte brut des fichiers PDF et DOCX.

**Critères d'acceptation:**
- [ ] Parser PDF avec PyMuPDF ou pdf-parse
- [ ] Parser DOCX avec python-docx ou mammoth.js
- [ ] Parser XLSX avec openpyxl ou xlsx
- [ ] Extraction du texte brut + structure (sections)
- [ ] OCR pour PDFs scannés (Tesseract)
- [ ] Tests avec différents formats de RFP

**Fichiers:**
```typescript
// lib/parser/pdf-parser.ts
export async function parsePDF(fileUrl: string): Promise<ParsedDocument> {
  // Implementation
}

// lib/parser/docx-parser.ts
export async function parseDOCX(fileUrl: string): Promise<ParsedDocument> {
  // Implementation
}

// lib/parser/parser-service.ts
export async function parseDocument(rfp_id: string, file_url: string, file_type: string) {
  let text: string;

  if (file_type === 'pdf') {
    text = await parsePDF(file_url);
  } else if (file_type === 'docx') {
    text = await parseDOCX(file_url);
  }

  // Next: extract questions with GPT-4o
  const questions = await extractQuestions(text);

  // Save to DB
  await saveQuestions(rfp_id, questions);
}
```

**Dépendances npm:**
```bash
npm install pdf-parse mammoth xlsx
```

---

#### TASK-104 : Extraction de questions avec GPT-4o
- **Priorité:** 🔴 P0
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-103, TASK-004

**Description:**
Utiliser GPT-4o pour extraire les questions du texte parsé avec JSON mode.

**Critères d'acceptation:**
- [ ] Prompt optimisé pour extraction de questions
- [ ] JSON mode activé (structured output)
- [ ] Détection de question_number, question_text, section
- [ ] Détection de is_mandatory, char_limit
- [ ] Détection du type de question
- [ ] Gestion des erreurs API
- [ ] Rate limiting géré

**Fichier:**
```typescript
// lib/parser/question-extractor.ts
import { openai } from '@/lib/ai/openai';

export async function extractQuestions(text: string): Promise<Question[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an expert at extracting questions from RFP documents. Extract all questions with their metadata in JSON format.'
      },
      {
        role: 'user',
        content: `Extract all questions from this RFP:\n\n${text}\n\nReturn JSON: { "questions": [{ "question_number": "1.1", "question_text": "...", "section": "...", "is_mandatory": true, "char_limit": 500 }] }`
      }
    ],
  });

  const result = JSON.parse(completion.choices[0].message.content);
  return result.questions;
}
```

**Tests:**
- [ ] Test avec RFP sample (50+ questions)
- [ ] Vérifier précision >95%
- [ ] Test avec différentes structures de RFP
- [ ] Test gestion d'erreur API

---

#### TASK-105 : Background job pour parsing
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-103, TASK-104

**Description:**
Implémenter un système de jobs asynchrones pour le parsing (Inngest ou BullMQ).

**Critères d'acceptation:**
- [ ] Inngest ou BullMQ configuré
- [ ] Job "parse-rfp" créé
- [ ] Retry logic (3 attempts avec exponential backoff)
- [ ] Logging des étapes
- [ ] Update du statut dans DB
- [ ] Notification de completion (WebSocket ou polling)

**Fichier:**
```typescript
// inngest/functions/parse-rfp.ts
import { inngest } from '@/lib/inngest/client';
import { parseDocument } from '@/lib/parser/parser-service';

export const parseRFP = inngest.createFunction(
  { id: 'parse-rfp' },
  { event: 'rfp/parse' },
  async ({ event, step }) => {
    const { rfp_id, file_url, file_type } = event.data;

    await step.run('parse-document', async () => {
      await parseDocument(rfp_id, file_url, file_type);
    });

    await step.run('update-status', async () => {
      await db.rfps.update(rfp_id, { parsing_status: 'completed' });
    });

    await step.run('notify-user', async () => {
      // Send notification
    });
  }
);
```

**Dépendances:**
```bash
npm install inngest
```

---

### US-RFP-003 : Catégorisation des questions

#### TASK-106 : Auto-catégorisation avec Claude Sonnet 4.5
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-104

**Description:**
Catégoriser automatiquement chaque question extraite.

**Critères d'acceptation:**
- [ ] Catégorisation avec Claude Sonnet 4.5
- [ ] Catégories définies: company, product, pricing, technical, security, support, roadmap
- [ ] Subcategories optionnelles
- [ ] Tags automatiques
- [ ] Confidence score
- [ ] Batch processing (10 questions à la fois)

**Fichier:**
```typescript
// lib/categorization/categorize.ts
import { anthropic } from '@/lib/ai/claude';

export async function categorizeQuestion(question_text: string): Promise<CategoryResult> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Categorize this RFP question:\n"${question_text}"\n\nReturn JSON: { "category": "company|product|pricing|technical|security|support|roadmap", "subcategory": "...", "tags": ["..."], "confidence": 0.95 }`
    }]
  });

  return JSON.parse(message.content[0].text);
}

export async function categorizeBatch(questions: Question[]): Promise<CategoryResult[]> {
  // Process 10 at a time
  const batches = chunk(questions, 10);
  const results = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(q => categorizeQuestion(q.question_text))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## 🤖 Sprint 2 : Génération de Réponses (RAG) (Semaines 4-5)

### US-RFP-004 : Génération automatique de réponses

#### TASK-201 : Setup du RAG pipeline
- **Priorité:** 🔴 P0
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-003, TASK-004

**Description:**
Implémenter le pipeline complet RAG (Retrieval Augmented Generation).

**Critères d'acceptation:**
- [ ] Embedding de questions avec OpenAI
- [ ] Vector search dans Pinecone
- [ ] Retrieval des top-K documents pertinents
- [ ] Prompt construction pour Claude Sonnet 4.5
- [ ] Génération de réponse
- [ ] Post-processing (formatting, char limit check)
- [ ] Tests end-to-end

**Fichier:**
```typescript
// lib/rag/generate-response.ts
import { openai } from '@/lib/ai/openai';
import { anthropic } from '@/lib/ai/claude';
import { pinecone } from '@/lib/pinecone/client';

export async function generateResponse(question_id: string): Promise<GeneratedResponse> {
  // 1. Get question from DB
  const question = await db.questions.findById(question_id);

  // 2. Embed question
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: question.question_text,
  });

  // 3. Vector search
  const index = pinecone.Index('rfp-library');
  const queryResponse = await index.query({
    vector: embedding.data[0].embedding,
    topK: 5,
    includeMetadata: true,
  });

  // 4. Retrieve documents
  const documents = queryResponse.matches.map(m => m.metadata.text);

  // 5. Get competitive context
  const battlecards = await getRelevantBattlecards(question.rfp_id);

  // 6. Construct prompt
  const prompt = constructPrompt(question, documents, battlecards);

  // 7. Generate with Claude Sonnet 4.5
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const response_text = message.content[0].text;

  // 8. Post-processing
  const formatted = formatResponse(response_text, question.char_limit);

  // 9. Save to DB
  const response = await db.responses.insert({
    question_id,
    response_text: formatted,
    generation_method: 'ai_generated',
    confidence_score: calculateConfidence(queryResponse),
    sources_used: documents,
  });

  return response;
}
```

---

#### TASK-202 : API endpoint pour génération de réponse
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-201

**Description:**
Créer l'endpoint POST /api/questions/:id/generate-response.

**Critères d'acceptation:**
- [ ] Endpoint créé
- [ ] Validation de la requête
- [ ] Appel au RAG pipeline
- [ ] Streaming de la réponse (optionnel)
- [ ] Gestion d'erreurs
- [ ] Tests

**Fichier:**
```typescript
// app/api/v1/rfp/questions/[id]/generate-response/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await generateResponse(params.id);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

#### TASK-203 : Indexation de documents dans Pinecone
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-003

**Description:**
Créer un script pour indexer tous les documents existants dans Pinecone.

**Critères d'acceptation:**
- [ ] Script d'indexation batch
- [ ] Indexation de product docs
- [ ] Indexation de company info
- [ ] Indexation de past RFP responses
- [ ] Indexation de battlecards
- [ ] Metadata bien structurée
- [ ] Idempotent (re-run safe)

**Fichier:**
```typescript
// scripts/index-documents.ts
import { openai } from '@/lib/ai/openai';
import { pinecone } from '@/lib/pinecone/client';

async function indexDocuments() {
  const documents = await loadAllDocuments();
  const index = pinecone.Index('rfp-library');

  // Batch embedding
  const batches = chunk(documents, 100);

  for (const batch of batches) {
    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: batch.map(d => d.text),
    });

    const vectors = embeddings.data.map((emb, i) => ({
      id: batch[i].id,
      values: emb.embedding,
      metadata: {
        text: batch[i].text,
        type: batch[i].type,
        category: batch[i].category,
        source: batch[i].source,
      },
    }));

    await index.upsert(vectors);
  }
}

indexDocuments();
```

**Commande:**
```bash
npx tsx scripts/index-documents.ts
```

---

## 💻 Sprint 3 : Interface de Review & Édition (Semaine 6)

### US-RFP-007 : Interface de review des réponses

#### TASK-301 : Page RFP Detail avec liste de questions
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-102

**Description:**
Créer la page principale pour visualiser et éditer les questions d'un RFP.

**Critères d'acceptation:**
- [ ] Page /dashboard/rfps/[id] créée
- [ ] Liste des questions avec statuts
- [ ] Filtres (catégorie, statut, assignation)
- [ ] Navigation entre questions
- [ ] Progress bar (% completion)
- [ ] Bouton "Generate All" pour batch generation

**UI Components:**
```
/app/dashboard/rfps/[id]/page.tsx
/components/rfp/question-list.tsx
/components/rfp/question-filters.tsx
/components/rfp/progress-bar.tsx
```

---

#### TASK-302 : Éditeur de réponse (Rich Text)
- **Priorité:** 🔴 P0
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-301

**Description:**
Implémenter l'éditeur de texte riche pour éditer les réponses.

**Critères d'acceptation:**
- [ ] Tiptap ou Lexical intégré
- [ ] Formatting (bold, italic, bullets, etc.)
- [ ] Character counter live
- [ ] Auto-save (toutes les 30s)
- [ ] Undo/Redo
- [ ] Paste sans formatage (option)
- [ ] Shortcuts clavier

**Dépendances:**
```bash
npm install @tiptap/react @tiptap/starter-kit
```

**Component:**
```typescript
// components/editor/response-editor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function ResponseEditor({ question_id, initial_content, char_limit }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initial_content,
    onUpdate: ({ editor }) => {
      // Auto-save
      debouncedSave(editor.getHTML());
    },
  });

  return (
    <div>
      <EditorContent editor={editor} />
      <div>Characters: {editor.getText().length} / {char_limit}</div>
    </div>
  );
}
```

---

#### TASK-303 : Panel de suggestions AI
- **Priorité:** 🔴 P0
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-302, TASK-202

**Description:**
Créer le panel latéral avec suggestions AI (similar responses, competitive positioning).

**Critères d'acceptation:**
- [ ] Panel coulissant (right sidebar)
- [ ] Section "AI Generated Response"
- [ ] Section "Similar Responses" (from library)
- [ ] Section "Competitive Positioning"
- [ ] Section "Sources Used"
- [ ] Boutons "Use This" pour copier une suggestion
- [ ] Regenerate button

**Component:**
```typescript
// components/rfp/suggestions-panel.tsx
export function SuggestionsPanel({ question_id }) {
  const { data: suggestions } = useSWR(
    `/api/v1/rfp/questions/${question_id}/suggestions`,
    fetcher
  );

  return (
    <div className="w-80 border-l p-4">
      <Tabs>
        <Tab label="AI Response">
          <AIResponse suggestion={suggestions.ai_response} />
        </Tab>
        <Tab label="Similar">
          <SimilarResponses responses={suggestions.similar} />
        </Tab>
        <Tab label="Positioning">
          <CompetitivePositioning hints={suggestions.positioning} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

---

## 📤 Sprint 4 : Export & Finition MVP (Semaine 7)

### US-RFP-010 : Export vers Word/PDF

#### TASK-401 : Service d'export vers DOCX
- **Priorité:** 🔴 P0
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-302

**Description:**
Créer le service d'export des réponses vers format Word (.docx).

**Critères d'acceptation:**
- [ ] Génération DOCX avec python-docx ou docxtemplater
- [ ] Formatage préservé (bullets, bold, etc.)
- [ ] Structure du RFP respectée (sections, numérotation)
- [ ] Branding (logo, header/footer)
- [ ] Table des matières automatique
- [ ] Tests avec différents templates

**Dépendances:**
```bash
npm install docxtemplater pizzip
```

**Fichier:**
```typescript
// lib/export/docx-exporter.ts
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export async function exportToDocx(rfp_id: string): Promise<Buffer> {
  const rfp = await db.rfps.findById(rfp_id);
  const questions = await db.questions.findByRfp(rfp_id);

  // Load template
  const template = await loadTemplate('default');
  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip);

  // Set data
  doc.setData({
    title: rfp.title,
    client_name: rfp.client_name,
    questions: questions.map(q => ({
      number: q.question_number,
      text: q.question_text,
      response: q.current_response?.response_text,
    })),
  });

  doc.render();

  return doc.getZip().generate({ type: 'nodebuffer' });
}
```

---

#### TASK-402 : API endpoint pour export
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-401

**Description:**
Créer l'endpoint POST /api/rfps/:id/export.

**Critères d'acceptation:**
- [ ] Endpoint créé
- [ ] Support format DOCX et PDF
- [ ] Upload du fichier généré vers storage
- [ ] Historique des exports dans DB
- [ ] Download URL retournée

**Fichier:**
```typescript
// app/api/v1/rfp/rfps/[id]/export/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { format } = await request.json();

  let buffer: Buffer;
  if (format === 'docx') {
    buffer = await exportToDocx(params.id);
  } else if (format === 'pdf') {
    buffer = await exportToPdf(params.id);
  }

  // Upload to storage
  const { url } = await put(`exports/${params.id}.${format}`, buffer, {
    access: 'public',
  });

  // Save to DB
  await db.exports.insert({
    rfp_id: params.id,
    format,
    file_url: url,
    exported_by: session.user.id,
  });

  return NextResponse.json({ url });
}
```

---

#### TASK-403 : UI pour export
- **Priorité:** 🔴 P0
- **Story Points:** 2 SP
- **Statut:** ⬜ Todo
- **Assigné à:** [À assigner]
- **Dépendances:** TASK-402

**Description:**
Créer l'interface pour déclencher et gérer les exports.

**Critères d'acceptation:**
- [ ] Bouton "Export" dans RFP detail page
- [ ] Dialog avec choix de format (DOCX/PDF)
- [ ] Template selector
- [ ] Branding options (logo, colors)
- [ ] Progress indicator
- [ ] Download link après génération
- [ ] Historique des exports

---

## 🎯 Sprint 5 : Polish & Testing (Semaine 8)

#### TASK-501 : Tests E2E avec Playwright
- **Priorité:** 🟡 P1
- **Story Points:** 5 SP
- **Statut:** ⬜ Todo

**Description:**
Écrire les tests end-to-end pour les flows principaux.

**Critères d'acceptation:**
- [ ] Test: Upload RFP → Parsing → Questions extraites
- [ ] Test: Generate response → Edit → Save
- [ ] Test: Export to DOCX
- [ ] Test: Authentication flow
- [ ] CI configuré (GitHub Actions)

---

#### TASK-502 : Documentation utilisateur
- **Priorité:** 🟡 P1
- **Story Points:** 3 SP
- **Statut:** ⬜ Todo

**Description:**
Créer la documentation utilisateur (user guide).

**Critères d'acceptation:**
- [ ] Guide "Getting Started"
- [ ] Screenshots annotés
- [ ] FAQ
- [ ] Video walkthrough (optionnel)
- [ ] Hébergé sur site ou Notion

---

## 📊 Résumé des Story Points

| Sprint | Story Points | Estimation |
|--------|--------------|------------|
| Sprint 0 (Setup) | 15 SP | 1 semaine |
| Sprint 1 (Parsing) | 18 SP | 2 semaines |
| Sprint 2 (RAG) | 15 SP | 2 semaines |
| Sprint 3 (UI) | 14 SP | 1 semaine |
| Sprint 4 (Export) | 11 SP | 1 semaine |
| Sprint 5 (Polish) | 8 SP | 1 semaine |
| **Total MVP** | **81 SP** | **8 semaines** |

---

## 🚧 Tâches bloquées / Questions ouvertes

### Questions à résoudre

1. **Q001: Backend language choice**
   - Node.js (TypeScript) ou Python?
   - Recommandation: Node.js pour cohérence avec Next.js
   - Decision: [À décider]

2. **Q002: Auth provider**
   - NextAuth.js ou Clerk?
   - Recommandation: Clerk (meilleur DX, moins de setup)
   - Decision: [À décider]

3. **Q003: Background jobs**
   - Inngest ou BullMQ + Redis?
   - Recommandation: Inngest (serverless-friendly)
   - Decision: [À décider]

4. **Q004: File storage**
   - Vercel Blob ou Cloudflare R2?
   - Recommandation: Vercel Blob (si hébergé sur Vercel)
   - Decision: [À décider]

---

## 📝 Notes de développement

### Best Practices

1. **Commits**
   - Format: `feat(module): description` ou `fix(module): description`
   - Exemple: `feat(parser): add PDF parsing with OCR support`

2. **Branches**
   - `main` - Production
   - `dev` - Development
   - `feat/TASK-XXX-description` - Feature branches

3. **Code Review**
   - Minimum 1 reviewer avant merge
   - Tests doivent passer
   - Linter doit passer

4. **Documentation**
   - JSDoc pour fonctions complexes
   - README dans chaque dossier lib/
   - API endpoints documentés dans api-endpoints.md

---

## 🔄 Changelog

**2025-11-10** - Version initiale
- Setup TODO structure
- Defined Sprint 0-5
- 81 Story Points total

---

**Maintenu par :** Équipe RFP Assistant
**Contact :** [Slack #rfp-assistant]
