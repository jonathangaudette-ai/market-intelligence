# Phase 3: API Layer & Données Réelles

**Durée estimée:** 3-4 heures
**Complexité:** ⭐⭐⭐ Complexe
**Pré-requis:** Phase 0, 1, 2 complétées

---

## Objectif

Créer l'API REST pour le module pricing avec Next.js App Router et connecter le dashboard aux données réelles provenant de la base de données PostgreSQL.

---

## Tâches

### Tâche 1: Route API - Statistiques Dashboard (GET /api/companies/[slug]/pricing/stats)

**Fichier:** `src/app/api/companies/[slug]/pricing/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingProducts, pricingCompetitors, pricingMatches, pricingAlertEvents } from "@/db/schema-pricing";
import { eq, sql, and, gte } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatsParams {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: StatsParams
) {
  try {
    const { slug } = params;

    // 1. Get company by slug
    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // 2. Count total products
    const totalProducts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(eq(pricingProducts.companyId, company.id));

    // 3. Count tracked products (status = 'active')
    const trackedProducts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          eq(pricingProducts.status, "active")
        )
      );

    // 4. Count matched products
    const matchedProducts = await db
      .select({ count: sql<number>`count(DISTINCT product_id)::int` })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(eq(pricingProducts.companyId, company.id));

    // 5. Count active competitors
    const activeCompetitors = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingCompetitors)
      .where(
        and(
          eq(pricingCompetitors.companyId, company.id),
          eq(pricingCompetitors.status, "active")
        )
      );

    // 6. Calculate average price gap
    const priceGaps = await db
      .select({
        yourPrice: pricingProducts.currentPrice,
        competitorPrice: pricingMatches.competitorPrice,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          eq(pricingMatches.status, "active")
        )
      );

    let avgGap = 0;
    if (priceGaps.length > 0) {
      const gaps = priceGaps.map((pg) => {
        if (!pg.yourPrice || !pg.competitorPrice) return 0;
        return ((pg.yourPrice - pg.competitorPrice) / pg.competitorPrice) * 100;
      });
      avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    }

    // 7. Count alerts in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alertsLast7d = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingAlertEvents)
      .innerJoin(pricingProducts, eq(pricingAlertEvents.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, company.id),
          gte(pricingAlertEvents.createdAt, sevenDaysAgo)
        )
      );

    // 8. Calculate market coverage
    const coverage =
      totalProducts[0].count > 0
        ? matchedProducts[0].count / totalProducts[0].count
        : 0;

    // 9. Return stats
    return NextResponse.json({
      products: {
        total: totalProducts[0].count,
        tracked: trackedProducts[0].count,
        matched: matchedProducts[0].count,
        coverage,
      },
      pricing: {
        avgGap: parseFloat(avgGap.toFixed(2)),
        competitiveAdvantage: 0, // TODO: Calculate from historical data
        trend7d: 0, // TODO: Calculate from price history
      },
      competitors: {
        active: activeCompetitors[0].count,
        total: activeCompetitors[0].count,
      },
      alerts: {
        last7d: alertsLast7d[0].count,
        trend: 0, // TODO: Compare with previous 7 days
        critical: 0, // TODO: Count severity='critical'
      },
    });
  } catch (error) {
    console.error("Error fetching pricing stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

### Tâche 2: Route API - Historique Prix (GET /api/companies/[slug]/pricing/history)

**Fichier:** `src/app/api/companies/[slug]/pricing/history/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingHistory, pricingProducts } from "@/db/schema-pricing";
import { eq, and, gte, desc } from "drizzle-orm";

interface HistoryParams {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: HistoryParams
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const productId = searchParams.get("productId");

    // 1. Get company
    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // 3. Build query
    const conditions = [
      eq(pricingProducts.companyId, company.id),
      gte(pricingHistory.recordedAt, dateThreshold),
    ];

    if (productId) {
      conditions.push(eq(pricingHistory.productId, productId));
    }

