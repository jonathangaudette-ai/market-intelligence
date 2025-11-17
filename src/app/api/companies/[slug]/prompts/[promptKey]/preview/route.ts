import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { getPromptService } from '@/lib/prompts/service';
import type { PromptKey, PromptTemplate } from '@/types/prompts';
import { z } from 'zod';

const PreviewRequestSchema = z.object({
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string(),
  variables: z.record(z.any()),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().positive().optional(),
});

/**
 * POST /api/companies/[slug]/prompts/[promptKey]/preview
 * Preview a prompt with test variables (without saving)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; promptKey: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const result = await getCompanyBySlug(params.slug);
    if (!result) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { company } = result;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = PreviewRequestSchema.parse(body);

    // Create a temporary prompt template for rendering
    const tempTemplate: PromptTemplate = {
      id: 'preview',
      companyId: company.id,
      promptKey: params.promptKey as PromptKey,
      category: 'rfp_generation', // Doesn't matter for preview
      systemPrompt: data.systemPrompt || null,
      userPromptTemplate: data.userPromptTemplate,
      modelId: data.modelId || null,
      temperature: data.temperature ?? null,
      maxTokens: data.maxTokens || null,
      name: 'Preview',
      description: null,
      variables: [],
      version: 1,
      isActive: true,
      createdBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const promptService = getPromptService();

    // Render with provided variables
    const rendered = promptService.renderPromptWithVariables(
      tempTemplate,
      data.variables
    );

    return NextResponse.json({
      rendered,
      template: tempTemplate,
      variables: data.variables,
    });
  } catch (error) {
    console.error('[Prompts API] Error previewing prompt:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preview data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to preview prompt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
