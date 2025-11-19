import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProductParams {
  params: Promise<{
    slug: string;
    productId: string;
  }>;
}

// GET /api/companies/[slug]/pricing/products/[productId]
export async function GET(
  request: NextRequest,
  { params }: ProductParams
) {
  try {
    const { slug, productId } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get product
    const [product] = await db
      .select()
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.id, productId),
          eq(pricingProducts.companyId, company.id)
        )
      )
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/companies/[slug]/pricing/products/[productId]
export async function PATCH(
  request: NextRequest,
  { params }: ProductParams
) {
  try {
    const { slug, productId } = await params;
    const body = await request.json();

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Validate product exists
    const [existingProduct] = await db
      .select()
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.id, productId),
          eq(pricingProducts.companyId, company.id)
        )
      )
      .limit(1);

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update product
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (body.currentPrice !== undefined) {
      updateData.currentPrice = body.currentPrice;
    }

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.category !== undefined) {
      updateData.category = body.category;
    }

    if (body.brand !== undefined) {
      updateData.brand = body.brand;
    }

    await db
      .update(pricingProducts)
      .set(updateData)
      .where(eq(pricingProducts.id, productId));

    // Fetch updated product
    const [updatedProduct] = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.id, productId))
      .limit(1);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[slug]/pricing/products/[productId]
export async function DELETE(
  request: NextRequest,
  { params }: ProductParams
) {
  try {
    const { slug, productId } = await params;

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete product (soft delete by setting isActive = false)
    await db
      .update(pricingProducts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pricingProducts.id, productId),
          eq(pricingProducts.companyId, company.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
