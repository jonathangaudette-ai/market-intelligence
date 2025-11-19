/**
 * Script de consolidation - Merge all competitor results and generate Excel
 */

import fs from 'fs';
import path from 'path';
import type {
  ConsolidatedProduct,
  CompetitorPrice,
  CompetitorScrapingResults,
  Product,
} from '../price-scraper/src/types';
import { ExcelExporter } from '../price-scraper/src/exporters/excel-exporter';
import { loadProducts } from '../price-scraper/src/utils/product-loader';

const RESULTS_DIR = path.join(__dirname, '../results/prix-par-site');
const OUTPUT_FILE = path.join(__dirname, '../prix-competiteurs-final.xlsx');

async function consolidatePrices() {
  console.log('🔄 Starting price consolidation...\n');

  // Load all products
  console.log('📦 Loading products...');
  const products = await loadProducts();
  console.log(`✅ Loaded ${products.length} products\n`);

  // Load all competitor results
  console.log('📂 Loading competitor results...');
  const competitorResults = await loadCompetitorResults();
  console.log(`✅ Loaded results from ${competitorResults.length} competitors\n`);

  // Consolidate data
  console.log('🔀 Consolidating prices by product...');
  const consolidated = consolidateByProduct(products, competitorResults);
  console.log(`✅ Consolidated ${consolidated.length} products\n`);

  // Generate statistics
  console.log('📊 Generating statistics...');
  const stats = generateStatistics(consolidated, competitorResults);
  displayStatistics(stats);

  // Export to Excel
  console.log('\n💾 Exporting to Excel...');
  const exporter = new ExcelExporter();
  await exporter.exportConsolidated(consolidated, OUTPUT_FILE);
  console.log(`✅ Excel file generated: ${OUTPUT_FILE}\n`);

  console.log('🎉 Consolidation completed successfully!');
}

/**
 * Load all competitor result files
 */
async function loadCompetitorResults(): Promise<CompetitorScrapingResults[]> {
  const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('-results.json'));

  const results: CompetitorScrapingResults[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(RESULTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as CompetitorScrapingResults;
      results.push(data);
      console.log(`  ✓ Loaded ${file} (${data.productsFound} products found)`);
    } catch (error) {
      console.error(`  ✗ Failed to load ${file}:`, error);
    }
  }

  return results;
}

/**
 * Consolidate prices by product
 */
function consolidateByProduct(
  products: Product[],
  competitorResults: CompetitorScrapingResults[]
): ConsolidatedProduct[] {
  const consolidated: ConsolidatedProduct[] = [];

  for (const product of products) {
    const prices: Record<string, CompetitorPrice> = {};

    // Collect prices from all competitors
    for (const compResult of competitorResults) {
      const result = compResult.results.find((r) => r.sku === product.skuCleaned);

      prices[compResult.competitorId] = {
        price: result?.price || null,
        url: result?.url || null,
        found: result?.found || false,
        matchType: result?.matchType,
        timestamp: result?.timestamp,
      };
    }

    // Calculate statistics
    const foundPrices = Object.values(prices)
      .filter((p) => p.price !== null)
      .map((p) => p.price!);

    const priceMin = foundPrices.length > 0 ? Math.min(...foundPrices) : null;
    const priceMax = foundPrices.length > 0 ? Math.max(...foundPrices) : null;
    const priceAvg =
      foundPrices.length > 0
        ? foundPrices.reduce((a, b) => a + b, 0) / foundPrices.length
        : null;

    const nbSources = foundPrices.length;

    const ecartPct =
      priceMin && priceMax && priceMin > 0
        ? ((priceMax - priceMin) / priceMin) * 100
        : null;

    const sitesVendeurs = Object.entries(prices)
      .filter(([_, p]) => p.found)
      .map(([comp, _]) => comp);

    consolidated.push({
      sku: product.skuCleaned,
      name: product.name,
      brand: product.brand,
      category: product.category,
      prices,
      stats: {
        priceMin,
        priceMax,
        priceAvg,
        nbSources,
        ecartPct,
        sitesVendeurs,
      },
    });
  }

  return consolidated;
}

/**
 * Generate overall statistics
 */
function generateStatistics(
  consolidated: ConsolidatedProduct[],
  competitorResults: CompetitorScrapingResults[]
) {
  const totalProducts = consolidated.length;
  const productsWithPrices = consolidated.filter((p) => p.stats.nbSources > 0).length;
  const productsNotFound = consolidated.filter((p) => p.stats.nbSources === 0).length;

  // Stats by competitor
  const competitorStats = competitorResults.map((comp) => ({
    id: comp.competitorId,
    name: comp.competitorName,
    found: comp.productsFound,
    notFound: comp.productsNotFound,
    errors: comp.errors,
    coverage: (comp.productsFound / totalProducts) * 100,
  }));

  // Price statistics
  const allPrices = consolidated
    .filter((p) => p.stats.priceAvg !== null)
    .map((p) => p.stats.priceAvg!);

  const avgPriceOverall =
    allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  // Price gaps
  const largeGaps = consolidated.filter(
    (p) => p.stats.ecartPct !== null && p.stats.ecartPct > 50
  );

  return {
    totalProducts,
    productsWithPrices,
    productsNotFound,
    coverageRate: (productsWithPrices / totalProducts) * 100,
    competitorStats,
    avgPriceOverall,
    largeGaps: largeGaps.length,
  };
}

/**
 * Display statistics
 */
function displayStatistics(stats: any) {
  console.log('─'.repeat(70));
  console.log('📊 Overall Statistics');
  console.log('─'.repeat(70));
  console.log(`Total products:          ${stats.totalProducts}`);
  console.log(
    `Products with prices:    ${stats.productsWithPrices} (${stats.coverageRate.toFixed(1)}%)`
  );
  console.log(`Products not found:      ${stats.productsNotFound}`);
  console.log(
    `Average price:           ${stats.avgPriceOverall > 0 ? `$${stats.avgPriceOverall.toFixed(2)}` : 'N/A'}`
  );
  console.log(`Price outliers (>50%):   ${stats.largeGaps}`);

  console.log('\n📊 Statistics by Competitor');
  console.log('─'.repeat(70));

  stats.competitorStats
    .sort((a: any, b: any) => b.coverage - a.coverage)
    .forEach((comp: any) => {
      console.log(
        `${comp.id.padEnd(20)} Found: ${comp.found.toString().padStart(3)} (${comp.coverage.toFixed(1)}%)  Errors: ${comp.errors}`
      );
    });

  console.log('─'.repeat(70));
}

// Run consolidation
consolidatePrices().catch((error) => {
  console.error('❌ Error during consolidation:', error);
  process.exit(1);
});
