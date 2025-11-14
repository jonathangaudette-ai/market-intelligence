"use client";

/**
 * Knowledge Base Page
 * Phase 1 Day 8-9 - Support Docs RAG v4.0
 *
 * This page allows users to:
 * - Upload support documents (PDFs, DOCX, TXT)
 * - View auto-analysis results (content type, tags, confidence)
 * - Manage their knowledge base for better RFP responses
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Database, Sparkles, TrendingUp } from "lucide-react";
import { SupportDocsUpload } from "@/components/knowledge-base/support-docs-upload";
import { SupportDocsList } from "@/components/knowledge-base/support-docs-list";

export default function KnowledgeBasePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger a refresh of the documents list
    setRefreshTrigger((prev) => prev + 1);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Documents de support"
              value="0"
              icon={FileText}
              iconColor="bg-teal-100 text-teal-600"
            />
            <StatCard
              label="Taux d'analyse"
              value="0%"
              icon={Sparkles}
              iconColor="bg-purple-100 text-purple-600"
            />
            <StatCard
              label="Chunks indexés"
              value="0"
              icon={Database}
              iconColor="bg-blue-100 text-blue-600"
            />
            <StatCard
              label="Amélioration RAG"
              value="+0%"
              icon={TrendingUp}
              iconColor="bg-green-100 text-green-600"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Support Docs RAG v4.0 - Analyse intelligente
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>
                    ✨ <strong>Analyse automatique</strong> : Claude Haiku 4.5 catégorise
                    automatiquement vos documents (méthodologies, études de cas, specs techniques,
                    etc.)
                  </p>
                  <p>
                    🏷️ <strong>Tagging intelligent</strong> : Génération automatique de tags pour
                    améliorer la découvrabilité
                  </p>
                  <p>
                    🎯 <strong>Dual Query Engine</strong> : Vos documents sont mélangés avec les
                    réponses RFP historiques pour des réponses de meilleure qualité
                  </p>
                  <p>
                    📊 <strong>Score de confiance</strong> : Chaque analyse est accompagnée d'un
                    score de confiance (98% en moyenne)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Téléverser un document de support
          </h2>
          <SupportDocsUpload onUploadComplete={handleUploadComplete} />
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
