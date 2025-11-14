"use client";

/**
 * Support Document Detail Page
 * Displays complete information about a support document including:
 * - Document metadata and analysis
 * - Claude analysis results
 * - Chunks and vectors information
 * - PDF download access
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Tag,
  Sparkles,
  Database,
  Calendar,
  User,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface DocumentDetail {
  // Basic info
  id: string;
  name: string;
  type: "pdf" | "website" | "linkedin" | "manual";
  status: "completed" | "processing" | "failed" | "pending";
  documentPurpose: "rfp_support" | "rfp_response" | "company_info" | null;
  contentType: string | null;
  contentTypeTags: string[];

  // Analysis
  analysisCompleted: boolean;
  analysisConfidence: number | null;
  analysis?: {
    documentType?: string;
    executiveSummary?: string;
    primaryCompetitor?: string;
    confidenceScore?: number;
    summary?: string;
    keyTopics?: string[];
    extractedEntities?: string[];
    suggestedCategories?: Array<{
      category: string;
      confidence: number;
    }>;
  };

  // Extraction & indexing
  totalChunks: number;
  vectorsCreated: boolean;
  pageCount?: number;
  wordCount?: number;
  extractedAt?: string;

  // File access
  blobUrl?: string;
  fileSize?: number;
  fileSizeFormatted?: string;

  // Processing
  processingSteps: any[];
  errorMessage: string | null;

  // Metadata
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
  createdAtRelative: string;
  updatedAt: string;

  // Additional
  isHistoricalRfp: boolean | null;
  sourceUrl: string | null;
}

export default function SupportDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [documentId, slug]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/companies/${slug}/knowledge-base/documents/${documentId}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load document");
      }

      const data = await response.json();
      setDocument(data);
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du chargement du document"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document?.blobUrl) {
      toast.error("URL du fichier non disponible");
      return;
    }

    try {
      const response = await fetch(document.blobUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer "${document.name}" ? Cette action supprimera également tous les embeddings associés.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      const response = await fetch(
        `/api/companies/${slug}/documents/${documentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }

      toast.success("Document supprimé avec succès");
      router.push(`/companies/${slug}/knowledge-base`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la suppression"
      );
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Analysé
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Traitement en cours
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Échec
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPurposeLabel = (purpose: string | null) => {
    switch (purpose) {
      case "rfp_support":
        return "Support RFP";
      case "rfp_response":
        return "Réponse RFP";
      case "company_info":
        return "Info entreprise";
      default:
        return "Non spécifié";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Document non trouvé
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Le document demandé n'existe pas ou vous n'y avez pas accès.
              </p>
              <Link href={`/companies/${slug}/knowledge-base`}>
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la Knowledge Base
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: `/companies/${slug}/dashboard` },
          { label: "Knowledge Base", href: `/companies/${slug}/knowledge-base` },
          { label: document.name },
        ]}
        title={document.name}
        description={document.contentType || "Document de support"}
        actions={
          <div className="flex gap-2">
            {document.blobUrl && (
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Status & Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Statut</div>
                {getStatusBadge(document.status)}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Usage</div>
                <Badge variant="outline">{getPurposeLabel(document.documentPurpose)}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Confiance</div>
                {document.analysisConfidence ? (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          document.analysisConfidence >= 80
                            ? "bg-green-500"
                            : document.analysisConfidence >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${document.analysisConfidence}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{document.analysisConfidence}%</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Chunks créés</div>
                <div className="flex items-center gap-1">
                  <Database className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium">{document.totalChunks}</span>
                  {document.vectorsCreated && (
                    <Badge variant="success" className="ml-2 text-xs">
                      Vectorisé
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Type & Tags */}
        {(document.contentType || document.contentTypeTags.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-teal-600" />
                Catégorisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {document.contentType && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Type de contenu</div>
                    <Badge variant="outline" className="text-sm">
                      {document.contentType}
                    </Badge>
                  </div>
                )}
                {document.contentTypeTags.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {document.contentTypeTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claude Analysis */}
        {document.analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                Analyse Claude Haiku 4.5
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.analysis.executiveSummary && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Résumé</div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {document.analysis.executiveSummary}
                  </p>
                </div>
              )}

              {document.analysis.documentType && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Type détecté
                  </div>
                  <Badge variant="outline">{document.analysis.documentType}</Badge>
                </div>
              )}

              {document.analysis.suggestedCategories &&
                document.analysis.suggestedCategories.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Catégories suggérées
                    </div>
                    <div className="space-y-2">
                      {document.analysis.suggestedCategories.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700">{cat.category}</span>
                              <span className="text-xs text-gray-500">
                                {Math.round(cat.confidence * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-teal-600 h-1.5 rounded-full"
                                style={{ width: `${cat.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {document.analysis.keyTopics && document.analysis.keyTopics.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Topics clés
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {document.analysis.keyTopics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Document Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Extraction Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                Extraction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {document.pageCount && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Pages</span>
                  <span className="text-sm font-medium">{document.pageCount}</span>
                </div>
              )}
              {document.wordCount && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Mots</span>
                  <span className="text-sm font-medium">
                    {document.wordCount.toLocaleString()}
                  </span>
                </div>
              )}
              {document.fileSizeFormatted && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Taille</span>
                  <span className="text-sm font-medium">{document.fileSizeFormatted}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Chunks</span>
                <span className="text-sm font-medium">{document.totalChunks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Vectors</span>
                <span className="text-sm font-medium">
                  {document.vectorsCreated ? "Oui" : "Non"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Métadonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">Créé le</div>
                <div className="text-sm font-medium">{formatDate(document.createdAt)}</div>
                <div className="text-xs text-gray-400">{document.createdAtRelative}</div>
              </div>
              {document.uploadedBy && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Uploadé par</div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {document.uploadedBy.name || document.uploadedBy.email}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500 mb-1">ID Document</div>
                <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {document.id.substring(0, 20)}...
                </code>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message (if any) */}
        {document.errorMessage && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Erreur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">{document.errorMessage}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
