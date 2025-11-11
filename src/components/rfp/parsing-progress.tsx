'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';

interface ParsingProgressData {
  status: string; // pending, processing, completed, failed
  stage?: string; // downloading, parsing, extracting, categorizing, saving
  progressCurrent: number;
  progressTotal: number;
  progressPercentage: number;
  questionsExtracted: number;
  error?: string;
}

interface ParsingProgressProps {
  rfpId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  downloading: 'Téléchargement du document...',
  parsing: 'Analyse du document PDF...',
  extracting: 'Extraction des questions avec GPT-5...',
  categorizing: 'Catégorisation des questions...',
  saving: 'Sauvegarde des questions...',
};

export function ParsingProgress({ rfpId, onComplete, onError }: ParsingProgressProps) {
  const [progress, setProgress] = useState<ParsingProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/v1/rfp/rfps/${rfpId}/progress`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch progress');
        }

        setProgress(data);

        // Stop polling if completed or failed
        if (data.status === 'completed') {
          setIsPolling(false);
          onComplete?.();
        } else if (data.status === 'failed') {
          setIsPolling(false);
          onError?.(data.error || 'Parsing failed');
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
        setIsPolling(false);
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    const interval = setInterval(fetchProgress, 2000);

    return () => clearInterval(interval);
  }, [rfpId, isPolling, onComplete, onError]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {progress.status === 'processing' && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          )}
          {progress.status === 'completed' && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {progress.status === 'failed' && (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          {progress.status === 'pending' && (
            <FileText className="h-5 w-5 text-gray-400" />
          )}

          {progress.status === 'processing' && 'Analyse en cours...'}
          {progress.status === 'completed' && 'Analyse terminée'}
          {progress.status === 'failed' && 'Échec de l\'analyse'}
          {progress.status === 'pending' && 'En attente'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status message */}
        {progress.status === 'processing' && progress.stage && (
          <div className="text-sm text-gray-600">
            {STAGE_LABELS[progress.stage] || progress.stage}
          </div>
        )}

        {/* Progress bar */}
        {progress.status === 'processing' && (
          <div className="space-y-2">
            <Progress value={progress.progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {progress.stage === 'extracting'
                  ? `Batch ${progress.progressCurrent} / ${progress.progressTotal}`
                  : progress.stage === 'categorizing'
                  ? `Question ${progress.progressCurrent} / ${progress.progressTotal}`
                  : `${progress.progressPercentage}%`
                }
              </span>
              <span>{progress.questionsExtracted} questions extraites</span>
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
                  Analyse terminée avec succès
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {progress.questionsExtracted} questions ont été extraites et catégorisées
                </p>
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
                  L'analyse a échoué
                </p>
                {progress.error && (
                  <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap break-words">
                    {progress.error}
                  </p>
                )}
                <p className="text-xs text-red-600 mt-2">
                  Essayez de recharger la page et de redémarrer l'analyse
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending state */}
        {progress.status === 'pending' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  Document en attente d'analyse
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Cliquez sur "Démarrer l'analyse" pour commencer
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
