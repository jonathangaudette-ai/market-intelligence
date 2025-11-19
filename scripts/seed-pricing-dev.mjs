#!/usr/bin/env node
/**
 * Seed pricing module with development data
 * Phase 1: Database Schema & Migrations
 *
 * Creates:
 * - 2 test products (cleaning supplies)
 * - 1 competitor (Swish)
 * - 30 days of price history for product 1
 */

import postgres from 'postgres';
import { createId } from '@paralleldrive/cuid2';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

try {
  console.log('🌱 Seeding pricing module with dev data...\n');

  // 1. Find existing company
  console.log('1️⃣  Finding existing company...');
  const companies = await sql`SELECT id, name FROM companies LIMIT 1`;

  if (companies.length === 0) {
    console.error('❌ No company found. Please create a company first.');
    await sql.end();
    process.exit(1);
  }

  const companyId = companies[0].id;
  console.log(`   ✓ Using company: ${companies[0].name} (${companyId})\n`);

  // 2. Create 2 test products
  console.log('2️⃣  Creating 2 test products...');

  const product1Id = createId();
  const product2Id = createId();

  await sql`
    INSERT INTO pricing_products (
      id, company_id, sku, name, name_cleaned, current_price, currency,
      characteristics, is_active, created_at, updated_at
    ) VALUES (
      ${product1Id},
      ${companyId},
      'ATL-2024',
      'Brosse à cuvette polypropylène',
      'brosse cuvette polypropylene',
      4.99,
      'CAD',
      ${{
        types: ['bowl brush'],
        materials: ['polypropylene'],
        features: ['turks head']
      }}::jsonb,
      true,
      now(),
      now()
    ), (
      ${product2Id},
      ${companyId},
      'MOP-3341',
      'Vadrouille microfibre 18 pouces',
      'vadrouille microfibre 18 pouces',
      12.50,
      'CAD',
      ${{
        types: ['mop'],
        materials: ['microfiber'],
        sizes: ['18 inch']
      }}::jsonb,
      true,
      now(),
      now()
    )
  `;

  console.log(`   ✓ Created product: ATL-2024 - Brosse à cuvette ($4.99)`);
  console.log(`   ✓ Created product: MOP-3341 - Vadrouille microfibre ($12.50)\n`);

  // 3. Create 1 competitor (Swish)
  console.log('3️⃣  Creating competitor: Swish...');

  const competitorId = createId();

  await sql`
    INSERT INTO pricing_competitors (
      id, company_id, name, website_url, scraper_config, is_active,
      scan_frequency, total_scans, successful_scans, failed_scans,
      created_at, updated_at
    ) VALUES (
      ${competitorId},
      ${companyId},
      'Swish',
      'https://swish.ca',
      ${{
        baseUrl: 'https://swish.ca',
        selectors: {
          productCard: '.product-item',
          productName: '.product-title',
          price: '.product-price'
        },
        rateLimit: {
          requestsPerMinute: 30
        }
      }}::jsonb,
      false,
      'weekly',
      0,
      0,
      0,
      now(),
      now()
    )
  `;

  console.log(`   ✓ Created competitor: Swish (https://swish.ca)\n`);

  // 4. Create product match for product 1
  console.log('4️⃣  Creating product match (ATL-2024 → Swish)...');

  const matchId = createId();

  await sql`
    INSERT INTO pricing_matches (
      id, product_id, competitor_id,
      competitor_product_name, competitor_product_url, competitor_sku,
      price, currency, match_type, confidence_score,
      match_details, in_stock, promo_active,
      last_scraped_at, created_at, updated_at
    ) VALUES (
      ${matchId},
      ${product1Id},
      ${competitorId},
      'Toilet Bowl Brush with Polypropylene Bristles',
      'https://swish.ca/products/bowl-brush-pp',
      'SWH-BB-001',
      5.49,
      'CAD',
      'characteristic',
      0.87,
      ${{
        matchedTypes: ['bowl brush'],
        matchedMaterials: ['polypropylene'],
        matchedFeatures: ['turks head']
      }}::jsonb,
      true,
      false,
      now(),
      now(),
      now()
    )
  `;

  console.log(`   ✓ Matched ATL-2024 to Swish product (confidence: 87%)\n`);

  // 5. Create 30 days of price history
  console.log('5️⃣  Creating 30 days of price history...');

  const historyRecords = [];
  for (let i = 0; i < 30; i++) {
    const daysAgo = 29 - i;
    const basePrice = 5.49;
    const variation = (Math.random() - 0.5) * 0.30; // ±$0.15
    const price = Math.round((basePrice + variation) * 100) / 100;

    historyRecords.push({
      id: createId(),
      matchId,
      price,
      currency: 'CAD',
      inStock: true,
      promoActive: false,
      changePercentage: i === 0 ? null : Math.round(((price - 5.49) / 5.49) * 10000) / 100,
      changeReason: null,
      recordedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    });
  }

  for (const record of historyRecords) {
    await sql`
      INSERT INTO pricing_history (
        id, match_id, price, currency, in_stock, promo_active,
        change_percentage, change_reason, recorded_at
      ) VALUES (
        ${record.id},
        ${record.matchId},
        ${record.price},
        ${record.currency},
        ${record.inStock},
        ${record.promoActive},
        ${record.changePercentage},
        ${record.changeReason},
        ${record.recordedAt}
      )
    `;
  }

  console.log(`   ✓ Created 30 price history points (range: $5.34 - $5.64)\n`);

  // 6. Summary
  console.log('📊 Seed data summary:');

  const productCount = await sql`SELECT COUNT(*) as count FROM pricing_products WHERE company_id = ${companyId}`;
  const competitorCount = await sql`SELECT COUNT(*) as count FROM pricing_competitors WHERE company_id = ${companyId}`;
  const matchCount = await sql`SELECT COUNT(*) as count FROM pricing_matches WHERE product_id = ${product1Id}`;
  const historyCount = await sql`SELECT COUNT(*) as count FROM pricing_history WHERE match_id = ${matchId}`;

  console.log(`   ✓ Products: ${productCount[0].count}`);
  console.log(`   ✓ Competitors: ${competitorCount[0].count}`);
  console.log(`   ✓ Product Matches: ${matchCount[0].count}`);
  console.log(`   ✓ Price History Points: ${historyCount[0].count}`);

  console.log('\n✅ Seed data created successfully!\n');

  await sql.end();
  process.exit(0);

} catch (error) {
  console.error('\n❌ Seeding failed:');
  console.error(error);
  await sql.end();
  process.exit(1);
}
