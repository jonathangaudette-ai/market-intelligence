#!/usr/bin/env tsx
/**
 * End-to-End Validation Script for Intelligent Document Analysis
 *
 * This script tests the complete document analysis pipeline without requiring
 * database or Pinecone connections. It validates the intelligent analysis
 * functionality using mock documents.
 *
 * Usage:
 *   npx tsx scripts/test-intelligent-analysis.ts
 *
 * Requirements:
 *   - ANTHROPIC_API_KEY environment variable must be set
 *   - ~$0.50 total cost for running all tests (4 documents × ~$0.12 each)
 */

import "dotenv/config";
import { analyzeDocument, getIndexableContent, getEnrichedMetadata } from "../src/lib/rag/intelligent-preprocessor";
import { MOCK_DOCUMENTS, EXPECTED_RESULTS } from "../src/lib/rag/__tests__/test-documents";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log("=".repeat(80) + "\n");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

// ============================================================================
// Test helper functions
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string, details?: any) {
  if (condition) {
    logSuccess(message);
    results.push({ name: message, passed: true, details });
  } else {
    logError(message);
    results.push({ name: message, passed: false, details });
  }
}

function assertContains(actual: string | undefined, expected: string, message: string) {
  if (actual && actual.includes(expected)) {
    logSuccess(message);
    results.push({ name: message, passed: true });
  } else {
    logError(`${message} (expected "${expected}", got "${actual}")`);
    results.push({ name: message, passed: false });
  }
}

function assertGreaterThan(actual: number | undefined, expected: number, message: string) {
  if (actual !== undefined && actual > expected) {
    logSuccess(`${message} (${actual} > ${expected})`);
    results.push({ name: message, passed: true });
  } else {
    logError(`${message} (expected > ${expected}, got ${actual})`);
    results.push({ name: message, passed: false });
  }
}

// ============================================================================
// Test Suite
// ============================================================================

