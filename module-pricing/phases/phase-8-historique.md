# Phase 8: Historique & Time-Series

**Durée estimée:** 4-5 heures
**Complexité:** ⭐⭐⭐ Complexe
**Pré-requis:** Phase 0-7 complétées

---

## Objectif

Créer un système de tracking historique des prix: enregistrer automatiquement les variations de prix dans `pricing_history`, visualiser l'évolution dans le dashboard avec Recharts, et détecter les changements significatifs.

---

## Tâches

### Tâche 1: Service Historique

**Fichier:** `src/lib/pricing/history-service.ts`

```typescript
import { db } from "@/db";
import { pricingHistory, pricingProducts, pricingMatches } from "@/db/schema-pricing";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export class HistoryService {
  /**
   * Record price snapshot for all active products
   */
  async recordPriceSnapshot(companyId: string): Promise<number> {
    // 1. Get all active products for company
    const products = await db
      .select()
      .from(pricingProducts)
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingProducts.status, "active")
        )
      );

    let recordedCount = 0;

    // 2. Record your prices
    for (const product of products) {
      if (product.currentPrice) {
        await this.recordPrice(
          product.id,
          product.currentPrice,
          null // Your product, no competitor
        );
        recordedCount++;
      }
    }

    // 3. Record competitor prices from matches
    const matches = await db
      .select()
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          eq(pricingMatches.status, "active")
        )
      );

    for (const match of matches) {
      if (match.pricing_matches.competitorPrice) {
        await this.recordPrice(
          match.pricing_matches.productId,
          match.pricing_matches.competitorPrice,
          match.pricing_matches.competitorId
        );
        recordedCount++;
      }
    }

    return recordedCount;
  }

  /**
   * Record a single price point
   */
  async recordPrice(
    productId: string,
    price: number,
    competitorId: string | null
  ): Promise<void> {
    const historyId = createId();

    await db.insert(pricingHistory).values({
      id: historyId,
      productId,
      competitorId,
      price,
      recordedAt: new Date(),
      createdAt: new Date(),
    });
  }

  /**
   * Get price history for a product (last N days)
   */
  async getPriceHistory(
    productId: string,
    days: number = 30
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const history = await db
      .select()
      .from(pricingHistory)
      .where(
        and(
          eq(pricingHistory.productId, productId),
          gte(pricingHistory.recordedAt, dateThreshold)
        )
      )
      .orderBy(desc(pricingHistory.recordedAt));

    return history;
  }

  /**
   * Get aggregated price trends for dashboard chart
   */
  async getAggregatePriceTrends(
    companyId: string,
    days: number = 30
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get daily average prices grouped by date and source (your company vs competitors)
    const trends = await db
      .select({
        date: sql`DATE(${pricingHistory.recordedAt})`,
        competitorId: pricingHistory.competitorId,
        avgPrice: sql<number>`AVG(${pricingHistory.price})::numeric(10,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(pricingHistory)
      .innerJoin(pricingProducts, eq(pricingHistory.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          gte(pricingHistory.recordedAt, dateThreshold)
        )
      )
      .groupBy(sql`DATE(${pricingHistory.recordedAt})`, pricingHistory.competitorId)
      .orderBy(sql`DATE(${pricingHistory.recordedAt})`);

    return trends;
  }

  /**
   * Detect significant price changes (> 10% in last 24h)
   */
  async detectPriceChanges(companyId: string): Promise<any[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get prices from 24h ago and now
    const recentHistory = await db
      .select({
        productId: pricingHistory.productId,
        productName: pricingProducts.name,
        competitorId: pricingHistory.competitorId,
        price: pricingHistory.price,
        recordedAt: pricingHistory.recordedAt,
      })
      .from(pricingHistory)
      .innerJoin(pricingProducts, eq(pricingHistory.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, companyId),
          gte(pricingHistory.recordedAt, yesterday)
        )
      )
      .orderBy(pricingHistory.productId, pricingHistory.recordedAt);

    // Group by product and detect changes
    const changes: any[] = [];
    const grouped = new Map<string, any[]>();

    recentHistory.forEach((record) => {
      const key = `${record.productId}_${record.competitorId || "yours"}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    });

    grouped.forEach((records, key) => {
      if (records.length < 2) return;

      const oldest = records[0];
      const newest = records[records.length - 1];

      const changePercent =
        ((newest.price - oldest.price) / oldest.price) * 100;

      if (Math.abs(changePercent) >= 10) {
        changes.push({
          productId: oldest.productId,
          productName: oldest.productName,
          competitorId: oldest.competitorId,
          oldPrice: oldest.price,
          newPrice: newest.price,
          changePercent,
          detectedAt: new Date(),
        });
      }
    });

    return changes;
  }
}
```

---

### Tâche 2: Cron Job pour Snapshot Quotidien

**Fichier:** `src/app/api/cron/pricing-snapshot/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { HistoryService } from "@/lib/pricing/history-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron job: runs daily to snapshot all prices
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/pricing-snapshot",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const historyService = new HistoryService();

    // Get all companies with pricing module enabled
    const allCompanies = await db.select().from(companies);

    let totalSnapshots = 0;

    for (const company of allCompanies) {
      try {
        const recorded = await historyService.recordPriceSnapshot(company.id);
        totalSnapshots += recorded;
        console.log(`Recorded ${recorded} prices for company ${company.slug}`);
      } catch (error) {
        console.error(`Error recording snapshot for ${company.slug}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      companiesProcessed: allCompanies.length,
      totalSnapshots,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in pricing snapshot cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 3: Ajouter Cron Config Vercel

**Fichier:** `vercel.json` (créer ou modifier à la racine)

```json
{
  "crons": [
    {
      "path": "/api/cron/pricing-snapshot",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

### Tâche 4: Mettre à Jour Dashboard avec Vraies Données Historiques

**Modifier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx`

Remplacer `MOCK_PRICE_HISTORY` par fetch API:

```typescript
useEffect(() => {
  async function fetchPriceHistory() {
    try {
      const response = await fetch(
        `/api/companies/${slug}/pricing/history?days=30`
      );

      if (!response.ok) throw new Error("Failed to fetch history");

      const data = await response.json();

      // Transform API response to chart format
      const chartData = transformHistoryToChart(data.trends);
      setPriceHistory(chartData);
    } catch (error) {
      console.error("Error loading price history:", error);
    }
  }

  fetchPriceHistory();
}, [slug]);

function transformHistoryToChart(trends: any[]): any[] {
  // Group by date
  const grouped = trends.reduce((acc: any, trend: any) => {
    const date = trend.date;
    if (!acc[date]) {
      acc[date] = { date };
    }

    if (!trend.competitorId) {
      // Your prices
      acc[date].vous = parseFloat(trend.avgPrice);
    } else {
      // Competitor prices (use competitor name as key)
      acc[date][`comp_${trend.competitorId}`] = parseFloat(trend.avgPrice);
    }

    return acc;
  }, {});

  return Object.values(grouped).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );
}
```

---

### Tâche 5: Route API Historique (améliorer celle de Phase 3)

**Modifier:** `src/app/api/companies/[slug]/pricing/history/route.ts`

```typescript
import { HistoryService } from "@/lib/pricing/history-service";

export async function GET(
  request: NextRequest,
  { params }: HistoryParams
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const productId = searchParams.get("productId");

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const historyService = new HistoryService();

    if (productId) {
      // Get history for specific product
      const history = await historyService.getPriceHistory(productId, days);
      return NextResponse.json({ history });
    } else {
      // Get aggregated trends for dashboard
      const trends = await historyService.getAggregatePriceTrends(company.id, days);
      return NextResponse.json({ trends });
    }
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Checklist de Validation

**Avant de marquer Phase 8 complète:**

- [ ] `HistoryService` créé avec toutes méthodes
- [ ] Cron job créé: `/api/cron/pricing-snapshot`
- [ ] `vercel.json` configuré avec cron schedule
- [ ] Variable d'environnement `CRON_SECRET` ajoutée
- [ ] Test snapshot manuel: appeler API cron avec secret
- [ ] Vérifier données dans `pricing_history` (au moins 50 enregistrements)
- [ ] Dashboard affiche vraies données historiques (plus de mock)
- [ ] Chart Recharts montre évolution 30 jours
- [ ] Détection changements significatifs (>10%) fonctionne
- [ ] Performance: requête aggregated trends < 2s

---

## Commandes de Test

```bash
# 1. Test snapshot manuel
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://localhost:3000/api/cron/pricing-snapshot

# 2. Vérifier données historiques en DB
psql $DATABASE_URL -c "SELECT DATE(recorded_at), COUNT(*), AVG(price)::numeric(10,2) FROM pricing_history GROUP BY DATE(recorded_at) ORDER BY DATE(recorded_at) DESC LIMIT 10;"

# 3. Test API history (trends)
curl "http://localhost:3000/api/companies/dissan/pricing/history?days=30" | jq

# 4. Test détection changements
psql $DATABASE_URL -c "SELECT * FROM pricing_history WHERE recorded_at >= NOW() - INTERVAL '24 hours' ORDER BY recorded_at DESC LIMIT 20;"

# 5. Vérifier cron config Vercel
cat vercel.json | jq
```

---

## Résultat Attendu

À la fin de Phase 8:

✅ **Historique enregistré** quotidiennement via cron
✅ **Dashboard affiche vraies données** (30 jours)
✅ **Chart Recharts** avec évolution prix
✅ **Détection changements** significatifs (>10%)
✅ **Performance acceptable** (<2s pour trends API)
✅ **Au moins 100 points** dans `pricing_history`

---

## Dépannage

### Problème: Cron ne s'exécute pas sur Vercel

**Solution:**
```bash
# Vérifier logs Vercel
vercel logs --follow

# Tester cron localement avec curl
curl -X GET \
  -H "Authorization: Bearer test_secret" \
  http://localhost:3000/api/cron/pricing-snapshot

# Vérifier CRON_SECRET est set
vercel env ls
```

### Problème: Trop de données dans `pricing_history` (>1M rows)

**Solution:**
```sql
-- Archiver anciennes données (>90 jours)
CREATE TABLE pricing_history_archive AS
SELECT * FROM pricing_history
WHERE recorded_at < NOW() - INTERVAL '90 days';

DELETE FROM pricing_history
WHERE recorded_at < NOW() - INTERVAL '90 days';

-- Ou créer index partitionné par date
```

### Problème: Requête trends trop lente (>5s)

**Solution:**
```sql
-- Ajouter index sur recorded_at
CREATE INDEX idx_pricing_history_recorded_at
ON pricing_history(recorded_at);

-- Ajouter index composite
CREATE INDEX idx_pricing_history_product_date
ON pricing_history(product_id, recorded_at);
```

---

## Handoff JSON pour Phase 9

```json
{
  "phase": 8,
  "name": "Historique & Time-Series",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "4.5h",
  "filesCreated": [
    "src/lib/pricing/history-service.ts",
    "src/app/api/cron/pricing-snapshot/route.ts",
    "vercel.json"
  ],
  "filesModified": [
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx",
    "src/app/api/companies/[slug]/pricing/history/route.ts"
  ],
  "cronSchedule": "0 2 * * *",
  "historyRecords": 247,
  "testResults": {
    "cronSnapshot": "✅ Pass - 247 prices recorded",
    "historyAPI": "✅ Pass - Returns 30-day trends",
    "dashboardChart": "✅ Pass - Recharts displays data",
    "changeDetection": "✅ Pass - Found 3 significant changes (>10%)"
  },
  "performanceMetrics": {
    "snapshotDuration": "12s",
    "trendsAPIAvg": "1.2s",
    "chartRenderTime": "350ms"
  },
  "nextPhaseReady": true,
  "notes": "Historique time-series fonctionnel. Cron quotidien enregistre 247 prix. Dashboard affiche évolution 30 jours. Prêt pour alertes (Phase 9)."
}
```

---

**Prochaine étape:** Phase 9 - Alertes & Notifications
