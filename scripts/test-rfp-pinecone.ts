import { config } from 'dotenv';
import { resolve } from 'path';
import { testPineconeConnection } from '@/lib/rfp/pinecone';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🧪 Testing RFP Pinecone configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  PINECONE_INDEX: ${process.env.PINECONE_INDEX || 'market-intelligence (default)'}\n`);

  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY is not set in environment variables');
    console.error('Please add it to .env.local');
    process.exit(1);
  }

  // Test connection
  const connected = await testPineconeConnection();

  if (connected) {
    console.log('\n✅ All Pinecone tests passed!');
    console.log('🎉 Ready to use RFP module with Pinecone');
  } else {
    console.error('\n❌ Pinecone connection failed');
    console.error('Please check your PINECONE_API_KEY and index name');
    process.exit(1);
  }
}

main().catch(console.error);
