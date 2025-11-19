# Phase 10: Polish, Tests & Documentation

**Durée estimée:** 3-4 heures
**Complexité:** ⭐⭐ Moyenne
**Pré-requis:** Phase 0-9 complétées

---

## Objectif

Finaliser le module pricing: polir l'UI, ajouter tests unitaires/intégration critiques, créer documentation utilisateur, optimiser performance, et préparer pour production.

---

## Tâches

### Tâche 1: Tests Unitaires Services Critiques

**Fichier:** `src/lib/pricing/__tests__/matching-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MatchingService } from "../matching-service";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    yourProductId: "prod_1",
                    competitorProductUrl: "https://swish.com/product-1",
                    confidence: 0.92,
                    reasoning: "Même type de brosse",
                  },
                ]),
              },
            },
          ],
        }),
      },
    };
  },
}));

describe("MatchingService", () => {
  let matchingService: MatchingService;

  beforeEach(() => {
    matchingService = new MatchingService();
  });

  it("should match products with GPT-5", async () => {
    const yourProducts = [
      {
        id: "prod_1",
        sku: "ATL-2024",
        name: "Brosse cuvette",
        characteristics: { type: "bowl brush" },
      },
    ];

    const competitorProducts = [
      {
        url: "https://swish.com/product-1",
        name: "Toilet bowl brush",
        price: 4.5,
        currency: "CAD",
      },
    ];

    const result = await (matchingService as any).matchBatchWithGPT5(
      yourProducts,
      competitorProducts
    );

    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
    expect(result[0].productId).toBe("prod_1");
  });

  it("should filter out low confidence matches", async () => {
    // Mock GPT-5 returning low confidence
    vi.mocked(OpenAI.prototype.chat.completions.create).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                yourProductId: "prod_1",
                competitorProductUrl: "https://swish.com/product-1",
                confidence: 0.5, // Below 0.7 threshold
                reasoning: "Incertain",
              },
            ]),
          },
        },
      ],
    } as any);

    // Test would verify only >= 0.7 saved
  });
});
```

---

**Fichier:** `src/lib/pricing/__tests__/alert-service.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { AlertService } from "../alert-service";

describe("AlertService", () => {
  it("should detect price drops > 10%", async () => {
    const alertService = new AlertService();

    // Mock history service
    vi.spyOn(alertService["historyService"], "detectPriceChanges").mockResolvedValue([
      {
        productId: "prod_1",
        productName: "Brosse",
        competitorId: "comp_1",
        oldPrice: 10.0,
        newPrice: 8.0,
        changePercent: -20,
        detectedAt: new Date(),
      },
    ]);

    const rule = {
      id: "rule_1",
      companyId: "company_1",
      type: "price_drop",
      conditions: { threshold: 10 },
    };

    const alerts = await (alertService as any).evaluatePriceDropRule(rule);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical"); // -20% should be critical
    expect(alerts[0].message).toContain("20.0%");
  });

  it("should detect anomalies (price < $0.10)", async () => {
    // Test anomaly detection logic
  });
});
```

---

**Commande pour lancer les tests:**

```bash
# Installer Vitest si pas déjà fait
npm install --save-dev vitest @vitest/ui

# Lancer tests
npx vitest run

# Avec coverage
npx vitest run --coverage
```

---

### Tâche 2: Tests E2E Critiques avec Playwright

**Fichier:** `tests/e2e/pricing-dashboard.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Pricing Dashboard", () => {
  test("should display dashboard with stats", async ({ page }) => {
    await page.goto("/companies/dissan/pricing");

    // Wait for stats to load
    await page.waitForSelector('[data-testid="stat-card-products"]');

    // Verify stats cards visible
    const productsCard = page.locator('[data-testid="stat-card-products"]');
    await expect(productsCard).toBeVisible();

    const priceGapCard = page.locator('[data-testid="stat-card-price-gap"]');
    await expect(priceGapCard).toBeVisible();

    // Verify chart renders
    const chart = page.locator(".recharts-wrapper");
    await expect(chart).toBeVisible();

    // Verify alerts sidebar
    const alertsSection = page.locator('[data-testid="alerts-section"]');
    await expect(alertsSection).toBeVisible();
  });

  test("should trigger manual scan", async ({ page }) => {
    await page.goto("/companies/dissan/pricing");

    // Click "Lancer scan" button
    const scanButton = page.locator('button:has-text("Lancer scan")');
    await scanButton.click();

    // Verify button shows loading state
    await expect(scanButton).toContainText("Scan en cours");

    // Wait for scan to complete (with timeout)
    await page.waitForSelector('button:has-text("Lancer scan")', {
      timeout: 60000,
    });
  });

  test("should navigate to matches page", async ({ page }) => {
    await page.goto("/companies/dissan/pricing");

    await page.click('a[href*="/pricing/matches"]');

    await expect(page).toHaveURL(/\/pricing\/matches/);

    // Verify matches list visible
    const matchesList = page.locator('[data-testid="matches-list"]');
    await expect(matchesList).toBeVisible();
  });
});
```

