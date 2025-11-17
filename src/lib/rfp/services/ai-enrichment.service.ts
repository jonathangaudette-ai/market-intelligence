/**
 * AI Enrichment Service
 *
 * This service uses Claude Haiku 4.5 to automatically enrich RFP context
 * by analyzing available company information and generating structured insights.
 */

import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

// Lazy initialization
let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

/**
 * AI enrichment result from Claude
 */
export interface AIEnrichmentResult {
  clientBackground?: string;
  keyNeeds?: string;
  constraints?: string;
  relationships?: string;
  customNotes?: string;
  confidence: number;
  model: string;
}

/**
 * Context data to analyze
 */
export interface EnrichmentContext {
  clientName: string;
  clientIndustry?: string;
  rfpText?: string;
  linkedinData?: {
    description?: string;
    industry?: string;
    employeeCount?: number;
    specialties?: string[];
    headquarters?: string;
    founded?: number;
    website?: string;
  };
  existingEnrichment?: {
    clientBackground?: string;
    keyNeeds?: string;
    constraints?: string;
    relationships?: string;
    customNotes?: string;
  };
  knowledgeBaseChunks?: Array<{
    text: string;
    source: string;
    score: number;
  }>;
}

/**
 * Analyze company context and generate enrichment using Claude Haiku 4.5
 *
 * This function extracts:
 * - Client background (history, mission, culture)
 * - Key needs identified (challenges and opportunities)
 * - Known constraints (budget, technical, organizational)
 * - Relationships and history (key decision makers, existing relationships)
 * - Additional notes (relevant information for personalization)
 */
