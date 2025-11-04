/**
 * Script to create a test user and company
 * Run: npx tsx scripts/create-test-user.ts
 */

import { db } from "../src/db/index";
import { users, companies, companyMembers } from "../src/db/schema";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

async function createTestUser() {
  console.log("🚀 Creating test user and company...\n");

  try {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@example.com"))
      .limit(1);

    let user;
    if (existingUser) {
      console.log("✅ User admin@example.com already exists");
      user = existingUser;
    } else {
      // Create user
      const passwordHash = await hash("password123", 10);
      [user] = await db
        .insert(users)
        .values({
          email: "admin@example.com",
          passwordHash,
          name: "Admin User",
          isSuperAdmin: true,
        })
        .returning();

      console.log("✅ Created user: admin@example.com");
    }

    // Check if company already exists
    const [existingCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, "demo-company"))
      .limit(1);

    let company;
    if (existingCompany) {
      console.log("✅ Company 'demo-company' already exists");
      company = existingCompany;
    } else {
      // Create company
      [company] = await db
        .insert(companies)
        .values({
          name: "Demo Company",
          slug: "demo-company",
          isActive: true,
        })
        .returning();

      console.log("✅ Created company: Demo Company (slug: demo-company)");
    }

    // Check if membership already exists
    const [existingMembership] = await db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.userId, user.id))
      .limit(1);

    if (!existingMembership) {
      // Create company membership
      await db.insert(companyMembers).values({
        userId: user.id,
        companyId: company.id,
        role: "admin",
      });

      console.log("✅ Added user to company as admin");
    } else {
      console.log("✅ User is already a member of the company");
    }

    console.log("\n✨ Setup complete!");
    console.log("\n📋 Login credentials:");
    console.log("   Email: admin@example.com");
    console.log("   Password: password123");
    console.log("\n🌐 Access the app:");
    console.log("   Local: http://localhost:3000");
    console.log("   Production: https://market-intelligence-kappa.vercel.app");
    console.log("\n🔐 After login, you'll be redirected to:");
    console.log("   /companies/demo-company/dashboard");
  } catch (error) {
    console.error("❌ Error creating test user:", error);
    process.exit(1);
  }
}

createTestUser();
