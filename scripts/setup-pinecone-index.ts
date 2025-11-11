/**
 * Setup Pinecone Index for RAG
 *
 * Creates the 'market-intelligence' index with proper configuration
 * for text-embedding-3-small (1536 dimensions)
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const INDEX_NAME = 'market-intelligence';
const DIMENSION = 1536; // text-embedding-3-small dimension
const METRIC = 'cosine'; // Similarity metric

async function setupPineconeIndex() {
  console.log('🔧 Setting up Pinecone index...\n');

  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY not found in environment');
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  try {
    // Check if index already exists
    console.log(`📋 Checking if index '${INDEX_NAME}' exists...`);
    const existingIndexes = await pinecone.listIndexes();
    const indexExists = existingIndexes.indexes?.some(idx => idx.name === INDEX_NAME);

    if (indexExists) {
      console.log(`✅ Index '${INDEX_NAME}' already exists!`);

      // Get index details
      const indexDescription = await pinecone.describeIndex(INDEX_NAME);
      console.log('\n📊 Index Details:');
      console.log(`  - Name: ${indexDescription.name}`);
      console.log(`  - Dimension: ${indexDescription.dimension}`);
      console.log(`  - Metric: ${indexDescription.metric}`);
      console.log(`  - Status: ${indexDescription.status?.state || 'unknown'}`);
      console.log(`  - Host: ${indexDescription.host}`);

      return;
    }

    // Create new index
    console.log(`\n🚀 Creating index '${INDEX_NAME}'...`);
    console.log(`  - Dimension: ${DIMENSION}`);
    console.log(`  - Metric: ${METRIC}`);
    console.log(`  - Cloud: AWS`);
    console.log(`  - Region: us-east-1`);
    console.log('');

    await pinecone.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: METRIC,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('⏳ Index creation initiated. Waiting for index to be ready...');

    // Wait for index to be ready (can take 30-60 seconds)
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!isReady && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      try {
        const indexDescription = await pinecone.describeIndex(INDEX_NAME);
        isReady = indexDescription.status?.state === 'Ready';

        if (isReady) {
          console.log('\n✅ Index is ready!');
          console.log('\n📊 Index Details:');
          console.log(`  - Name: ${indexDescription.name}`);
          console.log(`  - Dimension: ${indexDescription.dimension}`);
          console.log(`  - Metric: ${indexDescription.metric}`);
          console.log(`  - Host: ${indexDescription.host}`);
        } else {
          process.stdout.write('.');
        }
      } catch (error) {
        process.stdout.write('.');
      }
    }

    if (!isReady) {
      console.log('\n⚠️  Index creation taking longer than expected. Please check Pinecone console.');
      console.log('   The index may still be initializing. Try running the seed script in a few minutes.');
    }

  } catch (error) {
    console.error('\n❌ Error setting up Pinecone index:', error);
    throw error;
  }
}

async function main() {
  try {
    await setupPineconeIndex();
    console.log('\n🎉 Pinecone setup completed successfully!');
    console.log('\n💡 Next step: Run seed-pinecone-synthetic.ts to upload test data');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { setupPineconeIndex };
