import { db } from "@/db";
import { pricingHistory, pricingProducts, pricingMatches, pricingCompetitors } from "@/db/schema-pricing";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export class HistoryService {
  /**
   * Record price snapshot for all active products (yours + competitors)
   */
  async recordPriceSnapshot(companyId: string): Promise<number> {
    let recordedCount = 0;

    // 1. Record YOUR prices (from products catalog)
    const products = await db
      .select()
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingProducts.isActive, true)
        )
      );

    for (const product of products) {
      if (product.currentPrice) {
        await this.recordPrice(
          product.id,
          parseFloat(product.currentPrice),
          null // Your product, no competitor
        );
        recordedCount++;
      }
    }

    // 2. Record COMPETITOR prices (from matches)
    const matches = await db
      .select({
        match: pricingMatches,
        product: pricingProducts,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(eq(pricingProducts.companyId, companyId));

    for (const { match } of matches) {
      if (match.price) {
        await this.recordPrice(
          match.productId,
          parseFloat(match.price),
          match.competitorId
        );
        recordedCount++;
      }
    }

    return recordedCount;
  }

  /**
   * Record a single price point
   */
  async recordPrice(
    productId: string,
    price: number,
    competitorId: string | null
  ): Promise<void> {
    const historyId = createId();

    await db.insert(pricingHistory).values({
      id: historyId,
      productId,
      competitorId,
      price: price.toString(), // Decimal stored as string
      recordedAt: new Date(),
      createdAt: new Date(),
    });
  }

  /**
   * Get price history for a product (last N days)
   */
  async getPriceHistory(
    productId: string,
    days: number = 30
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const history = await db
      .select()
      .from(pricingHistory)
      .where(
        and(
          eq(pricingHistory.productId, productId),
          gte(pricingHistory.recordedAt, dateThreshold)
        )
      )
      .orderBy(desc(pricingHistory.recordedAt));

    return history;
  }

  /**
   * Get aggregated price trends for dashboard chart
   * Groups by date and competitor, returning average prices per day
   */
  async getAggregatePriceTrends(
    companyId: string,
    days: number = 30
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get daily average prices grouped by date and competitor
    const trends = await db
      .select({
        date: sql<string>`DATE(${pricingHistory.recordedAt})`,
        competitorId: pricingHistory.competitorId,
        competitorName: pricingCompetitors.name,
        avgPrice: sql<string>`AVG(${pricingHistory.price})::numeric(10,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(pricingHistory)
      .innerJoin(pricingProducts, eq(pricingHistory.productId, pricingProducts.id))
      .leftJoin(pricingCompetitors, eq(pricingHistory.competitorId, pricingCompetitors.id))
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          gte(pricingHistory.recordedAt, dateThreshold)
        )
      )
      .groupBy(
        sql`DATE(${pricingHistory.recordedAt})`,
        pricingHistory.competitorId,
        pricingCompetitors.name
      )
      .orderBy(sql`DATE(${pricingHistory.recordedAt})`);

    return trends;
  }

  /**
   * Detect significant price changes (> threshold % in last 24h)
   */
  async detectPriceChanges(
    companyId: string,
    thresholdPercent: number = 10
  ): Promise<any[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get prices from last 24h
    const recentHistory = await db
      .select({
        productId: pricingHistory.productId,
        productName: pricingProducts.name,
        competitorId: pricingHistory.competitorId,
        competitorName: pricingCompetitors.name,
        price: pricingHistory.price,
        recordedAt: pricingHistory.recordedAt,
      })
      .from(pricingHistory)
      .innerJoin(pricingProducts, eq(pricingHistory.productId, pricingProducts.id))
      .leftJoin(pricingCompetitors, eq(pricingHistory.competitorId, pricingCompetitors.id))
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          gte(pricingHistory.recordedAt, yesterday)
        )
      )
      .orderBy(pricingHistory.productId, pricingHistory.recordedAt);

    // Group by product + competitor and detect changes
    const changes: any[] = [];
    const grouped = new Map<string, any[]>();

    recentHistory.forEach((record) => {
      const key = `${record.productId}_${record.competitorId || "yours"}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    });

    grouped.forEach((records) => {
      if (records.length < 2) return;

      const oldest = records[0];
      const newest = records[records.length - 1];

      const oldPrice = parseFloat(oldest.price);
      const newPrice = parseFloat(newest.price);
      const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

      if (Math.abs(changePercent) >= thresholdPercent) {
        changes.push({
          productId: oldest.productId,
          productName: oldest.productName,
          competitorId: oldest.competitorId,
          competitorName: oldest.competitorName || "Vous",
          oldPrice,
          newPrice,
          changePercent: changePercent.toFixed(2),
          direction: changePercent > 0 ? "increase" : "decrease",
          detectedAt: new Date(),
        });
      }
    });

    return changes;
  }
}
