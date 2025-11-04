/**
 * Reusable authorization middleware for API routes
 * Eliminates 20-30 lines of duplicate code in every route
 */

import { NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany, hasPermission } from "@/lib/auth/helpers";

export interface AuthContext {
  session: Awaited<ReturnType<typeof verifyAuth>>["session"];
  company: NonNullable<Awaited<ReturnType<typeof getCurrentCompany>>>;
}

export type AuthResult =
  | { success: true; data: AuthContext }
  | { success: false; error: NextResponse };

/**
 * Verify authentication and company context
 * @param requiredRole - Minimum role required ("viewer", "editor", "admin")
 * @param slugToVerify - Optional company slug to verify against current company
 */
export async function requireAuth(
  requiredRole: "viewer" | "editor" | "admin" = "viewer",
  slugToVerify?: string
): Promise<AuthResult> {
  // 1. Verify authentication
  const { error: authError, session } = await verifyAuth();
  if (!session) {
    return {
      success: false,
      error: authError,
    };
  }

  // 2. Verify company context
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return {
      success: false,
      error: NextResponse.json({ error: "No active company" }, { status: 403 }),
    };
  }

  // 3. Check permissions
  if (!hasPermission(currentCompany.role, requiredRole)) {
    return {
      success: false,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  // 4. Verify company slug if provided
  if (slugToVerify && currentCompany.company.slug !== slugToVerify) {
    return {
      success: false,
      error: NextResponse.json({ error: "Company mismatch" }, { status: 403 }),
    };
  }

  return {
    success: true,
    data: {
      session,
      company: currentCompany,
    },
  };
}

/**
 * Verify document ownership
 * Ensures the document belongs to the authenticated company
 */
export async function requireDocumentAccess(
  documentId: string,
  companyId: string
): Promise<{ success: boolean; error?: NextResponse }> {
  const { db } = await import("@/db");
  const { documents } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [document] = await db
    .select({ companyId: documents.companyId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document) {
    return {
      success: false,
      error: NextResponse.json({ error: "Document not found" }, { status: 404 }),
    };
  }

  if (document.companyId !== companyId) {
    return {
      success: false,
      error: NextResponse.json({ error: "Unauthorized access to document" }, { status: 403 }),
    };
  }

  return { success: true };
}

/**
 * Create standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
) {
  const response: any = { error: code, message };
  if (details) {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}
