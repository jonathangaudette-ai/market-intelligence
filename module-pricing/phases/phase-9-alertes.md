# Phase 9: Alertes & Notifications

**Durée estimée:** 4-5 heures
**Complexité:** ⭐⭐⭐ Complexe
**Pré-requis:** Phase 0-8 complétées

---

## Objectif

Créer un système d'alertes automatiques qui notifie l'utilisateur lorsque:
- Un concurrent baisse son prix de >10%
- Votre prix devient >20% plus cher que la moyenne marché
- Un nouveau produit concurrent est détecté
- Anomalie détectée (ex: prix concurrent = 0.01$)

---

## Tâches

### Tâche 1: Service Alertes

**Fichier:** `src/lib/pricing/alert-service.ts`

```typescript
import { db } from "@/db";
import {
  pricingAlertRules,
  pricingAlertEvents,
  pricingProducts,
  pricingMatches,
  pricingHistory,
} from "@/db/schema-pricing";
import { eq, and, gte, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { HistoryService } from "./history-service";

interface AlertRule {
  id: string;
  companyId: string;
  name: string;
  type: "price_drop" | "price_increase" | "new_competitor" | "anomaly";
  conditions: {
    threshold?: number; // Percentage
    competitors?: string[]; // Specific competitor IDs
  };
  status: "active" | "paused";
}

interface AlertEvent {
  id: string;
  ruleId: string;
  productId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  metadata: any;
}

export class AlertService {
  private historyService: HistoryService;

  constructor() {
    this.historyService = new HistoryService();
  }

  /**
   * Evaluate all active alert rules for a company
   */
  async evaluateAlerts(companyId: string): Promise<AlertEvent[]> {
    // 1. Get all active alert rules
    const rules = await db
      .select()
      .from(pricingAlertRules)
      .where(
        and(
          eq(pricingAlertRules.companyId, companyId),
          eq(pricingAlertRules.status, "active")
        )
      );

    const alertEvents: AlertEvent[] = [];

    // 2. Evaluate each rule
    for (const rule of rules) {
      const events = await this.evaluateRule(rule);
      alertEvents.push(...events);
    }

    // 3. Save alert events to database
    for (const event of alertEvents) {
      await this.saveAlertEvent(event);
    }

    return alertEvents;
  }

  /**
   * Evaluate a specific rule
   */
  private async evaluateRule(rule: any): Promise<AlertEvent[]> {
    switch (rule.type) {
      case "price_drop":
        return this.evaluatePriceDropRule(rule);
      case "price_increase":
        return this.evaluatePriceIncreaseRule(rule);
      case "new_competitor":
        return this.evaluateNewCompetitorRule(rule);
      case "anomaly":
        return this.evaluateAnomalyRule(rule);
      default:
        return [];
    }
  }

  /**
   * Detect competitor price drops > threshold
   */
  private async evaluatePriceDropRule(rule: any): Promise<AlertEvent[]> {
    const threshold = rule.conditions.threshold || 10;
    const changes = await this.historyService.detectPriceChanges(rule.companyId);

    const alerts: AlertEvent[] = [];

    for (const change of changes) {
      if (change.competitorId && change.changePercent < -threshold) {
        alerts.push({
          id: createId(),
          ruleId: rule.id,
          productId: change.productId,
          severity: Math.abs(change.changePercent) > 20 ? "critical" : "warning",
          message: `Concurrent a baissé prix de ${Math.abs(change.changePercent).toFixed(1)}% (${change.oldPrice}$ → ${change.newPrice}$)`,
          metadata: {
            oldPrice: change.oldPrice,
            newPrice: change.newPrice,
            changePercent: change.changePercent,
            competitorId: change.competitorId,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Detect when your price becomes too high vs market
   */
  private async evaluatePriceIncreaseRule(rule: any): Promise<AlertEvent[]> {
    const threshold = rule.conditions.threshold || 20;
    const alerts: AlertEvent[] = [];

    // Get all matches with price gap
    const matches = await db
      .select({
        productId: pricingMatches.productId,
        productName: pricingProducts.name,
        yourPrice: pricingProducts.currentPrice,
        competitorPrice: pricingMatches.competitorPrice,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, rule.companyId),
          eq(pricingMatches.status, "active")
        )
      );

    for (const match of matches) {
      if (!match.yourPrice || !match.competitorPrice) continue;

      const gap = ((match.yourPrice - match.competitorPrice) / match.competitorPrice) * 100;

      if (gap > threshold) {
        alerts.push({
          id: createId(),
          ruleId: rule.id,
          productId: match.productId,
          severity: gap > 30 ? "critical" : "warning",
          message: `Votre prix ${gap.toFixed(1)}% au-dessus du concurrent (${match.yourPrice}$ vs ${match.competitorPrice}$)`,
          metadata: {
            yourPrice: match.yourPrice,
            competitorPrice: match.competitorPrice,
            gap,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Detect new competitor products matched
   */
  private async evaluateNewCompetitorRule(rule: any): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];

    // Get matches created in last 24h
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const newMatches = await db
      .select({
        productId: pricingMatches.productId,
        productName: pricingProducts.name,
        competitorProductName: pricingMatches.competitorProductName,
        competitorPrice: pricingMatches.competitorPrice,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, rule.companyId),
          gte(pricingMatches.createdAt, yesterday)
        )
      );

    for (const match of newMatches) {
      alerts.push({
        id: createId(),
        ruleId: rule.id,
        productId: match.productId,
        severity: "info",
        message: `Nouveau produit concurrent détecté: "${match.competitorProductName}" à ${match.competitorPrice}$`,
        metadata: {
          competitorProductName: match.competitorProductName,
          competitorPrice: match.competitorPrice,
        },
      });
    }

    return alerts;
  }

  /**
   * Detect pricing anomalies (e.g., price = $0.01, huge spike)
   */
  private async evaluateAnomalyRule(rule: any): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];

    // Get all competitor prices
    const matches = await db
      .select({
        productId: pricingMatches.productId,
        productName: pricingProducts.name,
        competitorPrice: pricingMatches.competitorPrice,
        competitorProductName: pricingMatches.competitorProductName,
      })
      .from(pricingMatches)
      .innerJoin(pricingProducts, eq(pricingMatches.productId, pricingProducts.id))
      .where(
        and(
          eq(pricingProducts.companyId, rule.companyId),
          eq(pricingMatches.status, "active")
        )
      );

    for (const match of matches) {
      // Anomaly: price too low (<$0.10)
      if (match.competitorPrice < 0.1) {
        alerts.push({
          id: createId(),
          ruleId: rule.id,
          productId: match.productId,
          severity: "warning",
          message: `Anomalie détectée: prix concurrent anormalement bas (${match.competitorPrice}$) pour "${match.competitorProductName}"`,
          metadata: {
            competitorPrice: match.competitorPrice,
            anomalyType: "too_low",
          },
        });
      }

      // Anomaly: price too high (>$10,000)
      if (match.competitorPrice > 10000) {
        alerts.push({
          id: createId(),
          ruleId: rule.id,
          productId: match.productId,
          severity: "warning",
          message: `Anomalie détectée: prix concurrent anormalement élevé (${match.competitorPrice}$)`,
          metadata: {
            competitorPrice: match.competitorPrice,
            anomalyType: "too_high",
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Save alert event to database
   */
  private async saveAlertEvent(event: AlertEvent): Promise<void> {
    await db.insert(pricingAlertEvents).values({
      id: event.id,
      ruleId: event.ruleId,
      productId: event.productId,
      severity: event.severity,
      message: event.message,
      metadata: event.metadata,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get recent alert events for a company
   */
  async getRecentAlerts(companyId: string, limit: number = 20): Promise<any[]> {
    const alerts = await db
      .select({
        alert: pricingAlertEvents,
        product: pricingProducts,
        rule: pricingAlertRules,
      })
      .from(pricingAlertEvents)
      .innerJoin(pricingProducts, eq(pricingAlertEvents.productId, pricingProducts.id))
      .innerJoin(pricingAlertRules, eq(pricingAlertEvents.ruleId, pricingAlertRules.id))
      .where(eq(pricingProducts.companyId, companyId))
      .orderBy(desc(pricingAlertEvents.createdAt))
      .limit(limit);

    return alerts;
  }

  /**
   * Mark alert as acknowledged
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await db
      .update(pricingAlertEvents)
      .set({
        status: "acknowledged",
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pricingAlertEvents.id, alertId));
  }
}
```

