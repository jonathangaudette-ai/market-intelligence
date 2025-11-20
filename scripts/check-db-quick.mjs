#!/usr/bin/env node
/**
 * Quick database check using raw SQL
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function checkDB() {
  console.log('🔍 Quick Database Check\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Get Swish competitor
    const comp = await client.query(`
      SELECT id, name, website_url
      FROM pricing_competitors
      WHERE name ILIKE '%swish%'
      LIMIT 1
    `);

    if (comp.rows.length === 0) {
      console.log('❌ No Swish competitor');
      return;
    }

    console.log('Competitor:', comp.rows[0].name);
    console.log('ID:', comp.rows[0].id);
    console.log();

    // Get products for this company
    const products = await client.query(`
      SELECT id, sku, name, is_active, deleted_at
      FROM pricing_products
      WHERE company_id = (SELECT company_id FROM pricing_competitors WHERE id = $1)
        AND is_active = true
        AND deleted_at IS NULL
      LIMIT 10
    `, [comp.rows[0].id]);

    console.log(`Active Products: ${products.rows.length}`);
    products.rows.forEach((p, i) => {
      console.log(`${i+1}. ${p.sku} - ${p.name}`);
    });
    console.log();

    // Get matches for Swish
    const matches = await client.query(`
      SELECT
        pm.id,
        pm.product_id,
        pm.competitor_product_url,
        pm.needs_revalidation,
        pm.last_scraped_at,
        p.sku,
        p.name
      FROM pricing_matches pm
      JOIN pricing_products p ON p.id = pm.product_id
      WHERE pm.competitor_id = $1
      LIMIT 10
    `, [comp.rows[0].id]);

    console.log(`Pricing Matches: ${matches.rows.length}\n`);

    matches.rows.forEach((m, i) => {
      console.log(`${i+1}. ${m.sku}`);
      console.log(`   URL: ${m.competitor_product_url || 'NULL'}`);
      console.log(`   needsRevalidation: ${m.needs_revalidation === null ? 'NULL' : m.needs_revalidation}`);

      const hasUrl = !!m.competitor_product_url;
      const noRevalidation = !m.needs_revalidation;
      const qualifies = hasUrl && noRevalidation;

      console.log(`   Qualifies for direct scraping: ${qualifies ? '✅ YES' : '❌ NO'}`);
      if (!qualifies) {
        console.log(`   Reason: ${!hasUrl ? 'No URL' : 'needsRevalidation = true'}`);
      }
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDB().catch(console.error);
