# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **market intelligence research repository** focused on competitive intelligence (CI) platforms and strategies. The repository contains comprehensive research, functional specifications, and comparative analyses for building an AI-powered competitive intelligence and market intelligence platform.

## Repository Purpose

This repository serves as the foundation for designing and specifying a competitive intelligence platform that combines:
- Automated data collection from 100+ sources
- AI-powered analysis and synthesis
- Real-time distribution and activation
- Win/loss intelligence integration
- Predictive analytics capabilities

## Key Documents Structure

### Primary Specifications

1. **`specifications-fonctionnelles-plateforme-ci.md`** (Main Specification Document)
   - Complete functional specifications for the platform
   - 10 core modules with detailed features
   - 5-layer architecture (Collect → Process → Analyze → Activate → Measure)
   - Technology stack recommendations
   - Implementation roadmap

2. **`analyse-fonctionnelle-leaders-marche.md`** (Competitive Analysis)
   - Comprehensive comparison of Crayon.co vs Klue
   - Feature-by-feature analysis
   - Strengths and weaknesses of each platform
   - Strategic recommendations for platform choice
   - Market trends and future directions

3. **`ai-competitive-intelligence-report-2025.md`** (Market Research)
   - Industry landscape analysis
   - AI capabilities in competitive intelligence
   - Market leaders evaluation
   - Strategic insights for building a CI platform

### Supporting Documents

- **`Deep Research sur Crayon.co.pdf`**: In-depth research on Crayon.co platform
- **`Recherche Approfondie sur Klue.pdf`**: Detailed analysis of Klue platform
- **`specs-continuation.md`**: Empty continuation file
- **`specs-suite.md`**: Empty continuation file

## Core Concepts and Architecture

### Platform Architecture (5 Layers)

```
LAYER 5: MEASUREMENT & ANALYTICS
         ↓
LAYER 4: ACTIVATION & DISTRIBUTION
         ↓
LAYER 3: INTELLIGENCE & SYNTHESIS (AI)
         ↓
LAYER 2: PROCESSING & ENRICHMENT
         ↓
LAYER 1: COLLECTION & INGESTION
```

### 10 Core Modules

1. **Intelligence Collector** - Automated multi-source data collection (100+ source types)
2. **AI Analysis Engine** - LLM-powered analysis and synthesis (GPT-4, Claude 3.5 Sonnet)
3. **Knowledge Graph** - Relational knowledge base (Neo4j-based)
4. **Battle Hub** - Dynamic battlecard creation and management
5. **Alert & Distribution System** - Intelligent routing and notifications
6. **Win/Loss Intelligence** - Integrated analysis of sales outcomes
7. **Predictive Analytics** - Forecasting and scenario planning
8. **Conversational AI Assistant** - ChatGPT-style intelligence querying
9. **Impact Analytics** - ROI measurement and tracking
10. **Collaboration Workspace** - Team collaboration features

### Technology Stack Recommendations

**Data Collection:**
- Firecrawl API, Apify actors for web scraping
- NewsAPI, Google News (SerpAPI) for media monitoring
- Proxycurl for LinkedIn data
- Change Detection.io for website monitoring

**AI/ML:**
- LLMs: **GPT-5, Claude Sonnet 4.5, Claude Haiku 4.5** (see AI Models section below)
- Vector DB: Pinecone for RAG
- Graph DB: Neo4j for knowledge graph
- NLP: SpaCy for entity recognition

**Backend:**
- PostgreSQL for structured data
- S3 for raw files
- Python/TypeScript for services

**Integrations:**
- Salesforce, HubSpot (CRM)
- Gong, Chorus (call intelligence)
- Slack, Microsoft Teams (communication)
- Highspot, Seismic (sales enablement)

---

## 🤖 AI Models Configuration

**CRITICAL: This project ALWAYS uses the following AI models. These models exist and are fully operational.**

### Primary Models in Use

#### 1. **GPT-5** (OpenAI)
- **Model ID**: `'gpt-5'`
- **Status**: ✅ **AVAILABLE AND DEPLOYED**
- **Use Cases**:
  - RFP question extraction
  - Document parsing and structure analysis
  - Question-to-response matching
- **Configuration File**: `src/lib/constants/ai-models.ts`
- **Key Parameters**:
  - `reasoning.effort`: 'minimal' | 'low' | 'medium' | 'high'
  - `text.verbosity`: 'low' | 'medium' | 'high'
  - **Note**: GPT-5 does NOT support temperature or top_p

