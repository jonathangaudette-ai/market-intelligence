"use client";

import { useState } from "react";
import { Stepper, StepContent, Step, StepStatus } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Brain,
  Filter,
  Scissors,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LiveAnalysisView } from "@/components/live-analysis-view";
import { LiveFilteringView } from "@/components/live-filtering-view";

const STEPS: Step[] = [
  { id: "upload", label: "Upload", icon: <Upload className="h-6 w-6" /> },
  { id: "extraction", label: "Extraction", icon: <FileText className="h-6 w-6" /> },
  { id: "analysis", label: "Analyse", icon: <Brain className="h-6 w-6" /> },
  { id: "filtering", label: "Filtrage", icon: <Filter className="h-6 w-6" /> },
  { id: "chunking", label: "Chunking", icon: <Scissors className="h-6 w-6" /> },
  { id: "embeddings", label: "Embeddings", icon: <Sparkles className="h-6 w-6" /> },
  { id: "finalize", label: "Finalisation", icon: <CheckCircle className="h-6 w-6" /> },
];

interface DocumentUploadWizardProps {
  slug: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface StepData {
  upload?: {
    file: File;
    documentId: string;
  };
  extraction?: {
    pages: number;
    wordCount: number;
    text: string;
  };
  analysis?: {
    sections: Array<{
      id: string;
      title: string;
      type: string;
      relevanceScore: number;
      preview: string;
    }>;
    documentType: string;
    confidence: number;
  };
  filtering?: {
    keptSections: number;
    rejectedSections: number;
    sections: Array<{ id: string; title: string; kept: boolean }>;
  };
  chunking?: {
    totalChunks: number;
    chunks: Array<{ index: number; content: string; wordCount: number }>;
  };
  embeddings?: {
    progress: number;
    totalVectors: number;
  };
}

export function DocumentUploadWizard({
  slug,
  onComplete,
  onCancel,
}: DocumentUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    upload: "in_progress",
    extraction: "pending",
    analysis: "pending",
    filtering: "pending",
    chunking: "pending",
    embeddings: "pending",
    finalize: "pending",
  });
  const [stepData, setStepData] = useState<StepData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const updateStepStatus = (stepId: string, status: StepStatus) => {
    setStepStatuses((prev) => ({ ...prev, [stepId]: status }));
  };

  const handleNext = async () => {
    const currentStepId = STEPS[currentStep].id;

    // Execute the current step
    setIsProcessing(true);
    updateStepStatus(currentStepId, "in_progress");

    try {
      switch (currentStepId) {
        case "upload":
          await executeUploadStep();
          break;
        case "extraction":
          await executeExtractionStep();
          break;
        case "analysis":
          await executeAnalysisStep();
          break;
        case "filtering":
          await executeFilteringStep();
          break;
        case "chunking":
          await executeChunkingStep();
          break;
        case "embeddings":
          await executeEmbeddingsStep();
          break;
        case "finalize":
          await executeFinalizeStep();
          break;
      }

      updateStepStatus(currentStepId, "completed");

      // Move to next step or complete
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
        updateStepStatus(STEPS[currentStep + 1].id, "in_progress");
      } else {
        toast({ title: "Document traité avec succès!" });
        onComplete();
      }
    } catch (error: any) {
      updateStepStatus(currentStepId, "failed");
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    const currentStepId = STEPS[currentStep].id;
    updateStepStatus(currentStepId, "in_progress");
    handleNext();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Step execution functions
  const executeUploadStep = async () => {
    // Upload needs a file - if no file, skip
    if (!stepData.upload?.file) {
      throw new Error("Aucun fichier sélectionné");
    }

    // Real upload to API
    const formData = new FormData();
    formData.append("file", stepData.upload.file);

    const response = await fetch(`/api/companies/${slug}/documents/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();

    // Store the document ID for next steps
    setStepData((prev) => ({
      ...prev,
      upload: {
        ...prev.upload!,
        documentId: result.documentId,
      },
    }));

    // Simulate delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const executeExtractionStep = async () => {
    // Simulate extraction (API already did it)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock extraction data for display
    setStepData((prev) => ({
      ...prev,
      extraction: {
        pages: 45,
        wordCount: 12543,
        text: "Document extrait avec succès...",
      },
    }));
  };

  const executeAnalysisStep = async () => {
    // Analysis step - show live view
    // The live view will simulate the analysis
    await new Promise((resolve) => setTimeout(resolve, 6000)); // 3 sections × 2s
  };

  const executeFilteringStep = async () => {
    // Filtering step - show live view
    // The live view will simulate filtering
    if (!stepData.analysis?.sections) {
      throw new Error("No sections to filter");
    }
    await new Promise((resolve) => setTimeout(resolve, stepData.analysis.sections.length * 1500));
  };

  const executeChunkingStep = async () => {
    // Simulate chunking (API already did it)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setStepData((prev) => ({
      ...prev,
      chunking: {
        totalChunks: 127,
        chunks: [],
      },
    }));
  };

  const executeEmbeddingsStep = async () => {
    // Simulate embeddings (API already did it)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setStepData((prev) => ({
      ...prev,
      embeddings: {
        progress: 100,
        totalVectors: 127,
      },
    }));
  };

  const executeFinalizeStep = async () => {
    // Finalize (API already did it)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const currentStepId = STEPS[currentStep].id;
  const currentStatus = stepStatuses[currentStepId];

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Stepper */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        stepStatuses={stepStatuses}
      />

      {/* Step Content */}
      <StepContent
        currentStep={currentStep}
        totalSteps={STEPS.length}
        title={STEPS[currentStep].label}
        icon={STEPS[currentStep].icon}
      >
        {renderStepContent()}
      </StepContent>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Annuler
        </Button>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isProcessing}
            >
              Précédent
            </Button>
          )}

          {currentStatus === "failed" ? (
            <Button onClick={handleRetry} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Réessayer
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === STEPS.length - 1 ? "Terminer" : "Suivant"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function renderStepContent() {
    switch (currentStepId) {
      case "upload":
        return <UploadStepContent onFileSelect={(file) => {
          setStepData({ upload: { file, documentId: "temp-id" } });
        }} />;

      case "extraction":
        return <ExtractionStepContent data={stepData.extraction} />;

      case "analysis":
        return stepStatuses.analysis === "in_progress" ? (
          <LiveAnalysisView
            documentId={stepData.upload?.documentId || ""}
            slug={slug}
            onComplete={(sections) => {
              setStepData((prev) => ({
                ...prev,
                analysis: {
                  sections,
                  documentType: "Competitive Intelligence",
                  confidence: 0.95,
                },
              }));
            }}
          />
        ) : (
          <AnalysisStepContent data={stepData.analysis} />
        );

      case "filtering":
        return stepStatuses.filtering === "in_progress" ? (
          <LiveFilteringView
            sections={stepData.analysis?.sections || []}
            onComplete={(keptSections) => {
              setStepData((prev) => ({
                ...prev,
                filtering: {
                  keptSections: keptSections.length,
                  rejectedSections:
                    (stepData.analysis?.sections.length || 0) - keptSections.length,
                  sections: stepData.analysis?.sections.map((s) => ({
                    id: s.id,
                    title: s.title,
                    kept: keptSections.some((ks) => ks.id === s.id),
                  })) || [],
                },
              }));
            }}
            minRelevanceScore={0.7}
          />
        ) : (
          <FilteringStepContent data={stepData.filtering} />
        );

      case "chunking":
        return <ChunkingStepContent data={stepData.chunking} />;

      case "embeddings":
        return <EmbeddingsStepContent data={stepData.embeddings} />;

      case "finalize":
        return <FinalizeStepContent />;

      default:
        return null;
    }
  }
}

// Step content components
function UploadStepContent({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Upload className="h-16 w-16 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium">Sélectionnez un document</h3>
      <p className="mt-2 text-sm text-gray-600">
        Format accepté: PDF (max 50MB)
      </p>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="mt-4"
      />
    </div>
  );
}

function ExtractionStepContent({ data }: { data?: StepData["extraction"] }) {
  if (!data) return <div>En attente...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Pages extraites</div>
          <div className="mt-1 text-2xl font-bold">{data.pages}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Mots détectés</div>
          <div className="mt-1 text-2xl font-bold">{data.wordCount.toLocaleString()}</div>
        </Card>
      </div>
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="text-sm font-medium text-gray-700">Aperçu du texte:</div>
        <div className="mt-2 max-h-40 overflow-y-auto text-sm text-gray-600">
          {data.text.substring(0, 500)}...
        </div>
      </div>
    </div>
  );
}

function AnalysisStepContent({ data }: { data?: StepData["analysis"] }) {
  if (!data) return <div>Analyse en cours avec Claude...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">Type de document</div>
          <div className="mt-1 text-lg font-bold">{data.documentType}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Confiance</div>
          <div className="mt-1 text-lg font-bold">{Math.round(data.confidence * 100)}%</div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700">
          Sections détectées ({data.sections.length})
        </div>
        <div className="mt-2 space-y-2">
          {data.sections.map((section) => (
            <Card key={section.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{section.title}</div>
                  <div className="mt-1 text-xs text-gray-600">{section.preview}</div>
                </div>
                <div className="ml-4 text-sm text-teal-600">
                  {Math.round(section.relevanceScore * 100)}%
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilteringStepContent({ data }: { data?: StepData["filtering"] }) {
  return <div>Filtrage des sections...</div>;
}

function ChunkingStepContent({ data }: { data?: StepData["chunking"] }) {
  return <div>Découpage en morceaux...</div>;
}

function EmbeddingsStepContent({ data }: { data?: StepData["embeddings"] }) {
  return <div>Génération des embeddings...</div>;
}

function FinalizeStepContent() {
  return <div>Finalisation...</div>;
}
