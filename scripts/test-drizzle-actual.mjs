/**
 * Test script using the actual Drizzle setup from the app
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { pricingCompetitors } from '../src/db/schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

try {
  console.log('🔍 Testing Drizzle ORM with actual schema...\n');

  const queryClient = postgres(connectionString);
  const db = drizzle(queryClient);

  const [competitor] = await db
    .select()
    .from(pricingCompetitors)
    .where(eq(pricingCompetitors.name, 'Swish'))
    .limit(1);

  if (!competitor) {
    console.error('❌ Swish competitor not found');
    process.exit(1);
  }

  console.log('✅ Competitor found via Drizzle:');
  console.log('   ID:', competitor.id);
  console.log('   Name:', competitor.name);
  console.log('');
  console.log('📋 scraperConfig analysis:');
  console.log('   Type:', typeof competitor.scraperConfig);
  console.log('   Constructor:', competitor.scraperConfig?.constructor?.name);
  console.log('');

  if (typeof competitor.scraperConfig === 'string') {
    console.log('❌ PROBLEM: scraperConfig is a STRING');
    console.log('   Raw value:', competitor.scraperConfig.substring(0, 100) + '...');
    const parsed = JSON.parse(competitor.scraperConfig);
    console.log('   Parsed scraperType:', parsed.scraperType);
  } else if (competitor.scraperConfig && typeof competitor.scraperConfig === 'object') {
    console.log('✅ scraperConfig is an OBJECT');
    console.log('   scraperType:', competitor.scraperConfig.scraperType);
    console.log('   Has scrapingbee:', !!competitor.scraperConfig.scrapingbee);

    console.log('\n🧪 Simulating production condition check:');
    if (competitor.scraperConfig.scraperType === 'scrapingbee') {
      console.log('   ✅ Condition TRUE - would use ScrapingBee');
    } else {
      console.log('   ❌ Condition FALSE - would use Railway worker');
      console.log('   scraperType value:', competitor.scraperConfig.scraperType);
    }
  } else {
    console.log('❌ scraperConfig is null or undefined');
  }

  await queryClient.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
