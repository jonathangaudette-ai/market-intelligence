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
 * RAG Chat Synthesis
 * Priority: P0 - Critical
 * Purpose: Synthesize RAG results into conversational chat responses
 */
const RAG_CHAT_SYNTHESIS_VARIABLES: PromptVariable[] = [
  {
    key: 'query',
    description: 'User query to answer',
    required: true,
    type: 'string',
    example: 'What is our pricing model?',
  },
  {
    key: 'context',
    description: 'Retrieved context from knowledge base',
    required: true,
    type: 'string',
  },
  {
    key: 'dateContext',
    description: 'Current date context for time-sensitive queries',
    required: false,
    type: 'string',
  },
  {
    key: 'conversationHistory',
    description: 'Previous conversation turns',
    required: false,
    type: 'array',
  },
];

const RAG_CHAT_SYNTHESIS_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.RAG_CHAT_SYNTHESIS,
  category: PROMPT_CATEGORIES.CHAT,
  name: 'RAG Chat Synthesis',
  description: 'Synthesize retrieved context into conversational chat responses',
  systemPrompt: `You are a helpful AI assistant that answers questions about a company using their internal knowledge base.

Your responses should be:
- Accurate and grounded in the provided context
- Conversational and natural
- Concise but complete
- Helpful and actionable

If the context doesn't contain the answer, say so politely. Never make up information.`,
  userPromptTemplate: `{{#if conversationHistory}}Previous conversation:
{{#each conversationHistory}}{{role}}: {{content}}

{{/each}}{{/if}}User Question: {{query}}

{{#if dateContext}}Today's Date: {{dateContext}}{{/if}}

Relevant Context from Knowledge Base:
{{context}}

Please provide a helpful, accurate response based on the context above.`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxTokens: 2000,
  variables: RAG_CHAT_SYNTHESIS_VARIABLES,
});

/**
 * Document Analysis Support
 * Priority: P1 - High
 * Purpose: Analyze uploaded support documents and extract key information
 */
const DOCUMENT_ANALYSIS_SUPPORT_VARIABLES: PromptVariable[] = [
  {
    key: 'filename',
    description: 'Name of the uploaded file',
    required: true,
    type: 'string',
    example: 'case-study-acme.pdf',
  },
  {
    key: 'extractedText',
    description: 'Text extracted from the document',
    required: true,
    type: 'string',
  },
];

const DOCUMENT_ANALYSIS_SUPPORT_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.DOCUMENT_ANALYSIS_SUPPORT,
  category: PROMPT_CATEGORIES.DOCUMENT_ANALYSIS,
  name: 'Document Analysis - Support Documents',
  description: 'Analyze uploaded support documents (case studies, whitepapers, etc.) and extract structured information',
  systemPrompt: `You are an expert at analyzing business documents and extracting structured information.

Analyze the document and extract:
1. Document type (case study, whitepaper, proposal, technical doc, etc.)
2. Key topics and themes
3. Main insights or findings
4. Relevant entities (companies, products, people, technologies)
5. Actionable takeaways

Return your analysis as structured JSON.`,
  userPromptTemplate: `Analyze this document: "{{filename}}"

Content ({{extractedText.length}} characters):
{{extractedText}}

Provide a structured analysis in JSON format:
{
  "documentType": "case_study | whitepaper | proposal | technical_doc | other",
  "title": "extracted or inferred title",
  "summary": "2-3 sentence summary",
  "topics": ["topic1", "topic2", ...],
  "entities": {
    "companies": ["..."],
    "products": ["..."],
    "technologies": ["..."]
  },
  "keyInsights": ["insight1", "insight2", ...],
  "relevantFor": ["rfp_questions", "sales_enablement", "competitive_intel", ...]
}`,
  modelId: 'claude-haiku-4-5-20251001',
  temperature: 0.5,
  maxTokens: 3000,
  variables: DOCUMENT_ANALYSIS_SUPPORT_VARIABLES,
});

/**
 * Content Type Detection
 * Priority: P1 - High
 * Purpose: Detect what type of content a question is asking for
 */
const CONTENT_TYPE_DETECT_VARIABLES: PromptVariable[] = [
  {
    key: 'questionText',
    description: 'The RFP question text',
    required: true,
    type: 'string',
    example: 'Please provide 2-3 customer case studies',
  },
];

