/**
 * AI Model Configurations for RFP Surgical Retrieval System
 *
 * GPT-5 configurations for the Responses API
 * Note: GPT-5 does NOT support temperature or top_p parameters.
 * Use reasoning.effort and text.verbosity instead.
 */

export interface GPT5Config {
  model: 'gpt-5';
  reasoning?: {
    effort: 'minimal' | 'low' | 'medium' | 'high';
  };
  text?: {
    verbosity: 'low' | 'medium' | 'high';
  };
}

/**
 * GPT-5 configurations by use case
 */
export const GPT5_CONFIGS = {
  // Extraction rapide de questions RFP
  extraction: {
    model: 'gpt-5',
    reasoning: { effort: 'minimal' },  // Rapide, excellent pour instruction following
    text: { verbosity: 'low' }         // Réponses concises
  } as GPT5Config,

  // Parsing de document de réponse historique
  parsing: {
    model: 'gpt-5',
    reasoning: { effort: 'low' },      // Structure extraction
    text: { verbosity: 'medium' }
  } as GPT5Config,

  // Matching questions ↔ réponses
  matching: {
    model: 'gpt-5',
    reasoning: { effort: 'medium' },   // Raisonnement modéré requis
    text: { verbosity: 'medium' }
  } as GPT5Config,
};

/**
 * Fallback configuration for GPT-4o when GPT-5 is not available
 */
export const GPT4O_FALLBACK = {
  model: 'gpt-4o',
  temperature: 0.7,
  response_format: { type: 'json_object' as const }
};

/**
 * Claude model configurations
 */
export const CLAUDE_MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-haiku-4-5-20251001', // Claude 4.5 Haiku
} as const;

/**
 * Get AI model from company settings or use default
 */
export function getAIModelOrDefault(settings?: { aiModel?: string }): string {
  return settings?.aiModel || CLAUDE_MODELS.sonnet;
}
