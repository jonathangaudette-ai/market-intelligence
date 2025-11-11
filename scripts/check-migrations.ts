import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function checkMigrations() {
  try {
    const migrations = await sql`
      SELECT * FROM __drizzle_migrations
      ORDER BY created_at
    `;

    console.log('Applied migrations:');
    migrations.forEach((m: any) => {
      console.log(`- ${m.hash} (created: ${m.created_at})`);
    });

    await sql.end();
  } catch (error) {
    console.error('Error checking migrations:', error);
    await sql.end();
    process.exit(1);
  }
}

checkMigrations();
