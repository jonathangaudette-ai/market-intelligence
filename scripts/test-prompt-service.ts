import { getPromptService } from '../src/lib/prompts/service';
import { PROMPT_KEYS } from '../src/types/prompts';

async function testPromptService() {
  console.log('\n🧪 Testing Prompt Service\n');

  const promptService = getPromptService();
  const companyId = 'frsdw7gue8zoq0znguttl1un'; // Dissan

  try {
    console.log('1️⃣ Testing getPrompt() with AI_ENRICHMENT...\n');

    const prompt = await promptService.getPrompt(companyId, PROMPT_KEYS.AI_ENRICHMENT);

    console.log('✅ Prompt retrieved successfully!\n');
    console.log('Prompt Details:');
    console.log('===============');
    console.log('  ID: ' + prompt.id);
    console.log('  Name: ' + prompt.name);
    console.log('  Category: ' + prompt.category);
    console.log('  Prompt Key: ' + prompt.promptKey);
    console.log('  Model: ' + prompt.modelId);
    console.log('  Temperature: ' + prompt.temperature);
    console.log('  Max Tokens: ' + prompt.maxTokens);
    console.log('  Version: ' + prompt.version);
    console.log('  Is Active: ' + prompt.isActive);
    console.log('  Variables: ' + (prompt.variables?.length || 0) + ' defined');
    console.log('\n  System Prompt Length: ' + (prompt.systemPrompt?.length || 0) + ' chars');
    console.log('  User Prompt Length: ' + prompt.userPromptTemplate.length + ' chars');

    console.log('\n2️⃣ Testing renderPromptWithVariables()...\n');

    const testVariables = {
      clientName: 'Test Company Inc.',
      clientIndustry: 'Technology',
      questionText: 'What is your pricing model?',
      linkedinData: {
        description: 'Leading provider of innovative solutions',
        website: 'https://testcompany.com',
        employeeCount: 150,
        specialties: ['Software', 'Cloud Services'],
      },
      knowledgeBaseChunks: [
        {
          content: 'We offer flexible pricing based on usage.',
          documentName: 'Pricing Guide',
          similarity: 0.95,
        },
      ],
    };

    const rendered = promptService.renderPromptWithVariables(prompt, testVariables);

    console.log('✅ Prompt rendered successfully!\n');
    console.log('Rendered Prompt Details:');
    console.log('========================');
    console.log('  Model: ' + rendered.model);
    console.log('  Temperature: ' + rendered.temperature);
    console.log('  Max Tokens: ' + rendered.maxTokens);
    console.log('\n  System Prompt Preview (first 200 chars):');
    console.log('  ' + (rendered.system?.substring(0, 200) || 'N/A') + '...');
    console.log('\n  User Prompt Preview (first 300 chars):');
    console.log('  ' + rendered.user.substring(0, 300) + '...');

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testPromptService();
