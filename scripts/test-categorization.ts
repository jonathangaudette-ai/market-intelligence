import { categorizeQuestion } from '../src/lib/rfp/ai/claude';

async function test() {
  console.log('🔄 Testing categorization with a sample question...\n');

  const sampleQuestion = "Quelle est votre expérience dans le développement de solutions e-commerce?";

  try {
    const result = await categorizeQuestion(sampleQuestion);
    console.log('✅ Categorization successful:', result);
  } catch (error) {
    console.error('❌ Categorization failed:', error);
  }
}

test();
