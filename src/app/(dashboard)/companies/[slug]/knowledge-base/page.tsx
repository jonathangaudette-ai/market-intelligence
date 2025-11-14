"use client";

/**
 * Knowledge Base Page
 * Phase 1 Day 8-9 & 10-11 - Support Docs RAG v4.0
 *
 * This page allows users to:
 * - Upload support documents (PDFs, DOCX, TXT)
 * - View auto-analysis results (content type, tags, confidence)
 * - View analytics and insights (Day 10-11)
 * - Manage their knowledge base for better RFP responses
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Database, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { SupportDocsUpload } from "@/components/knowledge-base/support-docs-upload";
import { SupportDocsList } from "@/components/knowledge-base/support-docs-list";
import { InsightsPanel } from "@/components/knowledge-base/insights-panel";
import { PerformanceMetrics } from "@/components/knowledge-base/performance-metrics";
import { ContentDistribution } from "@/components/knowledge-base/content-distribution";

interface Analytics {
  stats: {
    total: number;
    byStatus: {
      completed: number;
      processing: number;
      pending: number;
      failed: number;
    };
    byContentType: Record<string, number>;
    totalChunks: number;
    avgConfidence: number;
    recentUploads: number;
  };
  performance: {
    analysisSuccessRate: number;
    avgConfidence: number;
    documentsNeedingReview: number;
    failedDocuments: number;
  };
  insights: Array<{
    type: "success" | "warning" | "info" | "action";
    title: string;
    description: string;
    action?: {
      label: string;
      href: string;
    };
  }>;
  trends: {
    documentsChange: number;
    chunksChange: number;
  };
}

export default function KnowledgeBasePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const handleUploadComplete = () => {
    // Trigger a refresh of the documents list and analytics
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load analytics
  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoadingAnalytics(true);
        const response = await fetch(`/api/companies/${slug}/knowledge-base/analytics?period=30`);
        if (!response.ok) throw new Error('Failed to load analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    }

    loadAnalytics();
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: `/companies/${slug}/dashboard` },
          { label: "Base de connaissances" },
        ]}
        title="Base de connaissances"
        description="Alimentez votre système RAG avec des documents de support pour améliorer la qualité de vos réponses RFP"
      />

      {/* Stats Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Documents de support"
                value={analytics.stats.total}
                icon={FileText}
                iconColor="bg-teal-100 text-teal-600"
              />
              <StatCard
                label="Confiance moyenne"
                value={`${analytics.stats.avgConfidence}%`}
                icon={Sparkles}
                iconColor="bg-teal-100 text-teal-600"
              />
              <StatCard
                label="Chunks indexés"
                value={analytics.stats.totalChunks}
                icon={Database}
                iconColor="bg-teal-100 text-teal-600"
              />
              <StatCard
                label="Uploads récents (30j)"
                value={analytics.stats.recentUploads}
                icon={TrendingUp}
                iconColor="bg-teal-100 text-teal-600"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Insights Panel */}
        {!loadingAnalytics && analytics && analytics.insights.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Insights actionnables</h2>
            <InsightsPanel insights={analytics.insights} />
          </div>
        )}

        {/* Performance Metrics */}
        {!loadingAnalytics && analytics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Indicateurs de performance</h2>
            <PerformanceMetrics
              performance={analytics.performance}
              trends={analytics.trends}
            />
          </div>
        )}

        {/* Content Distribution & Info Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Distribution */}
          {!loadingAnalytics && analytics && (
            <ContentDistribution
              byContentType={analytics.stats.byContentType}
              total={analytics.stats.total}
            />
          )}

          {/* Info Banner */}
          <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Support Docs RAG v4.0
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      ✨ <strong>Analyse automatique</strong> : Claude Haiku 4.5 catégorise vos
                      documents
                    </p>
                    <p>
                      🏷️ <strong>Tagging intelligent</strong> : Tags auto-générés pour meilleure
                      découvrabilité
                    </p>
                    <p>
                      🎯 <strong>Dual Query Engine</strong> : Mélange support docs + RFPs
                      historiques
                    </p>
                    <p>
                      📊 <strong>Score de confiance</strong> : Analyse avec 98% de confiance
                      moyenne
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Téléverser un document de support
          </h2>
          <SupportDocsUpload companySlug={slug} onUploadComplete={handleUploadComplete} />
        </div>

        {/* Documents List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents de support</h2>
          <SupportDocsList slug={slug} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
