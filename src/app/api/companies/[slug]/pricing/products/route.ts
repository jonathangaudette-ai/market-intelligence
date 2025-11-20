import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies, pricingProducts } from "@/db/schema";
import { eq, desc, ilike, or, and, sql, isNull } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProductsParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: ProductsParams
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 1. Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Build conditions
    const conditions = [
      eq(pricingProducts.companyId, company.id),
      isNull(pricingProducts.deletedAt), // Exclude soft-deleted products
    ];

    if (search) {
      conditions.push(
        or(
          ilike(pricingProducts.name, `%${search}%`),
          ilike(pricingProducts.sku, `%${search}%`)
        ) as any
      );
    }

    if (status === "active") {
      conditions.push(eq(pricingProducts.isActive, true));
    } else if (status === "inactive") {
      conditions.push(eq(pricingProducts.isActive, false));
    }

    // 3. Fetch products
    const products = await db
      .select()
      .from(pricingProducts)
      .where(and(...conditions))
      .orderBy(desc(pricingProducts.updatedAt))
      .limit(limit)
      .offset(offset);

    // 4. Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(and(...conditions));

    return NextResponse.json({
      products,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
