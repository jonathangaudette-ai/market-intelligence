# Plan de Développement Consolidé : Module Propositions Standard

**Document de référence unique pour l'implémentation**
**Date:** 2025-11-22
**Version:** 1.0
**Durée totale:** 38 jours (7.5 semaines)

---

## Vue d'ensemble

### Objectif
Étendre le module RFP existant pour supporter les propositions d'affaires standard avec 3 stratégies de génération de contenu.

### Architecture clé
- **STATIC** : Clauses pré-approuvées (légal, assurances, garanties) - Aucune IA
- **RAG** : Génération dynamique (résumé, solution, prix) - Claude Sonnet 4.5
- **HYBRID** : Template + enrichissement IA (méthodologie, équipe, échéancier)

### Fichiers de référence existants
```
src/db/schema.ts                    # Schéma DB à étendre
src/types/content-types.ts          # ContentType à étendre (+7 types)
src/lib/rag/dual-query-engine.ts    # RAG existant (réutiliser tel quel)
src/lib/rfp/streaming-generator.ts  # Générateur à adapter
src/lib/prompts/service.ts          # Pattern pour ClauseLibrary
```

---

## PHASE 0 : Design Sprint (5 jours)

> **Note:** Cette phase est pré-développement. Les wireframes sont dans MISE-A-JOUR-UX-SECTIONS-STATIQUES.md

### Livrables
- [ ] 12 wireframes Figma validés
- [ ] User testing avec 3 utilisateurs
- [ ] Handoff design → développement

---

## PHASE 1 : Fondations DB + Types (5 jours)

### Jour 1-2 : Migrations DB

#### Migration 1 : Extension table rfps
```sql
-- drizzle/migrations/xxx_add_proposal_type.sql

ALTER TABLE rfps
ADD COLUMN proposal_type VARCHAR(50) DEFAULT 'rfp';
-- Valeurs: 'rfp' | 'business_proposal' | 'hybrid' | 'quote' | 'sow'

CREATE INDEX idx_rfps_proposal_type ON rfps(proposal_type);

-- Mettre à jour les données existantes
UPDATE rfps SET proposal_type = 'rfp' WHERE proposal_type IS NULL;
```

#### Migration 2 : Extension table rfp_questions (polymorphisme)
```sql
-- drizzle/migrations/xxx_add_content_item_type.sql

ALTER TABLE rfp_questions
ADD COLUMN content_item_type VARCHAR(50) DEFAULT 'question',
ADD COLUMN estimated_length VARCHAR(20),
ADD COLUMN key_points JSONB;
-- content_item_type: 'question' | 'section'
-- estimated_length: 'short' | 'medium' | 'long'

CREATE INDEX idx_rfp_questions_item_type ON rfp_questions(content_item_type);

UPDATE rfp_questions SET content_item_type = 'question' WHERE content_item_type IS NULL;
```

#### Migration 3 : Nouvelle table content_blocks
```sql
-- drizzle/migrations/xxx_create_content_blocks.sql

CREATE TABLE content_blocks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  block_key VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Contenu
  content TEXT NOT NULL,
  content_format VARCHAR(20) DEFAULT 'markdown',

  -- Variables (pour substitution Handlebars)
  variables JSONB DEFAULT '[]',

  -- Métadonnées
  language VARCHAR(10) DEFAULT 'fr',
  industry VARCHAR(100),

  -- Approbation juridique
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  legal_review_status VARCHAR(50) DEFAULT 'pending',

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  previous_version_id VARCHAR(255),

  -- Audit
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, block_key, version)
);

CREATE INDEX idx_content_blocks_category ON content_blocks(company_id, category, is_active);
CREATE INDEX idx_content_blocks_key ON content_blocks(company_id, block_key, is_active);
```

### Jour 3 : Types TypeScript

#### Fichier : src/types/content-types.ts (extension)
```typescript
// AJOUTER ces 7 nouveaux ContentType
export type ContentType =
  // Existants (11)
  | 'company-overview'
  | 'corporate-info'
  | 'team-structure'
  | 'company-history'
  | 'values-culture'
  | 'product-description'
  | 'service-offering'
  | 'project-methodology'
  | 'technical-solution'
  | 'project-timeline'
  | 'pricing-structure'
  // NOUVEAUX (7)
  | 'executive-summary'
  | 'client-context'
  | 'case-studies'
  | 'legal-terms'
  | 'insurance-compliance'
  | 'deliverables'
  | 'appendix';

// NOUVEAU: Type de proposition
export type ProposalType = 'rfp' | 'business_proposal' | 'hybrid' | 'quote' | 'sow';

// NOUVEAU: Stratégie de génération
export type GenerationStrategy = 'rag' | 'static' | 'hybrid';

// NOUVEAU: Configuration par ContentType
export interface ContentTypeConfig {
  type: ContentType;
  generationStrategy: GenerationStrategy;
  defaultBlockKey?: string;
  staticRatio?: number;
  requiredVariables?: string[];
}

// NOUVEAU: Mapping ContentType → Config
export const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  // DYNAMIQUES (RAG)
  'executive-summary': { type: 'executive-summary', generationStrategy: 'rag' },
  'client-context': { type: 'client-context', generationStrategy: 'rag' },
  'technical-solution': { type: 'technical-solution', generationStrategy: 'rag' },
  'pricing-structure': { type: 'pricing-structure', generationStrategy: 'rag' },
  'case-studies': { type: 'case-studies', generationStrategy: 'rag' },
  'product-description': { type: 'product-description', generationStrategy: 'rag' },
  'service-offering': { type: 'service-offering', generationStrategy: 'rag' },
  'company-overview': { type: 'company-overview', generationStrategy: 'rag' },
  'corporate-info': { type: 'corporate-info', generationStrategy: 'rag' },
  'company-history': { type: 'company-history', generationStrategy: 'rag' },
  'values-culture': { type: 'values-culture', generationStrategy: 'rag' },
  'deliverables': { type: 'deliverables', generationStrategy: 'rag' },
  'appendix': { type: 'appendix', generationStrategy: 'rag' },

  // STATIQUES (Bibliothèque de clauses)
  'legal-terms': {
    type: 'legal-terms',
    generationStrategy: 'static',
    defaultBlockKey: 'legal_terms_standard',
    requiredVariables: ['clientName', 'effectiveDate'],
  },
  'insurance-compliance': {
    type: 'insurance-compliance',
    generationStrategy: 'static',
    defaultBlockKey: 'insurance_standard',
  },

  // HYBRIDES (Template + enrichissement)
  'project-methodology': {
    type: 'project-methodology',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'methodology_framework',
    staticRatio: 60,
    requiredVariables: ['projectType'],
  },
  'team-structure': {
    type: 'team-structure',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'team_intro',
    staticRatio: 30,
  },
  'project-timeline': {
    type: 'project-timeline',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'timeline_template',
    staticRatio: 40,
    requiredVariables: ['startDate', 'endDate'],
  },
};
```

