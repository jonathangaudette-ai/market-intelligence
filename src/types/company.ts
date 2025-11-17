/**
 * AI Model Types for Company Settings
 */

// Supported AI models for RFP response generation
export const AI_MODELS = {
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
} as const;

// Type for AI model IDs
export type AIModelId = typeof AI_MODELS[keyof typeof AI_MODELS];

// Default model
export const DEFAULT_AI_MODEL: AIModelId = AI_MODELS.SONNET_4_5;

// Model metadata for UI display
export interface AIModelMetadata {
  id: AIModelId;
  name: string;
  description: string;
  speed: 'fast' | 'balanced';
  cost: 'low' | 'medium';
  quality: 'good' | 'excellent';
}

export const AI_MODEL_METADATA: Record<AIModelId, AIModelMetadata> = {
  [AI_MODELS.SONNET_4_5]: {
    id: AI_MODELS.SONNET_4_5,
    name: 'Claude 4.5 Sonnet',
    description: 'Balanced performance with excellent quality responses',
    speed: 'balanced',
    cost: 'medium',
    quality: 'excellent',
  },
  [AI_MODELS.HAIKU_4_5]: {
    id: AI_MODELS.HAIKU_4_5,
    name: 'Claude 4.5 Haiku',
    description: 'Fast and cost-effective for demo environments',
    speed: 'fast',
    cost: 'low',
    quality: 'good',
  },
};

// Company settings type
export interface CompanySettings {
  aiModel?: AIModelId;
  website?: string;
  description?: string;
  industry?: string;
}

// Helper function to validate AI model ID
export function isValidAIModel(model: string): model is AIModelId {
  return Object.values(AI_MODELS).includes(model as AIModelId);
}

// Helper function to get AI model or default
export function getAIModelOrDefault(settings?: CompanySettings | null): AIModelId {
  if (settings?.aiModel && isValidAIModel(settings.aiModel)) {
    return settings.aiModel;
  }
  return DEFAULT_AI_MODEL;
}
