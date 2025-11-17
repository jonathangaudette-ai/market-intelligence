/**
 * Fix incorrect Haiku model ID in company settings
 *
 * Changes 'claude-4-5-haiku-20250514' to 'claude-haiku-4-5-20251001'
 */

import postgres from 'postgres';
import 'dotenv/config';

const OLD_MODEL_ID = 'claude-4-5-haiku-20250514';
const NEW_MODEL_ID = 'claude-haiku-4-5-20251001';

const sql = postgres(process.env.DATABASE_URL);

console.log('🔍 Checking for companies with incorrect Haiku model ID...\n');

// Find companies with the old model ID
const companiesWithOldId = await sql`
  SELECT id, name, slug, settings
  FROM companies
  WHERE settings->>'aiModel' = ${OLD_MODEL_ID}
`;

if (companiesWithOldId.length === 0) {
  console.log('✅ No companies found with the old model ID. Nothing to fix!');
  await sql.end();
  process.exit(0);
}

console.log(`Found ${companiesWithOldId.length} companies with old model ID:\n`);
companiesWithOldId.forEach((company) => {
  console.log(`  - ${company.name} (${company.slug})`);
});

console.log('\n🔧 Fixing model IDs...\n');

// Update each company
for (const company of companiesWithOldId) {
  const updatedSettings = {
    ...company.settings,
    aiModel: NEW_MODEL_ID,
  };

  await sql`
    UPDATE companies
    SET settings = ${sql.json(updatedSettings)}
    WHERE id = ${company.id}
  `;

  console.log(`  ✓ Fixed: ${company.name}`);
}

console.log(`\n✅ Successfully updated ${companiesWithOldId.length} companies!`);
console.log(`   Old ID: ${OLD_MODEL_ID}`);
console.log(`   New ID: ${NEW_MODEL_ID}`);

await sql.end();
