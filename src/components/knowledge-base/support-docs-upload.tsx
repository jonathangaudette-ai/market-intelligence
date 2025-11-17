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
import { Upload, FileText, X } from "lucide-react";
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
import { DocumentUploadProgressModal } from "./document-upload-progress-modal";

interface SupportDocsUploadProps {
  companySlug: string;
  onUploadComplete: () => void;
}

type DocumentCategory =
  | "company_info"
  | "knowledge_base"
  | "rfp_won"
  | "rfp_all"
  | "competitive"
  | "product";

type DocumentPurpose = "rfp_support" | "company_info" | "rfp_response";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Mapping catégorie → backend fields
const CATEGORY_MAPPING: Record<DocumentCategory, {
  documentPurpose: DocumentPurpose;
  documentType: string;
  isHistoricalRfp?: boolean;
  rfpOutcome?: "won" | "lost" | "pending";
}> = {
  company_info: {
    documentPurpose: "company_info",
    documentType: "company_info"
  },
  knowledge_base: {
    documentPurpose: "rfp_support",
    documentType: "product_doc"
  },
  rfp_won: {
    documentPurpose: "rfp_response",
    documentType: "past_rfp",
    isHistoricalRfp: true,
    rfpOutcome: "won"
  },
  rfp_all: {
    documentPurpose: "rfp_response",
    documentType: "past_rfp",
    isHistoricalRfp: true
  },
  competitive: {
    documentPurpose: "rfp_support",
    documentType: "competitive_intel"
  },
  product: {
    documentPurpose: "rfp_support",
    documentType: "product_doc"
  },
};

// Options de sous-catégories
const CONTENT_TYPES = [
  { value: "company-overview", label: "Présentation entreprise" },
  { value: "corporate-info", label: "Informations corporatives" },
  { value: "team-structure", label: "Structure d'équipe" },
  { value: "company-history", label: "Historique entreprise" },
  { value: "values-culture", label: "Valeurs et culture" },
  { value: "product-description", label: "Description produit" },
  { value: "service-offering", label: "Offre de services" },
  { value: "project-methodology", label: "Méthodologie projet" },
  { value: "technical-solution", label: "Solution technique" },
  { value: "project-timeline", label: "Calendrier projet" },
  { value: "pricing-structure", label: "Structure de prix" },
];

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword", // DOC
  "text/plain",
];

export function SupportDocsUpload({ companySlug, onUploadComplete }: SupportDocsUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentCategory, setDocumentCategory] = useState<DocumentCategory>("knowledge_base");
  const [contentType, setContentType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

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

  // Handle upload - now just opens the progress modal
  const handleUpload = () => {
    if (!selectedFile) return;
    setShowProgressModal(true);
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
                />
                <Label htmlFor="file-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>Sélectionner un fichier</span>
                  </Button>
                </Label>
              </div>
            )}
          </div>

          {/* Document Category */}
          <div className="space-y-2">
            <Label>Catégorie du document *</Label>
            <Select
              value={documentCategory}
              onValueChange={(value) => setDocumentCategory(value as DocumentCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_info">
                  🏢 Informations Entreprise
                </SelectItem>
                <SelectItem value="knowledge_base">
                  📚 Base de Connaissances (méthodologies, guides)
                </SelectItem>
                <SelectItem value="rfp_won">
                  🏆 RFP Historique Gagné
                </SelectItem>
                <SelectItem value="rfp_all">
                  📋 RFP Historique (tous)
                </SelectItem>
                <SelectItem value="competitive">
                  🎯 Intelligence Concurrentielle
                </SelectItem>
                <SelectItem value="product">
                  🔧 Documentation Produits
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Cette catégorie détermine comment le document sera utilisé dans le système
            </p>
          </div>

          {/* Content Type (Subcategory - Optional) */}
          <div className="space-y-2">
            <Label>Sous-catégorie (optionnel)</Label>
            <Select
              value={contentType}
              onValueChange={setContentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type de contenu..." />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Claude analysera automatiquement, mais vous pouvez préciser pour plus de précision
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
              />
              <Button onClick={handleAddTag} variant="outline">
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
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="w-full"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Téléverser et analyser
          </Button>
        </div>
      </CardContent>

      {/* Progress Modal */}
      {showProgressModal && selectedFile && (
        <DocumentUploadProgressModal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          file={selectedFile}
          companySlug={companySlug}
          documentCategory={documentCategory}
          contentType={contentType}
          tags={tags}
          onComplete={() => {
            setShowProgressModal(false);
            setSelectedFile(null);
            setContentType("");
            setTags([]);
            onUploadComplete();
            toast.success("Document téléversé avec succès!");
          }}
        />
      )}
    </Card>
  );
}