---

### Tâche 2: Cron Job Evaluation Alertes

**Fichier:** `src/app/api/cron/pricing-alerts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { AlertService } from "@/lib/pricing/alert-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron job: runs every 6 hours to evaluate alert rules
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/pricing-alerts",
 *     "schedule": "0 */6 * * *"
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

    const alertService = new AlertService();

    // Get all companies
    const allCompanies = await db.select().from(companies);

    let totalAlerts = 0;

    for (const company of allCompanies) {
      try {
        const alerts = await alertService.evaluateAlerts(company.id);
        totalAlerts += alerts.length;

        if (alerts.length > 0) {
          console.log(`Generated ${alerts.length} alerts for company ${company.slug}`);
          // TODO: Send email/Slack notification here
        }
      } catch (error) {
        console.error(`Error evaluating alerts for ${company.slug}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      companiesProcessed: allCompanies.length,
      totalAlerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in pricing alerts cron:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 3: Mettre à Jour vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/pricing-snapshot",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/pricing-alerts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

### Tâche 4: Route API Alertes

**Fichier:** `src/app/api/companies/[slug]/pricing/alerts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { AlertService } from "@/lib/pricing/alert-service";

interface AlertsParams {
  params: {
    slug: string;
  };
}

// GET /api/companies/[slug]/pricing/alerts
export async function GET(
  request: NextRequest,
  { params }: AlertsParams
) {
  try {
    const { slug } = params;

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const alertService = new AlertService();
    const alerts = await alertService.getRecentAlerts(company.id, 50);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 5: Mettre à Jour Dashboard avec Alertes Réelles

**Modifier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx`

