"use client";

/**
 * Support Docs List Component
 * Phase 1 Day 8-9 - Support Docs RAG v4.0
 *
 * Displays uploaded support documents with:
 * - Analysis status and confidence
 * - Content type categorization
 * - Auto-generated tags
 * - Document purpose
 */

import { useState, useEffect } from "react";
import { FileText, CheckCircle2, Clock, AlertCircle, Loader2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

interface SupportDoc {
  id: string;
  name: string;
  documentPurpose: "rfp_support" | "rfp_response" | "company_info";
  contentType?: string;
  contentTypeTags?: string[];
  status: "pending" | "processing" | "completed" | "failed";
  analysisConfidence?: number;
  createdAt: string;
}

interface SupportDocsListProps {
  slug: string;
  refreshTrigger: number;
}

export function SupportDocsList({ slug, refreshTrigger }: SupportDocsListProps) {
  const [documents, setDocuments] = useState<SupportDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger, slug]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // Fetch all support documents (rfp_support + company_info)
      const response = await fetch(`/api/companies/${slug}/documents?purpose=rfp_support,company_info`);

      if (!response.ok) {
        throw new Error("Failed to load documents");
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string, documentName: string) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer "${documentName}" ? Cette action supprimera également tous les embeddings associés.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/companies/${slug}/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }

      toast.success("Document supprimé avec succès");
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la suppression du document"
      );
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
            Analyse en cours
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

  const getPurposeLabel = (purpose: string) => {
    switch (purpose) {
      case "rfp_support":
        return "Support RFP";
      case "rfp_response":
        return "Réponse RFP";
      case "company_info":
        return "Info entreprise";
      default:
        return purpose;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Chargement des documents...</p>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState
            icon={FileText}
            title="Aucun document de support"
            description="Commencez à construire votre base de connaissances en téléversant des documents de support (méthodologies, études de cas, spécifications techniques, etc.)"
          />
        </CardContent>
      </Card>
    );
  }

  return (
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
                  Type de contenu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confiance
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
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${slug}/knowledge-base/support-docs/${doc.id}`}
                          className="text-sm font-medium text-teal-600 hover:text-teal-700 truncate max-w-xs block hover:underline"
                        >
                          {doc.name}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.contentType ? (
                      <Badge variant="outline">{doc.contentType}</Badge>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {doc.contentTypeTags && doc.contentTypeTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {doc.contentTypeTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {doc.contentTypeTags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{doc.contentTypeTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline">{getPurposeLabel(doc.documentPurpose)}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {doc.analysisConfidence ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              doc.analysisConfidence >= 80
                                ? "bg-green-500"
                                : doc.analysisConfidence >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${doc.analysisConfidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{doc.analysisConfidence}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.name)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
