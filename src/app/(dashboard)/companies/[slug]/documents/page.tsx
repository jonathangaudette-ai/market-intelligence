"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Trash2,
  Building2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentProgressTracker } from "@/components/document-progress-tracker";
import { DocumentUploadWizard } from "@/components/document-upload-wizard";

type Document = {
  id: string;
  name: string;
  type: "pdf" | "website" | "linkedin";
  status: "completed" | "processing" | "failed";
  competitor?: string;
  uploadedAt: string;
  chunks: number;
  size?: string;
};

interface DocumentStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  totalChunks: number;
}

export default function DocumentsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats>({ total: 0, completed: 0, processing: 0, failed: 0, totalChunks: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processingDocuments, setProcessingDocuments] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents from API
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${slug}/documents`);

      if (!response.ok) {
        throw new Error("Failed to load documents");
      }

      const data = await response.json();
      setDocuments(data.documents);
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Seuls les fichiers PDF sont acceptés");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 10 MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`/api/companies/${slug}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        // Show detailed error message if available
        const errorMessage = error.details
          ? `${error.error}: ${error.details}`
          : (error.error || "Upload failed");
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success("Document téléversé avec succès!");
      toast.info(`Analyse en cours avec Claude Sonnet 4.5...`);

      // Add to processing documents for real-time tracking
      setProcessingDocuments(prev => [...prev, { id: result.documentId, name: selectedFile.name }]);

      setUploadOpen(false);
      setSelectedFile(null);

      // Refresh documents list
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          label: "Complété",
          variant: "success" as const,
        };
      case "processing":
        return {
          icon: Clock,
          label: "En cours",
          variant: "warning" as const,
        };
      case "failed":
        return {
          icon: AlertCircle,
          label: "Échec",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: Clock,
          label: status,
          variant: "default" as const,
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return FileText;
      case "website":
        return Globe;
      case "linkedin":
        return Building2;
      default:
        return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Upload Wizard */}
      {uploadOpen ? (
        <div className="min-h-screen bg-white">
          <DocumentUploadWizard
            slug={slug}
            onComplete={() => {
              setUploadOpen(false);
              loadDocuments();
              toast.success("Document traité avec succès!");
            }}
            onCancel={() => {
              setUploadOpen(false);
              setSelectedFile(null);
            }}
          />
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gérez vos documents et sources d'intelligence
              </p>
            </div>
            <Button className="gap-2" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Téléverser un document
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total documents</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.total}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Complétés</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.completed}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En traitement</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.processing}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total chunks</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {stats.totalChunks}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Processing Documents - Real-time Progress */}
        {processingDocuments.length > 0 && (
          <div className="space-y-4 mb-6">
            {processingDocuments.map((doc) => (
              <DocumentProgressTracker
                key={doc.id}
                slug={slug}
                documentId={doc.id}
                documentName={doc.name}
                onComplete={() => {
                  setProcessingDocuments(prev => prev.filter(d => d.id !== doc.id));
                  loadDocuments();
                  toast.success(`${doc.name} traité avec succès!`);
                }}
                onError={(error) => {
                  setProcessingDocuments(prev => prev.filter(d => d.id !== doc.id));
                  toast.error(`Échec du traitement: ${error}`);
                  loadDocuments();
                }}
              />
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un document..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtres
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concurrent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chunks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => {
                    const TypeIcon = getTypeIcon(doc.type);
                    const statusConfig = getStatusConfig(doc.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TypeIcon className="h-5 w-5 text-teal-600" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/companies/${slug}/documents/${doc.id}`}
                                className="text-sm font-medium text-gray-900 hover:text-teal-600 truncate max-w-xs block transition-colors"
                              >
                                {doc.name}
                              </Link>
                              {doc.size && (
                                <p className="text-xs text-gray-500">{doc.size}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.competitor ? (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="h-3 w-3" />
                              {doc.competitor}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doc.chunks > 0 ? doc.chunks : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.uploadedAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {doc.status === "completed" && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card
          className="mt-6 border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors cursor-pointer"
          onClick={() => setUploadOpen(true)}
        >
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Glissez-déposez vos fichiers ici
            </p>
            <p className="text-xs text-gray-500 mb-4">
              ou cliquez pour sélectionner (PDF uniquement, max 10 MB)
            </p>
            <Button>Sélectionner un fichier</Button>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
