import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/helpers";
import { eq } from "drizzle-orm";

interface CreateCompanyRequest {
  name: string;
  slug: string;
  logo?: string;
}

/**
 * POST /api/admin/companies/create
 * Create a new company (super admin only)
 * Super admin automatically becomes first member with admin role
 */
export async function POST(request: NextRequest) {
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

    const body: CreateCompanyRequest = await request.json();
    const { name, slug, logo } = body;

    // Validation
    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase alphanumeric with hyphens only" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const [existing] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Company slug already exists" },
        { status: 409 }
      );
    }

    // Create company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name,
        slug,
        logo: logo || null,
        isActive: true,
      })
      .returning();

    // Add super admin as first member with admin role
    await db.insert(companyMembers).values({
      userId: session.user.id,
      companyId: newCompany.id,
      role: "admin",
    });

    console.log(`[Admin] Company created: ${newCompany.name} (${newCompany.slug}) by ${session.user.email}`);

    return NextResponse.json(
      {
        success: true,
        company: {
          id: newCompany.id,
          name: newCompany.name,
          slug: newCompany.slug,
          logo: newCompany.logo,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin] Error creating company:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
