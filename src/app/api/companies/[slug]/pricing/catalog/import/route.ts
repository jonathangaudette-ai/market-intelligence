import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts, pricingCatalogImports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ImportParams {
  params: Promise<{ slug: string }>;
}

interface ImportRequest {
  fileId: string;
  columnMapping: Record<string, string>;
}

interface LogEvent {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest, { params }: ImportParams) {
  try {
    const { slug } = await params;
    const [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const body: ImportRequest = await request.json();
    const { fileId, columnMapping } = body;
    if (!fileId || !columnMapping) {
      return NextResponse.json({ error: "Missing fileId or columnMapping" }, { status: 400 });
    }

    const requiredFields = ['sku', 'name', 'price'];
    const mappedFields = Object.values(columnMapping);
    const missingFields = requiredFields.filter(f => !mappedFields.includes(f));
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Missing required field mappings: ${missingFields.join(', ')}` }, { status: 400 });
    }

    // Fetch the draft job created during preview
    const [draftJob] = await db.select().from(pricingCatalogImports).where(eq(pricingCatalogImports.id, fileId)).limit(1);
    if (!draftJob) {
      return NextResponse.json({ error: "Draft job not found" }, { status: 404 });
    }
    if (draftJob.status !== 'draft') {
      return NextResponse.json({ error: "Job already started or completed" }, { status: 400 });
    }
    if (!draftJob.rawData || draftJob.rawData.length === 0) {
      return NextResponse.json({ error: "No data found in draft job" }, { status: 400 });
    }

    // Update draft job to pending status
    await db.update(pricingCatalogImports).set({
      status: 'pending',
      currentStep: 'initializing',
      progressCurrent: 0,
      progressTotal: 0,
      productsImported: 0,
      productsFailed: 0,
      logs: [{ timestamp: new Date().toISOString(), type: 'info', message: 'Job créé, démarrage imminent...' }],
      updatedAt: new Date(),
    }).where(eq(pricingCatalogImports.id, fileId));

    processImportJob(company.id, fileId, columnMapping).catch((err) => console.error("Background job error:", err));
    return NextResponse.json({ jobId: fileId, status: 'pending', message: 'Import job started' });
  } catch (error) {
    console.error("Error starting import job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processImportJob(companyId: string, jobId: string, columnMapping: Record<string, string>) {
  async function addLog(log: LogEvent) {
    const [job] = await db.select().from(pricingCatalogImports).where(eq(pricingCatalogImports.id, jobId)).limit(1);
    if (job) await db.update(pricingCatalogImports).set({ logs: [...(job.logs || []), log], updatedAt: new Date() }).where(eq(pricingCatalogImports.id, jobId));
  }
  async function updateStatus(updates: any) {
    await db.update(pricingCatalogImports).set({ ...updates, updatedAt: new Date() }).where(eq(pricingCatalogImports.id, jobId));
  }

  try {
    await updateStatus({ status: 'running', currentStep: 'validating', startedAt: new Date() });
    await addLog({ timestamp: new Date().toISOString(), type: 'info', message: 'Démarrage du job d\'import...' });

    // Read rawData from the job (already parsed during preview)
    const [job] = await db.select().from(pricingCatalogImports).where(eq(pricingCatalogImports.id, jobId)).limit(1);
    if (!job) throw new Error('Job not found');
    if (!job.rawData || job.rawData.length === 0) throw new Error('No data found in job');

    const rawData: Record<string, any>[] = job.rawData;

    await updateStatus({ currentStep: 'importing', progressTotal: rawData.length });
    await addLog({ timestamp: new Date().toISOString(), type: 'info', message: `${rawData.length} lignes détectées, démarrage de l'import...` });

    const reverseMapping: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([col, field]) => { reverseMapping[field] = col; });

    let imported = 0, failed = 0;
    const batchSize = 50, errors: string[] = [];

    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, Math.min(i + batchSize, rawData.length));
      const productsToInsert = [];

      for (const row of batch) {
        try {
          const sku = String(row[reverseMapping['sku']] || '').trim();
          const name = String(row[reverseMapping['name']] || '').trim();
          const price = parseFloat(String(row[reverseMapping['price']] || '').replace(/[^0-9.]/g, ''));

          if (!sku || !name || isNaN(price)) {
            failed++;
            errors.push(`Ligne ${i + batch.indexOf(row) + 2}: données invalides`);
            continue;
          }

          productsToInsert.push({
            id: createId(), companyId, sku, name,
            nameCleaned: name.toLowerCase().trim(),
            brand: reverseMapping['brand'] ? String(row[reverseMapping['brand']] || '').trim() : null,
            category: reverseMapping['category'] ? String(row[reverseMapping['category']] || '').trim() : null,
            currentPrice: price.toString(), cost: null, currency: 'CAD', unit: null,
            characteristics: null, imageUrl: null,
            productUrl: reverseMapping['url'] ? String(row[reverseMapping['url']] || '').trim() : null,
            notes: null, isActive: true,
            createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          });
        } catch (error) {
          failed++;
          errors.push(`Ligne ${i + batch.indexOf(row) + 2}: ${error}`);
        }
      }

      if (productsToInsert.length > 0) {
        try {
          await db.insert(pricingProducts).values(productsToInsert);
          imported += productsToInsert.length;
        } catch (error: any) {
          failed += productsToInsert.length;
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        }
      }

      await updateStatus({ progressCurrent: Math.min(i + batchSize, rawData.length), productsImported: imported, productsFailed: failed });
      await addLog({ timestamp: new Date().toISOString(), type: 'progress', message: `Importés: ${imported}/${rawData.length} produits` });
    }

    await updateStatus({ status: 'completed', currentStep: 'finalizing', progressCurrent: rawData.length, productsImported: imported, productsFailed: failed, completedAt: new Date() });
    await addLog({ timestamp: new Date().toISOString(), type: 'success', message: `Import terminé! ${imported} produits importés, ${failed} échecs.`, metadata: { errors: errors.slice(0, 10) } });
  } catch (error: any) {
    console.error("Job processing error:", error);
    await updateStatus({ status: 'failed', errorMessage: error.message, completedAt: new Date() });
    await addLog({ timestamp: new Date().toISOString(), type: 'error', message: `Erreur fatale: ${error.message}` });
  }
}
