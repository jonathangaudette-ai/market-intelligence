import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts, pricingMatches } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

interface BulkDeleteParams {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * DELETE /api/companies/[slug]/pricing/products/bulk-delete
 * Delete all products for a company (DANGEROUS - use with caution)
 */
export async function DELETE(
  request: NextRequest,
  { params }: BulkDeleteParams
) {
  try {
    const { slug } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Count products before deletion
    const existingProducts = await db
      .select()
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt)
        )
      );

    const productCount = existingProducts.length;

    if (productCount === 0) {
      return NextResponse.json({
        message: "No products to delete",
        deletedCount: 0,
      });
    }

    // Delete all matches first (foreign key constraint)
    const productIds = existingProducts.map((p) => p.id);

    if (productIds.length > 0) {
      // Delete matches in batches to avoid query limits
      const batchSize = 100;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        await db
          .delete(pricingMatches)
          .where(
            batch.reduce(
              (acc, id) =>
                acc ? { type: 'or', left: acc, right: eq(pricingMatches.productId, id) } : eq(pricingMatches.productId, id),
              null as any
            )
          );
      }
    }

    // Soft delete all products (set deletedAt)
    await db
      .update(pricingProducts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          isNull(pricingProducts.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: `${productCount} products deleted successfully`,
      deletedCount: productCount,
    });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
