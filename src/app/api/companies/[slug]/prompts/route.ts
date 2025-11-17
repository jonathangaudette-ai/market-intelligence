import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { getPromptService } from '@/lib/prompts/service';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import type { PromptKey } from '@/types/prompts';

/**
 * GET /api/companies/[slug]/prompts
 * List all prompts for a company
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
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
    const promptService = getPromptService();

    // Get all prompts for this company
    const prompts = await promptService.listPrompts(company.id);

    // Add feature flag status to each prompt
    const promptsWithStatus = prompts.map((prompt) => {
      const usesDatabase = shouldUseDatabase(company.id, prompt.promptKey as PromptKey);
      return {
        ...prompt,
        usesDatabase,
        source: usesDatabase ? 'database' : 'hardcoded',
      };
    });

    return NextResponse.json({
      prompts: promptsWithStatus,
      companyId: company.id,
      companyName: company.name,
    });
  } catch (error) {
    console.error('[Prompts API] Error listing prompts:', error);
    return NextResponse.json(
      { error: 'Failed to list prompts' },
      { status: 500 }
    );
  }
}
