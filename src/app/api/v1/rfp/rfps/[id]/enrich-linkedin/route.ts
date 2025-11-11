import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';

/**
 * POST /api/v1/rfp/rfps/[id]/enrich-linkedin
 * Fetch LinkedIn company data using Proxycurl API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get RFP
    const [rfp] = await db
      .select({
        id: rfps.id,
        clientName: rfps.clientName,
        companyId: rfps.companyId,
      })
      .from(rfps)
      .where(eq(rfps.id, id))
      .limit(1);

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found' }, { status: 404 });
    }

    // TODO: Verify user is member of company

    // Check if Proxycurl API key is configured
    if (!process.env.PROXYCURL_API_KEY) {
      return NextResponse.json(
        {
          error: 'LinkedIn enrichment not configured',
          message: 'PROXYCURL_API_KEY is not set in environment variables',
        },
        { status: 503 }
      );
    }

    // Step 1: Search for company on LinkedIn
    console.log(`[LinkedIn Enrichment] Searching for company: ${rfp.clientName}`);

    const searchResponse = await fetch(
      `https://nubela.co/proxycurl/api/linkedin/company/resolve?company_name=${encodeURIComponent(rfp.clientName)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PROXYCURL_API_KEY}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('[LinkedIn Enrichment] Search failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to find company on LinkedIn',
          details: error,
        },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();
    const linkedinUrl = searchData.url;

    if (!linkedinUrl) {
      return NextResponse.json(
        {
          error: 'Company not found on LinkedIn',
          message: `Could not find "${rfp.clientName}" on LinkedIn`,
        },
        { status: 404 }
      );
    }

    console.log(`[LinkedIn Enrichment] Found company URL: ${linkedinUrl}`);

    // Step 2: Fetch detailed company data
    const detailsResponse = await fetch(
      `https://nubela.co/proxycurl/api/linkedin/company?url=${encodeURIComponent(linkedinUrl)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PROXYCURL_API_KEY}`,
        },
      }
    );

    if (!detailsResponse.ok) {
      const error = await detailsResponse.text();
      console.error('[LinkedIn Enrichment] Details fetch failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch company details',
          details: error,
        },
        { status: detailsResponse.status }
      );
    }

    const companyData = await detailsResponse.json();

    // Step 3: Extract relevant data
    const enrichmentData = {
      companyName: companyData.name || rfp.clientName,
      companyUrl: linkedinUrl,
      employeeCount: companyData.company_size || null,
      industry: companyData.industry || null,
      specialties: companyData.specialties || [],
      description: companyData.description || null,
      headquarters: companyData.headquarters
        ? `${companyData.headquarters.city || ''}, ${companyData.headquarters.country || ''}`.trim()
        : null,
      founded: companyData.founded_year ? String(companyData.founded_year) : null,
      fetchedAt: new Date().toISOString(),
      source: 'proxycurl' as const,
    };

    console.log(`[LinkedIn Enrichment] Successfully enriched data for ${rfp.clientName}`);

    // Step 4: Save to database
    const [updatedRfp] = await db
      .update(rfps)
      .set({
        linkedinEnrichment: enrichmentData as any,
        updatedAt: new Date(),
      })
      .where(eq(rfps.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      enrichment: updatedRfp.linkedinEnrichment,
    });
  } catch (error) {
    console.error('[LinkedIn Enrichment Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to enrich LinkedIn data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
