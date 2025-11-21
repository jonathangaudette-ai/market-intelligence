"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, AlertCircle, FileCheck, Loader2, X } from "lucide-react";

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

interface CataloguePreviewProps {
  previewData: PreviewData;
  columnMapping: ColumnMapping[];
  onUpdateMapping: (index: number, mappedTo: ColumnMapping['mappedTo']) => void;
  onStartImport: () => void;
  onCancel: () => void;
  isValid: boolean;
  isSubmitting: boolean;
}

const FIELD_OPTIONS = [
  { value: 'sku', label: 'SKU (Code produit)', required: true },
  { value: 'name', label: 'Nom du produit', required: true },
  { value: 'description', label: 'Description', required: false },
  { value: 'price', label: 'Prix', required: true },
  { value: 'category', label: 'Catégorie', required: false },
  { value: 'brand', label: 'Marque', required: false },
  { value: 'url', label: 'URL', required: false },
  { value: 'ignore', label: 'Ignorer cette colonne', required: false },
];

export function CataloguePreview({
  previewData,
  columnMapping,
  onUpdateMapping,
  onStartImport,
  onCancel,
  isValid,
  isSubmitting,
}: CataloguePreviewProps) {
  const mappedFields = new Set(columnMapping.map(c => c.mappedTo));
  const missingRequired = FIELD_OPTIONS
    .filter(opt => opt.required && !mappedFields.has(opt.value as any))
    .map(opt => opt.label);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-teal-600" />
            Étape 2: Preview et Mapping
          </CardTitle>
          <CardDescription>
            Fichier: <span className="font-medium">{previewData.filename}</span> • {previewData.rowCount} lignes détectées
          </CardDescription>

          {/* SKU Update Information */}
          {previewData.existingSkusCount > 0 && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Mode UPSERT activé</p>
                  <p className="mt-1 text-blue-700">
                    <span className="font-semibold">{previewData.existingSkusCount}</span> produit{previewData.existingSkusCount > 1 ? 's' : ''} existant{previewData.existingSkusCount > 1 ? 's' : ''} seront mis à jour
                    {previewData.newSkusCount > 0 && (
                      <> • <span className="font-semibold">{previewData.newSkusCount}</span> nouveau{previewData.newSkusCount > 1 ? 'x' : ''} produit{previewData.newSkusCount > 1 ? 's' : ''} seront ajoutés</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {missingRequired.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Champs obligatoires manquants
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Veuillez mapper les colonnes suivantes: {missingRequired.join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Mapping valide
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Tous les champs obligatoires sont mappés. Prêt pour l'import!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping Card */}
      <Card>
        <CardHeader>
          <CardTitle>Mapping des Colonnes</CardTitle>
          <CardDescription>
            Associez chaque colonne de votre fichier à un champ de la base de données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {columnMapping.map((col, index) => (
              <div
                key={col.detectedColumn}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
              >
                {/* Column name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {col.detectedColumn}
                    </p>
                    {col.confidence > 0.8 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Auto-détecté
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Ex: {col.sampleValues[0]}
                  </p>
                </div>

                {/* Mapping selector */}
                <div className="w-64">
                  <Select
                    value={col.mappedTo}
                    onValueChange={(value) => onUpdateMapping(index, value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                          {opt.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu des données (5 premières lignes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnMapping
                    .filter(col => col.mappedTo !== 'ignore')
                    .map((col) => (
                      <TableHead key={col.detectedColumn}>
                        <div className="space-y-1">
                          <div className="font-semibold">{col.detectedColumn}</div>
                          <Badge variant="secondary" className="text-xs">
                            {FIELD_OPTIONS.find(opt => opt.value === col.mappedTo)?.label}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.previewRows.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx}>
                    {columnMapping
                      .filter(col => col.mappedTo !== 'ignore')
                      .map((col) => (
                        <TableCell key={col.detectedColumn} className="text-sm">
                          {row[col.detectedColumn] || '-'}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Feedback sur les descriptions */}
      {columnMapping.find(col => col.mappedTo === 'description') ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-900">
            <p className="font-medium">Excellent ! Descriptions détectées</p>
            <p className="text-green-700">
              Vos produits bénéficieront d&apos;un matching IA plus précis grâce aux descriptions.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Colonne &quot;Description&quot; non détectée</p>
            <p className="text-amber-700">
              Pour améliorer la précision du matching IA, incluez une colonne &quot;Description&quot; avec les détails produits.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-2" />
          Annuler
        </Button>
        <Button
          onClick={onStartImport}
          disabled={!isValid || isSubmitting}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Démarrage...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Importer {previewData.rowCount} produits
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
