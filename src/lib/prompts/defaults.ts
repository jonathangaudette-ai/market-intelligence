/**
 * Default Prompt Templates
 *
 * These are the baseline prompts used when companies haven't customized their prompts.
 * They are seeded into the database during initial setup.
 *
 * TODO: Extract remaining 13 prompts from existing code
 */

import { PROMPT_KEYS, PROMPT_CATEGORIES, type PromptTemplate, type PromptVariable } from '@/types/prompts';

/**
 * Helper to create a default prompt template
 */
function createDefaultPrompt(data: Omit<PromptTemplate, 'id' | 'companyId' | 'version' | 'isActive' | 'createdAt' | 'updatedAt' | 'createdBy'>): Omit<PromptTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    ...data,
    version: 1,
    isActive: true,
  };
}

/**
 * AI Enrichment Prompt (for RFP context enhancement)
 */
const AI_ENRICHMENT_VARIABLES: PromptVariable[] = [
  {
    key: 'clientName',
    description: 'Name of the client organization',
    required: true,
    type: 'string',
    example: 'Acme Corporation',
  },
  {
    key: 'clientIndustry',
    description: 'Industry of the client',
    required: false,
    type: 'string',
    example: 'SaaS',
  },
  {
    key: 'rfpText',
    description: 'Excerpt from the RFP document',
    required: false,
    type: 'string',
  },
  {
    key: 'linkedinData',
    description: 'LinkedIn company data if available',
    required: false,
    type: 'object',
  },
  {
    key: 'existingEnrichment',
    description: 'Previously saved enrichment data',
    required: false,
    type: 'object',
  },
  {
    key: 'knowledgeBaseChunks',
    description: 'Relevant documents from knowledge base',
    required: false,
    type: 'array',
  },
];

