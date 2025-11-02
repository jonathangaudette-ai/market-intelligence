import { NextRequest, NextResponse } from "next/server";
import { auth } from "./config";

export async function verifyAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return {
    error: null,
    session,
  };
}

export async function getCurrentCompany() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Get active company from cookie (implementation in middleware)
  // This would be set by the company switcher component
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get("activeCompanyId")?.value;

  if (!activeCompanyId) {
    return null;
  }

  // Verify user has access to this company
  const { db } = await import("@/db");
  const { companies, companyMembers } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const [membership] = await db
    .select({
      company: companies,
      role: companyMembers.role,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.companyId, activeCompanyId),
        eq(companies.isActive, true)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return {
    company: membership.company,
    role: membership.role,
    userId: session.user.id,
  };
}

export function hasPermission(role: string, requiredRole: "admin" | "editor" | "viewer") {
  const roleHierarchy = {
    admin: 3,
    editor: 2,
    viewer: 1,
  };

  return roleHierarchy[role as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}
