# Plan d'Implémentation : Système de Récupération Chirurgicale pour RFPs

**Version:** 1.0
**Date:** 2025-01-12
**Approche:** MVP First (15-20h) → Iterate
**Statut:** Prêt pour implémentation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Configuration des Modèles IA](#configuration-des-modèles-ia)
3. [Phase 1 : Extensions Base de Données](#phase-1--extensions-base-de-données)
4. [Phase 2 : Services Backend](#phase-2--services-backend)
5. [Phase 3 : API Routes](#phase-3--api-routes)
6. [Phase 4 : UI Components](#phase-4--ui-components)
7. [Phase 5 : Optimisations Performance](#phase-5--optimisations-performance)
8. [Phase 6 : Pinecone Metadata Enrichment](#phase-6--pinecone-metadata-enrichment)
9. [Phase 7 : Testing](#phase-7--testing)
10. [Ordre d'Implémentation](#ordre-dimplémentation)
11. [Métriques de Succès](#métriques-de-succès)

---

## Vue d'Ensemble

### Objectif
Implémenter un système MVP permettant de sélectionner chirurgicalement des sources de contenu (RFPs passés) avec configuration au niveau RFP et adaptation contextuelle intelligente.

### Problème Résolu
Actuellement, la génération de réponses RFP utilise un RAG générique sans pouvoir cibler des sources spécifiques. Ce système permet de:
- Importer des RFPs historiques comme sources
- Auto-configurer les meilleures sources par type de contenu
- Générer des réponses adaptées au contexte du mandat
- Réutiliser intelligemment le contenu gagnant

### Approche MVP vs Full

| Feature | MVP (20h) | Full (35h) |
|---------|-----------|------------|
| **Import historique** | ✅ Simplifié (auto-accept >= 90%) | ✅ + UI révision complète |
| **Configuration** | ✅ Smart defaults (1-click) | ✅ + Configuration manuelle avancée |
| **Source selection** | ✅ Top 3 suggestions | ✅ + Dropdown avec 10+ options |
| **Retrieval** | ✅ Two-tier (source + adaptation) | ✅ Three-tier (+ RAG général) |
| **Content-type UI** | ✅ Auto-classification | ✅ + Configuration par type |
| **Bibliothèque** | ✅ Liste simple | ✅ + Filtres avancés + Analytics |
| **Caching** | ✅ In-memory LRU | ✅ + Redis multi-layer |
| **Background jobs** | ❌ Synchrone | ✅ Async avec Inngest/BullMQ |

---

## Configuration des Modèles IA

### GPT-5 (OpenAI) - Extraction Structurée

**Utilisé pour:** Extraction de questions RFP, parsing documents, matching

#### Configuration par Use Case

```typescript
// src/lib/constants/ai-models.ts

export const GPT5_CONFIGS = {
  // Extraction rapide de questions RFP
  extraction: {
    model: 'gpt-5',
    reasoning: { effort: 'minimal' },  // Rapide, excellent pour instruction following
    text: { verbosity: 'low' }         // Réponses concises
  },

  // Parsing de document de réponse historique
  parsing: {
    model: 'gpt-5',
    reasoning: { effort: 'low' },      // Structure extraction
    text: { verbosity: 'medium' }
  },

  // Matching questions ↔ réponses
  matching: {
    model: 'gpt-5',
    reasoning: { effort: 'medium' },   // Raisonnement modéré requis
    text: { verbosity: 'medium' }
  }
};
```

**Pricing:** $1.25/M input, $10/M output (50% moins cher que GPT-4o)

**Important - Paramètres NON supportés:**
```typescript
// ❌ Ne PAS utiliser avec GPT-5
{ model: 'gpt-5', temperature: 0.7 }  // Error!
{ model: 'gpt-5', top_p: 0.9 }        // Error!

// ✅ Utiliser à la place
{ model: 'gpt-5', reasoning: { effort: 'low' } }
{ model: 'gpt-5', text: { verbosity: 'medium' } }
```

#### Fallback Strategy

```typescript
// Si GPT-5 pas disponible, fallback sur GPT-4o
async function callOpenAI(prompt: string, config: GPT5Config) {
  try {
    return await openai.responses.create({
      model: 'gpt-5',
      ...config,
      input: prompt
    });
  } catch (error) {
    if (error.code === 'model_not_found') {
      console.warn('GPT-5 unavailable, falling back to GPT-4o');
      // Use GPT-4o with Chat Completions API
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }]
      });
    }
    throw error;
  }
}
```

### Claude Sonnet 4.5 / Haiku 4.5 (Anthropic) - Génération & Classification

**Utilisé pour:** Classification content-type, génération réponses RFP, adaptation contextuelle

#### Tiered Model Strategy

```typescript
// src/lib/rfp/content-type-detector.ts

async function detectQuestionContentTypes(questions: Question[]) {
  // First pass with Haiku (fast + cheap)
  const firstPass = await batchClassifyWithHaiku(questions);

  // Retry low confidence with Sonnet
  const lowConfidence = firstPass.filter(q => q.confidence < 0.85);
  const refined = await batchClassifyWithSonnet(lowConfidence);

  return [
    ...firstPass.filter(q => q.confidence >= 0.85),
    ...refined
  ];
}
```

**Avantages:**
- Coûts réduits de 60-70% vs Sonnet uniquement
- Performance similaire (85% des cas résolus avec Haiku)
- Sonnet utilisé seulement pour cas complexes

#### Génération de Réponses

```typescript
// Utilise settings company (Sonnet ou Haiku selon préférence)
const model = getAIModelOrDefault(company.settings);

await anthropic.messages.create({
  model: model, // 'claude-sonnet-4-5-20250929' ou 'claude-4-5-haiku-20250514'
  messages: [...]
});
```

### OpenAI Embeddings

**Modèle:** `text-embedding-3-small` (1536 dimensions)
**Usage:** Semantic similarity via Pinecone
**Optimisation:** Deduplication cache (évite ~40% d'appels répétés)

---

## Phase 1 : Extensions Base de Données

**Durée estimée:** 2 heures

### 1.1 Nouvelle Table : rfp_source_preferences

```sql
-- Migration: 001_add_rfp_source_preferences.sql

CREATE TABLE rfp_source_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,

  -- Smart defaults (AI-generated)
  default_source_strategy VARCHAR(20) DEFAULT 'hybrid',
  default_adaptation_level VARCHAR(20) DEFAULT 'contextual',

  -- Simplified: top 3 sources par content-type (pas 12 configs manuelles)
  suggested_sources JSONB DEFAULT '{}',
  -- Format: { "project-methodology": ["rfp-id-1", "rfp-id-2", "rfp-id-3"] }

  -- Global mandate context
  global_mandate_context TEXT,

  -- RAG filters (simplified)
  prefer_won_rfps BOOLEAN DEFAULT true,
  min_quality_score INTEGER DEFAULT 70,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(rfp_id)
);

CREATE INDEX idx_rfp_source_prefs_rfp ON rfp_source_preferences(rfp_id);
```

### 1.2 Extensions Table : rfps

```sql
-- Migration: 002_extend_rfps_for_historical.sql

ALTER TABLE rfps ADD COLUMN mode VARCHAR(20) DEFAULT 'active';
-- Values: 'active' (en cours), 'historical' (passé), 'template' (réutilisable)

ALTER TABLE rfps ADD COLUMN is_historical BOOLEAN DEFAULT false;
ALTER TABLE rfps ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE rfps ADD COLUMN submitted_document TEXT; -- S3/Vercel Blob URL
ALTER TABLE rfps ADD COLUMN outcome_notes TEXT;
ALTER TABLE rfps ADD COLUMN quality_score INTEGER; -- 0-100
ALTER TABLE rfps ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE rfps ADD COLUMN last_used_at TIMESTAMP;

-- Index pour queries de bibliothèque
CREATE INDEX idx_rfps_historical ON rfps(company_id, is_historical) WHERE is_historical = true;
CREATE INDEX idx_rfps_quality ON rfps(quality_score DESC) WHERE is_historical = true;
```

### 1.3 Extensions Table : rfp_questions

```sql
-- Migration: 003_extend_rfp_questions_for_content_types.sql

ALTER TABLE rfp_questions ADD COLUMN content_types TEXT[] DEFAULT '{}';
-- Array de types: ['project-methodology', 'technical-solution']

ALTER TABLE rfp_questions ADD COLUMN primary_content_type VARCHAR(100);
-- Type principal pour la question

ALTER TABLE rfp_questions ADD COLUMN detection_confidence FLOAT;
-- Confidence de la classification AI (0.0-1.0)

ALTER TABLE rfp_questions ADD COLUMN selected_source_rfp_id UUID;
-- RFP source sélectionné pour cette question

ALTER TABLE rfp_questions ADD COLUMN adaptation_level VARCHAR(20) DEFAULT 'contextual';
-- 'verbatim', 'light', 'contextual', 'creative'

ALTER TABLE rfp_questions ADD COLUMN applied_from_settings BOOLEAN DEFAULT false;
-- true si settings RFP appliqués automatiquement

-- Index pour queries par content-type
CREATE INDEX idx_rfp_questions_content_type ON rfp_questions(primary_content_type);
```

### 1.4 Extensions Table : rfp_responses

```sql
-- Migration: 004_extend_rfp_responses_for_sources.sql

ALTER TABLE rfp_responses ADD COLUMN source_rfp_ids TEXT[] DEFAULT '{}';
-- Liste des RFP IDs utilisés comme sources

ALTER TABLE rfp_responses ADD COLUMN adaptation_used VARCHAR(20);
-- Niveau d'adaptation utilisé pour générer

-- Index pour analytics
CREATE INDEX idx_rfp_responses_sources ON rfp_responses USING GIN(source_rfp_ids);
```

### 1.5 Types TypeScript

**Fichier:** `src/types/content-types.ts` (nouveau)

```typescript
export type ContentType =
  | 'company-overview'      // Description entreprise
  | 'corporate-info'        // Info corporative (financière, certifications)
  | 'team-structure'        // Structure et organigramme
  | 'company-history'       // Historique et réalisations
  | 'values-culture'        // Valeurs et culture
  | 'product-description'   // Descriptions de produits
  | 'service-offering'      // Offres de services
  | 'project-methodology'   // Méthodologie de projet
  | 'technical-solution'    // Solutions techniques spécifiques
  | 'project-timeline'      // Échéanciers et planification
  | 'pricing-structure';    // Structure de prix

export type AdaptationLevel = 'verbatim' | 'light' | 'contextual' | 'creative';
export type SourceStrategy = 'auto' | 'manual' | 'hybrid';
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
export type RFPMode = 'active' | 'historical' | 'template';

export interface RFPSourcePreferences {
  id: string;
  rfpId: string;
  defaultSourceStrategy: SourceStrategy;
  defaultAdaptationLevel: AdaptationLevel;
  suggestedSources: Record<ContentType, string[]>; // Top 3 per type
  globalMandateContext?: string;
  preferWonRfps: boolean;
  minQualityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentTypeDetection {
  contentTypes: ContentType[];
  primaryContentType: ContentType;
  confidence: number; // 0.0-1.0
}
```

**Fichier:** `src/db/schema.ts` (ajouts)

```typescript
export const rfpSourcePreferences = pgTable('rfp_source_preferences', {
  id: pgUuid('id').defaultRandom().primaryKey(),
  rfpId: pgUuid('rfp_id').notNull().references(() => rfps.id, { onDelete: 'cascade' }),
  defaultSourceStrategy: varchar('default_source_strategy', { length: 20 }).default('hybrid'),
  defaultAdaptationLevel: varchar('default_adaptation_level', { length: 20 }).default('contextual'),
  suggestedSources: jsonb('suggested_sources').default({}),
  globalMandateContext: text('global_mandate_context'),
  preferWonRfps: boolean('prefer_won_rfps').default(true),
  minQualityScore: integer('min_quality_score').default(70),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Ajouts aux tables existantes (dans rfps, rfpQuestions, rfpResponses)
// ... (voir migrations SQL ci-dessus)
```

---

## Phase 2 : Services Backend

**Durée estimée:** 8 heures

### 2.1 Service d'Import Historique

**Fichier:** `src/lib/rfp/historical-import.ts` (nouveau)

```typescript
import { anthropic } from '@/lib/ai/anthropic';
import { openai } from '@/lib/ai/openai';
import { db } from '@/db';
import { rfps, rfpQuestions, rfpResponses } from '@/db/schema';
import { extractPdfText } from './parser/pdf-parser';
import { GPT5_CONFIGS } from '@/lib/constants/ai-models';

export interface HistoricalImportInput {
  rfpPdf: File;
  responsePdf: File;
  metadata: {
    title: string;
    clientName: string;
    industry: string;
    submittedAt: Date;
    result: 'won' | 'lost' | 'pending';
    dealValue?: number;
    outcomeNotes?: string;
  };
  companyId: string;
}

export interface MatchResult {
  question: string;
  response: string;
  section: string;
  confidence: number; // 0.0-1.0
  category?: string;
}

/**
 * Parse submitted response document with GPT-5 (minimal reasoning)
 */
async function parseSubmittedResponse(responseText: string): Promise<any> {
  const result = await openai.responses.create({
    ...GPT5_CONFIGS.parsing,
    input: `Analyze this RFP response document and extract its structure.

Document:
${responseText.substring(0, 50000)}

Return JSON with this structure:
{
  "sections": [
    {
      "sectionTitle": "Project Methodology",
      "content": "Our approach...",
      "possibleQuestions": ["Describe your methodology", "How do you manage projects"]
    }
  ]
}`
  });

  return JSON.parse(result.output_text);
}

/**
 * Match questions to responses using GPT-5 (medium reasoning)
 */
async function matchQuestionsToResponses(
  questions: any[],
  responseStructure: any
): Promise<MatchResult[]> {
  const result = await openai.responses.create({
    ...GPT5_CONFIGS.matching,
    input: `Match each RFP question with the corresponding section in the response.

Questions RFP:
${JSON.stringify(questions, null, 2)}

Response Sections:
${JSON.stringify(responseStructure.sections, null, 2)}

Return JSON:
{
  "matches": [
    {
      "question": "Question text",
      "response": "Extracted response",
      "section": "Section title",
      "confidence": 0.95,
      "category": "Methodology"
    }
  ],
  "unmatchedQuestions": [...],
  "unmatchedSections": [...]
}`
  });

  const parsed = JSON.parse(result.output_text);
  return parsed.matches;
}

/**
 * Main import function - auto-accepts high confidence matches
 */
export async function importHistoricalRfp(
  input: HistoricalImportInput
): Promise<{
  rfpId: string;
  autoAccepted: number;
  needsReview: MatchResult[] | null;
}> {
  // 1. Extract text from both PDFs
  const rfpText = await extractPdfText(input.rfpPdf);
  const responseText = await extractPdfText(input.responsePdf);

  // 2. Parse RFP questions (existing logic)
  const questions = await parseRfpQuestions(rfpText);

  // 3. Parse response structure with GPT-5
  const responseStructure = await parseSubmittedResponse(responseText);

  // 4. Match questions ↔ responses with GPT-5
  const matches = await matchQuestionsToResponses(questions, responseStructure);

  // 5. Separate by confidence threshold
  const autoAccepted = matches.filter(m => m.confidence >= 0.90);
  const needsReview = matches.filter(m => m.confidence < 0.90);

  // 6. Create RFP in DB (mode: historical)
  const [rfp] = await db.insert(rfps).values({
    title: input.metadata.title,
    clientName: input.metadata.clientName,
    clientIndustry: input.metadata.industry,
    companyId: input.companyId,
    mode: 'historical',
    isHistorical: true,
    submittedAt: input.metadata.submittedAt,
    result: input.metadata.result,
    dealValue: input.metadata.dealValue,
    outcomeNotes: input.metadata.outcomeNotes,
    extractedText: rfpText,
    parsingStatus: 'completed'
  }).returning();

  // 7. Save auto-accepted questions + responses
  for (const match of autoAccepted) {
    const [question] = await db.insert(rfpQuestions).values({
      rfpId: rfp.id,
      questionText: match.question,
      category: match.category,
    }).returning();

    await db.insert(rfpResponses).values({
      questionId: question.id,
      responseText: match.response,
      wasAiGenerated: false,
    });
  }

  // 8. Calculate quality score
  const qualityScore = await calculateRfpQualityScore(rfp.id);
  await db.update(rfps)
    .set({ qualityScore })
    .where(eq(rfps.id, rfp.id));

  return {
    rfpId: rfp.id,
    autoAccepted: autoAccepted.length,
    needsReview: needsReview.length > 0 ? needsReview : null
  };
}

/**
 * Calculate quality score based on multiple factors
 */
async function calculateRfpQualityScore(rfpId: string): Promise<number> {
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, rfpId));
  const responses = await db.select().from(rfpResponses)
    .innerJoin(rfpQuestions, eq(rfpQuestions.id, rfpResponses.questionId))
    .where(eq(rfpQuestions.rfpId, rfpId));

  let score = 50; // Base score

  // Outcome bonus
  if (rfp.result === 'won') score += 30;
  else if (rfp.result === 'pending') score += 10;

  // Response quality
  const avgResponseLength = responses.reduce((sum, r) =>
    sum + (r.rfp_responses.responseText?.length || 0), 0) / responses.length;
  if (avgResponseLength > 500) score += 10;
  if (avgResponseLength > 1000) score += 10;

  return Math.min(100, score);
}
```

### 2.2 Service de Classification Content-Type

**Fichier:** `src/lib/rfp/content-type-detector.ts` (nouveau)

```typescript
import { anthropic } from '@/lib/ai/anthropic';
import type { ContentType, ContentTypeDetection } from '@/types/content-types';

const CONTENT_TYPE_DESCRIPTIONS = {
  'company-overview': 'General company description, history, overview',
  'corporate-info': 'Corporate information: financial, certifications, awards',
  'team-structure': 'Team structure, organization chart, key personnel',
  'product-description': 'Product descriptions, features, specifications',
  'service-offering': 'Service offerings, capabilities, deliverables',
  'project-methodology': 'Project management methodology, approach, processes',
  'technical-solution': 'Technical solutions, architecture, implementation',
  'project-timeline': 'Timeline, schedule, milestones, deadlines',
  'pricing-structure': 'Pricing, budget, cost structure, payment terms'
};

/**
 * Detect content types for a single question using Claude
 */
export async function detectQuestionContentType(
  questionText: string,
  model: 'haiku' | 'sonnet' = 'haiku'
): Promise<ContentTypeDetection> {
  const modelId = model === 'haiku'
    ? 'claude-4-5-haiku-20250514'
    : 'claude-sonnet-4-5-20250929';

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Classify this RFP question into one or more content types.

Available types:
${Object.entries(CONTENT_TYPE_DESCRIPTIONS).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Question: "${questionText}"

Return JSON:
{
  "contentTypes": ["type1", "type2"],
  "primaryContentType": "type1",
  "confidence": 0.95
}`
    }]
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Expected text response');

  return JSON.parse(content.text);
}

/**
 * Batch classify with tiered strategy: Haiku first, Sonnet for low-confidence
 */
export async function detectQuestionContentTypes(
  questions: Array<{ id: string; questionText: string }>
): Promise<Array<{ id: string; detection: ContentTypeDetection }>> {
  // First pass with Haiku (fast + cheap)
  const firstPass = await Promise.all(
    questions.map(async (q) => ({
      id: q.id,
      detection: await detectQuestionContentType(q.questionText, 'haiku')
    }))
  );

  // Retry low confidence with Sonnet
  const lowConfidence = firstPass.filter(r => r.detection.confidence < 0.85);
  const refined = await Promise.all(
    lowConfidence.map(async (r) => {
      const question = questions.find(q => q.id === r.id)!;
      return {
        id: r.id,
        detection: await detectQuestionContentType(question.questionText, 'sonnet')
      };
    })
  );

  // Merge results
  const refinedIds = new Set(refined.map(r => r.id));
  return [
    ...firstPass.filter(r => !refinedIds.has(r.id)),
    ...refined
  ];
}
```

### 2.3 Service de Scoring et Ranking

**Fichier:** `src/lib/rfp/source-scoring.ts` (nouveau)

```typescript
import { db } from '@/db';
import { rfps, rfpQuestions, rfpResponses } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { differenceInMonths } from 'date-fns';
import { getEmbedding } from '@/lib/ai/embeddings';
import { pineconeIndex } from '@/lib/rag/pinecone';
import type { ContentType } from '@/types/content-types';

export interface RfpScore {
  rfpId: string;
  rfp: any;
  scores: {
    semantic: number;
    outcome: number;
    recency: number;
    industry: number;
    contentQuality: number;
  };
  totalScore: number;
  preview: string;
}

/**
 * Score and rank past RFPs for a content type
 */
export async function scoreAndRankRfps(
  currentRfp: any,
  contentType: ContentType,
  companyId: string,
  options: {
    onlyWon?: boolean;
    minQualityScore?: number;
    limit?: number;
  } = {}
): Promise<RfpScore[]> {
  // 1. Get past RFPs (filtered)
  let query = db
    .select()
    .from(rfps)
    .where(
      and(
        eq(rfps.companyId, companyId),
        ne(rfps.id, currentRfp.id),
        eq(rfps.isHistorical, true)
      )
    );

  if (options.onlyWon) {
    query = query.where(eq(rfps.result, 'won'));
  }

  const pastRfps = await query;

  // 2. Score each RFP
  const scored: RfpScore[] = [];

  for (const pastRfp of pastRfps) {
    // Semantic similarity via Pinecone
    const semanticScore = await calculateSemanticSimilarity(
      currentRfp,
      pastRfp,
      contentType
    );

    // Outcome score (won > pending > lost)
    const outcomeScore = pastRfp.result === 'won' ? 100 :
                         pastRfp.result === 'pending' ? 50 : 30;

    // Recency score (decay 5% per month)
    const monthsAgo = differenceInMonths(new Date(), new Date(pastRfp.createdAt));
    const recencyScore = Math.max(0, 100 - (monthsAgo * 5));

    // Industry match
    const industryScore = currentRfp.clientIndustry === pastRfp.clientIndustry ? 100 : 50;

    // Content quality (from DB)
    const contentQualityScore = pastRfp.qualityScore || 50;

    // Weighted total score
    const totalScore = (
      semanticScore * 0.40 +      // 40% semantic
      outcomeScore * 0.30 +        // 30% outcome
      recencyScore * 0.15 +        // 15% recency
      industryScore * 0.10 +       // 10% industry
      contentQualityScore * 0.05   // 5% quality
    );

    // Skip if below min quality threshold
    if (options.minQualityScore && totalScore < options.minQualityScore) {
      continue;
    }

    scored.push({
      rfpId: pastRfp.id,
      rfp: pastRfp,
      scores: {
        semantic: semanticScore,
        outcome: outcomeScore,
        recency: recencyScore,
        industry: industryScore,
        contentQuality: contentQualityScore
      },
      totalScore,
      preview: pastRfp.extractedText?.substring(0, 200) || ''
    });
  }

  // 3. Sort by score and limit
  return scored
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, options.limit || 3);
}

/**
 * Calculate semantic similarity using Pinecone
 */
async function calculateSemanticSimilarity(
  currentRfp: any,
  pastRfp: any,
  contentType: ContentType
): Promise<number> {
  // Create query embedding from current RFP
  const queryText = `${currentRfp.title} ${currentRfp.clientName} ${currentRfp.clientIndustry}`;
  const queryEmbedding = await getEmbedding(queryText);

  // Query Pinecone in past RFP's namespace
  const results = await pineconeIndex.namespace('rfp-library').query({
    vector: queryEmbedding,
    filter: {
      rfpId: pastRfp.id,
      contentType: contentType
    },
    topK: 5,
    includeMetadata: true
  });

  if (results.matches.length === 0) return 0;

  // Average similarity score (Pinecone returns 0-1, convert to 0-100)
  const avgScore = results.matches.reduce((sum, match) => sum + match.score, 0)
                   / results.matches.length;

  return avgScore * 100;
}
```

### 2.4 Service Smart Defaults

**Fichier:** `src/lib/rfp/smart-defaults.ts` (nouveau)

```typescript
import { db } from '@/db';
import { rfps, rfpQuestions, rfpSourcePreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { detectQuestionContentTypes } from './content-type-detector';
import { scoreAndRankRfps } from './source-scoring';
import type { ContentType } from '@/types/content-types';

export interface SmartDefaultsResult {
  suggestedSources: Record<ContentType, string[]>;
  questionsClassified: number;
  averageConfidence: number;
}

/**
 * Generate optimal configuration automatically using AI
 */
export async function generateSmartDefaults(
  rfpId: string
): Promise<SmartDefaultsResult> {
  // 1. Get RFP and questions
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, rfpId));
  const questions = await db.select().from(rfpQuestions).where(eq(rfpQuestions.rfpId, rfpId));

  // 2. Detect content types for all questions
  const classifications = await detectQuestionContentTypes(
    questions.map(q => ({ id: q.id, questionText: q.questionText }))
  );

  // 3. Update questions with classifications
  await Promise.all(classifications.map(async ({ id, detection }) => {
    await db.update(rfpQuestions)
      .set({
        contentTypes: detection.contentTypes,
        primaryContentType: detection.primaryContentType,
        detectionConfidence: detection.confidence,
        appliedFromSettings: true
      })
      .where(eq(rfpQuestions.id, id));
  }));

  // 4. Group by primary content type
  const byType: Record<string, string[]> = {};
  for (const { detection } of classifications) {
    if (!byType[detection.primaryContentType]) {
      byType[detection.primaryContentType] = [];
    }
  }

  // 5. For each type, find top 3 RFP sources
  const suggestedSources: Record<string, string[]> = {};

  for (const contentType of Object.keys(byType) as ContentType[]) {
    const topSources = await scoreAndRankRfps(
      rfp,
      contentType,
      rfp.companyId,
      { onlyWon: true, limit: 3 }
    );

    suggestedSources[contentType] = topSources.map(s => s.rfpId);
  }

  // 6. Save preferences
  await db.insert(rfpSourcePreferences).values({
    rfpId,
    suggestedSources,
    defaultSourceStrategy: 'hybrid',
    preferWonRfps: true,
    minQualityScore: 70
  }).onConflictDoUpdate({
    target: rfpSourcePreferences.rfpId,
    set: { suggestedSources, updatedAt: new Date() }
  });

  // 7. Calculate average confidence
  const avgConfidence = classifications.reduce((sum, c) =>
    sum + c.detection.confidence, 0) / classifications.length;

  return {
    suggestedSources,
    questionsClassified: questions.length,
    averageConfidence: avgConfidence
  };
}
```

---

## Phase 3 : API Routes

**Durée estimée:** 4 heures

### 3.1 Import Historique

**Fichier:** `src/app/api/companies/[slug]/rfps/import-historical/route.ts` (nouveau)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { importHistoricalRfp } from '@/lib/rfp/historical-import';

export const maxDuration = 600; // 10 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Auth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const rfpPdf = formData.get('rfpPdf') as File;
    const responsePdf = formData.get('responsePdf') as File;
    const metadataStr = formData.get('metadata') as string;
    const metadata = JSON.parse(metadataStr);

    // Import
    const result = await importHistoricalRfp({
      rfpPdf,
      responsePdf,
      metadata,
      companyId: companyContext.company.id
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Import Historical Error]', error);
    return NextResponse.json(
      { error: 'Failed to import historical RFP', details: error.message },
      { status: 500 }
    );
  }
}
```

### 3.2 Smart Configuration

**Fichier:** `src/app/api/companies/[slug]/rfps/[id]/smart-configure/route.ts` (nouveau)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { generateSmartDefaults } from '@/lib/rfp/smart-defaults';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // Auth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    // Generate smart defaults
    const result = await generateSmartDefaults(rfpId);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Smart Configure Error]', error);
    return NextResponse.json(
      { error: 'Failed to generate smart configuration' },
      { status: 500 }
    );
  }
}
```

### 3.3 Suggestions de Sources

**Fichier:** `src/app/api/companies/[slug]/rfps/[id]/suggest-sources/route.ts` (nouveau)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { scoreAndRankRfps } from '@/lib/rfp/source-scoring';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

// In-memory cache (1 hour TTL)
const suggestionsCache = new LRUCache<string, any>({
  max: 500,
  ttl: 3600000 // 1 hour
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;
    const { searchParams } = new URL(request.url);

    const contentType = searchParams.get('contentType') as any;
    const limit = parseInt(searchParams.get('limit') || '3');
    const onlyWon = searchParams.get('onlyWon') === 'true';

    // Auth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    // Check cache
    const cacheKey = `${rfpId}:${contentType}:${limit}:${onlyWon}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ suggestions: cached, cached: true });
    }

    // Get current RFP
    const [currentRfp] = await db.select().from(rfps).where(eq(rfps.id, rfpId));

    // Score and rank
    const suggestions = await scoreAndRankRfps(
      currentRfp,
      contentType,
      companyContext.company.id,
      { onlyWon, limit }
    );

    // Cache results
    suggestionsCache.set(cacheKey, suggestions);

    return NextResponse.json({
      suggestions,
      total: suggestions.length,
      cached: false
    });
  } catch (error) {
    console.error('[Suggest Sources Error]', error);
    return NextResponse.json(
      { error: 'Failed to suggest sources' },
      { status: 500 }
    );
  }
}
```

### 3.4 Génération avec Source (Modification)

**Fichier:** `src/app/api/companies/[slug]/rfps/[id]/questions/[questionId]/generate-response/route.ts` (modifier)

```typescript
// Ajout au début du fichier
import { rfpSourcePreferences, rfpQuestions } from '@/db/schema';

