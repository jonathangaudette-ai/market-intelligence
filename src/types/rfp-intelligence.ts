/**
 * RFP Intelligence Brief
 * AI-generated executive summary for Go/No-Go decision making
 */

export interface RFPIntelligenceBrief {
  // Overview
  overview: {
    projectType: string; // e.g., "Software Development", "IT Infrastructure"
    industry: string; // e.g., "Healthcare", "Finance"
    estimatedBudget: string | null; // e.g., "$500K - $1M"
    estimatedDuration: string | null; // e.g., "12 months"
    scope: string; // High-level summary of project scope
  };

  // Qualification Criteria
  qualificationCriteria: {
    mandatory: QualificationItem[]; // Must-have requirements
    preferred: QualificationItem[]; // Nice-to-have requirements
    disqualifiers: string[]; // Automatic disqualifications
  };

  // Restrictive Clauses & Red Flags
  restrictiveClauses: {
    penalties: PenaltyClause[]; // Financial penalties for non-compliance
    exclusions: string[]; // What's excluded from scope
    liabilityRisks: string[]; // Liability and insurance requirements
    redFlags: string[]; // Concerning clauses that need attention
  };

  // Functional Scope
  functionalScope: {
    coreRequirements: FunctionalRequirement[]; // Main features/deliverables
    technicalRequirements: TechnicalRequirement[]; // Tech stack, platforms, integrations
    deliverables: string[]; // Expected outputs
  };

  // Evaluation Criteria
  evaluationCriteria: {
    scoring: ScoringCriterion[]; // How proposals will be evaluated
    totalPoints: number; // Total possible points
    passingScore: number | null; // Minimum score to qualify
  };

  // Risk Factors
  riskFactors: RiskFactor[]; // Identified risks with severity

  // Unusual Requirements
  unusualRequirements: UnusualRequirement[]; // Things that differ from typical RFPs

  // AI Recommendation
  recommendation: {
    goNoGo: "GO" | "CAUTION" | "NO_GO"; // Overall recommendation
    reasoning: string; // Explanation of recommendation
    confidence: number; // 0-100, AI's confidence in the recommendation
    keyConsiderations: string[]; // Critical factors to consider
  };

  // Metadata
  generatedAt: string; // ISO timestamp
  modelUsed: string; // e.g., "gpt-4", "claude-sonnet-4-20250514"
  version: string; // Brief format version
}

export interface QualificationItem {
  requirement: string;
  importance: "critical" | "high" | "medium" | "low";
  notes?: string;
}

export interface PenaltyClause {
  description: string;
  amount: string | null; // e.g., "$1000 per day"
  trigger: string; // What causes this penalty
  severity: "high" | "medium" | "low";
}

export interface FunctionalRequirement {
  category: string; // e.g., "User Management", "Reporting"
  description: string;
  complexity: "high" | "medium" | "low";
  estimatedEffort?: string; // e.g., "40 hours"
}

export interface TechnicalRequirement {
  category: string; // e.g., "Platform", "Integration", "Security"
  requirement: string;
  complexity: "high" | "medium" | "low";
  notes?: string;
}

export interface ScoringCriterion {
  criterion: string; // e.g., "Technical Approach"
  weight: number; // Percentage (0-100)
  maxPoints: number;
  description?: string;
}

export interface RiskFactor {
  risk: string;
  severity: "critical" | "high" | "medium" | "low";
  mitigation?: string; // Suggested mitigation strategy
}

export interface UnusualRequirement {
  requirement: string;
  why: string; // Why this is unusual
  impact: string; // How this affects the bid
}
