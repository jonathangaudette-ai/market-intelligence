import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  try {
    const [user] = await db.select().from(users).where(eq(users.email, "admin@example.com")).limit(1);

    if (user) {
      console.log("✅ User found in database:");
      console.log("  - Email:", user.email);
      console.log("  - Name:", user.name);
      console.log("  - ID:", user.id);
      console.log("  - Super Admin:", user.isSuperAdmin);
      console.log("  - Password hash exists:", !!user.passwordHash);
      console.log("  - Password hash length:", user.passwordHash?.length || 0);
    } else {
      console.log("❌ User NOT found in database");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
  process.exit(0);
}

checkUser();
