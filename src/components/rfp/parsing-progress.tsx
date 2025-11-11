'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { BatchChart } from './batch-chart';
import { EventTimeline } from './event-timeline';
import { QuestionPreview } from './question-preview';

interface LogEvent {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'progress';
  stage: string;
  message: string;
  metadata?: Record<string, any>;
}

interface ParsingProgressData {
  status: string; // pending, processing, completed, failed
  stage?: string; // downloading, parsing, extracting, categorizing, saving
  progressCurrent: number;
  progressTotal: number;
  progressPercentage: number;
  questionsExtracted: number;
  error?: string;
  logs: LogEvent[];
}

interface ParsingProgressProps {
  rfpId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  downloading: 'Téléchargement du document depuis le stockage...',
  parsing: 'Analyse du document PDF (extraction du texte)...',
  extracting: 'Extraction des questions avec GPT-5 (traitement par batch)...',
  categorizing: 'Catégorisation intelligente des questions avec Claude...',
  saving: 'Sauvegarde finale des questions dans la base de données...',
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  downloading: 'Récupération du fichier PDF depuis Vercel Blob Storage',
  parsing: 'Extraction du texte brut du PDF (~209k caractères pour ce document)',
  extracting: 'GPT-5 analyse le document par sections de 30k caractères pour identifier les questions',
  categorizing: 'Claude 3.5 Sonnet catégorise chaque question (difficulté, tags, estimation temps)',
  saving: 'Enregistrement de toutes les questions avec leurs métadonnées',
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
    <>
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
        {/* Status message with detailed info */}
        {progress.status === 'processing' && progress.stage && (
          <div className="space-y-3">
            {/* Current stage */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">
                    {STAGE_LABELS[progress.stage] || progress.stage}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {STAGE_DESCRIPTIONS[progress.stage] || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed progress metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Progression</p>
                <p className="text-lg font-semibold text-gray-900">
                  {progress.stage === 'extracting'
                    ? `${progress.progressCurrent}/${progress.progressTotal} batches`
                    : progress.stage === 'categorizing'
                    ? `${progress.progressCurrent}/${progress.progressTotal} questions`
                    : `${progress.progressPercentage}%`
                  }
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-700 mb-1">Questions trouvées</p>
                <p className="text-lg font-semibold text-green-900">
                  {progress.questionsExtracted}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {progress.status === 'processing' && (
          <div className="space-y-2">
            <Progress value={progress.progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {progress.progressPercentage}% complété
              </span>
              <span>
                {progress.stage === 'extracting' && 'GPT-5 en traitement...'}
                {progress.stage === 'categorizing' && 'Claude en traitement...'}
                {progress.stage === 'parsing' && 'Extraction PDF...'}
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

    {/* Advanced visualizations - Only show if logs exist */}
    {progress.logs && progress.logs.length > 0 && (
      <div className="mt-6 space-y-6">
        {/* Title section */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          <h3 className="text-sm font-medium text-gray-600 px-3">
            Détails de l'analyse en temps réel
          </h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        </div>

        {/* Charts and visualizations grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batch Chart - Left column */}
          <BatchChart logs={progress.logs} />

          {/* Event Timeline - Right column */}
          <EventTimeline logs={progress.logs} maxEvents={10} />
        </div>

        {/* Question Preview - Full width */}
        <QuestionPreview logs={progress.logs} maxQuestions={5} />
      </div>
    )}
    </>
  );
}
