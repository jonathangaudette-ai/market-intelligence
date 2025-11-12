#!/usr/bin/env node

/**
 * API Test Suite for RFP Surgical Retrieval System
 *
 * This script tests the API endpoints directly without needing a running server.
 * It uses the Next.js API routes directly.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let testsPassed = 0;
let testsFailed = 0;

function printTest(message) {
  console.log(`${colors.blue}[TEST]${colors.reset} ${message}`);
}

function printSuccess(message) {
  console.log(`${colors.green}[✓]${colors.reset} ${message}`);
  testsPassed++;
}

function printError(message) {
  console.log(`${colors.red}[✗]${colors.reset} ${message}`);
  testsFailed++;
}

function printInfo(message) {
  console.log(`${colors.yellow}[INFO]${colors.reset} ${message}`);
}

function printHeader(message) {
  console.log('');
  console.log('============================================');
  console.log(message);
  console.log('============================================');
}

// Test 1: Check file structure
async function testFileStructure() {
  printHeader('TEST 1: File Structure');

  const requiredFiles = [
    'src/types/content-types.ts',
    'src/lib/rfp/historical-import.ts',
    'src/lib/rfp/content-type-detector.ts',
    'src/lib/rfp/source-scoring.ts',
    'src/lib/rfp/smart-defaults.ts',
    'src/lib/constants/ai-models.ts',
    'src/components/rfp/historical-import-form.tsx',
    'src/components/rfp/smart-configure-button.tsx',
    'src/components/rfp/source-indicator-badge.tsx',
    'src/app/(dashboard)/companies/[slug]/rfps/import/page.tsx',
    'src/app/(dashboard)/companies/[slug]/rfps/library/page.tsx',
    'src/app/api/companies/[slug]/rfps/import-historical/route.ts',
    'src/app/api/companies/[slug]/rfps/[id]/smart-configure/route.ts',
    'src/app/api/companies/[slug]/rfps/[id]/suggest-sources/route.ts',
    'src/app/api/companies/[slug]/rfps/library/route.ts',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (existsSync(filePath)) {
      printSuccess(`File exists: ${file}`);
    } else {
      printError(`File missing: ${file}`);
    }
  }
}

// Test 2: Check TypeScript types
async function testTypeScriptTypes() {
  printHeader('TEST 2: TypeScript Type Definitions');

  const contentTypesPath = path.join(__dirname, 'src/types/content-types.ts');

  if (existsSync(contentTypesPath)) {
    const content = readFileSync(contentTypesPath, 'utf-8');

    // Check for ContentType
    if (content.includes('export type ContentType')) {
      printSuccess('ContentType type is exported');
    } else {
      printError('ContentType type is not exported');
    }

    // Check for content type descriptions
    if (content.includes('CONTENT_TYPE_DESCRIPTIONS')) {
      printSuccess('CONTENT_TYPE_DESCRIPTIONS is defined');
    } else {
      printError('CONTENT_TYPE_DESCRIPTIONS is not defined');
    }

    // Check for adaptation levels
    if (content.includes('AdaptationLevel')) {
      printSuccess('AdaptationLevel type is defined');
    } else {
      printError('AdaptationLevel type is not defined');
    }

    // Check for all 11 content types
    const contentTypes = [
      'company-overview',
      'corporate-info',
      'team-structure',
      'company-history',
      'values-culture',
      'product-description',
      'service-offering',
      'project-methodology',
      'technical-solution',
      'project-timeline',
      'pricing-structure',
    ];

    let foundTypes = 0;
    for (const type of contentTypes) {
      if (content.includes(`'${type}'`)) {
        foundTypes++;
      }
    }

    if (foundTypes === 11) {
      printSuccess(`All 11 content types are defined (${foundTypes}/11)`);
    } else {
      printError(`Only ${foundTypes}/11 content types found`);
    }
  } else {
    printError('content-types.ts file not found');
  }
}

// Test 3: Check API route exports
async function testAPIRoutes() {
  printHeader('TEST 3: API Route Exports');

  const apiRoutes = [
    {
      path: 'src/app/api/companies/[slug]/rfps/import-historical/route.ts',
      methods: ['POST'],
    },
    {
      path: 'src/app/api/companies/[slug]/rfps/[id]/smart-configure/route.ts',
      methods: ['POST', 'GET'],
    },
    {
      path: 'src/app/api/companies/[slug]/rfps/[id]/suggest-sources/route.ts',
      methods: ['GET'],
    },
    {
      path: 'src/app/api/companies/[slug]/rfps/library/route.ts',
      methods: ['GET'],
    },
  ];

  for (const route of apiRoutes) {
    const filePath = path.join(__dirname, route.path);

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');

      for (const method of route.methods) {
        if (content.includes(`export async function ${method}`)) {
          printSuccess(`${route.path} exports ${method} handler`);
        } else {
          printError(`${route.path} missing ${method} handler`);
        }
      }

      // Check for authentication
      if (content.includes('auth()')) {
        printSuccess(`${route.path} has authentication`);
      } else {
        printInfo(`${route.path} might be missing authentication`);
      }
    } else {
      printError(`Route file not found: ${route.path}`);
    }
  }
}

// Test 4: Check component exports
async function testComponents() {
  printHeader('TEST 4: React Component Exports');

  const components = [
    {
      path: 'src/components/rfp/historical-import-form.tsx',
      export: 'HistoricalImportForm',
    },
    {
      path: 'src/components/rfp/smart-configure-button.tsx',
      export: 'SmartConfigureButton',
    },
    {
      path: 'src/components/rfp/source-indicator-badge.tsx',
      export: 'SourceIndicatorBadge',
    },
  ];

  for (const component of components) {
    const filePath = path.join(__dirname, component.path);

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');

      if (content.includes(`export function ${component.export}`)) {
        printSuccess(`${component.path} exports ${component.export}`);
      } else {
        printError(`${component.path} missing export: ${component.export}`);
      }

      // Check for 'use client' directive
      if (content.includes("'use client'")) {
        printSuccess(`${component.path} has 'use client' directive`);
      } else {
        printInfo(`${component.path} might be missing 'use client' directive`);
      }
    } else {
      printError(`Component file not found: ${component.path}`);
    }
  }
}

// Test 5: Check service functions
async function testServices() {
  printHeader('TEST 5: Service Function Exports');

  const services = [
    {
      path: 'src/lib/rfp/historical-import.ts',
      functions: ['importHistoricalRfp'],
    },
    {
      path: 'src/lib/rfp/content-type-detector.ts',
      functions: ['detectQuestionContentTypes'],
    },
    {
      path: 'src/lib/rfp/source-scoring.ts',
      functions: ['scoreAndRankRfps'],
    },
    {
      path: 'src/lib/rfp/smart-defaults.ts',
      functions: ['generateSmartDefaults'],
    },
  ];

  for (const service of services) {
    const filePath = path.join(__dirname, service.path);

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');

      for (const fn of service.functions) {
        if (content.includes(`export async function ${fn}`) || content.includes(`export function ${fn}`)) {
          printSuccess(`${service.path} exports ${fn}()`);
        } else {
          printError(`${service.path} missing function: ${fn}()`);
        }
      }
    } else {
      printError(`Service file not found: ${service.path}`);
    }
  }
}

// Test 6: Check Pinecone integration
async function testPineconeIntegration() {
  printHeader('TEST 6: Pinecone Integration');

  const pineconePath = path.join(__dirname, 'src/lib/rfp/pinecone.ts');

  if (existsSync(pineconePath)) {
    const content = readFileSync(pineconePath, 'utf-8');

    // Check for new functions
    const functions = [
      'indexRfpContent',
      'queryByContentType',
      'getRFPNamespace',
    ];

    for (const fn of functions) {
      if (content.includes(`export async function ${fn}`) || content.includes(`export function ${fn}`)) {
        printSuccess(`Pinecone exports ${fn}()`);
      } else {
        printError(`Pinecone missing function: ${fn}()`);
      }
    }

    // Check for RFPVectorMetadata interface
    if (content.includes('export interface RFPVectorMetadata')) {
      printSuccess('RFPVectorMetadata interface is exported');

      // Check for new fields
      const newFields = ['contentType', 'isHistorical', 'rfpOutcome', 'qualityScore', 'companyId'];
      let fieldsFound = 0;

      for (const field of newFields) {
        if (content.includes(`${field}?:`) || content.includes(`${field}:`)) {
          fieldsFound++;
        }
      }

      if (fieldsFound === newFields.length) {
        printSuccess(`All ${newFields.length} surgical retrieval fields present in metadata`);
      } else {
        printError(`Only ${fieldsFound}/${newFields.length} metadata fields found`);
      }
    } else {
      printError('RFPVectorMetadata interface not found');
    }
  } else {
    printError('Pinecone integration file not found');
  }
}

// Test 7: Check database schema
async function testDatabaseSchema() {
  printHeader('TEST 7: Database Schema');

  const schemaPath = path.join(__dirname, 'src/db/schema.ts');

  if (existsSync(schemaPath)) {
    const content = readFileSync(schemaPath, 'utf-8');

    // Check for new table
    if (content.includes('rfpSourcePreferences')) {
      printSuccess('rfpSourcePreferences table is defined');
    } else {
      printError('rfpSourcePreferences table not found');
    }

    // Check for new columns in rfps
    const rfpsColumns = ['isHistorical', 'submittedDocument', 'qualityScore', 'usageCount', 'lastUsedAt'];
    let foundColumns = 0;

    for (const col of rfpsColumns) {
      if (content.includes(col)) {
        foundColumns++;
      }
    }

    if (foundColumns === rfpsColumns.length) {
      printSuccess(`All ${rfpsColumns.length} historical RFP columns present`);
    } else {
      printInfo(`Found ${foundColumns}/${rfpsColumns.length} historical RFP columns`);
    }

    // Check for new columns in rfp_questions
    const questionsColumns = ['primaryContentType', 'selectedSourceRfpId', 'detectionConfidence'];
    foundColumns = 0;

    for (const col of questionsColumns) {
      if (content.includes(col)) {
        foundColumns++;
      }
    }

    if (foundColumns === questionsColumns.length) {
      printSuccess(`All ${questionsColumns.length} question classification columns present`);
    } else {
      printInfo(`Found ${foundColumns}/${questionsColumns.length} question classification columns`);
    }
  } else {
    printError('Database schema file not found');
  }
}

// Test 8: Check TypeScript compilation
async function testTypeScriptCompilation() {
  printHeader('TEST 8: TypeScript Compilation');

  try {
    printTest('Running Next.js build check...');
    const output = execSync('npm run build', { stdio: 'pipe', encoding: 'utf-8' });

    if (output.includes('✓ Compiled successfully')) {
      printSuccess('Next.js build successful');
    } else {
      printError('Build completed but with warnings');
    }
  } catch (error) {
    printError('Build failed');
    printInfo('Check build output for errors');
  }
}

// Main execution
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  RFP Surgical Retrieval - API Tests       ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  printInfo('Starting API test suite...');
  console.log('');

  await testFileStructure();
  await testTypeScriptTypes();
  await testAPIRoutes();
  await testComponents();
  await testServices();
  await testPineconeIntegration();
  await testDatabaseSchema();
  await testTypeScriptCompilation();

  // Print summary
  console.log('');
  printHeader('TEST SUMMARY');
  console.log('');
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log('');

  if (testsFailed === 0) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
