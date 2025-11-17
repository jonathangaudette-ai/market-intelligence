/**
 * Prompt Validation System
 *
 * Validates prompts before saving to ensure:
 * - Syntax is correct
 * - Required variables are defined
 * - Prompts can be rendered successfully
 * - Optional: Test with actual AI (expensive)
 */

import type { PromptTemplate, PromptValidation, PromptKey } from '@/types/prompts';
import { extractVariables, validateVariables, renderPrompt } from './renderer';
import { validatePromptVariables, getVariableSchema } from '@/types/prompts';

/**
 * Validate a prompt template
 */
export async function validatePrompt(
  template: PromptTemplate,
  options?: {
    testData?: Record<string, any>;
    testWithAI?: boolean; // Expensive! Only for manual testing
  }
): Promise<PromptValidation> {
  const syntaxErrors: string[] = [];
  const missingVariables: string[] = [];
  const unusedVariables: string[] = [];
  const suggestions: string[] = [];
  let testPassed = false;
  let testOutput: string | undefined;
  let testError: string | undefined;
  let qualityScore = 100;

  // 1. SYNTAX VALIDATION
  try {
    // Extract variables from template
    const systemVars = template.systemPrompt ? extractVariables(template.systemPrompt) : [];
    const userVars = extractVariables(template.userPromptTemplate);
    const allVars = [...new Set([...systemVars, ...userVars])];

    // Check for malformed placeholders
    const malformedRegex = /\{[^{}\n]*\}(?!\})/g; // Single braces
    const systemMalformed = template.systemPrompt?.match(malformedRegex);
    const userMalformed = template.userPromptTemplate.match(malformedRegex);

    if (systemMalformed) {
      syntaxErrors.push(
        `System prompt has malformed placeholders (use {{variable}} not {variable}): ${systemMalformed.join(', ')}`
      );
      qualityScore -= 20;
    }

    if (userMalformed) {
      syntaxErrors.push(
        `User prompt has malformed placeholders (use {{variable}} not {variable}): ${userMalformed.join(', ')}`
      );
      qualityScore -= 20;
    }

    // Check for unclosed blocks
    const systemUnclosed = checkUnclosedBlocks(template.systemPrompt || '');
    const userUnclosed = checkUnclosedBlocks(template.userPromptTemplate);

    if (systemUnclosed.length > 0) {
      syntaxErrors.push(`System prompt has unclosed blocks: ${systemUnclosed.join(', ')}`);
      qualityScore -= 30;
    }

    if (userUnclosed.length > 0) {
      syntaxErrors.push(`User prompt has unclosed blocks: ${userUnclosed.join(', ')}`);
      qualityScore -= 30;
    }
  } catch (error) {
    syntaxErrors.push(`Syntax validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    qualityScore -= 40;
  }

  // 2. VARIABLE VALIDATION
  try {
    const testData = options?.testData || generateTestData(template);

    // Validate against defined variables
    const variableValidation = validateVariables(template, testData);

    if (!variableValidation.valid) {
      missingVariables.push(...variableValidation.missing);
      qualityScore -= missingVariables.length * 10;
    }

    unusedVariables.push(...variableValidation.unused);

    // Check if variables are documented
    const extractedVars = extractVariables(template.userPromptTemplate);
    const documentedVars = (template.variables || []).map((v) => v.key);

    const undocumentedVars = extractedVars.filter((v) => !documentedVars.includes(v));
    if (undocumentedVars.length > 0) {
      suggestions.push(
        `Consider documenting these variables: ${undocumentedVars.join(', ')}`
      );
      qualityScore -= undocumentedVars.length * 5;
    }

    // Type validation using Zod schema if available
    const schema = getVariableSchema(template.promptKey as PromptKey);
    if (schema && testData) {
      const result = schema.safeParse(testData);
      if (!result.success) {
        syntaxErrors.push(`Type validation failed: ${result.error.message}`);
        qualityScore -= 15;
      }
    }
  } catch (error) {
    syntaxErrors.push(`Variable validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    qualityScore -= 20;
  }

  // 3. RENDERING TEST
  try {
    const testData = options?.testData || generateTestData(template);
    const rendered = renderPrompt(template, testData);

    testOutput = rendered.user;
    testPassed = true;

    // Check for remaining placeholders (indicates missing variables)
    const remainingPlaceholders = testOutput.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
      suggestions.push(
        `Some placeholders were not replaced: ${remainingPlaceholders.join(', ')}`
      );
      qualityScore -= 10;
    }

    // Check prompt length (too short or too long)
    const promptLength = testOutput.length;
    if (promptLength < 50) {
      suggestions.push(`Prompt seems very short (${promptLength} chars). Consider adding more context.`);
      qualityScore -= 5;
    } else if (promptLength > 10000) {
      suggestions.push(
        `Prompt is very long (${promptLength} chars). This may increase costs and latency.`
      );
      qualityScore -= 5;
    }
  } catch (error) {
    testPassed = false;
    testError = error instanceof Error ? error.message : 'Unknown rendering error';
    syntaxErrors.push(`Rendering test failed: ${testError}`);
    qualityScore -= 30;
  }

  // 4. OPTIONAL: TEST WITH AI (EXPENSIVE!)
  if (options?.testWithAI && testPassed) {
    try {
      // TODO: Implement actual AI testing
      // This would call the AI with the rendered prompt and check for errors
      // For now, we skip this as it's expensive
      suggestions.push('AI testing not yet implemented (would be expensive)');
    } catch (error) {
      testError = error instanceof Error ? error.message : 'AI test failed';
      qualityScore -= 10;
    }
  }

  // 5. QUALITY CHECKS
  if (template.description && template.description.length < 20) {
    suggestions.push('Consider adding a more detailed description');
    qualityScore -= 5;
  }

  if (!template.variables || template.variables.length === 0) {
    suggestions.push('No variables documented. Add variable documentation for better UX.');
    qualityScore -= 10;
  }

  // Ensure score is in valid range
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    isValid: syntaxErrors.length === 0 && missingVariables.length === 0 && testPassed,
    syntaxErrors,
    missingVariables,
    unusedVariables,
    testPassed,
    testOutput,
    testError,
    qualityScore,
    suggestions,
  };
}

