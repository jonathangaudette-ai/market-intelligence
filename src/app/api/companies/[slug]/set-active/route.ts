import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { isSuperAdmin } from "@/lib/auth/helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Find company by slug
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.slug, slug), eq(companies.isActive, true)))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Verify user has access to this company (super admins bypass this check)
    const isSuper = await isSuperAdmin();

    if (!isSuper) {
      const [membership] = await db
        .select()
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, session.user.id),
            eq(companyMembers.companyId, company.id)
          )
        )
        .limit(1);

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
    // Super admins can access any company

    // Set active company cookie
    const cookieStore = await cookies();
    cookieStore.set("activeCompanyId", company.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, companyId: company.id });
  } catch (error: any) {
    console.error("Error setting active company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
