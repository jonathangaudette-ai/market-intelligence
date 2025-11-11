import OpenAI from 'openai';

async function testGPT5() {
  console.log('🔍 Testing GPT-5 API for question extraction...\n');

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('✅ API Key found (length:', apiKey.length, ')');
  console.log('   First 10 chars:', apiKey.substring(0, 10) + '...\n');

  const openai = new OpenAI({ apiKey });

  // Sample RFP text for testing
  const sampleRFPText = `
    RFP for Web Development Services

    Section 1: Company Background
    Q1. Please describe your company's experience in web development projects.
    Response limit: 500 words

    Section 2: Technical Approach
    Q2. How would you approach the development of a responsive e-commerce platform?
    Please attach relevant case studies.

    Q3. What technologies and frameworks do you recommend for this project?
    Character limit: 2000 characters
  `;

  try {
    console.log('📡 Calling GPT-5 API with model: "gpt-5"...\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing RFP documents and extracting questions. Return a JSON array of questions.',
        },
        {
          role: 'user',
          content: `Extract all questions from this RFP text: ${sampleRFPText}. Return ONLY a valid JSON array of questions with fields: questionNumber, questionText, sectionTitle, requiresAttachment, wordLimit, characterLimit.`,
        },
      ],
      response_format: { type: 'json_object' },
      // GPT-5 only supports temperature=1 (default), omit the parameter
      max_completion_tokens: 8000, // GPT-5 needs high limit for reasoning_tokens + output tokens
    });

    console.log('✅ GPT-5 API call successful!\n');
    console.log('Response:');
    console.log('- Model used:', response.model);
    console.log('- Tokens used:', response.usage?.total_tokens);
    console.log('- Content length:', response.choices[0]?.message?.content?.length || 0);
    console.log('\n📄 Full Response Object:');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n📄 Message Content:');
    console.log(response.choices[0]?.message?.content);

    // Try to parse the JSON
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      console.log(`\n✅ Successfully parsed ${questions.length} questions`);

      if (questions.length > 0) {
        console.log('\nFirst question:');
        console.log(JSON.stringify(questions[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error calling GPT-5 API:');

    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Name:', error.name);

      // Check for specific OpenAI errors
      if ('status' in error) {
        console.error('   Status:', (error as any).status);
      }
      if ('code' in error) {
        console.error('   Code:', (error as any).code);
      }
      if ('type' in error) {
        console.error('   Type:', (error as any).type);
      }

      console.error('\n   Full error:', JSON.stringify(error, null, 2));
    } else {
      console.error('   Unknown error:', error);
    }

    process.exit(1);
  }
}

testGPT5().catch(console.error);
