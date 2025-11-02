/**
 * Database seeding script
 * Run with: npx tsx scripts/seed.ts
 */

import { db } from "../src/db";
import { users, companies, companyMembers } from "../src/db/schema";
import { hash } from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create super admin user
    const passwordHash = await hash("password123", 10);

    const [user] = await db
      .insert(users)
      .values({
        id: createId(),
        email: "admin@example.com",
        passwordHash,
        name: "Super Admin",
        isSuperAdmin: true,
      })
      .returning();

    console.log("✅ Created super admin user:", user.email);

    // Create demo company
    const [company] = await db
      .insert(companies)
      .values({
        id: createId(),
        name: "Demo Company",
        slug: "demo-company",
      })
      .returning();

    console.log("✅ Created demo company:", company.name);

    // Add user to company as admin
    await db.insert(companyMembers).values({
      userId: user.id,
      companyId: company.id,
      role: "admin",
    });

    console.log("✅ Added user to company as admin");

    console.log("\n🎉 Seeding complete!");
    console.log("\n📝 Login credentials:");
    console.log("   Email: admin@example.com");
    console.log("   Password: password123");
    console.log("\n🔗 Access the app at: http://localhost:3000");
    console.log(`🏢 Company slug: ${company.slug}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
