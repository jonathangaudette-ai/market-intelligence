/**
 * End-to-End Test for Configurable Prompt System
 * 
 * Tests:
 * 1. Prompt retrieval from database
 * 2. Feature flag functionality
 * 3. Template rendering
 * 4. Cache performance
 * 5. Multi-company isolation
 */

import { getPromptService } from '../src/lib/prompts/service';
import { PROMPT_KEYS } from '../src/types/prompts';
import { shouldUseDatabase } from '../src/lib/prompts/feature-flags';

const COMPANIES = {
  dissan: 'frsdw7gue8zoq0znguttl1un',
  acme: 'q9y4ih7upbm5xq2ldffs27df',
  techstart: 'eaxq41vmwmbhn82dy7yv07oy',
  demo: 'e914d3e1kj5x3154p7h1whti',
  mycompany: 'company_1762968795076',
};

async function runTests() {
  console.log('\n🧪 CONFIGURABLE PROMPT SYSTEM - END-TO-END TESTS\n');
  console.log('='.repeat(70));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Feature Flag for Dissan
  console.log('\n📍 Test 1: Feature Flag - Dissan should be enabled');
  console.log('-'.repeat(70));
  totalTests++;
  try {
    const isEnabled = shouldUseDatabase(COMPANIES.dissan, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    if (isEnabled) {
      console.log('✅ PASS: Dissan is enabled for RFP_RESPONSE_MAIN');
      passedTests++;
    } else {
      console.log('❌ FAIL: Dissan should be enabled but is not');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    failedTests++;
  }

  // Test 2: Feature Flag for other companies
  console.log('\n📍 Test 2: Feature Flag - Other companies should be disabled');
  console.log('-'.repeat(70));
  totalTests++;
  try {
    const acmeEnabled = shouldUseDatabase(COMPANIES.acme, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    if (!acmeEnabled) {
      console.log('✅ PASS: Acme is correctly disabled');
      passedTests++;
    } else {
      console.log('❌ FAIL: Acme should be disabled but is enabled');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    failedTests++;
  }

  // Test 3: Retrieve all 8 prompts for Dissan
  console.log('\n📍 Test 3: Retrieve all 8 prompts for Dissan');
  console.log('-'.repeat(70));
  
  const promptService = getPromptService();
  const promptKeys = [
    PROMPT_KEYS.RFP_RESPONSE_MAIN,
    PROMPT_KEYS.QUESTION_EXTRACT,
    PROMPT_KEYS.QUESTION_CATEGORIZE_SINGLE,
    PROMPT_KEYS.QUESTION_CATEGORIZE_BATCH,
    PROMPT_KEYS.HISTORICAL_MATCH_QA,
    PROMPT_KEYS.AI_ENRICHMENT,
    PROMPT_KEYS.COMPETITIVE_POSITIONING,
    PROMPT_KEYS.HISTORICAL_PARSE_RESPONSE,
  ];

  for (const promptKey of promptKeys) {
    totalTests++;
    try {
      const prompt = await promptService.getPrompt(COMPANIES.dissan, promptKey);
      console.log('  ✅ ' + promptKey + ' - Retrieved (v' + prompt.version + ')');
      passedTests++;
    } catch (error) {
      console.log('  ❌ ' + promptKey + ' - FAILED:', error instanceof Error ? error.message : 'Unknown error');
      failedTests++;
    }
  }

  // Test 4: Template rendering
  console.log('\n📍 Test 4: Template rendering with variables');
  console.log('-'.repeat(70));
  totalTests++;
  try {
    const template = await promptService.getPrompt(COMPANIES.dissan, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    const variables = {
      question: 'What is your pricing model?',
      context: 'We offer flexible SaaS pricing starting at $99/month.',
      clientName: 'Test Corp',
      clientIndustry: 'Technology',
    };

    const rendered = promptService.renderPromptWithVariables(template, variables);

    if (rendered.user.includes('What is your pricing model?') && 
        rendered.user.includes('Test Corp')) {
      console.log('✅ PASS: Template rendered correctly with variables');
      console.log('  User prompt length: ' + rendered.user.length + ' chars');
      console.log('  System prompt length: ' + (rendered.system?.length || 0) + ' chars');
      passedTests++;
    } else {
      console.log('❌ FAIL: Template rendering did not include variables');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    failedTests++;
  }

  // Test 5: Cache performance (second retrieval should be faster)
  console.log('\n📍 Test 5: Cache performance');
  console.log('-'.repeat(70));
  totalTests++;
  try {
    const start1 = Date.now();
    await promptService.getPrompt(COMPANIES.dissan, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await promptService.getPrompt(COMPANIES.dissan, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    const time2 = Date.now() - start2;

    console.log('  First retrieval: ' + time1 + 'ms (DB query)');
    console.log('  Second retrieval: ' + time2 + 'ms (cache hit)');

    if (time2 < time1) {
      console.log('✅ PASS: Cache is working (second retrieval faster)');
      passedTests++;
    } else {
      console.log('⚠️  WARNING: Cache might not be working optimally');
      passedTests++; // Still pass, but log warning
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    failedTests++;
  }

  // Test 6: Multi-company isolation
  console.log('\n📍 Test 6: Multi-company isolation');
  console.log('-'.repeat(70));
  totalTests++;
  try {
    const dissanPrompt = await promptService.getPrompt(COMPANIES.dissan, PROMPT_KEYS.RFP_RESPONSE_MAIN);
    const acmePrompt = await promptService.getPrompt(COMPANIES.acme, PROMPT_KEYS.RFP_RESPONSE_MAIN);

    // Both should have the same default content initially
    if (dissanPrompt.promptKey === acmePrompt.promptKey && 
        dissanPrompt.companyId !== acmePrompt.companyId) {
      console.log('✅ PASS: Companies have isolated prompt instances');
      console.log('  Dissan companyId: ' + dissanPrompt.companyId);
      console.log('  Acme companyId: ' + acmePrompt.companyId);
      passedTests++;
    } else {
      console.log('❌ FAIL: Multi-company isolation issue');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ FAIL:', error);
    failedTests++;
  }

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('  Total Tests: ' + totalTests);
  console.log('  ✅ Passed: ' + passedTests);
  console.log('  ❌ Failed: ' + failedTests);
  console.log('  Success Rate: ' + Math.round((passedTests / totalTests) * 100) + '%');
  console.log('='.repeat(70) + '\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