async function testContract() {
  logSection("TEST 1: SaaS Contract Analysis");

  const startTime = Date.now();
  const analysis = await analyzeDocument(MOCK_DOCUMENTS.contract_saas, "test-company", {
    fileName: "saas-contract.pdf",
    fileType: "pdf",
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  logInfo(`Analysis completed in ${duration}s`);

  const expected = EXPECTED_RESULTS.contract_saas;

  // Basic classification
  assert(
    analysis.documentType === expected.documentType,
    `Document type: ${analysis.documentType}`
  );
  assert(
    analysis.confidence >= expected.confidence_min,
    `Confidence: ${(analysis.confidence * 100).toFixed(1)}%`
  );

  // Metadata extraction
  assertContains(
    analysis.metadata.contractType,
    "SaaS",
    "Contract type identified as SaaS"
  );

  assert(
    analysis.metadata.parties && analysis.metadata.parties.length >= 2,
    `Parties extracted: ${analysis.metadata.parties?.length || 0}`
  );

  assert(
    analysis.metadata.pricing?.model === "subscription",
    `Pricing model: ${analysis.metadata.pricing?.model}`
  );

  assertContains(
    analysis.metadata.pricing?.amount,
    "2,499",
    "Pricing amount extracted"
  );

  assert(
    (analysis.metadata.clauses?.length || 0) >= expected.metadata.clauses_count_min,
    `Clauses extracted: ${analysis.metadata.clauses?.length || 0}`
  );

  // Filtering
  assertGreaterThan(
    analysis.excludedSections.length,
    expected.sections_excluded_min - 1,
    `Non-relevant sections excluded: ${analysis.excludedSections.length}`
  );

  const indexableSections = analysis.sections.filter(s => s.shouldIndex);
  logInfo(`Indexable sections: ${indexableSections.length}/${analysis.sections.length}`);

  // Log sample metadata
  console.log("\nExtracted Metadata Sample:");
  console.log(JSON.stringify({
    contractType: analysis.metadata.contractType,
    parties: analysis.metadata.parties,
    pricing: analysis.metadata.pricing,
    terms: analysis.metadata.terms,
  }, null, 2));
}

async function testRFP() {
  logSection("TEST 2: Government RFP Analysis");

  const startTime = Date.now();
  const analysis = await analyzeDocument(MOCK_DOCUMENTS.rfp_government, "test-company", {
    fileName: "government-rfp.pdf",
    fileType: "pdf",
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  logInfo(`Analysis completed in ${duration}s`);

  const expected = EXPECTED_RESULTS.rfp_government;

  // Basic classification
  assert(
    analysis.documentType === expected.documentType,
    `Document type: ${analysis.documentType}`
  );

  // RFP-specific metadata
  assertContains(
    analysis.metadata.issuer,
    "Department of Commerce",
    "Issuer identified"
  );

  assertContains(
    analysis.metadata.deadline,
    "December 15, 2024",
    "Deadline extracted"
  );

  assert(
    analysis.metadata.budget?.min && analysis.metadata.budget.min.includes("2,000,000"),
    `Budget min: ${analysis.metadata.budget?.min}`
  );

  assert(
    analysis.metadata.budget?.max && analysis.metadata.budget.max.includes("5,000,000"),
    `Budget max: ${analysis.metadata.budget?.max}`
  );

  assertGreaterThan(
    analysis.metadata.requirements?.length,
    expected.metadata.requirements_count_min - 1,
    `Requirements extracted: ${analysis.metadata.requirements?.length || 0}`
  );

  assertContains(
    analysis.metadata.scope,
    "10,000",
    "Scope identified (10,000 users)"
  );

  // Log sample
  console.log("\nRFP Details:");
  console.log(JSON.stringify({
    issuer: analysis.metadata.issuer,
    deadline: analysis.metadata.deadline,
    budget: analysis.metadata.budget,
    scope: analysis.metadata.scope,
    requirementsCount: analysis.metadata.requirements?.length,
  }, null, 2));
}

async function testCompetitiveReport() {
  logSection("TEST 3: Competitive Report with Signal Detection");

  const startTime = Date.now();
  const analysis = await analyzeDocument(MOCK_DOCUMENTS.competitive_report_q4, "test-company", {
    fileName: "q4-competitive-report.pdf",
    fileType: "pdf",
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  logInfo(`Analysis completed in ${duration}s`);

  const expected = EXPECTED_RESULTS.competitive_report_q4;

  // Basic classification
  assert(
    analysis.documentType === expected.documentType,
    `Document type: ${analysis.documentType}`
  );

  // Competitors
  assertGreaterThan(
    analysis.metadata.competitors?.length,
    expected.metadata.competitors_count_min - 1,
    `Competitors identified: ${analysis.metadata.competitors?.length || 0}`
  );

  assert(
    analysis.metadata.competitors?.includes("Competitor X"),
    "Competitor X detected"
  );

  // Date range
  assertContains(
    analysis.metadata.dateRange,
    "Q4 2024",
    "Date range identified"
  );

  // Hiring data
  assertGreaterThan(
    analysis.metadata.hiringData?.companies.length,
    expected.metadata.hiringData.companies_count_min - 1,
    `Hiring companies tracked: ${analysis.metadata.hiringData?.companies.length || 0}`
  );

  assertGreaterThan(
    analysis.metadata.hiringData?.positions.length,
    expected.metadata.hiringData.positions_count_min - 1,
    `Hiring positions tracked: ${analysis.metadata.hiringData?.positions.length || 0}`
  );

  // ⭐ SIGNALS DETECTION
  logInfo("\n🚨 SIGNALS DETECTED:");
  assertGreaterThan(
    analysis.signals.length,
    expected.signals_min - 1,
    `Total signals: ${analysis.signals.length}`
  );

  analysis.signals.forEach(signal => {
    console.log(`   - [${signal.severity.toUpperCase()}] ${signal.type}: ${signal.summary}`);
  });

  // Verify specific signals
  const priceSignal = analysis.signals.find(s => s.type === "price_change");
  assert(
    priceSignal !== undefined,
    "Price change signal detected"
  );

  const hiringSignal = analysis.signals.find(s => s.type === "hiring_spike");
  assert(
    hiringSignal !== undefined,
    "Hiring spike signal detected"
  );

  const productSignal = analysis.signals.find(s => s.type === "new_product");
  assert(
    productSignal !== undefined,
    "New product signal detected"
  );

  // Log enriched metadata
  console.log("\nEnriched Metadata for Vectors:");
  const enrichedMetadata = getEnrichedMetadata(analysis);
  console.log(JSON.stringify(enrichedMetadata, null, 2));
}

async function testFinancialReport() {
  logSection("TEST 4: Financial Report Analysis");

  const startTime = Date.now();
  const analysis = await analyzeDocument(MOCK_DOCUMENTS.financial_report_q3, "test-company", {
    fileName: "q3-2024-earnings.pdf",
    fileType: "pdf",
  });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  logInfo(`Analysis completed in ${duration}s`);

  const expected = EXPECTED_RESULTS.financial_report_q3;

  // Basic classification
  assert(
    analysis.documentType === expected.documentType,
    `Document type: ${analysis.documentType}`
  );

  // Fiscal period
  assertContains(
    analysis.metadata.fiscalPeriod,
    "Q3 2024",
    "Fiscal period identified"
  );

  // Revenue
  assertContains(
    analysis.metadata.revenue?.current,
    "125.5M",
    "Revenue extracted"
  );

  // Growth metrics
  assertGreaterThan(
    analysis.metadata.growthMetrics?.length,
    expected.metadata.growthMetrics_count_min - 1,
    `Growth metrics: ${analysis.metadata.growthMetrics?.length || 0}`
  );

  // Log sample
  console.log("\nFinancial Metrics:");
  console.log(JSON.stringify({
    fiscalPeriod: analysis.metadata.fiscalPeriod,
    revenue: analysis.metadata.revenue,
    profitability: analysis.metadata.profitability,
    topMetrics: analysis.metadata.growthMetrics?.slice(0, 3),
  }, null, 2));
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.clear();
  log("\n╔═══════════════════════════════════════════════════════════════════════════╗", colors.bright + colors.cyan);
  log("║   INTELLIGENT DOCUMENT ANALYSIS - END-TO-END VALIDATION                  ║", colors.bright + colors.cyan);
  log("╚═══════════════════════════════════════════════════════════════════════════╝", colors.bright + colors.cyan);

  // Check environment
  if (!process.env.ANTHROPIC_API_KEY) {
    logError("\nANTHROPIC_API_KEY environment variable is not set!");
    logInfo("Please set it before running this test:");
    logInfo("  export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  logSuccess("✅ Environment configured\n");

  const startTime = Date.now();

  try {
    // Run all tests
    await testContract();
    await testRFP();
    await testCompetitiveReport();
    await testFinancialReport();

    // Summary
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSection("TEST SUMMARY");

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    logInfo(`Total tests: ${total}`);
    logSuccess(`Passed: ${passed}`);
    if (failed > 0) {
      logError(`Failed: ${failed}`);
    }
    logInfo(`Duration: ${totalDuration}s`);

    if (failed === 0) {
      log("\n🎉 ALL TESTS PASSED! 🎉\n", colors.bright + colors.green);
    } else {
      log("\n⚠️  SOME TESTS FAILED\n", colors.bright + colors.yellow);
      console.log("\nFailed tests:");
      results.filter(r => !r.passed).forEach(r => {
        logError(`  - ${r.name}`);
      });
    }

    // Estimated cost
    const estimatedCost = (4 * 0.12).toFixed(2); // 4 docs × ~$0.12
    logInfo(`\nEstimated API cost: ~$${estimatedCost}`);

  } catch (error) {
    logError("\n❌ TEST SUITE FAILED WITH ERROR:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
