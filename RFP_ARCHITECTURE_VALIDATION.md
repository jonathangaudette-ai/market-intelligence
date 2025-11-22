# RFP Module Architecture Validation Report

## Executive Summary

The RFP module is a comprehensive, production-ready system for managing Requests for Proposals with:
- **2,239 lines** of business logic and services
- **26 React components** for UI/UX
- **40+ API routes** for backend operations
- **Multi-tenant architecture** with PostgreSQL + Pinecone RAG
- **AI-powered workflows** using GPT-5, Claude Sonnet 4.5, and Claude Haiku 4.5

---

## 1. DATABASE SCHEMA

### Location
`/home/user/market-intelligence/src/db/schema.ts` (585 lines)

### Core RFP Tables

#### **rfps** (Main RFP table)
```typescript
- id: UUID (primary key)
- title: varchar(500)
- clientName: varchar(255)
- clientIndustry: varchar(100)
- mode: 'active' | 'historical' | 'template' (NEW - for surgical retrieval)
- isHistorical: boolean
- originalFilename, originalFileUrl, fileSizeBytes, fileType
- parsingStatus: 'pending' | 'processing' | 'extracted' | 'completed' | 'failed'
- parsingStage, parsingProgressCurrent, parsingProgressTotal
- questionsExtracted: integer
- parsingLogs: jsonb (Array<{timestamp, type, stage, message, metadata}>)
- extractedQuestions: jsonb (temporary storage)
- submissionDeadline, clientContactName, clientContactEmail, estimatedDealValue
- knownCompetitors: jsonb
- extractedText: text (full PDF text for RAG)
- manualEnrichment: jsonb ({clientBackground, keyNeeds, constraints, relationships, customNotes})
- linkedinEnrichment: jsonb ({companyName, companyUrl, employeeCount, industry, etc.})
- status: 'draft' | 'in_progress' | 'in_review' | 'approved' | 'submitted' | 'won' | 'lost'
- completionPercentage: 0-100
- result: 'won' | 'lost' | 'no_decision'
- resultCompetitor, resultNotes, resultRecordedAt
- ownerId: FK(users.id)
- assignedUsers: jsonb (array of user IDs)
- companyId: FK(companies.id) - REQUIRED
- submittedDocument, outcomeNotes, qualityScore (0-100)
- usageCount: how many times used as source
- lastUsedAt: timestamp
- dealValue: actual deal value if won
- intelligenceBrief: jsonb (AI-generated brief)
- metadata: jsonb
- createdAt, updatedAt, submittedAt
```

#### **rfpQuestions** (Questions table)
```typescript
- id: UUID
- rfpId: FK(rfps.id) - CASCADE
- sectionTitle: varchar(500)
- questionNumber: varchar(50)
- questionText: text (NOT NULL)
- requiresAttachment: boolean
- wordLimit: integer
- category: varchar(100) (technical, pricing, company_info, etc.)
- tags: jsonb
- difficulty: 'easy' | 'medium' | 'hard'
- estimatedMinutes: integer

# NEW - Content Type & Surgical Retrieval
- contentTypes: jsonb (Array<string>)
- primaryContentType: varchar(100)
- detectionConfidence: 0-100
- selectedSourceRfpId: FK(rfps.id) - optional
- adaptationLevel: 'verbatim' | 'light' | 'contextual' | 'creative'
- appliedFromSettings: boolean

- status: 'pending' | 'in_progress' | 'completed' | 'reviewed'
- assignedTo: FK(users.id)
- hasResponse: boolean
- responseQuality: 1-5 rating
- metadata: jsonb
- createdAt, updatedAt
```

#### **rfpResponses** (Responses/Answers table)
```typescript
- id: UUID
- questionId: FK(rfpQuestions.id) - CASCADE
- responseText: text
- responseHtml: text (formatted)
- wordCount: integer
- wasAiGenerated: boolean
- aiModel: varchar(100)
- sourcesUsed: jsonb (source references)
- confidenceScore: 0-100

# NEW - Surgical Retrieval Metadata
- sourceRfpIds: jsonb (string[] - RFP IDs used as sources)
- adaptationUsed: 'verbatim' | 'light' | 'contextual' | 'creative'

- version: integer (default 1)
- previousVersionId: varchar(255)
- status: 'draft' | 'in_review' | 'approved'
- reviewedBy: FK(users.id)
- reviewedAt: timestamp
- reviewNotes: text
- createdBy: FK(users.id) - NOT NULL
- metadata: jsonb
- createdAt, updatedAt
```

