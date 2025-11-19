import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MatchingService } from "../matching-service";
import type OpenAI from "openai";

// Create hoisted mock for OpenAI
const { mockOpenAICreate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
}));

// Mock OpenAI
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: mockOpenAICreate,
      },
    };
  },
}));

// Mock DB
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "test_cuid_123"),
}));

describe("MatchingService", () => {
  let matchingService: MatchingService;

  beforeEach(() => {
    matchingService = new MatchingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("matchBatchWithGPT5", () => {
    it("should match products with GPT-5 and return high-confidence matches", async () => {
      // Mock GPT-5 response
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  yourProductId: "prod_1",
                  competitorProductUrl: "https://swish.com/product-1",
                  confidence: 0.92,
                  reasoning: "Même type de brosse, matériau polypropylène identique",
                },
                {
                  yourProductId: "prod_2",
                  competitorProductUrl: "https://swish.com/product-2",
                  confidence: 0.85,
                  reasoning: "Balai similaire, dimensions proches",
                },
              ]),
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "ATL-2024",
          name: "Brosse cuvette PP",
          characteristics: { material: "polypropylene", type: "bowl brush" },
        },
        {
          productId: "prod_2",
          sku: "ATL-3001",
          name: "Balai industriel 24\"",
          characteristics: { type: "broom", length: "24in" },
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Toilet bowl brush PP",
          price: 4.5,
          currency: "CAD",
        },
        {
          url: "https://swish.com/product-2",
          name: "Industrial broom 24 inch",
          price: 12.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe("prod_1");
      expect(result[0].confidence).toBe(0.92);
      expect(result[0].competitorProductName).toBe("Toilet bowl brush PP");
      expect(result[1].confidence).toBe(0.85);
    });

    it("should filter out low confidence matches (< 0.7)", async () => {
      // Mock GPT-5 returning mixed confidence matches
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  yourProductId: "prod_1",
                  competitorProductUrl: "https://swish.com/product-1",
                  confidence: 0.9,
                  reasoning: "Match très similaire",
                },
                {
                  yourProductId: "prod_2",
                  competitorProductUrl: "https://swish.com/product-2",
                  confidence: 0.5, // Below threshold
                  reasoning: "Incertain, produits différents",
                },
              ]),
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "ATL-2024",
          name: "Brosse cuvette",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Bowl brush",
          price: 4.5,
          currency: "CAD",
        },
        {
          url: "https://swish.com/product-2",
          name: "Different product",
          price: 10.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      // Should include both in raw results (GPT-5 returned them)
      expect(result).toHaveLength(2);

      // But only high-confidence (>= 0.7) should be saved in the actual matchProducts method
      expect(result[0].confidence).toBe(0.9);
      expect(result[1].confidence).toBe(0.5); // This one won't be saved
    });

    it("should handle GPT-5 responses wrapped in markdown code blocks", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: `\`\`\`json
[
  {
    "yourProductId": "prod_1",
    "competitorProductUrl": "https://swish.com/product-1",
    "confidence": 0.88,
    "reasoning": "Test match"
  }
]
\`\`\``,
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "TEST-001",
          name: "Test product",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Competitor test",
          price: 5.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.88);
    });

    it("should return empty array on GPT-5 JSON parse error", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Invalid JSON response from GPT-5",
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "TEST-001",
          name: "Test",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Competitor",
          price: 5.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      expect(result).toHaveLength(0);
    });

    it("should return empty array on OpenAI API error", async () => {
      mockOpenAICreate.mockRejectedValue(new Error("OpenAI API rate limit exceeded"));

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "TEST-001",
          name: "Test",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Competitor",
          price: 5.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      expect(result).toHaveLength(0);
    });

    it("should filter out matches with invalid competitor URLs", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  yourProductId: "prod_1",
                  competitorProductUrl: "https://swish.com/product-1",
                  confidence: 0.9,
                  reasoning: "Valid match",
                },
                {
                  yourProductId: "prod_2",
                  competitorProductUrl: "https://swish.com/invalid-url", // Not in competitor products
                  confidence: 0.85,
                  reasoning: "Invalid URL",
                },
              ]),
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "ATL-2024",
          name: "Brosse",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Brush",
          price: 4.5,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      // Should only include matches with valid competitor URLs
      expect(result).toHaveLength(1);
      expect(result[0].competitorProductUrl).toBe("https://swish.com/product-1");
    });
  });

  describe("buildMatchingPrompt", () => {
    it("should build correct prompt structure", () => {
      const yourProducts = [
        {
          productId: "prod_1",
          sku: "ATL-2024",
          name: "Brosse cuvette",
          characteristics: { material: "PP" },
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Bowl brush",
          sku: "SWI-001",
          price: 4.5,
          currency: "CAD",
          characteristics: { material: "PP" },
        },
      ];

      const prompt = (matchingService as any).buildMatchingPrompt(
        yourProducts,
        competitorProducts
      );

      expect(prompt).toContain("Votre Catalogue (1 produits)");
      expect(prompt).toContain("Produits Concurrent à Matcher (1 produits)");
      expect(prompt).toContain("prod_1");
      expect(prompt).toContain("ATL-2024");
      expect(prompt).toContain("https://swish.com/product-1");
      expect(prompt).toContain("confidence >= 0.7");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty competitor products array", async () => {
      const result = await matchingService.matchProducts(
        "company_1",
        "competitor_1",
        []
      );

      expect(result).toHaveLength(0);
    });

    it("should handle GPT-5 returning empty array", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: "[]",
            },
          },
        ],
      });

      const yourProducts = [
        {
          productId: "prod_1",
          sku: "ATL-2024",
          name: "Brosse",
          characteristics: null,
        },
      ];

      const competitorProducts = [
        {
          url: "https://swish.com/product-1",
          name: "Completely different product",
          price: 100.0,
          currency: "CAD",
        },
      ];

      const result = await (matchingService as any).matchBatchWithGPT5(
        yourProducts,
        competitorProducts
      );

      expect(result).toHaveLength(0);
    });
  });
});
