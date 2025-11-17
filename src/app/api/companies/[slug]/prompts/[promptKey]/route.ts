import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { getPromptService } from '@/lib/prompts/service';
import { PROMPT_KEYS, type PromptKey } from '@/types/prompts';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import { z } from 'zod';

const SavePromptSchema = z.object({
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().positive().optional(),
  variables: z.array(z.object({
    key: z.string(),
    description: z.string(),
    required: z.boolean(),
    type: z.string(),
    example: z.string().optional(),
  })).optional(),
});

/**
 * GET /api/companies/[slug]/prompts/[promptKey]
 * Get a specific prompt
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; promptKey: string }> }
) {
  try {
    const params = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getCompanyBySlug(params.slug);
    if (!result) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { company } = result;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const promptService = getPromptService();
    const prompt = await promptService.getPrompt(company.id, params.promptKey as PromptKey);

    const usesDatabase = shouldUseDatabase(company.id, params.promptKey as PromptKey);

    return NextResponse.json({
      prompt,
      usesDatabase,
      source: usesDatabase ? 'database' : 'hardcoded',
    });
  } catch (error) {
    console.error('[Prompts API] Error getting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to get prompt' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[slug]/prompts/[promptKey]
 * Save a prompt (creates new version)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; promptKey: string }> }
) {
  try {
    const params = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getCompanyBySlug(params.slug);
    if (!result) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { company } = result;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = SavePromptSchema.parse(body);

    const promptService = getPromptService();

    // Save the prompt (creates new version)
    const savedPrompt = await promptService.savePrompt(
      company.id,
      params.promptKey as PromptKey,
      data,
      session.user.email || session.user.id
    );

    // Invalidate cache
    promptService['cache'].invalidate(company.id, params.promptKey as PromptKey);

    return NextResponse.json({
      prompt: savedPrompt,
      message: 'Prompt saved successfully',
    });
  } catch (error) {
    console.error('[Prompts API] Error saving prompt:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid prompt data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[slug]/prompts/[promptKey]
 * Delete a prompt (soft delete - sets is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string; promptKey: string }> }
) {
  try {
    const params = await context.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getCompanyBySlug(params.slug);
    if (!result) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { company } = result;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const promptService = getPromptService();

    // Reset to default (deletes all versions)
    await promptService.resetToDefault(company.id, params.promptKey as PromptKey);

    return NextResponse.json({
      message: 'Prompt reset to default successfully',
    });
  } catch (error) {
    console.error('[Prompts API] Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
