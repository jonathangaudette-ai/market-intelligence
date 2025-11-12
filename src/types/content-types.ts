/**
 * Content Types for RFP Questions Classification
 *
 * Used by the surgical retrieval system to classify questions and match
 * them with relevant historical content from past RFPs.
 */

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

/**
 * Adaptation level for content reuse
 * - verbatim: Copy exactly as-is
 * - light: Minimal changes (names, dates)
 * - contextual: Adapt to current mandate context
 * - creative: Significant rewriting and expansion
 */
export type AdaptationLevel = 'verbatim' | 'light' | 'contextual' | 'creative';

/**
 * Source selection strategy
 * - auto: AI-selected based on similarity
 * - manual: User-selected sources
 * - hybrid: AI suggestions with user override
 */
export type SourceStrategy = 'auto' | 'manual' | 'hybrid';

/**
 * Reasoning effort for GPT-5 (Responses API)
 */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * RFP mode
 * - active: Currently being worked on
 * - historical: Past RFP (can be used as source)
 * - template: Reusable template
 */
export type RFPMode = 'active' | 'historical' | 'template';

/**
 * Content type detection result from AI
 */
export interface ContentTypeDetection {
  contentTypes: ContentType[];
  primaryContentType: ContentType;
  confidence: number; // 0.0-1.0
}

/**
 * RFP Source Preferences
 * Stores smart configuration for an RFP's content sources
 */
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

/**
 * Match result from historical import
 */
export interface MatchResult {
  question: string;
  response: string;
  section: string;
  confidence: number; // 0.0-1.0
  category?: string;
}

/**
 * RFP Scoring result
 */
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
 * Content type descriptions for AI classification
 */
export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  'company-overview': 'General company description, history, overview',
  'corporate-info': 'Corporate information: financial, certifications, awards',
  'team-structure': 'Team structure, organization chart, key personnel',
  'company-history': 'Company history, milestones, achievements, evolution',
  'values-culture': 'Company values, culture, mission, vision',
  'product-description': 'Product descriptions, features, specifications',
  'service-offering': 'Service offerings, capabilities, deliverables',
  'project-methodology': 'Project management methodology, approach, processes',
  'technical-solution': 'Technical solutions, architecture, implementation',
  'project-timeline': 'Timeline, schedule, milestones, deadlines',
  'pricing-structure': 'Pricing, budget, cost structure, payment terms'
};
