import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { getPromptService } from '@/lib/prompts/service';
import type { PromptKey } from '@/types/prompts';

/**
 * GET /api/companies/[slug]/prompts/[promptKey]/versions
 * Get all versions of a prompt
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
    const versions = await promptService.getVersions(
      company.id,
      params.promptKey as PromptKey
    );

    return NextResponse.json({
      versions,
      total: versions.length,
    });
  } catch (error) {
    console.error('[Prompts API] Error getting versions:', error);
    return NextResponse.json(
      { error: 'Failed to get versions' },
      { status: 500 }
    );
  }
}
