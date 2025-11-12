import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { z } from 'zod';

const EnrichmentSchema = z.object({
  clientBackground: z.string().optional(),
  keyNeeds: z.string().optional(),
  constraints: z.string().optional(),
  relationships: z.string().optional(),
  customNotes: z.string().optional(),
});

/**
 * POST /api/companies/[slug]/rfps/[id]/enrichment
 * Save manual enrichment data for an RFP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = EnrichmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const enrichmentData = validation.data;

    // Verify RFP exists and user has access
    const [rfp] = await db
      .select({ id: rfps.id, companyId: rfps.companyId })
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update RFP with enrichment data
    const [updatedRfp] = await db
      .update(rfps)
      .set({
        manualEnrichment: {
          ...enrichmentData,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: session.user.id,
        },
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      enrichment: updatedRfp.manualEnrichment,
    });
  } catch (error) {
    console.error('[Enrichment Save Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to save enrichment data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/[slug]/rfps/[id]/enrichment
 * Get manual enrichment data for an RFP
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Get RFP enrichment data
    const [rfp] = await db
      .select({
        companyId: rfps.companyId,
        manualEnrichment: rfps.manualEnrichment,
        linkedinEnrichment: rfps.linkedinEnrichment,
      })
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    if (rfp.companyId !== companyContext.company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      manualEnrichment: rfp.manualEnrichment || {},
      linkedinEnrichment: rfp.linkedinEnrichment || {},
    });
  } catch (error) {
    console.error('[Enrichment Get Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get enrichment data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
