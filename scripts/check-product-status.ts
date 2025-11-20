/**
 * Check if product is active and not deleted
 */

import { config } from 'dotenv';
import { join } from 'path';
import { db } from '../src/db/index.js';
import { pricingProducts } from '../src/db/schema-pricing.js';
import { eq } from 'drizzle-orm';

config({ path: join(process.cwd(), '.env.local') });

async function checkProductStatus() {
  console.log('🔍 Checking Product Status\n');
  console.log('='.repeat(80));

  try {
    // Get the product by SKU
    const products = await db
      .select()
      .from(pricingProducts)
      .where(eq(pricingProducts.sku, 'SNT-SC3700A'))
      .limit(1);

    if (products.length === 0) {
      console.log('❌ Product not found with SKU: SNT-SC3700A');
      return;
    }

    const product = products[0];
    console.log('📊 Product Found:');
    console.log(`   ID: ${product.id}`);
    console.log(`   SKU: ${product.sku}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Company ID: ${product.companyId}`);
    console.log(`   isActive: ${product.isActive ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`   deletedAt: ${product.deletedAt ? '❌ ' + product.deletedAt : '✅ NULL (not deleted)'}`);
    console.log(`   createdAt: ${product.createdAt}`);
    console.log(`   updatedAt: ${product.updatedAt}`);

    console.log('\n' + '='.repeat(80));
    console.log('✨ VERDICT\n');

    const isActive = product.isActive === true;
    const notDeleted = product.deletedAt === null;
    const qualifies = isActive && notDeleted;

    console.log(`Will be included in activeProducts: ${qualifies ? '✅ YES' : '❌ NO'}`);
    if (!qualifies) {
      console.log(`Reason: ${!isActive ? 'isActive = false' : ''} ${!notDeleted ? 'deletedAt is not null' : ''}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }

  process.exit(0);
}

checkProductStatus().catch(console.error);
