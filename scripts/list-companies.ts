import { db } from '@/db';
import { companies } from '@/db/schema';

async function listCompanies() {
  const allCompanies = await db.select({
    slug: companies.slug,
    name: companies.name,
    id: companies.id
  }).from(companies);

  console.log('\n📋 Companies in database:\n');
  allCompanies.forEach(c => {
    console.log(`  • Slug: ${c.slug}`);
    console.log(`    Name: ${c.name}`);
    console.log(`    ID: ${c.id}`);
    console.log('');
  });

  process.exit(0);
}

listCompanies();