const AI_ENRICHMENT_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.AI_ENRICHMENT,
  category: PROMPT_CATEGORIES.ENRICHMENT,
  name: 'AI Enrichment - RFP Context Enhancement',
  description: 'Automatically enriches RFP context using available client data (LinkedIn, knowledge base, RFP text)',
  systemPrompt: null,
  userPromptTemplate: `Tu es un expert en analyse d'entreprise et de contexte client pour des appels d'offres (RFPs).

Analyse les informations disponibles sur le client "{{clientName}}" et génère un enrichissement structuré pour aider à personnaliser les réponses RFP.

**INFORMATIONS DISPONIBLES:**

**Client:** {{clientName}}
{{#if clientIndustry}}**Industrie:** {{clientIndustry}}{{/if}}

{{#if linkedinData}}
**DONNÉES LINKEDIN:**
{{#if linkedinData.description}}- Description: {{linkedinData.description}}{{/if}}
{{#if linkedinData.industry}}- Industrie: {{linkedinData.industry}}{{/if}}
{{#if linkedinData.employeeCount}}- Nombre d'employés: {{linkedinData.employeeCount}}{{/if}}
{{#if linkedinData.specialties}}- Spécialités: {{linkedinData.specialties}}{{/if}}
{{#if linkedinData.headquarters}}- Siège social: {{linkedinData.headquarters}}{{/if}}
{{#if linkedinData.founded}}- Fondée en: {{linkedinData.founded}}{{/if}}
{{/if}}

{{#if knowledgeBaseChunks}}
**BASE DE CONNAISSANCES (documents pertinents):**
{{#each knowledgeBaseChunks}}
{{index}}. [Score: {{score}}, Source: {{source}}]
{{text}}

{{/each}}
{{/if}}

{{#if rfpText}}
**EXTRAIT DU RFP:**
{{rfpText}}
{{/if}}

{{#if existingEnrichment}}
**ENRICHISSEMENT EXISTANT (à améliorer si possible):**
{{#if existingEnrichment.clientBackground}}- Contexte: {{existingEnrichment.clientBackground}}{{/if}}
{{#if existingEnrichment.keyNeeds}}- Besoins: {{existingEnrichment.keyNeeds}}{{/if}}
{{#if existingEnrichment.constraints}}- Contraintes: {{existingEnrichment.constraints}}{{/if}}
{{#if existingEnrichment.relationships}}- Relations: {{existingEnrichment.relationships}}{{/if}}
{{#if existingEnrichment.customNotes}}- Notes: {{existingEnrichment.customNotes}}{{/if}}
{{/if}}

**INSTRUCTIONS:**

Génère un enrichissement structuré en 5 sections pour aider à personnaliser les réponses au RFP:

1. **clientBackground** - Contexte du client
   - Historique et évolution de l'entreprise
   - Mission, vision et culture organisationnelle
   - Position dans le marché et réputation

2. **keyNeeds** - Besoins clés identifiés
   - Principaux défis business ou techniques
   - Opportunités de croissance
   - Objectifs stratégiques mentionnés

3. **constraints** - Contraintes connues
   - Limitations budgétaires (si mentionnées)
   - Contraintes techniques ou technologiques
   - Contraintes organisationnelles ou processus

4. **relationships** - Relation et historique
   - Décideurs clés ou contacts importants (si mentionnés)
   - Historique de collaboration (si applicable)
   - Points de contact ou relations existantes

5. **customNotes** - Notes additionnelles
   - Informations pertinentes pour personnaliser les réponses
   - Éléments de différenciation à considérer
   - Insights spécifiques au secteur ou contexte

**FORMAT DE SORTIE (JSON strict):**

\`\`\`json
{
  "clientBackground": "Texte descriptif détaillé...",
  "keyNeeds": "Texte descriptif détaillé...",
  "constraints": "Texte descriptif détaillé...",
  "relationships": "Texte descriptif détaillé...",
  "customNotes": "Texte descriptif détaillé...",
  "confidence": 0.85
}
\`\`\`

**IMPORTANT:**
- Réponds UNIQUEMENT avec le JSON, sans texte additionnel
- Si une information n'est pas disponible, écris une note indiquant "Information non disponible dans les sources fournies"
- Le champ "confidence" doit être entre 0 et 1 (basé sur la qualité des informations disponibles)
- Sois concis mais informatif (2-4 phrases par section)
- Écris en français`,
  modelId: 'claude-haiku-4-5-20251001', // Use Haiku for speed/cost
  temperature: 0.7,
  maxTokens: 4096,
  variables: AI_ENRICHMENT_VARIABLES,
});

/**
 * RFP Response Generation (Main)
 * Priority: P0 - Critical
 * Source: src/lib/rfp/ai/claude.ts:30-75
 */
const RFP_RESPONSE_MAIN_VARIABLES: PromptVariable[] = [
  {
    key: 'question',
    description: 'The RFP question to answer',
    required: true,
    type: 'string',
    example: 'Describe your project methodology',
  },
  {
    key: 'context',
    description: 'Context from company knowledge base',
    required: true,
    type: 'string',
  },
  {
    key: 'clientName',
    description: 'Name of the client',
    required: false,
    type: 'string',
  },
  {
    key: 'clientIndustry',
    description: 'Industry of the client',
    required: false,
    type: 'string',
  },
  {
    key: 'additionalInstructions',
    description: 'Additional instructions from the user',
    required: false,
    type: 'string',
  },
];

