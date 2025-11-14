/**
 * Document Analysis Service
 * Phase 1 - Support Docs RAG v4.0
 *
 * This service uses Claude to automatically categorize uploaded support documents
 * and suggest relevant tags for better RAG retrieval.
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
 * Document analysis result from Claude
 */
export interface DocumentAnalysis {
  documentType: string;
  confidence: number;
  suggestedCategories: Array<{
    category: string;
    confidence: number;
  }>;
  contentTypeTags: string[];
  executiveSummary: string;
  recommendedPurpose: 'rfp_support' | 'rfp_response' | 'company_info';
}

/**
 * Available RFP categories for matching
 */
export const RFP_CATEGORIES = [
  'project-methodology',
  'technical-solution',
  'team-structure',
  'case-study',
  'certifications',
  'financial-info',
  'legal-compliance',
  'product-catalog',
  'company-overview',
  'security-privacy',
  'performance-sla',
  'training-support',
] as const;

/**
 * Document types that can be detected
 */
export const DOCUMENT_TYPES = [
  'methodology_guide',
  'case_study',
  'technical_spec',
  'certification',
  'financial_info',
  'company_overview',
  'product_datasheet',
  'security_whitepaper',
  'service_agreement',
  'training_manual',
  'other',
] as const;

/**
 * Analyze a document using Claude Haiku (fast and cheap)
 *
 * This function extracts:
 * - Document type
 * - Suggested RFP categories
 * - Content tags
 * - Executive summary
 * - Recommended purpose (support doc vs company info)
 */
export async function analyzeDocument(
  extractedText: string,
  filename: string,
  options: {
    useCache?: boolean;
    retryWithSonnet?: boolean;
  } = {}
): Promise<DocumentAnalysis> {
  const { useCache = true, retryWithSonnet = true } = options;

  // Check cache first
  if (useCache) {
    const cached = await getCachedAnalysis(filename);
    if (cached) {
      console.log(`[DocumentAnalysis] Using cached analysis for ${filename}`);
      return cached;
    }
  }

  // Truncate text to first 100K characters for analysis
  const truncatedText = extractedText.slice(0, 100000);

  const prompt = `Tu es un expert en analyse de documents d'entreprise pour des appels d'offres (RFPs).

Analyse ce document et fournis une analyse structurée en JSON.

**Nom du fichier:** ${filename}

**Types de documents possibles:**
${DOCUMENT_TYPES.map((t) => `- ${t}`).join('\n')}

**Catégories RFP disponibles:**
${RFP_CATEGORIES.map((c) => `- ${c}`).join('\n')}

**Ton analyse doit déterminer:**
1. Type de document (parmi les types possibles)
2. Niveau de confiance (0-1) de cette classification
3. Catégories RFP pertinentes (avec score de confiance pour chacune)
4. Tags de contenu (mots-clés décrivant le contenu)
5. Résumé exécutif (2-3 phrases)
6. Usage recommandé: "rfp_support" (document pour répondre aux RFPs), "rfp_response" (réponse historique), ou "company_info" (info générale entreprise)

**Format de sortie (JSON strict):**
\`\`\`json
{
  "documentType": "methodology_guide",
  "confidence": 0.95,
  "suggestedCategories": [
    { "category": "project-methodology", "confidence": 0.92 },
    { "category": "team-structure", "confidence": 0.78 }
  ],
  "contentTypeTags": ["agile", "scrum", "sprint-planning", "project-management"],
  "executiveSummary": "Ce document décrit la méthodologie Agile utilisée par l'entreprise, incluant les processus Scrum et la planification des sprints.",
  "recommendedPurpose": "rfp_support"
}
\`\`\`

**Contenu du document (premiers 100K caractères):**
${truncatedText}

**Important:** Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`;

  try {
    // Try with Claude Haiku first (fast and cheap)
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODELS.haiku,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    const result = parseAnalysisResponse(content.text);

    // Validate confidence
    if (retryWithSonnet && result.confidence < 0.7) {
      console.log(
        `[DocumentAnalysis] Low confidence (${result.confidence}), retrying with Sonnet`
      );
      return await analyzeDocumentWithSonnet(extractedText, filename);
    }

    // Cache successful analysis
    if (useCache) {
      await cacheAnalysis(filename, result);
    }

    console.log(
      `[DocumentAnalysis] Analyzed ${filename}: ${result.documentType} (confidence: ${result.confidence})`
    );

    return result;
  } catch (error) {
    console.error('[DocumentAnalysis] Error analyzing document:', error);

    // Fallback to Sonnet if Haiku fails
    if (retryWithSonnet) {
      console.log('[DocumentAnalysis] Haiku failed, retrying with Sonnet');
      return await analyzeDocumentWithSonnet(extractedText, filename);
    }

    throw error;
  }
}

