import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function checkColumns() {
  try {
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `;

    console.log('Companies table columns:');
    columns.forEach((col: any) => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    const hasSettings = columns.some((col: any) => col.column_name === 'settings');
    console.log(`\nSettings column exists: ${hasSettings}`);

    await sql.end();
  } catch (error) {
    console.error('Error checking columns:', error);
    await sql.end();
    process.exit(1);
  }
}

checkColumns();
