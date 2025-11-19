import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingCatalogImports } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PreviewParams {
  params: Promise<{
    slug: string;
  }>;
}

interface ColumnMapping {
  detectedColumn: string;
  mappedTo: 'sku' | 'name' | 'price' | 'category' | 'brand' | 'url' | 'ignore';
  confidence: number;
  sampleValues: string[];
}

/**
 * POST /api/companies/[slug]/pricing/catalog/preview
 * Upload file and return preview with auto-detected columns
 */
export async function POST(
  request: NextRequest,
  { params }: PreviewParams
) {
  try {
    const { slug } = await params;

    // 1. Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // 4. Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();

    let rawData: Record<string, string>[] = [];

    // 5. Parse CSV or Excel
    if (filename.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (parsed.errors.length > 0) {
        console.error("CSV parsing errors:", parsed.errors);
      }

      rawData = parsed.data;
    } else if (filename.endsWith(".xlsx")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        raw: false,
        defval: "",
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Use .csv or .xlsx" },
        { status: 400 }
      );
    }

    if (rawData.length === 0) {
      return NextResponse.json(
        { error: "File is empty or could not be parsed" },
        { status: 400 }
      );
    }

    // 6. Detect columns and auto-map
    const columns = Object.keys(rawData[0]);
    const columnMappings: ColumnMapping[] = columns.map((col) => {
      const mapping = detectColumnMapping(col, rawData);
      return mapping;
    });

    // 7. Create a draft job with raw data in database (no Vercel Blob needed!)
    const draftJobId = createId();
    await db.insert(pricingCatalogImports).values({
      id: draftJobId,
      companyId: company.id,
      filename: file.name,
      fileSize: buffer.byteLength,
      status: 'draft', // Will be set to 'pending' when import starts
      rawData: rawData, // Store parsed data directly in DB
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. Return preview with draft job ID
    return NextResponse.json({
      fileId: draftJobId, // Keeping same name for backwards compatibility
      filename: file.name,
      rowCount: rawData.length,
      columns: columnMappings,
      previewRows: rawData.slice(0, 10), // First 10 rows for preview
    });
  } catch (error) {
    console.error("Error processing catalog preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Auto-detect column mapping based on column name and sample values
 */
function detectColumnMapping(
  columnName: string,
  data: Record<string, string>[]
): ColumnMapping {
  const col = columnName.toLowerCase().trim();
  const sampleValues = data.slice(0, 3).map((row) => String(row[columnName] || "").trim());

  // Pattern matching for common column names
  const patterns: Record<string, { patterns: string[]; confidence: number }> = {
    sku: { patterns: ["sku", "code", "ref", "référence", "product_code", "item_code"], confidence: 0.9 },
    name: { patterns: ["nom", "name", "titre", "title", "description", "produit", "product", "désignation"], confidence: 0.85 },
    price: { patterns: ["prix", "price", "cost", "coût", "tarif", "montant"], confidence: 0.9 },
    category: { patterns: ["catégorie", "category", "cat", "type", "famille"], confidence: 0.8 },
    brand: { patterns: ["marque", "brand", "fabricant", "manufacturer"], confidence: 0.8 },
    url: { patterns: ["url", "link", "lien", "web", "site"], confidence: 0.85 },
  };

  // Check patterns
  for (const [field, config] of Object.entries(patterns)) {
    if (config.patterns.some((p) => col.includes(p))) {
      return {
        detectedColumn: columnName,
        mappedTo: field as any,
        confidence: config.confidence,
        sampleValues,
      };
    }
  }

  // Check if values look like prices (numbers with decimals)
  const isPriceColumn = sampleValues.every((val) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    return !isNaN(num) && num > 0;
  });

  if (isPriceColumn) {
    return {
      detectedColumn: columnName,
      mappedTo: "price",
      confidence: 0.7,
      sampleValues,
    };
  }

  // Default: ignore unknown columns
  return {
    detectedColumn: columnName,
    mappedTo: "ignore",
    confidence: 0.3,
    sampleValues,
  };
}