// Dans la fonction POST, après avoir récupéré la question:

// Check if question has selected source
let sourceRfpIds: string[] = [];
if (question.selectedSourceRfpId) {
  sourceRfpIds = [question.selectedSourceRfpId];
} else {
  // Use smart defaults from preferences
  const [prefs] = await db
    .select()
    .from(rfpSourcePreferences)
    .where(eq(rfpSourcePreferences.rfpId, rfpId))
    .limit(1);

  if (prefs && question.primaryContentType) {
    const suggested = prefs.suggestedSources[question.primaryContentType];
    if (suggested && suggested.length > 0) {
      sourceRfpIds = suggested.slice(0, 1); // Use top suggestion
    }
  }
}

// Two-tier retrieval
let sourceContext = '';
let ragContext = '';

// Tier 1: Source-pinned retrieval (if we have a source)
if (sourceRfpIds.length > 0) {
  const sourceResults = await pineconeIndex.namespace('rfp-library').query({
    vector: questionEmbedding,
    filter: {
      companyId: companyContext.company.id,
      rfpId: { $in: sourceRfpIds }
    },
    topK: 5
  });

  sourceContext = sourceResults.matches
    .map(m => m.metadata.text)
    .join('\n\n');
}

// Tier 2: General RAG (existing logic)
const ragResults = await pineconeIndex.namespace('rfp-library').query({
  vector: questionEmbedding,
  filter: {
    companyId: companyContext.company.id,
    rfpId: { $nin: sourceRfpIds } // Exclude source RFP
  },
  topK: 3
});

