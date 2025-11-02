/**
 * Unit tests for intelligent document analysis
 *
 * NOTE: These tests require ANTHROPIC_API_KEY to be set
 * Run with: npm test -- intelligent-preprocessor.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { analyzeDocument, getIndexableContent, getEnrichedMetadata } from "../intelligent-preprocessor";
import { MOCK_DOCUMENTS, EXPECTED_RESULTS } from "./test-documents";

// Skip tests if no API key (for CI/CD)
const SKIP_TESTS = !process.env.ANTHROPIC_API_KEY;
const describeIf = SKIP_TESTS ? describe.skip : describe;

describeIf("Intelligent Document Analysis", () => {
  // Mock company ID for tests
  const TEST_COMPANY_ID = "test-company-001";

  beforeAll(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("⚠️  ANTHROPIC_API_KEY not set - skipping intelligent analysis tests");
    }
  });

  // ============================================================================
  // Test 1: Contract Analysis
  // ============================================================================
  describe("Contract Document Analysis", () => {
    it("should correctly identify and analyze a SaaS contract", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.contract_saas,
        TEST_COMPANY_ID,
        { fileName: "saas-contract.pdf", fileType: "pdf" }
      );

      const expected = EXPECTED_RESULTS.contract_saas;

      // Check document type classification
      expect(analysis.documentType).toBe(expected.documentType);
      expect(analysis.confidence).toBeGreaterThanOrEqual(expected.confidence_min);

      // Check metadata extraction
      expect(analysis.metadata.contractType).toBeDefined();
      expect(analysis.metadata.parties).toBeDefined();
      expect(analysis.metadata.parties?.length).toBeGreaterThanOrEqual(2);

      // Check pricing extraction
      expect(analysis.metadata.pricing).toBeDefined();
      expect(analysis.metadata.pricing?.model).toBe("subscription");
      expect(analysis.metadata.pricing?.amount).toContain("2,499");
      expect(analysis.metadata.pricing?.currency).toBe("USD");

      // Check terms extraction
      expect(analysis.metadata.terms).toBeDefined();
      expect(analysis.metadata.terms?.duration).toContain("12 months");

      // Check clauses extraction
      expect(analysis.metadata.clauses).toBeDefined();
      expect(analysis.metadata.clauses?.length).toBeGreaterThanOrEqual(expected.metadata.clauses_count_min);

      // Verify SLA clause is detected
      const slaClause = analysis.metadata.clauses?.find(c => c.type.toLowerCase().includes("sla"));
      expect(slaClause).toBeDefined();
      expect(slaClause?.summary).toContain("99.9%");

      // Check that non-relevant sections are excluded
      expect(analysis.excludedSections.length).toBeGreaterThanOrEqual(expected.sections_excluded_min);

      const excludedTitles = analysis.excludedSections.map(s => s.title.toLowerCase());
      expect(excludedTitles.some(t => t.includes("disclaimer"))).toBe(true);
      expect(excludedTitles.some(t => t.includes("table of contents"))).toBe(true);

      // Check that relevant sections are marked for indexing
      const indexableSections = analysis.sections.filter(s => s.shouldIndex);
      expect(indexableSections.length).toBeGreaterThan(0);

      console.log(`✅ Contract Analysis: ${analysis.sections.filter(s => s.shouldIndex).length}/${analysis.sections.length} sections indexed`);
    }, 60000); // 60s timeout for API call

    it("should extract indexable content correctly", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.contract_saas,
        TEST_COMPANY_ID
      );

      const indexableContent = getIndexableContent(analysis);

      // Should have content to index
      expect(indexableContent.length).toBeGreaterThan(0);

      // Content should not include disclaimer or TOC
      const combinedContent = indexableContent.join(" ").toLowerCase();
      expect(combinedContent).not.toContain("this document is confidential and proprietary");
      expect(combinedContent).not.toContain("table of contents");

      // Should include actual contract terms
      expect(combinedContent).toContain("subscription fee");
      expect(combinedContent).toContain("service level agreement");
    }, 60000);

    it("should generate enriched metadata for vectors", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.contract_saas,
        TEST_COMPANY_ID
      );

      const enrichedMetadata = getEnrichedMetadata(analysis);

      // Check required fields
      expect(enrichedMetadata.document_type).toBe("contract");
      expect(enrichedMetadata.industry).toBeDefined();
      expect(enrichedMetadata.language).toBeDefined();

      // Check contract-specific metadata
      expect(enrichedMetadata.contract_type).toBeDefined();
      expect(enrichedMetadata.pricing_model).toBe("subscription");
      expect(enrichedMetadata.pricing_amount).toContain("2,499");

      console.log("✅ Enriched metadata:", JSON.stringify(enrichedMetadata, null, 2));
    }, 60000);
  });

  // ============================================================================
  // Test 2: RFP Analysis
  // ============================================================================
  describe("RFP Document Analysis", () => {
    it("should correctly identify and analyze an RFP", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.rfp_government,
        TEST_COMPANY_ID,
        { fileName: "government-rfp.pdf", fileType: "pdf" }
      );

      const expected = EXPECTED_RESULTS.rfp_government;

      // Check document type
      expect(analysis.documentType).toBe(expected.documentType);
      expect(analysis.confidence).toBeGreaterThanOrEqual(expected.confidence_min);

      // Check RFP-specific metadata
      expect(analysis.metadata.issuer).toContain("Department of Commerce");
      expect(analysis.metadata.deadline).toContain("December 15, 2024");

      // Check budget extraction
      expect(analysis.metadata.budget).toBeDefined();
      expect(analysis.metadata.budget?.min).toContain("2,000,000");
      expect(analysis.metadata.budget?.max).toContain("5,000,000");

      // Check requirements extraction
      expect(analysis.metadata.requirements).toBeDefined();
      expect(analysis.metadata.requirements?.length).toBeGreaterThanOrEqual(expected.metadata.requirements_count_min);

      // Check evaluation criteria
      expect(analysis.metadata.evaluationCriteria).toBeDefined();
      expect(analysis.metadata.evaluationCriteria?.length).toBeGreaterThan(0);

      // Check scope
      expect(analysis.metadata.scope).toBeDefined();
      expect(analysis.metadata.scope).toContain("10,000 users");

      console.log(`✅ RFP Analysis: Budget ${analysis.metadata.budget?.min} - ${analysis.metadata.budget?.max}`);
      console.log(`   Requirements: ${analysis.metadata.requirements?.length} items`);
    }, 60000);
  });

  // ============================================================================
  // Test 3: Competitive Report Analysis with Signal Detection
  // ============================================================================
  describe("Competitive Report Analysis with Signals", () => {
    it("should detect competitive intelligence signals", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.competitive_report_q4,
        TEST_COMPANY_ID,
        { fileName: "q4-competitive-report.pdf", fileType: "pdf" }
      );

      const expected = EXPECTED_RESULTS.competitive_report_q4;

      // Check document type
      expect(analysis.documentType).toBe(expected.documentType);
      expect(analysis.confidence).toBeGreaterThanOrEqual(expected.confidence_min);

      // Check competitors extraction
      expect(analysis.metadata.competitors).toBeDefined();
      expect(analysis.metadata.competitors?.length).toBeGreaterThanOrEqual(expected.metadata.competitors_count_min);
      expect(analysis.metadata.competitors).toContain("Competitor X");
      expect(analysis.metadata.competitors).toContain("Competitor Y");

      // Check date range
      expect(analysis.metadata.dateRange).toContain("Q4 2024");

      // Check strategic themes
      expect(analysis.metadata.strategicThemes).toBeDefined();
      expect(analysis.metadata.strategicThemes?.length).toBeGreaterThanOrEqual(expected.metadata.strategicThemes_count_min);

      // Check hiring data extraction
      expect(analysis.metadata.hiringData).toBeDefined();
      expect(analysis.metadata.hiringData?.companies.length).toBeGreaterThanOrEqual(expected.metadata.hiringData.companies_count_min);
      expect(analysis.metadata.hiringData?.positions.length).toBeGreaterThanOrEqual(expected.metadata.hiringData.positions_count_min);

      // ⭐ CHECK SIGNAL DETECTION
      expect(analysis.signals.length).toBeGreaterThanOrEqual(expected.signals_min);

      // Verify specific signals are detected
      const signalTypes = analysis.signals.map(s => s.type);

      // Should detect price change
      expect(signalTypes).toContain("price_change");
      const priceSignal = analysis.signals.find(s => s.type === "price_change");
      expect(priceSignal?.severity).toBe("high");
      expect(priceSignal?.summary).toContain("25%");

      // Should detect hiring spike
      expect(signalTypes).toContain("hiring_spike");
      const hiringSignal = analysis.signals.find(s => s.type === "hiring_spike");
      expect(hiringSignal?.severity).toBe("high");
      expect(hiringSignal?.relatedEntities).toContain("Competitor X");

      // Should detect new product
      expect(signalTypes).toContain("new_product");
      const productSignal = analysis.signals.find(s => s.type === "new_product");
      expect(productSignal?.details).toBeDefined();

      console.log(`✅ Competitive Report: ${analysis.signals.length} signals detected`);
      analysis.signals.forEach(signal => {
        console.log(`   - ${signal.type} (${signal.severity}): ${signal.summary}`);
      });
    }, 60000);

    it("should exclude confidential disclaimer", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.competitive_report_q4,
        TEST_COMPANY_ID
      );

      const expected = EXPECTED_RESULTS.competitive_report_q4;

      // Check that disclaimer is excluded
      expect(analysis.excludedSections.length).toBeGreaterThanOrEqual(expected.sections_excluded_min);

      const excludedTitles = analysis.excludedSections.map(s => s.title.toLowerCase());
      expect(excludedTitles.some(t => t.includes("confidential"))).toBe(true);

      // But executive summary should be indexed
      const execSummary = analysis.sections.find(s =>
        s.title.toLowerCase().includes("executive summary") ||
        s.type === "executive_summary"
      );
      expect(execSummary).toBeDefined();
      expect(execSummary?.shouldIndex).toBe(true);
      expect(execSummary?.relevanceScore).toBeGreaterThanOrEqual(8);
    }, 60000);
  });

  // ============================================================================
  // Test 4: Financial Report Analysis
  // ============================================================================
  describe("Financial Report Analysis", () => {
    it("should extract financial metrics correctly", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.financial_report_q3,
        TEST_COMPANY_ID,
        { fileName: "q3-2024-earnings.pdf", fileType: "pdf" }
      );

      const expected = EXPECTED_RESULTS.financial_report_q3;

      // Check document type
      expect(analysis.documentType).toBe(expected.documentType);
      expect(analysis.confidence).toBeGreaterThanOrEqual(expected.confidence_min);

      // Check fiscal period
      expect(analysis.metadata.fiscalPeriod).toContain("Q3 2024");

      // Check revenue extraction
      expect(analysis.metadata.revenue).toBeDefined();
      expect(analysis.metadata.revenue?.current).toContain("125.5M");

      // Check growth metrics
      expect(analysis.metadata.growthMetrics).toBeDefined();
      expect(analysis.metadata.growthMetrics?.length).toBeGreaterThanOrEqual(expected.metadata.growthMetrics_count_min);

      // Verify specific metrics are extracted
      const revenueMetric = analysis.metadata.growthMetrics?.find(m =>
        m.name.toLowerCase().includes("revenue") || m.name.toLowerCase().includes("arr")
      );
      expect(revenueMetric).toBeDefined();

      console.log(`✅ Financial Report: ${analysis.metadata.growthMetrics?.length} growth metrics extracted`);
      console.log(`   Revenue: ${analysis.metadata.revenue?.current}`);
    }, 60000);
  });

  // ============================================================================
  // Test 5: Configuration and Filtering
  // ============================================================================
  describe("Configuration and Filtering Rules", () => {
    it("should respect relevance score threshold", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.contract_saas,
        TEST_COMPANY_ID
      );

      // All indexed sections should have score >= 7 (default threshold)
      const indexedSections = analysis.sections.filter(s => s.shouldIndex);
      indexedSections.forEach(section => {
        expect(section.relevanceScore).toBeGreaterThanOrEqual(7);
      });

      // Excluded sections should have low scores
      const excludedSections = analysis.sections.filter(s => !s.shouldIndex);
      excludedSections.forEach(section => {
        expect(section.relevanceScore).toBeLessThan(7);
      });

      console.log(`✅ Filtering: ${indexedSections.length} sections passed threshold (>= 7/10)`);
    }, 60000);

    it("should provide reasoning for each classification", async () => {
      const analysis = await analyzeDocument(
        MOCK_DOCUMENTS.competitive_report_q4,
        TEST_COMPANY_ID
      );

      // Check that overall reasoning is provided (thinking)
      expect(analysis.reasoning).toBeDefined();
      expect(analysis.reasoning!.length).toBeGreaterThan(100);

      // Check that each section has reasoning
      analysis.sections.forEach(section => {
        expect(section.reasoning).toBeDefined();
        expect(section.reasoning.length).toBeGreaterThan(10);
      });

      console.log(`✅ Reasoning provided for ${analysis.sections.length} sections`);
      console.log(`   Extended thinking: ${analysis.reasoning?.substring(0, 100)}...`);
    }, 60000);
  });
});