Remplacer les alertes fictives dans la sidebar par fetch API:

```typescript
const [alerts, setAlerts] = useState<any[]>([]);

useEffect(() => {
  async function fetchAlerts() {
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/alerts`);
      const data = await response.json();

      // Take top 3 most recent critical/warning
      const topAlerts = data.alerts
        .filter((a: any) => ["critical", "warning"].includes(a.alert.severity))
        .slice(0, 3);

      setAlerts(topAlerts);
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  }

  fetchAlerts();
}, [slug]);

// In JSX, replace mock alert boxes with:
{alerts.map((alertData) => {
  const { alert, product } = alertData;
  const isСritical = alert.severity === "critical";

  return (
    <div
      key={alert.id}
      className={`p-3 border rounded-lg ${
        isCritical
          ? "bg-red-50 border-red-200"
          : "bg-yellow-50 border-yellow-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            isCritical ? "text-red-600" : "text-yellow-600"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${
              isCritical ? "text-red-900" : "text-yellow-900"
            }`}
          >
            {alert.message}
          </p>
          <p
            className={`text-xs mt-1 ${
              isCritical ? "text-red-700" : "text-yellow-700"
            }`}
          >
            {product.name}
          </p>
        </div>
      </div>
    </div>
  );
})}
```

---

## Checklist de Validation

**Avant de marquer Phase 9 complète:**

- [ ] `AlertService` créé avec 4 types de règles
- [ ] Cron job alertes créé: `/api/cron/pricing-alerts`
- [ ] `vercel.json` mis à jour avec cron alerts (toutes les 6h)
- [ ] Route API alertes créée
- [ ] Dashboard affiche vraies alertes (top 3)
- [ ] Test rule "price_drop" génère alertes
- [ ] Test rule "price_increase" génère alertes
- [ ] Test rule "anomaly" détecte prix < $0.10
- [ ] Acknowledge alert fonctionne
- [ ] Au moins 5 alertes générées dans `pricing_alert_events`

---

## Commandes de Test

```bash
# 1. Test cron alerts manuellement
curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  http://localhost:3000/api/cron/pricing-alerts

# 2. Vérifier alertes en DB
psql $DATABASE_URL -c "SELECT severity, message, created_at FROM pricing_alert_events ORDER BY created_at DESC LIMIT 10;"

# 3. Test API alerts
curl http://localhost:3000/api/companies/dissan/pricing/alerts | jq

# 4. Simuler baisse de prix pour tester alerte
psql $DATABASE_URL -c "UPDATE pricing_matches SET competitor_price = 2.99 WHERE id = 'some_match_id';"

# Puis re-lancer cron
curl -X GET -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/pricing-alerts

# 5. Vérifier dashboard affiche alertes
open http://localhost:3000/companies/dissan/pricing
```

---

## Résultat Attendu

À la fin de Phase 9:

✅ **Système d'alertes fonctionnel** avec 4 types de règles
✅ **Cron job** toutes les 6h évalue alertes
✅ **Dashboard affiche** top 3 alertes critiques/warning
✅ **Au moins 10 alertes** générées dans `pricing_alert_events`
✅ **Acknowledge alerts** fonctionne
✅ **Alertes pertinentes** (baisse prix >10%, prix élevé >20%)

---

## Handoff JSON pour Phase 10

```json
{
  "phase": 9,
  "name": "Alertes & Notifications",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "4.5h",
  "filesCreated": [
    "src/lib/pricing/alert-service.ts",
    "src/app/api/cron/pricing-alerts/route.ts",
    "src/app/api/companies/[slug]/pricing/alerts/route.ts"
  ],
  "filesModified": [
    "vercel.json",
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx"
  ],
  "cronSchedule": "0 */6 * * *",
  "alertRulesImplemented": [
    "price_drop",
    "price_increase",
    "new_competitor",
    "anomaly"
  ],
  "alertsGenerated": 17,
  "testResults": {
    "cronAlerts": "✅ Pass - 17 alerts generated",
    "priceDrop": "✅ Pass - Detected 5 drops >10%",
    "priceIncrease": "✅ Pass - Detected 8 products overpriced >20%",
    "anomaly": "✅ Pass - Detected 2 prices < $0.10",
    "dashboardDisplay": "✅ Pass - Shows top 3 alerts"
  },
  "nextPhaseReady": true,
  "notes": "Système d'alertes opérationnel. 17 alertes générées (5 critical, 12 warning). Cron toutes les 6h. Dashboard affiche alertes en temps réel. Prêt pour polish final (Phase 10)."
}
```

---

**Prochaine étape:** Phase 10 - Polish, Tests & Documentation
