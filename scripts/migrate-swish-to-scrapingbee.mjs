/**
 * Migration Script: Switch Swish competitor to ScrapingBee
 *
 * This script updates the Swish competitor configuration to use ScrapingBee
 * instead of Playwright/Railway worker.
 */

import postgres from 'postgres';

// Database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString);

// ScrapingBee configuration for Swish
const swishScrapingBeeConfig = {
  scraperType: 'scrapingbee',
  scrapingbee: {
    api: {
      premium_proxy: true,
      country_code: 'ca',
      render_js: true,
      wait: 10000,
      block_ads: true,
      block_resources: false,
      timeout: 120000,
    },
    selectors: {
      productName: [
        'h1.product__title',
        'h1.product-title',
        'h1',
      ],
      productPrice: [
        '.price-item.price-item--regular',
        '.price__regular .price-item',
        'span.price-item',
        '.price',
      ],
      productSku: [
        '.product__sku',
        '[data-product-sku]',
        '.sku',
      ],
      productImage: [
        '.product__media img',
        '.product__image img',
        'img[data-product-image]',
      ],
    },
    search: {
      url: 'https://swish.ca/search',
      method: 'GET',
      param: 'q',
    },
  },
};

async function migrateSwishToScrapingBee() {
  try {
    console.log('🚀 Starting Swish → ScrapingBee migration...\n');

    // Find Swish competitor by name
    const swishCompetitors = await sql`
      SELECT * FROM pricing_competitors
      WHERE name = 'Swish'
      LIMIT 1
    `;

    if (swishCompetitors.length === 0) {
      console.error('❌ Swish competitor not found in database');
      console.log('💡 Available competitors:');
      const allCompetitors = await sql`
        SELECT id, name, website_url FROM pricing_competitors
      `;
      allCompetitors.forEach(c => {
        console.log(`   - ${c.name} (${c.website_url})`);
      });
      process.exit(1);
    }

    const swish = swishCompetitors[0];
    console.log(`✅ Found Swish competitor: ${swish.id}`);
    console.log(`   Name: ${swish.name}`);
    console.log(`   Website: ${swish.website_url}`);
    console.log(`   Current scraper type: ${swish.scraper_config?.scraperType || 'unknown'}\n`);

    // Update configuration
    await sql`
      UPDATE pricing_competitors
      SET
        scraper_config = ${JSON.stringify(swishScrapingBeeConfig)}::jsonb,
        updated_at = NOW()
      WHERE id = ${swish.id}
    `;

    console.log('✅ Successfully updated Swish configuration to use ScrapingBee\n');

    // Verify update
    const updatedSwish = await sql`
      SELECT * FROM pricing_competitors
      WHERE id = ${swish.id}
    `;

    console.log('📋 New configuration:');
    console.log(JSON.stringify(updatedSwish[0].scraper_config, null, 2));

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test scraping with the new configuration');
    console.log('   2. Monitor credit usage in ScrapingBee dashboard');
    console.log('   3. Verify product data extraction accuracy\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migration
migrateSwishToScrapingBee();
