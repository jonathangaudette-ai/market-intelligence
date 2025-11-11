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
    console.log('[Question Extractor] Calling GPT-5 API...');
    console.log('[Question Extractor] Text length:', text.length);

    let response;
    try {
      response = await openai.chat.completions.create({
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
        // GPT-5 only supports temperature=1 (default), omit the parameter
        max_completion_tokens: 16000, // GPT-5 needs high limit for reasoning_tokens + output tokens
      });
    } catch (apiError: any) {
      console.error('[GPT-5 API Error]', apiError.message);
      console.error('[GPT-5 API Error] Status:', apiError.status);
      console.error('[GPT-5 API Error] Type:', apiError.type);
      console.error('[GPT-5 API Error] Full error:', JSON.stringify(apiError, null, 2));

      // Return empty array on API errors
      return [];
    }

    console.log('[Question Extractor] Received response from GPT-5');
    console.log('[Response Details] Model:', response.model);
    console.log('[Response Details] Finish reason:', response.choices[0]?.finish_reason);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[Question Extractor] No content in response');
      console.error('[Response Object]', JSON.stringify(response, null, 2));
      throw new Error('No response from GPT-5');
    }

    console.log('[Question Extractor] Parsing JSON response...');
    console.log('[Content Length]', content.length, 'characters');
    console.log('[Content Preview - First 300]', content.substring(0, 300));
    console.log('[Content Preview - Last 300]', content.substring(Math.max(0, content.length - 300)));

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      // Log the FULL raw response for debugging JSON parsing issues
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[JSON Parse Error in Question Extraction]');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[Error Message]', parseError instanceof Error ? parseError.message : parseError);
      console.error('[Response Model]', response.model);
      console.error('[Finish Reason]', response.choices[0]?.finish_reason);
      console.error('[Content Type]', typeof content);
      console.error('[Content Length]', content.length);
      console.error('[First 500 chars]', content.substring(0, 500));
      console.error('[Last 500 chars]', content.substring(Math.max(0, content.length - 500)));

      // Check if content contains common JSON issues
      if (content.includes('```json')) {
        console.error('[Issue Detected] Response contains markdown code block markers - GPT-5 may be ignoring response_format');
      }
      if (content.startsWith('An error o')) {
        console.error('[Issue Detected] Response starts with error message text');
      }

      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Return empty array instead of crashing
      console.warn('[Question Extractor] Failed to parse JSON, returning empty array');
      return [];
    }

    // Handle both {questions: [...]} and [...] formats
    const questions: ExtractedQuestion[] = Array.isArray(parsed)
      ? parsed
      : parsed.questions || [];

    console.log(`[Question Extractor] Extracted ${questions.length} questions`);
    return questions;
  } catch (error) {
    console.error('[Question Extraction Error]', error);
    if (error instanceof Error) {
      console.error('[Question Extraction Error] Message:', error.message);
      console.error('[Question Extraction Error] Stack:', error.stack);
    }

    // Return empty array instead of throwing - allows processing to continue
    console.warn('[Question Extractor] Returning empty array due to error');
    return [];
  }
}

export interface ProgressCallback {
  (current: number, total: number, questionsExtracted: number): Promise<void>;
}

/**
 * Extract questions in batches for large documents
 * Optimized to use fewer, larger batches to avoid rate limiting
 */
export async function extractQuestionsInBatches(
  text: string,
  options?: {
    batchSize?: number;
    onProgress?: ProgressCallback;
  }
): Promise<ExtractedQuestion[]> {
  // Smart batch sizing:
  // - Documents < 100k chars: Process all at once
  // - Documents >= 100k chars: Use 30k batches instead of 10k
  const MAX_SINGLE_REQUEST = 100000; // ~25k tokens
  const LARGE_BATCH_SIZE = 30000; // ~7.5k tokens per batch

  let batches: string[] = [];

  if (text.length < MAX_SINGLE_REQUEST) {
    // Process entire document in one request
    console.log(`Document size: ${text.length} chars - processing in single request`);
    batches = [text];
  } else {
    // Split into larger batches (30k instead of 10k)
    console.log(`Document size: ${text.length} chars - splitting into 30k batches`);
    let currentIndex = 0;
    while (currentIndex < text.length) {
      batches.push(text.substring(currentIndex, currentIndex + LARGE_BATCH_SIZE));
      currentIndex += LARGE_BATCH_SIZE;
    }
  }

  console.log(`Processing ${batches.length} batch${batches.length > 1 ? 'es' : ''} for question extraction`);

  const allQuestions: ExtractedQuestion[] = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`Extracting questions from batch ${i + 1}/${batches.length}`);

    try {
      const questions = await extractQuestions(batches[i]);
      allQuestions.push(...questions);

      // Report progress
      if (options?.onProgress) {
        await options.onProgress(i + 1, batches.length, allQuestions.length);
      }

      // Add delay between batches to avoid rate limiting (optimized for speed)
      if (i < batches.length - 1) {
        console.log('Waiting 500ms before next batch...');
        await new Promise((resolve) => setTimeout(resolve, 500));
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

  console.log(`Total unique questions after deduplication: ${uniqueQuestions.length}`);
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
