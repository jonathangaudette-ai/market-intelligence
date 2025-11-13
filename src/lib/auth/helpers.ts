import { NextResponse } from "next/server";
import { auth } from "./config";
import type { Session } from "next-auth";

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

export async function getCurrentCompany(slugOverride?: string) {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  // Get active company from cookie (implementation in middleware)
  // This would be set by the company switcher component
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const activeCompanySlug = cookieStore.get("active-company-slug")?.value;

  // Use slug override if provided, otherwise fallback to cookie
  const slug = slugOverride || activeCompanySlug;

  if (!slug) {
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
        eq(companies.slug, slug),
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

/**
 * Check if current user is a super admin
 * Super admins can bypass company membership checks and create companies
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.isSuperAdmin ?? false;
}

/**
 * Get current company with super admin bypass
 * Super admins can access any company without membership requirement
 */
export async function getCurrentCompanyForSuperAdmin(
  forceCompanyId?: string
): Promise<Awaited<ReturnType<typeof getCurrentCompany>>> {
  const session = await auth();
  if (!session?.user) return null;

  // If super admin and forceCompanyId provided, get that company directly
  if (session.user.isSuperAdmin && forceCompanyId) {
    const { db } = await import("@/db");
    const { companies } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, forceCompanyId))
      .limit(1);

    if (company) {
      return {
        company,
        role: "admin" as const, // Super admins act as admins
        userId: session.user.id,
      };
    }
  }

  // Otherwise use normal flow
  return getCurrentCompany();
}

/**
 * Type for auth result (success or error response)
 */
export type AuthResult =
  | {
      success: true;
      data: {
        session: Session;
        company: NonNullable<Awaited<ReturnType<typeof getCurrentCompany>>>;
      };
    }
  | {
      success: false;
      error: NextResponse;
    };

/**
 * Require authentication with company and role verification
 * Use this in API routes that need company-scoped access
 */
export async function requireAuth(
  requiredRole: "viewer" | "editor" | "admin" = "viewer"
): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const companyContext = await getCurrentCompany();
  if (!companyContext) {
    return {
      success: false,
      error: NextResponse.json({ error: "No active company" }, { status: 403 }),
    };
  }

  if (!hasPermission(companyContext.role, requiredRole)) {
    return {
      success: false,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  return {
    success: true,
    data: { session, company: companyContext },
  };
}

/**
 * Middleware variant that allows super admins to bypass company membership
 * Super admins always have admin-level access to any company
 */
export async function requireAuthOrSuperAdmin(
  requiredRole: "viewer" | "editor" | "admin" = "viewer"
): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      success: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Super admins bypass all company checks
  if (session.user.isSuperAdmin) {
    const companyContext = await getCurrentCompany();
    if (companyContext) {
      return {
        success: true,
        data: { session, company: companyContext },
      };
    }
    // If super admin has no company context, still allow (they can access admin routes)
    return {
      success: false,
      error: NextResponse.json({ error: "No active company" }, { status: 403 }),
    };
  }

  // Normal users use regular auth flow
  return requireAuth(requiredRole);
}