**Example Usage:**
```typescript
import { GPT5_CONFIGS } from '@/lib/constants/ai-models';

// For question extraction
const config = GPT5_CONFIGS.extraction;
// { model: 'gpt-5', reasoning: { effort: 'minimal' }, text: { verbosity: 'low' } }

// For document parsing
const config = GPT5_CONFIGS.parsing;
// { model: 'gpt-5', reasoning: { effort: 'low' }, text: { verbosity: 'medium' } }

// For semantic matching
const config = GPT5_CONFIGS.matching;
// { model: 'gpt-5', reasoning: { effort: 'medium' }, text: { verbosity: 'medium' } }
```

#### 2. **Claude Sonnet 4.5** (Anthropic)
- **Model ID**: `'claude-sonnet-4-5-20250929'`
- **Status**: ✅ **AVAILABLE AND DEPLOYED**
- **Context Window**: 200,000 tokens
- **Use Cases**:
  - Long-document analysis
  - RFP response generation
  - Surgical content retrieval
  - Complex reasoning tasks
- **Configuration**: `CLAUDE_MODELS.sonnet` in `src/lib/constants/ai-models.ts`

**Example Usage:**
```typescript
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

const response = await anthropic.messages.create({
  model: CLAUDE_MODELS.sonnet, // 'claude-sonnet-4-5-20250929'
  max_tokens: 16000,
  messages: [{ role: 'user', content: prompt }]
});
```

#### 3. **Claude Haiku 3.5** (Anthropic)
- **Model ID**: `'claude-3-5-haiku-20241022'`
- **Status**: ✅ **AVAILABLE AND DEPLOYED**
- **Note**: ⚠️ Claude Haiku 4.5 is not yet available via API. Currently using Claude 3.5 Haiku.
- **Use Cases**:
  - Fast, lightweight tasks (70% cheaper than Sonnet)
  - Real-time question answering
  - Quick document summarization
  - Document analysis and categorization
- **Configuration**: `CLAUDE_MODELS.haiku` in `src/lib/constants/ai-models.ts`

**Example Usage:**
```typescript
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

const response = await anthropic.messages.create({
  model: CLAUDE_MODELS.haiku, // 'claude-3-5-haiku-20241022'
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }]
});
```

### Fallback Configuration

#### GPT-4o (Fallback)
- **Model ID**: `'gpt-4o'`
- **Use**: Only when GPT-5 is unavailable
- **Configuration**: `GPT4O_FALLBACK` in `src/lib/constants/ai-models.ts`

### Model Selection by Use Case

| Task | Primary Model | Fallback | Rationale |
|------|---------------|----------|-----------|
| **Question Extraction** | GPT-5 (minimal effort) | GPT-4o | Fast, structured output |
| **Document Parsing** | GPT-5 (low effort) | GPT-4o | Structure recognition |
| **Semantic Matching** | GPT-5 (medium effort) | Claude Sonnet 4.5 | Reasoning required |
| **Long Documents (>100k chars)** | Claude Sonnet 4.5 | GPT-5 | 200k context window |
| **Response Generation** | Claude Sonnet 4.5 | GPT-5 | High-quality prose |
| **Real-time Queries** | Claude Haiku 3.5 | GPT-5 | Speed optimized |
| **Document Analysis** | Claude Haiku 3.5 | Claude Sonnet 4.5 | Cost-effective |

### Configuration Files Reference

1. **`src/lib/constants/ai-models.ts`** - Main configuration file
   - `GPT5_CONFIGS`: Pre-configured GPT-5 settings
   - `CLAUDE_MODELS`: Claude model IDs
   - `GPT4O_FALLBACK`: Fallback configuration

2. **`src/lib/rfp/parser/question-extractor.ts`** - Uses GPT-5 for extraction
3. **`src/lib/rfp/historical-import.ts`** - Uses GPT-5/GPT-4o for parsing
4. **`src/lib/rfp/ai/claude.ts`** - Claude integration
5. **`src/lib/rag/engine.ts`** - RAG with Claude Sonnet 4.5

### Environment Variables Required

```bash
OPENAI_API_KEY=sk-...          # For GPT-5 / GPT-4o
ANTHROPIC_API_KEY=sk-ant-...   # For Claude Sonnet 4.5 / Haiku 3.5
```

