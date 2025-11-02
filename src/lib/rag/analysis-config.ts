/**
 * Configuration for intelligent document analysis
 * Defines rules for content classification, filtering, and metadata extraction
 */

export type DocumentType =
  | "competitive_report"
  | "financial_report"
  | "market_analysis"
  | "product_spec"
  | "press_article"
  | "contract"
  | "rfp" // Request for Proposal / Appel d'offres
  | "deep_research"
  | "other";

export type SectionType =
  | "executive_summary"
  | "financial_data"
  | "market_trends"
  | "competitive_analysis"
  | "strategy"
  | "pricing"
  | "contract_terms"
  | "rfp_requirements"
  | "hiring_data"
  | "product_features"
  | "non_relevant";

export interface AnalysisConfig {
  // Règles d'exclusion (configurable par type de document)
  exclusionRules: ExclusionRule[];

  // Seuil de pertinence minimum (0-10)
  minRelevanceScore: number;

  // Métadonnées à extraire par type de document
  metadataExtractionRules: MetadataExtractionRule[];

  // Détection de signaux automatiques
  signalDetectionRules: SignalDetectionRule[];
}

export interface ExclusionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Patterns à détecter pour exclure
  patterns: Array<{
    type: "regex" | "keyword" | "section_title";
    value: string;
    caseSensitive?: boolean;
  }>;

  // Types de documents concernés (null = tous)
  applicableDocumentTypes?: DocumentType[];

  // Exemples
  examples: string[];
}

export interface MetadataExtractionRule {
  id: string;
  name: string;
  documentTypes: DocumentType[];
  enabled: boolean;

  // Champs à extraire
  fields: Array<{
    key: string;
    type: "string" | "number" | "date" | "array" | "object";
    required: boolean;
    description: string;
  }>;
}

export interface SignalDetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Conditions de détection
  triggers: Array<{
    type: "competitor_mention" | "price_change" | "hiring_spike" | "new_product" | "contract_win";
    threshold?: number;
  }>;

  // Action à prendre
  action: "create_alert" | "flag_for_review" | "auto_tag";
  priority: "low" | "medium" | "high";
}

