"use client";

import { useState, useEffect } from "react";
import { Stepper, StepContent, Step, StepStatus } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  documentId?: string; // Optional: if provided, wizard loads existing document in view mode
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
  documentId,
}: DocumentUploadWizardProps) {
  // View mode: if documentId is provided, we're viewing an existing document
  const viewMode = !!documentId;

  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    upload: viewMode ? "pending" : "in_progress",
    extraction: "pending",
    analysis: "pending",
    filtering: "pending",
    chunking: "pending",
    embeddings: "pending",
    finalize: "pending",
  });
  const [stepData, setStepData] = useState<StepData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(viewMode);

  const updateStepStatus = (stepId: string, status: StepStatus) => {
    setStepStatuses((prev) => ({ ...prev, [stepId]: status }));
  };

  // Helper function to poll progress from status endpoint
  const pollProgress = async (documentId: string): Promise<() => void> => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/companies/${slug}/documents/${documentId}/status`);
        if (response.ok) {
          const status = await response.json();
          if (status.progress?.currentStepMessage) {
            setProgressMessage(status.progress.currentStepMessage);
          }
        }
      } catch (error) {
        console.error("Error polling progress:", error);
      }
    }, 1000); // Poll every second

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
      setProgressMessage(null);
    };
  };

  // Load existing document data in view mode
  useEffect(() => {
    if (!viewMode || !documentId) return;

    const loadDocumentData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/companies/${slug}/documents/${documentId}/status`);

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        const data = await response.json();

        // Reconstruct step statuses from progress
        const newStatuses: Record<string, StepStatus> = {
          upload: data.progress.uploaded ? "completed" : "pending",
          extraction: data.progress.extracted ? "completed" : "pending",
          analysis: data.progress.analyzed ? "completed" : "pending",
          filtering: data.stats.sectionsKept > 0 ? "completed" : "pending",
          chunking: data.progress.chunked ? "completed" : "pending",
          embeddings: data.progress.embedded ? "completed" : "pending",
          finalize: data.progress.finalized ? "completed" : "pending",
        };

        // If still processing, mark current step as in_progress
        if (data.status === "processing" && data.progress.currentStep) {
          newStatuses[data.progress.currentStep] = "in_progress";
        }

        setStepStatuses(newStatuses);

        // Reconstruct step data from API response including all sections
        const newStepData: StepData = {
          upload: data.progress.uploaded ? {
            file: new File([], data.name), // Dummy file
            documentId: data.documentId,
          } : undefined,
          extraction: data.progress.extracted ? {
            pages: data.stats.pageCount,
            wordCount: data.stats.wordCount,
            text: "(Texte extrait - voir document original)",
          } : undefined,
          analysis: data.progress.analyzed && data.analysis ? {
            sections: data.analysis.sections.map((s: any) => ({
              id: s.id,
              title: s.title,
              type: s.type,
              relevanceScore: s.relevanceScore,
              preview: s.preview,
            })),
            documentType: data.documentType || "Unknown",
            confidence: (data.analysisConfidence || 0) / 100,
          } : undefined,
          filtering: data.stats.sectionsKept > 0 && data.filtering ? {
            keptSections: data.stats.sectionsKept,
            rejectedSections: data.stats.sectionsTotal - data.stats.sectionsKept,
            sections: data.filtering.sections,
          } : undefined,
          chunking: data.progress.chunked && data.chunks ? {
            totalChunks: data.stats.totalChunks,
            chunks: data.chunks.all || [],
          } : undefined,
          embeddings: data.progress.embedded ? {
            progress: 100,
            totalVectors: data.stats.vectorCount,
          } : undefined,
        };

        setStepData(newStepData);

        // Set current step to the first incomplete step or last step if all complete
        const firstIncompleteIndex = STEPS.findIndex(
          (step) => newStatuses[step.id] !== "completed"
        );
        setCurrentStep(firstIncompleteIndex >= 0 ? firstIncompleteIndex : STEPS.length - 1);

      } catch (error) {
        console.error("Error loading document:", error);
        setErrorMessage("Erreur lors du chargement du document");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocumentData();
  }, [viewMode, documentId, slug]);

  const handleNext = async () => {
    // In view mode, just navigate to next step without executing
    if (viewMode) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        onComplete();
      }
      return;
    }

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
        onComplete();
      }
    } catch (error: any) {
      updateStepStatus(currentStepId, "failed");
      const errorMsg = error?.message || "Une erreur est survenue";
      setErrorMessage(`${STEPS[currentStep].label}: ${errorMsg}`);
      console.error(`[${currentStepId}] Error:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    const currentStepId = STEPS[currentStep].id;
    setErrorMessage(null);
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
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    // Start polling for progress
    const stopPolling = await pollProgress(stepData.upload.documentId);

    try {
      const response = await fetch(
        `/api/companies/${slug}/documents/${stepData.upload.documentId}/extract`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Extraction failed");
      }

      const result = await response.json();

      setStepData((prev) => ({
        ...prev,
        extraction: {
          pages: result.pages,
          wordCount: result.wordCount,
          text: result.textPreview,
        },
      }));
    } finally {
      // Stop polling when done
      stopPolling();
    }
  };

  const executeAnalysisStep = async () => {
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    // Start polling for progress
    const stopPolling = await pollProgress(stepData.upload.documentId);

    try {
      const response = await fetch(
        `/api/companies/${slug}/documents/${stepData.upload.documentId}/analyze`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const result = await response.json();

      setStepData((prev) => ({
        ...prev,
        analysis: {
          sections: result.sections,
          documentType: result.documentType,
          confidence: result.confidence,
        },
      }));
    } finally {
      // Stop polling when done
      stopPolling();
    }
  };

  const executeFilteringStep = async () => {
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    const response = await fetch(
      `/api/companies/${slug}/documents/${stepData.upload.documentId}/filter`,
      { method: "POST" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Filtering failed");
    }

    const result = await response.json();

    setStepData((prev) => ({
      ...prev,
      filtering: {
        keptSections: result.keptSections,
        rejectedSections: result.rejectedSections,
        sections: result.sections,
      },
    }));
  };

  const executeChunkingStep = async () => {
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    const response = await fetch(
      `/api/companies/${slug}/documents/${stepData.upload.documentId}/chunk`,
      { method: "POST" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Chunking failed");
    }

    const result = await response.json();

    setStepData((prev) => ({
      ...prev,
      chunking: {
        totalChunks: result.totalChunks,
        chunks: result.chunkPreview || [],
      },
    }));
  };

  const executeEmbeddingsStep = async () => {
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    // Start polling for progress
    const stopPolling = await pollProgress(stepData.upload.documentId);

    try {
      const response = await fetch(
        `/api/companies/${slug}/documents/${stepData.upload.documentId}/embed`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Embedding failed");
      }

      const result = await response.json();

      setStepData((prev) => ({
        ...prev,
        embeddings: {
          progress: 100,
          totalVectors: result.vectorsCreated,
        },
      }));
    } finally {
      // Stop polling when done
      stopPolling();
    }
  };

  const executeFinalizeStep = async () => {
    if (!stepData.upload?.documentId) {
      throw new Error("Document ID manquant");
    }

    const response = await fetch(
      `/api/companies/${slug}/documents/${stepData.upload.documentId}/finalize`,
      { method: "POST" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Finalization failed");
    }

    const result = await response.json();
    console.log("Document finalized:", result);
  };

  const currentStepId = STEPS[currentStep].id;
  const currentStatus = stepStatuses[currentStepId];

  // Show loading state while fetching document data
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* View Mode Indicator */}
      {viewMode && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
          <p className="text-sm text-blue-800">
            📄 Mode consultation - Visualisation de l'historique de traitement
          </p>
        </div>
      )}

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

      {/* Progress Message */}
      {progressMessage && isProcessing && (
        <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <div className="flex items-start">
            <Loader2 className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0 animate-spin" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Progrès</h3>
              <p className="mt-1 text-sm text-blue-700">{progressMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 border border-red-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          {viewMode ? "Fermer" : "Annuler"}
        </Button>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={!viewMode && isProcessing}
            >
              Précédent
            </Button>
          )}

          {!viewMode && currentStatus === "failed" ? (
            <Button onClick={handleRetry} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Réessayer
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!viewMode && isProcessing}>
              {!viewMode && isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === STEPS.length - 1
                ? (viewMode ? "Fermer" : "Terminer")
                : "Suivant"}
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
  if (!data) return <div>Filtrage des sections...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Sections conservées</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{data.keptSections}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Sections rejetées</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{data.rejectedSections}</div>
        </Card>
      </div>

      {data.sections && data.sections.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Détail des sections ({data.sections.length})
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.sections.map((section) => (
              <Card key={section.id} className={`p-3 ${section.kept ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{section.title}</div>
                  <Badge variant={section.kept ? "success" : "destructive"}>
                    {section.kept ? "Conservée" : "Rejetée"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChunkingStepContent({ data }: { data?: StepData["chunking"] }) {
  if (!data) return <div>Découpage en morceaux...</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm text-gray-600">Total chunks créés</div>
        <div className="mt-1 text-2xl font-bold">{data.totalChunks}</div>
      </Card>

      {data.chunks && data.chunks.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Tous les chunks ({data.chunks.length})
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.chunks.map((chunk, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Chunk #{chunk.index + 1}</span>
                  <span className="text-xs text-gray-500">{chunk.wordCount} mots</span>
                </div>
                <div className="text-sm text-gray-700">{chunk.content}...</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmbeddingsStepContent({ data }: { data?: StepData["embeddings"] }) {
  if (!data) return <div>Génération des embeddings...</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm text-gray-600">Vecteurs créés</div>
        <div className="mt-1 text-2xl font-bold text-teal-600">{data.totalVectors}</div>
      </Card>
      <div className="rounded-lg bg-teal-50 p-4 border border-teal-200">
        <div className="text-sm font-medium text-teal-800">Configuration</div>
        <div className="mt-2 space-y-1 text-sm text-teal-700">
          <div>Modèle: text-embedding-3-large</div>
          <div>Dimensions: 1536</div>
          <div>Stockage: Pinecone</div>
        </div>
      </div>
    </div>
  );
}

function FinalizeStepContent() {
  return <div>Finalisation...</div>;
}
