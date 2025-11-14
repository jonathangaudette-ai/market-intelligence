"use client";

/**
 * Support Docs Upload Component
 * Phase 1 Day 8-9 - Support Docs RAG v4.0
 *
 * This component handles:
 * - File upload with drag-and-drop
 * - Document purpose selection (rfp_support, company_info)
 * - Content type tagging
 * - Upload progress tracking
 */

import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SupportDocsUploadProps {
  onUploadComplete: () => void;
}

type DocumentPurpose = "rfp_support" | "company_info";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword", // DOC
  "text/plain",
];

export function SupportDocsUpload({ onUploadComplete }: SupportDocsUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentPurpose, setDocumentPurpose] = useState<DocumentPurpose>("rfp_support");
  const [contentType, setContentType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    status: "idle" | "uploading" | "analyzing" | "completed" | "error";
    message?: string;
    documentId?: string;
  }>({ status: "idle" });
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez PDF, DOCX, DOC ou TXT.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Le fichier est trop volumineux. Maximum : ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    setSelectedFile(file);
    setUploadStatus({ status: "idle" });
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle tag addition
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (tags.includes(tagInput.trim())) {
      toast.error("Ce tag existe déjà");
      return;
    }
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus({ status: "uploading", message: "Upload en cours..." });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentPurpose", documentPurpose);
      if (contentType) formData.append("contentType", contentType);
      if (tags.length > 0) formData.append("tags", JSON.stringify(tags));

      const response = await fetch("/api/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload échoué");
      }

      const result = await response.json();

      setUploadStatus({
        status: "analyzing",
        message: "Analyse du document avec Claude Haiku 4.5...",
        documentId: result.documentId,
      });

      // Poll for analysis completion
      await pollAnalysisStatus(result.documentId);

      setUploadStatus({
        status: "completed",
        message: "Document analysé et indexé avec succès!",
      });

      toast.success("Document téléversé et analysé avec succès!");

      // Reset form
      setTimeout(() => {
        setSelectedFile(null);
        setContentType("");
        setTags([]);
        setUploadStatus({ status: "idle" });
        onUploadComplete();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Erreur lors de l'upload",
      });
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  // Poll analysis status
  const pollAnalysisStatus = async (documentId: string) => {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const response = await fetch(`/api/knowledge-base/upload?documentId=${documentId}`);
        if (!response.ok) continue;

        const data = await response.json();

        if (data.status === "completed") {
          return;
        } else if (data.status === "failed") {
          throw new Error("L'analyse du document a échoué");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }

      attempts++;
    }

    throw new Error("Timeout lors de l'analyse du document");
  };

  const getStatusDisplay = () => {
    switch (uploadStatus.status) {
      case "uploading":
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        );
      case "analyzing":
        return (
          <div className="flex items-center gap-2 text-purple-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-teal-500 bg-teal-50"
                : selectedFile
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-teal-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Glissez-déposez vos fichiers ici
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  PDF, DOCX, DOC ou TXT • Maximum 50 MB
                </p>
                <Input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <Label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>Sélectionner un fichier</span>
                  </Button>
                </Label>
              </div>
            )}
          </div>

          {/* Document Purpose */}
          <div className="space-y-2">
            <Label>Usage du document</Label>
            <Select
              value={documentPurpose}
              onValueChange={(value) => setDocumentPurpose(value as DocumentPurpose)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rfp_support">
                  Document de support RFP (méthodologies, études de cas, etc.)
                </SelectItem>
                <SelectItem value="company_info">
                  Information générale sur l'entreprise
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Type (Optional) */}
          <div className="space-y-2">
            <Label>Type de contenu (optionnel)</Label>
            <Input
              placeholder="ex: méthodologie agile, étude de cas bancaire..."
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              disabled={uploading}
            />
            <p className="text-xs text-gray-500">
              Claude analysera automatiquement le document, mais vous pouvez fournir un indice
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optionnel)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                disabled={uploading}
              />
              <Button onClick={handleAddTag} variant="outline" disabled={uploading}>
                Ajouter
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600"
                      disabled={uploading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status Display */}
          {uploadStatus.status !== "idle" && (
            <div className="p-4 bg-gray-50 rounded-lg">{getStatusDisplay()}</div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {uploadStatus.status === "uploading"
                  ? "Upload en cours..."
                  : "Analyse en cours..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Téléverser et analyser
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
