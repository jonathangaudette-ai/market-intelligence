#!/usr/bin/env node
/**
 * Seed Swish competitor with Playwright configuration
 * Phase 1: Infrastructure de Configuration
 *
 * Updates existing Swish competitor with:
 * - Complete Playwright configuration (search, selectors, pagination, rate limiting)
 * - companySlug field for scraper factory routing
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

try {
  console.log('🌱 Updating Swish competitor with Playwright configuration...\n');

  // 1. Find existing company
  console.log('1️⃣  Finding existing company...');
  const companies = await sql`SELECT id, slug, name FROM companies LIMIT 1`;

  if (companies.length === 0) {
    console.error('❌ No company found. Please create a company first.');
    await sql.end();
    process.exit(1);
  }

  const company = companies[0];
  const companySlug = company.slug || 'my-company'; // Default to 'my-company' for Dissan
  console.log(`   ✓ Using company: ${company.name} (${company.id})`);
  console.log(`   ✓ Company slug: ${companySlug}\n`);

  // 2. Find or create Swish competitor
  console.log('2️⃣  Finding Swish competitor...');

  const existingCompetitors = await sql`
    SELECT id, name FROM pricing_competitors
    WHERE company_id = ${company.id}
    AND LOWER(name) = 'swish'
  `;

  let competitorId;

  if (existingCompetitors.length > 0) {
    // Update existing Swish competitor
    competitorId = existingCompetitors[0].id;
    console.log(`   ✓ Found existing Swish competitor (${competitorId})`);
    console.log('   → Updating configuration...\n');

    await sql`
      UPDATE pricing_competitors
      SET
        company_slug = ${companySlug},
        scraper_config = ${{
          scraperType: 'playwright',
          playwright: {
            search: {
              url: 'https://swish.ca/search',
              method: 'GET',
              param: 'q'
            },
            selectors: {
              productList: 'li.klevuProduct',
              productLink: '.kuName a',
              productName: '.kuName',
              productSku: '.ku-sku',
              productPrice: '[class*="Price"]',
              noResults: '.kuNoResultMessage'
            },
            pagination: {
              enabled: true,
              type: 'button-click',
              selector: '.pagination .next-page',
              maxPages: 5
            },
            rateLimiting: {
              requestDelay: 2000,
              productDelay: 1000
            }
          }
        }}::jsonb,
        updated_at = now()
      WHERE id = ${competitorId}
    `;

    console.log('   ✓ Updated Swish competitor with Playwright configuration\n');

  } else {
    // Create new Swish competitor
    console.log('   ✗ Swish competitor not found');
    console.log('   → Creating new Swish competitor...\n');

    const { createId } = await import('@paralleldrive/cuid2');
    competitorId = createId();

    await sql`
      INSERT INTO pricing_competitors (
        id, company_id, company_slug, name, website_url,
        scraper_config, is_active, scan_frequency,
        total_scans, successful_scans, failed_scans,
        created_at, updated_at
      ) VALUES (
        ${competitorId},
        ${company.id},
        ${companySlug},
        'Swish',
        'https://swish.ca',
        ${{
          scraperType: 'playwright',
          playwright: {
            search: {
              url: 'https://swish.ca/search',
              method: 'GET',
              param: 'q'
            },
            selectors: {
              productList: 'li.klevuProduct',
              productLink: '.kuName a',
              productName: '.kuName',
              productSku: '.ku-sku',
              productPrice: '[class*="Price"]',
              noResults: '.kuNoResultMessage'
            },
            pagination: {
              enabled: true,
              type: 'button-click',
              selector: '.pagination .next-page',
              maxPages: 5
            },
            rateLimiting: {
              requestDelay: 2000,
              productDelay: 1000
            }
          }
        }}::jsonb,
        true,
        'weekly',
        0,
        0,
        0,
        now(),
        now()
      )
    `;

    console.log('   ✓ Created new Swish competitor with Playwright configuration\n');
  }

  // 3. Verify configuration
  console.log('3️⃣  Verifying Swish configuration...');

  const competitor = await sql`
    SELECT
      id, name, website_url, company_slug,
      scraper_config, is_active
    FROM pricing_competitors
    WHERE id = ${competitorId}
  `;

  if (competitor.length === 0) {
    throw new Error('Failed to verify competitor configuration');
  }

  const config = competitor[0].scraper_config;

  console.log('\n📊 Swish Configuration Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ID: ${competitor[0].id}`);
  console.log(`   Name: ${competitor[0].name}`);
  console.log(`   Website: ${competitor[0].website_url}`);
  console.log(`   Company Slug: ${competitor[0].company_slug}`);
  console.log(`   Active: ${competitor[0].is_active ? '✅' : '❌'}`);
  console.log('');
  console.log('   Scraper Configuration:');
  console.log(`   ├─ Type: ${config.scraperType}`);
  console.log(`   ├─ Search URL: ${config.playwright?.search?.url}`);
  console.log(`   ├─ Search Param: ${config.playwright?.search?.param}`);
  console.log(`   ├─ Product List: ${config.playwright?.selectors?.productList}`);
  console.log(`   ├─ Product Name: ${config.playwright?.selectors?.productName}`);
  console.log(`   ├─ Product Price: ${config.playwright?.selectors?.productPrice}`);
  console.log(`   ├─ Pagination: ${config.playwright?.pagination?.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   ├─ Max Pages: ${config.playwright?.pagination?.maxPages || 'N/A'}`);
  console.log(`   ├─ Request Delay: ${config.playwright?.rateLimiting?.requestDelay || 'Default'}ms`);
  console.log(`   └─ Product Delay: ${config.playwright?.rateLimiting?.productDelay || 'Default'}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Swish configuration updated successfully!\n');
  console.log('Next steps:');
  console.log('   1. Create BasePlaywrightScraper (Phase 2)');
  console.log('   2. Create SwishScraper custom implementation (Phase 3)');
  console.log('   3. Update ScraperFactory routing (Phase 4)');
  console.log('   4. Test with: node scripts/test-swish-scraper.mjs\n');

  await sql.end();
  process.exit(0);

} catch (error) {
  console.error('\n❌ Configuration update failed:');
  console.error(error);
  await sql.end();
  process.exit(1);
}
