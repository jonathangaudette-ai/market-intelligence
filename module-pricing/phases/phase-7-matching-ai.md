# Phase 7: Matching AI avec GPT-5

**Durée estimée:** 5-6 heures
**Complexité:** ⭐⭐⭐⭐ Très Complexe
**Pré-requis:** Phase 0-6 complétées

---

## Objectif

Utiliser **GPT-5** (avec `reasoning.effort: 'medium'`) pour matcher automatiquement les produits scrapés des concurrents avec votre catalogue. Créer les enregistrements dans `pricing_matches` avec score de confiance.

---

## Tâches

### Tâche 1: Créer Service de Matching AI

**Fichier:** `src/lib/pricing/matching-service.ts`

```typescript
import { db } from "@/db";
import { pricingProducts, pricingMatches, pricingCompetitors } from "@/db/schema-pricing";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { GPT5_CONFIGS } from "@/lib/constants/ai-models";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MatchCandidate {
  productId: string;
  sku: string;
  name: string;
  characteristics: Record<string, any>;
}

interface CompetitorProduct {
  url: string;
  name: string;
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

export class MatchingService {
  /**
   * Match competitor products against your catalog using GPT-5
   */
  async matchProducts(
    companyId: string,
    competitorId: string,
    competitorProducts: CompetitorProduct[]
  ): Promise<MatchResult[]> {
    // 1. Fetch your catalog
    const yourProducts = await db
      .select({
        id: pricingProducts.id,
        sku: pricingProducts.sku,
        name: pricingProducts.name,
        characteristics: pricingProducts.characteristics,
      })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingProducts.status, "active")
        )
      );

    // 2. Batch matching with GPT-5
    const matches: MatchResult[] = [];

    // Process in batches of 10 competitor products at a time
    for (let i = 0; i < competitorProducts.length; i += 10) {
      const batch = competitorProducts.slice(i, i + 10);
      const batchMatches = await this.matchBatchWithGPT5(yourProducts, batch);
      matches.push(...batchMatches);
    }

    // 3. Save matches to database
    for (const match of matches) {
      if (match.confidence >= 0.7) {
        // Only save high-confidence matches
        await this.saveMatch(competitorId, match);
      }
    }

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
      const response = await openai.chat.completions.create({
        model: GPT5_CONFIGS.matching.model, // 'gpt-5'
        messages: [
          {
            role: "system",
            content: `Tu es un expert en matching de produits industriels.
Tu dois identifier les produits équivalents entre deux catalogues basé sur:
1. Similarité du nom/description
2. Caractéristiques techniques (matériau, dimensions, type)
3. Catégorie produit

Retourne uniquement un JSON array de matches avec format:
[
  {
    "yourProductId": "cuid_xxx",
    "competitorProductUrl": "https://...",
    "confidence": 0.95,
    "reasoning": "Même type de brosse, même matériau polypropylene"
  }
]

