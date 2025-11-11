import { Anthropic } from '@anthropic-ai/sdk';

// Lazy initialization to avoid connecting during build time
let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

/**
 * Generate an RFP response using Claude Sonnet 4.5
 */
export async function generateRFPResponse(params: {
  question: string;
  context: string;
  clientName?: string;
  clientIndustry?: string;
  additionalInstructions?: string;
}): Promise<string> {
  const anthropic = getAnthropic();

  const systemPrompt = `You are an expert RFP (Request for Proposal) response writer. Your goal is to create professional, compelling, and accurate responses to RFP questions.

Guidelines:
- Write clear, concise, and professional responses
- Use the provided context to ground your answers in factual information
- Highlight competitive advantages where relevant
- Be specific and provide examples when possible
- Maintain a confident but not arrogant tone
- Structure responses with clear paragraphs
- Avoid generic marketing language
- Focus on delivering value to the client`;

  const userPrompt = `
${params.clientName ? `Client: ${params.clientName}` : ''}
${params.clientIndustry ? `Industry: ${params.clientIndustry}` : ''}

Question:
${params.question}

Context (from company knowledge base):
${params.context}

${params.additionalInstructions ? `Additional Instructions:\n${params.additionalInstructions}` : ''}

Please provide a professional, well-structured response to this RFP question. The response should be ready to use with minimal editing.
`.trim();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const response = message.content[0];
  if (response.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return response.text;
}

/**
 * Categorize an RFP question using Claude
 */
export async function categorizeQuestion(question: string): Promise<{
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
}> {
  const anthropic = getAnthropic();

  const systemPrompt = `You are an RFP question analyzer. Categorize questions and provide metadata about them.

Return your response in this exact JSON format (no additional text):
{
  "category": "one of: technical, pricing, company_info, case_study, compliance, implementation, support, security, legal",
  "tags": ["array", "of", "relevant", "tags"],
  "difficulty": "easy | medium | hard",
  "estimatedMinutes": number (estimate time to answer: 5-60 minutes)
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Categorize this RFP question:\n\n${question}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (handle cases where Claude adds extra text)
    let jsonText = response.text.trim();

    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (!parsed.category || !parsed.tags || !parsed.difficulty || !parsed.estimatedMinutes) {
        throw new Error('Missing required fields in categorization response');
      }

      return parsed;
    } catch (parseError) {
      // Log the raw response for debugging
      console.error('[JSON Parse Error]', parseError);
      console.error('[Raw Response]', response.text.substring(0, 500));
      throw parseError;
    }
  } catch (error) {
    console.error('[Categorization Error]', error);
    console.error('[Question]', question.substring(0, 200));

    // Return default categorization on error
    return {
      category: 'company_info',
      tags: ['uncategorized'],
      difficulty: 'medium',
      estimatedMinutes: 15,
    };
  }
}

/**
 * Categorize multiple RFP questions in a single batch (much faster!)
 * Reduces API calls by ~90% compared to individual categorization
 */
export async function categorizeQuestionsBatch(
  questions: Array<{ questionText: string; index: number }>
): Promise<Array<{
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
}>> {
  const anthropic = getAnthropic();

  const systemPrompt = `You are an RFP question analyzer. Categorize multiple questions and provide metadata about each.

For EACH question, return categorization in this JSON array format:
[
  {
    "category": "one of: technical, pricing, company_info, case_study, compliance, implementation, support, security, legal",
    "tags": ["array", "of", "relevant", "tags"],
    "difficulty": "easy | medium | hard",
    "estimatedMinutes": number (estimate time to answer: 5-60 minutes)
  },
  ...
]

Return ONLY the JSON array, no additional text. The array must have the same length as the input questions.`;

  // Format questions for the prompt
  const questionsText = questions
    .map((q, i) => `Question ${i + 1}:\n${q.questionText}`)
    .join('\n\n---\n\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000, // Higher limit for batch responses
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Categorize these ${questions.length} RFP questions:\n\n${questionsText}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON array from response
    let jsonText = response.text.trim();

    // Try to find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonText);

      // Validate it's an array with correct length
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      if (parsed.length !== questions.length) {
        console.warn(`[Batch Categorization] Expected ${questions.length} results, got ${parsed.length}`);
      }

      // Validate each item has required fields, fill missing with defaults
      const results = parsed.map((item, index) => {
        if (!item.category || !item.tags || !item.difficulty || !item.estimatedMinutes) {
          console.warn(`[Batch Categorization] Missing fields for question ${index + 1}, using defaults`);
          return {
            category: 'company_info',
            tags: ['uncategorized'],
            difficulty: 'medium' as const,
            estimatedMinutes: 15,
          };
        }
        return item;
      });

      // If we got fewer results than questions, pad with defaults
      while (results.length < questions.length) {
        results.push({
          category: 'company_info',
          tags: ['uncategorized'],
          difficulty: 'medium',
          estimatedMinutes: 15,
        });
      }

      return results;
    } catch (parseError) {
      console.error('[Batch Categorization JSON Parse Error]', parseError);
      console.error('[Raw Response]', response.text.substring(0, 1000));
      throw parseError;
    }
  } catch (error) {
    console.error('[Batch Categorization Error]', error);

    // Return default categorization for all questions
    return questions.map(() => ({
      category: 'company_info',
      tags: ['uncategorized'],
      difficulty: 'medium',
      estimatedMinutes: 15,
    }));
  }
}

/**
 * Extract questions from an RFP document using GPT-4o (better at structured extraction)
 * Note: Using GPT-4o instead of Claude as it's better at structured extraction tasks
 */
export async function extractQuestionsFromText(
  text: string,
  options?: {
    maxQuestions?: number;
  }
): Promise<
  Array<{
    sectionTitle?: string;
    questionNumber?: string;
    questionText: string;
    requiresAttachment?: boolean;
    wordLimit?: number;
  }>
> {
  // This will be implemented using OpenAI's GPT-4o
  // See embeddings.ts for OpenAI client initialization
  throw new Error('Not implemented yet - see lib/rfp/parser/question-extractor.ts');
}

/**
 * Generate competitive positioning suggestions
 */
export async function generateCompetitivePositioning(params: {
  question: string;
  ourResponse: string;
  competitors: string[];
  competitiveIntel?: string;
}): Promise<{
  suggestions: string[];
  strengths: string[];
  differentiators: string[];
}> {
  const anthropic = getAnthropic();

  const systemPrompt = `You are a competitive strategy analyst. Analyze RFP responses and suggest how to position against competitors.

Return your response in this exact JSON format:
{
  "suggestions": ["array of specific suggestions to improve positioning"],
  "strengths": ["key strengths to emphasize"],
  "differentiators": ["unique differentiators vs competitors"]
}`;

  const userPrompt = `
Question: ${params.question}

Our Response:
${params.ourResponse}

Known Competitors: ${params.competitors.join(', ')}

${params.competitiveIntel ? `Competitive Intelligence:\n${params.competitiveIntel}` : ''}

Provide strategic suggestions for positioning this response against competitors.
`.trim();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    temperature: 0.8,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const response = message.content[0];
  if (response.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(response.text);
}

/**
 * Test Claude API connection
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const anthropic = getAnthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "OK" if you can read this.',
        },
      ],
    });

    const response = message.content[0];
    console.log('✅ Claude API connection successful');
    console.log(`📝 Response: ${response.type === 'text' ? response.text : 'non-text response'}`);

    return true;
  } catch (error) {
    console.error('❌ Claude API connection failed:', error);
    return false;
  }
}
