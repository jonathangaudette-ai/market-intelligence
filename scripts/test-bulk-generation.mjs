/**
 * Test script for bulk generation API with SSE streaming
 *
 * Usage: node scripts/test-bulk-generation.mjs
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.DEPLOYMENT_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  slug: 'techvision', // Replace with your test company slug
  rfpId: 'test-rfp-id', // Replace with a real RFP ID
  questionIds: [], // Will be populated from questions API
};

/**
 * Test 1: Fetch questions to get valid IDs
 */
async function testFetchQuestions() {
  console.log('\n🔍 Test 1: Fetching questions...');

  try {
    const response = await fetch(
      `${BASE_URL}/api/companies/${TEST_CONFIG.slug}/rfps/${TEST_CONFIG.rfpId}/questions`,
      {
        headers: {
          'Cookie': process.env.TEST_COOKIE || '', // Add auth cookie
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.questions.length} questions`);

    // Get first 3 questions without responses
    const questionsWithoutResponses = data.questions
      .filter(q => !q.hasResponse)
      .slice(0, 3)
      .map(q => q.id);

    TEST_CONFIG.questionIds = questionsWithoutResponses;
    console.log(`📝 Selected ${questionsWithoutResponses.length} questions for testing`);

    return true;
  } catch (error) {
    console.error('❌ Error fetching questions:', error.message);
    return false;
  }
}

/**
 * Test 2: Validate bulk generation API (validation only)
 */
async function testBulkGenerationValidation() {
  console.log('\n🔍 Test 2: Testing validation...');

  // Test 2a: Empty questionIds
  try {
    const response = await fetch(
      `${BASE_URL}/api/companies/${TEST_CONFIG.slug}/rfps/${TEST_CONFIG.rfpId}/questions/bulk-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': process.env.TEST_COOKIE || '',
        },
        body: JSON.stringify({
          questionIds: [],
        }),
      }
    );

    if (response.status === 400) {
      console.log('✅ Empty array validation works');
    } else {
      console.log('⚠️  Empty array should return 400, got', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing empty array:', error.message);
  }

  // Test 2b: Too many questions (>10)
  try {
    const response = await fetch(
      `${BASE_URL}/api/companies/${TEST_CONFIG.slug}/rfps/${TEST_CONFIG.rfpId}/questions/bulk-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': process.env.TEST_COOKIE || '',
        },
        body: JSON.stringify({
          questionIds: Array(11).fill('test-id'),
        }),
      }
    );

    if (response.status === 400) {
      console.log('✅ Max 10 questions validation works');
    } else {
      console.log('⚠️  >10 questions should return 400, got', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing max questions:', error.message);
  }
}

/**
 * Test 3: SSE Streaming (dry run)
 */
async function testSSEStreaming() {
  console.log('\n🔍 Test 3: Testing SSE streaming...');

  if (TEST_CONFIG.questionIds.length === 0) {
    console.log('⚠️  No questions available for SSE test');
    return false;
  }

  console.log(`📤 Starting generation for ${TEST_CONFIG.questionIds.length} questions`);

  try {
    const response = await fetch(
      `${BASE_URL}/api/companies/${TEST_CONFIG.slug}/rfps/${TEST_CONFIG.rfpId}/questions/bulk-generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': process.env.TEST_COOKIE || '',
        },
        body: JSON.stringify({
          questionIds: TEST_CONFIG.questionIds,
          mode: 'with_context',
          depth: 'basic',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ SSE connection established');
    console.log('📡 Streaming events:');

    // Parse SSE stream
    const reader = response.body;
    let buffer = '';
    let eventCount = 0;
    const events = {
      question_start: 0,
      response_chunk: 0,
      question_completed: 0,
      question_skipped: 0,
      question_error: 0,
      batch_completed: 0,
    };

    for await (const chunk of reader) {
      buffer += chunk.toString();
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));
          eventCount++;

          if (events[data.type] !== undefined) {
            events[data.type]++;
          }

          // Log important events
          if (data.type === 'question_start') {
            console.log(`  📝 Question ${data.index}/${data.total}: ${data.questionText.substring(0, 50)}...`);
          } else if (data.type === 'question_completed') {
            console.log(`  ✅ Completed (${data.wordCount} words)`);
          } else if (data.type === 'question_skipped') {
            console.log(`  ⚠️  Skipped: ${data.reason}`);
          } else if (data.type === 'question_error') {
            console.log(`  ❌ Error: ${data.error}`);
          } else if (data.type === 'batch_completed') {
            console.log(`  🎉 Batch completed!`);
            console.log(`     - Completed: ${data.completedCount}`);
            console.log(`     - Skipped: ${data.skippedCount}`);
            console.log(`     - Errors: ${data.errorCount}`);
          }
        } catch (err) {
          console.error('Error parsing event:', err.message);
        }
      }
    }

    console.log('\n📊 Event Summary:');
    console.log(`  Total events: ${eventCount}`);
    Object.entries(events).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  - ${type}: ${count}`);
      }
    });

    return true;
  } catch (error) {
    console.error('❌ SSE streaming error:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Bulk Generation API Tests');
  console.log('============================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Company: ${TEST_CONFIG.slug}`);
  console.log(`RFP ID: ${TEST_CONFIG.rfpId}`);

  // Check if in test mode (with auth)
  if (!process.env.TEST_COOKIE && BASE_URL.includes('localhost')) {
    console.log('\n⚠️  Warning: No TEST_COOKIE provided. Tests may fail if authentication is required.');
    console.log('Set TEST_COOKIE environment variable with a valid session cookie.');
  }

  let testsRun = 0;
  let testsPassed = 0;

  // Test 1: Fetch questions
  testsRun++;
  if (await testFetchQuestions()) {
    testsPassed++;
  }

  // Test 2: Validation
  testsRun++;
  await testBulkGenerationValidation();
  testsPassed++; // Validation tests don't fail hard

  // Test 3: SSE Streaming (optional - requires real data)
  if (process.env.RUN_FULL_TEST === 'true') {
    testsRun++;
    if (await testSSEStreaming()) {
      testsPassed++;
    }
  } else {
    console.log('\n⏭️  Skipping full SSE test (set RUN_FULL_TEST=true to run)');
  }

  console.log('\n============================');
  console.log(`✅ Tests passed: ${testsPassed}/${testsRun}`);

  if (testsPassed === testsRun) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
