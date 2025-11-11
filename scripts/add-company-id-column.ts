import postgres from 'postgres';

async function addCompanyIdColumn() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔧 Adding company_id column to rfps table...\n');

    // Check if column already exists
    const existing = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'rfps' AND column_name = 'company_id';
    `;

    if (existing.length > 0) {
      console.log('✅ Column company_id already exists!');
      await sql.end();
      return;
    }

    // Add company_id column
    await sql`
      ALTER TABLE rfps
      ADD COLUMN company_id VARCHAR(255) NOT NULL DEFAULT 'default-company-id';
    `;

    console.log('✅ Added company_id column');

    // Add foreign key constraint
    await sql`
      ALTER TABLE rfps
      ADD CONSTRAINT rfps_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id);
    `;

    console.log('✅ Added foreign key constraint');

    // Remove default
    await sql`
      ALTER TABLE rfps
      ALTER COLUMN company_id DROP DEFAULT;
    `;

    console.log('✅ Removed default value');
    console.log('\n🎉 Migration completed successfully!');

    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

addCompanyIdColumn();