    // 4. Fetch history
    const history = await db
      .select({
        id: pricingHistory.id,
        productId: pricingHistory.productId,
        productName: pricingProducts.name,
        price: pricingHistory.price,
        competitorId: pricingHistory.competitorId,
        recordedAt: pricingHistory.recordedAt,
      })
      .from(pricingHistory)
      .innerJoin(pricingProducts, eq(pricingHistory.productId, pricingProducts.id))
      .where(and(...conditions))
      .orderBy(desc(pricingHistory.recordedAt))
      .limit(1000);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching pricing history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 3: Mettre à Jour le Dashboard avec Données Réelles

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx`

**Modifications:**

1. Remplacer `MOCK_STATS` par fetch API:

```typescript
useEffect(() => {
  async function fetchStats() {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchStats();
}, [slug]);
```

2. Remplacer `MOCK_PRICE_HISTORY` par fetch API:

```typescript
useEffect(() => {
  async function fetchHistory() {
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/history?days=30`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();

      // Transform API data to chart format
      const chartData = transformHistoryToChart(data.history);
      setPriceHistory(chartData);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }

  fetchHistory();
}, [slug]);

function transformHistoryToChart(history: any[]) {
  // Group by date and source (vous, competitor1, competitor2, etc.)
  const grouped = history.reduce((acc, record) => {
    const date = record.recordedAt.split('T')[0];
    if (!acc[date]) acc[date] = { date };

    if (!record.competitorId) {
      acc[date].vous = record.price;
    } else {
      acc[date][`comp_${record.competitorId}`] = record.price;
    }

    return acc;
  }, {});

  return Object.values(grouped).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );
}
```

---

### Tâche 4: Route API - Liste Produits (GET /api/companies/[slug]/pricing/products)

**Fichier:** `src/app/api/companies/[slug]/pricing/products/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingProducts } from "@/db/schema-pricing";
import { eq, desc, ilike, or } from "drizzle-orm";

interface ProductsParams {
  params: {
    slug: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: ProductsParams
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 1. Get company
    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 2. Build conditions
    const conditions = [eq(pricingProducts.companyId, company.id)];

    if (search) {
      conditions.push(
        or(
          ilike(pricingProducts.name, `%${search}%`),
          ilike(pricingProducts.sku, `%${search}%`)
        ) as any
      );
    }

    if (status !== "all") {
      conditions.push(eq(pricingProducts.status, status as any));
    }

    // 3. Fetch products
    const products = await db
      .select()
      .from(pricingProducts)
      .where(and(...conditions))
      .orderBy(desc(pricingProducts.updatedAt))
      .limit(limit)
      .offset(offset);

    // 4. Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pricingProducts)
      .where(and(...conditions));

    return NextResponse.json({
      products,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Checklist de Validation

**Avant de marquer Phase 3 complète:**

- [ ] 4 routes API créées (`stats`, `history`, `products`, + 1 au choix)
- [ ] TypeScript compile sans erreur: `npx tsc --noEmit`
- [ ] Dashboard page.tsx connecté aux vraies API (plus de mock data)
- [ ] Tester API stats: `curl http://localhost:3000/api/companies/[slug]/pricing/stats`
- [ ] Tester API history: `curl http://localhost:3000/api/companies/[slug]/pricing/history?days=30`
- [ ] Tester API products: `curl http://localhost:3000/api/companies/[slug]/pricing/products?limit=10`
- [ ] Gestion d'erreur: tester avec slug invalide (doit retourner 404)
- [ ] Loading states fonctionnent dans le dashboard
- [ ] Les données affichées matchent les données en DB
- [ ] Performance: stats API < 500ms, history API < 1s

---

## Commandes de Test

```bash
# 1. Compiler TypeScript
npx tsc --noEmit

# 2. Démarrer dev server
npm run dev

# 3. Tester stats API
curl -s http://localhost:3000/api/companies/dissan/pricing/stats | jq

# 4. Tester history API (30 jours)
curl -s "http://localhost:3000/api/companies/dissan/pricing/history?days=30" | jq

# 5. Tester products API (avec pagination)
curl -s "http://localhost:3000/api/companies/dissan/pricing/products?limit=5&offset=0" | jq

# 6. Tester avec slug invalide (doit retourner 404)
curl -s http://localhost:3000/api/companies/invalid-slug/pricing/stats

# 7. Vérifier le dashboard en browser
open http://localhost:3000/companies/dissan/pricing
```

---

## Résultat Attendu

À la fin de Phase 3:

✅ **4 routes API fonctionnelles** avec gestion d'erreur
✅ **Dashboard affiche données réelles** de PostgreSQL
✅ **Pas de mock data** (sauf si DB vide)
✅ **Performance acceptable** (<500ms pour stats)
✅ **TypeScript compile** sans erreur
✅ **Tests manuels passent** (curl + browser)

---

## Handoff JSON pour Phase 4

```json
{
  "phase": 3,
  "name": "API Layer & Données Réelles",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "3.5h",
  "filesCreated": [
    "src/app/api/companies/[slug]/pricing/stats/route.ts",
    "src/app/api/companies/[slug]/pricing/history/route.ts",
    "src/app/api/companies/[slug]/pricing/products/route.ts"
  ],
  "filesModified": [
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx"
  ],
  "apiRoutes": [
    "GET /api/companies/[slug]/pricing/stats",
    "GET /api/companies/[slug]/pricing/history",
    "GET /api/companies/[slug]/pricing/products"
  ],
  "performanceMetrics": {
    "statsApiAvg": "320ms",
    "historyApiAvg": "850ms",
    "productsApiAvg": "180ms"
  },
  "dataSource": "postgresql",
  "mocksRemoved": true,
  "nextPhaseReady": true,
  "notes": "Dashboard maintenant connecté aux vraies données. Prêt pour upload catalogue (Phase 4)."
}
```

---

## Dépannage

### Problème: "Cannot find module '@/db'"

**Solution:**
```bash
# Vérifier tsconfig.json paths
cat tsconfig.json | grep "@/db"

# Doit contenir:
# "@/*": ["./src/*"]
```

### Problème: Stats API retourne 0 partout

**Solution:**
```sql
-- Vérifier si seed data existe
SELECT COUNT(*) FROM pricing_products;

-- Si 0, retourner à Phase 1 et exécuter seed script
```

### Problème: CORS errors dans browser console

**Solution:**
```typescript
// Ajouter headers CORS dans route.ts si needed
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ... });
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}
```

---

**Prochaine étape:** Phase 4 - Upload Catalogue Feature
