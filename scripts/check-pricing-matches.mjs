#!/usr/bin/env node

/**
 * DATABASE DIAGNOSTIC: Check Pricing Matches State
 *
 * Verifies what's actually stored in the database for Swish competitor
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function checkMatches() {
  console.log('🔍 Checking Pricing Matches Database State\n');
  console.log('='.repeat(80));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get Swish competitor
    const competitorResult = await client.query(`
      SELECT id, name, "websiteUrl", "companySlug"
      FROM pricing_competitors
      WHERE name ILIKE '%swish%'
      LIMIT 1
    `);

    if (competitorResult.rows.length === 0) {
      console.log('❌ No Swish competitor found');
      return;
    }

    const competitor = competitorResult.rows[0];
    console.log('📊 Competitor Found:');
    console.log(`   ID: ${competitor.id}`);
    console.log(`   Name: ${competitor.name}`);
    console.log(`   URL: ${competitor.websiteUrl}`);
    console.log(`   Company: ${competitor.companySlug}\n`);

    // Get all matches for this competitor
    const matchesResult = await client.query(`
      SELECT
        pm.id,
        pm."productId",
        pm."competitorProductUrl",
        pm."needsRevalidation",
        pm."lastScannedAt",
        p.sku,
        p.name as "productName"
      FROM pricing_matches pm
      JOIN pricing_products p ON p.id = pm."productId"
      WHERE pm."competitorId" = $1
      ORDER BY pm."lastScannedAt" DESC
    `, [competitor.id]);

    console.log(`📋 Pricing Matches Found: ${matchesResult.rows.length}\n`);

    if (matchesResult.rows.length === 0) {
      console.log('❌ No matches found for this competitor!');
      console.log('   This explains why directProducts = 0');
      return;
    }

    matchesResult.rows.forEach((match, i) => {
      console.log(`${i + 1}. Match ID: ${match.id}`);
      console.log(`   Product: ${match.productName} (${match.sku})`);
      console.log(`   URL: ${match.competitorProductUrl || '❌ NULL'}`);
      console.log(`   needsRevalidation: ${match.needsRevalidation === null ? 'NULL' : match.needsRevalidation}`);
      console.log(`   Last Scanned: ${match.lastScannedAt || 'Never'}`);

      // Check if this match would qualify for direct scraping
      const hasUrl = !!match.competitorProductUrl;
      const noRevalidation = !match.needsRevalidation;
      const qualifies = hasUrl && noRevalidation;

      console.log(`   ✨ Qualifies for Direct Scraping: ${qualifies ? '✅ YES' : '❌ NO'}`);
      if (!qualifies) {
        console.log(`      Reason: ${!hasUrl ? 'Missing URL' : 'Needs Revalidation'}`);
      }
      console.log('');
    });

    // Summary
    const withUrls = matchesResult.rows.filter(m => !!m.competitorProductUrl);
    const readyForDirect = matchesResult.rows.filter(m =>
      !!m.competitorProductUrl && !m.needsRevalidation
    );

    console.log('='.repeat(80));
    console.log('📊 SUMMARY\n');
    console.log(`Total Matches: ${matchesResult.rows.length}`);
    console.log(`With URLs: ${withUrls.length}`);
    console.log(`Ready for Direct Scraping: ${readyForDirect.length}`);
    console.log(`Need Search: ${matchesResult.rows.length - readyForDirect.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

checkMatches().catch(console.error);
