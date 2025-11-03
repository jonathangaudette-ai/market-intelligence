"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Brain,
  Filter,
  Scissors,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Hash,
  FileType,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentStatus {
  documentId: string;
  name: string;
  status: "completed" | "processing" | "failed";
  progress: {
    uploaded: boolean;
    extracted: boolean;
    analyzed: boolean;
    chunked: boolean;
    embedded: boolean;
    finalized: boolean;
    currentStep: string | null;
    currentStepProgress: number | null;
    currentStepMessage: string | null;
  };
  stats: {
    pageCount: number;
    wordCount: number;
    sectionsTotal: number;
    sectionsKept: number;
    totalChunks: number;
    vectorCount: number;
  };
  documentType: string | null;
  analysisConfidence: number | null;
  uploadedAt: string;
  updatedAt: string;
}

const STEPS = [
  { id: "upload", label: "Upload", icon: Upload, field: "uploaded" },
  { id: "extraction", label: "Extraction", icon: FileText, field: "extracted" },
  { id: "analysis", label: "Analyse", icon: Brain, field: "analyzed" },
  { id: "filtering", label: "Filtrage", icon: Filter, field: null },
  { id: "chunking", label: "Chunking", icon: Scissors, field: "chunked" },
  { id: "embeddings", label: "Embeddings", icon: Sparkles, field: "embedded" },
  { id: "finalize", label: "Finalisation", icon: CheckCircle, field: "finalized" },
];

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const documentId = params.documentId as string;

  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  // Load document status
  const loadDocumentStatus = async () => {
    try {
      const response = await fetch(`/api/companies/${slug}/documents/${documentId}/status`);

      if (!response.ok) {
        throw new Error("Failed to load document status");
      }

      const data = await response.json();
      setDocumentStatus(data);

      // If document is still processing, enable polling
      if (data.status === "processing") {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (error) {
      console.error("Error loading document status:", error);
      toast.error("Erreur lors du chargement du document");
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadDocumentStatus();
  }, []);

  // Polling effect
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      loadDocumentStatus();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [polling]);

  const getStepStatus = (stepId: string): "completed" | "in_progress" | "pending" | "skipped" => {
    if (!documentStatus) return "pending";

    const step = STEPS.find((s) => s.id === stepId);
    if (!step) return "pending";

    // Check if this is the current step
    if (documentStatus.progress.currentStep === stepId) {
      return "in_progress";
    }

    // Check if step is completed based on progress fields
    if (step.field) {
      const fieldValue = documentStatus.progress[step.field as keyof typeof documentStatus.progress];
      if (fieldValue === true) {
        return "completed";
      }
    }

    // Special case for filtering (no dedicated field)
    if (stepId === "filtering" && documentStatus.progress.chunked) {
      return "completed";
    }

    // If a later step is completed, this step must be completed too
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);
    const laterSteps = STEPS.slice(stepIndex + 1);
    const laterStepCompleted = laterSteps.some((laterStep) => {
      if (!laterStep.field) return false;
      const fieldValue = documentStatus.progress[laterStep.field as keyof typeof documentStatus.progress];
      return fieldValue === true;
    });

    if (laterStepCompleted) {
      return "completed";
    }

    return "pending";
  };

  const getStepResults = (stepId: string) => {
    if (!documentStatus) return null;

    switch (stepId) {
      case "upload":
        return documentStatus.progress.uploaded
          ? { message: "Document téléversé avec succès" }
          : null;

      case "extraction":
        return documentStatus.progress.extracted
          ? {
              message: `${documentStatus.stats.pageCount} pages, ${documentStatus.stats.wordCount.toLocaleString()} mots extraits`,
              details: [
                { label: "Pages", value: documentStatus.stats.pageCount },
                { label: "Mots", value: documentStatus.stats.wordCount.toLocaleString() },
              ],
            }
          : null;

      case "analysis":
        return documentStatus.progress.analyzed
          ? {
              message: `${documentStatus.stats.sectionsTotal} sections détectées`,
              details: [
                { label: "Type de document", value: documentStatus.documentType || "N/A" },
                {
                  label: "Confiance",
                  value: documentStatus.analysisConfidence
                    ? `${documentStatus.analysisConfidence}%`
                    : "N/A",
                },
                { label: "Sections totales", value: documentStatus.stats.sectionsTotal },
              ],
            }
          : null;

      case "filtering":
        return documentStatus.stats.sectionsKept > 0
          ? {
              message: `${documentStatus.stats.sectionsKept} sections conservées`,
              details: [
                { label: "Conservées", value: documentStatus.stats.sectionsKept },
                {
                  label: "Rejetées",
                  value: documentStatus.stats.sectionsTotal - documentStatus.stats.sectionsKept,
                },
              ],
            }
          : null;

      case "chunking":
        return documentStatus.progress.chunked
          ? {
              message: `${documentStatus.stats.totalChunks} chunks créés`,
              details: [{ label: "Total chunks", value: documentStatus.stats.totalChunks }],
            }
          : null;

      case "embeddings":
        return documentStatus.progress.embedded
          ? {
              message: `${documentStatus.stats.vectorCount} vecteurs créés`,
              details: [
                { label: "Vecteurs", value: documentStatus.stats.vectorCount },
                { label: "Modèle", value: "text-embedding-3-large" },
                { label: "Dimensions", value: "1536" },
              ],
            }
          : null;

      case "finalize":
        return documentStatus.progress.finalized
          ? { message: "Document finalisé et indexé" }
          : null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!documentStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Document non trouvé</p>
          <Button className="mt-4" onClick={() => router.push(`/companies/${slug}/documents`)}>
            Retour aux documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/companies/${slug}/documents`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{documentStatus.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Téléversé le{" "}
                  {new Date(documentStatus.uploadedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                {documentStatus.documentType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileType className="h-4 w-4" />
                    {documentStatus.documentType}
                  </div>
                )}
              </div>
            </div>

            <Badge
              variant={
                documentStatus.status === "completed"
                  ? "success"
                  : documentStatus.status === "processing"
                  ? "warning"
                  : "destructive"
              }
              className="gap-1"
            >
              {documentStatus.status === "completed" && (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Complété
                </>
              )}
              {documentStatus.status === "processing" && (
                <>
                  <Clock className="h-3 w-3" />
                  En cours
                </>
              )}
              {documentStatus.status === "failed" && (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Échec
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Pages</p>
                  <p className="text-lg font-bold text-gray-900">
                    {documentStatus.stats.pageCount || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Hash className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Sections</p>
                  <p className="text-lg font-bold text-gray-900">
                    {documentStatus.stats.sectionsKept || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Chunks</p>
                  <p className="text-lg font-bold text-gray-900">
                    {documentStatus.stats.totalChunks || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Vecteurs</p>
                  <p className="text-lg font-bold text-gray-900">
                    {documentStatus.stats.vectorCount || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing Steps */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              Historique de traitement
            </h2>

            <div className="space-y-4">
              {STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                const results = getStepResults(step.id);
                const StepIcon = step.icon;
                const isCurrentStep =
                  documentStatus.progress.currentStep === step.id;

                return (
                  <div key={step.id} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          status === "completed"
                            ? "bg-green-100"
                            : status === "in_progress"
                            ? "bg-yellow-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {status === "completed" ? (
                          <CheckCircle2
                            className={`h-5 w-5 ${
                              status === "completed" ? "text-green-600" : "text-gray-400"
                            }`}
                          />
                        ) : status === "in_progress" ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-600 border-t-transparent" />
                        ) : (
                          <StepIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-[40px] ${
                            status === "completed" ? "bg-green-300" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{step.label}</h3>
                        {status === "completed" && (
                          <Badge variant="success" className="text-xs">
                            Complété
                          </Badge>
                        )}
                        {status === "in_progress" && (
                          <Badge variant="warning" className="text-xs">
                            En cours
                          </Badge>
                        )}
                        {status === "pending" && (
                          <Badge variant="outline" className="text-xs">
                            En attente
                          </Badge>
                        )}
                      </div>

                      {/* Current step message */}
                      {isCurrentStep && documentStatus.progress.currentStepMessage && (
                        <p className="text-sm text-yellow-700 mb-2">
                          {documentStatus.progress.currentStepMessage}
                        </p>
                      )}

                      {/* Results */}
                      {results && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-2">{results.message}</p>
                          {results.details && (
                            <div className="grid grid-cols-2 gap-2">
                              {results.details.map((detail, i) => (
                                <div
                                  key={i}
                                  className="bg-gray-50 rounded-lg px-3 py-2 text-xs"
                                >
                                  <span className="text-gray-600">{detail.label}:</span>{" "}
                                  <span className="font-medium text-gray-900">
                                    {detail.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
