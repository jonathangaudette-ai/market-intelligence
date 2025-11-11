import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testGPT5JSONFormat() {
  console.log('🧪 Testing GPT-5 with response_format: json_object...\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Return your response in JSON format.',
        },
        {
          role: 'user',
          content: 'Extract questions from this text: "Q1. What is your company name? Q2. How many employees do you have?"\n\nReturn ONLY a valid JSON array with this format: [{"questionText": "..."}]',
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000,
    });

    console.log('✅ Response received');
    console.log('Content:', response.choices[0]?.message?.content?.substring(0, 500));

    // Try to parse it
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      console.log('\n✅ JSON parsed successfully:', parsed);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);

    if (error.response) {
      console.error('\nAPI Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n---\n');
  console.log('🧪 Testing GPT-5 WITHOUT response_format (natural JSON request)...\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Always return your response as valid JSON only, no additional text.',
        },
        {
          role: 'user',
          content: 'Extract questions from this text: "Q1. What is your company name? Q2. How many employees do you have?"\n\nReturn ONLY a valid JSON array with this format: [{"questionText": "..."}]',
        },
      ],
      max_completion_tokens: 1000,
    });

    console.log('✅ Response received');
    console.log('Content:', response.choices[0]?.message?.content?.substring(0, 500));

    // Try to parse it
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      console.log('\n✅ JSON parsed successfully:', parsed);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
  }
}

testGPT5JSONFormat();
