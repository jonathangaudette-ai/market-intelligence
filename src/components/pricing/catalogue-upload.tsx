"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Loader2
} from "lucide-react";
import { CataloguePreview } from "./catalogue-preview";
import { CatalogueImportProgress } from "./catalogue-import-progress";

interface ColumnMapping {
  detectedColumn: string;
  mappedTo: 'sku' | 'name' | 'description' | 'price' | 'category' | 'brand' | 'url' | 'ignore';
  confidence: number;
  sampleValues: string[];
}

interface PreviewData {
  fileId: string;
  filename: string;
  rowCount: number;
  columns: ColumnMapping[];
  previewRows: Record<string, string>[];
  existingSkusCount: number;
  newSkusCount: number;
}

type UploadStep = 'upload' | 'preview' | 'mapping' | 'importing';

interface CatalogueUploadProps {
  slug: string;
}

export function CatalogueUpload({ slug }: CatalogueUploadProps) {
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileChange = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setPreviewData(null);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx')) {
        handleFileChange(droppedFile);
      } else {
        setError('Format de fichier non supporté. Utilisez CSV ou Excel (.xlsx)');
      }
    }
  }, []);

  // Upload file and get preview
  const handleUploadForPreview = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/companies/${slug}/pricing/catalog/preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec de l\'analyse du fichier');
      }

      setPreviewData(data);
      setColumnMapping(data.columns);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Update column mapping
  const updateColumnMapping = (index: number, mappedTo: ColumnMapping['mappedTo']) => {
    setColumnMapping(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], mappedTo };
      return updated;
    });
  };

  // Start import job
  const handleStartImport = async () => {
    if (!previewData) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${slug}/pricing/catalog/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: previewData.fileId,
          columnMapping: columnMapping.reduce((acc, col) => {
            if (col.mappedTo !== 'ignore') {
              acc[col.detectedColumn] = col.mappedTo;
            }
            return acc;
          }, {} as Record<string, string>),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec du démarrage de l\'import');
      }

      setImportJobId(data.jobId);
      setStep('importing');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setColumnMapping([]);
    setImportJobId(null);
    setError(null);
  };

  // Validation
  const hasRequiredMappings = () => {
    const mappedFields = new Set(columnMapping.map(c => c.mappedTo));
    return mappedFields.has('sku') && mappedFields.has('name') && mappedFields.has('price');
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-teal-600" />
            Format Attendu
          </CardTitle>
          <CardDescription>
            Votre fichier CSV ou Excel doit contenir au minimum: SKU, Nom du produit, et Prix
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2">
            <div>
              <span className="font-semibold text-teal-700">SKU</span>
              <span className="text-gray-600"> (obligatoire) - Code produit unique</span>
            </div>
            <div>
              <span className="font-semibold text-teal-700">Nom</span>
              <span className="text-gray-600"> (obligatoire) - Nom du produit</span>
            </div>
            <div>
              <span className="font-semibold text-blue-700">Description</span>
              <span className="text-gray-600"> (recommandé) - Description détaillée pour meilleur matching IA</span>
            </div>
            <div>
              <span className="font-semibold text-teal-700">Prix</span>
              <span className="text-gray-600"> (obligatoire) - Prix actuel en CAD</span>
            </div>
            <div>
              <span className="font-semibold text-blue-700">Catégorie, Marque, URL</span>
              <span className="text-gray-600"> (optionnels)</span>
            </div>
          </div>

          <div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-teal-900 mb-1">
                  Boostez la précision du matching IA de 40%
                </h4>
                <p className="text-sm text-teal-800">
                  Incluez une colonne "Description" pour améliorer la détection des produits concurrents.
                  Plus vos descriptions sont détaillées, meilleure sera la correspondance.
                </p>
                <div className="mt-2 text-xs text-teal-700">
                  <p className="font-medium">Quoi inclure :</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Caractéristiques techniques (dimensions, capacité, puissance)</li>
                    <li>Matériaux et composition</li>
                    <li>Certifications (EPA, ÉcoLogo, LEED, etc.)</li>
                    <li>Cas d&apos;usage et applications</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-sm text-gray-600">
            <Download className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <a
                href="/templates/catalogue-template.csv"
                download
                className="text-teal-600 hover:underline font-medium"
              >
                Télécharger template CSV
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 1: Sélectionner le fichier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-300 hover:border-teal-400'
              }`}
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Glisser-déposer ou cliquer pour sélectionner
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV ou Excel (.xlsx) - Max 10 MB
                  </p>
                </div>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUploadForPreview}
                  disabled={uploading}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      Analyser le fichier
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 & 3: Preview and Mapping */}
      {(step === 'preview' || step === 'mapping') && previewData && (
        <CataloguePreview
          previewData={previewData}
          columnMapping={columnMapping}
          onUpdateMapping={updateColumnMapping}
          onStartImport={handleStartImport}
          onCancel={handleReset}
          isValid={hasRequiredMappings()}
          isSubmitting={uploading}
        />
      )}

      {/* Step 4: Import Progress */}
      {step === 'importing' && importJobId && (
        <CatalogueImportProgress
          slug={slug}
          jobId={importJobId}
          onComplete={handleReset}
          onError={(err) => {
            setError(err);
            setStep('preview');
          }}
        />
      )}
    </div>
  );
}
