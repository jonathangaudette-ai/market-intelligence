import postgres from 'postgres';
import { createId } from '@paralleldrive/cuid2';

const sql = postgres(process.env.DATABASE_URL!);

async function createCompany() {
  const name = process.argv[2];
  const slug = process.argv[3];
  const ownerEmail = process.argv[4];

  if (!name || !slug || !ownerEmail) {
    console.error('Usage: npx tsx scripts/create-company.ts <name> <slug> <owner-email>');
    console.error('Example: npx tsx scripts/create-company.ts "Acme Corp" "acme-corp" "admin@example.com"');
    process.exit(1);
  }

  try {
    // Check if slug already exists
    const [existingCompany] = await sql`
      SELECT id FROM companies WHERE slug = ${slug}
    `;

    if (existingCompany) {
      console.error(`❌ Company with slug "${slug}" already exists`);
      process.exit(1);
    }

    // Get owner user
    const [owner] = await sql`
      SELECT id, name, email FROM users WHERE email = ${ownerEmail}
    `;

    if (!owner) {
      console.error(`❌ User with email "${ownerEmail}" not found`);
      process.exit(1);
    }

    console.log(`Creating company "${name}" with slug "${slug}"...`);

    // Create company
    const companyId = createId();
    const [company] = await sql`
      INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
      VALUES (${companyId}, ${name}, ${slug}, true, NOW(), NOW())
      RETURNING *
    `;

    console.log(`✅ Company created: ${company.id}`);

    // Add owner as admin member
    const memberId = createId();
    await sql`
      INSERT INTO company_members (id, user_id, company_id, role, created_at, updated_at)
      VALUES (${memberId}, ${owner.id}, ${companyId}, 'admin', NOW(), NOW())
    `;

    console.log(`✅ Added ${owner.email} as admin`);
    console.log('');
    console.log('Company Details:');
    console.log(`  Name: ${company.name}`);
    console.log(`  Slug: ${company.slug}`);
    console.log(`  ID: ${company.id}`);
    console.log(`  URL: /companies/${company.slug}/dashboard`);

    await sql.end();
  } catch (error) {
    console.error('Error creating company:', error);
    await sql.end();
    process.exit(1);
  }
}

createCompany();