/**
 * Check for unclosed template blocks
 */
function checkUnclosedBlocks(template: string): string[] {
  const unclosed: string[] = [];

  // Check for unclosed {{#if}}
  const ifMatches = template.match(/\{\{#if\s+[^}]+\}\}/g) || [];
  const endifMatches = template.match(/\{\{\/if\}\}/g) || [];
  if (ifMatches.length !== endifMatches.length) {
    unclosed.push(`{{#if}} (${ifMatches.length} open, ${endifMatches.length} close)`);
  }

  // Check for unclosed {{#each}}
  const eachMatches = template.match(/\{\{#each\s+[^}]+\}\}/g) || [];
  const endeachMatches = template.match(/\{\{\/each\}\}/g) || [];
  if (eachMatches.length !== endeachMatches.length) {
    unclosed.push(`{{#each}} (${eachMatches.length} open, ${endeachMatches.length} close)`);
  }

  return unclosed;
}

/**
 * Generate test data from template variable definitions
 */
function generateTestData(template: PromptTemplate): Record<string, any> {
  const testData: Record<string, any> = {};

  if (!template.variables) {
    // No variables defined, extract from template and use placeholders
    const vars = extractVariables(template.userPromptTemplate);
    for (const varName of vars) {
      testData[varName] = `[Test ${varName}]`;
    }
    return testData;
  }

  for (const variable of template.variables) {
    if (variable.example) {
      testData[variable.key] = variable.example;
    } else if (variable.defaultValue) {
      testData[variable.key] = variable.defaultValue;
    } else {
      // Generate based on type
      switch (variable.type) {
        case 'string':
          testData[variable.key] = `Test ${variable.key}`;
          break;
        case 'number':
          testData[variable.key] = 42;
          break;
        case 'boolean':
          testData[variable.key] = true;
          break;
        case 'array':
          testData[variable.key] = ['item1', 'item2'];
          break;
        case 'object':
          testData[variable.key] = { key: 'value' };
          break;
        default:
          testData[variable.key] = `Test ${variable.key}`;
      }
    }
  }

  return testData;
}

/**
 * Quick syntax check (for real-time validation in UI)
 */
export function quickSyntaxCheck(template: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for malformed placeholders
  const malformed = template.match(/\{[^{}\n]*\}(?!\})/g);
  if (malformed) {
    errors.push(`Malformed placeholders found (use {{var}} not {var}): ${malformed.join(', ')}`);
  }

  // Check for unclosed blocks
  const unclosed = checkUnclosedBlocks(template);
  if (unclosed.length > 0) {
    errors.push(`Unclosed blocks: ${unclosed.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
