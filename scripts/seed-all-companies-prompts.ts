/**
 * Seed Default Prompts for ALL Companies
 *
 * This script seeds the default prompt templates for ALL companies in the database.
 *
 * Usage:
 *   npx tsx scripts/seed-all-companies-prompts.ts
 */

import { db } from '../src/db';
import { companies, promptTemplates } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getAllDefaultPrompts } from '../src/lib/prompts/defaults';

async function seedAllCompanies() {
  console.log('\n🌱 Seeding default prompts for ALL companies\n');

  // 1. Get all companies
  const allCompanies = await db.select().from(companies);

  if (allCompanies.length === 0) {
    console.error('❌ No companies found in database');
    process.exit(1);
  }

  console.log(`✅ Found ${allCompanies.length} companies:\n`);
  allCompanies.forEach((company, index) => {
    console.log(`  ${index + 1}. ${company.name} (${company.slug})`);
  });

  // 2. Get all default prompts
  const defaults = getAllDefaultPrompts();

  console.log(`\n📋 Found ${defaults.length} default prompts to seed per company\n`);
  console.log('━'.repeat(60));

  // 3. Seed each company
  let totalSeeded = 0;
  let totalSkipped = 0;

  for (const company of allCompanies) {
    console.log(`\n🏢 ${company.name} (${company.slug}):`);

    let companySeeded = 0;
    let companySkipped = 0;

    for (const defaultPrompt of defaults) {
      try {
        // Check if prompt already exists
        const [existing] = await db
          .select()
          .from(promptTemplates)
          .where(
            and(
              eq(promptTemplates.companyId, company.id),
              eq(promptTemplates.promptKey, defaultPrompt.promptKey)
            )
          )
          .limit(1);

        if (existing) {
          console.log(`  ⏭️  ${defaultPrompt.promptKey} - Already exists`);
          companySkipped++;
          continue;
        }

        // Insert default prompt
        await db.insert(promptTemplates).values({
          id: createId(),
          companyId: company.id,
          promptKey: defaultPrompt.promptKey,
          category: defaultPrompt.category,
          systemPrompt: defaultPrompt.systemPrompt,
          userPromptTemplate: defaultPrompt.userPromptTemplate,
          modelId: defaultPrompt.modelId,
          temperature: defaultPrompt.temperature ? String(defaultPrompt.temperature) : null,
          maxTokens: defaultPrompt.maxTokens,
          name: defaultPrompt.name,
          description: defaultPrompt.description,
          variables: defaultPrompt.variables as any,
          version: 1,
          isActive: true,
          createdBy: 'seed-all-script',
        });

        console.log(`  ✅ ${defaultPrompt.promptKey} - Seeded`);
        companySeeded++;
      } catch (error) {
        console.error(`  ❌ ${defaultPrompt.promptKey} - Failed:`, error);
      }
    }

    console.log(`  Summary: ✅ ${companySeeded} seeded, ⏭️  ${companySkipped} skipped`);

    totalSeeded += companySeeded;
    totalSkipped += companySkipped;
  }

  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 GLOBAL SUMMARY:');
  console.log(`  🏢 Companies: ${allCompanies.length}`);
  console.log(`  📝 Prompts per company: ${defaults.length}`);
  console.log(`  ✅ Total seeded: ${totalSeeded}`);
  console.log(`  ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`  📊 Total expected: ${allCompanies.length * defaults.length}\n`);
}

// Main
seedAllCompanies()
  .then(() => {
    console.log('✅ Seed completed successfully for all companies\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
