/**
 * Test available Claude models
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const modelsToTest = [
  'claude-4-5-haiku-20250514',     // From CLAUDE.md
  'claude-3-5-haiku-20241022',     // Currently working
  'claude-sonnet-4-5-20250929',    // Sonnet 4.5
];

async function testModel(modelId: string) {
  try {
    console.log(`\n🧪 Testing: ${modelId}`);
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }],
    });
    console.log(`   ✅ SUCCESS - ${modelId} is available`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ FAILED - ${modelId}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Testing Claude Model IDs\n');
  console.log('='.repeat(60));

  for (const model of modelsToTest) {
    await testModel(model);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete');
}

main();
