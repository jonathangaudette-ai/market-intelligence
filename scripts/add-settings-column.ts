import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function addSettingsColumn() {
  try {
    console.log('Adding settings column to companies table...');

    await sql`
      ALTER TABLE companies
      ADD COLUMN settings jsonb
    `;

    console.log('✅ Settings column added successfully!');

    // Verify it was added
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'settings'
    `;

    if (columns.length > 0) {
      console.log(`✅ Verified: settings column exists (${columns[0].data_type})`);
    }

    await sql.end();
  } catch (error) {
    console.error('Error adding settings column:', error);
    await sql.end();
    process.exit(1);
  }
}

addSettingsColumn();
