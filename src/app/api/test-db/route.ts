import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Test database connection
    const [user] = await db
      .select({
        email: users.email,
        name: users.name,
        hasPassword: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, "admin@example.com"))
      .limit(1);

    if (user) {
      return NextResponse.json({
        success: true,
        message: "Database connection OK",
        user: {
          email: user.email,
          name: user.name,
          hasPassword: !!user.hasPassword,
        },
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasAuthSecret: !!process.env.AUTH_SECRET,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "User not found in database",
        env: {
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasAuthSecret: !!process.env.AUTH_SECRET,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
      },
    }, { status: 500 });
  }
}
