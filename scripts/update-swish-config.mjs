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
    // Updated configuration with stealth mode enabled and Shopify selectors
    const updatedConfig = {
      scraperType: 'playwright',
      playwright: {
        search: {
          url: 'https://swish.ca/search',
          method: 'GET',
          param: 'q'
        },
        selectors: {
          productList: '.grid__item.product-item, .product-item, article.product, li.klevuProduct',
          productLink: 'a.product-item__title, a.product__title, .product-link, .kuName a',
          productName: '.product-item__title, .product__title, h3.product-title, .kuName',
          productPrice: '.price-item.price-item--regular, .price, .product__price span.money, [class*="Price"]',
          productImage: '.product-item__image-wrapper img, .product__media img',
          productSku: '.product-item__sku, .product__sku, .ku-sku',
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
          waitForSelector: '.product-item, .product, li.klevuProduct', // Wait for products to load
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
