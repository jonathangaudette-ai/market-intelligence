'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  questionText: string;
  category: string | null;
  sectionTitle?: string | null;
  questionNumber?: string | null;
}

interface InlineBulkGeneratorProps {
  selectedQuestions: Question[];
  rfpId: string;
  slug: string;
  onComplete: () => void;
  onCancel?: () => void;
}

interface GenerationState {
  isGenerating: boolean;
  isPaused: boolean;
  currentIndex: number;
  currentQuestion: Question | null;
  streamingText: string;
  completed: Set<string>;
  errors: Map<string, string>;
  skipped: Map<string, string>;
}

export function InlineBulkGenerator({
  selectedQuestions,
  rfpId,
  slug,
  onComplete,
  onCancel,
}: InlineBulkGeneratorProps) {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    isPaused: false,
    currentIndex: 0,
    currentQuestion: null,
    streamingText: '',
    completed: new Set(),
    errors: new Map(),
    skipped: new Map(),
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save state to localStorage for recovery
  useEffect(() => {
    if (state.isGenerating || state.completed.size > 0) {
      localStorage.setItem(
        `bulk-generate-${rfpId}`,
        JSON.stringify({
          currentIndex: state.currentIndex,
          completed: Array.from(state.completed),
          errors: Array.from(state.errors.entries()),
          skipped: Array.from(state.skipped.entries()),
        })
      );
    }
  }, [state, rfpId]);

  // Check for recovery on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`bulk-generate-${rfpId}`);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.completed && parsed.completed.length > 0) {
        toast.info('Une génération précédente a été trouvée. Voulez-vous continuer?', {
          action: {
            label: 'Reprendre',
            onClick: () => {
              setState(prev => ({
                ...prev,
                currentIndex: parsed.currentIndex,
                completed: new Set(parsed.completed),
                errors: new Map(parsed.errors),
                skipped: new Map(parsed.skipped),
              }));
            },
          },
        });
      }
    }
  }, [rfpId]);

  const startGeneration = async () => {
    setState(prev => ({ ...prev, isGenerating: true, isPaused: false }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/bulk-generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionIds: selectedQuestions.map(q => q.id),
            mode: 'with_context',
            depth: 'basic',
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start bulk generation');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = JSON.parse(line.slice(6));
          handleSSEEvent(data);
        }
      }

      // Generation completed
      setState(prev => ({ ...prev, isGenerating: false }));
      toast.success('Génération terminée!');
      onComplete();

      // Clear localStorage
      localStorage.removeItem(`bulk-generate-${rfpId}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Génération annulée');
      } else {
        console.error('[Bulk Generate Error]', error);
        toast.error('Erreur lors de la génération');
      }
      setState(prev => ({ ...prev, isGenerating: false, isPaused: false }));
    }
  };

  const handleSSEEvent = (data: any) => {
    switch (data.type) {
      case 'question_start':
        setState(prev => ({
          ...prev,
          currentIndex: data.index - 1,
          currentQuestion: selectedQuestions.find(q => q.id === data.questionId) || null,
          streamingText: '',
        }));
        break;

      case 'response_chunk':
        setState(prev => ({
          ...prev,
          streamingText: data.accumulated,
        }));
        break;

      case 'question_completed':
        setState(prev => ({
          ...prev,
          completed: new Set([...prev.completed, data.questionId]),
          streamingText: '',
        }));
        toast.success('Question complétée!');
        break;

      case 'question_skipped':
        setState(prev => ({
          ...prev,
          skipped: new Map([...prev.skipped, [data.questionId, data.reason]]),
        }));
        toast.warning(`Question ignorée: ${data.reason}`);
        break;

      case 'question_error':
        setState(prev => ({
          ...prev,
          errors: new Map([...prev.errors, [data.questionId, data.error]]),
        }));
        toast.error(`Erreur: ${data.error}`);
        break;

      case 'batch_completed':
        console.log('[Batch Completed]', data);
        break;

      case 'error':
        toast.error(`Erreur fatale: ${data.error}`);
        break;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({ ...prev, isGenerating: false, isPaused: false }));
    onCancel?.();
  };

  const total = selectedQuestions.length;
  const completedCount = state.completed.size;
  const progressPercent = (completedCount / total) * 100;
  const wordCount = countWords(state.streamingText);

  return (
    <Card className="border-2 rounded-lg p-6 bg-muted/30">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Génération en cours ({completedCount}/{total})
        </h3>
        <div className="flex gap-2">
          {!state.isGenerating && completedCount === 0 && (
            <Button onClick={startGeneration} size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Démarrer
            </Button>
          )}
          {state.isGenerating && (
            <>
              <Button
                onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
                variant="outline"
                size="sm"
              >
                {state.isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Reprendre
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={handleCancel} variant="destructive" size="sm">
                <Square className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount} / {total} questions complétées
        </p>
      </div>

      {/* Current question streaming */}
      {state.currentQuestion && state.isGenerating && (
        <div className="border rounded-lg p-4 bg-background mb-4">
          <div className="flex items-start gap-2 mb-3">
            <Badge variant="outline" className="shrink-0">
              {state.currentQuestion.category || 'Général'}
            </Badge>
            <p className="font-medium text-sm">
              {state.currentQuestion.questionNumber && `${state.currentQuestion.questionNumber}. `}
              {state.currentQuestion.questionText}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 min-h-[120px]">
            <p className="whitespace-pre-wrap text-sm">
              {state.streamingText}
              {state.isGenerating && !state.isPaused && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1">▊</span>
              )}
            </p>
          </div>

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">{wordCount} mots</span>
            {state.isPaused && (
              <Badge variant="secondary">
                <Pause className="w-3 h-3 mr-1" />
                En pause
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>
            {completedCount} complétée{completedCount > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span>
            {state.skipped.size} ignorée{state.skipped.size > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="w-4 h-4 text-red-600" />
          <span>
            {state.errors.size} erreur{state.errors.size > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Error details */}
      {state.errors.size > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
            Erreurs détectées:
          </p>
          <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
            {Array.from(state.errors.entries()).map(([questionId, error]) => {
              const q = selectedQuestions.find(q => q.id === questionId);
              return (
                <li key={questionId}>
                  {q?.questionNumber || 'Question'}: {error}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Skipped details */}
      {state.skipped.size > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Questions ignorées:
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
            {Array.from(state.skipped.entries()).map(([questionId, reason]) => {
              const q = selectedQuestions.find(q => q.id === questionId);
              return (
                <li key={questionId}>
                  {q?.questionNumber || 'Question'}: {reason}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Completion message */}
      {!state.isGenerating && completedCount > 0 && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Génération terminée!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            {completedCount} réponse{completedCount > 1 ? 's' : ''} générée{completedCount > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}
