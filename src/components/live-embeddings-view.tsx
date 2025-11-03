"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LiveEmbeddingsViewProps {
  documentId: string;
  slug: string;
  onComplete: (totalVectors: number) => void;
  onError: (error: string) => void;
}

export function LiveEmbeddingsView({
  documentId,
  slug,
  onComplete,
  onError,
}: LiveEmbeddingsViewProps) {
  const [progressMessage, setProgressMessage] = useState("Préparation des chunks pour l'embedding...");
  const [progressPercent, setProgressPercent] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  useEffect(() => {
    let mounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/companies/${slug}/documents/${documentId}/status`);

        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();

        if (!mounted) return;

        // Update progress from currentStep metadata
        if (data.progress.currentStep === "embeddings") {
          setProgressMessage(data.progress.currentStepMessage || "Génération des embeddings...");
          setProgressPercent(data.progress.currentStepProgress || 0);
          setTotalChunks(data.stats.totalChunks || 0);
        }

        // Check if embeddings are completed
        if (data.progress.embedded) {
          clearInterval(pollInterval);
          onComplete(data.stats.vectorCount || 0);
        }

        // Check for errors
        if (data.status === "failed") {
          clearInterval(pollInterval);
          onError("Échec de la génération des embeddings");
        }
      } catch (error) {
        console.error("Error polling embeddings status:", error);
        if (mounted) {
          clearInterval(pollInterval);
          onError(error instanceof Error ? error.message : "Unknown error");
        }
      }
    }, 1000); // Poll every second

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [documentId, slug, onComplete, onError]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-teal-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Génération des embeddings
          </h3>
          <p className="text-sm text-gray-600">
            Création des vecteurs d'embedding avec OpenAI
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="p-6 border-teal-200 bg-teal-50">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-teal-800">Progression</span>
              <span className="text-sm font-medium text-teal-800">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Status Message */}
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-teal-600 animate-spin flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-teal-800 font-medium">{progressMessage}</p>
              {totalChunks > 0 && (
                <p className="text-xs text-teal-700 mt-1">
                  {totalChunks} chunks à traiter
                </p>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-white/50 p-3 border border-teal-200">
            <div className="text-xs font-medium text-teal-800 mb-2">Configuration</div>
            <div className="space-y-1 text-xs text-teal-700">
              <div className="flex justify-between">
                <span>Modèle:</span>
                <span className="font-medium">text-embedding-3-large</span>
              </div>
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="font-medium">1536</span>
              </div>
              <div className="flex justify-between">
                <span>Stockage:</span>
                <span className="font-medium">Pinecone</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Text */}
      <p className="text-sm text-gray-600">
        Les embeddings permettront de rechercher sémantiquement dans le contenu du document et de répondre à vos questions.
      </p>
    </div>
  );
}
