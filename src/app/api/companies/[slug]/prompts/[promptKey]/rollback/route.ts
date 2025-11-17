import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { getPromptService } from '@/lib/prompts/service';
import type { PromptKey } from '@/types/prompts';
import { z } from 'zod';

const RollbackRequestSchema = z.object({
  version: z.number().positive(),
});

/**
 * POST /api/companies/[slug]/prompts/[promptKey]/rollback
 * Rollback to a specific version
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
    const { version } = RollbackRequestSchema.parse(body);

    const promptService = getPromptService();

    // Get the version to rollback to
    const versions = await promptService.getVersions(
      company.id,
      params.promptKey as PromptKey
    );

    const targetVersion = versions.find((v) => v.version === version);
    if (!targetVersion) {
      return NextResponse.json(
        { error: `Version ${version} not found` },
        { status: 404 }
      );
    }

    // Create a new version with the content from the target version
    const rolledBackPrompt = await promptService.savePrompt(
      company.id,
      params.promptKey as PromptKey,
      {
        systemPrompt: targetVersion.systemPrompt || undefined,
        userPromptTemplate: targetVersion.userPromptTemplate,
        modelId: targetVersion.modelId || undefined,
        temperature: targetVersion.temperature,
        maxTokens: targetVersion.maxTokens || undefined,
      },
      `${session.user.email || session.user.id} (rollback to v${version})`
    );

    // Invalidate cache
    promptService['cache'].invalidate(company.id, params.promptKey as PromptKey);

    return NextResponse.json({
      prompt: rolledBackPrompt,
      message: `Successfully rolled back to version ${version}`,
      previousVersion: version,
      newVersion: rolledBackPrompt.version,
    });
  } catch (error) {
    console.error('[Prompts API] Error rolling back prompt:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid rollback data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to rollback prompt' },
      { status: 500 }
    );
  }
}