#### **rfpSourcePreferences** (NEW - Smart Configuration table)
```typescript
- id: UUID
- rfpId: FK(rfps.id) - UNIQUE
- defaultSourceStrategy: 'auto' | 'manual' | 'hybrid' (default: hybrid)
- defaultAdaptationLevel: 'verbatim' | 'light' | 'contextual' | 'creative'
- suggestedSources: jsonb (Record<ContentType, string[]>) - Top 3 sources per type
- globalMandateContext: text
- preferWonRfps: boolean (default: true)
- minQualityScore: integer (default: 70)
- createdAt, updatedAt
```

### Relations
```
rfps 1 --* rfpQuestions
rfps 1 --* rfpResponses (indirect via rfpQuestions)
rfps 1 --1 rfpSourcePreferences
rfpQuestions 1 --* rfpResponses
users 1 --* rfps (owner)
users 1 --* rfpResponses (createdBy)
companies 1 --* rfps
```

### Supporting Tables (Multi-tenant)
- **companies**: Company with settings (aiModel config)
- **companyMembers**: Role-based access (admin, editor, viewer)
- **users**: Authentication
- **documents**: General document storage (supports RFP mode: 'rfp')
- **conversations**: Chat context
- **messages**: Chat messages with RAG sources
- **signals**: Competitive intelligence signals
- **competitors**: Competitor tracking
- **promptTemplates**: Configurable AI prompts

---

## 2. SERVICES LAYER

### Location
`/home/user/market-intelligence/src/lib/rfp/` (2,239 lines)
`/home/user/market-intelligence/src/lib/prompts/`
`/home/user/market-intelligence/src/lib/rag/`

### Core Services

#### **A. Prompt Service** (`src/lib/prompts/service.ts`)
**Purpose**: Centralized management of AI prompts with versioning and caching

**Key Methods**:
```typescript
- getPrompt(companyId, promptKey) → PromptTemplate
  - Priority: DB (cached) → Default → Error
- renderPromptWithVariables(template, variables) → RenderedPrompt
- savePrompt(companyId, promptKey, data, userId) → PromptTemplate (creates version)
- getVersions(companyId, promptKey) → PromptTemplate[]
- restoreVersion(companyId, promptKey, versionId, userId)
- resetToDefault(companyId, promptKey)
- listPrompts(companyId, options?) → PromptTemplate[]
```

**Features**:
- In-memory LRU cache (50 entries) with 15-minute expiry
- Automatic versioning (keeps last 10 versions)
- Feature flags for gradual rollout
- Metrics tracking (execution time, tokens, errors)
- Support for 17+ prompt keys across 6 categories

**Categories**:
```typescript
- rfp_generation (2 prompts: main, legacy)
- question_analysis (4 prompts: single, batch, extract, content type detect)
- historical_import (2 prompts: parse response, match Q&A)
- intelligence (1 prompt: brief generation)
- enrichment (1 prompt: AI enrichment)
- document_analysis (2 prompts: support analysis, preprocessing)
- chat (1 prompt: RAG synthesis)
- competitive (1 prompt: positioning)
```

**Database Schema**:
```typescript
promptTemplates table:
- promptKey: unique identifier (e.g., 'rfp_response_main')
- category: organization category
- systemPrompt: optional system instructions
- userPromptTemplate: main template (supports {{variable}} syntax)
- modelId: optional model override
- temperature: 0-2 (optional)
- maxTokens: optional limit
- variables: jsonb array with metadata
- version: incremental version number
- isActive: only latest active is used
```

#### **B. RAG Engine** (`src/lib/rag/engine.ts`)

**Multi-tenant RAG Engine**:
```typescript
- UpsertDocumentParams: Add docs with chunking & metadata
- QueryParams: Search with company isolation
- ChatParams: RAG + LLM synthesis
- RAGSource: Retrieved chunk with metadata
```

**Namespace Strategy**:
- Shared Pinecone index across all modules
- Company isolation via tenant_id in metadata
- RFP-specific namespace: 'rfp-library'
- Document purpose: 'rfp_support', 'rfp_response', 'company_info'

#### **C. Dual Query Retrieval Engine** (`src/lib/rag/dual-query-engine.ts`)

**Phase 0.5 - Support Docs RAG v4.0**

**Three-Phase Retrieval Strategy**:
1. **Pinned Source** (40% budget) - Optional specific RFP to use
2. **Support Docs** (30% budget) - Company knowledge base
3. **Historical RFPs** (30% budget) - Past responses as sources

**Scoring Breakdown**:
- Semantic similarity: Via vector search
- Outcome score: Won > Pending > Lost
- Recency score: Decay 5% per month
- Industry match: Same industry preferred
- Quality score: Based on quality_score in DB

**Returns**:
```typescript
RetrievalResult:
- chunks: Array with composite scoring
- sources: Grouped by source RFP/document
- metadata: Counts by source type
```