#### Fichier : src/types/proposal.ts (nouveau)
```typescript
export interface ProposalSection {
  id: string;
  rfpId: string;
  sectionTitle: string;
  sectionType: ContentType;
  sectionOrder: number;
  estimatedLength: 'short' | 'medium' | 'long';
  keyPoints: string[];
  generationStrategy: GenerationStrategy;
}

export interface ContentBlock {
  id: string;
  companyId: string;
  blockKey: string;
  category: string;
  name: string;
  content: string;
  variables: Array<{
    key: string;
    required: boolean;
    defaultValue?: string;
  }>;
  language: 'fr' | 'en';
  legalReviewStatus: 'pending' | 'approved' | 'needs_review';
  version: number;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface GeneratedContent {
  content: string;
  strategy: GenerationStrategy;
  sources: Array<{
    type: 'clause_library' | 'rag' | 'template';
    blockKey?: string;
    rfpId?: string;
    score?: number;
  }>;
  metadata: {
    generatedAt: Date;
    aiUsed: boolean;
    model?: string;
    editable: boolean;
    approvedContent: boolean;
  };
}
```

### Jour 4 : ClauseLibraryService

#### Fichier : src/lib/proposals/clause-library.service.ts (nouveau)
```typescript
import { db } from '@/db';
import { contentBlocks } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Handlebars from 'handlebars';
import type { ContentBlock } from '@/types/proposal';

export class ClauseLibraryService {

  async getBlock(
    companyId: string,
    blockKey: string,
    options?: { language?: string }
  ): Promise<ContentBlock | null> {
    const conditions = [
      eq(contentBlocks.companyId, companyId),
      eq(contentBlocks.blockKey, blockKey),
      eq(contentBlocks.isActive, true),
    ];

    if (options?.language) {
      conditions.push(eq(contentBlocks.language, options.language));
    }

    const [block] = await db
      .select()
      .from(contentBlocks)
      .where(and(...conditions))
      .orderBy(desc(contentBlocks.version))
      .limit(1);

    return block || null;
  }

  async renderBlock(
    companyId: string,
    blockKey: string,
    variables: Record<string, string>
  ): Promise<{ content: string; block: ContentBlock }> {
    const block = await this.getBlock(companyId, blockKey);

    if (!block) {
      throw new Error(`Block not found: ${blockKey}`);
    }

    // Valider variables requises
    const missingVars = (block.variables || [])
      .filter(v => v.required && !variables[v.key])
      .map(v => v.key);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Appliquer defaults
    const finalVars = { ...variables };
    for (const v of block.variables || []) {
      if (finalVars[v.key] === undefined && v.defaultValue) {
        finalVars[v.key] = v.defaultValue;
      }
    }

    // Rendre avec Handlebars (pas d'IA!)
    const template = Handlebars.compile(block.content);
    const renderedContent = template(finalVars);

    return { content: renderedContent, block };
  }

  async listBlocksByCategory(
    companyId: string,
    category: string
  ): Promise<ContentBlock[]> {
    return db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.companyId, companyId),
          eq(contentBlocks.category, category),
          eq(contentBlocks.isActive, true)
        )
      )
      .orderBy(contentBlocks.name);
  }

  async saveBlock(
    companyId: string,
    blockKey: string,
    data: {
      name: string;
      category: string;
      content: string;
      variables?: Array<{ key: string; required: boolean; defaultValue?: string }>;
      language?: string;
    },
    userId: string
  ): Promise<ContentBlock> {
    // Désactiver version précédente
    const [existing] = await db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.companyId, companyId),
          eq(contentBlocks.blockKey, blockKey),
          eq(contentBlocks.isActive, true)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(contentBlocks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(contentBlocks.id, existing.id));
    }

    // Créer nouvelle version
    const [newBlock] = await db
      .insert(contentBlocks)
      .values({
        companyId,
        blockKey,
        name: data.name,
        category: data.category,
        content: data.content,
        variables: data.variables || [],
        language: data.language || 'fr',
        version: existing ? existing.version + 1 : 1,
        previousVersionId: existing?.id,
        isActive: true,
        legalReviewStatus: 'pending',
        createdBy: userId,
      })
      .returning();

    return newBlock;
  }

  async approveBlock(blockId: string, approverId: string): Promise<void> {
    await db
      .update(contentBlocks)
      .set({
        legalReviewStatus: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentBlocks.id, blockId));
  }
}

// Singleton
let _clauseLibrary: ClauseLibraryService | null = null;

export function getClauseLibrary(): ClauseLibraryService {
  if (!_clauseLibrary) {
    _clauseLibrary = new ClauseLibraryService();
  }
  return _clauseLibrary;
}
```

### Jour 5 : Gestion d'erreurs

#### Fichier : src/components/error-boundary.tsx (si n'existe pas)
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Une erreur est survenue</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm text-red-700 underline"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Critères de succès Phase 1
- [ ] Migrations exécutées sans erreur
- [ ] `npm run typecheck` passe
- [ ] `npm run build` passe
- [ ] Tests unitaires ClauseLibraryService passent

