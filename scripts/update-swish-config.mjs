#!/usr/bin/env node

/**
 * UPDATE SWISH COMPETITOR CONFIGURATION
 *
 * Updates Swish competitor with standard Shopify CSS selectors
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(databaseUrl);
const db = drizzle(sql);

async function main() {
  console.log('🔧 Updating Swish competitor configuration...\\n');

  try {
    // ========================================================================
    // Updated configuration with validated product detail page selectors
    // These selectors were tested locally and successfully extracted:
    //   - Product Name: "Sanitaire Extend® Commercial Canister Vacuum - 11""
    //   - Price: "$313.26"
    //   - SKU: "SKU  SC3700A"
    // ========================================================================
    const updatedConfig = {
      scraperType: 'playwright',
      playwright: {
        search: {
          url: 'https://swish.ca/search',
          method: 'GET',
          param: 'q'
        },
        selectors: {
          // PRODUCT DETAIL PAGE SELECTORS (for direct URL scraping)
          productName: 'h1.product__title, h1.product-title, h1',
          productPrice: '.price-item.price-item--regular, .price__regular .price-item, span.price-item, .product__price span, .price, .money',
          productSku: '.product__sku, [data-product-sku], .sku',
          productImage: '.product__media img, .product__image img, [data-product-image]',

          // SEARCH/LISTING PAGE SELECTORS (for search-based scraping)
          productList: '.grid__item.product-item, .product-item, article.product, li.klevuProduct',
          productLink: 'a.product-item__title, a.product__title, .product-link, .kuName a',
          inStockIndicator: '.product-form__inventory',
          noResults: '.search__no-results, .no-results, .kuNoResultMessage'
        },
        pagination: {
          enabled: false, // Disable pagination for MVP
          maxPages: 3
        },
        rateLimiting: {
          requestDelay: 3000, // 3 seconds between requests (slower for stealth)
          productDelay: 1500  // 1.5 seconds between products
        },
        advanced: {
          useStealthMode: true, // 🥷 ENABLE STEALTH MODE to bypass Cloudflare
          // IMPORTANT: Different waitForSelector based on page type:
          // - Product detail pages: Wait for h1.product__title
          // - Search/listing pages: Wait for .product-item, .product, li.klevuProduct
          waitForSelector: 'h1.product__title, .product-item, .product, li.klevuProduct',
          viewport: { width: 1920, height: 1080 }
        }
      }
    };

    // Update Swish competitor
    const result = await sql`
      UPDATE pricing_competitors
      SET
        scraper_config = ${JSON.stringify(updatedConfig)},
        updated_at = now()
      WHERE name = 'Swish'
      RETURNING id, name, scraper_config;
    `;

    if (result.length === 0) {
      console.error('❌ No competitor named "Swish" found');
      process.exit(1);
    }

    console.log('✅ Swish configuration updated successfully!');
    console.log('   ID:', result[0].id);
    console.log('   Name:', result[0].name);
    console.log('   Scraper Type:', result[0].scraper_config.scraperType);
    console.log('   Search URL:', result[0].scraper_config.playwright.search.url);
    console.log('   Product List Selector:', result[0].scraper_config.playwright.selectors.productList);
    console.log('   Product Price Selector:', result[0].scraper_config.playwright.selectors.productPrice);
    console.log('\\n📝 Note: These are standard Shopify selectors. If scraping fails,');
    console.log('   inspect the actual page HTML and update selectors accordingly.');

  } catch (error) {
    console.error('❌ Error updating Swish config:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
