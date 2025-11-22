#!/usr/bin/env node
/**
 * Import Dissan products + A1 competitor matches from Excel
 *
 * This script reads the analysis Excel file and:
 * 1. Creates/updates Dissan products (bulk upsert)
 * 2. Creates competitor matches for A1 (bulk insert)
 *
 * Usage: node scripts/import-dissan-a1-matches.mjs
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import XLSX from 'xlsx';
import { createId } from '@paralleldrive/cuid2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const EXCEL_FILE = join(__dirname, '..', 'Dissan', 'analyse-comparative-a1.xlsx');
const PRODUCTS_FILE = join(__dirname, '..', 'Dissan', 'produits-commerciaux.xlsx');
const COMPANY_SLUG = 'dissan';

async function main() {
  console.log('🚀 Import Dissan Products + A1 Matches\n');
  console.log('='.repeat(60));

  const sql = postgres(process.env.DATABASE_URL);

  try {
    // 1. Read Excel files
    console.log('\n📄 Reading Excel files...');

    // Read product descriptions from produits-commerciaux.xlsx
    console.log('   Loading product descriptions...');
    const productsWorkbook = XLSX.readFile(PRODUCTS_FILE);
    const productsSheet = productsWorkbook.Sheets['Produits Commerciaux'];
    const productsData = XLSX.utils.sheet_to_json(productsSheet, { header: 1 });

    // Build SKU -> description map (columns: SKU Nettoyé=1, Description=6, Catégorie=5)
    const descriptionMap = new Map();
    const categoryMap = new Map();
    for (const row of productsData.slice(1)) {
      const sku = row[1]?.trim(); // SKU Nettoyé
      const description = row[6]?.trim(); // Description
      const category = row[5]?.trim(); // Catégorie
      if (sku) {
        if (description) descriptionMap.set(sku, description);
        if (category) categoryMap.set(sku, category);
      }
    }
    console.log(`   Found ${descriptionMap.size} product descriptions`);

    // Read comparison file
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheet = workbook.Sheets['Comparaison A1'];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header row
    const dataRows = rawData.slice(1).filter(row => row[1]); // Must have SKU
    console.log(`   Found ${dataRows.length} comparison rows`);

    // 2. Get company ID
    console.log('\n🏢 Fetching company ID...');
    const [company] = await sql`
      SELECT id FROM companies WHERE slug = ${COMPANY_SLUG}
    `;
    if (!company) {
      throw new Error(`Company '${COMPANY_SLUG}' not found`);
    }
    console.log(`   Company ID: ${company.id}`);

    // 3. Get or create A1 competitor
    console.log('\n🎯 Fetching A1 competitor...');
    let [competitor] = await sql`
      SELECT id, name FROM pricing_competitors
      WHERE company_slug = ${COMPANY_SLUG} AND name ILIKE '%a1%'
    `;

    if (!competitor) {
      console.log('   Creating A1 competitor...');
      const competitorId = createId();
      [competitor] = await sql`
        INSERT INTO pricing_competitors (id, company_id, company_slug, name, website_url, scraper_config, is_active)
        VALUES (
          ${competitorId},
          ${company.id},
          ${COMPANY_SLUG},
          'A1 Cash and Carry',
          'https://www.a1cashandcarry.com',
          ${JSON.stringify({ scraperType: 'scrapingbee' })},
          true
        )
        RETURNING id, name
      `;
    }
    console.log(`   Competitor: ${competitor.name} (${competitor.id})`);

    // 4. Parse unique products from Excel
    console.log('\n📦 Parsing products...');
    const productsMap = new Map();
    const matchesList = [];

    for (const row of dataRows) {
      const dissanName = row[0]?.trim();
      const dissanSkuRaw = row[1]?.trim();
      const dissanBrand = row[2]?.trim() || null;
      const a1Name = row[3]?.trim();
      const a1PriceRaw = row[4];
      const a1Sku = row[5]?.trim();
      const score = parseFloat(row[6]) || 0;
      const matchType = row[7]?.trim() || 'ai';
      const reason = row[8]?.trim();
      const a1Url = row[9]?.trim();
      const dissanUrl = row[10]?.trim();

      if (!dissanSkuRaw || !a1Name) continue;

      // Clean SKU (remove "SKU  " prefix)
      const dissanSku = dissanSkuRaw.replace(/^SKU\s+/, '').trim();

      // Parse price (remove $ and convert)
      let a1Price = 0;
      if (typeof a1PriceRaw === 'string') {
        a1Price = parseFloat(a1PriceRaw.replace(/[$,]/g, '')) || 0;
      } else if (typeof a1PriceRaw === 'number') {
        a1Price = a1PriceRaw;
      }

      // Store unique product (with description and category from produits-commerciaux)
      // Try multiple SKU formats to find description (with/without M- prefix)
      if (!productsMap.has(dissanSku)) {
        let description = descriptionMap.get(dissanSku);
        let category = categoryMap.get(dissanSku);

        // Try without M- prefix if not found
        if (!description && dissanSku.startsWith('M-')) {
          const skuWithoutPrefix = dissanSku.substring(2);
          description = descriptionMap.get(skuWithoutPrefix);
          category = category || categoryMap.get(skuWithoutPrefix);
        }

        productsMap.set(dissanSku, {
          sku: dissanSku,
          name: dissanName,
          brand: dissanBrand,
          productUrl: dissanUrl,
          description: description || null,
          category: category || null
        });
      }

      // Store match
      matchesList.push({
        dissanSku,
        competitorProductName: a1Name,
        competitorProductUrl: a1Url,
        competitorSku: a1Sku,
        price: a1Price,
        confidenceScore: Math.min(score, 1.0),
        matchType: score >= 0.9 ? 'ai' : (score >= 0.7 ? 'name' : 'characteristic'),
        matchDetails: { reason, originalScore: score }
      });
    }

    const products = Array.from(productsMap.values());
    console.log(`   Unique products: ${products.length}`);
    console.log(`   Total matches: ${matchesList.length}`);

    // 5. Bulk upsert products
    console.log('\n💾 Inserting/updating products...');
    let productsCreated = 0;
    let productsUpdated = 0;

    for (const product of products) {
      const nameCleaned = product.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const result = await sql`
        INSERT INTO pricing_products (
          id, company_id, sku, name, name_cleaned, brand, category, description, product_url, is_active, created_at, updated_at
        ) VALUES (
          ${createId()},
          ${company.id},
          ${product.sku},
          ${product.name},
          ${nameCleaned},
          ${product.brand},
          ${product.category},
          ${product.description},
          ${product.productUrl},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (company_id, sku)
        DO UPDATE SET
          name = EXCLUDED.name,
          name_cleaned = EXCLUDED.name_cleaned,
          brand = COALESCE(EXCLUDED.brand, pricing_products.brand),
          category = COALESCE(EXCLUDED.category, pricing_products.category),
          description = COALESCE(EXCLUDED.description, pricing_products.description),
          product_url = COALESCE(EXCLUDED.product_url, pricing_products.product_url),
          updated_at = NOW()
        RETURNING id, (xmax = 0) as is_new
      `;

      if (result[0]?.is_new) {
        productsCreated++;
      } else {
        productsUpdated++;
      }
    }

    console.log(`   Created: ${productsCreated}`);
    console.log(`   Updated: ${productsUpdated}`);

    // 6. Get product IDs mapping
    console.log('\n🔗 Mapping product IDs...');
    const productIds = await sql`
      SELECT id, sku FROM pricing_products
      WHERE company_id = ${company.id}
    `;
    const skuToId = new Map(productIds.map(p => [p.sku, p.id]));

    // 7. Remove existing A1 matches (to avoid duplicates)
    console.log('\n🗑️  Removing existing A1 matches...');
    const deleted = await sql`
      DELETE FROM pricing_matches
      WHERE competitor_id = ${competitor.id}
      RETURNING id
    `;
    console.log(`   Removed: ${deleted.length} existing matches`);

    // 8. Bulk insert matches
    console.log('\n📊 Inserting matches...');
    let matchesCreated = 0;
    let matchesSkipped = 0;

    // Deduplicate matches (same product + same competitor URL)
    const uniqueMatches = new Map();
    for (const match of matchesList) {
      const productId = skuToId.get(match.dissanSku);
      if (!productId) {
        matchesSkipped++;
        continue;
      }

      const key = `${productId}-${match.competitorProductUrl}`;
      // Keep match with highest confidence score
      if (!uniqueMatches.has(key) || uniqueMatches.get(key).confidenceScore < match.confidenceScore) {
        uniqueMatches.set(key, { ...match, productId });
      }
    }

    console.log(`   Unique matches to insert: ${uniqueMatches.size}`);

    // Insert in batches of 50
    const matchesArray = Array.from(uniqueMatches.values());
    const batchSize = 50;

    for (let i = 0; i < matchesArray.length; i += batchSize) {
      const batch = matchesArray.slice(i, i + batchSize);

      for (const match of batch) {
        await sql`
          INSERT INTO pricing_matches (
            id, product_id, competitor_id,
            competitor_product_name, competitor_product_url, competitor_sku,
            price, currency, match_type, match_source, confidence_score, match_details,
            in_stock, last_scraped_at, created_at, updated_at
          ) VALUES (
            ${createId()},
            ${match.productId},
            ${competitor.id},
            ${match.competitorProductName},
            ${match.competitorProductUrl},
            ${match.competitorSku},
            ${match.price},
            'CAD',
            ${match.matchType},
            'excel-import',
            ${match.confidenceScore},
            ${JSON.stringify(match.matchDetails)},
            true,
            NOW(),
            NOW(),
            NOW()
          )
        `;
        matchesCreated++;
      }

      process.stdout.write(`   Progress: ${Math.min(i + batchSize, matchesArray.length)}/${matchesArray.length}\r`);
    }

    console.log(`\n   Matches created: ${matchesCreated}`);
    console.log(`   Matches skipped (no product): ${matchesSkipped}`);

    // 9. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Import Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Products created: ${productsCreated}`);
    console.log(`   Products updated: ${productsUpdated}`);
    console.log(`   A1 matches created: ${matchesCreated}`);
    console.log('\n🔗 View results at:');
    console.log('   https://market-intelligence-kappa.vercel.app/companies/dissan/pricing');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