ragContext = ragResults.matches
  .map(m => m.metadata.text)
  .join('\n\n');

// Build enhanced prompt with both contexts
const enhancedPrompt = `
${basePrompt}

${sourceContext ? `
## Content from Selected Source RFP:
${sourceContext}

Adapt this content to the current mandate context.
` : ''}

${ragContext ? `
## Additional Context:
${ragContext}
` : ''}

Adaptation level: ${question.adaptationLevel || 'contextual'}
`;

// Generate with Claude (use company settings)
const model = getAIModelOrDefault(companyContext.company.settings);
const response = await anthropic.messages.create({
  model,
  messages: [{ role: 'user', content: enhancedPrompt }],
  max_tokens: 4000
});

// Save response with source metadata
await db.insert(rfpResponses).values({
  questionId,
  responseText: response.content[0].text,
  wasAiGenerated: true,
  aiModel: model,
  sourceRfpIds,
  adaptationUsed: question.adaptationLevel || 'contextual'
});

// Update usage count for source RFPs
if (sourceRfpIds.length > 0) {
  await db.update(rfps)
    .set({
      usageCount: sql`${rfps.usageCount} + 1`,
      lastUsedAt: new Date()
    })
    .where(sql`${rfps.id} IN (${sourceRfpIds.join(',')})`);
}
```

---

## Phase 4 : UI Components

**Durée estimée:** 5 heures

### 4.1 Smart Configuration Button

**Composant:** `src/components/rfp/smart-configure-button.tsx` (nouveau)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  rfpId: string;
  slug: string;
  onComplete?: () => void;
}

export function SmartConfigureButton({ rfpId, slug, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  async function handleSmartConfigure() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/smart-configure`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Failed to configure');

      const data = await response.json();
      setResult(data);
      setShowResults(true);

      if (onComplete) onComplete();
    } catch (error) {
      alert('Erreur lors de la configuration');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={handleSmartConfigure}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Configuration en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Configuration Intelligente
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Configuration Terminée
            </DialogTitle>
            <DialogDescription>
              Les paramètres optimaux ont été appliqués automatiquement.
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Questions classifiées</p>
                  <p className="text-2xl font-bold">{result.questionsClassified}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confiance moyenne</p>
                  <p className="text-2xl font-bold">
                    {Math.round(result.averageConfidence * 100)}%
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Sources sélectionnées:</p>
                <div className="space-y-1 text-sm">
                  {Object.entries(result.suggestedSources).map(([type, sources]: any) => (
                    <div key={type}>
                      <span className="text-gray-600">{type}:</span>{' '}
                      <span className="font-medium">{sources.length} sources</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 4.2 Import Historique Wizard

**Page:** `src/app/(dashboard)/companies/[slug]/rfps/import/page.tsx` (nouveau)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ImportHistoricalPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [rfpPdf, setRfpPdf] = useState<File | null>(null);
  const [responsePdf, setResponsePdf] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: '',
    clientName: '',
    industry: '',
    submittedAt: '',
    result: 'won',
    dealValue: '',
    outcomeNotes: ''
  });

  async function handleImport() {
    setLoading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('rfpPdf', rfpPdf!);
      formData.append('responsePdf', responsePdf!);
      formData.append('metadata', JSON.stringify(metadata));

      setProgress(30);

      const response = await fetch(`/api/companies/${params.slug}/rfps/import-historical`, {
        method: 'POST',
        body: formData
      });

      setProgress(70);

      if (!response.ok) throw new Error('Import failed');

      const result = await response.json();
      setProgress(100);

      // Redirect to RFP
      setTimeout(() => {
        router.push(`/companies/${params.slug}/rfps/${result.rfpId}`);
      }, 1000);

    } catch (error) {
      alert('Erreur lors de l\'import');
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Importer un RFP Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload Files */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>RFP Original (PDF)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setRfpPdf(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Réponse Soumise (PDF)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResponsePdf(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!rfpPdf || !responsePdf}
                className="w-full"
              >
                Continuer
              </Button>
            </div>
          )}

          {/* Step 2: Metadata */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Titre du RFP</Label>
                <Input
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Appel d'offres Ville de Montréal"
                />
              </div>
              <div>
                <Label>Client</Label>
                <Input
                  value={metadata.clientName}
                  onChange={(e) => setMetadata({ ...metadata, clientName: e.target.value })}
                  placeholder="Ville de Montréal"
                />
              </div>
              <div>
                <Label>Industrie</Label>
                <Select
                  value={metadata.industry}
                  onValueChange={(value) => setMetadata({ ...metadata, industry: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="private">Private Sector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Résultat</Label>
                <Select
                  value={metadata.result}
                  onValueChange={(value) => setMetadata({ ...metadata, result: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Gagné</SelectItem>
                    <SelectItem value="lost">Perdu</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes sur le résultat</Label>
                <Textarea
                  value={metadata.outcomeNotes}
                  onChange={(e) => setMetadata({ ...metadata, outcomeNotes: e.target.value })}
                  placeholder="Pourquoi gagné/perdu ? Leçons apprises..."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!metadata.title || !metadata.clientName || loading}
                  className="flex-1"
                >
                  Importer
                </Button>
              </div>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-gray-600">
                {progress < 30 && 'Téléversement des fichiers...'}
                {progress >= 30 && progress < 70 && 'Extraction et matching AI...'}
                {progress >= 70 && progress < 100 && 'Finalisation...'}
                {progress === 100 && 'Terminé !'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 Source Indicator (Badge)

**Modification:** `src/app/(dashboard)/companies/[slug]/rfps/[id]/questions/page.tsx`

```typescript
// Dans le map des questions, ajouter:

{question.selectedSourceRfpId && (
  <Badge variant="secondary" className="text-xs">
    📎 Source: {getSourceRfpTitle(question.selectedSourceRfpId)}
  </Badge>
)}

{question.appliedFromSettings && (
  <Badge variant="outline" className="text-xs">
    ✓ Configuration auto
  </Badge>
)}
```

### 4.4 Bibliothèque RFPs

**Page:** `src/app/(dashboard)/companies/[slug]/rfps/library/page.tsx` (nouveau)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

export default function RfpLibraryPage({ params }: { params: { slug: string } }) {
  const [rfps, setRfps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    const response = await fetch(`/api/companies/${params.slug}/rfps/library`);
    const data = await response.json();
    setRfps(data.rfps);
    setLoading(false);
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'won': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'lost': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bibliothèque de RFPs</h1>
        <Button onClick={() => window.location.href = `/companies/${params.slug}/rfps/import`}>
          + Importer RFP Historique
        </Button>
      </div>

      <div className="grid gap-4">
        {rfps.map((rfp: any) => (
          <Card key={rfp.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {getResultIcon(rfp.result)}
                    {rfp.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {rfp.clientName} • {rfp.clientIndustry} • {rfp.submittedAt}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={rfp.result === 'won' ? 'default' : 'secondary'}>
                    {rfp.result === 'won' ? 'Gagné' : rfp.result === 'lost' ? 'Perdu' : 'En attente'}
                  </Badge>
                  {rfp.qualityScore && (
                    <p className="text-sm text-gray-600 mt-1">
                      Qualité: {rfp.qualityScore}/100
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Utilisé {rfp.usageCount || 0} fois
                  {rfp.lastUsedAt && ` • Dernière utilisation: ${new Date(rfp.lastUsedAt).toLocaleDateString()}`}
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 5 : Optimisations Performance

**Durée estimée:** 2 heures

### 5.1 Caching Multi-Layer

**Fichier:** `src/lib/cache/cache-manager.ts` (nouveau)

```typescript
import { LRUCache } from 'lru-cache';
import { createClient } from 'redis';

// In-memory LRU cache
const memoryCache = new LRUCache({
  max: 10000,
  ttl: 3600000 // 1 hour
});

// Redis client (optional, for production)
let redisClient: any = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.connect();
}

export async function getCached<T>(key: string): Promise<T | null> {
  // Try memory first
  const memCached = memoryCache.get(key) as T;
  if (memCached) return memCached;

  // Try Redis if available
  if (redisClient) {
    const redisCached = await redisClient.get(key);
    if (redisCached) {
      const parsed = JSON.parse(redisCached) as T;
      memoryCache.set(key, parsed); // Populate memory
      return parsed;
    }
  }

  return null;
}

export async function setCached<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  // Set in memory
  memoryCache.set(key, value);

  // Set in Redis if available
  if (redisClient) {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Clear memory cache matching pattern
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }

  // Clear Redis if available
  if (redisClient) {
    const keys = await redisClient.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
}
```

### 5.2 Embedding Deduplication

**Fichier:** `src/lib/ai/embeddings.ts` (modification)

```typescript
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

const embeddingCache = new LRUCache<string, number[]>({
  max: 10000,
  ttl: 3600000 // 1 hour
});

export async function getEmbedding(text: string): Promise<number[]> {
  // Generate hash
  const hash = crypto.createHash('sha256').update(text).digest('hex');

  // Check cache
  const cached = embeddingCache.get(hash);
  if (cached) {
    console.log('[Embedding Cache Hit]', hash.substring(0, 8));
    return cached;
  }

  // Generate new embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });

  const embedding = response.data[0].embedding;

  // Cache it
  embeddingCache.set(hash, embedding);

  return embedding;
}

// Batch with deduplication
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const unique = [...new Set(texts)]; // Deduplicate input
  const embeddings = await Promise.all(unique.map(getEmbedding));

  // Map back to original order
  const embeddingMap = new Map(unique.map((text, i) => [text, embeddings[i]]));
  return texts.map(text => embeddingMap.get(text)!);
}
```

---

## Phase 6 : Pinecone Metadata Enrichment

**Durée estimée:** 1 heure

**Fichier:** `src/lib/rfp/pinecone.ts` (modification)

```typescript
export interface EnrichedVectorMetadata {
  // Existing
  companyId: string;
  rfpId: string;
  documentType: string;
  text: string;
  source: string;
  createdAt: string;

  // NEW: Content type
  contentType?: string; // 'project-methodology', etc.

  // NEW: Historical metadata
  isHistorical: boolean;
  rfpOutcome?: 'won' | 'lost' | 'pending';
  qualityScore?: number;
  industry?: string;
  submittedAt?: string;
}

export async function indexRfpContent(
  rfpId: string,
  chunks: Array<{ text: string; contentType?: string }>,
  metadata: {
    companyId: string;
    isHistorical: boolean;
    rfpOutcome?: string;
    qualityScore?: number;
    industry?: string;
  }
) {
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i].text);

    vectors.push({
      id: `${rfpId}-chunk-${i}`,
      values: embedding,
      metadata: {
        companyId: metadata.companyId,
        rfpId,
        documentType: 'rfp_content',
        text: chunks[i].text,
        contentType: chunks[i].contentType,
        isHistorical: metadata.isHistorical,
        rfpOutcome: metadata.rfpOutcome,
        qualityScore: metadata.qualityScore,
        industry: metadata.industry,
        chunkIndex: i,
        createdAt: new Date().toISOString()
      } as EnrichedVectorMetadata
    });
  }

  // Batch upsert to Pinecone
  await pineconeIndex.namespace('rfp-library').upsert(vectors);

  return vectors.length;
}

// Query with enriched filters
export async function queryByContentType(
  embedding: number[],
  filters: {
    companyId: string;
    contentType: string;
    onlyWon?: boolean;
    minQualityScore?: number;
    excludeRfpIds?: string[];
  }
) {
  const filter: any = {
    companyId: filters.companyId,
    contentType: filters.contentType,
    isHistorical: true
  };

  if (filters.onlyWon) {
    filter.rfpOutcome = 'won';
  }

  if (filters.minQualityScore) {
    filter.qualityScore = { $gte: filters.minQualityScore };
  }

  if (filters.excludeRfpIds && filters.excludeRfpIds.length > 0) {
    filter.rfpId = { $nin: filters.excludeRfpIds };
  }

  return await pineconeIndex.namespace('rfp-library').query({
    vector: embedding,
    filter,
    topK: 5,
    includeMetadata: true
  });
}
```

---

## Phase 7 : Testing

**Durée estimée:** 2 heures

### Unit Tests

**Fichier:** `src/lib/rfp/__tests__/historical-import.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { matchQuestionsToResponses } from '../historical-import';

describe('Historical Import', () => {
  it('should match questions to responses with high confidence', async () => {
    const questions = [
      { id: '1', questionText: 'What is your project methodology?' }
    ];

    const responseStructure = {
      sections: [{
        sectionTitle: 'Project Methodology',
        content: 'We use Agile...',
        possibleQuestions: ['What is your project methodology?']
      }]
    };

    // Mock GPT-5
    vi.mock('@/lib/ai/openai');

    const matches = await matchQuestionsToResponses(questions, responseStructure);

    expect(matches).toHaveLength(1);
    expect(matches[0].confidence).toBeGreaterThan(0.9);
  });
});
```

### Integration Tests

**Fichier:** `src/app/api/companies/__tests__/smart-configure.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '../[slug]/rfps/[id]/smart-configure/route';

describe('Smart Configure API', () => {
  it('should generate smart defaults', async () => {
    // Mock auth, db, etc.

    const request = new Request('http://localhost/api/companies/test/rfps/123/smart-configure', {
      method: 'POST'
    });

    const params = Promise.resolve({ slug: 'test', id: '123' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.questionsClassified).toBeGreaterThan(0);
  });
});
```

---

## Ordre d'Implémentation

### Jour 1 (8h)

**Matin (4h)**
1. ✅ Migrations DB (1h)
   - Créer 4 migrations SQL
   - Tester en local avec Drizzle
   - Push vers Neon DB dev

2. ✅ Types TypeScript (30min)
   - `src/types/content-types.ts`
   - Extensions `src/db/schema.ts`

3. ✅ Service historical-import (2.5h)
   - `parseSubmittedResponse()`
   - `matchQuestionsToResponses()`
   - `importHistoricalRfp()`
   - Tests avec mock GPT-5

**Après-midi (4h)**
4. ✅ Service content-type-detector (2h)
   - `detectQuestionContentType()`
   - Tiered strategy (Haiku → Sonnet)
   - Batch processing

5. ✅ Service smart-defaults (2h)
   - `generateSmartDefaults()`
   - Integration avec detector + scoring
   - Sauvegarde preferences

### Jour 2 (7h)

**Matin (4h)**
6. ✅ API import-historical (2h)
   - Route POST avec multipart form
   - Upload handling
   - Error handling
   - Test avec Postman/curl

7. ✅ API smart-configure (1h)
   - Route POST
   - Auth + validation
   - Call service

8. ✅ API suggest-sources (1h)
   - Route GET avec query params
   - Caching integration
   - Response formatting

**Après-midi (3h)**
9. ✅ Modification generate-response (2h)
   - Two-tier retrieval logic
   - Source-pinned query
   - Enhanced prompt construction
   - Update response avec metadata

10. ✅ Pinecone enrichment (1h)
    - Update metadata schema
    - `indexRfpContent()` avec new fields
    - `queryByContentType()` avec filters

### Jour 3 (5h)

**Matin (3h)**
11. ✅ UI Import wizard (2h)
    - Page `/import`
    - Steps 1-2 (upload + metadata)
    - Progress indicator
    - Navigation

12. ✅ UI Smart configure button (1h)
    - Component `<SmartConfigureButton>`
    - Modal avec résultats
    - Integration dans RFP detail page

**Après-midi (2h)**
13. ✅ UI Source indicator (30min)
    - Badge dans question list
    - Tooltip avec info source

14. ✅ UI Bibliothèque (1h)
    - Page `/library`
    - Liste RFPs historiques
    - Filtres basiques
    - Actions

15. ✅ Testing (30min)
    - Smoke tests des APIs
    - Test import bout-en-bout
    - Test smart configure
    - Test génération avec source

---

## Métriques de Succès

### Métriques Techniques

**Performance**
- ✅ Import historique : < 5min pour RFP 50 questions
- ✅ Smart configure : < 30s
- ✅ Generate response : < 8s (avec source)
- ✅ Cache hit rate : > 60%

**Qualité**
- ✅ Content-type detection confidence : > 85%
- ✅ Question-response matching confidence : > 90%
- ✅ Source suggestions relevance : > 80%

**Coûts**
- ✅ Import RFP 50 questions : < $0.50 en AI
- ✅ Smart configure 50 questions : < $0.30 en AI
- ✅ Generate response : < $0.10 en AI

### Métriques Business

**Adoption**
- ✅ Users adoptent smart defaults : > 80%
- ✅ RFPs historiques importés : > 5 per company
- ✅ Utilisation sources dans génération : > 60%

**Satisfaction**
- ✅ Quality satisfaction : > 4/5
- ✅ Time saved vs manual : > 60%
- ✅ Reusability perception : > 4/5

---

## Points d'Attention Critiques

### 1. GPT-5 Availability
```typescript
// TOUJOURS implémenter fallback
const model = await checkModelAvailability('gpt-5') ? 'gpt-5' : 'gpt-4o';
```

### 2. GPT-5 Parameters
```typescript
// ❌ NE PAS utiliser
{ model: 'gpt-5', temperature: 0.7 }

// ✅ Utiliser
{ model: 'gpt-5', reasoning: { effort: 'low' } }
```

### 3. Timeout API
```typescript
// Import = long running
export const maxDuration = 600; // 10 minutes (Vercel limit)
```

### 4. Multi-tenant Security
```typescript
// TOUJOURS filter par companyId
filter: {
  companyId: companyContext.company.id,
  // ...
}
```

### 5. Cost Tracking
```typescript
// Log TOUS les appels AI
console.log('[AI Cost]', { model, tokens, cost });
```

### 6. Error Handling
```typescript
// Graceful degradation
try {
  return await generateWithAI();
} catch (error) {
  console.error('[AI Error]', error);
  return fallbackGeneration();
}
```

---

## Prochaines Étapes (Post-MVP)

### Phase 8 : Fonctionnalités Avancées (15h)
- Configuration manuelle par content-type
- UI révision matches < 90% confiance
- Three-tier retrieval (+ RAG général)
- Filtres avancés bibliothèque
- Analytics d'utilisation

### Phase 9 : Optimisations Production (10h)
- Redis caching
- Background jobs (Inngest/BullMQ)
- Quality scoring ML
- Usage analytics dashboard
- A/B testing framework

### Phase 10 : Scale & Performance (8h)
- Pinecone namespace strategy
- Batch processing optimizations
- CDN for static assets
- Database query optimization
- Monitoring & alerting

---

## Ressources & Références

**Documentation**
- [GPT-5 Guide](https://platform.openai.com/docs/guides/latest-model)
- [Responses API vs Chat Completions](https://platform.openai.com/docs/guides/migrate-to-responses)
- [Claude Sonnet 4.5](https://docs.anthropic.com/claude/docs/models-overview)
- [Pinecone Filtering](https://docs.pinecone.io/docs/metadata-filtering)

**Outils**
- [GPT-5 Prompt Optimizer](https://platform.openai.com/chat/edit?optimize=true)
- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)

**Pricing**
- GPT-5: $1.25/M input, $10/M output
- Claude Sonnet 4.5: $3/M input, $15/M output
- Claude Haiku 4.5: $0.25/M input, $1.25/M output
- OpenAI Embeddings: $0.00002/1K tokens

---

**Date de création:** 2025-01-12
**Auteur:** Claude Code
**Version:** 1.0 MVP

**État:** ✅ Prêt pour implémentation
