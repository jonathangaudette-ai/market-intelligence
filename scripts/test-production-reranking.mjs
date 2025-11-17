/**
 * Test Production API - Verify Reranking is Active
 * Tests the deployed Vercel endpoint to confirm reranking works
 */

const PRODUCTION_URL = 'https://market-intelligence-kappa.vercel.app';

async function testProductionAPI() {
  console.log('🧪 Test Production API - Reranking Verification\n');
  console.log('Target:', PRODUCTION_URL);
  console.log('='.repeat(80));

  try {
    // Test 1: Health check
    console.log('\n📡 Test 1: API Health Check...');
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);

    if (healthResponse.ok) {
      console.log('✅ API is reachable');
    } else {
      console.log('⚠️  Health endpoint returned:', healthResponse.status);
    }

    // Test 2: Chat endpoint with simple query
    console.log('\n📡 Test 2: Testing Intelligence Chat API...');
    console.log('Query: "Qui a fondé SANIDÉPÔT ?"');

    const chatResponse = await fetch(`${PRODUCTION_URL}/api/companies/company_1762968795076/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Qui a fondé SANIDÉPÔT ?',
      }),
    });

    console.log('Status:', chatResponse.status, chatResponse.statusText);

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ API Error:', errorText);

      if (chatResponse.status === 401) {
        console.log('\n⚠️  Authentication required - this is expected for production');
        console.log('ℹ️  The endpoint is working but requires login');
        console.log('ℹ️  To fully test, you need to:');
        console.log('   1. Login to the app in browser');
        console.log('   2. Open DevTools > Network tab');
        console.log('   3. Send a chat message');
        console.log('   4. Check the request for [RAG] Rerank metrics logs');
        return;
      }

      process.exit(1);
    }

    // Parse response
    const data = await chatResponse.json();
    console.log('\n✅ Response received:');
    console.log('Answer length:', data.answer?.length || 0, 'chars');
    console.log('Sources count:', data.sources?.length || 0);

    if (data.sources && data.sources.length > 0) {
      console.log('\n📄 Top 3 Sources:');
      data.sources.slice(0, 3).forEach((source, idx) => {
        console.log(`  ${idx + 1}. [Relevance: ${source.relevance?.toFixed(4) || 'N/A'}] ${source.source}`);
        console.log(`     "${source.text?.slice(0, 80)}..."`);
      });

      // Check if relevance scores look like reranked scores (typically 0.8-1.0)
      const topRelevance = data.sources[0]?.relevance || 0;
      if (topRelevance > 0.8) {
        console.log('\n✅ Relevance scores look reranked (>0.8)');
        console.log('   This suggests reranking is ACTIVE');
      } else if (topRelevance > 0.6) {
        console.log('\n⚠️  Relevance scores in semantic range (0.6-0.8)');
        console.log('   Reranking might NOT be active');
      } else {
        console.log('\n❓ Relevance scores are low (<0.6)');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ TEST COMPLETE');
    console.log('\nℹ️  To verify reranking is truly active:');
    console.log('   1. Check Vercel logs for: [RAG] Rerank metrics');
    console.log('   2. Verify NEXT_PUBLIC_ENABLE_RERANKING=true in Vercel Dashboard');
    console.log('   3. Compare relevance scores (reranked should be 0.8-1.0)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nPossible causes:');
    console.error('- Network connectivity issue');
    console.error('- Vercel deployment not complete');
    console.error('- API endpoint changed');
    process.exit(1);
  }
}

testProductionAPI();
