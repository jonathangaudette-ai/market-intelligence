/**
 * Intelligent Document Pre-Processor
 * Uses Claude Sonnet 4 with extended thinking to analyze, classify, and filter documents
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  DocumentType,
  SectionType,
  AnalysisConfig,
  getAnalysisConfig,
} from "./analysis-config";
import { getDateContextString } from "@/lib/utils/date";

// Lazy initialization to avoid connecting during build time
let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

// ============================================================================
// Types
// ============================================================================

export interface DocumentAnalysis {
  // Classification globale
  documentType: DocumentType;
  industry: string;
  language: string;
  confidence: number; // 0-1

  // Sections classifiées
  sections: DocumentSection[];

  // Métadonnées extraites (structure varie selon le type de document)
  metadata: DocumentMetadata;

  // Signaux détectés
  signals: DetectedSignal[];

  // Contenu à exclure (pour transparence)
  excludedSections: ExcludedSection[];

  // Raisonnement du modèle (extended thinking)
  reasoning?: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  type: SectionType;
  relevanceScore: number; // 0-10
  shouldIndex: boolean;
  tags: string[];
  reasoning: string; // Pourquoi cette classification
}

export interface DocumentMetadata {
  // Commun à tous types
  dateRange?: string;
  language: string;
  pageCount?: number;

  // Rapports concurrentiels
  competitors?: string[];
  strategicThemes?: string[];
  products?: string[];
  marketSegments?: string[];

  // Rapports financiers
  fiscalPeriod?: string;
  revenue?: {
    current: string;
    previous?: string;
    change?: string;
  };
  profitability?: {
    margin: string;
    change?: string;
  };
  growthMetrics?: Array<{
    name: string;
    value: string;
    change?: string;
  }>;

  // Contrats
  contractType?: string;
  parties?: string[];
  pricing?: {
    model: string; // "subscription", "usage-based", "fixed"
    amount?: string;
    currency?: string;
    details?: string;
  };
  terms?: {
    duration: string;
    startDate?: string;
    endDate?: string;
  };
  clauses?: Array<{
    type: string; // "SLA", "confidentiality", "termination", etc.
    summary: string;
  }>;
  paymentTerms?: {
    schedule: string;
    method?: string;
  };
  renewalTerms?: {
    autoRenewal: boolean;
    noticePeriod?: string;
  };

  // Appels d'offres (RFP)
  issuer?: string;
  deadline?: string;
  budget?: {
    min?: string;
    max?: string;
    currency?: string;
  };
  requirements?: string[];
  evaluationCriteria?: string[];
  scope?: string;

  // Embauche (détecté dans divers types de docs)
  hiringData?: {
    companies: string[];
    positions: Array<{
      title: string;
      department: string;
      count?: number;
    }>;
    trends?: string;
  };
}

export interface DetectedSignal {
  type: "competitor_mention" | "price_change" | "hiring_spike" | "new_product" | "contract_win";
  severity: "low" | "medium" | "high";
  summary: string;
  details: string;
  relatedEntities: string[]; // Competitors, products, etc.
}

export interface ExcludedSection {
  title: string;
  reason: string;
  preview: string; // Premiers 100 caractères
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export async function analyzeDocument(
  rawText: string,
  companyId: string,
  options?: {
    fileName?: string;
    fileType?: string;
  }
): Promise<DocumentAnalysis> {
  // 1. Récupérer la configuration d'analyse pour cette compagnie
  const config = await getAnalysisConfig(companyId);

  // 2. Construire le prompt avec les règles configurées
  const prompt = buildAnalysisPrompt(rawText, config, options);

  // 3. Appeler Claude Sonnet 4.5 avec extended thinking
  // Note: Extended thinking via API parameter may require specific SDK version
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8000,
    temperature: 0, // Déterministe pour classification
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  } as any); // Cast to any to support future thinking parameter

  // 4. Extraire le thinking (raisonnement) et le contenu
  // Note: Extended thinking blocks may not be available in current SDK version
  let reasoning = "";
  let analysisText = "";

  for (const block of response.content) {
    const blockAny = block as any;
    if (blockAny.type === "thinking") {
      reasoning = blockAny.thinking;
    } else if (block.type === "text") {
      analysisText = block.text;
    }
  }

  // 5. Parser la réponse JSON - ULTRA ROBUSTE
  let analysis: DocumentAnalysis;
  try {
    let jsonText = analysisText.trim();

    // Strategy 1: Try multiple patterns to extract JSON from markdown
    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,  // ```json ... ```
      /```\s*({\s*"documentType"[\s\S]*?})\s*```/, // ``` {...} ```
      /({\s*"documentType"[\s\S]*})/,  // Direct JSON
    ];

    for (const pattern of patterns) {
      const match = analysisText.match(pattern);
      if (match && match[1]) {
        jsonText = match[1].trim();
        break;
      }
    }

    // Strategy 2: If no pattern matched, find the largest {...} block
    if (jsonText === analysisText || !jsonText.startsWith('{')) {
      const jsonBlocks: string[] = [];
      let depth = 0;
      let start = -1;

      for (let i = 0; i < analysisText.length; i++) {
        if (analysisText[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (analysisText[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            jsonBlocks.push(analysisText.substring(start, i + 1));
            start = -1;
          }
        }
      }

      // Take the largest JSON block (likely the complete response)
      if (jsonBlocks.length > 0) {
        jsonText = jsonBlocks.reduce((a, b) => a.length > b.length ? a : b);
      }
    }

    console.log(`[analyzeDocument] Attempting to parse JSON (length: ${jsonText.length})`);
    console.log(`[analyzeDocument] JSON preview: ${jsonText.substring(0, 150)}...`);

    analysis = JSON.parse(jsonText);
    analysis.reasoning = reasoning;
    console.log(`[analyzeDocument] ✓ Successfully parsed analysis for document type: ${analysis.documentType}`);
  } catch (error) {
    console.error("[analyzeDocument] ✗ Failed to parse analysis JSON:", error);
    console.error("[analyzeDocument] Raw response length:", analysisText.length);
    console.error("[analyzeDocument] First 1000 chars:", analysisText.substring(0, 1000));
    console.error("[analyzeDocument] Last 1000 chars:", analysisText.substring(Math.max(0, analysisText.length - 1000)));
    throw new Error("Failed to parse document analysis response");
  }

  // 6. Appliquer les règles d'exclusion post-analyse
  analysis = applyExclusionRules(analysis, config);

  // 7. Retourner l'analyse complète
  return analysis;
}

// ============================================================================
// Prompt Builder
// ============================================================================

function buildAnalysisPrompt(
  rawText: string,
  config: AnalysisConfig,
  options?: { fileName?: string; fileType?: string }
): string {
  const exclusionRulesDesc = config.exclusionRules
    .filter((rule) => rule.enabled)
    .map((rule) => `- ${rule.name}: ${rule.description}`)
    .join("\n");

  const metadataRulesDesc = config.metadataExtractionRules
    .filter((rule) => rule.enabled)
    .map((rule) => {
      const fields = rule.fields.map((f) => `  - ${f.key}: ${f.description}`).join("\n");
      return `${rule.name} (${rule.documentTypes.join(", ")}):\n${fields}`;
    })
    .join("\n\n");

  const dateContext = getDateContextString();

  return `Tu es un expert en analyse de documents pour l'intelligence concurrentielle et de marché.

${dateContext}

Analyse ce document de façon approfondie et structurée.

${options?.fileName ? `Nom du fichier: ${options.fileName}` : ""}
${options?.fileType ? `Type de fichier: ${options.fileType}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENT À ANALYSER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${rawText.substring(0, 50000)} ${rawText.length > 50000 ? "\n\n[Document tronqué pour l'analyse...]" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TÂCHES D'ANALYSE:

1. **CLASSIFICATION GLOBALE**
   - Identifie le type de document parmi: competitive_report, financial_report, market_analysis, product_spec, press_article, contract, rfp, deep_research, other
   - Détermine l'industrie/secteur
   - Détecte la langue principale
   - Attribue un score de confiance (0-1)

2. **SEGMENTATION ET CLASSIFICATION DES SECTIONS**
   - Découpe le document en sections logiques
   - Classe chaque section par type (executive_summary, financial_data, market_trends, competitive_analysis, strategy, pricing, contract_terms, rfp_requirements, hiring_data, product_features, non_relevant)
   - Attribue un score de pertinence à chaque section (0-10)
   - Marque les sections à indexer (shouldIndex: true/false)
   - Extrait des tags pertinents pour chaque section
   - Explique le raisonnement pour chaque classification

3. **RÈGLES D'EXCLUSION À APPLIQUER**
${exclusionRulesDesc}

   Seuil minimum de pertinence: ${config.minRelevanceScore}/10

4. **EXTRACTION DE MÉTADONNÉES**
   Extrait les métadonnées spécifiques selon le type de document:

${metadataRulesDesc}

5. **DÉTECTION DE SIGNAUX**
   Détecte automatiquement:
   - Mentions de concurrents
   - Changements de prix
   - Pics de recrutement (${config.signalDetectionRules.find((r) => r.id === "hiring_spike")?.triggers[0].threshold}+ postes)
   - Nouveaux produits
   - Contrats remportés

6. **SECTIONS EXCLUES**
   Liste les sections exclues avec leur raison (disclaimer, table of contents, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS IMPORTANTES:

- Utilise ton raisonnement étendu (thinking) pour analyser en profondeur
- Sois particulièrement attentif aux **prix, clauses contractuelles, et données d'embauche**
- Pour les contrats: extrait TOUS les détails de prix, durée, et clauses importantes
- Pour les appels d'offres: identifie le budget, deadline, et exigences clés
- Pour les données RH: détecte les tendances de recrutement (volume, départements)
- Pour les rapports concurrentiels: identifie tous les concurrents mentionnés
- Sois strict sur le score de pertinence (< ${config.minRelevanceScore} = exclusion)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Réponds UNIQUEMENT avec un JSON valide selon cette structure:

\`\`\`json
{
  "documentType": "competitive_report" | "financial_report" | "market_analysis" | "product_spec" | "press_article" | "contract" | "rfp" | "deep_research" | "other",
  "industry": "string",
  "language": "string",
  "confidence": 0.95,

  "sections": [
    {
      "id": "section-1",
      "title": "Executive Summary",
      "content": "Full text of section...",
      "type": "executive_summary",
      "relevanceScore": 10,
      "shouldIndex": true,
      "tags": ["Q4 2024", "revenue growth", "AI adoption"],
      "reasoning": "High-level strategic insights critical for intelligence queries"
    }
  ],

  "metadata": {
    "dateRange": "Q4 2024",
    "competitors": ["Competitor A", "Competitor B"],
    "strategicThemes": ["AI adoption", "Market expansion"],
    "pricing": { "model": "subscription", "amount": "$99/month", "currency": "USD" },
    "hiringData": {
      "companies": ["Competitor A"],
      "positions": [{ "title": "Senior AI Engineer", "department": "Engineering", "count": 5 }],
      "trends": "40% increase in engineering hiring"
    }
  },

  "signals": [
    {
      "type": "hiring_spike",
      "severity": "high",
      "summary": "Competitor A increased engineering hiring by 40%",
      "details": "5 Senior AI Engineer positions posted in the last month",
      "relatedEntities": ["Competitor A"]
    }
  ],

  "excludedSections": [
    {
      "title": "Disclaimer",
      "reason": "Legal boilerplate - no business intelligence value",
      "preview": "DISCLAIMER: This document is confidential..."
    }
  ]
}
\`\`\``;
}

// ============================================================================
// Post-Processing: Apply Exclusion Rules
// ============================================================================

function applyExclusionRules(
  analysis: DocumentAnalysis,
  config: AnalysisConfig
): DocumentAnalysis {
  // Filtrer les sections selon le seuil de pertinence
  analysis.sections = analysis.sections.filter(
    (section) => section.relevanceScore >= config.minRelevanceScore
  );

  // Marquer shouldIndex=false pour les sections non pertinentes
  analysis.sections = analysis.sections.map((section) => {
    if (section.type === "non_relevant" || section.relevanceScore < config.minRelevanceScore) {
      section.shouldIndex = false;
    }
    return section;
  });

  return analysis;
}

// ============================================================================
// Helper: Get Indexable Content
// ============================================================================

export function getIndexableContent(analysis: DocumentAnalysis): string[] {
  return analysis.sections
    .filter((section) => section.shouldIndex)
    .map((section) => section.content);
}

// ============================================================================
// Helper: Get Enriched Metadata for Vector Storage
// ============================================================================

export function getEnrichedMetadata(analysis: DocumentAnalysis) {
  return {
    // Classification
    document_type: analysis.documentType,
    industry: analysis.industry,
    language: analysis.language,

    // Métadonnées communes
    date_range: analysis.metadata.dateRange,
    competitors: analysis.metadata.competitors || [],
    strategic_themes: analysis.metadata.strategicThemes || [],
    products: analysis.metadata.products || [],

    // Métadonnées spécifiques
    ...(analysis.documentType === "contract" && {
      contract_type: analysis.metadata.contractType,
      pricing_model: analysis.metadata.pricing?.model,
      pricing_amount: analysis.metadata.pricing?.amount,
    }),

    ...(analysis.documentType === "rfp" && {
      rfp_issuer: analysis.metadata.issuer,
      rfp_deadline: analysis.metadata.deadline,
      rfp_budget: analysis.metadata.budget,
    }),

    ...(analysis.metadata.hiringData && {
      hiring_companies: analysis.metadata.hiringData.companies,
      hiring_positions: analysis.metadata.hiringData.positions.map((p) => p.title),
    }),
  };
}