#### **D. Content Type Detector** (`src/lib/rfp/content-type-detector.ts`)

**Purpose**: Classify RFP questions for surgical retrieval

**Tiered Strategy**:
1. First pass: Claude Haiku 4.5 (fast, cheap)
2. Retry: Claude Sonnet 4.5 if confidence < 85%

**11 Content Types** (with French descriptions):
```typescript
- 'company-overview'     // Description entreprise
- 'corporate-info'       // Info corporative
- 'team-structure'       // Structure et organigramme
- 'company-history'      // Historique et réalisations
- 'values-culture'       // Valeurs et culture
- 'product-description'  // Descriptions de produits
- 'service-offering'     // Offres de services
- 'project-methodology'  // Méthodologie de projet
- 'technical-solution'   // Solutions techniques
- 'project-timeline'     // Échéanciers et planification
- 'pricing-structure'    // Structure de prix
```

**Output**:
```typescript
ContentTypeDetection:
- contentTypes: string[] (all applicable types)
- primaryContentType: string (most relevant)
- confidence: number (0.0-1.0)
```

#### **E. Smart Defaults Service** (`src/lib/rfp/smart-defaults.ts`)

**Purpose**: Automatic source configuration using AI

**Process**:
1. Detect content types for all questions
2. Find top 3 historical RFPs per content type
3. Save configuration to rfpSourcePreferences
4. Update questions with classifications

**Returns**:
```typescript
SmartDefaultsResult:
- suggestedSources: Record<ContentType, string[]>
- questionsClassified: number
- averageConfidence: number
- contentTypeBreakdown: Record<ContentType, number>
```

#### **F. Source Scoring Service** (`src/lib/rfp/source-scoring.ts`)

**Purpose**: Rank historical RFPs for content reuse

**Scoring Factors** (weighted):
```
- Semantic similarity: 40% (Pinecone vector search)
- Outcome: 30% (won=100, pending=50, lost=30)
- Recency: 15% (5% decay per month)
- Industry match: 10%
- Content quality: 5% (quality_score in DB)
```

**Returns**: Top N RFPs sorted by composite score

#### **G. AI Enrichment Service** (`src/lib/rfp/services/ai-enrichment.service.ts`)

**Purpose**: Auto-enrich RFP context using Claude Haiku 4.5

**Inputs**:
```typescript
EnrichmentContext:
- clientName: string
- clientIndustry?: string
- rfpText?: string
- linkedinData?: {description, industry, employeeCount, etc.}
- existingEnrichment?: {clientBackground, keyNeeds, constraints, etc.}
- knowledgeBaseChunks?: Array<{text, source, score}>
```

**Outputs**:
```typescript
AIEnrichmentResult:
- clientBackground: string
- keyNeeds: string
- constraints: string
- relationships: string
- customNotes: string
- confidence: number
- model: string
```

**Features**:
- Caching support (uses Redis)
- Fallback to Claude Sonnet 4.5
- Model selection (haiku vs sonnet)

#### **H. Parser Service** (`src/lib/rfp/parser/parser-service.ts`)

**Supports**: PDF, DOCX, XLSX

**Methods**:
```typescript
- parseDocument(fileUrl, fileType) → ParsedDocument
- extractSections(text) → Array<{title, content, startIndex}>
```

**Sub-parsers**:
- PDF: Using pdf-parse library
- DOCX: Using mammoth library
- XLSX: Using exceljs library

#### **I. Question Extractor** (`src/lib/rfp/parser/question-extractor.ts`)

**Purpose**: Extract questions from RFP documents using GPT-5

**Uses**: GPT-5 with JSON mode (structured output)

**Output**: `ExtractedQuestion[]`
```typescript
- sectionTitle?: string
- questionNumber?: string
- questionText: string
- requiresAttachment?: boolean
- wordLimit?: number
- characterLimit?: number
- pageLimit?: number
```

#### **J. Intelligence Brief Generator** (`src/lib/rfp/intelligence-brief.ts`)

**Purpose**: Go/No-Go decision support using GPT-5

**Output Type**: `RFPIntelligenceBrief`
```typescript
- overview: {projectType, industry, estimatedBudget, estimatedDuration, scope}
- qualificationCriteria: {mandatory[], preferred[], disqualifiers[]}
- restrictiveClauses: {penalties[], exclusions[], liabilityRisks[], redFlags[]}
- functionalScope: {coreRequirements[], technicalRequirements[], deliverables[]}
- evaluationCriteria: {scoring[], totalPoints, passingScore}
- riskFactors: RiskFactor[] (severity: critical|high|medium|low)
- unusualRequirements: UnusualRequirement[] (why, impact)
- recommendation: {goNoGo: GO|CAUTION|NO_GO, reasoning, confidence, keyConsiderations[]}
- generatedAt, modelUsed, version
```

