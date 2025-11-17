'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [isOpen, setIsOpen] = useState(false);

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

  const getDetailedContent = () => {
    if (!step.result) return null;

    switch (step.id) {
      case 'extracting':
        return (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre de caractères:</span>
              <span className="font-mono font-semibold">{step.result.textLength?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre de pages:</span>
              <span className="font-mono font-semibold">{step.result.pageCount}</span>
            </div>
            {step.result.metadata && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-600">Métadonnées extraites</span>
              </div>
            )}
          </div>
        );

      case 'analyzing':
        return (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Type de document:</span>
              <span className="font-mono font-semibold">{step.result.documentType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Niveau de confiance:</span>
              <span className="font-mono font-semibold">{Math.round(step.result.confidence * 100)}%</span>
            </div>
            {step.result.summary && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-600 block mb-1">Résumé:</span>
                <p className="text-gray-700 leading-relaxed">{step.result.summary}</p>
              </div>
            )}
            {step.result.model && (
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Modèle utilisé:</span>
                <span className="font-mono text-teal-700">{step.result.model}</span>
              </div>
            )}
          </div>
        );

      case 'embedding':
        return (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre d'embeddings:</span>
              <span className="font-mono font-semibold">{step.result.embeddingCount}</span>
            </div>
            {step.result.chunkCount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre de chunks:</span>
                <span className="font-mono font-semibold">{step.result.chunkCount}</span>
              </div>
            )}
            {step.result.model && (
              <div className="flex justify-between">
                <span className="text-gray-600">Modèle d'embedding:</span>
                <span className="font-mono text-teal-700">{step.result.model}</span>
              </div>
            )}
            {step.result.dimensions && (
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-mono font-semibold">{step.result.dimensions}</span>
              </div>
            )}
          </div>
        );

      case 'indexing':
        return (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Statut:</span>
              <span className="font-semibold text-green-700">✓ Complété</span>
            </div>
            {step.result.vectorCount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Vecteurs indexés:</span>
                <span className="font-mono font-semibold">{step.result.vectorCount}</span>
              </div>
            )}
            {step.result.namespace && (
              <div className="flex justify-between">
                <span className="text-gray-600">Namespace Pinecone:</span>
                <span className="font-mono text-teal-700">{step.result.namespace}</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const hasDetailedContent = step.status === 'completed' && step.result;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-lg border transition-colors',
          isActive && 'bg-teal-50 border-teal-200',
          step.status === 'completed' && 'bg-green-50 border-green-200',
          step.status === 'error' && 'bg-red-50 border-red-200',
          step.status === 'pending' && 'bg-gray-50 border-gray-200'
        )}
      >
        <div className="flex items-start gap-3 p-4">
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
                {hasDetailedContent && (
                  <CollapsibleTrigger asChild>
                    <button className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </CollapsibleTrigger>
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

        {hasDetailedContent && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2 border-t border-gray-300/50">
              {getDetailedContent()}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
