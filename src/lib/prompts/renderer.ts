/**
 * Prompt Template Renderer
 *
 * Simple but powerful Mustache-like template engine for rendering prompts with variables
 */

import type { PromptTemplate, RenderedPrompt, PromptVariable } from '@/types/prompts';

/**
 * Render a prompt template with variables
 *
 * Supports simple variable substitution: {{variableName}}
 * Supports conditional blocks: {{#if variable}}...{{/if}}
 * Supports loops: {{#each array}}...{{/each}}
 */
export function renderPrompt(
  template: PromptTemplate,
  variables: Record<string, any>
): RenderedPrompt {
  // Render system prompt if present
  const system = template.systemPrompt
    ? renderTemplate(template.systemPrompt, variables)
    : undefined;

  // Render user prompt template
  const user = renderTemplate(template.userPromptTemplate, variables);

  return {
    system,
    user,
    model: template.modelId || undefined,
    temperature: template.temperature !== null ? Number(template.temperature) : undefined,
    maxTokens: template.maxTokens || undefined,
  };
}

/**
 * Render a single template string with variables
 */
export function renderTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  // 1. Handle conditional blocks {{#if variable}}...{{/if}}
  result = handleConditionals(result, variables);

  // 2. Handle loops {{#each array}}...{{/each}}
  result = handleLoops(result, variables);

  // 3. Handle simple variable substitution {{variable}}
  result = handleVariables(result, variables);

  return result;
}

/**
 * Handle simple variable substitution: {{variableName}}
 */
function handleVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{\{([^#/][^}]*?)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();

    // Access nested properties with dot notation
    const value = getNestedProperty(variables, trimmedKey);

    if (value === undefined || value === null) {
      // Keep placeholder if variable is missing
      return match;
    }

    // Convert to string
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  });
}

/**
 * Handle conditional blocks: {{#if variable}}content{{/if}}
 */
function handleConditionals(
  template: string,
  variables: Record<string, any>
): string {
  const conditionalRegex = /\{\{#if\s+([^}]+?)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  return template.replace(conditionalRegex, (match, condition, content) => {
    const trimmedCondition = condition.trim();
    const value = getNestedProperty(variables, trimmedCondition);

    // Check truthiness
    const isTruthy = Boolean(value) && value !== '' && value !== 0;

    return isTruthy ? content : '';
  });
}

/**
 * Handle loops: {{#each array}}{{this}}{{/each}}
 */
function handleLoops(
  template: string,
  variables: Record<string, any>
): string {
  const loopRegex = /\{\{#each\s+([^}]+?)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(loopRegex, (match, arrayKey, content) => {
    const trimmedKey = arrayKey.trim();
    const array = getNestedProperty(variables, trimmedKey);

    if (!Array.isArray(array)) {
      return '';
    }

    return array
      .map((item, index) => {
        // Create context for each item
        const itemContext = {
          ...variables,
          this: item,
          index,
          first: index === 0,
          last: index === array.length - 1,
        };

        // Render content with item context
        return handleVariables(content, itemContext);
      })
      .join('');
  });
}

/**
 * Get nested property with dot notation
 * e.g., "user.profile.name" => variables.user.profile.name
 */
function getNestedProperty(
  obj: Record<string, any>,
  path: string
): any {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Extract all variable placeholders from a template
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>();

  // Extract simple variables {{variable}}
  const simpleMatches = template.matchAll(/\{\{([^#/][^}]*?)\}\}/g);
  for (const match of simpleMatches) {
    const key = match[1].trim();
    // Ignore special keywords
    if (!['this', 'index', 'first', 'last'].includes(key)) {
      variables.add(key.split('.')[0]); // Take first part of dot notation
    }
  }

  // Extract conditionals {{#if variable}}
  const conditionalMatches = template.matchAll(/\{\{#if\s+([^}]+?)\}\}/g);
  for (const match of conditionalMatches) {
    const key = match[1].trim();
    variables.add(key.split('.')[0]);
  }

  // Extract loops {{#each array}}
  const loopMatches = template.matchAll(/\{\{#each\s+([^}]+?)\}\}/g);
  for (const match of loopMatches) {
    const key = match[1].trim();
    variables.add(key.split('.')[0]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables are present
 */
export function validateVariables(
  template: PromptTemplate,
  variables: Record<string, any>
): { valid: boolean; missing: string[]; unused: string[] } {
  const templateVariables = [
    ...(template.systemPrompt ? extractVariables(template.systemPrompt) : []),
    ...extractVariables(template.userPromptTemplate),
  ];

  const definedVariables = template.variables || [];
  const requiredVariables = definedVariables
    .filter((v) => v.required)
    .map((v) => v.key);

  // Check for missing required variables
  const missing = requiredVariables.filter(
    (key) => !(key in variables) || variables[key] === undefined || variables[key] === null
  );

  // Check for unused variables in template
  const unusedInTemplate = Object.keys(variables).filter(
    (key) => !templateVariables.includes(key) && key !== 'this'
  );

  return {
    valid: missing.length === 0,
    missing,
    unused: unusedInTemplate,
  };
}

/**
 * Preview a template with sample data
 */
export function previewTemplate(
  template: PromptTemplate,
  sampleData?: Record<string, any>
): { rendered: RenderedPrompt; variables: string[]; validation: ReturnType<typeof validateVariables> } {
  // Use sample data or generate defaults from variable definitions
  const variables = sampleData || generateSampleData(template);

  // Validate variables
  const validation = validateVariables(template, variables);

  // Render template
  const rendered = renderPrompt(template, variables);

  // Extract all variables used
  const extractedVars = [
    ...(template.systemPrompt ? extractVariables(template.systemPrompt) : []),
    ...extractVariables(template.userPromptTemplate),
  ];

  return {
    rendered,
    variables: extractedVars,
    validation,
  };
}

/**
 * Generate sample data from variable definitions
 */
function generateSampleData(template: PromptTemplate): Record<string, any> {
  if (!template.variables) return {};

  const sample: Record<string, any> = {};

  for (const variable of template.variables) {
    if (variable.example) {
      // Use example if provided
      sample[variable.key] = variable.example;
    } else if (variable.defaultValue) {
      // Use default value
      sample[variable.key] = variable.defaultValue;
    } else {
      // Generate based on type
      sample[variable.key] = generateSampleValue(variable);
    }
  }

  return sample;
}

/**
 * Generate a sample value based on variable type
 */
function generateSampleValue(variable: PromptVariable): any {
  switch (variable.type) {
    case 'string':
      return `[Sample ${variable.key}]`;
    case 'number':
      return 42;
    case 'boolean':
      return true;
    case 'array':
      return [`item1`, `item2`];
    case 'object':
      return { key: 'value' };
    default:
      return `[Sample ${variable.key}]`;
  }
}
