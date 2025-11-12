/**
 * GET /api/companies/[slug]/rfps/[id]/suggest-sources
 *
 * Get source suggestions for an RFP based on content type.
 *
 * Query parameters:
 * - contentType: The content type to get suggestions for (required)
 * - limit: Number of suggestions to return (default: 3)
 * - onlyWon: Only include won RFPs (default: true)
 *
 * Returns:
 * - suggestions: Array of scored RFPs with metadata
 * - total: Number of suggestions returned
 * - cached: Whether the result was served from cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';
import { scoreAndRankRfps } from '@/lib/rfp/source-scoring';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import type { ContentType } from '@/types/content-types';

// In-memory cache (1 hour TTL)
const suggestionsCache = new LRUCache<string, any>({
  max: 500,
  ttl: 3600000 // 1 hour
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rfpId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const contentType = searchParams.get('contentType') as ContentType | null;
    const limit = parseInt(searchParams.get('limit') || '3');
    const onlyWon = searchParams.get('onlyWon') !== 'false'; // Default true

    // Validate content type
    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType query parameter is required' },
        { status: 400 }
      );
    }

    // Validate limit
    if (limit < 1 || limit > 10) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 10' },
        { status: 400 }
      );
    }

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

    // 3. Check cache
    const cacheKey = `${rfpId}:${contentType}:${limit}:${onlyWon}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached) {
      console.log(`[Suggest Sources API] ✅ Cache hit for ${cacheKey}`);
      return NextResponse.json({
        success: true,
        suggestions: cached,
        total: cached.length,
        cached: true
      });
    }

    // 4. Verify RFP belongs to this company
    const [currentRfp] = await db
      .select()
      .from(rfps)
      .where(and(
        eq(rfps.id, rfpId),
        eq(rfps.companyId, company.id)
      ));

    if (!currentRfp) {
      return NextResponse.json(
        { error: 'RFP not found or does not belong to this company' },
        { status: 404 }
      );
    }

    // 5. Score and rank RFPs
    console.log(`[Suggest Sources API] Scoring sources for content-type: ${contentType}...`);

    const suggestions = await scoreAndRankRfps(
      currentRfp,
      contentType,
      company.id,
      { onlyWon, limit }
    );

    // 6. Cache results
    suggestionsCache.set(cacheKey, suggestions);

    console.log(`[Suggest Sources API] ✅ Found ${suggestions.length} suggestions`);

    return NextResponse.json({
      success: true,
      suggestions,
      total: suggestions.length,
      cached: false
    });
  } catch (error) {
    console.error('[Suggest Sources API Error]', error);

    return NextResponse.json(
      {
        error: 'Failed to suggest sources',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
