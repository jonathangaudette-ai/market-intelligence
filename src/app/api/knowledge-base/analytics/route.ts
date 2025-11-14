/**
 * Knowledge Base Analytics API
 * Phase 1 Day 10-11 - Support Docs RAG v4.0
 *
 * Returns:
 * - Document statistics (total, by type, by status)
 * - Usage metrics (most used docs, retrieval frequency)
 * - Performance indicators (avg confidence, analysis success rate)
 * - Actionable insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, rfpResponses } from '@/db/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const authResult = await requireAuth('viewer');
    if (!authResult.success) return authResult.error;

    const { company } = authResult.data;

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - periodDays);

    // 3. Fetch support documents statistics
    const supportDocs = await db
      .select({
        id: documents.id,
        name: documents.name,
        status: documents.status,
        documentPurpose: documents.documentPurpose,
        contentType: documents.contentType,
        contentTypeTags: documents.contentTypeTags,
        analysisConfidence: documents.analysisConfidence,
        totalChunks: documents.totalChunks,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.companyId, company.company.id),
          eq(documents.documentPurpose, 'rfp_support')
        )
      )
      .orderBy(desc(documents.createdAt));

    // 4. Calculate statistics
    const stats = {
      total: supportDocs.length,
      byStatus: {
        completed: supportDocs.filter((d) => d.status === 'completed').length,
        processing: supportDocs.filter((d) => d.status === 'processing').length,
        pending: supportDocs.filter((d) => d.status === 'pending').length,
        failed: supportDocs.filter((d) => d.status === 'failed').length,
      },
      byContentType: calculateByContentType(supportDocs),
      totalChunks: supportDocs.reduce((sum, d) => sum + (d.totalChunks || 0), 0),
      avgConfidence:
        supportDocs.length > 0
          ? Math.round(
              supportDocs
                .filter((d) => d.analysisConfidence)
                .reduce((sum, d) => sum + (d.analysisConfidence || 0), 0) /
                supportDocs.filter((d) => d.analysisConfidence).length
            )
          : 0,
      recentUploads: supportDocs.filter(
        (d) => new Date(d.createdAt) >= sinceDate
      ).length,
    };

    // 5. Calculate usage metrics (mock for now - will be real once we track usage)
    const usageMetrics = {
      totalRetrievals: 0, // TODO: Track this in DB
      mostUsedDocuments: [], // TODO: Track document usage
      avgRetrievalsPerDoc: 0,
      retrievalSuccessRate: 0,
    };

    // 6. Generate actionable insights
    const insights = generateInsights(stats, supportDocs);

    // 7. Performance indicators
    const performance = {
      analysisSuccessRate:
        stats.total > 0
          ? Math.round((stats.byStatus.completed / stats.total) * 100)
          : 0,
      avgConfidence: stats.avgConfidence,
      documentsNeedingReview: supportDocs.filter(
        (d) => d.analysisConfidence && d.analysisConfidence < 70
      ).length,
      failedDocuments: stats.byStatus.failed,
    };

    // 8. Trends (compared to previous period)
    const previousPeriodStart = new Date(sinceDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    const previousPeriodDocs = supportDocs.filter(
      (d) =>
        new Date(d.createdAt) >= previousPeriodStart &&
        new Date(d.createdAt) < sinceDate
    );

    const trends = {
      documentsChange:
        previousPeriodDocs.length > 0
          ? Math.round(
              ((stats.recentUploads - previousPeriodDocs.length) /
                previousPeriodDocs.length) *
                100
            )
          : 0,
      chunksChange: 0, // TODO: Calculate based on previous period
    };

    return NextResponse.json({
      stats,
      usageMetrics,
      performance,
      insights,
      trends,
      period: periodDays,
    });
  } catch (error) {
    console.error('[Knowledge Base Analytics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate distribution by content type
 */
function calculateByContentType(
  docs: Array<{ contentType: string | null }>
): Record<string, number> {
  const distribution: Record<string, number> = {};

  for (const doc of docs) {
    const type = doc.contentType || 'unknown';
    distribution[type] = (distribution[type] || 0) + 1;
  }

  return distribution;
}

/**
 * Generate actionable insights based on data
 */
function generateInsights(
  stats: any,
  docs: Array<{
    analysisConfidence: number | null;
    contentType: string | null;
    status: string | null;
    [key: string]: any;
  }>
): Array<{
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}> {
  const insights: Array<any> = [];

  // Insight 1: Low confidence documents
  const lowConfidenceDocs = docs.filter(
    (d) => d.analysisConfidence && d.analysisConfidence < 70
  );
  if (lowConfidenceDocs.length > 0) {
    insights.push({
      type: 'warning',
      title: `${lowConfidenceDocs.length} document(s) avec faible confiance`,
      description:
        "Ces documents pourraient bénéficier d'une révision manuelle ou de tags additionnels pour améliorer la qualité du RAG.",
      action: {
        label: 'Réviser les documents',
        href: '/knowledge-base?filter=low-confidence',
      },
    });
  }

  // Insight 2: Failed uploads
  if (stats.byStatus.failed > 0) {
    insights.push({
      type: 'warning',
      title: `${stats.byStatus.failed} échec(s) d'analyse`,
      description:
        "Certains documents n'ont pas pu être analysés. Vérifiez le format et réessayez.",
      action: {
        label: 'Voir les échecs',
        href: '/knowledge-base?status=failed',
      },
    });
  }

  // Insight 3: Content type diversity
  const contentTypes = Object.keys(stats.byContentType).length;
  if (contentTypes >= 5) {
    insights.push({
      type: 'success',
      title: 'Excellente diversité de contenu',
      description: `Vous avez ${contentTypes} types de documents différents, ce qui améliore la couverture du RAG.`,
    });
  } else if (stats.total > 5) {
    insights.push({
      type: 'info',
      title: 'Opportunité de diversification',
      description:
        'Ajoutez plus de types de documents (études de cas, spécifications techniques, etc.) pour améliorer la qualité des réponses.',
      action: {
        label: 'Téléverser des documents',
        href: '/knowledge-base',
      },
    });
  }

  // Insight 4: Getting started
  if (stats.total === 0) {
    insights.push({
      type: 'action',
      title: 'Commencez à construire votre base de connaissances',
      description:
        'Téléversez des documents de support (méthodologies, études de cas, etc.) pour améliorer vos réponses RFP de 30%.',
      action: {
        label: 'Téléverser le premier document',
        href: '/knowledge-base',
      },
    });
  } else if (stats.total < 10) {
    insights.push({
      type: 'info',
      title: 'Continuez à enrichir votre base',
      description:
        'Nos benchmarks montrent que 20-30 documents de support offrent le meilleur ROI pour le RAG.',
      action: {
        label: 'Téléverser plus de documents',
        href: '/knowledge-base',
      },
    });
  }

  // Insight 5: High performance
  if (stats.avgConfidence >= 90 && stats.total >= 10) {
    insights.push({
      type: 'success',
      title: 'Excellente qualité d\'analyse',
      description: `Votre score de confiance moyen est de ${stats.avgConfidence}%. Claude analyse vos documents avec une grande précision.`,
    });
  }

  return insights;
}
