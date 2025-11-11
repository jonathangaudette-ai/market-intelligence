import { auth } from '@/lib/auth/config';
import { verifyAuth, getCurrentCompany, hasPermission } from '@/lib/auth/helpers';
import { NextResponse } from 'next/server';

/**
 * Verify authentication for RFP routes
 * Returns session and user info if authenticated, or error response
 */
export async function verifyRFPAuth() {
  return verifyAuth();
}

/**
 * Get current user for RFP operations
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name || null,
    isSuperAdmin: session.user.isSuperAdmin,
  };
}

/**
 * Get current company context for RFP operations
 */
export async function getRFPCompanyContext() {
  return getCurrentCompany();
}

/**
 * Check if user can create RFPs
 * Requires at least 'editor' role
 */
export async function canCreateRFP(): Promise<boolean> {
  const context = await getCurrentCompany();

  if (!context) {
    return false;
  }

  return hasPermission(context.role, 'editor');
}

/**
 * Check if user can edit a specific RFP
 * User must be:
 * - The owner of the RFP, OR
 * - Assigned to the RFP, OR
 * - An admin in the company
 */
export async function canEditRFP(rfpOwnerId: string, rfpAssignedUsers?: string[]): Promise<boolean> {
  const context = await getCurrentCompany();
  const user = await getCurrentUser();

  if (!context || !user) {
    return false;
  }

  // Super admins can edit anything
  if (user.isSuperAdmin) {
    return true;
  }

  // Company admins can edit anything in their company
  if (hasPermission(context.role, 'admin')) {
    return true;
  }

  // Owners can edit their own RFPs
  if (rfpOwnerId === user.id) {
    return true;
  }

  // Assigned users can edit
  if (rfpAssignedUsers && rfpAssignedUsers.includes(user.id)) {
    return true;
  }

  return false;
}

/**
 * Check if user can view a specific RFP
 * More permissive than edit - any company member can view
 */
export async function canViewRFP(): Promise<boolean> {
  const context = await getCurrentCompany();
  return context !== null;
}

/**
 * Check if user can delete an RFP
 * Requires admin role or being the owner
 */
export async function canDeleteRFP(rfpOwnerId: string): Promise<boolean> {
  const context = await getCurrentCompany();
  const user = await getCurrentUser();

  if (!context || !user) {
    return false;
  }

  // Super admins can delete anything
  if (user.isSuperAdmin) {
    return true;
  }

  // Company admins can delete anything in their company
  if (hasPermission(context.role, 'admin')) {
    return true;
  }

  // Owners can delete their own RFPs
  if (rfpOwnerId === user.id) {
    return true;
  }

  return false;
}

/**
 * Check if user can manage the answer library
 * Requires at least editor role
 */
export async function canManageLibrary(): Promise<boolean> {
  const context = await getCurrentCompany();

  if (!context) {
    return false;
  }

  return hasPermission(context.role, 'editor');
}

/**
 * Check if user can approve library responses
 * Requires admin role
 */
export async function canApproveLibraryResponses(): Promise<boolean> {
  const context = await getCurrentCompany();

  if (!context) {
    return false;
  }

  return hasPermission(context.role, 'admin');
}

/**
 * Helper to return unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Helper to return forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Middleware helper to protect RFP API routes
 * Usage in API routes:
 *
 * ```ts
 * export async function GET(request: Request) {
 *   const authResult = await requireRFPAuth();
 *   if (authResult.error) return authResult.error;
 *
 *   // Continue with authenticated request
 *   const { user, company } = authResult;
 *   // ...
 * }
 * ```
 */
export async function requireRFPAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      error: unauthorizedResponse('Authentication required'),
      user: null,
      company: null,
    };
  }

  const company = await getCurrentCompany();

  if (!company) {
    return {
      error: forbiddenResponse('No active company context'),
      user: session.user,
      company: null,
    };
  }

  return {
    error: null,
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name || null,
      isSuperAdmin: session.user.isSuperAdmin,
    },
    company: {
      id: company.company.id,
      name: company.company.name,
      role: company.role,
    },
  };
}

/**
 * Get company by slug and verify user access
 * Returns company data if user has access, null otherwise
 */
export async function getCompanyBySlug(slug: string) {
  const { db } = await import('@/db');
  const { companies, companyMembers } = await import('@/db/schema');
  const { eq, and } = await import('drizzle-orm');

  const session = await auth();
  if (!session?.user) {
    return null;
  }

  // Find company by slug
  const [company] = await db
    .select()
    .from(companies)
    .where(and(
      eq(companies.slug, slug),
      eq(companies.isActive, true)
    ))
    .limit(1);

  if (!company) {
    return null;
  }

  // Super admins can access any company
  if (session.user.isSuperAdmin) {
    return {
      company,
      role: 'admin' as const,
      userId: session.user.id,
    };
  }

  // Verify user has access to this company
  const [membership] = await db
    .select({
      role: companyMembers.role,
    })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.companyId, company.id)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return {
    company,
    role: membership.role,
    userId: session.user.id,
  };
}

/**
 * Middleware helper to protect RFP API routes with optional slug-based auth
 * Accepts an optional company slug parameter. If provided, will validate access
 * to that specific company. Otherwise falls back to cookie-based getCurrentCompany()
 *
 * Usage in API routes:
 *
 * ```ts
 * export async function POST(request: Request) {
 *   const formData = await request.formData();
 *   const companySlug = formData.get('companySlug') as string | null;
 *
 *   const authResult = await requireRFPAuthWithSlug(companySlug);
 *   if (authResult.error) return authResult.error;
 *
 *   // Continue with authenticated request
 *   const { user, company } = authResult;
 *   // ...
 * }
 * ```
 */
export async function requireRFPAuthWithSlug(companySlug?: string | null) {
  const session = await auth();

  if (!session?.user) {
    return {
      error: unauthorizedResponse('Authentication required'),
      user: null,
      company: null,
    };
  }

  // If slug provided, use slug-based auth
  if (companySlug) {
    const companyContext = await getCompanyBySlug(companySlug);

    if (!companyContext) {
      return {
        error: forbiddenResponse('Access denied to this company'),
        user: session.user,
        company: null,
      };
    }

    return {
      error: null,
      user: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || null,
        isSuperAdmin: session.user.isSuperAdmin,
      },
      company: {
        id: companyContext.company.id,
        name: companyContext.company.name,
        role: companyContext.role,
      },
    };
  }

  // Fall back to cookie-based auth for backward compatibility
  const company = await getCurrentCompany();

  if (!company) {
    return {
      error: forbiddenResponse('No active company context'),
      user: session.user,
      company: null,
    };
  }

  return {
    error: null,
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name || null,
      isSuperAdmin: session.user.isSuperAdmin,
    },
    company: {
      id: company.company.id,
      name: company.company.name,
      role: company.role,
    },
  };
}

/**
 * Type for authenticated RFP context
 */
export type RFPAuthContext = Awaited<ReturnType<typeof requireRFPAuth>>;