#### **K. Claude AI Service** (`src/lib/rfp/ai/claude.ts`)

**Key Functions**:
```typescript
- generateRFPResponse(params) → string
  Inputs: question, context, clientName?, clientIndustry?, additionalInstructions?
  Model: Claude Sonnet 4.5
  Features: Custom prompts, context injection, tone control

- categorizeQuestion(question) → {category, tags[], difficulty, estimatedMinutes}
  Model: Claude Sonnet 4.5
  Categories: technical, pricing, company_info, case_study, compliance, etc.

- categorizeQuestionsBatch(questions[]) → Array<categorization>
  Model: Claude Sonnet 4.5
  Optimized for parallel processing
```

#### **L. Pinecone Integration** (`src/lib/rfp/pinecone.ts`)

**Namespace Strategy**:
```typescript
- getRFPNamespace() → namespace('rfp-library')
- getRFPContextNamespace(rfpId) → namespace(`rfp-context-${rfpId}`)
```

**Vector Metadata** (RFPVectorMetadata):
```typescript
// Core fields
- documentId: string (tenant isolation key)
- tenant_id: string (company ID)
- documentType: 'company_info' | 'product_doc' | 'past_rfp' | 'answer_library' | 'competitive_intel' | 'rfp_content'
- text: string
- source?: string
- createdAt: string

// NEW: Support Docs RAG v4
- documentPurpose?: 'rfp_support' | 'rfp_response' | 'company_info'
- contentType?: string (methodology_guide, case_study, technical_spec)
- contentTypeTags?: string[]
- isHistoricalRfp?: boolean
- category?: string

// Optional fields
- questionCategory?: string
- questionTags?: string[]
- responseQuality?: number
- timesUsed?: number
- rfpId?, rfpTitle?, clientName?
- wonLost?: 'won' | 'lost'
```

#### **M. Streaming Generator** (`src/lib/rfp/streaming-generator.ts`)

**Purpose**: Real-time streaming responses for AI generation

**Features**:
- Server-sent events (SSE)
- Chunk buffering
- Error handling with fallback
- Token counting

---

## 3. API ROUTES

### Location
`/home/user/market-intelligence/src/app/api/companies/[slug]/rfps/`

### Route Pattern
All routes follow the auth pattern:
```
1. Extract params from URL (slug, id, questionId, etc.)
2. Auth check: auth() session
3. Company access: getCompanyBySlug(slug)
4. Permission check: hasPermission(role, required_level)
5. Query/Execute business logic
6. Return NextResponse.json()
```

### Complete Route List (40+ endpoints)

**RFP CRUD**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps` | GET | List all RFPs for company |
| `/rfps` | POST | Create new RFP |
| `/rfps/[id]` | GET | Fetch RFP with questions |
| `/rfps/[id]` | PUT | Update RFP |
| `/rfps/[id]` | DELETE | Delete RFP |

**RFP Processing**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps/[id]/parse` | POST | Parse uploaded document → extract text |
| `/rfps/[id]/categorize` | POST | Categorize questions (batch) |
| `/rfps/[id]/smart-configure` | POST | Generate smart defaults |
| `/rfps/[id]/generate-brief` | POST | Generate intelligence brief |
| `/rfps/[id]/enrichment` | POST | AI enrichment (full context) |
| `/rfps/[id]/enrich-linkedin` | POST | Fetch LinkedIn data |
| `/rfps/[id]/enrich-ai` | POST | AI enrichment only |

**Questions**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps/[id]/questions` | GET | List questions |
| `/rfps/[id]/questions` | POST | Create/import questions |
| `/rfps/[id]/questions/[questionId]` | GET | Get single question |
| `/rfps/[id]/questions/[questionId]` | PUT | Update question |
| `/rfps/[id]/questions/[questionId]/assign` | POST | Assign to user |
| `/rfps/[id]/questions/[questionId]/response` | GET | Fetch response |
| `/rfps/[id]/questions/[questionId]/response` | POST | Save response |
| `/rfps/[id]/questions/[questionId]/generate-response` | POST | AI generate |
| `/rfps/[id]/questions/[questionId]/versions` | GET | Response history |
| `/rfps/[id]/questions/bulk-assign` | POST | Assign multiple |
| `/rfps/[id]/questions/bulk-generate` | POST | Generate multiple |

**Export & Library**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps/[id]/export` | GET | Export to PDF |
| `/rfps/[id]/questions-with-responses` | GET | Full Q&A export |
| `/rfps/library` | GET | Historical RFPs library |