---

## PHASE 2 : Détection + Parsing (5 jours)

### Jour 1-2 : Détecteurs

#### Fichier : src/lib/proposals/type-detector.ts (nouveau)
```typescript
import OpenAI from 'openai';
import type { ProposalType } from '@/types/content-types';

export interface DocumentTypeDetection {
  type: ProposalType;
  confidence: number;
  reasoning: string;
}

export async function detectDocumentType(
  text: string
): Promise<DocumentTypeDetection> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Analyze this document and determine its type.

Types:
- rfp: Formal Request for Proposal with numbered questions, evaluation criteria
- business_proposal: Business proposal with narrative sections (solution, pricing, timeline)
- hybrid: Mix of both (has questions AND narrative sections)
- quote: Simple price quotation
- sow: Statement of Work (deliverables, timeline, terms)

Document sample (first 5000 chars):
${text.substring(0, 5000)}

Return JSON:
{
  "type": "rfp|business_proposal|hybrid|quote|sow",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
```

#### Fichier : src/lib/proposals/section-detector.ts (nouveau)
```typescript
import OpenAI from 'openai';
import { CONTENT_TYPE_CONFIGS, type ContentType } from '@/types/content-types';
import type { ProposalSection } from '@/types/proposal';

export async function detectProposalSections(
  text: string
): Promise<ProposalSection[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const availableTypes = Object.keys(CONTENT_TYPE_CONFIGS).join(', ');

  const prompt = `Analyze this business proposal and identify its sections.

Available section types: ${availableTypes}

For each section found, provide:
{
  "sectionTitle": "The section heading",
  "sectionType": "one of the types above",
  "sectionOrder": 1,
  "estimatedLength": "short|medium|long",
  "keyPoints": ["main point 1", "main point 2"]
}

Document (${text.length} chars):
${text.substring(0, 120000)}

Return ONLY valid JSON: { "sections": [...] }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 16000,
  });

  const result = JSON.parse(response.choices[0].message.content || '{"sections":[]}');

  // Ajouter la stratégie de génération à chaque section
  return (result.sections || []).map((section: any) => ({
    ...section,
    generationStrategy: CONTENT_TYPE_CONFIGS[section.sectionType]?.generationStrategy || 'rag',
  }));
}
```

### Jour 3 : Intégration parsing API

#### Modifier : src/app/api/companies/[slug]/rfps/[id]/parse/route.ts
```typescript
// Ajouter après l'extraction de texte existante:

import { detectDocumentType } from '@/lib/proposals/type-detector';
import { detectProposalSections } from '@/lib/proposals/section-detector';
import { extractQuestions } from '@/lib/rfp/parser/question-extractor';

// Dans la fonction POST:

// 1. Détecter le type de document
const typeDetection = await detectDocumentType(extractedText);

// 2. Mettre à jour le RFP avec le type détecté
await db.update(rfps)
  .set({ proposal_type: typeDetection.type })
  .where(eq(rfps.id, params.id));

// 3. Router vers le bon parser
if (typeDetection.type === 'rfp') {
  // Logique existante - extraction de questions
  const questions = await extractQuestions(extractedText);
  // ... insérer questions avec content_item_type = 'question'

} else if (typeDetection.type === 'business_proposal') {
  // Nouvelle logique - détection de sections
  const sections = await detectProposalSections(extractedText);

  for (const section of sections) {
    await db.insert(rfpQuestions).values({
      rfpId: params.id,
      contentItemType: 'section',
      sectionTitle: section.sectionTitle,
      estimatedLength: section.estimatedLength,
      keyPoints: section.keyPoints,
      primaryContentType: section.sectionType,
      category: section.sectionType,
      questionNumber: String(section.sectionOrder),
      status: 'pending',
    });
  }

} else if (typeDetection.type === 'hybrid') {
  // Les deux: questions + sections
  const questions = await extractQuestions(extractedText);
  const sections = await detectProposalSections(extractedText);
  // ... insérer les deux
}
```

### Jour 4-5 : UI parsing + feedback

#### Composant : src/components/rfp/parsing-progress.tsx (nouveau)
```typescript
'use client';

import { useEffect, useState } from 'react';

interface ParsingStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

