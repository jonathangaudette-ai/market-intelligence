/**
 * Prompt Management Service
 *
 * Handles retrieval, caching, and management of prompt templates
 */

import { db } from '@/db';
import { promptTemplates } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getPromptCache } from './cache';
import { renderPrompt, validateVariables } from './renderer';
import type {
  PromptTemplate,
  PromptKey,
  PromptUpdateData,
  RenderedPrompt,
} from '@/types/prompts';
import { promptTemplateSchema } from '@/types/prompts';

export class PromptService {
  private cache = getPromptCache();

  /**
   * Get a prompt template with fallback to defaults
   *
   * Priority:
   * 1. Company-specific prompt from DB (cached)
   * 2. Default prompt for that prompt key
   * 3. Throw error if not found
   */
  async getPrompt(
    companyId: string,
    promptKey: PromptKey
  ): Promise<PromptTemplate> {
    // 1. Check cache first
    const cached = this.cache.get(companyId, promptKey);
    if (cached) {
      console.log(`[PromptService] Cache hit for ${companyId}:${promptKey}`);
      return cached;
    }

    console.log(`[PromptService] Cache miss for ${companyId}:${promptKey}, querying DB`);

    // 2. Query database for company-specific prompt
    try {
      const [companyPrompt] = await db
        .select()
        .from(promptTemplates)
        .where(
          and(
            eq(promptTemplates.companyId, companyId),
            eq(promptTemplates.promptKey, promptKey),
            eq(promptTemplates.isActive, true)
          )
        )
        .orderBy(desc(promptTemplates.version))
        .limit(1);

      if (companyPrompt) {
        // Parse and validate
        const parsed = promptTemplateSchema.parse({
          ...companyPrompt,
          temperature: companyPrompt.temperature ? Number(companyPrompt.temperature) : null,
          createdAt: new Date(companyPrompt.createdAt),
          updatedAt: new Date(companyPrompt.updatedAt),
        });

        // Cache it
        this.cache.set(companyId, promptKey, parsed);

        console.log(
          `[PromptService] Found company prompt for ${companyId}:${promptKey} (v${companyPrompt.version})`
        );

        return parsed;
      }
    } catch (error) {
      console.error(
        `[PromptService] Error querying prompt ${companyId}:${promptKey}:`,
        error
      );
      // Continue to fallback
    }

    // 3. Fallback to default prompt
    console.log(`[PromptService] No company prompt found, using default for ${promptKey}`);
    const defaultPrompt = await this.getDefaultPrompt(promptKey);

    // Cache the default for this company
    this.cache.set(companyId, promptKey, defaultPrompt);

    return defaultPrompt;
  }

  /**
   * Render a prompt with variables (type-safe)
   */
  renderPromptWithVariables(
    template: PromptTemplate,
    variables: Record<string, any>
  ): RenderedPrompt {
    // Validate variables
    const validation = validateVariables(template, variables);

    if (!validation.valid) {
      console.warn(
        `[PromptService] Missing required variables for ${template.promptKey}:`,
        validation.missing
      );
    }

    if (validation.unused.length > 0) {
      console.warn(
        `[PromptService] Unused variables for ${template.promptKey}:`,
        validation.unused
      );
    }

    return renderPrompt(template, variables);
  }