// ============================================================================
// Configuration par défaut
// ============================================================================

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  minRelevanceScore: 7,

  exclusionRules: [
    {
      id: "disclaimer",
      name: "Disclaimers légaux",
      description: "Exclut les disclaimers, avertissements légaux et copyright",
      enabled: true,
      patterns: [
        { type: "keyword", value: "disclaimer" },
        { type: "keyword", value: "confidential" },
        { type: "keyword", value: "copyright ©" },
        { type: "keyword", value: "all rights reserved" },
        { type: "regex", value: "^(DISCLAIMER|AVERTISSEMENT|NOTICE LÉGALE)" },
      ],
      examples: [
        "DISCLAIMER: This document is confidential...",
        "© 2024 Company Inc. All rights reserved.",
      ],
    },
    {
      id: "table_of_contents",
      name: "Tables des matières",
      description: "Exclut les tables des matières et index",
      enabled: true,
      patterns: [
        { type: "keyword", value: "table of contents" },
        { type: "keyword", value: "table des matières" },
        { type: "keyword", value: "sommaire" },
        { type: "regex", value: "^(TABLE OF CONTENTS|SOMMAIRE|INDEX)" },
      ],
      examples: [
        "TABLE OF CONTENTS\n1. Introduction ........ 3\n2. Analysis ........ 5",
      ],
    },
    {
      id: "bibliography",
      name: "Bibliographies et références",
      description: "Exclut les listes de références et bibliographies",
      enabled: true,
      patterns: [
        { type: "keyword", value: "bibliography" },
        { type: "keyword", value: "références" },
        { type: "keyword", value: "works cited" },
        { type: "regex", value: "^(BIBLIOGRAPHY|RÉFÉRENCES|WORKS CITED)" },
      ],
      examples: [
        "BIBLIOGRAPHY\n[1] Smith, J. (2024). Market Analysis...",
      ],
    },
    {
      id: "appendix",
      name: "Annexes techniques",
      description: "Exclut les annexes techniques détaillées (configurable)",
      enabled: false, // Désactivé par défaut car peut contenir info utile
      patterns: [
        { type: "keyword", value: "appendix" },
        { type: "keyword", value: "annexe" },
        { type: "regex", value: "^(APPENDIX|ANNEXE) [A-Z0-9]" },
      ],
      examples: [
        "APPENDIX A: Technical Specifications",
      ],
    },
    {
      id: "cover_page",
      name: "Pages de garde",
      description: "Exclut les pages de garde et titres seuls",
      enabled: true,
      patterns: [
        { type: "regex", value: "^[A-Z\\s]{10,50}$" }, // Titres en majuscules seuls
      ],
      examples: [
        "QUARTERLY FINANCIAL REPORT",
      ],
    },
  ],

  metadataExtractionRules: [
    {
      id: "competitive_report_metadata",
      name: "Métadonnées rapports concurrentiels",
      documentTypes: ["competitive_report", "market_analysis", "deep_research"],
      enabled: true,
      fields: [
        { key: "competitors", type: "array", required: true, description: "Liste des concurrents mentionnés" },
        { key: "dateRange", type: "string", required: false, description: "Période couverte (ex: Q4 2024)" },
        { key: "keyMetrics", type: "array", required: false, description: "Métriques clés extraites" },
        { key: "strategicThemes", type: "array", required: false, description: "Thèmes stratégiques identifiés" },
        { key: "products", type: "array", required: false, description: "Produits mentionnés" },
        { key: "marketSegments", type: "array", required: false, description: "Segments de marché analysés" },
      ],
    },
    {
      id: "financial_report_metadata",
      name: "Métadonnées rapports financiers",
      documentTypes: ["financial_report"],
      enabled: true,
      fields: [
        { key: "fiscalPeriod", type: "string", required: true, description: "Période fiscale (Q1, Q2, etc.)" },
        { key: "revenue", type: "object", required: false, description: "Revenus et variations" },
        { key: "profitability", type: "object", required: false, description: "Rentabilité et marges" },
        { key: "growthMetrics", type: "array", required: false, description: "Métriques de croissance" },
        { key: "competitors", type: "array", required: false, description: "Concurrents comparés" },
      ],
    },
    {
      id: "contract_metadata",
      name: "Métadonnées contrats",
      documentTypes: ["contract"],
      enabled: true,
      fields: [
        { key: "contractType", type: "string", required: true, description: "Type de contrat (SaaS, Service, etc.)" },
        { key: "parties", type: "array", required: true, description: "Parties au contrat" },
        { key: "pricing", type: "object", required: true, description: "Structure de prix" },
        { key: "terms", type: "object", required: true, description: "Durée et conditions" },
        { key: "clauses", type: "array", required: false, description: "Clauses importantes (SLA, confidentialité, etc.)" },
        { key: "paymentTerms", type: "object", required: false, description: "Conditions de paiement" },
        { key: "renewalTerms", type: "object", required: false, description: "Conditions de renouvellement" },
      ],
    },
    {
      id: "rfp_metadata",
      name: "Métadonnées appels d'offres",
      documentTypes: ["rfp"],
      enabled: true,
      fields: [
        { key: "issuer", type: "string", required: true, description: "Émetteur de l'appel d'offres" },
        { key: "deadline", type: "date", required: true, description: "Date limite de soumission" },
        { key: "budget", type: "object", required: false, description: "Budget estimé" },
        { key: "requirements", type: "array", required: true, description: "Exigences principales" },
        { key: "evaluationCriteria", type: "array", required: false, description: "Critères d'évaluation" },
        { key: "competitors", type: "array", required: false, description: "Concurrents potentiels identifiés" },
        { key: "scope", type: "string", required: false, description: "Portée du projet" },
      ],
    },
    {
      id: "hiring_metadata",
      name: "Métadonnées embauche (extraction depuis documents)",
      documentTypes: ["competitive_report", "deep_research"],
      enabled: true,
      fields: [
        { key: "hiringCompanies", type: "array", required: false, description: "Entreprises qui recrutent" },
        { key: "positions", type: "array", required: false, description: "Postes ouverts identifiés" },
        { key: "departments", type: "array", required: false, description: "Départements concernés" },
        { key: "hiringTrends", type: "object", required: false, description: "Tendances de recrutement détectées" },
      ],
    },
  ],

  signalDetectionRules: [
    {
      id: "competitor_mention",
      name: "Mention concurrent",
      description: "Détecte quand un concurrent est mentionné dans un document",
      enabled: true,
      triggers: [{ type: "competitor_mention" }],
      action: "create_alert",
      priority: "medium",
    },
    {
      id: "price_change",
      name: "Changement de prix",
      description: "Détecte des changements de prix chez les concurrents",
      enabled: true,
      triggers: [{ type: "price_change" }],
      action: "create_alert",
      priority: "high",
    },
    {
      id: "hiring_spike",
      name: "Pic de recrutement",
      description: "Détecte une augmentation significative du recrutement",
      enabled: true,
      triggers: [{ type: "hiring_spike", threshold: 5 }], // 5+ postes
      action: "create_alert",
      priority: "high",
    },
    {
      id: "new_product",
      name: "Nouveau produit",
      description: "Détecte le lancement d'un nouveau produit concurrent",
      enabled: true,
      triggers: [{ type: "new_product" }],
      action: "create_alert",
      priority: "high",
    },
    {
      id: "contract_win",
      name: "Contrat remporté",
      description: "Détecte quand un concurrent remporte un contrat",
      enabled: true,
      triggers: [{ type: "contract_win" }],
      action: "create_alert",
      priority: "high",
    },
  ],
};

// ============================================================================
// Helper: Get config for company (permet customisation future)
// ============================================================================

export async function getAnalysisConfig(companyId: string): Promise<AnalysisConfig> {
  // Pour l'instant, retourne la config par défaut
  // Dans le futur, on pourra charger depuis la DB
  // const customConfig = await db.query.companyAnalysisConfigs.findFirst({
  //   where: eq(companyAnalysisConfigs.companyId, companyId)
  // });

  return DEFAULT_ANALYSIS_CONFIG;
}
