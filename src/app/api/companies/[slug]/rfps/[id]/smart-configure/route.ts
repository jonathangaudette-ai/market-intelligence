/**
 * POST /api/companies/[slug]/rfps/[id]/smart-configure
 *
 * Generate smart default configuration for an RFP using AI.
 *
 * This endpoint:
 * 1. Classifies all RFP questions into content types (using Claude)
 * 2. Finds the best historical RFP sources for each content type (using scoring)
 * 3. Saves the configuration to rfp_source_preferences table
 * 4. Updates questions with classifications
 *
 * Returns:
 * - suggestedSources: Map of content type -> top 3 RFP IDs
 * - questionsClassified: Number of questions processed
 * - averageConfidence: Average classification confidence (0-1)
 * - contentTypeBreakdown: Count of questions per content type
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { generateSmartDefaults } from '@/lib/rfp/smart-defaults';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get company by slug and verify access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    const { company, role } = companyContext;

    // 3. Check permission (editor or admin required)
    const roleHierarchy: Record<string, number> = { admin: 3, editor: 2, viewer: 1 };
    if (roleHierarchy[role] < roleHierarchy['editor']) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Editor or admin role required.' },
        { status: 403 }
      );
    }

    // 4. Verify RFP belongs to this company
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(and(
        eq(rfps.id, rfpId),
        eq(rfps.companyId, company.id)
      ));

    if (!rfp) {
      return NextResponse.json(
        { error: 'RFP not found or does not belong to this company' },
        { status: 404 }
      );
    }

    // 5. Generate smart defaults
    console.log(`[Smart Configure API] Generating smart defaults for RFP ${rfpId}...`);

    const result = await generateSmartDefaults(rfpId);

    console.log(`[Smart Configure API] ✅ Smart configuration complete!`);
    console.log(`[Smart Configure API] Classified ${result.questionsClassified} questions`);
    console.log(`[Smart Configure API] Average confidence: ${Math.round(result.averageConfidence * 100)}%`);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully configured ${result.questionsClassified} questions with ${Math.round(result.averageConfidence * 100)}% average confidence`
    });
  } catch (error) {
    console.error('[Smart Configure API Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to generate smart configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/[slug]/rfps/[id]/smart-configure
 *
 * Get the current smart configuration for an RFP (if any)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;

    // 1. Authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get company by slug and verify access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    const { company } = companyContext;

    // 3. Verify RFP belongs to this company
    const [rfp] = await db
      .select()
      .from(rfps)
      .where(and(
        eq(rfps.id, rfpId),
        eq(rfps.companyId, company.id)
      ));

    if (!rfp) {
      return NextResponse.json(
        { error: 'RFP not found or does not belong to this company' },
        { status: 404 }
      );
    }

    // 4. Get smart configuration
    const { getSmartConfiguration } = await import('@/lib/rfp/smart-defaults');
    const config = await getSmartConfiguration(rfpId);

    if (!config) {
      return NextResponse.json(
        {
          configured: false,
          message: 'No smart configuration found. Run POST to generate one.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      configured: true,
      ...config
    });
  } catch (error) {
    console.error('[Smart Configure GET API Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to get smart configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
