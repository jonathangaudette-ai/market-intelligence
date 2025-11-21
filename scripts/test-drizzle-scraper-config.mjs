/**
 * Test script to verify scraper_config is correctly parsed
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString);

try {
  console.log('🔍 Fetching Swish competitor...\n');

  const [competitor] = await sql`
    SELECT * FROM pricing_competitors
    WHERE name = 'Swish'
  `;

  if (!competitor) {
    console.error('❌ Swish competitor not found');
    process.exit(1);
  }

  console.log('✅ Competitor found:');
  console.log('   ID:', competitor.id);
  console.log('   Name:', competitor.name);
  console.log('   Website:', competitor.website_url);
  console.log('');
  console.log('📋 scraper_config analysis:');
  console.log('   Type:', typeof competitor.scraper_config);
  console.log('   Is object:', typeof competitor.scraper_config === 'object');
  console.log('   Is string:', typeof competitor.scraper_config === 'string');
  console.log('');

  if (typeof competitor.scraper_config === 'string') {
    console.log('⚠️  scraper_config is a STRING (needs parsing)');
    const parsed = JSON.parse(competitor.scraper_config);
    console.log('   Parsed scraperType:', parsed.scraperType);
  } else if (typeof competitor.scraper_config === 'object') {
    console.log('✅ scraper_config is an OBJECT (correctly parsed)');
    console.log('   scraperType:', competitor.scraper_config.scraperType);
    console.log('   Has scrapingbee config:', !!competitor.scraper_config.scrapingbee);
    console.log('');
    console.log('Full config:');
    console.log(JSON.stringify(competitor.scraper_config, null, 2));
  }

  console.log('\n🧪 Testing scan simulation:');
  if (typeof competitor.scraper_config === 'object') {
    if (competitor.scraper_config.scraperType === 'scrapingbee') {
      console.log('   ✅ Would use ScrapingBee API');
    } else {
      console.log('   ℹ️  Would use Railway worker (scraperType:', competitor.scraper_config.scraperType + ')');
    }
  } else {
    console.log('   ❌ scraper_config is not an object - WOULD FAIL IN PRODUCTION');
  }
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await sql.end();
}
