import { config } from 'dotenv';
import { resolve } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔍 Listing Pinecone indexes...\n');

  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY is not set');
    process.exit(1);
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  try {
    const indexes = await pinecone.listIndexes();

    console.log(`Found ${indexes.indexes?.length || 0} indexes:\n`);

    if (indexes.indexes && indexes.indexes.length > 0) {
      for (const index of indexes.indexes) {
        console.log(`📊 Index: ${index.name}`);
        console.log(`   Dimension: ${index.dimension}`);
        console.log(`   Metric: ${index.metric}`);
        console.log(`   Host: ${index.host}`);
        console.log(`   Status: ${index.status?.state || 'unknown'}\n`);
      }
    } else {
      console.log('⚠️  No Pinecone indexes found');
      console.log('\nYou need to create an index first.');
      console.log('Visit: https://app.pinecone.io/');
      console.log('\nRecommended settings for RFP module:');
      console.log('  - Name: market-intelligence');
      console.log('  - Dimensions: 1536 (for text-embedding-3-small)');
      console.log('  - Metric: cosine');
      console.log('  - Cloud: AWS');
      console.log('  - Region: us-east-1');
    }
  } catch (error) {
    console.error('❌ Error listing indexes:', error);
    process.exit(1);
  }
}

main().catch(console.error);