### Important Notes for Claude Code Assistant

⚠️ **CRITICAL INSTRUCTIONS**:
1. **NEVER** suggest that GPT-5, Claude Sonnet 4.5, or Claude Haiku 3.5 "don't exist" or are "not available yet"
2. **ALWAYS** use the exact model IDs from `src/lib/constants/ai-models.ts`
3. **ALWAYS** reference this section when discussing AI model choices
4. When improving code, **maintain** existing model configurations unless explicitly asked to change them
5. **NOTE**: Claude Haiku 4.5 is not yet available - use Claude Haiku 3.5 (`claude-3-5-haiku-20241022`)

---

## Document Language

All documents in this repository are in **French (français)**. When working with these files:
- Maintain French for content additions to specification documents
- Use French technical terminology consistently
- Preserve the formal business documentation style
- English is acceptable for code comments and technical implementation

## Key Differentiators (From Market Analysis)

### Crayon.co Strengths
- Advanced generative AI (Sparks, Crayon Answers)
- Extensive data collection (100+ types)
- GTM Insights for internal intelligence
- Unlimited users/assets pricing model

### Klue Strengths
- Native Win/Loss analysis integration (major differentiator)
- Compete Agent with dual AI personality
- Deep sales enablement focus
- Exceptional customer support (9.8/10)
- Proactive Deal Tips

### Target Personas
- **Primary**: Competitive Intelligence Directors
- **Secondary**: VP Sales / Sales Enablement
- **Tertiary**: Product Managers / Product Marketing

## Working with This Repository

### Reading Specifications
When referencing the specification documents:
- The main spec (`specifications-fonctionnelles-plateforme-ci.md`) is organized by modules
- Each module has: Objective, Features, Technical Specs, APIs
- Cross-reference with the competitive analysis for market validation

### Adding New Content
- Continue technical specifications in the main document
- Add market research findings to appropriate analysis documents
- Maintain consistent structure and French language
- Reference specific line numbers when discussing document sections

### Research Context
This repository represents a **planning and specification phase** for a competitive intelligence platform. It is not an implementation codebase but rather comprehensive research and functional specifications that would guide future development.

## Common Tasks

### Analyzing Competitive Features
Compare features against the detailed analysis in `analyse-fonctionnelle-leaders-marche.md` (lines 1605-1758 contain comprehensive feature comparison table)

### Understanding Module Architecture
Reference `specifications-fonctionnelles-plateforme-ci.md`:
- Module 1 (Intelligence Collector): lines 140-545
- Module 2 (AI Analysis Engine): lines 549-890
- Module 3 (Knowledge Graph): lines 894-1041
- Module 4 (Battle Hub): lines 1045-1234
- Module 5 (Alert & Distribution): lines 1238-1536
- Module 6 (Win/Loss Intelligence): lines 1540-1788

### Technology Selection
For AI/LLM decisions, reference Module 2 model selection rationale (lines 590-598):
- Claude 3.5 Sonnet: 200K context, excellent reasoning
- GPT-4o: Best for JSON mode and structured extraction
- Gemini 1.5 Pro: 2M tokens for long context
- GPT-4 Vision: UI/visual analysis

## Strategic Insights

### Market Positioning
The platform aims to differentiate through:
1. **Multimodal AI** (GPT-4 Vision, Claude 3.5 Sonnet for visual + text)
2. **Predictive Intelligence** (forecasting competitor moves)
3. **Real-time Activation** (proactive distribution)
4. **Knowledge Graph** (ecosystem mapping)

### Key Success Metrics
Documented ROI from market leaders:
- Salsify: +22% win rate with Crayon
- Cognism: $6M influenced revenue in <1 year
- AMETEK: 300 hours/year saved in research

### Critical Features for MVP (P0 Priority)
1. Intelligence Collector (automated data collection)
2. AI Analysis Engine (LLM synthesis)
3. Battle Hub (dynamic battlecards)
4. Alert & Distribution System
5. Impact Analytics (ROI measurement)

## Notes

- This is a **French-language business specification repository**
- No executable code exists yet - this is pre-implementation research
- Documents are comprehensive (60K+ tokens total)
- Focus is B2B mid-market and enterprise segments
- Primary competitive intelligence tools analyzed: Crayon.co and Klue