const CONTENT_TYPE_DETECT_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.CONTENT_TYPE_DETECT,
  category: PROMPT_CATEGORIES.QUESTION_ANALYSIS,
  name: 'Content Type Detection',
  description: 'Detect what type of content a question is requesting (case study, pricing, technical details, etc.)',
  systemPrompt: `You are an expert at analyzing RFP questions and identifying what type of content they're requesting.

Content types:
- case_study: Customer success stories, testimonials
- pricing: Pricing models, cost breakdowns
- technical: Technical architecture, specifications
- methodology: Process, approach, frameworks
- team: Team structure, bios, qualifications
- timeline: Project schedules, delivery timelines
- compliance: Certifications, security, legal
- references: Customer references, contact information

Return JSON with content type and confidence.`,
  userPromptTemplate: `What type of content is this question requesting?

Question: {{questionText}}

Return JSON:
{
  "contentType": "case_study | pricing | technical | methodology | team | timeline | compliance | references | other",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`,
  modelId: 'claude-haiku-4-5-20251001',
  temperature: 0.3,
  maxTokens: 300,
  variables: CONTENT_TYPE_DETECT_VARIABLES,
});

/**
 * Intelligence Brief
 * Priority: P2 - Medium
 * Purpose: Generate executive-level intelligence briefing for an RFP
 */
const INTELLIGENCE_BRIEF_VARIABLES: PromptVariable[] = [
  {
    key: 'title',
    description: 'RFP title',
    required: true,
    type: 'string',
    example: 'Digital Transformation Consulting RFP',
  },
  {
    key: 'clientName',
    description: 'Client organization name',
    required: false,
    type: 'string',
  },
  {
    key: 'clientIndustry',
    description: 'Client industry',
    required: false,
    type: 'string',
  },
  {
    key: 'questions',
    description: 'Array of RFP questions with categories',
    required: true,
    type: 'array',
  },
  {
    key: 'deadline',
    description: 'Submission deadline',
    required: false,
    type: 'string',
  },
  {
    key: 'dealValue',
    description: 'Estimated deal value',
    required: false,
    type: 'string',
  },
];

const INTELLIGENCE_BRIEF_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.INTELLIGENCE_BRIEF,
  category: PROMPT_CATEGORIES.INTELLIGENCE,
  name: 'Intelligence Brief - RFP Overview',
  description: 'Generate executive-level intelligence briefing summarizing an RFP opportunity',
  systemPrompt: `You are an expert business analyst creating executive intelligence briefings for RFP opportunities.

Your brief should provide:
1. Executive summary (2-3 paragraphs)
2. Opportunity assessment
3. Question breakdown by category
4. Strategic considerations
5. Risk factors and mitigation
6. Recommended approach

Keep it concise and actionable for executives.`,
  userPromptTemplate: `Generate an intelligence brief for this RFP opportunity:

**RFP Title:** {{title}}
{{#if clientName}}**Client:** {{clientName}}{{/if}}
{{#if clientIndustry}}**Industry:** {{clientIndustry}}{{/if}}
{{#if deadline}}**Deadline:** {{deadline}}{{/if}}
{{#if dealValue}}**Estimated Value:** {{dealValue}}{{/if}}

**Questions ({{questions.length}} total):**
{{#each questions}}{{@index}}. [{{category}}] {{questionText}}
{{/each}}

Provide a strategic intelligence brief covering:
- Executive Summary
- Opportunity Assessment (fit, win probability)
- Question Breakdown (complexity, gaps, strengths)
- Strategic Recommendations
- Risk Factors`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.6,
  maxTokens: 3000,
  variables: INTELLIGENCE_BRIEF_VARIABLES,
});

/**
 * Document Preprocessing
 * Priority: P1 - High
 * Purpose: Clean and normalize raw document text before processing
 */
const DOCUMENT_PREPROCESS_VARIABLES: PromptVariable[] = [
  {
    key: 'rawText',
    description: 'Raw extracted text from document',
    required: true,
    type: 'string',
  },
  {
    key: 'fileName',
    description: 'Original file name',
    required: true,
    type: 'string',
  },
  {
    key: 'fileType',
    description: 'File type (pdf, docx, etc.)',
    required: false,
    type: 'string',
  },
  {
    key: 'dateContext',
    description: 'Document date context',
    required: false,
    type: 'string',
  },
];

