import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testDatabase() {
  console.log('🗄️  Testing Database Connection...');
  try {
    const postgres = (await import('postgres')).default;
    const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
    const sql = postgres(dbUrl, { ssl: 'require' });

    // Test connection and check RFP tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'rfp%'
      ORDER BY table_name;
    `;

    await sql.end();

    if (tables.length > 0) {
      console.log(`✅ Database connected - Found ${tables.length} RFP tables`);
      return true;
    } else {
      console.log('⚠️  Database connected but no RFP tables found');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testAI() {
  console.log('\n🤖 Testing AI APIs...');
  try {
    const { testClaudeConnection } = await import('@/lib/rfp/ai/claude');
    const { testEmbeddingsConnection } = await import('@/lib/rfp/ai/embeddings');

    const claude = await testClaudeConnection();
    const embeddings = await testEmbeddingsConnection();

    if (claude && embeddings) {
      console.log('✅ AI APIs working');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ AI APIs failed:', error);
    return false;
  }
}

async function testPinecone() {
  console.log('\n🔗 Testing Pinecone...');
  try {
    const { testPineconeConnection } = await import('@/lib/rfp/pinecone');
    const result = await testPineconeConnection();
    if (result) {
      console.log('✅ Pinecone working');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Pinecone failed:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 RFP MODULE - INFRASTRUCTURE TEST\n');
  console.log('=' .repeat(50));

  const results = {
    database: await testDatabase(),
    ai: await testAI(),
    pinecone: await testPinecone(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 RESULTS:\n');

  console.log(`Database:  ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AI APIs:   ${results.ai ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pinecone:  ${results.pinecone ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every((r) => r === true);

  console.log('\n' + '='.repeat(50));

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ RFP Module infrastructure is ready');
    console.log('\n📝 Next steps:');
    console.log('   - Start Sprint 1 development');
    console.log('   - Create API routes for file upload');
    console.log('   - Build RFP parser');
    console.log('   - Develop UI components');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('Please check the errors above and fix configuration');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
