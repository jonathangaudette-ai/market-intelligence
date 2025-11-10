import OpenAI from 'openai';

async function main() {
  console.log('🔍 Checking available OpenAI models...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const models = await openai.models.list();

    // Filter to GPT models only
    const gptModels = models.data
      .filter((m) => m.id.includes('gpt'))
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log(`Found ${gptModels.length} GPT models:\n`);

    // Group by GPT version
    const gpt4Models = gptModels.filter((m) => m.id.includes('gpt-4'));
    const gpt35Models = gptModels.filter((m) => m.id.includes('gpt-3.5'));

    console.log('📊 GPT-4 Models:');
    gpt4Models.forEach((model) => {
      console.log(`  - ${model.id} (created: ${new Date(model.created * 1000).toLocaleDateString()})`);
    });

    console.log('\n📊 GPT-3.5 Models:');
    gpt35Models.forEach((model) => {
      console.log(`  - ${model.id} (created: ${new Date(model.created * 1000).toLocaleDateString()})`);
    });

    // Check for o1 models
    const o1Models = models.data.filter((m) => m.id.includes('o1'));
    if (o1Models.length > 0) {
      console.log('\n🧠 O1 Reasoning Models:');
      o1Models.forEach((model) => {
        console.log(`  - ${model.id}`);
      });
    }

    // Check for GPT-5
    const gpt5Models = models.data.filter((m) => m.id.includes('gpt-5'));
    if (gpt5Models.length > 0) {
      console.log('\n🆕 GPT-5 Models:');
      gpt5Models.forEach((model) => {
        console.log(`  - ${model.id}`);
      });
    } else {
      console.log('\n⚠️  No GPT-5 models found');
    }

    // Recommended model for structured output
    console.log('\n✅ Recommended for RFP question extraction:');
    console.log('  - gpt-4o (latest with structured output support)');
    console.log('  - gpt-4o-2024-08-06 (stable version)');

  } catch (error) {
    console.error('❌ Error fetching models:', error);
  }
}

main().catch(console.error);
