/**
 * GPT-5 Search Service for Pricing Intelligence
 *
 * Uses GPT-5 Search API to discover competitor product URLs via web search
 * before scraping, reducing scraping volume by 90%+
 */

import OpenAI from "openai";
import { GPT5_CONFIGS } from "@/lib/constants/ai-models";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export interface ProductWithoutUrl {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  category?: string | null;
}

export interface Competitor {
  id: string;
  name: string;
  websiteUrl: string;
}

export interface DiscoveredUrl {
  productId: string;
  url: string | null;
  confidence: number; // 0-1
  searchDuration: number; // seconds
  error?: string;
  rawResponse?: string; // For debugging
}

// ============================================================================
// GPT-5 Search Service
// ============================================================================

export class GPT5SearchService {
  /**
   * Discover competitor product URLs using GPT-5 web search
   *
   * @param competitor - Competitor object with websiteUrl
   * @param products - List of products needing URL discovery (cache miss)
   * @returns Array of discovered URLs with confidence scores
   */
  async discoverProductUrls(
    competitor: Competitor,
    products: ProductWithoutUrl[]
  ): Promise<DiscoveredUrl[]> {
    console.log(
      `[GPT5SearchService] Starting URL discovery for ${products.length} products on ${competitor.websiteUrl}`
    );

    if (products.length === 0) {
      console.log("[GPT5SearchService] No products to search for");
      return [];
    }

    const results: DiscoveredUrl[] = [];

    // Process each product sequentially with rate limiting
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(
        `[GPT5SearchService] Searching ${i + 1}/${products.length}: ${product.name} (SKU: ${product.sku})`
      );

      const result = await this.searchSingleProduct(competitor, product);
      results.push(result);

      // Rate limiting: 1 second delay between requests
      if (i < products.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Summary stats
    const found = results.filter((r) => r.url !== null).length;
    const avgConfidence =
      found > 0
        ? results
            .filter((r) => r.url !== null)
            .reduce((sum, r) => sum + r.confidence, 0) / found
        : 0;
    const avgDuration =
      results.reduce((sum, r) => sum + r.searchDuration, 0) / results.length;

    console.log(
      `[GPT5SearchService] Discovery complete: ${found}/${products.length} URLs found (${(found / products.length * 100).toFixed(1)}%)`
    );
    console.log(
      `[GPT5SearchService] Avg confidence: ${(avgConfidence * 100).toFixed(0)}%, Avg duration: ${avgDuration.toFixed(1)}s`
    );

    return results;
  }

  /**
   * Search for a single product using GPT-5 web search
   */
  private async searchSingleProduct(
    competitor: Competitor,
    product: ProductWithoutUrl
  ): Promise<DiscoveredUrl> {
    const startTime = Date.now();

    try {
      // Extract hostname from competitor URL for validation
      const competitorHostname = new URL(competitor.websiteUrl).hostname;

      // Build search prompt
      const searchPrompt = this.buildSearchPrompt(
        competitor.websiteUrl,
        competitorHostname,
        product
      );

      // Call GPT-5 Responses API with web_search tool
      const response = await openai.responses.create({
        model: GPT5_CONFIGS.extraction.model, // 'gpt-5'
        tools: [{ type: "web_search" }],
        tool_choice: { type: "web_search" },
        reasoning: GPT5_CONFIGS.extraction.reasoning, // { effort: 'minimal' }
        input: searchPrompt,
      } as any);

      const duration = (Date.now() - startTime) / 1000;

      // Extract answer from response
      const answer =
        (response as any).output_text?.trim() ||
        (response as any).output?.trim() ||
        "NOT_FOUND";

      console.log(
        `[GPT5SearchService] GPT-5 response for ${product.name}: ${answer.substring(0, 100)}...`
      );

      // Parse and validate URL
      const isUrl =
        answer.startsWith("http") && answer.includes(competitorHostname);

      if (isUrl) {
        // Validate URL structure
        const validatedUrl = this.validateUrl(answer, competitorHostname);

        if (validatedUrl) {
          return {
            productId: product.id,
            url: validatedUrl,
            confidence: 0.85, // High confidence for found URLs
            searchDuration: parseFloat(duration.toFixed(1)),
            rawResponse: answer,
          };
        }
      }

      // URL not found or invalid
      return {
        productId: product.id,
        url: null,
        confidence: 0.30, // Low confidence for not found
        searchDuration: parseFloat(duration.toFixed(1)),
        rawResponse: answer,
      };
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;

      console.error(
        `[GPT5SearchService] Error searching for ${product.name}:`,
        error.message
      );

      return {
        productId: product.id,
        url: null,
        confidence: 0,
        searchDuration: parseFloat(duration.toFixed(1)),
        error: error.message,
        rawResponse: error.message,
      };
    }
  }

  /**
   * Build search prompt for GPT-5
   */
  private buildSearchPrompt(
    websiteUrl: string,
    hostname: string,
    product: ProductWithoutUrl
  ): string {
    return `Find the product "${product.name}" (SKU: ${product.sku}) on ${websiteUrl} website.

Instructions:
1. Search specifically on ${hostname} for this exact product or very similar product
2. Return ONLY the direct product URL if found (e.g., ${websiteUrl}/products/...)
3. If you find the product, respond with just the URL
4. If you cannot find the product, respond with "NOT_FOUND"
5. Be confident - only return a URL if you're sure it's the right product (>70% confidence)

Product details:
- Name: ${product.name}
- SKU: ${product.sku}
${product.brand ? `- Brand: ${product.brand}` : ""}
${product.category ? `- Category: ${product.category}` : ""}`;
  }

  /**
   * Validate discovered URL matches competitor hostname
   */
  private validateUrl(url: string, expectedHostname: string): string | null {
    try {
      const parsed = new URL(url);

      // Must be HTTPS and match competitor hostname
      if (
        parsed.protocol === "https:" &&
        parsed.hostname === expectedHostname
      ) {
        return url;
      }

      console.warn(
        `[GPT5SearchService] URL validation failed: ${url} (expected hostname: ${expectedHostname})`
      );
      return null;
    } catch (error) {
      console.warn(`[GPT5SearchService] Invalid URL format: ${url}`);
      return null;
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const gpt5SearchService = new GPT5SearchService();
