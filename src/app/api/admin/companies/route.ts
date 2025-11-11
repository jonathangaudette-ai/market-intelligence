import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/helpers";

/**
 * GET /api/admin/companies
 * List all companies (super admin only)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isSuperAdmin();
    if (!isSuper) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    const allCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logo: companies.logo,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .orderBy(desc(companies.createdAt));

    return NextResponse.json({ companies: allCompanies });
  } catch (error) {
    console.error("[Admin] Error fetching companies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
