'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadStepIndicator } from './upload-step-indicator';

export type DocumentCategory =
  | 'company_info'
  | 'knowledge_base'
  | 'rfp_won'
  | 'rfp_all'
  | 'competitive'
  | 'product';

interface DocumentUploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  companySlug: string;
  documentCategory: DocumentCategory;
  contentType?: string;
  tags?: string[];
  onComplete: (documentId: string) => void;
}

type Step = 'extracting' | 'analyzing' | 'embedding' | 'indexing';

interface UploadStep {
  id: Step;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  details?: string;
  startTime?: number;
  endTime?: number;
  result?: any;
}

const INITIAL_STEPS: UploadStep[] = [
  { id: 'extracting', label: 'Extraction du texte', status: 'pending' },
  { id: 'analyzing', label: 'Analyse avec Claude Haiku 4.5', status: 'pending' },
  { id: 'embedding', label: 'Génération des embeddings', status: 'pending' },
  { id: 'indexing', label: 'Indexation dans Pinecone', status: 'pending' },
];

export function DocumentUploadProgressModal(props: DocumentUploadProgressModalProps) {
  const [steps, setSteps] = useState<UploadStep[]>(INITIAL_STEPS);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!props.isOpen) {
      resetState();
    } else {
      startUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isOpen]);

  const startUpload = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('file', props.file);
      formData.append('documentPurpose', getDocumentPurpose(props.documentCategory));
      formData.append('documentType', getDocumentType(props.documentCategory));
      if (props.contentType) formData.append('contentType', props.contentType);
      if (props.tags && props.tags.length > 0) {
        formData.append('tags', JSON.stringify(props.tags));
      }

      const response = await fetch(
        `/api/companies/${props.companySlug}/knowledge-base/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload échoué');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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
          const event = JSON.parse(line.slice(6));
          handleEvent(event);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Upload annulé');
      } else {
        setError(error.message || "Erreur lors de l'upload");
      }
    }
  };

  const handleEvent = (event: any) => {
    switch (event.type) {
      case 'upload_complete':
        setDocumentId(event.documentId);
        break;

      case 'step_start':
        updateStep(event.step, {
          status: 'in_progress',
          startTime: Date.now(),
          details: event.details,
          progress: 0,
        });
        setCurrentStep(event.step);
        break;

      case 'step_progress':
        updateStep(event.step, { progress: event.progress });
        break;

      case 'step_complete':
        updateStep(event.step, {
          status: 'completed',
          endTime: Date.now(),
          progress: 100,
          result: event.result,
        });
        break;

      case 'complete':
        setIsComplete(true);
        setTotalTime(event.totalTime);
        setCurrentStep(null);
        break;

      case 'error':
        setError(event.error);
        if (event.step) {
          updateStep(event.step, { status: 'error' });
        }
        break;
    }
  };

  const updateStep = (stepId: Step, updates: Partial<UploadStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    props.onClose();
  };

  const handleComplete = () => {
    if (documentId) {
      props.onComplete(documentId);
    }
    props.onClose();
  };

  const resetState = () => {
    setSteps(INITIAL_STEPS);
    setCurrentStep(null);
    setDocumentId(null);
    setError(null);
    setIsComplete(false);
    setTotalTime(null);
  };

  const overallProgress = calculateOverallProgress(steps);

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isComplete && !error ? '✓ Document traité avec succès!' : 'Traitement du document en cours'}
          </DialogTitle>
          <DialogDescription>
            {props.file.name} • {(props.file.size / 1024 / 1024).toFixed(2)} MB
          </DialogDescription>
        </DialogHeader>

        {/* Steps Timeline */}
        <div className="space-y-3 py-4">
          {steps.map((step) => (
            <UploadStepIndicator
              key={step.id}
              step={step}
              isActive={currentStep === step.id}
            />
          ))}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progression totale</span>
            <span className="text-gray-500">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {totalTime !== null && (
            <p className="text-xs text-gray-500 text-right">
              Temps total: {totalTime}s
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {isComplete && !error && (
          <Alert>
            <AlertDescription className="text-green-700">
              ✅ Document téléversé et analysé avec succès!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {isComplete || error ? (
            <Button onClick={handleComplete}>
              {isComplete ? 'Terminé' : 'Fermer'}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function calculateOverallProgress(steps: UploadStep[]): number {
  const weights = {
    extracting: 15,
    analyzing: 40,
    embedding: 25,
    indexing: 20,
  };

  let totalProgress = 0;
  steps.forEach((step) => {
    const weight = weights[step.id as Step];
    if (step.status === 'completed') {
      totalProgress += weight;
    } else if (step.status === 'in_progress' && step.progress !== undefined) {
      totalProgress += (weight * step.progress) / 100;
    }
  });

  return Math.round(totalProgress);
}

function getDocumentPurpose(category: DocumentCategory): string {
  const mapping: Record<DocumentCategory, string> = {
    company_info: 'company_info',
    knowledge_base: 'rfp_support',
    rfp_won: 'rfp_response',
    rfp_all: 'rfp_response',
    competitive: 'rfp_support',
    product: 'rfp_support',
  };
  return mapping[category];
}

function getDocumentType(category: DocumentCategory): string {
  const mapping: Record<DocumentCategory, string> = {
    company_info: 'company_info',
    knowledge_base: 'product_doc',
    rfp_won: 'past_rfp',
    rfp_all: 'past_rfp',
    competitive: 'competitive_intel',
    product: 'product_doc',
  };
  return mapping[category];
}