const RFP_RESPONSE_MAIN_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.RFP_RESPONSE_MAIN,
  category: PROMPT_CATEGORIES.RFP_GENERATION,
  name: 'RFP Response Generation (Main)',
  description: 'Generate professional, compelling RFP responses using company knowledge base context',
  systemPrompt: `You are an expert RFP (Request for Proposal) response writer. Your goal is to create professional, compelling, and accurate responses to RFP questions.

Guidelines:
- Write clear, concise, and professional responses
- Use the provided context to ground your answers in factual information
- Highlight competitive advantages where relevant
- Be specific and provide examples when possible
- Maintain a confident but not arrogant tone
- Structure responses with clear paragraphs
- Avoid generic marketing language
- Focus on delivering value to the client`,
  userPromptTemplate: `{{#if clientName}}Client: {{clientName}}{{/if}}
{{#if clientIndustry}}Industry: {{clientIndustry}}{{/if}}

Question:
{{question}}

Context (from company knowledge base):
{{context}}

{{#if additionalInstructions}}Additional Instructions:
{{additionalInstructions}}{{/if}}

Please provide a professional, well-structured response to this RFP question. The response should be ready to use with minimal editing.`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxTokens: 4000,
  variables: RFP_RESPONSE_MAIN_VARIABLES,
});

/**
 * Question Extraction from RFP Documents
 * Priority: P0 - Critical
 * Source: src/lib/rfp/parser/question-extractor.ts:41-67
 */
const QUESTION_EXTRACTION_VARIABLES: PromptVariable[] = [
  {
    key: 'text',
    description: 'The RFP document text to extract questions from',
    required: true,
    type: 'string',
  },
  {
    key: 'maxQuestions',
    description: 'Maximum number of questions to extract',
    required: false,
    type: 'number',
  },
  {
    key: 'sectionTitle',
    description: 'Focus on a specific section',
    required: false,
    type: 'string',
  },
];

const QUESTION_EXTRACTION_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.QUESTION_EXTRACT,
  category: PROMPT_CATEGORIES.DOCUMENT_ANALYSIS,
  name: 'Question Extraction from RFP Documents',
  description: 'Extract questions from RFP documents using GPT-5 with structured output',
  systemPrompt: `You are an expert at analyzing RFP (Request for Proposal) documents and extracting questions.

Your task is to:
1. Identify all questions that require a response
2. Extract question numbers/identifiers if present
3. Determine if attachments are required
4. Note any word/character/page limits
5. Identify the section each question belongs to

Return a structured JSON array of questions.`,
  userPromptTemplate: `Extract all questions from this RFP text. For each question, provide:
- sectionTitle: The section or category this question belongs to
- questionNumber: The question number or identifier (e.g., "Q1", "1.1", "Section 3 - Q5")
- questionText: The full text of the question
- requiresAttachment: true if the question explicitly requires file attachments
- wordLimit: maximum number of words allowed (if specified)
- characterLimit: maximum number of characters allowed (if specified)
- pageLimit: maximum number of pages allowed (if specified)

{{#if maxQuestions}}Extract up to {{maxQuestions}} questions.{{/if}}
{{#if sectionTitle}}Focus on section: {{sectionTitle}}{{/if}}

RFP Text ({{text.length}} characters total):
{{text}}

Return ONLY a valid JSON array of questions, no additional text.`,
  modelId: 'gpt-5',
  temperature: null, // GPT-5 uses reasoning.effort instead
  maxTokens: 16000,
  variables: QUESTION_EXTRACTION_VARIABLES,
});

/**
 * Question Categorization (Single)
 * Priority: P1 - High
 * Source: src/lib/rfp/ai/claude.ts:89-110
 */
const QUESTION_CATEGORIZATION_VARIABLES: PromptVariable[] = [
  {
    key: 'question',
    description: 'The question to categorize',
    required: true,
    type: 'string',
  },
];

const QUESTION_CATEGORIZATION_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE,
  category: PROMPT_CATEGORIES.QUESTION_ANALYSIS,
  name: 'Question Categorization (Single)',
  description: 'Categorize a single RFP question and provide metadata',
  systemPrompt: `You are an RFP question analyzer. Categorize questions and provide metadata about them.

Return your response in this exact JSON format (no additional text):
{
  "category": "one of: technical, pricing, company_info, case_study, compliance, implementation, support, security, legal",
  "tags": ["array", "of", "relevant", "tags"],
  "difficulty": "easy | medium | hard",
  "estimatedMinutes": number (estimate time to answer: 5-60 minutes)
}`,
  userPromptTemplate: `Categorize this RFP question:

{{question}}`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.3,
  maxTokens: 500,
  variables: QUESTION_CATEGORIZATION_VARIABLES,
});