**Progress & Status**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps/[id]/progress` | GET | Completion %age |
| `/rfps/[id]/suggest-sources` | POST | Find source RFPs |

**Analytics**:
| Route | Method | Purpose |
|-------|--------|---------|
| `/rfps/[id]/rfp-stats` | GET | RFP statistics |

### Key Route Details

**POST `/rfps/[id]/questions/[questionId]/generate-response`**
```typescript
Request body:
{
  mode: 'standard' | 'with_context' | 'manual',
  customContext?: string,
  depth: 'basic' | 'advanced'
}

Uses:
- DualQueryRetrievalEngine (RAG)
- PromptService (configurable prompts)
- GPT-5 or Claude Sonnet 4.5
- Surgical retrieval (selected source RFP)
```

**POST `/rfps/[id]/smart-configure`**
```typescript
Response:
{
  suggestedSources: Record<ContentType, string[]>,
  questionsClassified: number,
  averageConfidence: number,
  contentTypeBreakdown: Record<ContentType, number>
}

Process:
1. Classify all questions
2. Score historical RFPs
3. Save to rfpSourcePreferences
4. Update questions with classifications
```

**POST `/rfps/[id]/parse`**
```typescript
Request body:
{
  fileUrl: string,
  fileType: 'pdf' | 'docx' | 'xlsx'
}

Updates RFP with:
- parsingStatus: 'extracted'
- parsingLogs: Array<{timestamp, type, stage, message, metadata}>
- extractedText: full PDF text
- extractedQuestions: temporary storage
```

---

## 4. REACT COMPONENTS

### Location
`/home/user/market-intelligence/src/components/rfp/` (26 components)

### Component Hierarchy

**Main Views**:
1. **RFP Detail View** (`rfp-detail-view.tsx`)
   - Entry point for RFP workspace
   - Tabs: Overview, Questions, Intelligence Brief, Timeline

2. **RFP Library** (`rfp-library-client.tsx`)
   - List/filter historical RFPs
   - Used as source reference
   - Filter by result (won/lost/pending)

3. **Question List** (`question-list.tsx`)
   - List all RFP questions
   - Bulk actions bar
   - Inline generation
   - Sorting/filtering

**Modals & Forms**:
1. **Question Detail Modal** (`question-detail-modal.tsx`)
   - Full question details
   - Metadata (difficulty, word limit, etc.)
   - Response editor integrated

2. **Response Editor** (`response-editor.tsx`)
   - Rich text editor (Tiptap)
   - Word count tracking
   - Auto-save (2s delay)
   - AI generation button
   - Model selection

3. **AI Dialog** (in response-editor)
   - Mode: standard, with_context, manual
   - Depth: basic, advanced
   - Custom context input
   - Streaming generation

4. **Response Version History** (`response-version-history.tsx`)
   - Timeline of edits
   - Revision comparison
   - Restore previous version

**Support Components**:
1. **Enrichment Form** (`enrichment-form.tsx`)
   - Client background
   - Key needs
   - Constraints
   - Relationships
   - Custom notes

2. **Parsing Progress** (`parsing-progress.tsx`)
   - Real-time parsing status
   - Progress bar with stages
   - Extracted question count
   - Error display

3. **Smart Configure Button** (`smart-configure-button.tsx`)
   - Triggers AI configuration
   - Shows progress
   - Displays results

4. **Intelligence Brief View** (`intelligence-brief-view.tsx`)
   - Displays AI-generated brief
   - Sections: Overview, Qualification, Risks, Recommendation
   - Charts for scoring distribution

5. **Bulk Actions Bar** (`bulk-actions-bar.tsx`)
   - Multi-select actions
   - Assign to user
   - Bulk generate
   - Bulk categorize

6. **Historical Import Form** (`historical-import-form.tsx`)
   - Import past RFP responses
   - Match Q&A mapping
   - Confidence threshold

7. **Inline Bulk Generator** (`inline-bulk-generator.tsx`)
   - Generate multiple responses
   - Progress tracking
   - Error handling

8. **Upload Form** (`upload-form.tsx`)
   - File dropzone
   - Multiple file support
   - Progress tracking

**UI Utilities**:
- `file-dropzone.tsx`: Reusable dropzone
- `pdf-download-button.tsx`: Export to PDF
- `export-button.tsx`: Export functionality
- `assignment-button.tsx`: Assign to user
- `source-indicator-badge.tsx`: Shows source RFP
- `question-preview.tsx`: Quick question preview
- `event-timeline.tsx`: Activity timeline
- `batch-chart.tsx`: Batch processing visualization
- `intelligence-brief-charts.tsx`: Chart components

---

## 5. TYPES & INTERFACES

### Main Type Files

**`/src/types/rfp-intelligence.ts`** (110 lines)
```typescript
RFPIntelligenceBrief:
├── overview {projectType, industry, estimatedBudget, estimatedDuration, scope}
├── qualificationCriteria {mandatory[], preferred[], disqualifiers[]}
├── restrictiveClauses {penalties[], exclusions[], liabilityRisks[], redFlags[]}
├── functionalScope {coreRequirements[], technicalRequirements[], deliverables[]}
├── evaluationCriteria {scoring[], totalPoints, passingScore}
├── riskFactors[] (severity: critical|high|medium|low, mitigation)
├── unusualRequirements[] (why, impact)
├── recommendation {goNoGo: GO|CAUTION|NO_GO, reasoning, confidence, keyConsiderations[]}
└── metadata {generatedAt, modelUsed, version}
```

**`/src/types/prompts.ts`** (348 lines)
```typescript
PROMPT_CATEGORIES:
├── RFP_GENERATION
├── QUESTION_ANALYSIS
├── DOCUMENT_ANALYSIS
├── INTELLIGENCE
├── CHAT
└── ENRICHMENT

