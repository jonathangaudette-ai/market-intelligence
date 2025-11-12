import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/db';
import { companies, companyMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

/**
 * POST /api/companies/[slug]/set-active
 * Set the active company for the current user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

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
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Verify user has access to this company (unless super admin)
    if (!session.user.isSuperAdmin) {
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
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Set cookie for active company
    const cookieStore = await cookies();
    cookieStore.set('active-company-slug', slug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    });
  } catch (error) {
    console.error('Error setting active company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
