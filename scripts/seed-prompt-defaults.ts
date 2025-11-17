/**
 * Seed Default Prompts
 *
 * This script seeds the default prompt templates for a company.
 * Run this after creating a new company or to reset prompts to defaults.
 *
 * Usage:
 *   npx tsx scripts/seed-prompt-defaults.ts <companySlug>
 *
 * Example:
 *   npx tsx scripts/seed-prompt-defaults.ts techvision
 */

import { db } from '../src/db';
import { companies, promptTemplates } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getAllDefaultPrompts } from '../src/lib/prompts/defaults';

async function seedPrompts(companySlug: string) {
  console.log(`\n🌱 Seeding default prompts for company: ${companySlug}\n`);

  // 1. Get company
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, companySlug))
    .limit(1);

  if (!company) {
    console.error(`❌ Company not found: ${companySlug}`);
    process.exit(1);
  }

  console.log(`✅ Found company: ${company.name} (${company.id})`);

  // 2. Get all default prompts
  const defaults = getAllDefaultPrompts();

  console.log(`\n📋 Found ${defaults.length} default prompts to seed:\n`);

  // 3. Seed each prompt
  let seeded = 0;
  let skipped = 0;

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
        console.log(`  ⏭️  ${defaultPrompt.name} - Already exists (skipping)`);
        skipped++;
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
        createdBy: 'seed-script',
      });

      console.log(`  ✅ ${defaultPrompt.name} - Seeded`);
      seeded++;
    } catch (error) {
      console.error(`  ❌ ${defaultPrompt.name} - Failed:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Seeded: ${seeded}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📝 Total: ${defaults.length}\n`);
}

// Main
const companySlug = process.argv[2];

if (!companySlug) {
  console.error('❌ Usage: npx tsx scripts/seed-prompt-defaults.ts <companySlug>');
  console.error('   Example: npx tsx scripts/seed-prompt-defaults.ts techvision');
  process.exit(1);
}

seedPrompts(companySlug)
  .then(() => {
    console.log('✅ Seed completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