PROMPT_KEYS: 17 total
├── RFP_RESPONSE_MAIN
├── RFP_RESPONSE_LEGACY
├── QUESTION_CATEGORIZE_SINGLE
├── QUESTION_CATEGORIZE_BATCH
├── QUESTION_EXTRACT
├── CONTENT_TYPE_DETECT
├── INTELLIGENCE_BRIEF
├── AI_ENRICHMENT
├── RAG_CHAT_SYNTHESIS
└── ... (7 more)

PROMPT_VARIABLE_SCHEMAS: Type-safe validation for each prompt

PromptTemplate:
├── id, companyId, promptKey, category
├── systemPrompt?, userPromptTemplate
├── modelId?, temperature?, maxTokens?
├── variables[]
├── version, isActive
└── audit (createdBy, createdAt, updatedAt)
```

**`/src/types/content-types.ts`** (121 lines)
```typescript
ContentType (11 types):
- company-overview, corporate-info, team-structure, company-history
- values-culture, product-description, service-offering, project-methodology
- technical-solution, project-timeline, pricing-structure

AdaptationLevel: 'verbatim' | 'light' | 'contextual' | 'creative'
SourceStrategy: 'auto' | 'manual' | 'hybrid'
RFPMode: 'active' | 'historical' | 'template'

ContentTypeDetection:
├── contentTypes: string[]
├── primaryContentType: string
└── confidence: 0.0-1.0

