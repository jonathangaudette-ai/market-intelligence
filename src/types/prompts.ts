/**
 * Prompt Management Types
 *
 * Type-safe definitions for the configurable prompt system
 */

import { z } from 'zod';

/**
 * Prompt categories for organization
 */
export const PROMPT_CATEGORIES = {
  RFP_GENERATION: 'rfp_generation',
  QUESTION_ANALYSIS: 'question_analysis',
  DOCUMENT_ANALYSIS: 'document_analysis',
  INTELLIGENCE: 'intelligence',
  CHAT: 'chat',
  ENRICHMENT: 'enrichment',
} as const;

export type PromptCategory = typeof PROMPT_CATEGORIES[keyof typeof PROMPT_CATEGORIES];

/**
 * All prompt keys in the system
 */
export const PROMPT_KEYS = {
  // RFP Generation (2)
  RFP_RESPONSE_MAIN: 'rfp_response_main',
  RFP_RESPONSE_LEGACY: 'rfp_response_legacy',

  // Question Analysis (4)
  QUESTION_CATEGORIZE_SINGLE: 'question_categorize_single',
  QUESTION_CATEGORIZE_BATCH: 'question_categorize_batch',
  QUESTION_EXTRACT: 'question_extract',
  CONTENT_TYPE_DETECT: 'content_type_detect',

  // Historical Import (2)
  HISTORICAL_PARSE_RESPONSE: 'historical_parse_response',
  HISTORICAL_MATCH_QA: 'historical_match_qa',

  // Intelligence (1)
  INTELLIGENCE_BRIEF: 'intelligence_brief',

  // Enrichment (1)
  AI_ENRICHMENT: 'ai_enrichment',

  // Document Analysis (2)
  DOCUMENT_ANALYSIS_SUPPORT: 'document_analysis_support',
  DOCUMENT_PREPROCESS: 'document_preprocess',

  // Chat (1)
  RAG_CHAT_SYNTHESIS: 'rag_chat_synthesis',

  // Competitive (1)
  COMPETITIVE_POSITIONING: 'competitive_positioning',
} as const;

export type PromptKey = typeof PROMPT_KEYS[keyof typeof PROMPT_KEYS];

/**
 * Variable definition for a prompt
 */
export const promptVariableSchema = z.object({
  key: z.string(),
  description: z.string(),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  example: z.string().optional(),
});

export type PromptVariable = z.infer<typeof promptVariableSchema>;

/**
 * Prompt template stored in database
 */
export const promptTemplateSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  promptKey: z.string(),
  category: z.string(),

  // Prompt content
  systemPrompt: z.string().nullable().optional(),
  userPromptTemplate: z.string(),

  // Configuration overrides
  modelId: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().positive().nullable().optional(),

  // Metadata
  name: z.string(),
  description: z.string().nullable().optional(),
  variables: z.array(promptVariableSchema).nullable().optional(),

  // Versioning
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),

  // Audit
  createdBy: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

/**
 * Rendered prompt ready for AI
 */
