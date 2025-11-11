import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/helpers";

/**
 * GET /api/companies/me
 * Get user's accessible companies (own memberships OR all if super admin)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isSuperAdmin();

    // Super admins see all companies
    if (isSuper) {
      const allCompanies = await db
        .select({
          id: companies.id,
          name: companies.name,
          slug: companies.slug,
          logo: companies.logo,
          isActive: companies.isActive,
          role: companies.id, // Placeholder, will be mapped below
        })
        .from(companies)
        .where(eq(companies.isActive, true))
        .orderBy(desc(companies.createdAt));

      // Map to include admin role for all companies
      const companiesWithRole = allCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logo: c.logo,
        isActive: c.isActive,
        role: "admin" as const, // Super admins act as admin everywhere
      }));

      return NextResponse.json({ companies: companiesWithRole });
    }

    // Normal users see only their companies
    const userCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        logo: companies.logo,
        isActive: companies.isActive,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(
        and(
          eq(companyMembers.userId, session.user.id),
          eq(companies.isActive, true)
        )
      )
      .orderBy(desc(companies.createdAt));

    return NextResponse.json({ companies: userCompanies });
  } catch (error) {
    console.error("Error fetching user companies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