export async function generateAIEnrichment(
  context: EnrichmentContext,
  options: {
    useCache?: boolean;
    retryWithSonnet?: boolean;
    model?: 'haiku' | 'sonnet';
  } = {}
): Promise<AIEnrichmentResult> {
  const { useCache = true, retryWithSonnet = true, model = 'haiku' } = options;

  // Check cache first
  if (useCache) {
    const cached = await getCachedEnrichment(context.clientName);
    if (cached) {
      console.log(`[AIEnrichment] Using cached enrichment for ${context.clientName}`);
      return cached;
    }
  }

  const prompt = buildEnrichmentPrompt(context);
  const selectedModel = model === 'haiku' ? CLAUDE_MODELS.haiku : CLAUDE_MODELS.sonnet;

  try {
    console.log(`[AIEnrichment] Generating enrichment for ${context.clientName} using ${model}`);

    const response = await getAnthropic().messages.create({
      model: selectedModel,
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const result = parseEnrichmentResponse(content.text, selectedModel);

    // Validate confidence
    if (retryWithSonnet && model === 'haiku' && result.confidence < 0.7) {
      console.log(
        `[AIEnrichment] Low confidence (${result.confidence}), retrying with Sonnet`
      );
      return await generateAIEnrichment(context, {
        ...options,
        model: 'sonnet',
        retryWithSonnet: false // Prevent infinite retry
      });
    }

    // Cache successful enrichment
    if (useCache) {
      await cacheEnrichment(context.clientName, result);
    }

    console.log(
      `[AIEnrichment] Generated enrichment for ${context.clientName} (confidence: ${result.confidence})`
    );

    return result;
  } catch (error) {
    console.error('[AIEnrichment] Error generating enrichment:', error);

    // Fallback to Sonnet if Haiku fails
    if (retryWithSonnet && model === 'haiku') {
      console.log('[AIEnrichment] Haiku failed, retrying with Sonnet');
      return await generateAIEnrichment(context, {
        ...options,
        model: 'sonnet',
        retryWithSonnet: false
      });
    }

    throw error;
  }
}

/**
 * Build the enrichment prompt from context
 */
function buildEnrichmentPrompt(context: EnrichmentContext): string {
  let promptText = `Tu es un expert en analyse d'entreprise et de contexte client pour des appels d'offres (RFPs).

Analyse les informations disponibles sur le client "${context.clientName}" et génère un enrichissement structuré pour aider à personnaliser les réponses RFP.

`;

  // Add available context
  promptText += `**INFORMATIONS DISPONIBLES:**\n\n`;

  // Basic info
  promptText += `**Client:** ${context.clientName}\n`;
  if (context.clientIndustry) {
    promptText += `**Industrie:** ${context.clientIndustry}\n`;
  }

  // LinkedIn data
  if (context.linkedinData) {
    const li = context.linkedinData;
    promptText += `\n**DONNÉES LINKEDIN:**\n`;
    if (li.description) promptText += `- Description: ${li.description}\n`;
    if (li.industry) promptText += `- Industrie: ${li.industry}\n`;
    if (li.employeeCount) promptText += `- Nombre d'employés: ${li.employeeCount}\n`;
    if (li.specialties && li.specialties.length > 0) {
      promptText += `- Spécialités: ${li.specialties.join(', ')}\n`;
    }
    if (li.headquarters) promptText += `- Siège social: ${li.headquarters}\n`;
    if (li.founded) promptText += `- Fondée en: ${li.founded}\n`;
    if (li.website) promptText += `- Site web: ${li.website}\n`;
  }

  // Knowledge base chunks
  if (context.knowledgeBaseChunks && context.knowledgeBaseChunks.length > 0) {
    promptText += `\n**BASE DE CONNAISSANCES (documents pertinents):**\n`;
    context.knowledgeBaseChunks.slice(0, 5).forEach((chunk, i) => {
      const preview = chunk.text.substring(0, 300);
      promptText += `\n${i + 1}. [Score: ${chunk.score.toFixed(2)}, Source: ${chunk.source}]\n${preview}...\n`;
    });
  }

  // RFP text excerpt (first 2000 chars)
  if (context.rfpText) {
    const excerpt = context.rfpText.substring(0, 2000);
    promptText += `\n**EXTRAIT DU RFP:**\n${excerpt}${context.rfpText.length > 2000 ? '...' : ''}\n`;
  }

  // Existing enrichment (for updates)
  if (context.existingEnrichment) {
    promptText += `\n**ENRICHISSEMENT EXISTANT (à améliorer si possible):**\n`;
    if (context.existingEnrichment.clientBackground) {
      promptText += `- Contexte: ${context.existingEnrichment.clientBackground}\n`;
    }
    if (context.existingEnrichment.keyNeeds) {
      promptText += `- Besoins: ${context.existingEnrichment.keyNeeds}\n`;
    }
    if (context.existingEnrichment.constraints) {
      promptText += `- Contraintes: ${context.existingEnrichment.constraints}\n`;
    }
    if (context.existingEnrichment.relationships) {
      promptText += `- Relations: ${context.existingEnrichment.relationships}\n`;
    }
    if (context.existingEnrichment.customNotes) {
      promptText += `- Notes: ${context.existingEnrichment.customNotes}\n`;
    }
  }

  promptText += `

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
- Écris en français
`;

  return promptText;
}

/**
 * Parse Claude's response to extract the JSON enrichment
 */
function parseEnrichmentResponse(responseText: string, model: string): AIEnrichmentResult {
  // Try to extract JSON from response
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Also try to find JSON object directly
  const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonText = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonText);

    // Validate confidence field
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      console.warn('[AIEnrichment] Invalid confidence, defaulting to 0.8');
      parsed.confidence = 0.8;
    }

    // Return the result with model info
    return {
      clientBackground: parsed.clientBackground || undefined,
      keyNeeds: parsed.keyNeeds || undefined,
      constraints: parsed.constraints || undefined,
      relationships: parsed.relationships || undefined,
      customNotes: parsed.customNotes || undefined,
      confidence: parsed.confidence,
      model,
    };
  } catch (error) {
    console.error('[AIEnrichment] Failed to parse response:', responseText.substring(0, 500));
    throw new Error(`Failed to parse Claude response: ${error}`);
  }
}

/**
 * Simple in-memory cache for enrichments
 * In production, this would use Redis or similar
 */
const enrichmentCache = new Map<string, { enrichment: AIEnrichmentResult; timestamp: number }>();

/**
 * Get cached enrichment if available and not expired (24 hours)
 */
async function getCachedEnrichment(clientName: string): Promise<AIEnrichmentResult | null> {
  const cached = enrichmentCache.get(clientName);
  if (!cached) return null;

  // Cache expires after 24 hours
  const age = Date.now() - cached.timestamp;
  if (age > 24 * 60 * 60 * 1000) {
    enrichmentCache.delete(clientName);
    return null;
  }

  return cached.enrichment;
}

/**
 * Cache enrichment result
 */
async function cacheEnrichment(clientName: string, enrichment: AIEnrichmentResult): Promise<void> {
  enrichmentCache.set(clientName, {
    enrichment,
    timestamp: Date.now(),
  });

  // Limit cache size to 1000 entries
  if (enrichmentCache.size > 1000) {
    const firstKey = enrichmentCache.keys().next().value;
    if (firstKey) {
      enrichmentCache.delete(firstKey);
    }
  }
}

/**
 * Clear enrichment cache (useful for testing)
 */
export function clearEnrichmentCache(): void {
  enrichmentCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: enrichmentCache.size,
    entries: Array.from(enrichmentCache.keys()),
  };
}
