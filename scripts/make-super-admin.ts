import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function makeSuperAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/make-super-admin.ts <email>');
    process.exit(1);
  }

  try {
    console.log(`Making ${email} a super admin...`);

    const [user] = await sql`
      UPDATE users
      SET is_super_admin = true
      WHERE email = ${email}
      RETURNING id, name, email, is_super_admin
    `;

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log('✅ User is now a super admin:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Super Admin: ${user.is_super_admin}`);

    await sql.end();
  } catch (error) {
    console.error('Error making user super admin:', error);
    await sql.end();
    process.exit(1);
  }
}

makeSuperAdmin();
