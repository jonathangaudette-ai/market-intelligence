/**
 * Matching Service for Pricing Intelligence
 *
 * Uses GPT-5 to match competitor products with your catalog
 */

import { db } from "@/db";
import { pricingProducts, pricingMatches, pricingCompetitors } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { GPT5_CONFIGS } from "@/lib/constants/ai-models";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

interface MatchCandidate {
  productId: string;
  sku: string;
  name: string;
  characteristics: Record<string, any> | null;
}

interface CompetitorProduct {
  url: string;
  name: string;
  sku?: string;
  price: number;
  currency: string;
  characteristics?: Record<string, any>;
}

interface MatchResult {
  productId: string;
  competitorProductUrl: string;
  competitorProductName: string;
  competitorPrice: number;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Matching Service
// ============================================================================

export class MatchingService {
  /**
   * Match competitor products against your catalog using GPT-5
   */
  async matchProducts(
    companyId: string,
    competitorId: string,
    competitorProducts: CompetitorProduct[]
  ): Promise<MatchResult[]> {
    console.log(
      `[MatchingService] Starting GPT-5 matching for ${competitorProducts.length} competitor products`
    );

    if (competitorProducts.length === 0) {
      console.log("[MatchingService] No competitor products to match");
      return [];
    }

    // 1. Fetch your catalog
    const yourProducts = await db
      .select({
        productId: pricingProducts.id,
        sku: pricingProducts.sku,
        name: pricingProducts.name,
        characteristics: pricingProducts.characteristics,
      })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingProducts.isActive, true)
        )
      );

    console.log(
      `[MatchingService] Loaded ${yourProducts.length} products from your catalog`
    );

    if (yourProducts.length === 0) {
      console.log("[MatchingService] No products in your catalog to match against");
      return [];
    }

    // 2. Batch matching with GPT-5
    const matches: MatchResult[] = [];

    // Process in batches of 10 competitor products at a time
    const batchSize = 10;
    for (let i = 0; i < competitorProducts.length; i += batchSize) {
      const batch = competitorProducts.slice(i, i + batchSize);
      console.log(
        `[MatchingService] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(competitorProducts.length / batchSize)}`
      );

      const batchMatches = await this.matchBatchWithGPT5(yourProducts, batch);
      matches.push(...batchMatches);
    }

    console.log(
      `[MatchingService] Found ${matches.length} total matches from GPT-5`
    );

    // 3. Save matches to database
    let savedCount = 0;
    for (const match of matches) {
      if (match.confidence >= 0.7) {
        // Only save high-confidence matches
        await this.saveMatch(competitorId, match);
        savedCount++;
      }
    }

    console.log(
      `[MatchingService] Saved ${savedCount} high-confidence matches (>= 0.7) to database`
    );

    return matches;
  }

  /**
   * Match a batch of competitor products using GPT-5
   */
  private async matchBatchWithGPT5(
    yourProducts: MatchCandidate[],
    competitorProducts: CompetitorProduct[]
  ): Promise<MatchResult[]> {
    const prompt = this.buildMatchingPrompt(yourProducts, competitorProducts);

    try {
      console.log(
        `[MatchingService] Calling GPT-5 with ${yourProducts.length} your products and ${competitorProducts.length} competitor products`
      );

      // Note: GPT-5 supports reasoning/text parameters, but they may not be in the TypeScript SDK yet
      // Using 'as any' to bypass type checking for these GPT-5-specific parameters
      const response = await openai.chat.completions.create({
        model: GPT5_CONFIGS.matching.model, // 'gpt-5'
        messages: [
          {
            role: "system",
            content: `Tu es un expert en matching de produits industriels (brosses, balais, équipement de nettoyage).
Tu dois identifier les produits équivalents entre deux catalogues basé sur:
1. Similarité du nom/description (brosse, balai, type)
2. Caractéristiques techniques (matériau, dimensions, couleur)
3. Catégorie produit

Retourne uniquement un JSON array de matches avec format exact:
[
  {
    "yourProductId": "cuid_xxx",
    "competitorProductUrl": "https://...",
    "confidence": 0.95,
    "reasoning": "Même type de brosse, même matériau polypropylène, dimensions similaires"
  }
]

Règles strictes:
- Seuil minimum de confiance: 0.7 (ne retourne que matches >= 0.7)
- Si aucun match évident (< 0.7), ne retourne PAS ce match
- confidence = 0.95+ : Produits quasi identiques
- confidence = 0.85-0.94 : Produits très similaires
- confidence = 0.70-0.84 : Produits probablement équivalents
- reasoning doit expliquer pourquoi le match est valide

Retourne UNIQUEMENT le JSON array, sans texte avant ou après.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        reasoning: GPT5_CONFIGS.matching.reasoning, // { effort: 'medium' }
        text: GPT5_CONFIGS.matching.text, // { verbosity: 'medium' }
      } as any);

      const content = response.choices[0].message.content || "[]";

      console.log(`[MatchingService] GPT-5 response received (${content.length} chars)`);

      // Parse JSON response
      let rawMatches: any[] = [];
      try {
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                         content.match(/```\n?([\s\S]*?)\n?```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : content;
        rawMatches = JSON.parse(jsonContent.trim());
      } catch (parseError) {
        console.error("[MatchingService] Failed to parse GPT-5 JSON response:", content);
        console.error("[MatchingService] Parse error:", parseError);
        return [];
      }

      if (!Array.isArray(rawMatches)) {
        console.error("[MatchingService] GPT-5 response is not an array:", rawMatches);
        return [];
      }

      console.log(`[MatchingService] Parsed ${rawMatches.length} raw matches from GPT-5`);

      // Transform to MatchResult
      const matchResults = rawMatches
        .map((m: any) => {
          const competitorProduct = competitorProducts.find(
            (cp) => cp.url === m.competitorProductUrl
          );

          if (!competitorProduct) {
            console.warn(
              `[MatchingService] Competitor product not found for URL: ${m.competitorProductUrl}`
            );
            return null;
          }

          return {
            productId: m.yourProductId,
            competitorProductUrl: m.competitorProductUrl,
            competitorProductName: competitorProduct.name,
            competitorPrice: competitorProduct.price,
            confidence: m.confidence,
            reasoning: m.reasoning,
          };
        })
        .filter((m): m is MatchResult => m !== null);

      console.log(
        `[MatchingService] Transformed to ${matchResults.length} valid match results`
      );

      return matchResults;
    } catch (error: any) {
      console.error("[MatchingService] Error calling GPT-5 for matching:", error);
      return [];
    }
  }

  /**
   * Build prompt for GPT-5 matching
   */
  private buildMatchingPrompt(
    yourProducts: MatchCandidate[],
    competitorProducts: CompetitorProduct[]
  ): string {
    const yourProductsJson = yourProducts.map((p) => ({
      id: p.productId,
      sku: p.sku,
      name: p.name,
      characteristics: p.characteristics,
    }));

    const competitorProductsJson = competitorProducts.map((cp) => ({
      url: cp.url,
      name: cp.name,
      sku: cp.sku,
      price: cp.price,
      characteristics: cp.characteristics || {},
    }));

    return `# Votre Catalogue (${yourProducts.length} produits)
\`\`\`json
${JSON.stringify(yourProductsJson, null, 2)}
\`\`\`

# Produits Concurrent à Matcher (${competitorProducts.length} produits)
\`\`\`json
${JSON.stringify(competitorProductsJson, null, 2)}
\`\`\`

Identifie les matches équivalents et retourne le JSON array (UNIQUEMENT matches avec confidence >= 0.7).`;
  }

  /**
   * Save match to database
   */
  private async saveMatch(
    competitorId: string,
    match: MatchResult
  ): Promise<void> {
    const matchId = createId();

    // Check if match already exists
    const existingMatch = await db
      .select()
      .from(pricingMatches)
      .where(
        and(
          eq(pricingMatches.productId, match.productId),
          eq(pricingMatches.competitorId, competitorId),
          eq(pricingMatches.competitorProductUrl, match.competitorProductUrl)
        )
      )
      .limit(1);

    if (existingMatch.length > 0) {
      // Update existing match
      console.log(
        `[MatchingService] Updating existing match ${existingMatch[0].id}`
      );

      await db
        .update(pricingMatches)
        .set({
          competitorProductName: match.competitorProductName,
          price: match.competitorPrice.toString(),
          confidenceScore: match.confidence.toString(),
          matchDetails: {
            // Store reasoning in a custom field (not part of schema definition but JSONB allows it)
            ...match.reasoning ? { reasoning: match.reasoning } : {},
            matchedAt: new Date().toISOString(),
          } as any,
          lastScrapedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pricingMatches.id, existingMatch[0].id));
    } else {
      // Insert new match
      console.log(
        `[MatchingService] Inserting new match ${matchId} (confidence: ${match.confidence.toFixed(2)})`
      );

      await db.insert(pricingMatches).values({
        productId: match.productId,
        competitorId: competitorId,
        competitorProductUrl: match.competitorProductUrl,
        competitorProductName: match.competitorProductName,
        price: match.competitorPrice.toString(),
        currency: "CAD", // TODO: Get from competitor config
        confidenceScore: match.confidence.toString(),
        matchType: "ai", // AI-based matching
        matchDetails: {
          // Store reasoning in a custom field (not part of schema definition but JSONB allows it)
          ...match.reasoning ? { reasoning: match.reasoning } : {},
          matchedAt: new Date().toISOString(),
        } as any,
        lastScrapedAt: new Date(),
      });
    }
  }

  /**
   * Get matches for a specific product
   */
  async getMatchesForProduct(productId: string): Promise<any[]> {
    const matches = await db
      .select()
      .from(pricingMatches)
      .where(eq(pricingMatches.productId, productId))
      .orderBy(desc(pricingMatches.confidenceScore));

    return matches;
  }

  /**
   * Get all matches for a company
   */
  async getAllMatches(companyId: string): Promise<any[]> {
    const matches = await db
      .select({
        match: pricingMatches,
        product: pricingProducts,
        competitor: pricingCompetitors,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .innerJoin(pricingCompetitors, eq(pricingMatches.competitorId, pricingCompetitors.id))
      .where(eq(pricingProducts.companyId, companyId))
      .orderBy(desc(pricingMatches.confidenceScore));

    return matches;
  }
}
