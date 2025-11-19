import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { put, del } from "@vercel/blob";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large files

interface ImportParams {
  params: Promise<{
    slug: string;
  }>;
}

interface ImportRequest {
  fileId: string;
  columnMapping: Record<string, string>; // detectedColumn -> field
}

interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string;
  progressCurrent: number;
  progressTotal: number;
  productsImported: number;
  productsFailed: number;
  error?: string;
  logs: Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    message: string;
    metadata?: Record<string, any>;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/companies/[slug]/pricing/catalog/import
 * Start async import job
 */
export async function POST(
  request: NextRequest,
  { params }: ImportParams
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

    // 2. Parse request body
    const body: ImportRequest = await request.json();
    const { fileId, columnMapping } = body;

    if (!fileId || !columnMapping) {
      return NextResponse.json(
        { error: "Missing fileId or columnMapping" },
        { status: 400 }
      );
    }

    // 3. Validate required fields
    const requiredFields = ['sku', 'name', 'price'];
    const mappedFields = Object.values(columnMapping);
    const missingFields = requiredFields.filter(f => !mappedFields.includes(f));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required field mappings: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // 4. Create job
    const jobId = createId();
    const initialStatus: JobStatus = {
      jobId,
      status: 'pending',
      currentStep: 'initializing',
      progressCurrent: 0,
      progressTotal: 0,
      productsImported: 0,
      productsFailed: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Job créé, démarrage imminent...',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store job status in Vercel Blob
    await put(
      `catalog-jobs/${company.id}/${jobId}/status.json`,
      JSON.stringify(initialStatus),
      {
        access: "public",
        addRandomSuffix: false,
      }
    );

    // 5. Start async processing (non-blocking)
    // We'll process in the background and update status
    processImportJob(company.id, jobId, fileId, columnMapping).catch((error) => {
      console.error("Background job error:", error);
    });

    // 6. Return job ID immediately
    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Import job started',
    });
  } catch (error) {
    console.error("Error starting import job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Background job processor (async, non-blocking)
 */
async function processImportJob(
  companyId: string,
  jobId: string,
  fileId: string,
  columnMapping: Record<string, string>
) {
  const statusPath = `catalog-jobs/${companyId}/${jobId}/status.json`;

  async function updateStatus(updates: Partial<JobStatus>) {
    try {
      // Fetch current status
      const response = await fetch(`https://blob.vercel-storage.com/${statusPath}`);
      const currentStatus: JobStatus = await response.json();

      // Merge updates
      const newStatus: JobStatus = {
        ...currentStatus,
        ...updates,
        updatedAt: new Date().toISOString(),
        logs: [...(currentStatus.logs || []), ...(updates.logs || [])],
      };

      // Save back to blob
      await put(statusPath, JSON.stringify(newStatus), {
        access: "public",
        addRandomSuffix: false,
        contentType: 'application/json',
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  try {
    // Step 1: Update to running
    await updateStatus({
      status: 'running',
      currentStep: 'validating',
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: 'Démarrage du job d\'import...',
        },
      ],
    });

    // Step 2: Fetch and parse file from blob
    const fileUrl = `https://blob.vercel-storage.com/catalog-uploads/${companyId}/${fileId}.json`;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      throw new Error('Failed to fetch uploaded file');
    }

    const buffer = await fileResponse.arrayBuffer();

    // Detect file type and parse
    let rawData: Record<string, any>[] = [];

    // Try parsing as CSV first
    try {
      const text = Buffer.from(buffer).toString('utf-8');
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      rawData = parsed.data;
    } catch {
      // Try Excel
      const workbook = XLSX.read(Buffer.from(buffer), { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
    }

    if (rawData.length === 0) {
      throw new Error('No data found in file');
    }

    await updateStatus({
      currentStep: 'importing',
      progressTotal: rawData.length,
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `${rawData.length} lignes détectées, démarrage de l'import...`,
        },
      ],
    });

    // Step 3: Transform and insert products
    const reverseMapping: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([col, field]) => {
      reverseMapping[field] = col;
    });

    let imported = 0;
    let failed = 0;
    const batchSize = 50;
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, Math.min(i + batchSize, rawData.length));
      const productsToInsert = [];

      for (const row of batch) {
        try {
          const sku = String(row[reverseMapping['sku']] || '').trim();
          const name = String(row[reverseMapping['name']] || '').trim();
          const priceStr = String(row[reverseMapping['price']] || '').trim();
          const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

          if (!sku || !name || isNaN(price)) {
            failed++;
            errors.push(`Ligne ${i + batch.indexOf(row) + 2}: données invalides`);
            continue;
          }

          productsToInsert.push({
            id: createId(),
            companyId,
            sku,
            name,
            nameCleaned: name.toLowerCase().trim(),
            brand: reverseMapping['brand'] ? String(row[reverseMapping['brand']] || '').trim() : null,
            category: reverseMapping['category'] ? String(row[reverseMapping['category']] || '').trim() : null,
            currentPrice: price.toString(),
            cost: null,
            currency: 'CAD',
            unit: null,
            characteristics: null,
            imageUrl: null,
            productUrl: reverseMapping['url'] ? String(row[reverseMapping['url']] || '').trim() : null,
            notes: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          });
        } catch (error) {
          failed++;
          errors.push(`Ligne ${i + batch.indexOf(row) + 2}: ${error}`);
        }
      }

      // Insert batch
      if (productsToInsert.length > 0) {
        try {
          await db.insert(pricingProducts).values(productsToInsert);
          imported += productsToInsert.length;
        } catch (error: any) {
          failed += productsToInsert.length;
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        }
      }

      // Update progress
      await updateStatus({
        progressCurrent: Math.min(i + batchSize, rawData.length),
        productsImported: imported,
        productsFailed: failed,
        logs: [
          {
            timestamp: new Date().toISOString(),
            type: 'progress',
            message: `Importés: ${imported}/${rawData.length} produits`,
          },
        ],
      });
    }

    // Step 4: Finalize
    await updateStatus({
      status: 'completed',
      currentStep: 'finalizing',
      progressCurrent: rawData.length,
      productsImported: imported,
      productsFailed: failed,
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: 'success',
          message: `Import terminé! ${imported} produits importés, ${failed} échecs.`,
          metadata: { errors: errors.slice(0, 10) }, // First 10 errors
        },
      ],
    });

    // Cleanup: delete uploaded file
    await del(`catalog-uploads/${companyId}/${fileId}.json`);
  } catch (error: any) {
    console.error("Job processing error:", error);
    await updateStatus({
      status: 'failed',
      error: error.message,
      logs: [
        {
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `Erreur fatale: ${error.message}`,
        },
      ],
    });
  }
}
