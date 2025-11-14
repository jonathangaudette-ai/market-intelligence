/**
 * Verify Claude Haiku 4.5 model ID
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function test() {
  console.log('🧪 Testing Claude Haiku 4.5 model ID\n');

  try {
    console.log('Model ID: claude-haiku-4-5-20251001');
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say "Haiku 4.5 works!" in French' }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log(`\n✅ SUCCESS! Response: "${content.text}"`);
      console.log(`\n🎉 Claude Haiku 4.5 is working correctly!`);
    }
  } catch (error: any) {
    console.log(`\n❌ FAILED: ${error.message}`);
    console.log(`\nℹ️  Trying fallback model: claude-3-5-haiku-20241022`);

    try {
      const fallback = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say "Haiku 3.5 works!" in French' }],
      });
      const content = fallback.content[0];
      if (content.type === 'text') {
        console.log(`✅ Fallback works: "${content.text}"`);
      }
    } catch (e: any) {
      console.log(`❌ Fallback also failed: ${e.message}`);
    }
  }
}

test();
