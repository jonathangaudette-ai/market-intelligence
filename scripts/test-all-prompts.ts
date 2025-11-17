import { getPromptService } from '../src/lib/prompts/service';
import { PROMPT_KEYS } from '../src/types/prompts';

async function testAllPrompts() {
  console.log('\n🧪 Testing All Prompts Retrieval\n');
  console.log('='.repeat(60));

  const promptService = getPromptService();
  const companyId = 'frsdw7gue8zoq0znguttl1un'; // Dissan

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

  let successCount = 0;
  let failureCount = 0;

  for (const promptKey of promptKeys) {
    try {
      console.log('\nTesting: ' + promptKey);
      
      const prompt = await promptService.getPrompt(companyId, promptKey);
      
      console.log('  ✅ Retrieved successfully');
      console.log('  Name: ' + prompt.name);
      console.log('  Model: ' + prompt.modelId);
      console.log('  Variables: ' + (prompt.variables?.length || 0));
      
      successCount++;
    } catch (error) {
      console.error('  ❌ Failed:', error instanceof Error ? error.message : error);
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('  ✅ Success: ' + successCount);
  console.log('  ❌ Failures: ' + failureCount);
  console.log('  📝 Total: ' + promptKeys.length);
  console.log('='.repeat(60) + '\n');

  process.exit(failureCount > 0 ? 1 : 0);
}

testAllPrompts();
