/**
 * DATABASE DIAGNOSTIC: Check Pricing Matches State
 *
 * Verifies what's actually stored in the database for Swish competitor
 */

import { config } from 'dotenv';
import { join } from 'path';
import { db } from '../src/db/index.js';
import { pricingCompetitors, pricingMatches, pricingProducts } from '../src/db/schema-pricing.js';
import { eq, ilike, sql } from 'drizzle-orm';

config({ path: join(process.cwd(), '.env.local') });

async function checkMatches() {
  console.log('🔍 Checking Pricing Matches Database State\n');
  console.log('='.repeat(80));

  try {
    // Get Swish competitor
    const competitors = await db
      .select()
      .from(pricingCompetitors)
      .where(ilike(pricingCompetitors.name, '%swish%'))
      .limit(1);

    if (competitors.length === 0) {
      console.log('❌ No Swish competitor found');
      return;
    }

    const competitor = competitors[0];
    console.log('📊 Competitor Found:');
    console.log(`   ID: ${competitor.id}`);
    console.log(`   Name: ${competitor.name}`);
    console.log(`   URL: ${competitor.websiteUrl}`);
    console.log(`   Company: ${competitor.companySlug}\n`);

    // Get all matches for this competitor
    const matches = await db
      .select()
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingProducts.id, pricingMatches.productId))
      .where(eq(pricingMatches.competitorId, competitor.id));

    console.log(`📋 Pricing Matches Found: ${matches.length}\n`);

    if (matches.length === 0) {
      console.log('❌ No matches found for this competitor!');
      console.log('   This explains why directProducts = 0');
      return;
    }

    matches.forEach((row, i) => {
      const match = row.pricing_matches;
      const product = row.pricing_products;

      console.log(`${i + 1}. Match ID: ${match.id}`);
      console.log(`   Product: ${product.name} (${product.sku})`);
      console.log(`   URL: ${match.competitorProductUrl || '❌ NULL'}`);
      console.log(`   needsRevalidation: ${match.needsRevalidation === null ? 'NULL' : match.needsRevalidation}`);
      console.log(`   Last Scraped: ${match.lastScrapedAt ? new Date(match.lastScrapedAt).toISOString() : 'Never'}`);

      // Check if this match would qualify for direct scraping
      const hasUrl = !!match.competitorProductUrl;
      const noRevalidation = !match.needsRevalidation; // false or null = true
      const qualifies = hasUrl && noRevalidation;

      console.log(`   ✨ Qualifies for Direct Scraping: ${qualifies ? '✅ YES' : '❌ NO'}`);
      if (!qualifies) {
        console.log(`      Reason: ${!hasUrl ? 'Missing URL' : 'Needs Revalidation = ' + match.needsRevalidation}`);
      }
      console.log('');
    });

    // Summary
    const withUrls = matches.filter(r => !!r.pricing_matches.competitorProductUrl);
    const readyForDirect = matches.filter(r =>
      !!r.pricing_matches.competitorProductUrl && !r.pricing_matches.needsRevalidation
    );

    console.log('='.repeat(80));
    console.log('📊 SUMMARY\n');
    console.log(`Total Matches: ${matches.length}`);
    console.log(`With URLs: ${withUrls.length}`);
    console.log(`Ready for Direct Scraping: ${readyForDirect.length}`);
    console.log(`Need Search: ${matches.length - readyForDirect.length}`);

    if (readyForDirect.length === 0 && withUrls.length > 0) {
      console.log('\n⚠️  FOUND THE PROBLEM:');
      console.log('   URLs exist but needsRevalidation is TRUE');
      console.log('   This prevents direct scraping mode');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }

  process.exit(0);
}

checkMatches().catch(console.error);