Si aucun match évident, retourne []. Seuil minimum de confiance: 0.7.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        reasoning: GPT5_CONFIGS.matching.reasoning, // { effort: 'medium' }
        text: GPT5_CONFIGS.matching.text, // { verbosity: 'medium' }
      });

      const content = response.choices[0].message.content || "[]";

      // Parse JSON response
      const rawMatches = JSON.parse(content);

      // Transform to MatchResult
      return rawMatches.map((m: any) => {
        const competitorProduct = competitorProducts.find(
          (cp) => cp.url === m.competitorProductUrl
        );

        return {
          productId: m.yourProductId,
          competitorProductUrl: m.competitorProductUrl,
          competitorProductName: competitorProduct?.name || "",
          competitorPrice: competitorProduct?.price || 0,
          confidence: m.confidence,
          reasoning: m.reasoning,
        };
      });
    } catch (error) {
      console.error("Error calling GPT-5 for matching:", error);
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
      id: p.id,
      sku: p.sku,
      name: p.name,
      characteristics: p.characteristics,
    }));

    const competitorProductsJson = competitorProducts.map((cp) => ({
      url: cp.url,
      name: cp.name,
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

Identifie les matches équivalents et retourne le JSON array.`;
  }

  /**
   * Save match to database
   */
  private async saveMatch(
    competitorId: string,
    match: MatchResult
  ): Promise<void> {
    const matchId = createId();

    await db.insert(pricingMatches).values({
      id: matchId,
      productId: match.productId,
      competitorId: competitorId,
      competitorProductUrl: match.competitorProductUrl,
      competitorProductName: match.competitorProductName,
      competitorPrice: match.competitorPrice,
      currency: "CAD", // TODO: Get from competitor config
      confidence: match.confidence,
      matchingMetadata: {
        reasoning: match.reasoning,
        matchedAt: new Date().toISOString(),
      },
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get matches for a specific product
   */
  async getMatchesForProduct(productId: string): Promise<any[]> {
    const matches = await db
      .select()
      .from(pricingMatches)
      .where(
        and(
          eq(pricingMatches.productId, productId),
          eq(pricingMatches.status, "active")
        )
      )
      .orderBy(pricingMatches.confidence);

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
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingMatches.status, "active")
        )
      );

    return matches;
  }
}
```

---

### Tâche 2: Intégrer Matching dans Scraping Service

**Modifier:** `src/lib/pricing/scraping-service.ts`

```typescript
import { MatchingService } from "./matching-service";

export class ScrapingService {
  private matchingService: MatchingService;

  constructor() {
    this.matchingService = new MatchingService();
  }

  async scrapeCompetitor(competitorId: string): Promise<{
    success: boolean;
    productsScraped: number;
    productsMatched: number;
    errors: ScrapingError[];
  }> {
    // ... existing scraping logic ...

    // After scraping completes successfully:
    if (scrapedProducts.length > 0) {
      // Trigger AI matching
      const matches = await this.matchingService.matchProducts(
        competitor.companyId,
        competitor.id,
        scrapedProducts
      );

      console.log(`Matched ${matches.length} products with confidence >= 0.7`);

      return {
        success: errors.length === 0,
        productsScraped: scrapedProducts.length,
        productsMatched: matches.length,
        errors,
      };
    }

    // ... rest of existing code ...
  }
}
```

---

### Tâche 3: Route API Matches

**Fichier:** `src/app/api/companies/[slug]/pricing/matches/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { MatchingService } from "@/lib/pricing/matching-service";

interface MatchesParams {
  params: {
    slug: string;
  };
}

// GET /api/companies/[slug]/pricing/matches
export async function GET(
  request: NextRequest,
  { params }: MatchesParams
) {
  try {
    const { slug } = params;

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const matchingService = new MatchingService();
    const matches = await matchingService.getAllMatches(company.id);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 4: Page Visualisation Matches

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/matches/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Match {
  match: {
    id: string;
    competitorProductName: string;
    competitorProductUrl: string;
    competitorPrice: number;
    confidence: number;
  };
  product: {
    name: string;
    sku: string;
    currentPrice: number;
  };
  competitor: {
    name: string;
  };
}

export default function MatchesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [slug]);

  async function fetchMatches() {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/matches`);
      const data = await response.json();
      setMatches(data.matches);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateGap(yourPrice: number, competitorPrice: number): number {
    return ((yourPrice - competitorPrice) / competitorPrice) * 100;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Matches" },
        ]}
        title="Produits Matchés"
        description={`${matches.length} correspondances identifiées par GPT-5`}
      />

      <div className="container mx-auto py-8 max-w-6xl">
        <div className="space-y-4">
          {matches.map((m) => {
            const gap = calculateGap(m.product.currentPrice, m.match.competitorPrice);
            const isHigher = gap > 0;
            const isLower = gap < 0;

            return (
              <Card key={m.match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Your Product */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Votre Produit</p>
                      <p className="font-semibold text-gray-900">{m.product.name}</p>
                      <p className="text-sm text-gray-600 mt-1">SKU: {m.product.sku}</p>
                      <p className="text-lg font-bold text-teal-600 mt-2">
                        {m.product.currentPrice.toFixed(2)} $
                      </p>
                    </div>

                    {/* Competitor Product */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Concurrent: {m.competitor.name}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {m.match.competitorProductName}
                      </p>
                      <a
                        href={m.match.competitorProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        Voir produit <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-lg font-bold text-blue-600 mt-2">
                        {m.match.competitorPrice.toFixed(2)} $
                      </p>
                    </div>

                    {/* Price Gap & Confidence */}
                    <div className="flex flex-col items-end justify-between">
                      <Badge
                        variant={m.match.confidence >= 0.9 ? "default" : "secondary"}
                        className="mb-2"
                      >
                        Confiance: {(m.match.confidence * 100).toFixed(0)}%
                      </Badge>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Écart Prix</p>
                        <div className="flex items-center gap-2 justify-end">
                          {isHigher && <TrendingUp className="h-5 w-5 text-red-600" />}
                          {isLower && <TrendingDown className="h-5 w-5 text-green-600" />}
                          {!isHigher && !isLower && <Minus className="h-5 w-5 text-gray-400" />}
                          <span
                            className={`text-xl font-bold ${
                              isHigher
                                ? "text-red-600"
                                : isLower
                                ? "text-green-600"
                                : "text-gray-600"
                            }`}
                          >
                            {gap > 0 ? "+" : ""}
                            {gap.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## Checklist de Validation

**Avant de marquer Phase 7 complète:**

- [ ] `MatchingService` créé avec logique GPT-5
- [ ] GPT-5 utilisé avec `reasoning.effort: 'medium'`
- [ ] Prompt de matching testé avec au moins 5 produits
- [ ] Matches sauvegardés dans `pricing_matches`
- [ ] Seuil de confiance >= 0.7 appliqué
- [ ] Route API matches créée
- [ ] Page visualisation matches créée
- [ ] Affichage écart prix (%, vert/rouge)
- [ ] Affichage score de confiance
- [ ] Lien vers produit concurrent (externe)
- [ ] Test avec vrais produits Dissan vs Swish

---

## Commandes de Test

```bash
# 1. Test matching service directement
node -e "
const { MatchingService } = require('./src/lib/pricing/matching-service.ts');
const service = new MatchingService();
// ... test code
"

# 2. Test API matches
curl http://localhost:3000/api/companies/dissan/pricing/matches | jq

# 3. Vérifier matches en DB
psql $DATABASE_URL -c "SELECT product_id, competitor_product_name, confidence FROM pricing_matches WHERE confidence >= 0.7 ORDER BY confidence DESC LIMIT 10;"

# 4. Test GPT-5 prompt manuellement
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Test"}],
    "reasoning": {"effort": "medium"}
  }'
```

---

## Résultat Attendu

À la fin de Phase 7:

✅ **GPT-5 matching fonctionnel** avec reasoning.effort: 'medium'
✅ **Matches haute confiance** (>= 0.7) sauvegardés
✅ **Page visualisation** des matches
✅ **Calcul écart prix** (%, couleur conditionnelle)
✅ **Au moins 10 matches** identifiés pour produits Dissan
✅ **Performance acceptable** (<30s pour 50 produits)

---

## Dépannage

### Problème: GPT-5 retourne JSON invalide

**Solution:**
```typescript
// Ajouter validation et retry
try {
  const rawMatches = JSON.parse(content);
} catch (error) {
  console.error("Invalid JSON from GPT-5:", content);
  // Retry avec prompt plus strict
}
```

### Problème: Confiance trop basse (<0.5 pour tout)

**Solution:**
```typescript
// Améliorer prompt avec exemples
const systemPrompt = `...
Exemples de matches valides:
- "Brosse cuvette polypropylene" ↔ "Toilet bowl brush polypropylene" = 0.95
- "Balai 24 pouces" ↔ "24-inch broom" = 0.90
...`;
```

### Problème: Coût GPT-5 trop élevé

**Solution:**
```typescript
// Filtrer produits avant matching (seulement catégories similaires)
const filteredProducts = yourProducts.filter(p =>
  p.category === competitorProduct.category
);

// Ou utiliser Claude Haiku 4.5 pour pre-filtering
```

---

## Handoff JSON pour Phase 8

```json
{
  "phase": 7,
  "name": "Matching AI avec GPT-5",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "5.5h",
  "filesCreated": [
    "src/lib/pricing/matching-service.ts",
    "src/app/api/companies/[slug]/pricing/matches/route.ts",
    "src/app/(dashboard)/companies/[slug]/pricing/matches/page.tsx"
  ],
  "filesModified": [
    "src/lib/pricing/scraping-service.ts"
  ],
  "aiModel": "gpt-5",
  "aiConfig": {
    "reasoning": {"effort": "medium"},
    "text": {"verbosity": "medium"}
  },
  "matchingResults": {
    "totalMatches": 47,
    "highConfidence": 32,
    "mediumConfidence": 15,
    "avgConfidence": 0.83
  },
  "testResults": {
    "gpt5Matching": "✅ Pass - 47 matches found",
    "confidenceThreshold": "✅ Pass - Only >= 0.7 saved",
    "apiMatches": "✅ Pass - Returns all matches",
    "visualizationPage": "✅ Pass - Displays price gaps"
  },
  "nextPhaseReady": true,
  "notes": "Matching AI fonctionnel avec GPT-5. 47 produits Dissan matchés vs concurrents. Prêt pour historique time-series (Phase 8)."
}
```

---

**Prochaine étape:** Phase 8 - Historique & Time-Series
