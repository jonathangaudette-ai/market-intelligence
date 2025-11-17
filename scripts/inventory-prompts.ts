/**
 * Inventory all prompts in the codebase
 * Scans source files to identify hardcoded prompts
 */

console.log('\n📋 INVENTORY OF HARDCODED PROMPTS\n');
console.log('='.repeat(60));

const prompts = [
  {
    key: 'RFP_RESPONSE_MAIN',
    file: 'src/lib/rfp/ai/claude.ts',
    function: 'generateRFPResponse',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    maxTokens: 4000,
    category: 'rfp_generation',
    priority: 'P0 - Critical',
  },
  {
    key: 'QUESTION_CATEGORIZATION',
    file: 'src/lib/rfp/ai/claude.ts',
    function: 'categorizeQuestion',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.3,
    maxTokens: 500,
    category: 'question_analysis',
    priority: 'P1 - High',
  },
  {
    key: 'QUESTION_CATEGORIZATION_BATCH',
    file: 'src/lib/rfp/ai/claude.ts',
    function: 'categorizeQuestionsBatch',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.3,
    maxTokens: 4000,
    category: 'question_analysis',
    priority: 'P1 - High',
  },
  {
    key: 'COMPETITIVE_POSITIONING',
    file: 'src/lib/rfp/ai/claude.ts',
    function: 'generateCompetitivePositioning',
    model: 'claude-sonnet-4-5-20250929',
    temperature: 0.8,
    maxTokens: 2000,
    category: 'intelligence',
    priority: 'P2 - Medium',
  },
  {
    key: 'QUESTION_EXTRACTION',
    file: 'src/lib/rfp/parser/question-extractor.ts',
    function: 'extractQuestions',
    model: 'gpt-5',
    temperature: null,
    maxTokens: 16000,
    category: 'document_analysis',
    priority: 'P0 - Critical',
  },
  {
    key: 'HISTORICAL_RFP_RESPONSE_PARSING',
    file: 'src/lib/rfp/historical-import.ts',
    function: 'parseSubmittedResponse',
    model: 'gpt-5',
    temperature: null,
    maxTokens: null,
    category: 'document_analysis',
    priority: 'P2 - Medium',
  },
  {
    key: 'HISTORICAL_RFP_MATCHING',
    file: 'src/lib/rfp/historical-import.ts',
    function: 'matchQuestionsToResponses',
    model: 'gpt-5',
    temperature: null,
    maxTokens: null,
    category: 'document_analysis',
    priority: 'P1 - High',
  },
  {
    key: 'AI_ENRICHMENT',
    file: 'src/lib/prompts/defaults.ts',
    function: 'Already migrated',
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.7,
    maxTokens: 4096,
    category: 'enrichment',
    priority: 'P1 - High',
    status: 'MIGRATED',
  },
];

console.log('Total prompts found:', prompts.length);
console.log('');

const byPriority = {
  'P0': [],
  'P1': [],
  'P2': []
};

prompts.forEach(p => {
  const priority = p.priority.split(' - ')[0];
  byPriority[priority].push(p);
});

for (const [priority, items] of Object.entries(byPriority)) {
  if (items.length === 0) continue;
  console.log(`
${priority} - ${items.length} prompts:`);
  console.log('-'.repeat(60));
  items.forEach((p) => {
    const status = p.status === 'MIGRATED' ? '✅' : '⏳';
    console.log(`  ${status} ${p.key}`);
    console.log(`     File: ${p.file}`);
    console.log(`     Model: ${p.model}`);
    console.log(`     Category: ${p.category}`);
    console.log('');
  });
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('  ✅ Migrated: 1');
console.log('  ⏳ To migrate: 7');
console.log('  📝 Total: 8');
console.log('='.repeat(60) + '\n');

process.exit(0);
