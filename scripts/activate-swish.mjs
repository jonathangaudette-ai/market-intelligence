#!/usr/bin/env node

/**
 * ACTIVATE SWISH COMPETITOR
 *
 * Sets is_active = true for Swish competitor
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
  console.log('🔧 Activating Swish competitor...\n');

  try {
    // Activate Swish
    const result = await sql`
      UPDATE pricing_competitors
      SET
        is_active = true,
        updated_at = now()
      WHERE name = 'Swish'
      RETURNING id, name, is_active;
    `;

    if (result.length === 0) {
      console.error('❌ No competitor named "Swish" found');
      process.exit(1);
    }

    console.log('✅ Swish competitor activated:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Name: ${result[0].name}`);
    console.log(`   Active: ${result[0].is_active}`);

  } catch (error) {
    console.error('❌ Error activating Swish:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