RFPSourcePreferences:
├── id, rfpId
├── defaultSourceStrategy: SourceStrategy
├── defaultAdaptationLevel: AdaptationLevel
├── suggestedSources: Record<ContentType, string[]>
├── globalMandateContext?: string
├── preferWonRfps: boolean
└── minQualityScore: number
```

**`/src/types/company.ts`** (Inferred from schema)
```typescript
Company:
├── id, name, slug
├── logo?, isActive
├── settings {aiModel?: 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001'}
└── audit (createdAt, updatedAt)

CompanySettings:
└── aiModel: string (claude-sonnet-4-5-20250929 | claude-haiku-4-5-20251001)
```

---

## 6. AI MODEL CONFIGURATION

### Location
`/home/user/market-intelligence/src/lib/constants/ai-models.ts` (68 lines)

### Models in Use

**GPT-5** (OpenAI)
- Model ID: `'gpt-5'`
- Status: ✅ AVAILABLE AND DEPLOYED
- Does NOT support temperature or top_p
- Uses: reasoning.effort ('minimal'|'low'|'medium'|'high')
- Uses: text.verbosity ('low'|'medium'|'high')

**Pre-configured GPT-5 Configs**:
```typescript
GPT5_CONFIGS = {
  extraction: {model: 'gpt-5', reasoning: {effort: 'minimal'}, text: {verbosity: 'low'}},
  parsing: {model: 'gpt-5', reasoning: {effort: 'low'}, text: {verbosity: 'medium'}},
  matching: {model: 'gpt-5', reasoning: {effort: 'medium'}, text: {verbosity: 'medium'}}
}
```

**GPT-4o** (Fallback)
- Model ID: `'gpt-4o'`
- Used when GPT-5 unavailable
- Config: {model: 'gpt-4o', temperature: 0.7, response_format: {type: 'json_object'}}

**Claude Sonnet 4.5** (Anthropic)
- Model ID: `'claude-sonnet-4-5-20250929'`
- Context Window: 200,000 tokens
- Use Cases: Long documents, RFP responses, complex reasoning

**Claude Haiku 4.5** (Anthropic)
- Model ID: `'claude-haiku-4-5-20251001'`
- Use Cases: Fast tasks, cost-optimized, classification, analysis

### Model Selection Matrix

| Task | Primary | Fallback | Rationale |
|------|---------|----------|-----------|
| Question Extraction | GPT-5 (minimal) | GPT-4o | Fast, structured output |
| Document Parsing | GPT-5 (low) | GPT-4o | Structure recognition |
| Semantic Matching | GPT-5 (medium) | Claude Sonnet | Reasoning required |
| RFP Response | Claude Sonnet | GPT-5 | High-quality prose |
| Content Classification | Claude Haiku | Claude Sonnet | Fast, cost-effective |
| Intelligence Brief | GPT-5 | Claude Sonnet | Comprehensive analysis |
| AI Enrichment | Claude Haiku | Claude Sonnet | Speed priority |

---

## 7. AUTHENTICATION & AUTHORIZATION

### Pattern
`/home/user/market-intelligence/src/lib/rfp/auth.ts`

**Hierarchy**:
- admin (level 3): Full access
- editor (level 2): Create/edit RFPs, generate responses
- viewer (level 1): Read-only access

**Permission Checks**:
```typescript
- verifyRFPAuth() → {user, session}
- canCreateRFP() → boolean
- canEditRFP(rfpOwnerId, assignedUsers) → boolean
- getCompanyBySlug(slug) → {company, role}
```

**RFP Ownership**:
- Owner can edit their own RFPs
- Assigned users can edit
- Admins can edit anything
- Super admins bypass all checks

---

## 8. CACHING STRATEGY

**Prompt Service Cache** (LRU):
- Max: 50 entries
- TTL: 15 minutes
- Key: `${companyId}:${promptKey}`
- Invalidated on: save, reset

**RAG Cache** (Pinecone):
- Vector embeddings cached
- Namespace isolation by company
- No explicit cache invalidation needed

**AI Enrichment Cache** (Redis):
- Key: client name
- Used for repeated enrichment requests
- Optional (useCache param)

---

## 9. ERROR HANDLING & LOGGING

**Pattern** (All routes):
```typescript
try {
  // Process
  return NextResponse.json({...}, {status: 200})
} catch (error) {
  console.error('[CONTEXT]', error)
  const message = error instanceof Error ? error.message : 'Unknown error'
  return NextResponse.json(
    { error: 'User-friendly message', details: message },
    { status: 500 }
  )
}
```

**Parsing Logs** (Database):
```typescript
RFP.parsingLogs: Array<{
  timestamp: ISO string,
  type: 'info' | 'success' | 'error' | 'progress',
  stage: string (downloading, parsing, extracting, etc.),
  message: string,
  metadata?: object
}>
```

**Feature Flags**:
```typescript
shouldUseDatabase(promptKey, companyId) → boolean
- Uses feature flag config
- Enables gradual rollout
```

---

## 10. WORKFLOW EXAMPLE: Complete Question Response

### Step 1: Parse RFP
```
POST /rfps/[id]/parse
→ Extract text from PDF/DOCX/XLSX
→ Save to extractedText column
→ Update parsingStatus='extracted'
```

### Step 2: Extract Questions
```
POST /rfps/[id]/categorize
→ Get extracted questions
→ Call GPT-5 with JSON mode
→ Save to rfpQuestions table
→ Update parsingStatus='completed'
```

### Step 3: Smart Configure (Optional)
```
POST /rfps/[id]/smart-configure
→ Classify all questions (Claude Haiku/Sonnet)
→ Score historical RFPs for each content type
→ Save to rfpSourcePreferences table
→ Update questions with contentTypes, primaryContentType
```

### Step 4: Generate Response
```
POST /rfps/[id]/questions/[questionId]/generate-response
Body: {mode: 'with_context', depth: 'advanced'}

→ Fetch question + RFP metadata
→ DualQueryRetrievalEngine:
    - Query pinned source (if selected)
    - Query support docs (knowledge base)
    - Query historical RFPs
    - Merge & score results
→ PromptService: Get configurable prompt
→ Render with variables
→ Call Claude Sonnet 4.5 or GPT-5
→ Stream response back
→ Save to rfpResponses table with sourceRfpIds
```

### Step 5: Review & Export
```
GET /rfps/[id]/questions-with-responses
→ Fetch all Q&As
→ Optionally export to PDF
→ Mark as submitted

PUT /rfps/[id]
→ Update result (won/lost)
→ Update completionPercentage
→ Save outcome notes
```

---

## 11. NEW FEATURES (Surgical Retrieval - Phase 0.5)

### Key Additions

**RFP Mode** (New field):
- `active`: Currently being worked on
- `historical`: Past RFP (can be used as source)
- `template`: Reusable template

**Content Type Detection**:
- 11 standard content types
- AI-powered classification (Claude)
- Confidence scoring (0-100%)

**Smart Defaults**:
- Automatic source configuration
- Top 3 sources per content type
- Global mandate context
- Won RFP preference

**Surgical Retrieval**:
- selectedSourceRfpId: Pick specific source RFP
- adaptationLevel: Control response style
- sourceRfpIds: Track which sources were used
- appliedFromSettings: Auto-configured flag

**Support Docs RAG v4.0**:
- Dual query strategy (pinned + support + historical)
- Composite scoring (semantic + outcome + recency + quality)
- Context awareness (global mandate)

---

## 12. DEPENDENCIES

**Key Libraries**:
```
- next: 15.0.3 (framework)
- react: 19.0.0-rc.1
- drizzle-orm: 0.36.4 (database ORM)
- @anthropic-ai/sdk: 0.32.1 (Claude API)
- openai: 4.75.0 (GPT-5, GPT-4o)
- @pinecone-database/pinecone: 6.1.3 (RAG vectors)
- @tiptap/react: 3.10.5 (rich text editor)
- zod: 3.23.8 (validation)
- date-fns: 4.1.0 (date utilities)
- recharts: 3.4.1 (charting)
```

---

## 13. ARCHITECTURE PATTERNS

### Layered Architecture
```
API Routes (HTTP endpoints)
    ↓
Services (Business logic: RAG, AI, DB operations)
    ↓
Database (PostgreSQL + Drizzle ORM)
    ↓
External (Pinecone, OpenAI, Anthropic)

React Components (Client-side)
    ↓
API Routes (Server-side handlers)
    ↓
Services
    ↓
Database & External APIs
```

### Service Pattern
- All services are singletons (lazy-initialized)
- Database access via Drizzle ORM
- Error handling with console.error
- Logging for debugging

### Prompt Pattern
- Template-based with {{variable}} syntax
- Database-backed with defaults fallback
- Caching layer (LRU + TTL)
- Type-safe variable validation
- Versioning & rollback support

### RAG Pattern
- Multi-tenant isolation via namespace & tenant_id
- Chunked document storage
- Vector similarity search
- Composite scoring
- Metadata filtering

### API Pattern
- Async/await with try-catch
- Session auth (NextAuth 5.0)
- Company isolation via slug
- Permission checks (admin/editor/viewer)
- JSON responses with error details
- Pagination & filtering support

---

## 14. KEY DIFFERENCES FROM LEGACY

| Aspect | Legacy | Current (Phase 0.5) |
|--------|--------|---------------------|
| Source Selection | Manual only | Auto (smart defaults) + manual (hybrid) |
| Content Types | 5-7 generic categories | 11 specific content types |
| Classification | Optional | Automatic (Claude) |
| Historical RFPs | Not used as sources | Scored & ranked (composite scoring) |
| Adaptation Level | Not tracked | 4 levels: verbatim, light, contextual, creative |
| Support Docs | Not integrated | Dual query strategy |
| Surgical Retrieval | Not available | Full support with pinned sources |
| Intelligence Brief | Not available | AI-generated Go/No-Go analysis |

---

## 15. PERFORMANCE CONSIDERATIONS

**Optimizations**:
1. Prompt caching (LRU, 15-min TTL)
2. Vector search (Pinecone indexes)
3. Batch processing (questions, responses)
4. Streaming responses (real-time generation)
5. Pagination (list endpoints)
6. Database indexes (company_prompt_idx, user_company_idx)

**Timeouts**:
- `/rfps/[id]/categorize`: 800 seconds (13 minutes)
- Bulk operations: Standard timeout

**Limitations**:
- PDF text extraction: First 120K characters
- Questions list: Paginated
- RAG results: Top K configurable (basic: 5, detailed: 10, comprehensive: 20)

---

## Summary for Validation

### Strengths
✅ Comprehensive RFP module with all core features
✅ Multi-tenant architecture with proper isolation
✅ AI-powered workflows with configurable prompts
✅ RAG integration for intelligent retrieval
✅ Type-safe TypeScript throughout
✅ Rich React component library
✅ Sophisticated scoring & ranking system
✅ Support for multiple content types
✅ Version history & audit trails
✅ Flexible adaptation strategies

### Ready for Production
✅ Database schema is mature & indexed
✅ Error handling & logging in place
✅ Authentication & authorization implemented
✅ API routes follow consistent patterns
✅ React components are composable
✅ Services are testable & isolated
✅ Configuration is centralized

### Areas for Enhancement
- Add API documentation (OpenAPI/Swagger)
- Implement rate limiting
- Add end-to-end tests
- Document deployment procedures
- Create admin dashboards for monitoring
- Add analytics tracking
- Implement audit logging for compliance

