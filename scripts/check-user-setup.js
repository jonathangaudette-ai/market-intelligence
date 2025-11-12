#!/usr/bin/env node
/**
 * Check user and company setup
 */

const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vDGRL8xnKzJ3@ep-patient-wildflower-admktfju-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function checkSetup() {
  try {
    console.log('🔍 Checking user setup...\n');

    // Check user
    const users = await sql`
      SELECT id, email, name, is_super_admin, created_at
      FROM users
      WHERE email = 'jonathan@mhosaic.com'
    `;

    if (users.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Super Admin:', user.is_super_admin);

    // Check companies
    const companies = await sql`
      SELECT c.id, c.name, c.slug, c.is_active,
             cm.role, cm.created_at as member_since
      FROM companies c
      JOIN company_members cm ON c.id = cm.company_id
      WHERE cm.user_id = ${user.id}
        AND c.is_active = TRUE
    `;

    console.log(`\n📊 Companies (${companies.length}):`);

    if (companies.length === 0) {
      console.log('   ⚠️  No companies found for this user!');
      console.log('\n💡 Creating a default company...');

      // Create default company
      const newCompany = await sql`
        INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
        VALUES (
          ${`company_` + Date.now()},
          'My Company',
          'my-company',
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id, name, slug
      `;

      if (newCompany.length > 0) {
        const company = newCompany[0];
        console.log('   ✅ Company created:');
        console.log('      ID:', company.id);
        console.log('      Name:', company.name);
        console.log('      Slug:', company.slug);

        // Add user as admin
        await sql`
          INSERT INTO company_members (id, user_id, company_id, role, created_at, updated_at)
          VALUES (
            ${`member_` + Date.now()},
            ${user.id},
            ${company.id},
            'admin',
            NOW(),
            NOW()
          )
        `;

        console.log('\n   ✅ User added as admin to company');
        console.log(`\n🚀 You can now access: https://market-intelligence-kappa.vercel.app/companies/${company.slug}`);
      }
    } else {
      companies.forEach((company, index) => {
        console.log(`\n   ${index + 1}. ${company.name}`);
        console.log(`      Slug: ${company.slug}`);
        console.log(`      Role: ${company.role}`);
        console.log(`      Member since: ${company.member_since}`);
        console.log(`      URL: https://market-intelligence-kappa.vercel.app/companies/${company.slug}`);
      });
    }

    await sql.end();
    console.log('\n✅ Setup check complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