  /**
   * Save or update a prompt (creates new version)
   */
  async savePrompt(
    companyId: string,
    promptKey: PromptKey,
    data: PromptUpdateData,
    userId: string
  ): Promise<PromptTemplate> {
    // Get current version (if exists)
    const [existingPrompt] = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.companyId, companyId),
          eq(promptTemplates.promptKey, promptKey)
        )
      )
      .orderBy(desc(promptTemplates.version))
      .limit(1);

    const newVersion = existingPrompt ? existingPrompt.version + 1 : 1;

    // Get default to copy metadata if this is first version
    let name = existingPrompt?.name;
    let category = existingPrompt?.category;
    let variables = existingPrompt?.variables || null;

    if (!existingPrompt) {
      const defaultPrompt = await this.getDefaultPrompt(promptKey);
      name = defaultPrompt.name;
      category = defaultPrompt.category;
      variables = defaultPrompt.variables || null;
    }

    // Deactivate old version if it exists
    if (existingPrompt) {
      await db
        .update(promptTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(promptTemplates.id, existingPrompt.id));
    }

    // Create new version
    const [newPrompt] = await db
      .insert(promptTemplates)
      .values({
        companyId,
        promptKey,
        category: category!,
        name: name!,
        systemPrompt: data.systemPrompt,
        userPromptTemplate: data.userPromptTemplate,
        modelId: data.modelId,
        temperature: data.temperature ? String(data.temperature) : null,
        maxTokens: data.maxTokens,
        description: data.description,
        variables: variables as any,
        version: newVersion,
        isActive: true,
        createdBy: userId,
      })
      .returning();

    console.log(
      `[PromptService] Created new prompt version for ${companyId}:${promptKey} (v${newVersion})`
    );

    // Invalidate cache
    this.cache.invalidate(companyId, promptKey);

    return promptTemplateSchema.parse({
      ...newPrompt,
      temperature: newPrompt.temperature ? Number(newPrompt.temperature) : null,
      createdAt: new Date(newPrompt.createdAt),
      updatedAt: new Date(newPrompt.updatedAt),
    });
  }

  /**
   * Get version history for a prompt
   */
  async getVersions(
    companyId: string,
    promptKey: PromptKey
  ): Promise<PromptTemplate[]> {
    const versions = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.companyId, companyId),
          eq(promptTemplates.promptKey, promptKey)
        )
      )
      .orderBy(desc(promptTemplates.version))
      .limit(10); // Keep last 10 versions

    return versions.map((v) =>
      promptTemplateSchema.parse({
        ...v,
        temperature: v.temperature ? Number(v.temperature) : null,
        createdAt: new Date(v.createdAt),
        updatedAt: new Date(v.updatedAt),
      })
    );
  }

  /**
   * Restore a previous version
   */
  async restoreVersion(
    companyId: string,
    promptKey: PromptKey,
    versionId: string,
    userId: string
  ): Promise<PromptTemplate> {
    // Get the version to restore
    const [versionToRestore] = await db
      .select()
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.id, versionId),
          eq(promptTemplates.companyId, companyId),
          eq(promptTemplates.promptKey, promptKey)
        )
      )
      .limit(1);

    if (!versionToRestore) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Create new version with restored content
    return this.savePrompt(
      companyId,
      promptKey,
      {
        systemPrompt: versionToRestore.systemPrompt,
        userPromptTemplate: versionToRestore.userPromptTemplate,
        modelId: versionToRestore.modelId,
        temperature: versionToRestore.temperature
          ? Number(versionToRestore.temperature)
          : null,
        maxTokens: versionToRestore.maxTokens,
        description: versionToRestore.description,
      },
      userId
    );
  }

  /**
   * Reset to default prompt
   */
  async resetToDefault(
    companyId: string,
    promptKey: PromptKey
  ): Promise<void> {
    // Delete all company-specific versions
    await db
      .delete(promptTemplates)
      .where(
        and(
          eq(promptTemplates.companyId, companyId),
          eq(promptTemplates.promptKey, promptKey)
        )
      );

    // Invalidate cache
    this.cache.invalidate(companyId, promptKey);

    console.log(`[PromptService] Reset ${companyId}:${promptKey} to default`);
  }

  /**
   * Get default prompt for a prompt key
   */
  private async getDefaultPrompt(promptKey: PromptKey): Promise<PromptTemplate> {
    const { getDefaultPrompt } = await import('./defaults');
    const defaultPrompt = getDefaultPrompt(promptKey);

    if (!defaultPrompt) {
      throw new Error(
        `[PromptService] No default prompt found for ${promptKey}. Please add it to defaults.ts`
      );
    }

    // Convert to full PromptTemplate (add missing fields)
    return {
      ...defaultPrompt,
      id: 'default',
      companyId: 'default',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    };
  }

  /**
   * List all prompts for a company
   */
  async listPrompts(
    companyId: string,
    options?: { category?: string }
  ): Promise<PromptTemplate[]> {
    const conditions = [
      eq(promptTemplates.companyId, companyId),
      eq(promptTemplates.isActive, true),
    ];

    if (options?.category) {
      conditions.push(eq(promptTemplates.category, options.category));
    }

    const prompts = await db
      .select()
      .from(promptTemplates)
      .where(and(...conditions))
      .orderBy(desc(promptTemplates.updatedAt));

    return prompts.map((p) =>
      promptTemplateSchema.parse({
        ...p,
        temperature: p.temperature ? Number(p.temperature) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })
    );
  }
}

// Global singleton instance
let _promptService: PromptService | null = null;

/**
 * Get the global prompt service instance
 */
export function getPromptService(): PromptService {
  if (!_promptService) {
    _promptService = new PromptService();
  }
  return _promptService;
}

/**
 * Reset the global service (useful for testing)
 */
export function resetPromptService(): void {
  _promptService = null;
}
