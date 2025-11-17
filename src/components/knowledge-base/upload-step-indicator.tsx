'use client';

import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  details?: string;
  startTime?: number;
  endTime?: number;
  result?: any;
}

interface UploadStepIndicatorProps {
  step: UploadStep;
  isActive: boolean;
}

export function UploadStepIndicator({ step, isActive }: UploadStepIndicatorProps) {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getDuration = () => {
    if (!step.startTime) return null;
    const end = step.endTime || Date.now();
    const duration = Math.round((end - step.startTime) / 1000);
    return `${duration}s`;
  };

  const getProgressText = () => {
    if (step.status !== 'in_progress') return null;

    if (step.progress !== undefined && step.progress > 0) {
      return `${step.progress}%`;
    }

    return 'En cours...';
  };

  const getResultSummary = () => {
    if (!step.result) return null;

    switch (step.id) {
      case 'extracting':
        return `${step.result.textLength?.toLocaleString()} caractères, ${step.result.pageCount} pages`;
      case 'analyzing':
        return `Type: ${step.result.documentType} (${Math.round(step.result.confidence * 100)}% confiance)`;
      case 'embedding':
        return `${step.result.embeddingCount} embeddings générés`;
      case 'indexing':
        return 'Indexation complétée';
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-colors',
        isActive && 'bg-teal-50 border-teal-200',
        step.status === 'completed' && 'bg-green-50 border-green-200',
        step.status === 'error' && 'bg-red-50 border-red-200',
        step.status === 'pending' && 'bg-gray-50 border-gray-200'
      )}
    >
      <div className="shrink-0 mt-1">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{step.label}</h4>
          <div className="flex items-center gap-2">
            {step.status === 'in_progress' && getProgressText() && (
              <span className="text-xs text-teal-600 font-semibold">{getProgressText()}</span>
            )}
            {getDuration() && (
              <span className="text-xs text-gray-500 font-mono">{getDuration()}</span>
            )}
          </div>
        </div>

        {step.details && (
          <p className="text-sm text-gray-600 mb-2">{step.details}</p>
        )}

        {step.status === 'in_progress' && !step.progress && (
          <p className="text-xs text-teal-600 animate-pulse">Traitement en cours...</p>
        )}

        {step.progress !== undefined && step.status === 'in_progress' && step.progress > 0 && (
          <div className="space-y-1 mt-2">
            <Progress value={step.progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{step.progress}%</span>
              {step.id === 'embedding' || step.id === 'indexing' ? (
                <span>Traitement par batch...</span>
              ) : null}
            </div>
          </div>
        )}

        {step.status === 'completed' && getResultSummary() && (
          <p className="text-xs text-gray-600 mt-1">✓ {getResultSummary()}</p>
        )}
      </div>
    </div>
  );
}