interface ParsingProgressProps {
  rfpId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function ParsingProgress({ rfpId, onComplete, onError }: ParsingProgressProps) {
  const [steps, setSteps] = useState<ParsingStep[]>([
    { id: 'detect', label: 'Détection du type de document', status: 'pending' },
    { id: 'extract', label: 'Extraction du texte', status: 'pending' },
    { id: 'sections', label: 'Identification des sections', status: 'pending' },
    { id: 'categorize', label: 'Catégorisation', status: 'pending' },
  ]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const eventSource = new EventSource(`/api/companies/.../rfps/${rfpId}/parse/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'step_update') {
        setSteps(prev => prev.map(s =>
          s.id === data.stepId ? { ...s, status: data.status, detail: data.detail } : s
        ));
      }

      if (data.type === 'progress') {
        setProgress(data.value);
      }

      if (data.type === 'complete') {
        onComplete();
        eventSource.close();
      }

      if (data.type === 'error') {
        onError(data.message);
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }, [rfpId]);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Analyse en cours...</h3>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-3">
            {step.status === 'pending' && <span className="text-gray-400">⏳</span>}
            {step.status === 'in_progress' && <span className="animate-spin">🔄</span>}
            {step.status === 'completed' && <span className="text-green-500">✅</span>}
            {step.status === 'failed' && <span className="text-red-500">❌</span>}

            <span className={step.status === 'completed' ? 'text-gray-600' : 'text-gray-900'}>
              {step.label}
            </span>

            {step.detail && (
              <span className="text-sm text-gray-500">({step.detail})</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {/* cancel logic */}}
        className="mt-6 text-sm text-gray-500 hover:text-gray-700"
      >
        Annuler l'analyse
      </button>
    </div>
  );
}
```

### Critères de succès Phase 2
- [ ] Détection type document fonctionne (tester avec 5 docs)
- [ ] Sections extraites correctement
- [ ] UI feedback visible pendant parsing
- [ ] Tests E2E parsing passent

---

## PHASE 3 : Génération 3 stratégies (5 jours)

### Jour 1 : SectionGeneratorService

#### Fichier : src/lib/proposals/section-generator.service.ts (nouveau)
```typescript
import { CONTENT_TYPE_CONFIGS, type ContentType, type GenerationStrategy } from '@/types/content-types';
import { getClauseLibrary } from './clause-library.service';
import { DualQueryRetrievalEngine } from '@/lib/rag/dual-query-engine';
import { Anthropic } from '@anthropic-ai/sdk';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';
import type { GeneratedContent, ProposalSection } from '@/types/proposal';

export interface GenerateSectionParams {
  section: ProposalSection;
  proposalContext: {
    clientName: string;
    industry?: string;
    projectDescription?: string;
  };
  companyId: string;
  variables?: Record<string, string>;
  options?: {
    tone?: 'formal' | 'professional' | 'friendly';
    length?: 'short' | 'medium' | 'long';
  };
}

export class SectionGeneratorService {
  private clauseLibrary = getClauseLibrary();

  async generateSection(params: GenerateSectionParams): Promise<GeneratedContent> {
    const config = CONTENT_TYPE_CONFIGS[params.section.sectionType];
    const strategy = config?.generationStrategy || 'rag';

    switch (strategy) {
      case 'static':
        return this.generateStatic(params);
      case 'rag':
        return this.generateWithRAG(params);
      case 'hybrid':
        return this.generateHybrid(params);
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * STATIC: Bibliothèque de clauses, AUCUNE IA
   */
  private async generateStatic(params: GenerateSectionParams): Promise<GeneratedContent> {
    const config = CONTENT_TYPE_CONFIGS[params.section.sectionType];

    const { content, block } = await this.clauseLibrary.renderBlock(
      params.companyId,
      config.defaultBlockKey!,
      {
        clientName: params.proposalContext.clientName,
        companyName: 'Votre Entreprise', // TODO: Récupérer de company settings
        ...params.variables,
      }
    );

    return {
      content,
      strategy: 'static',
      sources: [{
        type: 'clause_library',
        blockKey: config.defaultBlockKey,
      }],
      metadata: {
        generatedAt: new Date(),
        aiUsed: false,
        editable: true,
        approvedContent: block.legalReviewStatus === 'approved',
      },
    };
  }

  /**
   * RAG: Recherche + Génération IA complète
   */
  private async generateWithRAG(params: GenerateSectionParams): Promise<GeneratedContent> {
    const ragEngine = new DualQueryRetrievalEngine();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 1. Retrieval
    const embedding = await this.generateEmbedding(
      `${params.section.sectionTitle} ${params.section.keyPoints?.join(' ') || ''}`
    );

    const retrieved = await ragEngine.retrieve(
      embedding,
      params.section.sectionType,
      params.companyId,
      { depth: 'detailed' }
    );

    // 2. Build context
    const ragContext = retrieved.chunks
      .slice(0, 5)
      .map(c => `[Source: ${c.source}]\n${c.text}`)
      .join('\n\n');

    // 3. Generate with Claude
    const lengthGuide = {
      short: '200-400 mots',
      medium: '400-800 mots',
      long: '800-1200 mots',
    };

    const prompt = `Tu es un expert en rédaction de propositions d'affaires.

Rédige la section "${params.section.sectionTitle}" pour une proposition destinée à ${params.proposalContext.clientName}.

CONTEXTE CLIENT:
- Entreprise: ${params.proposalContext.clientName}
- Industrie: ${params.proposalContext.industry || 'Non spécifiée'}
- Projet: ${params.proposalContext.projectDescription || 'Voir détails ci-dessous'}

POINTS CLÉS À COUVRIR:
${params.section.keyPoints?.map(p => `- ${p}`).join('\n') || '- À déterminer selon le contexte'}

CONTENU DE RÉFÉRENCE (propositions passées):
${ragContext}

INSTRUCTIONS:
- Longueur cible: ${lengthGuide[params.options?.length || params.section.estimatedLength || 'medium']}
- Ton: ${params.options?.tone || 'professional'}
- Réutilise le contenu pertinent des propositions passées
- Adapte au contexte spécifique du client
- Écris en français professionnel

Génère le contenu de la section:`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODELS.sonnet,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const generatedContent = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return {
      content: generatedContent,
      strategy: 'rag',
      sources: retrieved.chunks.slice(0, 5).map(c => ({
        type: 'rag' as const,
        rfpId: c.metadata.rfpId,
        score: c.compositeScore,
      })),
      metadata: {
        generatedAt: new Date(),
        aiUsed: true,
        model: CLAUDE_MODELS.sonnet,
        editable: true,
        approvedContent: false,
      },
    };
  }

  /**
   * HYBRID: Template statique + enrichissement RAG
   */
  private async generateHybrid(params: GenerateSectionParams): Promise<GeneratedContent> {
    const config = CONTENT_TYPE_CONFIGS[params.section.sectionType];

    // 1. Charger le template statique
    const { content: templateContent, block } = await this.clauseLibrary.renderBlock(
      params.companyId,
      config.defaultBlockKey!,
      {
        projectType: params.proposalContext.projectDescription || 'projet',
        ...params.variables,
      }
    );

    // 2. Enrichir avec RAG
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const enrichmentPrompt = `Tu as un template de section "${params.section.sectionTitle}":

${templateContent}

Enrichis ce contenu pour le client "${params.proposalContext.clientName}" en ajoutant:
- Des exemples concrets de projets similaires
- Des métriques de succès
- Des détails contextuels pertinents

IMPORTANT:
- Conserve la structure du template
- Ne modifie PAS les parties légales ou conformité
- Ajoute uniquement du contenu contextuel

Génère le contenu enrichi:`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODELS.sonnet,
      max_tokens: 4000,
      messages: [{ role: 'user', content: enrichmentPrompt }],
    });

    const enrichedContent = response.content[0].type === 'text'
      ? response.content[0].text
      : templateContent;

    return {
      content: enrichedContent,
      strategy: 'hybrid',
      sources: [
        { type: 'clause_library', blockKey: config.defaultBlockKey },
      ],
      metadata: {
        generatedAt: new Date(),
        aiUsed: true,
        model: CLAUDE_MODELS.sonnet,
        editable: true,
        approvedContent: false,
      },
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}

// Singleton
let _sectionGenerator: SectionGeneratorService | null = null;

export function getSectionGenerator(): SectionGeneratorService {
  if (!_sectionGenerator) {
    _sectionGenerator = new SectionGeneratorService();
  }
  return _sectionGenerator;
}
```

### Jour 2-4 : API streaming

#### Modifier : src/app/api/companies/[slug]/rfps/[id]/questions/[questionId]/generate-response/route.ts
```typescript
import { getSectionGenerator } from '@/lib/proposals/section-generator.service';

export async function POST(req: Request, { params }) {
  const contentItem = await db.query.rfpQuestions.findFirst({
    where: eq(rfpQuestions.id, params.questionId),
    with: { rfp: true }
  });

  if (contentItem.contentItemType === 'section') {
    // Nouvelle logique pour sections
    const generator = getSectionGenerator();

    const result = await generator.generateSection({
      section: {
        id: contentItem.id,
        rfpId: contentItem.rfpId,
        sectionTitle: contentItem.sectionTitle || '',
        sectionType: contentItem.primaryContentType as ContentType,
        sectionOrder: parseInt(contentItem.questionNumber || '0'),
        estimatedLength: contentItem.estimatedLength as any || 'medium',
        keyPoints: contentItem.keyPoints as string[] || [],
        generationStrategy: CONTENT_TYPE_CONFIGS[contentItem.primaryContentType]?.generationStrategy || 'rag',
      },
      proposalContext: {
        clientName: contentItem.rfp.clientName || '',
        industry: contentItem.rfp.clientIndustry || '',
      },
      companyId: params.slug,
    });

    // Sauvegarder la réponse
    await db.insert(rfpResponses).values({
      questionId: contentItem.id,
      responseText: result.content,
      wasAiGenerated: result.metadata.aiUsed,
      aiModel: result.metadata.model,
      sourcesUsed: result.sources,
      status: 'draft',
    });

    return Response.json(result);
  } else {
    // Logique existante pour questions
    // ...
  }
}
```

### Jour 5 : Tests

```typescript
// src/lib/proposals/__tests__/section-generator.test.ts

describe('SectionGeneratorService', () => {
  describe('generateSection', () => {
    it('uses STATIC strategy for legal-terms', async () => {
      const generator = getSectionGenerator();
      const result = await generator.generateSection({
        section: {
          id: '1',
          rfpId: '1',
          sectionTitle: 'Termes et conditions',
          sectionType: 'legal-terms',
          sectionOrder: 1,
          estimatedLength: 'long',
          keyPoints: [],
          generationStrategy: 'static',
        },
        proposalContext: { clientName: 'Acme Corp' },
        companyId: 'test-company',
        variables: { effectiveDate: '2025-01-15' },
      });

      expect(result.strategy).toBe('static');
      expect(result.metadata.aiUsed).toBe(false);
      expect(result.content).toContain('Acme Corp');
    });

    it('uses RAG strategy for executive-summary', async () => {
      const result = await generator.generateSection({
        section: {
          sectionType: 'executive-summary',
          generationStrategy: 'rag',
          // ...
        },
        // ...
      });

      expect(result.strategy).toBe('rag');
      expect(result.metadata.aiUsed).toBe(true);
    });
  });
});
```

### Critères de succès Phase 3
- [ ] 3 stratégies fonctionnent (STATIC, RAG, HYBRID)
- [ ] Tests unitaires passent
- [ ] Génération STATIC < 1 seconde
- [ ] Génération RAG < 15 secondes

---

## PHASE 4 : Configuration Modals (4 jours)

### Jour 1-2 : Modal configuration RAG

#### Fichier : src/components/proposals/generation-config-modal.tsx (nouveau)
```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

interface GenerationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: GenerationConfig) => void;
  sectionTitle: string;
  strategy: 'rag' | 'hybrid';
  availableSources: Array<{
    id: string;
    title: string;
    type: string;
    similarity: number;
    outcome?: 'won' | 'lost';
  }>;
}

interface GenerationConfig {
  length: 'short' | 'medium' | 'long';
  tone: 'formal' | 'professional' | 'friendly';
  selectedSources: string[];
  adaptationLevel: 'verbatim' | 'light' | 'contextual' | 'creative';
}

export function GenerationConfigModal({
  isOpen,
  onClose,
  onGenerate,
  sectionTitle,
  strategy,
  availableSources,
}: GenerationConfigModalProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    length: 'medium',
    tone: 'professional',
    selectedSources: availableSources.slice(0, 2).map(s => s.id),
    adaptationLevel: 'contextual',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🤖 Générer : {sectionTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Longueur */}
          <div>
            <label className="text-sm font-medium">Longueur cible</label>
            <RadioGroup
              value={config.length}
              onValueChange={(v) => setConfig({ ...config, length: v as any })}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="short" />
                <span className="text-sm">Court (200-400 mots)</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="medium" />
                <span className="text-sm">Moyen (400-800 mots)</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="long" />
                <span className="text-sm">Long (800-1200 mots)</span>
              </div>
            </RadioGroup>
          </div>

          {/* Ton */}
          <div>
            <label className="text-sm font-medium">Ton</label>
            <select
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value as any })}
              className="w-full mt-2 border rounded-md p-2"
            >
              <option value="formal">Formel et structuré</option>
              <option value="professional">Professionnel et persuasif</option>
              <option value="friendly">Accessible et engageant</option>
            </select>
          </div>

          {/* Sources */}
          <div>
            <label className="text-sm font-medium">Sources à utiliser</label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {availableSources.map((source) => (
                <div key={source.id} className="flex items-center gap-3">
                  <Checkbox
                    checked={config.selectedSources.includes(source.id)}
                    onCheckedChange={(checked) => {
                      setConfig({
                        ...config,
                        selectedSources: checked
                          ? [...config.selectedSources, source.id]
                          : config.selectedSources.filter(id => id !== source.id),
                      });
                    }}
                  />
                  <div className="flex-1">
                    <span className="text-sm">{source.title}</span>
                    {source.outcome && (
                      <span className={`ml-2 text-xs ${source.outcome === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                        ({source.outcome})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{source.similarity}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Niveau d'adaptation */}
          <div>
            <label className="text-sm font-medium">Niveau d'adaptation</label>
            <div className="mt-2">
              <Slider
                value={[['verbatim', 'light', 'contextual', 'creative'].indexOf(config.adaptationLevel)]}
                onValueChange={([v]) => {
                  const levels = ['verbatim', 'light', 'contextual', 'creative'] as const;
                  setConfig({ ...config, adaptationLevel: levels[v] });
                }}
                max={3}
                step={1}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Verbatim</span>
                <span>Light</span>
                <span>Contextuel</span>
                <span>Créatif</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onGenerate(config)}>
            🤖 Générer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Jour 3 : Modal STATIC

#### Fichier : src/components/proposals/clause-selector-modal.tsx (nouveau)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ClauseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (blockKey: string, variables: Record<string, string>) => void;
  category: string;
  companyId: string;
}

export function ClauseSelectorModal({
  isOpen,
  onClose,
  onApply,
  category,
  companyId,
}: ClauseSelectorModalProps) {
  const [clauses, setClauses] = useState<any[]>([]);
  const [selectedClause, setSelectedClause] = useState<any | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/companies/${companyId}/content-blocks?category=${category}`)
        .then(r => r.json())
        .then(setClauses);
    }
  }, [isOpen, category, companyId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>📋 Sélectionner une clause</DialogTitle>
        </DialogHeader>

        {/* Badge pré-approuvé */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-sm text-green-800">
              Contenu pré-approuvé par le département juridique
            </span>
          </div>
        </div>

        {/* Liste des clauses */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {clauses.map((clause) => (
            <div
              key={clause.id}
              className={`p-3 border rounded-lg cursor-pointer transition ${
                selectedClause?.id === clause.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedClause(clause)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={selectedClause?.id === clause.id}
                  readOnly
                />
                <div>
                  <div className="font-medium">{clause.name}</div>
                  <div className="text-xs text-gray-500">
                    v{clause.version} • {clause.legalReviewStatus === 'approved' ? '✓ Approuvé' : '⏳ En attente'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Variables */}
        {selectedClause && selectedClause.variables?.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Variables à compléter</h4>
            {selectedClause.variables.map((v: any) => (
              <div key={v.key}>
                <label className="text-sm text-gray-600">
                  {v.key} {v.required && <span className="text-red-500">*</span>}
                </label>
                <Input
                  value={variables[v.key] || v.defaultValue || ''}
                  onChange={(e) => setVariables({ ...variables, [v.key]: e.target.value })}
                  placeholder={v.defaultValue}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!selectedClause}
            onClick={() => onApply(selectedClause.blockKey, variables)}
          >
            Utiliser ce contenu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Jour 4 : Modal HYBRID

Similaire au modal RAG mais avec sélection de template + checkbox enrichissement.

### Critères de succès Phase 4
- [ ] 3 modals fonctionnels
- [ ] Variables STATIC validées avant soumission
- [ ] Preview sources RAG visible
- [ ] UX review passée

---

## PHASE 5 : UI Section Editor (5 jours)

### Jour 1 : Navigation sections avec badges

#### Fichier : src/components/proposals/section-sidebar.tsx (nouveau)
```typescript
'use client';

import { cn } from '@/lib/utils';
import type { ContentType, GenerationStrategy } from '@/types/content-types';

interface Section {
  id: string;
  title: string;
  type: ContentType;
  strategy: GenerationStrategy;
  status: 'empty' | 'draft' | 'generated' | 'approved';
  wordCount?: number;
}

interface SectionSidebarProps {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
}

const STRATEGY_BADGES = {
  static: { icon: '📋', label: 'Pré-approuvé', color: 'bg-green-100 text-green-800' },
  rag: { icon: '🤖', label: 'IA', color: 'bg-blue-100 text-blue-800' },
  hybrid: { icon: '🔀', label: 'Hybride', color: 'bg-yellow-100 text-yellow-800' },
};

const STATUS_ICONS = {
  empty: '⏳',
  draft: '📝',
  generated: '✅',
  approved: '✓',
};

export function SectionSidebar({ sections, activeId, onSelect }: SectionSidebarProps) {
  const completedCount = sections.filter(s => s.status === 'generated' || s.status === 'approved').length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return (
    <div className="w-64 border-r bg-gray-50 h-full">
      {/* Progress */}
      <div className="p-4 border-b">
        <div className="text-sm font-medium mb-2">Progression</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {completedCount}/{sections.length} sections
        </div>
      </div>

      {/* Sections list */}
      <div className="p-2 space-y-1">
        {sections.map((section) => {
          const badge = STRATEGY_BADGES[section.strategy];
          return (
            <div
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={cn(
                'p-3 rounded-lg cursor-pointer transition',
                activeId === section.id
                  ? 'bg-blue-100 border border-blue-300'
                  : 'hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-2">
                <span>{STATUS_ICONS[section.status]}</span>
                <span className="text-sm font-medium truncate flex-1">
                  {section.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs px-1.5 py-0.5 rounded', badge.color)}>
                  {badge.icon} {badge.label}
                </span>
                {section.wordCount && (
                  <span className="text-xs text-gray-500">{section.wordCount} mots</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Jour 2-3 : Section Editor

#### Fichier : src/components/proposals/section-editor.tsx (nouveau)
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { GenerationConfigModal } from './generation-config-modal';
import { ClauseSelectorModal } from './clause-selector-modal';
import type { GenerationStrategy } from '@/types/content-types';

interface SectionEditorProps {
  section: {
    id: string;
    title: string;
    type: string;
    strategy: GenerationStrategy;
    content?: string;
    isLocked?: boolean;
    approvalStatus?: 'pending' | 'approved';
    sources?: any[];
  };
  onSave: (content: string) => void;
  onGenerate: (config: any) => void;
}

export function SectionEditor({ section, onSave, onGenerate }: SectionEditorProps) {
  const [content, setContent] = useState(section.content || '');
  const [isLocked, setIsLocked] = useState(section.isLocked || section.strategy === 'static');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showClauseModal, setShowClauseModal] = useState(false);

  const handleUnlock = () => {
    if (confirm('Déverrouiller ce contenu le marquera comme "non approuvé". Continuer?')) {
      setIsLocked(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {section.strategy === 'static' && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                📋 Contenu pré-approuvé
              </span>
            )}
            {section.strategy === 'rag' && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                🤖 Généré par IA
              </span>
            )}
            {section.strategy === 'hybrid' && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                🔀 Template + IA
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {section.strategy === 'static' && !content && (
            <Button onClick={() => setShowClauseModal(true)}>
              Choisir une clause
            </Button>
          )}
          {section.strategy !== 'static' && (
            <Button onClick={() => setShowConfigModal(true)}>
              {content ? '🔄 Régénérer' : '🤖 Générer'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {content ? (
        <div className="border rounded-lg">
          {isLocked ? (
            <div>
              <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  🔒 Contenu verrouillé (pré-approuvé)
                </span>
                <Button variant="ghost" size="sm" onClick={handleUnlock}>
                  Déverrouiller pour modifier
                </Button>
              </div>
              <div className="p-4 prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          ) : (
            <RichTextEditor
              value={content}
              onChange={setContent}
              onSave={() => onSave(content)}
            />
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <p className="text-gray-600 mb-4">
            Aucun contenu pour cette section
          </p>
          <Button onClick={() => {
            section.strategy === 'static'
              ? setShowClauseModal(true)
              : setShowConfigModal(true);
          }}>
            {section.strategy === 'static' ? 'Choisir une clause' : 'Générer le contenu'}
          </Button>
        </div>
      )}

      {/* Sources (RAG only) */}
      {section.strategy === 'rag' && section.sources?.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Sources utilisées</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {section.sources.map((source, i) => (
              <li key={i}>• {source.title || source.rfpId}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Modals */}
      <GenerationConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onGenerate={(config) => {
          onGenerate(config);
          setShowConfigModal(false);
        }}
        sectionTitle={section.title}
        strategy={section.strategy as 'rag' | 'hybrid'}
        availableSources={[]}
      />

      <ClauseSelectorModal
        isOpen={showClauseModal}
        onClose={() => setShowClauseModal(false)}
        onApply={(blockKey, variables) => {
          // Appeler API pour récupérer le contenu
          setShowClauseModal(false);
        }}
        category={section.type}
        companyId=""
      />
    </div>
  );
}
```

### Jour 4-5 : Tests E2E

```typescript
// tests/e2e/proposal-workflow.spec.ts

import { test, expect } from '@playwright/test';

test('Workflow complet proposition', async ({ page }) => {
  // 1. Upload document
  await page.goto('/companies/test/rfps');
  await page.click('[data-testid="new-proposal"]');
  await page.setInputFiles('input[type="file"]', 'fixtures/sample-proposal.pdf');

  // 2. Vérifier détection type
  await page.waitForSelector('[data-testid="type-badge-business_proposal"]');

  // 3. Vérifier sections détectées
  const sections = await page.locator('[data-testid="section-item"]');
  expect(await sections.count()).toBeGreaterThan(3);

  // 4. Générer section STATIC
  await page.click('text=Termes et conditions');
  await page.click('text=Choisir une clause');
  await page.click('text=Termes et conditions standard');
  await page.fill('input[name="clientName"]', 'Acme Corp');
  await page.click('text=Utiliser ce contenu');

  // Vérifier badge pré-approuvé
  await expect(page.locator('text=Contenu pré-approuvé')).toBeVisible();

  // 5. Générer section RAG
  await page.click('text=Résumé exécutif');
  await page.click('text=Générer');
  await page.waitForSelector('[data-testid="generation-complete"]');

  // 6. Export
  await page.click('text=Exporter');
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toContain('.docx');
});
```

### Critères de succès Phase 5
- [ ] Navigation sections avec badges fonctionne
- [ ] Lock/unlock STATIC fonctionne
- [ ] Streaming visible pour RAG
- [ ] Tests E2E passent

---

## PHASE 6 : Export + Templates (5 jours)

### Jour 1-2 : Export Word adapté

#### Modifier : src/lib/export/word-exporter.ts
```typescript
// Ajouter support pour sections

function exportSection(section: ContentItem, doc: Document) {
  // Titre de section
  doc.addParagraph(
    new Paragraph({
      text: section.sectionTitle || section.questionText,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  // Badge stratégie (commentaire invisible dans Word)
  // ...

  // Contenu
  const response = section.responses?.[0];
  if (response?.responseText) {
    // Parser le markdown en paragraphes Word
    const paragraphs = parseMarkdownToWord(response.responseText);
    paragraphs.forEach(p => doc.addParagraph(p));
  }
}
```

### Jour 3 : Seed data clauses

#### Fichier : scripts/seed-content-blocks.ts
```typescript
import { db } from '@/db';
import { contentBlocks } from '@/db/schema';

const DEFAULT_BLOCKS = [
  {
    blockKey: 'legal_terms_standard',
    category: 'legal',
    name: 'Termes et conditions standard',
    content: `## Termes et Conditions

### 1. Définitions
- **"Client"** désigne {{clientName}}
- **"Fournisseur"** désigne {{companyName}}
- **"Date d'effet"** désigne le {{effectiveDate}}

### 2. Objet du contrat
Le présent contrat définit les modalités...

### 3. Durée et résiliation
...

### 4. Conditions de paiement
- Acompte: 30% à la signature
- Mi-parcours: 40%
- Final: 30%
...`,
    variables: [
      { key: 'clientName', required: true },
      { key: 'companyName', required: true },
      { key: 'effectiveDate', required: true },
    ],
    language: 'fr',
    legalReviewStatus: 'approved',
  },
  {
    blockKey: 'insurance_standard',
    category: 'insurance',
    name: 'Assurances et conformité',
    content: `## Assurances et Conformité

### Couvertures
- Responsabilité civile: 2 000 000 $
- Responsabilité professionnelle: 2 000 000 $
- Cyber-responsabilité: 1 000 000 $

### Certifications
- ISO 27001
- SOC 2 Type II
...`,
    variables: [{ key: 'companyName', required: true }],
    language: 'fr',
    legalReviewStatus: 'approved',
  },
  {
    blockKey: 'nda_standard',
    category: 'confidentiality',
    name: 'Clause de confidentialité',
    content: `## Confidentialité

{{companyName}} s'engage à protéger toutes les informations confidentielles de {{clientName}}...`,
    variables: [
      { key: 'clientName', required: true },
      { key: 'companyName', required: true },
    ],
    language: 'fr',
    legalReviewStatus: 'approved',
  },
  {
    blockKey: 'guarantees_standard',
    category: 'guarantee',
    name: 'Garanties standard',
    content: `## Garanties

### Période de garantie
{{warrantyPeriod}} à compter de la livraison finale...`,
    variables: [
      { key: 'companyName', required: true },
      { key: 'warrantyPeriod', required: true, defaultValue: '90 jours' },
    ],
    language: 'fr',
    legalReviewStatus: 'approved',
  },
  {
    blockKey: 'methodology_framework',
    category: 'methodology',
    name: 'Framework méthodologique Agile',
    content: `## Notre méthodologie

Notre approche en {{projectType}} combine:
- **Agilité** dans l'exécution
- **Rigueur** dans la gouvernance

### Phases
1. Découverte et cadrage
2. Conception
3. Réalisation (sprints 2 semaines)
4. Déploiement
5. Accompagnement`,
    variables: [
      { key: 'projectType', required: true, defaultValue: 'transformation digitale' },
    ],
    language: 'fr',
    legalReviewStatus: 'approved',
  },
];

async function seedContentBlocks(companyId: string) {
  for (const block of DEFAULT_BLOCKS) {
    await db.insert(contentBlocks).values({
      companyId,
      ...block,
      version: 1,
      isActive: true,
    }).onConflictDoNothing();
  }
  console.log(`Seeded ${DEFAULT_BLOCKS.length} content blocks for ${companyId}`);
}

// Exécuter pour chaque company
// seedContentBlocks('company-id');
```

### Jour 4-5 : Templates de propositions

Créer 3 templates (mode='template') avec sections pré-configurées.

### Critères de succès Phase 6
- [ ] Export Word avec sections mixtes fonctionne
- [ ] 5 clauses seed data créées
- [ ] 3 templates fonctionnels
- [ ] Template Picker UI fonctionne

---

## PHASE 7 : Admin + Polish (5 jours)

### Jour 1-2 : Page admin bibliothèque clauses

#### Fichier : src/app/(dashboard)/companies/[slug]/settings/clauses/page.tsx
```typescript
// Implémenter selon wireframe dans MISE-A-JOUR-UX-SECTIONS-STATIQUES.md
```

### Jour 3 : Workflow approbation

API pour approuver/rejeter clauses + notifications.

### Jour 4 : User testing

- [ ] Recruter 3 utilisateurs
- [ ] Préparer scénarios de test
- [ ] Collecter feedback
- [ ] Documenter issues

### Jour 5 : Bug fixes + documentation

### Critères de succès Phase 7
- [ ] Admin clauses complet
- [ ] User testing satisfaction ≥ 7/10
- [ ] Documentation complète
- [ ] 0 bugs critiques

---

## PHASE 8 : Déploiement (3 jours)

### Jour 1 : Performance testing
- [ ] Génération STATIC < 1s
- [ ] Génération RAG < 15s
- [ ] Parsing < 30s
- [ ] Export < 10s

### Jour 2 : Staging
- [ ] Déploiement staging
- [ ] Tests smoke
- [ ] Validation équipe

### Jour 3 : Production
- [ ] Déploiement production
- [ ] 1 client pilote
- [ ] Monitoring actif

---

## Résumé des livrables par phase

| Phase | Durée | Livrables clés |
|-------|-------|----------------|
| 0 | 5j | Wireframes validés |
| 1 | 5j | DB + Types + ClauseLibrary |
| 2 | 5j | Détection + Parsing |
| 3 | 5j | 3 stratégies génération |
| 4 | 4j | Modals configuration |
| 5 | 5j | UI Section Editor |
| 6 | 5j | Export + Templates + Seed |
| 7 | 5j | Admin + User testing |
| 8 | 3j | Production |
| **TOTAL** | **38j** | **MVP complet** |

---

## Dépendances techniques

```bash
# Nouvelles dépendances à installer
npm install handlebars  # Pour substitution variables clauses
```

## Variables d'environnement requises

```bash
OPENAI_API_KEY=sk-...       # GPT-5 pour détection/parsing
ANTHROPIC_API_KEY=sk-ant-... # Claude Sonnet 4.5 pour génération
```

---

**Document prêt pour Claude Code**
**Date:** 2025-11-22
**Version:** 1.0
