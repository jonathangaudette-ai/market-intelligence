/**
 * Feature Flag System for Prompt Rollout
 *
 * Enables gradual rollout of database-backed prompts with:
 * - Per-prompt enable/disable
 * - Percentage-based rollout (0% -> 10% -> 50% -> 100%)
 * - Company allowlist for early access
 * - Fallback to hardcoded prompts
 */

import type { PromptKey, PromptFeatureFlag } from '@/types/prompts';
import { PROMPT_KEYS } from '@/types/prompts';

/**
 * Feature flags configuration
 *
 * TODO: Move this to database or environment variables for production
 * For now, hardcoded for Phase 0
 */
const FEATURE_FLAGS: Map<PromptKey, PromptFeatureFlag> = new Map([
  // RFP Response Main - ✅ ENABLED FOR ALL COMPANIES (100% ROLLOUT)
  [
    PROMPT_KEYS.RFP_RESPONSE_MAIN,
    {
      promptKey: PROMPT_KEYS.RFP_RESPONSE_MAIN,
      useDatabase: true, // ✅ Enabled for database prompts
      rolloutPercentage: 100, // 🚀 100% rollout - ALL COMPANIES
      enabledForCompanies: [], // No allowlist needed with 100% rollout
      enabled: true, // ✅ Global enable
    },
  ],

  // AI Enrichment - Recently created
  [
    PROMPT_KEYS.AI_ENRICHMENT,
    {
      promptKey: PROMPT_KEYS.AI_ENRICHMENT,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],

  // All other prompts start disabled
  [
    PROMPT_KEYS.RFP_RESPONSE_LEGACY,
    {
      promptKey: PROMPT_KEYS.RFP_RESPONSE_LEGACY,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE,
    {
      promptKey: PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH,
    {
      promptKey: PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.QUESTION_EXTRACT,
    {
      promptKey: PROMPT_KEYS.QUESTION_EXTRACT,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.CONTENT_TYPE_DETECT,
    {
      promptKey: PROMPT_KEYS.CONTENT_TYPE_DETECT,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE,
    {
      promptKey: PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.HISTORICAL_MATCH_QA,
    {
      promptKey: PROMPT_KEYS.HISTORICAL_MATCH_QA,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.INTELLIGENCE_BRIEF,
    {
      promptKey: PROMPT_KEYS.INTELLIGENCE_BRIEF,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.DOCUMENT_ANALYSIS_SUPPORT,
    {
      promptKey: PROMPT_KEYS.DOCUMENT_ANALYSIS_SUPPORT,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.DOCUMENT_PREPROCESS,
    {
      promptKey: PROMPT_KEYS.DOCUMENT_PREPROCESS,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.RAG_CHAT_SYNTHESIS,
    {
      promptKey: PROMPT_KEYS.RAG_CHAT_SYNTHESIS,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
  [
    PROMPT_KEYS.COMPETITIVE_POSITIONING,
    {
      promptKey: PROMPT_KEYS.COMPETITIVE_POSITIONING,
      useDatabase: false,
      rolloutPercentage: 0,
      enabledForCompanies: [],
      enabled: false,
    },
  ],
]);

/**
 * Check if a prompt should use database for a specific company
 */
export function shouldUseDatabase(
  companyId: string,
  promptKey: PromptKey
): boolean {
  const flag = FEATURE_FLAGS.get(promptKey);

  if (!flag) {
    // No flag defined = use hardcoded (safe default)
    return false;
  }

  // 1. Check if globally disabled
  if (!flag.enabled || !flag.useDatabase) {
    return false;
  }

  // 2. Check if company is in allowlist (early access)
  if (flag.enabledForCompanies.includes(companyId)) {
    console.log(`[FeatureFlag] ${promptKey} enabled for ${companyId} (allowlist)`);
    return true;
  }

  // 3. Check rollout percentage
  if (flag.rolloutPercentage > 0) {
    const shouldEnable = isInRolloutPercentage(companyId, flag.rolloutPercentage);
    if (shouldEnable) {
      console.log(
        `[FeatureFlag] ${promptKey} enabled for ${companyId} (${flag.rolloutPercentage}% rollout)`
      );
      return true;
    }
  }

  return false;
}

/**
 * Determine if a company is in the rollout percentage
 *
 * Uses consistent hashing to ensure the same company always gets the same result
 */
function isInRolloutPercentage(companyId: string, percentage: number): boolean {
  if (percentage === 0) return false;
  if (percentage >= 100) return true;

  // Simple hash function (consistent for same companyId)
  const hash = hashString(companyId);
  const bucket = hash % 100; // 0-99

  return bucket < percentage;
}

/**
 * Simple string hash function for consistent bucketing
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get feature flag for a prompt
 */
export function getFeatureFlag(promptKey: PromptKey): PromptFeatureFlag | undefined {
  return FEATURE_FLAGS.get(promptKey);
}

/**
 * Set feature flag (for admin control)
 *
 * TODO: Persist this to database in production
 */
export function setFeatureFlag(promptKey: PromptKey, flag: Partial<PromptFeatureFlag>): void {
  const existing = FEATURE_FLAGS.get(promptKey);

  if (!existing) {
    console.warn(`[FeatureFlag] No flag found for ${promptKey}`);
    return;
  }

  FEATURE_FLAGS.set(promptKey, {
    ...existing,
    ...flag,
  });

  console.log(`[FeatureFlag] Updated ${promptKey}:`, flag);
}

/**
 * Enable a prompt for all companies (100% rollout)
 */
export function enablePromptGlobally(promptKey: PromptKey): void {
  setFeatureFlag(promptKey, {
    enabled: true,
    useDatabase: true,
    rolloutPercentage: 100,
  });
}

/**
 * Disable a prompt globally (rollback)
 */
export function disablePromptGlobally(promptKey: PromptKey): void {
  setFeatureFlag(promptKey, {
    enabled: false,
    useDatabase: false,
    rolloutPercentage: 0,
  });
}

/**
 * Set rollout percentage for a prompt
 */
export function setRolloutPercentage(promptKey: PromptKey, percentage: number): void {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Rollout percentage must be between 0 and 100');
  }

  setFeatureFlag(promptKey, {
    enabled: true,
    useDatabase: true,
    rolloutPercentage: percentage,
  });
}

/**
 * Add company to allowlist for early access
 */
export function addToAllowlist(promptKey: PromptKey, companyId: string): void {
  const flag = FEATURE_FLAGS.get(promptKey);

  if (!flag) {
    console.warn(`[FeatureFlag] No flag found for ${promptKey}`);
    return;
  }

  if (!flag.enabledForCompanies.includes(companyId)) {
    flag.enabledForCompanies.push(companyId);
    FEATURE_FLAGS.set(promptKey, flag);
    console.log(`[FeatureFlag] Added ${companyId} to ${promptKey} allowlist`);
  }
}

/**
 * Remove company from allowlist
 */
export function removeFromAllowlist(promptKey: PromptKey, companyId: string): void {
  const flag = FEATURE_FLAGS.get(promptKey);

  if (!flag) {
    console.warn(`[FeatureFlag] No flag found for ${promptKey}`);
    return;
  }

  flag.enabledForCompanies = flag.enabledForCompanies.filter((id) => id !== companyId);
  FEATURE_FLAGS.set(promptKey, flag);
  console.log(`[FeatureFlag] Removed ${companyId} from ${promptKey} allowlist`);
}

/**
 * Get all feature flags (for admin dashboard)
 */
export function getAllFeatureFlags(): Map<PromptKey, PromptFeatureFlag> {
  return new Map(FEATURE_FLAGS);
}

/**
 * Get rollout statistics
 */
export function getRolloutStats(): {
  total: number;
  enabled: number;
  disabled: number;
  partialRollout: number;
  fullRollout: number;
} {
  let enabled = 0;
  let disabled = 0;
  let partialRollout = 0;
  let fullRollout = 0;

  for (const flag of FEATURE_FLAGS.values()) {
    if (flag.enabled && flag.useDatabase) {
      enabled++;

      if (flag.rolloutPercentage === 100) {
        fullRollout++;
      } else if (flag.rolloutPercentage > 0) {
        partialRollout++;
      }
    } else {
      disabled++;
    }
  }

  return {
    total: FEATURE_FLAGS.size,
    enabled,
    disabled,
    partialRollout,
    fullRollout,
  };
}
