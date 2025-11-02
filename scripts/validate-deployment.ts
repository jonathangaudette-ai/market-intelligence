#!/usr/bin/env tsx
/**
 * Post-Deployment Validation Script
 *
 * Validates that the deployed application is working correctly by testing:
 * - Database connectivity (Neon)
 * - Pinecone index accessibility
 * - API endpoints
 * - Environment variables
 * - Intelligent analysis functionality
 *
 * Usage:
 *   # For production
 *   DEPLOYMENT_URL=https://your-app.vercel.app npx tsx scripts/validate-deployment.ts
 *
 *   # For local
 *   DEPLOYMENT_URL=http://localhost:3010 npx tsx scripts/validate-deployment.ts
 */

import "dotenv/config";

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

function logSection(title: string) {
  console.log("\n" + "=".repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// Test helpers
// ============================================================================

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
}

const results: TestResult[] = [];

function addResult(name: string, status: "pass" | "fail" | "warn", message?: string) {
  results.push({ name, status, message });

  if (status === "pass") {
    logSuccess(name);
  } else if (status === "fail") {
    logError(`${name}${message ? `: ${message}` : ""}`);
  } else {
    logWarning(`${name}${message ? `: ${message}` : ""}`);
  }
}

// ============================================================================
// Validation tests
// ============================================================================

async function validateEnvironmentVariables() {
  logSection("1. Environment Variables");

  const required = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "PINECONE_API_KEY",
    "PINECONE_INDEX_NAME",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
  ];

  const optional = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "FIRECRAWL_API_KEY",
  ];

  let allRequired = true;

  for (const varName of required) {
    if (process.env[varName]) {
      addResult(`${varName} configured`, "pass");
    } else {
      addResult(`${varName} missing`, "fail", "This is required!");
      allRequired = false;
    }
  }

  for (const varName of optional) {
    if (process.env[varName]) {
      addResult(`${varName} configured`, "pass");
    } else {
      addResult(`${varName} not configured`, "warn", "Optional but recommended");
    }
  }

  return allRequired;
}

