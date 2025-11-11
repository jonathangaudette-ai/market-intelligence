import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companies, companyMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { isSuperAdmin } from '@/lib/auth/helpers';
import { z } from 'zod';
import { AI_MODELS, type CompanySettings } from '@/types/company';

// Validation schema for settings update
const SettingsUpdateSchema = z.object({
  aiModel: z.enum([AI_MODELS.SONNET_4_5, AI_MODELS.HAIKU_4_5]).optional(),
});

/**
 * GET /api/companies/[slug]/settings
 * Get company settings (admin only)
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

    // Get company
    const [company] = await db
      .select({
        id: companies.id,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is super admin or company admin
    const isSuper = await isSuperAdmin();
    if (!isSuper) {
      const [membership] = await db
        .select({ role: companyMembers.role })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.companyId, company.id),
            eq(companyMembers.userId, session.user.id)
          )
        )
        .limit(1);

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can view company settings' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      settings: company.settings || {},
    });
  } catch (error) {
    console.error('[Settings GET Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to get settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/[slug]/settings
 * Update company settings (admin only)
 */
export async function PUT(
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

    // Parse and validate request body
    const body = await request.json();
    const validation = SettingsUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const newSettings = validation.data;

    // Get company
    const [company] = await db
      .select({
        id: companies.id,
        settings: companies.settings,
      })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is super admin or company admin
    const isSuper = await isSuperAdmin();
    if (!isSuper) {
      const [membership] = await db
        .select({ role: companyMembers.role })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.companyId, company.id),
            eq(companyMembers.userId, session.user.id)
          )
        )
        .limit(1);

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can update company settings' },
          { status: 403 }
        );
      }
    }

    // Merge new settings with existing settings
    const currentSettings = (company.settings as CompanySettings) || {};
    const updatedSettings: CompanySettings = {
      ...currentSettings,
      ...newSettings,
    };

    // Update company settings
    const [updatedCompany] = await db
      .update(companies)
      .set({
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id))
      .returning({
        id: companies.id,
        settings: companies.settings,
      });

    return NextResponse.json({
      success: true,
      settings: updatedCompany.settings,
    });
  } catch (error) {
    console.error('[Settings PUT Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
