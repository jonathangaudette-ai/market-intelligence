import fetch from 'node-fetch';

async function testCategorize() {
  const RFP_ID = 'a705f9ea-443a-439a-b924-09e3f908672d'; // Vercel Split
  const BASE_URL = process.env.DEPLOYMENT_URL || 'https://market-intelligence-kappa.vercel.app';

  console.log('🧪 Testing /categorize endpoint\n');
  console.log(`   RFP ID: ${RFP_ID}`);
  console.log(`   URL: ${BASE_URL}/api/v1/rfp/rfps/${RFP_ID}/categorize\n`);

  try {
    console.log('📡 Calling POST /categorize...');
    const startTime = Date.now();

    const response = await fetch(`${BASE_URL}/api/v1/rfp/rfps/${RFP_ID}/categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: Auth will be handled by requireRFPAuth() which reads session
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n⏱️  Response time: ${duration}s`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS!');
      console.log(`   Message: ${data.message}`);
      console.log(`   Questions categorized: ${data.questionsExtracted}`);
      console.log(`\n📋 Sample questions:`);
      data.questions?.slice(0, 3).forEach((q: any, i: number) => {
        console.log(`   ${i + 1}. [${q.category}] ${q.questionText.substring(0, 60)}...`);
        console.log(`      Difficulty: ${q.difficulty}`);
      });
    } else {
      console.log('\n❌ ERROR:');
      console.log(`   ${data.error}`);
      if (data.details) {
        console.log(`   Details: ${data.details}`);
      }
    }

    // Test calling again (should fail with 400)
    console.log('\n\n🔁 Testing duplicate call prevention...');
    console.log('   (Should receive error: RFP must be in \'extracted\' status)\n');

    const response2 = await fetch(`${BASE_URL}/api/v1/rfp/rfps/${RFP_ID}/categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data2 = await response2.json();

    if (response2.status === 400) {
      console.log('✅ Duplicate prevention working!');
      console.log(`   Status: ${response2.status}`);
      console.log(`   Error: ${data2.error}`);
    } else {
      console.log('⚠️  WARNING: Duplicate call was not prevented!');
      console.log(`   Status: ${response2.status}`);
      console.log(`   Data:`, data2);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testCategorize();