async function validateDatabaseConnection() {
  logSection("2. Database Connection (Neon)");

  try {
    // Import Drizzle
    const { db } = await import("../src/db");
    const { sql } = await import("drizzle-orm");

    // Test query
    const result = await db.execute(sql`SELECT NOW() as current_time`);

    addResult("Database connection successful", "pass");

    // Check tables exist
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    const tableNames = (tables as any[]).map((r: any) => r.table_name);
    const expectedTables = [
      "users",
      "companies",
      "company_members",
      "competitors",
      "documents",
      "conversations",
      "messages",
      "signals", // New table
    ];

    for (const tableName of expectedTables) {
      if (tableNames.includes(tableName)) {
        addResult(`Table '${tableName}' exists`, "pass");
      } else {
        addResult(`Table '${tableName}' missing`, "fail", "Run migrations!");
      }
    }

    // Check new columns in documents table
    const documentsCols = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'documents'
    `);

    const colNames = (documentsCols as any[]).map((r: any) => r.column_name);
    const newCols = ["document_type", "analysis_completed", "analysis_confidence"];

    for (const colName of newCols) {
      if (colNames.includes(colName)) {
        addResult(`Column 'documents.${colName}' exists`, "pass");
      } else {
        addResult(`Column 'documents.${colName}' missing`, "fail", "Run migrations!");
      }
    }

    return true;
  } catch (error: any) {
    addResult("Database connection failed", "fail", error.message);
    return false;
  }
}

async function validatePineconeConnection() {
  logSection("3. Pinecone Vector Database");

  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX_NAME!;

    // Check index exists
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

    if (indexExists) {
      addResult(`Index '${indexName}' exists`, "pass");
    } else {
      addResult(`Index '${indexName}' not found`, "fail", "Create index in Pinecone console");
      return false;
    }

    // Get index stats
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();

    addResult(`Total vectors: ${stats.totalRecordCount || 0}`, "pass");
    addResult(`Index dimension: ${stats.dimension || 0}`, stats.dimension === 1536 ? "pass" : "fail");

    return true;
  } catch (error: any) {
    addResult("Pinecone connection failed", "fail", error.message);
    return false;
  }
}

async function validateAPIEndpoints() {
  logSection("4. API Endpoints");

  const baseUrl = process.env.DEPLOYMENT_URL || "http://localhost:3010";
  logInfo(`Testing against: ${baseUrl}`);

  // Test health endpoint (if exists)
  try {
    const response = await fetch(`${baseUrl}/`);
    if (response.ok) {
      addResult("App is accessible", "pass");
    } else {
      addResult("App returned error", "fail", `Status: ${response.status}`);
    }
  } catch (error: any) {
    addResult("App is not accessible", "fail", error.message);
    return false;
  }

  return true;
}

async function validateIntelligentAnalysis() {
  logSection("5. Intelligent Analysis System");

  try {
    // Check Anthropic API
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const testMessage = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: "Hello! Just testing the API connection. Please respond with 'OK'."
      }],
    });

    const responseText = testMessage.content[0].type === "text"
      ? testMessage.content[0].text
      : "";

    if (responseText.includes("OK")) {
      addResult("Anthropic Claude Sonnet 4 accessible", "pass");
    } else {
      addResult("Anthropic API works but unexpected response", "warn");
    }
  } catch (error: any) {
    addResult("Anthropic API failed", "fail", error.message);
    return false;
  }

  try {
    // Check OpenAI API
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: "test",
      dimensions: 1536,
    });

    if (embedding.data[0].embedding.length === 1536) {
      addResult("OpenAI embeddings accessible", "pass");
    } else {
      addResult("OpenAI embeddings dimension mismatch", "fail");
    }
  } catch (error: any) {
    addResult("OpenAI API failed", "fail", error.message);
    return false;
  }

  // Check analysis config
  try {
    const { DEFAULT_ANALYSIS_CONFIG } = await import("../src/lib/rag/analysis-config");

    addResult(`Analysis rules configured: ${DEFAULT_ANALYSIS_CONFIG.exclusionRules.length} exclusion rules`, "pass");
    addResult(`Metadata extraction rules: ${DEFAULT_ANALYSIS_CONFIG.metadataExtractionRules.length} rules`, "pass");
    addResult(`Signal detection rules: ${DEFAULT_ANALYSIS_CONFIG.signalDetectionRules.length} rules`, "pass");
    addResult(`Minimum relevance score: ${DEFAULT_ANALYSIS_CONFIG.minRelevanceScore}/10`, "pass");
  } catch (error: any) {
    addResult("Analysis config failed to load", "fail", error.message);
  }

  return true;
}

// ============================================================================
// Main validation runner
// ============================================================================

async function main() {
  console.clear();
  log("\n╔═══════════════════════════════════════════════════════════════════════════╗", colors.bright + colors.cyan);
  log("║           POST-DEPLOYMENT VALIDATION - MARKET INTELLIGENCE               ║", colors.bright + colors.cyan);
  log("╚═══════════════════════════════════════════════════════════════════════════╝", colors.bright + colors.cyan);

  const deploymentUrl = process.env.DEPLOYMENT_URL || "http://localhost:3010";
  logInfo(`\nDeployment URL: ${deploymentUrl}`);
  logInfo(`Environment: ${process.env.VERCEL_ENV || "local"}\n`);

  // Run all validations
  const envOk = await validateEnvironmentVariables();

  if (!envOk) {
    logError("\n❌ Missing required environment variables. Please configure them before proceeding.");
    process.exit(1);
  }

  const dbOk = await validateDatabaseConnection();
  const pineconeOk = await validatePineconeConnection();
  const apiOk = await validateAPIEndpoints();
  const analysisOk = await validateIntelligentAnalysis();

  // Summary
  logSection("VALIDATION SUMMARY");

  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const warned = results.filter(r => r.status === "warn").length;
  const total = results.length;

  logInfo(`Total checks: ${total}`);
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  if (warned > 0) {
    logWarning(`Warnings: ${warned}`);
  }

  // Overall status
  if (failed === 0) {
    log("\n🎉 DEPLOYMENT VALIDATION SUCCESSFUL! 🎉\n", colors.bright + colors.green);
    logInfo("Your application is ready to use.\n");

    logInfo("Next steps:");
    logInfo("1. Create a test user");
    logInfo("2. Upload a test document");
    logInfo("3. Verify intelligent analysis in logs");
    logInfo("4. Check signals in database\n");

    process.exit(0);
  } else {
    log("\n⚠️  DEPLOYMENT VALIDATION FAILED\n", colors.bright + colors.red);

    console.log("Failed checks:");
    results.filter(r => r.status === "fail").forEach(r => {
      logError(`  - ${r.name}${r.message ? `: ${r.message}` : ""}`);
    });

    logInfo("\nPlease fix the issues above before using the application.");
    logInfo("Refer to DEPLOYMENT_GUIDE.md for troubleshooting.\n");

    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  logError("\n❌ VALIDATION FAILED WITH ERROR:");
  console.error(error);
  process.exit(1);
});
