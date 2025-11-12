#!/usr/bin/env node
/**
 * Quick script to create user using Node + postgres library
 * Usage: node scripts/quick-create-user.js
 */

const postgres = require('postgres');
const bcrypt = require('bcryptjs');

// Get DATABASE_URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_vDGRL8xnKzJ3@ep-patient-wildflower-a-dmktfju-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function createUser() {
  try {
    console.log('🔌 Connecting to database...');

    // Password to hash
    const password = 'KDkq9{Oa-O)AEo}G';
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('📝 Creating/updating user...');

    // Try to insert, update if exists
    const result = await sql`
      INSERT INTO users (id, email, password_hash, name, is_super_admin, created_at, updated_at)
      VALUES (
        ${`user_jg_` + Date.now()},
        'jonathan@mhosaic.com',
        ${passwordHash},
        'Jonathan Gaudette',
        TRUE,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = ${passwordHash},
        is_super_admin = TRUE,
        updated_at = NOW()
      RETURNING id, email, name, is_super_admin, created_at
    `;

    if (result && result.length > 0) {
      const user = result[0];
      console.log('\n✅ SUCCESS! User created/updated:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Name:', user.name);
      console.log('   Super Admin:', user.is_super_admin);
      console.log('   Created:', user.created_at);
      console.log('\n🚀 You can now login at: https://market-intelligence-kappa.vercel.app/login');
      console.log('   Email: jonathan@mhosaic.com');
      console.log('   Password: KDkq9{Oa-O)AEo}G');
      console.log('\n⚠️  IMPORTANT: Change your password after first login!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is correct');
    console.error('   2. Check database credentials are valid');
    console.error('   3. Check network connectivity to Neon');
    console.error('   4. Try using the Neon Console SQL Editor instead:');
    console.error('      https://console.neon.tech');
    console.error('\n   See scripts/CREER_UTILISATEUR.md for detailed instructions.');

    process.exit(1);
  }
}

createUser();
