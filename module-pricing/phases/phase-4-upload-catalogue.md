# Phase 4: Upload Catalogue CSV/Excel

**Durée estimée:** 4-5 heures
**Complexité:** ⭐⭐⭐ Complexe
**Pré-requis:** Phase 0, 1, 2, 3 complétées

---

## Objectif

Permettre à l'utilisateur d'uploader son catalogue de produits via fichier CSV ou Excel (.xlsx), parser le fichier, valider les données, et insérer en batch dans la table `pricing_products`.

---

## Tâches

### Tâche 1: Installer Dépendances de Parsing

```bash
npm install xlsx papaparse
npm install --save-dev @types/papaparse
```

**Validation:**
```bash
grep -E "xlsx|papaparse" package.json
```

---

### Tâche 2: Créer Page Upload Catalogue

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/catalog/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";

export default function CatalogUploadPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/companies/${slug}/pricing/products/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult({
        success: true,
        inserted: data.inserted,
        errors: data.errors || [],
      });
      setFile(null);
    } catch (error: any) {
      setResult({
        success: false,
        inserted: 0,
        errors: [error.message],
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Catalogue" },
        ]}
        title="Import Catalogue Produits"
        description="Uploader votre catalogue au format CSV ou Excel (.xlsx)"
      />

      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-teal-600" />
              Format Attendu
            </CardTitle>
            <CardDescription>
              Le fichier doit contenir les colonnes suivantes (ordre libre)
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
                <span className="text-gray-600"> (obligatoire) - Description produit</span>
              </div>
              <div>
                <span className="font-semibold text-teal-700">Prix</span>
                <span className="text-gray-600"> (obligatoire) - Prix actuel en CAD</span>
              </div>
              <div>
                <span className="font-semibold text-blue-700">Catégorie</span>
                <span className="text-gray-600"> (optionnel) - Ex: "Brosses"</span>
              </div>
              <div>
                <span className="font-semibold text-blue-700">Marque</span>
                <span className="text-gray-600"> (optionnel) - Ex: "Atlas Graham"</span>
              </div>
              <div>
                <span className="font-semibold text-blue-700">URL</span>
                <span className="text-gray-600"> (optionnel) - Lien fiche produit</span>
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

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner Fichier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
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
                    Cliquer pour sélectionner un fichier
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
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card className={result.success ? "border-green-200" : "border-red-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-900">Import Réussi</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-900">Erreur d'Import</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.success && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">{result.inserted} produits</span> importés
                    avec succès dans votre catalogue.
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-red-900">Erreurs:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

---

### Tâche 3: Route API Upload

**Fichier:** `src/app/api/companies/[slug]/pricing/products/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingProducts } from "@/db/schema-pricing";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";

interface UploadParams {
  params: {
    slug: string;
  };
}

interface ProductRow {
  sku: string;
  nom: string;
  prix: number;
  categorie?: string;
  marque?: string;
  url?: string;
}

export async function POST(
  request: NextRequest,
  { params }: UploadParams
) {
  try {
    const { slug } = params;

    // 1. Get company
    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();

    let rows: ProductRow[] = [];

    // 4. Parse CSV or Excel
    if (filename.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse<any>(text, {
        header: true,
        skipEmptyLines: true,
      });

      rows = parsed.data.map((row) => normalizeRow(row));
    } else if (filename.endsWith(".xlsx")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any>(sheet);

      rows = data.map((row) => normalizeRow(row));
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Use .csv or .xlsx" },
        { status: 400 }
      );
    }

    // 5. Validate rows
    const errors: string[] = [];
    const validRows: ProductRow[] = [];

    rows.forEach((row, index) => {
      const lineNum = index + 2; // +2 for header + 1-indexed

      if (!row.sku) {
        errors.push(`Ligne ${lineNum}: SKU manquant`);
        return;
      }
      if (!row.nom) {
        errors.push(`Ligne ${lineNum}: Nom manquant`);
        return;
      }
      if (!row.prix || isNaN(row.prix)) {
        errors.push(`Ligne ${lineNum}: Prix invalide`);
        return;
      }

      validRows.push(row);
    });

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found", errors },
        { status: 400 }
      );
    }

    // 6. Insert into database (batch)
    const productsToInsert = validRows.map((row) => ({
      id: createId(),
      companyId: company.id,
      sku: row.sku,
      name: row.nom,
      currentPrice: row.prix,
      currency: "CAD",
      category: row.categorie || null,
      brand: row.marque || null,
      productUrl: row.url || null,
      status: "active" as const,
      characteristics: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(pricingProducts).values(productsToInsert);

    return NextResponse.json({
      success: true,
      inserted: productsToInsert.length,
      errors,
    });
  } catch (error) {
    console.error("Error uploading catalog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Normalize column names (case-insensitive, flexible)
 */
function normalizeRow(raw: any): ProductRow {
  const keys = Object.keys(raw);

  const findKey = (patterns: string[]) => {
    return keys.find((k) =>
      patterns.some((p) => k.toLowerCase().includes(p.toLowerCase()))
    );
  };

  const skuKey = findKey(["sku", "code", "ref"]);
  const nameKey = findKey(["nom", "name", "description", "produit"]);
  const priceKey = findKey(["prix", "price", "cost"]);
  const categoryKey = findKey(["categorie", "category", "cat"]);
  const brandKey = findKey(["marque", "brand"]);
  const urlKey = findKey(["url", "link", "lien"]);

  return {
    sku: skuKey ? String(raw[skuKey]).trim() : "",
    nom: nameKey ? String(raw[nameKey]).trim() : "",
    prix: priceKey ? parseFloat(String(raw[priceKey]).replace(/[^0-9.]/g, "")) : 0,
    categorie: categoryKey ? String(raw[categoryKey]).trim() : undefined,
    marque: brandKey ? String(raw[brandKey]).trim() : undefined,
    url: urlKey ? String(raw[urlKey]).trim() : undefined,
  };
}
```

---

### Tâche 4: Créer Template CSV

**Fichier:** `public/templates/catalogue-template.csv`

```csv
SKU,Nom,Prix,Categorie,Marque,URL
ATL-2024,Brosse à cuvette polypropylene,4.99,Brosses,Atlas Graham,https://exemple.com/atl-2024
ATL-3001,Balai industriel 24 pouces,12.50,Balais,Atlas Graham,https://exemple.com/atl-3001
SWISH-4000,Vadrouille microfibre,8.75,Vadrouilles,Swish,https://exemple.com/swish-4000
```

---

## Checklist de Validation

**Avant de marquer Phase 4 complète:**

- [ ] Dépendances installées: `xlsx`, `papaparse`
- [ ] Page upload créée: `/companies/[slug]/pricing/catalog`
- [ ] Route API upload créée: `POST /api/companies/[slug]/pricing/products/upload`
- [ ] Template CSV créé: `public/templates/catalogue-template.csv`
- [ ] Upload CSV fonctionne (test avec template)
- [ ] Upload Excel (.xlsx) fonctionne
- [ ] Validation des colonnes obligatoires (SKU, Nom, Prix)
- [ ] Normalisation des noms de colonnes (insensible à la casse)
- [ ] Affichage des erreurs de validation
- [ ] Affichage du succès avec nombre de produits importés
- [ ] Pas de doublons SKU (optionnel: ajouter contrainte unique)

---

## Commandes de Test

```bash
# 1. Compiler TypeScript
npx tsc --noEmit

# 2. Tester upload avec curl
curl -X POST \
  -F "file=@public/templates/catalogue-template.csv" \
  http://localhost:3000/api/companies/dissan/pricing/products/upload

# 3. Vérifier insertion en DB
psql $DATABASE_URL -c "SELECT COUNT(*), AVG(current_price) FROM pricing_products;"

# 4. Test avec fichier invalide (doit retourner erreurs)
echo "invalid,data" > /tmp/invalid.csv
curl -X POST \
  -F "file=@/tmp/invalid.csv" \
  http://localhost:3000/api/companies/dissan/pricing/products/upload

# 5. Ouvrir page upload dans browser
open http://localhost:3000/companies/dissan/pricing/catalog
```

---

## Résultat Attendu

À la fin de Phase 4:

✅ **Page upload catalogue** fonctionnelle
✅ **Support CSV et Excel** (.xlsx)
✅ **Validation robuste** avec messages d'erreur clairs
✅ **Batch insert** de centaines de produits
✅ **Template téléchargeable** pour faciliter format
✅ **UI conforme** design system (pas d'emojis, lucide icons, teal colors)

---

## Handoff JSON pour Phase 5

```json
{
  "phase": 4,
  "name": "Upload Catalogue CSV/Excel",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "4.5h",
  "filesCreated": [
    "src/app/(dashboard)/companies/[slug]/pricing/catalog/page.tsx",
    "src/app/api/companies/[slug]/pricing/products/upload/route.ts",
    "public/templates/catalogue-template.csv"
  ],
  "dependenciesAdded": ["xlsx", "papaparse"],
  "featuresImplemented": [
    "CSV upload",
    "Excel (.xlsx) upload",
    "Column normalization (case-insensitive)",
    "Validation with error messages",
    "Batch insert to PostgreSQL",
    "Template download"
  ],
  "testResults": {
    "csvUpload": "✅ Pass - 3 products inserted",
    "xlsxUpload": "✅ Pass - 3 products inserted",
    "invalidFile": "✅ Pass - Errors displayed",
    "missingColumns": "✅ Pass - Validation caught"
  },
  "nextPhaseReady": true,
  "notes": "Catalogue upload fonctionnel. Utilisateur peut maintenant importer 100-500 produits. Prêt pour config concurrents (Phase 5)."
}
```

---

**Prochaine étape:** Phase 5 - Configuration Concurrents
