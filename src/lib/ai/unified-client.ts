/**
 * Unified AI Client
 *
 * Central point for all AI interactions in the application.
 * Handles:
 * - Prompt retrieval (with caching)
 * - Feature flags (gradual rollout)
 * - Prompt rendering
 * - AI model selection (Claude, OpenAI)
 * - Metrics tracking
 * - Error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { PromptKey, PromptVariables } from '@/types/prompts';
import { getPromptService } from '@/lib/prompts/service';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import { recordMetric } from '@/lib/prompts/metrics';
import { validatePromptVariables } from '@/types/prompts';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

// Lazy initialization to avoid connecting during build time
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

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

function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * AI generation request
 */
export interface AIRequest<K extends PromptKey = PromptKey> {
  promptKey: K;
  variables: PromptVariables<K>;
  model?: string; // Override model from prompt
  temperature?: number; // Override temperature
  maxTokens?: number; // Override max tokens
  stream?: boolean; // Enable streaming (not yet implemented)
}

/**
 * AI generation response
 */
export interface AIResponse {
  text: string;
  model: string;
  tokensUsed: number;
  executionTimeMs: number;
  fromCache?: boolean;
  metadata?: {
    promptVersion?: number;
    usedDatabase?: boolean;
  };
}

/**
 * Unified AI Client
 */
export class UnifiedAIClient {
  private promptService = getPromptService();

  /**
   * Generate AI response using configurable prompts
   *
   * This is the main entry point for all AI interactions
   */
  async generate<K extends PromptKey>(
    companyId: string,
    request: AIRequest<K>
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;
    let tokensUsed = 0;
    let modelUsed = '';

    try {
      // 1. Validate variables
      const validation = validatePromptVariables(request.promptKey, request.variables);
      if (!validation.success) {
        throw new Error(
          `Invalid variables for ${request.promptKey}: ${validation.errors?.message}`
        );
      }

      // 2. Check feature flag
      const useDatabase = shouldUseDatabase(companyId, request.promptKey);

      let promptText: { system?: string; user: string };
      let promptVersion: number | undefined;

      if (useDatabase) {
        // Get prompt from database
        console.log(`[UnifiedAIClient] Using database prompt for ${request.promptKey}`);
        const template = await this.promptService.getPrompt(companyId, request.promptKey);
        const rendered = this.promptService.renderPromptWithVariables(
          template,
          request.variables as any
        );

        promptText = rendered;
        promptVersion = template.version;
        modelUsed = request.model || rendered.model || this.getDefaultModel(companyId);
      } else {
        // Use hardcoded prompt (fallback during migration)
        console.log(`[UnifiedAIClient] Using hardcoded prompt for ${request.promptKey}`);
        promptText = await this.getHardcodedPrompt(request.promptKey, request.variables as any);
        modelUsed = request.model || this.getDefaultModel(companyId);
      }

      // 3. Call appropriate AI model
      let responseText: string;

      if (modelUsed.startsWith('claude')) {
        const result = await this.callClaude(
          modelUsed,
          promptText,
          request.temperature,
          request.maxTokens
        );
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else if (modelUsed.startsWith('gpt')) {
        const result = await this.callOpenAI(
          modelUsed,
          promptText,
          request.temperature,
          request.maxTokens
        );
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error(`Unsupported model: ${modelUsed}`);
      }

      success = true;
      const executionTimeMs = Date.now() - startTime;

      // 4. Record metrics
      recordMetric({
        promptKey: request.promptKey,
        companyId,
        executionTimeMs,
        modelUsed,
        tokensUsed,
        success: true,
        timestamp: new Date(),
      });

      return {
        text: responseText,
        model: modelUsed,
        tokensUsed,
        executionTimeMs,
        metadata: {
          promptVersion,
          usedDatabase: useDatabase,
        },
      };
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.name : 'UnknownError';
      const executionTimeMs = Date.now() - startTime;

      // Record failure metric
      recordMetric({
        promptKey: request.promptKey,
        companyId,
        executionTimeMs,
        modelUsed: modelUsed || 'unknown',
        tokensUsed,
        success: false,
        errorType,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Call Claude API
   */
  private async callClaude(
    model: string,
    prompt: { system?: string; user: string },
    temperature?: number,
    maxTokens?: number
  ): Promise<{ text: string; tokensUsed: number }> {
    const anthropic = getAnthropic();

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens || 4096,
      temperature: temperature !== undefined ? temperature : 0.7,
      ...(prompt.system && { system: prompt.system }),
      messages: [{ role: 'user', content: prompt.user }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return {
      text: content.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    model: string,
    prompt: { system?: string; user: string },
    temperature?: number,
    maxTokens?: number
  ): Promise<{ text: string; tokensUsed: number }> {
    const openai = getOpenAI();

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (prompt.system) {
      messages.push({ role: 'system', content: prompt.system });
    }

    messages.push({ role: 'user', content: prompt.user });

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: maxTokens,
    });

    const choice = response.choices[0];
    if (!choice.message.content) {
      throw new Error('Empty response from OpenAI');
    }

    return {
      text: choice.message.content,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  /**
   * Get default model for a company
   *
   * TODO: Get from company settings
   */
  private getDefaultModel(companyId: string): string {
    // For now, return Claude Sonnet 4.5 as default
    // In production, this would query company settings
    return CLAUDE_MODELS.sonnet;
  }

  /**
   * Get hardcoded prompt (fallback during migration)
   *
   * TODO: This will be removed once all prompts are migrated
   */
  private async getHardcodedPrompt(
    promptKey: PromptKey,
    variables: Record<string, any>
  ): Promise<{ system?: string; user: string }> {
    // For now, throw error - hardcoded prompts will be implemented during migration
    throw new Error(
      `Hardcoded prompt for ${promptKey} not yet implemented. Enable database prompts or implement fallback.`
    );

    // Example of what this would look like:
    // switch (promptKey) {
    //   case 'rfp_response_main':
    //     return {
    //       system: "You are an expert RFP response writer...",
    //       user: `Question: ${variables.questionText}\nContext: ${variables.contextText}`,
    //     };
    //   default:
    //     throw new Error(`Unknown prompt key: ${promptKey}`);
    // }
  }
}

// Global singleton instance
let _unifiedClient: UnifiedAIClient | null = null;

/**
 * Get the global unified AI client instance
 */
export function getUnifiedAIClient(): UnifiedAIClient {
  if (!_unifiedClient) {
    _unifiedClient = new UnifiedAIClient();
  }
  return _unifiedClient;
}

/**
 * Reset the global client (useful for testing)
 */
export function resetUnifiedAIClient(): void {
  _unifiedClient = null;
}
