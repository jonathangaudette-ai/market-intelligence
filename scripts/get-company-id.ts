#!/usr/bin/env ts-node
import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../src/db';
import { companies } from '../src/db/schema';
import { eq } from 'drizzle-orm';

config({ path: resolve(process.cwd(), '.env.local') });

const slug = process.argv[2] || 'my-company';

async function main() {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);

  if (company) {
    console.log(company.id);
  } else {
    console.error(`Company with slug "${slug}" not found`);
    process.exit(1);
  }
}

main();
