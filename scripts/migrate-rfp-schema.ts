import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateRFPSchema() {
  // Remove channel_binding from DATABASE_URL if present
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');

  const sql = postgres(dbUrl, {
    ssl: 'require',
  });

  try {
    console.log('🔄 Applying RFP schema to Neon database...');

    // Read the schema.sql file
    const schemaPath = join(process.cwd(), 'ModuleRFP', 'schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');

    // Execute the schema
    await sql.unsafe(schemaSQL);

    console.log('✅ RFP schema applied successfully!');

    // Verify tables were created
    console.log('\n📋 Verifying RFP tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'rfp%'
      ORDER BY table_name;
    `;

    console.log(`\nCreated ${tables.length} RFP tables:`);
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });

    // Verify views
    console.log('\n📊 Verifying RFP views...');
    const views = await sql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name LIKE 'v_rfp%'
      ORDER BY table_name;
    `;

    console.log(`\nCreated ${views.length} RFP views:`);
    views.forEach((view: any) => {
      console.log(`  - ${view.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error applying RFP schema:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run migration
migrateRFPSchema().catch(console.error);
