import { db } from '../src/db';
import { companies } from '../src/db/schema';

async function listCompanies() {
  console.log('\n📋 Listing companies in database:\n');

  try {
    const allCompanies = await db.select().from(companies);

    if (allCompanies.length === 0) {
      console.log('❌ No companies found in database\n');
    } else {
      console.log(`Found ${allCompanies.length} companies:\n`);
      for (const company of allCompanies) {
        console.log(`  - ${company.name} (slug: ${company.slug}, id: ${company.id})`);
      }
      console.log('\n');
    }
  } catch (error) {
    console.error('Error listing companies:', error);
    process.exit(1);
  }

  process.exit(0);
}

listCompanies();
