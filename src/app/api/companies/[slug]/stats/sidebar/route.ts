import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companies, companyMembers, documents, messages, conversations } from '@/db/schema';
import { eq, and, count, gte } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    // Get company by slug
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.slug, slug), eq(companies.isActive, true)))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Verify user has access (unless super admin)
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
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count documents
    const [docCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.companyId, company.id));

    // Count messages this month
    const [messageCount] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.companyId, company.id),
          gte(messages.createdAt, firstDayOfMonth)
        )
      );

    return NextResponse.json({
      messages: messageCount?.count || 0,
      documents: docCount?.count || 0,
    });
  } catch (error) {
    console.error('Sidebar stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
