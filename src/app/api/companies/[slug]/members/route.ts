import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyMembers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCompanyBySlug } from '@/lib/rfp/auth';

/**
 * GET /api/companies/[slug]/members
 * Get all members of a company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company access
    const companyContext = await getCompanyBySlug(slug);
    if (!companyContext) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Get all members of this company with user details
    const members = await db
      .select({
        id: companyMembers.id,
        userId: companyMembers.userId,
        role: companyMembers.role,
        userName: users.name,
        userEmail: users.email,
        createdAt: companyMembers.createdAt,
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, companyContext.company.id));

    return NextResponse.json({
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.userName || m.userEmail,
        email: m.userEmail,
        role: m.role,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Company Members Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get company members',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
