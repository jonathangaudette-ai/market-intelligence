"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Package, RefreshCw } from "lucide-react";

interface LogEvent {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  metadata?: Record<string, any>;
}

interface ImportProgressData {
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  progressCurrent: number;
  progressTotal: number;
  productsImported: number;
  productsFailed: number;
  error?: string;
  logs: LogEvent[];
}

interface CatalogueImportProgressProps {
  slug: string;
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  validating: 'Validation des données...',
  importing: 'Import des produits en base de données...',
  finalizing: 'Finalisation...',
};

export function CatalogueImportProgress({
  slug,
  jobId,
  onComplete,
  onError,
}: CatalogueImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/companies/${slug}/pricing/catalog/jobs/${jobId}/progress`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Échec de récupération du statut');
        }

        setProgress(data);

        // Stop polling if completed or failed
        if (data.status === 'completed') {
          setIsPolling(false);
          onComplete?.();
        } else if (data.status === 'failed') {
          setIsPolling(false);
          onError?.(data.error || 'Import échoué');
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        onError?.(error instanceof Error ? error.message : 'Erreur inconnue');
        setIsPolling(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    const interval = setInterval(fetchProgress, 2000);

    return () => clearInterval(interval);
  }, [jobId, slug, isPolling, onComplete, onError]);

  if (!progress) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage =
    progress.progressTotal > 0
      ? Math.round((progress.progressCurrent / progress.progressTotal) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {progress.status === 'running' && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            {progress.status === 'completed' && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {progress.status === 'failed' && (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {progress.status === 'pending' && (
              <Package className="h-5 w-5 text-gray-400" />
            )}

            {progress.status === 'running' && 'Import en cours...'}
            {progress.status === 'completed' && 'Import terminé'}
            {progress.status === 'failed' && 'Échec de l\'import'}
            {progress.status === 'pending' && 'En attente'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Running state */}
          {progress.status === 'running' && progress.currentStep && (
            <div className="space-y-3">
              {/* Current step */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">
                      {STEP_LABELS[progress.currentStep] || progress.currentStep}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Progression</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {progress.progressCurrent}/{progress.progressTotal}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 mb-1">Importés</p>
                  <p className="text-lg font-semibold text-green-900">
                    {progress.productsImported}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-700 mb-1">Échecs</p>
                  <p className="text-lg font-semibold text-red-900">
                    {progress.productsFailed}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {progress.status === 'running' && (
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{progressPercentage}% complété</span>
                <span>
                  {progress.currentStep === 'importing' && 'Insertion en base de données...'}
                  {progress.currentStep === 'validating' && 'Vérification des données...'}
                  {progress.currentStep === 'finalizing' && 'Presque terminé...'}
                </span>
              </div>
            </div>
          )}

          {/* Completed state */}
          {progress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    Import terminé avec succès
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {progress.productsImported} produits ont été importés dans votre catalogue
                  </p>
                  {progress.productsFailed > 0 && (
                    <p className="text-sm text-amber-700 mt-1">
                      {progress.productsFailed} produits ont échoué (voir les logs ci-dessous)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Failed state */}
          {progress.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">
                    L'import a échoué
                  </p>
                  {progress.error && (
                    <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap break-words">
                      {progress.error}
                    </p>
                  )}
                  <p className="text-xs text-red-600 mt-2">
                    Veuillez réessayer ou contacter le support si le problème persiste
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending state */}
          {progress.status === 'pending' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    Import en attente de démarrage
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    L'import démarrera automatiquement dans quelques instants...
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Card */}
      {progress.logs && progress.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs d'import (temps réel)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {progress.logs.slice().reverse().map((log, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded border ${
                    log.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : log.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : log.type === 'progress'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <span className="font-mono text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString('fr-CA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  {' - '}
                  {log.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
