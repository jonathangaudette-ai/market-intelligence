#!/usr/bin/env tsx
/**
 * Script to create a user in the production database
 * Usage: DEPLOYMENT_URL=https://market-intelligence-kappa.vercel.app npx tsx scripts/create-user.ts
 */

import { hash } from 'bcryptjs';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function createUser() {
  const email = 'jonathan@mhosaic.com';
  const password = 'KDkq9{Oa-O)AEo}G'; // TODO: Change this after first login!
  const name = 'Jonathan Gaudette';
  const isSuperAdmin = true;

  console.log('Creating user:', email);

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    console.log('✅ User already exists:', existingUser.id);
    console.log('   Email:', existingUser.email);
    console.log('   Name:', existingUser.name);
    console.log('   Super Admin:', existingUser.isSuperAdmin);
    console.log('   Created:', existingUser.createdAt);

    // Update password if needed
    console.log('\n🔐 Updating password...');
    const passwordHash = await hash(password, 10);

    await db
      .update(users)
      .set({
        passwordHash,
        isSuperAdmin: true,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));

    console.log('✅ Password updated successfully!');
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

  console.log('✅ User created successfully!');
  console.log('   ID:', newUser.id);
  console.log('   Email:', newUser.email);
  console.log('   Name:', newUser.name);
  console.log('   Super Admin:', newUser.isSuperAdmin);
  console.log('   Created:', newUser.createdAt);

  console.log('\n🚀 You can now login at: https://market-intelligence-kappa.vercel.app/login');
  console.log('⚠️  IMPORTANT: Change your password after first login!');
}

createUser()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