/**
 * Question Categorization (Batch)
 * Priority: P1 - High
 * Source: src/lib/rfp/ai/claude.ts:170-203
 */
const QUESTION_CATEGORIZATION_BATCH_VARIABLES: PromptVariable[] = [
  {
    key: 'questions',
    description: 'Array of questions to categorize',
    required: true,
    type: 'array',
  },
];

const QUESTION_CATEGORIZATION_BATCH_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH,
  category: PROMPT_CATEGORIES.QUESTION_ANALYSIS,
  name: 'Question Categorization (Batch)',
  description: 'Categorize multiple RFP questions in a single batch (reduces API calls by ~90%)',
  systemPrompt: `You are an RFP question analyzer. Categorize multiple questions and provide metadata about each.

For EACH question, return categorization in this JSON array format:
[
  {
    "category": "one of: technical, pricing, company_info, case_study, compliance, implementation, support, security, legal",
    "tags": ["array", "of", "relevant", "tags"],
    "difficulty": "easy | medium | hard",
    "estimatedMinutes": number (estimate time to answer: 5-60 minutes)
  },
  ...
]

Return ONLY the JSON array, no additional text. The array must have the same length as the input questions.`,
  userPromptTemplate: `Categorize these {{questions.length}} RFP questions:

{{#each questions}}Question {{@index}}:
{{this.questionText}}

---

{{/each}}`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.3,
  maxTokens: 4000,
  variables: QUESTION_CATEGORIZATION_BATCH_VARIABLES,
});

/**
 * Competitive Positioning Analysis
 * Priority: P2 - Medium
 * Source: src/lib/rfp/ai/claude.ts:311-351
 */
const COMPETITIVE_POSITIONING_VARIABLES: PromptVariable[] = [
  {
    key: 'question',
    description: 'The RFP question',
    required: true,
    type: 'string',
  },
  {
    key: 'ourResponse',
    description: 'Our proposed response',
    required: true,
    type: 'string',
  },
  {
    key: 'competitors',
    description: 'List of known competitors',
    required: true,
    type: 'array',
  },
  {
    key: 'competitiveIntel',
    description: 'Competitive intelligence data',
    required: false,
    type: 'string',
  },
];

const COMPETITIVE_POSITIONING_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.COMPETITIVE_POSITIONING,
  category: PROMPT_CATEGORIES.INTELLIGENCE,
  name: 'Competitive Positioning Analysis',
  description: 'Analyze RFP responses and suggest how to position against competitors',
  systemPrompt: `You are a competitive strategy analyst. Analyze RFP responses and suggest how to position against competitors.

Return your response in this exact JSON format:
{
  "suggestions": ["array of specific suggestions to improve positioning"],
  "strengths": ["key strengths to emphasize"],
  "differentiators": ["unique differentiators vs competitors"]
}`,
  userPromptTemplate: `Question: {{question}}

Our Response:
{{ourResponse}}

Known Competitors: {{#each competitors}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

{{#if competitiveIntel}}Competitive Intelligence:
{{competitiveIntel}}{{/if}}

Provide strategic suggestions for positioning this response against competitors.`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.8,
  maxTokens: 2000,
  variables: COMPETITIVE_POSITIONING_VARIABLES,
});

/**
 * Historical RFP Response Parsing
 * Priority: P2 - Medium
 * Source: src/lib/rfp/historical-import.ts:78-123
 */
const HISTORICAL_RFP_RESPONSE_PARSING_VARIABLES: PromptVariable[] = [
  {
    key: 'responseText',
    description: 'The historical RFP response document text',
    required: true,
    type: 'string',
  },
];

