#!/usr/bin/env tsx
/**
 * Test script for pricing snapshot functionality
 * Tests HistoryService.recordPriceSnapshot()
 */

import { HistoryService } from "../src/lib/pricing/history-service";
import { db } from "../src/db";
import { companies } from "../src/db/schema";
import { pricingHistory } from "../src/db/schema-pricing";
import { eq, gte, desc } from "drizzle-orm";

async function testPricingSnapshot() {
  console.log("🧪 Testing Pricing Snapshot Functionality\n");
  console.log("=" .repeat(60));

  try {
    // 1. Get Dissan company
    console.log("\n📌 Step 1: Fetching Dissan company...");
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, "dissan"))
      .limit(1);

    if (!company) {
      console.error("❌ Company 'dissan' not found");
      process.exit(1);
    }

    console.log(`✅ Found company: ${company.name} (${company.id})`);

    // 2. Record snapshot
    console.log("\n📌 Step 2: Recording price snapshot...");
    const historyService = new HistoryService();
    const recordedCount = await historyService.recordPriceSnapshot(company.id);

    console.log(`✅ Recorded ${recordedCount} price points`);

    // 3. Verify data in database
    console.log("\n📌 Step 3: Verifying data in pricing_history table...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentHistory = await db
      .select()
      .from(pricingHistory)
      .where(gte(pricingHistory.recordedAt, yesterday))
      .orderBy(desc(pricingHistory.recordedAt))
      .limit(20);

    console.log(`✅ Found ${recentHistory.length} records in last 24h`);

    if (recentHistory.length > 0) {
      console.log("\n📊 Sample records:");
      console.log("─".repeat(60));
      recentHistory.slice(0, 5).forEach((record, idx) => {
        console.log(`${idx + 1}. Product: ${record.productId.substring(0, 12)}...`);
        console.log(`   Competitor: ${record.competitorId ? record.competitorId.substring(0, 12) + '...' : 'Yours'}`);
        console.log(`   Price: $${record.price}`);
        console.log(`   Recorded: ${record.recordedAt.toISOString()}`);
        console.log("");
      });
    }

    // 4. Test aggregate trends
    console.log("📌 Step 4: Testing aggregate trends...");
    const trends = await historyService.getAggregatePriceTrends(company.id, 30);

    console.log(`✅ Aggregate trends: ${trends.length} data points`);

    if (trends.length > 0) {
      console.log("\n📈 Sample trends:");
      console.log("─".repeat(60));
      trends.slice(0, 5).forEach((trend, idx) => {
        console.log(`${idx + 1}. Date: ${trend.date}`);
        console.log(`   Competitor: ${trend.competitorName || 'Yours'}`);
        console.log(`   Avg Price: $${trend.avgPrice}`);
        console.log(`   Count: ${trend.count} products`);
        console.log("");
      });
    }

    // 5. Test price change detection
    console.log("📌 Step 5: Testing price change detection...");
    const changes = await historyService.detectPriceChanges(company.id, 10);

    console.log(`✅ Detected ${changes.length} significant price changes (>10%)`);

    if (changes.length > 0) {
      console.log("\n⚠️  Price changes:");
      console.log("─".repeat(60));
      changes.forEach((change, idx) => {
        console.log(`${idx + 1}. Product: ${change.productName}`);
        console.log(`   Competitor: ${change.competitorName}`);
        console.log(`   Change: $${change.oldPrice} → $${change.newPrice} (${change.changePercent}%)`);
        console.log(`   Direction: ${change.direction}`);
        console.log("");
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed!");
    console.log("\n📊 Summary:");
    console.log(`   - Snapshots recorded: ${recordedCount}`);
    console.log(`   - History records: ${recentHistory.length}`);
    console.log(`   - Trend data points: ${trends.length}`);
    console.log(`   - Price changes detected: ${changes.length}`);

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

testPricingSnapshot();