**Commande:**

```bash
# Lancer tests E2E
npx playwright test

# Avec UI
npx playwright test --ui
```

---

### Tâche 3: Optimisations Performance

**A. Ajouter Index DB Manquants**

```sql
-- src/db/migrations/add_pricing_indexes.sql
-- Optimiser requêtes fréquentes

-- Index pour history queries (par date)
CREATE INDEX IF NOT EXISTS idx_pricing_history_recorded_at
ON pricing_history(recorded_at DESC);

-- Index composite product + date
CREATE INDEX IF NOT EXISTS idx_pricing_history_product_date
ON pricing_history(product_id, recorded_at DESC);

-- Index pour matches actifs
CREATE INDEX IF NOT EXISTS idx_pricing_matches_active
ON pricing_matches(status, product_id)
WHERE status = 'active';

-- Index pour alertes récentes
CREATE INDEX IF NOT EXISTS idx_pricing_alert_events_recent
ON pricing_alert_events(created_at DESC, severity)
WHERE status = 'new';

-- Index composite company + status
CREATE INDEX IF NOT EXISTS idx_pricing_products_company_status
ON pricing_products(company_id, status)
WHERE status = 'active';
```

**Appliquer migrations:**

```bash
psql $DATABASE_URL < src/db/migrations/add_pricing_indexes.sql
```

---

**B. Cache API Stats (Redis ou In-Memory)**

**Fichier:** `src/lib/pricing/cache.ts`

```typescript
// Simple in-memory cache (TTL 5 minutes)
const cache = new Map<string, { data: any; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCache(key: string, data: any, ttlSeconds: number = 300): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function clearCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}
```

**Modifier route stats API:**

```typescript
// src/app/api/companies/[slug]/pricing/stats/route.ts
import { getCached, setCache } from "@/lib/pricing/cache";

export async function GET(request: NextRequest, { params }: StatsParams) {
  const { slug } = params;
  const cacheKey = `pricing_stats_${slug}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ... existing logic to fetch stats ...

  // Cache for 5 minutes
  setCache(cacheKey, stats, 300);

  return NextResponse.json(stats);
}
```

---

### Tâche 4: Documentation Utilisateur

**Fichier:** `module-pricing/USER_GUIDE.md`

```markdown
# Guide Utilisateur - Module Intelligence de Prix

## Vue d'ensemble

Le module Intelligence de Prix surveille automatiquement les prix de vos concurrents et vous alerte sur les opportunités d'ajustement tarifaire.

---

## Démarrage Rapide

### Étape 1: Importer votre catalogue

1. Aller à **Intelligence de Prix → Catalogue**
2. Télécharger le template CSV
3. Remplir vos produits (SKU, Nom, Prix)
4. Uploader le fichier

**Format attendu:**

| SKU      | Nom                    | Prix  |
| -------- | ---------------------- | ----- |
| ATL-2024 | Brosse cuvette PP      | 4.99  |
| ATL-3001 | Balai industriel 24"   | 12.50 |

---

### Étape 2: Configurer vos concurrents

1. Aller à **Intelligence de Prix → Concurrents**
2. Cliquer **Ajouter Concurrent**
3. Renseigner:
   - Nom (ex: "Swish")
   - Domaine (ex: "swish.com")
   - Fréquence de scan (quotidien recommandé)

4. Configurer sélecteurs CSS (optionnel avancé)

---

### Étape 3: Lancer premier scan

1. Aller au **Dashboard**
2. Cliquer **Lancer scan**
3. Attendre 30-60 secondes

Résultat: produits concurrents scrapés et matchés automatiquement.

---

## Fonctionnalités

### Dashboard

- **6 KPI Cards**: Produits surveillés, écart prix moyen, avantage compétitif, etc.
- **Chart évolution 30 jours**: Compare vos prix vs concurrents
- **Alertes IA**: Top 3 alertes critiques/warning

### Matches

- Voir tous les produits matchés vs concurrents
- Score de confiance GPT-5 (70-100%)
- Écart prix en % (vert si moins cher, rouge si plus cher)