export interface RenderedPrompt {
  system?: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Prompt update data (for saving)
 */
export const promptUpdateSchema = z.object({
  systemPrompt: z.string().nullable().optional(),
  userPromptTemplate: z.string().min(1, 'User prompt template is required'),
  modelId: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().positive().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type PromptUpdateData = z.infer<typeof promptUpdateSchema>;

/**
 * Prompt validation result
 */
export interface PromptValidation {
  isValid: boolean;
  syntaxErrors: string[];
  missingVariables: string[];
  unusedVariables: string[];
  testPassed: boolean;
  testOutput?: string;
  testError?: string;
  qualityScore: number; // 0-100
  suggestions: string[];
}

/**
 * Feature flag for gradual rollout
 */
export interface PromptFeatureFlag {
  promptKey: PromptKey;
  useDatabase: boolean; // true = DB, false = hardcoded
  rolloutPercentage: number; // 0-100
  enabledForCompanies: string[]; // company IDs in allowlist
  enabled: boolean; // global enable/disable
}

/**
 * Prompt execution metrics
 */
export interface PromptMetrics {
  promptKey: PromptKey;
  companyId: string;
  executionTimeMs: number;
  modelUsed: string;
  tokensUsed: number;
  success: boolean;
  errorType?: string;
  timestamp: Date;
}

/**
 * Variable schemas per prompt key
 *
 * These define the required/optional variables for each prompt
 */
export const PROMPT_VARIABLE_SCHEMAS = {
  // RFP Response Main
  [PROMPT_KEYS.RFP_RESPONSE_MAIN]: z.object({
    questionText: z.string().min(1, 'Question text is required'),
    contextText: z.string(),
    clientName: z.string().optional(),
    clientIndustry: z.string().optional(),
    wordLimit: z.number().optional(),
    category: z.string().default('general'),
    mode: z.enum(['comprehensive', 'concise']).default('comprehensive'),
  }),

  // AI Enrichment
  [PROMPT_KEYS.AI_ENRICHMENT]: z.object({
    clientName: z.string().min(1, 'Client name is required'),
    clientIndustry: z.string().optional(),
    rfpText: z.string().optional(),
    linkedinData: z.object({
      description: z.string().optional(),
      industry: z.string().optional(),
      employeeCount: z.number().optional(),
      specialties: z.array(z.string()).optional(),
      headquarters: z.string().optional(),
      founded: z.number().optional(),
      website: z.string().optional(),
    }).optional(),
    existingEnrichment: z.object({
      clientBackground: z.string().optional(),
      keyNeeds: z.string().optional(),
      constraints: z.string().optional(),
      relationships: z.string().optional(),
      customNotes: z.string().optional(),
    }).optional(),
    knowledgeBaseChunks: z.array(z.object({
      text: z.string(),
      source: z.string(),
      score: z.number(),
    })).optional(),
  }),

  // Question Categorization
  [PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE]: z.object({
    question: z.string().min(1, 'Question is required'),
  }),

  // Question Extraction
  [PROMPT_KEYS.QUESTION_EXTRACT]: z.object({
    text: z.string().min(1, 'Text is required'),
    maxQuestions: z.number().optional(),
  }),

  // RAG Chat Synthesis
  [PROMPT_KEYS.RAG_CHAT_SYNTHESIS]: z.object({
    query: z.string().min(1, 'Query is required'),
    context: z.string(),
    dateContext: z.string().optional(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional(),
  }),

  // Document Analysis
  [PROMPT_KEYS.DOCUMENT_ANALYSIS_SUPPORT]: z.object({
    filename: z.string(),
    extractedText: z.string().min(1, 'Extracted text is required'),
  }),

  // Content Type Detection
  [PROMPT_KEYS.CONTENT_TYPE_DETECT]: z.object({
    questionText: z.string().min(1, 'Question text is required'),
  }),

  // Intelligence Brief
  [PROMPT_KEYS.INTELLIGENCE_BRIEF]: z.object({
    title: z.string(),
    clientName: z.string().optional(),
    clientIndustry: z.string().optional(),
    questions: z.array(z.object({
      questionText: z.string(),
      category: z.string().optional(),
    })),
    deadline: z.string().optional(),
    dealValue: z.string().optional(),
  }),

  // Historical Parse Response
  [PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE]: z.object({
    responseText: z.string().min(1, 'Response text is required'),
  }),

  // Historical Match Q&A
  [PROMPT_KEYS.HISTORICAL_MATCH_QA]: z.object({
    questions: z.array(z.object({
      questionText: z.string(),
    })),
    responseStructure: z.string(),
  }),

  // Document Preprocessing
  [PROMPT_KEYS.DOCUMENT_PREPROCESS]: z.object({
    rawText: z.string().min(1, 'Raw text is required'),
    fileName: z.string(),
    fileType: z.string().optional(),
    dateContext: z.string().optional(),
  }),

  // Competitive Positioning
  [PROMPT_KEYS.COMPETITIVE_POSITIONING]: z.object({
    question: z.string().min(1, 'Question is required'),
    ourResponse: z.string().min(1, 'Our response is required'),
    competitors: z.array(z.string()),
    competitiveIntel: z.string().optional(),
  }),

  // RFP Response Legacy
  [PROMPT_KEYS.RFP_RESPONSE_LEGACY]: z.object({
    question: z.string().min(1, 'Question is required'),
    context: z.string(),
    clientName: z.string().optional(),
    clientIndustry: z.string().optional(),
    additionalInstructions: z.string().optional(),
  }),

  // Question Categorize Batch
  [PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH]: z.object({
    questions: z.array(z.object({
      questionText: z.string(),
      index: z.number(),
    })),
  }),
} as const;

/**
 * Type-safe variable type for a specific prompt
 */
export type PromptVariables<K extends PromptKey> =
  K extends keyof typeof PROMPT_VARIABLE_SCHEMAS
    ? z.infer<typeof PROMPT_VARIABLE_SCHEMAS[K]>
    : Record<string, any>;

/**
 * Helper to get variable schema for a prompt key
 */
export function getVariableSchema(promptKey: PromptKey): z.ZodSchema | undefined {
  return PROMPT_VARIABLE_SCHEMAS[promptKey as keyof typeof PROMPT_VARIABLE_SCHEMAS];
}

/**
 * Validate variables for a prompt
 */
export function validatePromptVariables<K extends PromptKey>(
  promptKey: K,
  variables: unknown
): { success: boolean; data?: PromptVariables<K>; errors?: z.ZodError } {
  const schema = getVariableSchema(promptKey);

  if (!schema) {
    return { success: true, data: variables as PromptVariables<K> };
  }

  const result = schema.safeParse(variables);

  if (result.success) {
    return { success: true, data: result.data as PromptVariables<K> };
  } else {
    return { success: false, errors: result.error };
  }
}
