import { Pinecone } from "@pinecone-database/pinecone";

async function setupPinecone() {
  const indexName = process.env.PINECONE_INDEX_NAME || "market-intelligence-prod";

  console.log(`🔧 Setting up Pinecone index: ${indexName}`);

  if (!process.env.PINECONE_API_KEY) {
    console.error("❌ PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  try {
    // Check if index already exists
    const { indexes } = await pinecone.listIndexes();
    const existingIndex = indexes?.find((idx) => idx.name === indexName);

    if (existingIndex) {
      console.log(`✅ Index "${indexName}" already exists`);
      console.log(`   Dimension: ${existingIndex.dimension}`);
      console.log(`   Metric: ${existingIndex.metric}`);
      console.log(`   Host: ${existingIndex.host}`);
      return;
    }

    // Create the index
    console.log(`\n📝 Creating index "${indexName}"...`);
    console.log(`   Using dimension: 1536 (text-embedding-3-large)`);
    console.log(`   Using metric: cosine`);

    await pinecone.createIndex({
      name: indexName,
      dimension: 1536, // OpenAI text-embedding-3-large with dimensions parameter
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });

    console.log(`\n⏳ Waiting for index to be ready...`);

    // Wait for index to be ready
    let isReady = false;
    while (!isReady) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const { indexes: updatedIndexes } = await pinecone.listIndexes();
      const index = updatedIndexes?.find((idx) => idx.name === indexName);

      if (index && index.status?.ready) {
        isReady = true;
        console.log(`\n✅ Index "${indexName}" created successfully!`);
        console.log(`   Host: ${index.host}`);
      } else {
        process.stdout.write(".");
      }
    }
  } catch (error: any) {
    console.error(`\n❌ Error setting up Pinecone index:`, error.message);
    if (error.response?.data) {
      console.error("   Details:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

setupPinecone();