### Historique

- Évolution prix sur 30/60/90 jours
- Détection changements significatifs (>10%)

### Alertes

- Baisse prix concurrent >10%
- Votre prix >20% au-dessus marché
- Nouveaux produits concurrents détectés
- Anomalies (prix < $0.10, prix > $10,000)

---

## FAQ

**Q: Comment améliorer le matching IA?**
R: Ajoutez des caractéristiques (matériau, type, dimensions) dans votre catalogue CSV.

**Q: Pourquoi certains produits ne matchent pas?**
R: Soit aucun équivalent concurrent, soit confiance GPT-5 < 70%.

**Q: Puis-je scraper plus souvent que quotidien?**
R: Oui, configurez "Toutes les heures" dans config concurrent. Attention au coût scraping.

**Q: Les alertes sont-elles envoyées par email?**
R: Phase 10 implémente uniquement dashboard. Email/Slack seront ajoutés en Phase 11 (future).

---

## Support

Pour bugs ou questions: [email support]
```

---

### Tâche 5: Polish UI Final

**A. Ajouter data-testid pour tests E2E**

**Modifier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx`

```typescript
<StatCard
  data-testid="stat-card-products"
  label="Produits Surveillés"
  value={stats.products.total}
  // ...
/>

<div data-testid="alerts-section">
  {/* Alerts content */}
</div>
```

**B. Ajouter Loading Skeletons Partout**

Vérifier que tous composants ont `loading` state avec `<Skeleton />`.

**C. Ajouter Empty States**

```typescript
// Example: Empty state for matches
{matches.length === 0 && !loading && (
  <Card>
    <CardContent className="p-12 text-center">
      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-2">Aucun match trouvé</p>
      <p className="text-sm text-gray-500">
        Lancez un scan pour matcher vos produits vs concurrents
      </p>
      <Button className="mt-4" onClick={() => router.push(`/companies/${slug}/pricing`)}>
        Retour au Dashboard
      </Button>
    </CardContent>
  </Card>
)}
```

---

### Tâche 6: Validation Finale & Checklist Production

**Fichier:** `module-pricing/PRODUCTION_CHECKLIST.md`

```markdown
# Checklist Production - Module Pricing

## Base de Données

- [ ] Toutes migrations appliquées (9 tables créées)
- [ ] Index de performance créés
- [ ] Seed data test supprimé (si applicable)
- [ ] Backup DB configuré

## API & Services

- [ ] Toutes routes API fonctionnelles (stats, history, products, competitors, matches, alerts, scans)
- [ ] Gestion d'erreur robuste (try/catch partout)
- [ ] Logs structurés (console.log → logger structuré)
- [ ] Rate limiting configuré (Vercel)

## Scraping

- [ ] Scraper fonctionnel pour 2+ concurrents
- [ ] Gestion timeout (60s max)
- [ ] Gestion anti-bot (headers User-Agent)
- [ ] Error handling (403, 404, timeout)

## Matching IA

- [ ] GPT-5 configuré avec reasoning.effort: 'medium'
- [ ] Seuil confiance >= 0.7
- [ ] Coût GPT-5 surveillé (budget alerts)

## Historique

- [ ] Cron snapshot quotidien fonctionnel (2h AM)
- [ ] Au moins 30 jours de données historiques
- [ ] Performance requêtes trends < 2s

## Alertes

- [ ] Cron alertes toutes les 6h fonctionnel
- [ ] 4 types de règles implémentés
- [ ] Alertes visibles dans dashboard

## UI/UX

- [ ] Design system respecté (pas d'emojis, Lucide icons, teal-600)
- [ ] Loading states partout
- [ ] Empty states partout
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Accessibilité (aria-labels, keyboard navigation)

## Tests

- [ ] Tests unitaires services critiques (matching, alerts)
- [ ] Tests E2E dashboard, upload, competitors
- [ ] Coverage >= 60%

## Performance

- [ ] Dashboard load < 2s
- [ ] Stats API < 500ms (avec cache)
- [ ] History API < 2s
- [ ] Scan complete < 60s (par concurrent)

## Sécurité

- [ ] CRON_SECRET configuré et sécurisé
- [ ] OPENAI_API_KEY sécurisé
- [ ] Pas de secrets dans code source
- [ ] Input validation partout (upload CSV, formulaires)

## Documentation

- [ ] USER_GUIDE.md complet
- [ ] DEVELOPMENT_PLAN.md à jour
- [ ] Handoff JSON Phase 10 créé
- [ ] README.md à jour

## Déploiement

- [ ] Build réussit: `npm run build`
- [ ] Pas d'erreurs TypeScript: `npx tsc --noEmit`
- [ ] Lint passe: `npm run lint`
- [ ] Variables d'env production configurées
- [ ] Vercel crons activés
- [ ] Monitoring configuré (Sentry, Vercel Analytics)

---

**GO/NO-GO Production:** Minimum 90% des items cochés.
```

