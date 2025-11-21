import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

try {
  await client.connect();
  console.log('✅ Connected to database\n');

  const result = await client.query(`
    SELECT id, name, scraper_config
    FROM pricing_competitors
    WHERE name = 'Swish'
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    console.log('❌ No Swish competitor found');
  } else {
    const competitor = result.rows[0];
    console.log('📊 Swish Competitor:');
    console.log(`ID: ${competitor.id}`);
    console.log(`Name: ${competitor.name}`);
    console.log('\n🔧 Scraper Config:');
    console.log(JSON.stringify(competitor.scraper_config, null, 2));
  }

  await client.end();
} catch (error) {
  console.error('Error:', error.message);
  await client.end();
  process.exit(1);
}
