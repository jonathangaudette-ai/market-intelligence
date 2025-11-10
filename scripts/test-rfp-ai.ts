import { config } from 'dotenv';
import { resolve } from 'path';
import { testClaudeConnection } from '@/lib/rfp/ai/claude';
import { testEmbeddingsConnection } from '@/lib/rfp/ai/embeddings';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🧪 Testing RFP AI helpers...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  let allPassed = true;

  // Test Claude
  console.log('🔮 Testing Claude API...');
  const claudeConnected = await testClaudeConnection();
  if (!claudeConnected) {
    allPassed = false;
  }
  console.log();

  // Test OpenAI Embeddings
  console.log('🔢 Testing OpenAI Embeddings API...');
  const embeddingsConnected = await testEmbeddingsConnection();
  if (!embeddingsConnected) {
    allPassed = false;
  }
  console.log();

  if (allPassed) {
    console.log('✅ All AI tests passed!');
    console.log('🎉 Ready to use RFP AI helpers');
  } else {
    console.error('❌ Some AI tests failed');
    console.error('Please check your API keys in .env.local');
    process.exit(1);
  }
}

main().catch(console.error);