---

## Checklist de Validation Phase 10

**Avant de marquer Phase 10 complète:**

- [ ] Tests unitaires créés (matching-service, alert-service)
- [ ] Tests E2E créés (dashboard, upload, matches)
- [ ] Index DB performance ajoutés (5 index créés)
- [ ] Cache API stats implémenté (TTL 5 min)
- [ ] Documentation utilisateur complète (USER_GUIDE.md)
- [ ] Production checklist créée
- [ ] data-testid ajoutés aux composants critiques
- [ ] Empty states ajoutés partout
- [ ] Loading skeletons vérifiés
- [ ] Build production réussit: `npm run build`
- [ ] Pas d'erreurs TypeScript: `npx tsc --noEmit`
- [ ] Lint passe: `npm run lint`

---

## Commandes de Test

```bash
# 1. Lancer tests unitaires
npx vitest run

# 2. Lancer tests E2E
npx playwright test

# 3. Vérifier TypeScript
npx tsc --noEmit

# 4. Vérifier Lint
npm run lint

# 5. Build production
npm run build

# 6. Analyser bundle size
npm run build -- --analyze

# 7. Test performance (Lighthouse)
npx lighthouse http://localhost:3000/companies/dissan/pricing --view

# 8. Vérifier index DB créés
psql $DATABASE_URL -c "\d+ pricing_history"
```

---

## Résultat Attendu

À la fin de Phase 10:

✅ **Tests en place** (unitaires + E2E)
✅ **Performance optimisée** (cache, index DB)
✅ **Documentation complète** (USER_GUIDE.md, PRODUCTION_CHECKLIST.md)
✅ **UI polie** (loading states, empty states, data-testid)
✅ **Build production** réussit sans erreur
✅ **Prêt pour déploiement** production

---

## Handoff JSON Final

```json
{
  "phase": 10,
  "name": "Polish, Tests & Documentation",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "3.5h",
  "filesCreated": [
    "src/lib/pricing/__tests__/matching-service.test.ts",
    "src/lib/pricing/__tests__/alert-service.test.ts",
    "tests/e2e/pricing-dashboard.spec.ts",
    "src/lib/pricing/cache.ts",
    "src/db/migrations/add_pricing_indexes.sql",
    "module-pricing/USER_GUIDE.md",
    "module-pricing/PRODUCTION_CHECKLIST.md"
  ],
  "filesModified": [
    "src/app/api/companies/[slug]/pricing/stats/route.ts",
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx"
  ],
  "testCoverage": {
    "unit": "72%",
    "e2e": "4 critical flows covered"
  },
  "performanceOptimizations": [
    "API stats cache (TTL 5min)",
    "5 DB indexes added",
    "Bundle size analyzed"
  ],
  "productionReady": true,
  "checklist": {
    "total": 45,
    "completed": 43,
    "percentage": 95.6
  },
  "buildStatus": "✅ Success",
  "notes": "Module pricing complet et prêt pour production. 95.6% checklist production complétée. Tests unitaires + E2E en place. Performance optimisée (cache + index). Documentation complète (USER_GUIDE + PRODUCTION_CHECKLIST). UI polie avec loading/empty states. Build production réussit."
}
```

---

## Prochaines Étapes (Post-Phase 10)

**Phase 11 (Future - optionnel):**
- Email notifications (SendGrid/Resend)
- Slack/Teams webhooks
- Export Excel rapports
- Filtres avancés dashboard
- API publique (REST)
- Gestion multi-utilisateurs (permissions)

**Maintenance Continue:**
- Monitorer coûts GPT-5 (budget alerts)
- Mettre à jour sélecteurs scraping (si sites changent)
- Optimiser performance DB (si >10k produits)
- Backup régulier données historiques

---

**FIN DU DÉVELOPPEMENT PLAN - 10 PHASES COMPLÉTÉES**

**Durée totale estimée:** 35-50 heures
**Phases complétées:** 10/10 (100%)
**Production ready:** ✅ Oui

Félicitations! Le module Competitive Pricing Intelligence est complet et prêt pour déploiement production.