const DOCUMENT_PREPROCESS_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.DOCUMENT_PREPROCESS,
  category: PROMPT_CATEGORIES.DOCUMENT_ANALYSIS,
  name: 'Document Preprocessing',
  description: 'Clean and normalize raw document text, removing artifacts and formatting issues',
  systemPrompt: `You are a document preprocessing expert. Your task is to clean and normalize raw text extracted from documents.

Tasks:
1. Remove OCR artifacts and formatting noise
2. Fix broken words and sentences
3. Preserve document structure (sections, lists, tables)
4. Remove excessive whitespace
5. Standardize formatting
6. Preserve important metadata

Return the cleaned text ready for further processing.`,
  userPromptTemplate: `Clean and normalize this document text.

File: {{fileName}}{{#if fileType}} ({{fileType}}){{/if}}
{{#if dateContext}}Date: {{dateContext}}{{/if}}

Raw Text ({{rawText.length}} characters):
{{rawText}}

Return cleaned, well-structured text preserving the original meaning and structure but removing artifacts and noise.`,
  modelId: 'claude-haiku-4-5-20251001',
  temperature: 0.3,
  maxTokens: 8000,
  variables: DOCUMENT_PREPROCESS_VARIABLES,
});

/**
 * RFP Response Legacy
 * Priority: P3 - Low (deprecated, kept for backward compatibility)
 * Purpose: Legacy RFP response generation (pre-RAG)
 */
const RFP_RESPONSE_LEGACY_VARIABLES: PromptVariable[] = [
  {
    key: 'question',
    description: 'The RFP question to answer',
    required: true,
    type: 'string',
  },
  {
    key: 'context',
    description: 'Context information',
    required: true,
    type: 'string',
  },
  {
    key: 'clientName',
    description: 'Client name',
    required: false,
    type: 'string',
  },
  {
    key: 'clientIndustry',
    description: 'Client industry',
    required: false,
    type: 'string',
  },
  {
    key: 'additionalInstructions',
    description: 'Additional user instructions',
    required: false,
    type: 'string',
  },
];

const RFP_RESPONSE_LEGACY_PROMPT = createDefaultPrompt({
  promptKey: PROMPT_KEYS.RFP_RESPONSE_LEGACY,
  category: PROMPT_CATEGORIES.RFP_GENERATION,
  name: 'RFP Response Generation (Legacy)',
  description: '[DEPRECATED] Legacy RFP response generation - use RFP_RESPONSE_MAIN instead',
  systemPrompt: `You are an RFP response writer. Generate professional responses to RFP questions.

Note: This is a legacy prompt. New implementations should use RFP_RESPONSE_MAIN.`,
  userPromptTemplate: `Question: {{question}}

{{#if clientName}}Client: {{clientName}}{{/if}}
{{#if clientIndustry}}Industry: {{clientIndustry}}{{/if}}

Context:
{{context}}

{{#if additionalInstructions}}Instructions: {{additionalInstructions}}{{/if}}

Provide a professional response.`,
  modelId: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  maxTokens: 3000,
  variables: RFP_RESPONSE_LEGACY_VARIABLES,
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
  [PROMPT_KEYS.RAG_CHAT_SYNTHESIS, RAG_CHAT_SYNTHESIS_PROMPT],

  // P1 - High
  [PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE, QUESTION_CATEGORIZATION_PROMPT],
  [PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH, QUESTION_CATEGORIZATION_BATCH_PROMPT],
  [PROMPT_KEYS.HISTORICAL_MATCH_QA, HISTORICAL_RFP_MATCHING_PROMPT],
  [PROMPT_KEYS.AI_ENRICHMENT, AI_ENRICHMENT_PROMPT],
  [PROMPT_KEYS.DOCUMENT_ANALYSIS_SUPPORT, DOCUMENT_ANALYSIS_SUPPORT_PROMPT],
  [PROMPT_KEYS.CONTENT_TYPE_DETECT, CONTENT_TYPE_DETECT_PROMPT],
  [PROMPT_KEYS.DOCUMENT_PREPROCESS, DOCUMENT_PREPROCESS_PROMPT],

  // P2 - Medium
  [PROMPT_KEYS.COMPETITIVE_POSITIONING, COMPETITIVE_POSITIONING_PROMPT],
  [PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE, HISTORICAL_RFP_RESPONSE_PARSING_PROMPT],
  [PROMPT_KEYS.INTELLIGENCE_BRIEF, INTELLIGENCE_BRIEF_PROMPT],

  // P3 - Low (deprecated)
  [PROMPT_KEYS.RFP_RESPONSE_LEGACY, RFP_RESPONSE_LEGACY_PROMPT],
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
