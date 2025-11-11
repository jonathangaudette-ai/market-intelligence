import postgres from 'postgres';
import { hash } from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';

const sql = postgres(process.env.DATABASE_URL!);

/**
 * Generate a secure random password
 */
function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const values = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }

  return password;
}

/**
 * Setup super admins for mhosaic team
 */
async function setupSuperAdmins() {
  console.log('🔐 Configuration des super admins mhosaic...\n');

  const superAdmins = [
    { email: 'jonathan@mhosaic.com', name: 'Jonathan Gaudette' },
    { email: 'etienne@mhosaic.com', name: 'Etienne' },
  ];

  const passwords: Record<string, string> = {};

  try {
    // 1. Remove super admin from demo account
    console.log('1️⃣  Retrait du super admin de admin@example.com...');
    await sql`
      UPDATE users
      SET is_super_admin = false
      WHERE email = 'admin@example.com'
    `;
    console.log('   ✅ admin@example.com n\'est plus super admin\n');

    // 2. Create or update mhosaic super admins
    for (const admin of superAdmins) {
      console.log(`2️⃣  Configuration de ${admin.email}...`);

      // Check if user exists
      const [existingUser] = await sql`
        SELECT id, is_super_admin FROM users
        WHERE email = ${admin.email}
      `;

      if (existingUser) {
        // Update existing user to super admin
        await sql`
          UPDATE users
          SET is_super_admin = true, updated_at = NOW()
          WHERE email = ${admin.email}
        `;
        console.log(`   ✅ ${admin.email} est maintenant super admin`);

        // Don't generate new password if user exists
        console.log(`   ℹ️  Le mot de passe existant est conservé\n`);
      } else {
        // Create new user with secure password
        const password = generateSecurePassword(16);
        passwords[admin.email] = password;
        const passwordHash = await hash(password, 10);
        const userId = createId();

        await sql`
          INSERT INTO users (id, email, name, password_hash, is_super_admin, created_at, updated_at)
          VALUES (${userId}, ${admin.email}, ${admin.name}, ${passwordHash}, true, NOW(), NOW())
        `;

        console.log(`   ✅ ${admin.email} créé comme super admin`);
        console.log(`   🔑 Mot de passe temporaire: ${password}`);
        console.log(`   ⚠️  À CHANGER AU PREMIER LOGIN\n`);
      }
    }

    // 3. Summary
    console.log('━'.repeat(60));
    console.log('📊 RÉSUMÉ\n');

    const [adminCount] = await sql`
      SELECT COUNT(*) as count FROM users WHERE is_super_admin = true
    `;

    console.log(`✅ ${adminCount.count} super admin(s) configuré(s):`);

    const superAdminsList = await sql`
      SELECT email, name, is_super_admin
      FROM users
      WHERE is_super_admin = true
      ORDER BY email
    `;

    superAdminsList.forEach((user: any) => {
      console.log(`   • ${user.email} (${user.name || 'Sans nom'})`);
    });

    // 4. Display new passwords if any
    if (Object.keys(passwords).length > 0) {
      console.log('\n🔐 MOTS DE PASSE TEMPORAIRES (à changer au premier login):');
      console.log('━'.repeat(60));
      for (const [email, password] of Object.entries(passwords)) {
        console.log(`\n${email}`);
        console.log(`Mot de passe: ${password}`);
        console.log('\n⚠️  IMPORTANT:');
        console.log('   1. Sauvegardez ce mot de passe temporaire de manière sécurisée');
        console.log('   2. Connectez-vous avec ce mot de passe');
        console.log('   3. Changez-le immédiatement via Paramètres > Sécurité');
      }
      console.log('\n' + '━'.repeat(60));
    }

    console.log('\n✅ Configuration terminée!');
    console.log('🚀 Les super admins peuvent maintenant:');
    console.log('   • Créer de nouvelles compagnies');
    console.log('   • Accéder à toutes les compagnies');
    console.log('   • Gérer les utilisateurs de toutes les compagnies\n');

    await sql.end();
  } catch (error) {
    console.error('❌ Erreur lors de la configuration des super admins:', error);
    await sql.end();
    process.exit(1);
  }
}

setupSuperAdmins();
