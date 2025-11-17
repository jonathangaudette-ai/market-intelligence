#!/usr/bin/env tsx
/**
 * Script to create a super admin user
 * Usage:
 *   Local: npx tsx scripts/create-super-admin.ts <email> <name> [password]
 *   Prod:  DEPLOYMENT_URL=https://market-intelligence-kappa.vercel.app npx tsx scripts/create-super-admin.ts <email> <name> [password]
 *
 * Example: npx tsx scripts/create-super-admin.ts admin@company.com "Admin Name" "MyPassword123!"
 */

import { hash } from 'bcryptjs';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function createSuperAdmin() {
  // Get arguments from command line
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Usage: npx tsx scripts/create-super-admin.ts <email> <name> [password]');
    console.error('   Example: npx tsx scripts/create-super-admin.ts admin@company.com "Admin Name" "MyPassword123!"');
    process.exit(1);
  }

  const email = args[0];
  const name = args[1];
  const password = args[2] || generateSecurePassword();
  const isSuperAdmin = true;

  console.log('📋 Creating super admin user:');
  console.log('   Email:', email);
  console.log('   Name:', name);
  console.log('   Password:', password);
  console.log('');

  // Validate email format
  if (!email.includes('@')) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    console.log('⚠️  User already exists!');
    console.log('   Current Super Admin status:', existingUser.isSuperAdmin);
    console.log('');

    // Ask to update
    console.log('🔄 Updating user to super admin and changing password...');
    const passwordHash = await hash(password, 10);

    await db
      .update(users)
      .set({
        passwordHash,
        isSuperAdmin: true,
        name,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));

    console.log('✅ User updated successfully!');
    console.log('   ID:', existingUser.id);
    console.log('   Email:', existingUser.email);
    console.log('   Name:', name);
    console.log('   Super Admin: true');
    console.log('');
    console.log('🔐 New password:', password);
    return;
  }

  // Hash password
  console.log('🔐 Hashing password...');
  const passwordHash = await hash(password, 10);

  // Create user
  console.log('📝 Creating user in database...');
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
      isSuperAdmin,
    })
    .returning();

  console.log('✅ Super admin created successfully!');
  console.log('');
  console.log('📋 User Details:');
  console.log('   ID:', newUser.id);
  console.log('   Email:', newUser.email);
  console.log('   Name:', newUser.name);
  console.log('   Super Admin:', newUser.isSuperAdmin);
  console.log('   Created:', newUser.createdAt);
  console.log('');
  console.log('🔐 Password:', password);
  console.log('');
  console.log('🚀 Login URL:', process.env.DEPLOYMENT_URL || 'http://localhost:3000');
  console.log('⚠️  IMPORTANT: Save this password securely!');
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let password = '';

  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

createSuperAdmin()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