/**
 * Analyze document using Claude Sonnet (more powerful, slower, more expensive)
 */
async function analyzeDocumentWithSonnet(
  extractedText: string,
  filename: string
): Promise<DocumentAnalysis> {
  const truncatedText = extractedText.slice(0, 100000);

  const prompt = `Tu es un expert en analyse de documents d'entreprise pour des appels d'offres (RFPs).

Analyse ce document avec attention et fournis une analyse structurée en JSON.

**Nom du fichier:** ${filename}

**Types de documents possibles:**
${DOCUMENT_TYPES.map((t) => `- ${t}`).join('\n')}

**Catégories RFP disponibles:**
${RFP_CATEGORIES.map((c) => `- ${c}`).join('\n')}

**Ton analyse doit déterminer:**
1. Type de document (parmi les types possibles)
2. Niveau de confiance (0-1) de cette classification
3. Catégories RFP pertinentes (avec score de confiance pour chacune)
4. Tags de contenu (mots-clés décrivant le contenu)
5. Résumé exécutif (2-3 phrases)
6. Usage recommandé: "rfp_support" (document pour répondre aux RFPs), "rfp_response" (réponse historique), ou "company_info" (info générale entreprise)

**Format de sortie (JSON strict):**
\`\`\`json
{
  "documentType": "methodology_guide",
  "confidence": 0.95,
  "suggestedCategories": [
    { "category": "project-methodology", "confidence": 0.92 },
    { "category": "team-structure", "confidence": 0.78 }
  ],
  "contentTypeTags": ["agile", "scrum", "sprint-planning", "project-management"],
  "executiveSummary": "Ce document décrit la méthodologie Agile utilisée par l'entreprise, incluant les processus Scrum et la planification des sprints.",
  "recommendedPurpose": "rfp_support"
}
\`\`\`

**Contenu du document (premiers 100K caractères):**
${truncatedText}

**Important:** Réponds UNIQUEMENT avec le JSON, sans texte additionnel.`;

  const response = await getAnthropic().messages.create({
    model: CLAUDE_MODELS.sonnet,
    max_tokens: 4096,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude Sonnet');
  }

  const result = parseAnalysisResponse(content.text);

  console.log(
    `[DocumentAnalysis] Analyzed with Sonnet ${filename}: ${result.documentType} (confidence: ${result.confidence})`
  );

  return result;
}

/**
 * Parse Claude's response to extract the JSON analysis
 */
function parseAnalysisResponse(responseText: string): DocumentAnalysis {
  // Try to extract JSON from response
  // Claude might wrap it in ```json ``` or just return plain JSON
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

    // Validate required fields
    if (
      !parsed.documentType ||
      !parsed.confidence ||
      !parsed.suggestedCategories ||
      !parsed.contentTypeTags ||
      !parsed.executiveSummary ||
      !parsed.recommendedPurpose
    ) {
      throw new Error('Missing required fields in analysis response');
    }

    return parsed as DocumentAnalysis;
  } catch (error) {
    console.error('[DocumentAnalysis] Failed to parse response:', responseText);
    throw new Error(`Failed to parse Claude response: ${error}`);
  }
}

/**
 * Simple in-memory cache for document analyses
 * In production, this would use Redis or similar
 */
const analysisCache = new Map<string, { analysis: DocumentAnalysis; timestamp: number }>();

/**
 * Get cached analysis if available and not expired (24 hours)
 */
async function getCachedAnalysis(filename: string): Promise<DocumentAnalysis | null> {
  const cached = analysisCache.get(filename);
  if (!cached) return null;

  // Cache expires after 24 hours
  const age = Date.now() - cached.timestamp;
  if (age > 24 * 60 * 60 * 1000) {
    analysisCache.delete(filename);
    return null;
  }

  return cached.analysis;
}

/**
 * Cache analysis result
 */
async function cacheAnalysis(filename: string, analysis: DocumentAnalysis): Promise<void> {
  analysisCache.set(filename, {
    analysis,
    timestamp: Date.now(),
  });

  // Limit cache size to 1000 entries
  if (analysisCache.size > 1000) {
    const firstKey = analysisCache.keys().next().value;
    analysisCache.delete(firstKey);
  }
}

/**
 * Clear analysis cache (useful for testing)
 */
export function clearAnalysisCache(): void {
  analysisCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: analysisCache.size,
    entries: Array.from(analysisCache.keys()),
  };
}
