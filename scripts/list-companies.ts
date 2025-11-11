import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function listCompanies() {
  try {
    const companies = await sql`
      SELECT c.id, c.name, c.slug, c.is_active,
             COUNT(cm.id) as member_count
      FROM companies c
      LEFT JOIN company_members cm ON cm.company_id = c.id
      GROUP BY c.id, c.name, c.slug, c.is_active
      ORDER BY c.created_at DESC
    `;

    console.log('📊 Compagnies disponibles:\n');
    companies.forEach((c: any, i: number) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   Slug: ${c.slug}`);
      console.log(`   Membres: ${c.member_count}`);
      console.log(`   Actif: ${c.is_active ? '✅' : '❌'}`);
      console.log(`   URL: /companies/${c.slug}/dashboard`);
      console.log('');
    });

    await sql.end();
  } catch (error) {
    console.error('Error listing companies:', error);
    await sql.end();
    process.exit(1);
  }
}

listCompanies();
