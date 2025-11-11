import OpenAI from 'openai';

// Lazy initialization
let _openai: OpenAI | null = null;

function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

export interface ExtractedQuestion {
  sectionTitle?: string;
  questionNumber?: string;
  questionText: string;
  requiresAttachment?: boolean;
  wordLimit?: number;
  characterLimit?: number;
  pageLimit?: number;
}

/**
 * Extract questions from RFP text using GPT-4o
 * Uses structured output for reliable parsing
 */
export async function extractQuestions(
  text: string,
  options?: {
    maxQuestions?: number;
    sectionTitle?: string;
  }
): Promise<ExtractedQuestion[]> {
  const openai = getOpenAI();

  const systemPrompt = `You are an expert at analyzing RFP (Request for Proposal) documents and extracting questions.

Your task is to:
1. Identify all questions that require a response
2. Extract question numbers/identifiers if present
3. Determine if attachments are required
4. Note any word/character/page limits
5. Identify the section each question belongs to

Return a structured JSON array of questions.`;

  const userPrompt = `Extract all questions from this RFP text. For each question, provide:
- sectionTitle: The section or category this question belongs to
- questionNumber: The question number or identifier (e.g., "Q1", "1.1", "Section 3 - Q5")
- questionText: The full text of the question
- requiresAttachment: true if the question explicitly requires file attachments
- wordLimit: maximum number of words allowed (if specified)
- characterLimit: maximum number of characters allowed (if specified)
- pageLimit: maximum number of pages allowed (if specified)

${options?.maxQuestions ? `Extract up to ${options.maxQuestions} questions.` : ''}
${options?.sectionTitle ? `Focus on section: ${options.sectionTitle}` : ''}

RFP Text:
${text.substring(0, 12000)} ${text.length > 12000 ? '...[truncated]' : ''}

Return ONLY a valid JSON array of questions, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5', // Upgraded from gpt-4o to GPT-5 (Aug 2025)
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }

    const parsed = JSON.parse(content);

    // Handle both {questions: [...]} and [...] formats
    const questions: ExtractedQuestion[] = Array.isArray(parsed)
      ? parsed
      : parsed.questions || [];

    return questions;
  } catch (error) {
    console.error('[Question Extraction Error]', error);
    throw new Error(
      `Failed to extract questions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract questions in batches for large documents
 */
export async function extractQuestionsInBatches(
  text: string,
  batchSize: number = 10000
): Promise<ExtractedQuestion[]> {
  const batches: string[] = [];
  let currentIndex = 0;

  // Split text into batches
  while (currentIndex < text.length) {
    batches.push(text.substring(currentIndex, currentIndex + batchSize));
    currentIndex += batchSize;
  }

  console.log(`Processing ${batches.length} batches for question extraction`);

  const allQuestions: ExtractedQuestion[] = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`Extracting questions from batch ${i + 1}/${batches.length}`);

    try {
      const questions = await extractQuestions(batches[i]);
      allQuestions.push(...questions);

      // Add a small delay to avoid rate limits
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
      // Continue with other batches
    }
  }

  // Deduplicate questions based on questionText
  const uniqueQuestions = allQuestions.filter(
    (q, index, self) =>
      index ===
      self.findIndex(
        (t) => t.questionText.toLowerCase() === q.questionText.toLowerCase()
      )
  );

  return uniqueQuestions;
}

/**
 * Validate and clean extracted questions
 */
export function validateQuestions(
  questions: ExtractedQuestion[]
): ExtractedQuestion[] {
  return questions.filter((q) => {
    // Must have question text
    if (!q.questionText || q.questionText.trim().length < 10) {
      return false;
    }

    // Clean up question text
    q.questionText = q.questionText.trim();

    // Ensure numeric limits are valid
    if (q.wordLimit && (q.wordLimit < 0 || q.wordLimit > 10000)) {
      q.wordLimit = undefined;
    }
    if (q.characterLimit && (q.characterLimit < 0 || q.characterLimit > 50000)) {
      q.characterLimit = undefined;
    }
    if (q.pageLimit && (q.pageLimit < 0 || q.pageLimit > 100)) {
      q.pageLimit = undefined;
    }

    return true;
  });
}