const HISTORICAL_RFP_RESPONSE_PARSING_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE,
  category: PROMPT_CATEGORIES.DOCUMENT_ANALYSIS,
  name: 'Historical RFP Response Parsing',
  description: 'Parse submitted response documents and extract their structure',
  systemPrompt: `You are an expert at analyzing RFP response documents and extracting their structure. Always respond with valid JSON.`,
  userPromptTemplate: `Analyze this RFP response document and extract its structure.

Document ({{responseText.length}} characters):
{{responseText}}

Return JSON with this structure:
{
  "sections": [
    {
      "sectionTitle": "Project Methodology",
      "content": "Our approach...",
      "possibleQuestions": ["Describe your methodology", "How do you manage projects"]
    }
  ]
}

Extract all major sections and their content. For each section, infer what RFP questions it might be answering.`,
  modelId: 'gpt-5',
  temperature: null,
  maxTokens: null,
  variables: HISTORICAL_RFP_RESPONSE_PARSING_VARIABLES,
});

/**
 * Historical RFP Question-Response Matching
 * Priority: P1 - High
 * Source: src/lib/rfp/historical-import.ts:135-206
 */
const HISTORICAL_RFP_MATCHING_VARIABLES: PromptVariable[] = [
  {
    key: 'questions',
    description: 'Array of RFP questions',
    required: true,
    type: 'array',
  },
  {
    key: 'responseSections',
    description: 'Array of response sections',
    required: true,
    type: 'array',
  },
];

const HISTORICAL_RFP_MATCHING_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.HISTORICAL_MATCH_QA,
  category: PROMPT_CATEGORIES.DOCUMENT_ANALYSIS,
  name: 'Historical RFP Question-Response Matching',
  description: 'Match questions to response sections using semantic similarity',
  systemPrompt: `You are an expert at matching RFP questions with their corresponding responses in submitted documents.`,
  userPromptTemplate: `Match each RFP question with the corresponding section in the response document.

Questions RFP:
{{questions}}

Response Sections:
{{responseSections}}

Analyze the semantic similarity between questions and sections to create matches.
Assign a confidence score (0.0-1.0) based on how well the section answers the question.

Return JSON with matched pairs and confidence scores.`,
  modelId: 'gpt-5',
  temperature: null,
  maxTokens: null,
  variables: HISTORICAL_RFP_MATCHING_VARIABLES,
});

/**
 * All default prompts
 *
 * Maps prompt key to default template
 */
export const DEFAULT_PROMPTS = new Map<string, Omit<PromptTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'>>([
  // P0 - Critical
  [PROMPT_KEYS.RFP_RESPONSE_MAIN, RFP_RESPONSE_MAIN_PROMPT],
  [PROMPT_KEYS.QUESTION_EXTRACT, QUESTION_EXTRACTION_PROMPT],

  // P1 - High
  [PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE, QUESTION_CATEGORIZATION_PROMPT],
  [PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH, QUESTION_CATEGORIZATION_BATCH_PROMPT],
  [PROMPT_KEYS.HISTORICAL_MATCH_QA, HISTORICAL_RFP_MATCHING_PROMPT],
  [PROMPT_KEYS.AI_ENRICHMENT, AI_ENRICHMENT_PROMPT],

  // P2 - Medium
  [PROMPT_KEYS.COMPETITIVE_POSITIONING, COMPETITIVE_POSITIONING_PROMPT],
  [PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE, HISTORICAL_RFP_RESPONSE_PARSING_PROMPT],
]);

/**
 * Get default prompt by key
 */
export function getDefaultPrompt(promptKey: string): Omit<PromptTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'> | undefined {
  return DEFAULT_PROMPTS.get(promptKey);
}

/**
 * Get all default prompts
 */
export function getAllDefaultPrompts(): Array<Omit<PromptTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'>> {
  return Array.from(DEFAULT_PROMPTS.values());
}

/**
 * Check if a prompt has a default
 */
export function hasDefaultPrompt(promptKey: string): boolean {
  return DEFAULT_PROMPTS.has(promptKey);
}
