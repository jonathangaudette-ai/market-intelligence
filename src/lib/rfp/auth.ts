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
 * Type for authenticated RFP context
 */
export type RFPAuthContext = Awaited<ReturnType<typeof requireRFPAuth>>;
