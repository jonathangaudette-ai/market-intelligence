# Phase 6: Scraping Engine

**Durée estimée:** 6-8 heures
**Complexité:** ⭐⭐⭐⭐ Très Complexe
**Pré-requis:** Phase 0, 1, 2, 3, 4, 5 complétées

---

## Objectif

Créer le moteur de scraping qui extrait automatiquement les prix des sites concurrents, stocke les résultats dans `pricing_scans`, et gère les erreurs (timeout, anti-bot, sélecteurs invalides).

**Note:** Le projet possède déjà un scraper fonctionnel dans `/Users/jonathangaudette/market-intelligence/Dissan/price-scraper`. Cette phase consiste à l'intégrer dans le module pricing.

---

## Tâches

### Tâche 1: Analyser le Scraper Existant

**Localisation:** `/Users/jonathangaudette/market-intelligence/Dissan/price-scraper/`

**Fichiers clés à examiner:**
- `src/main.ts` - Point d'entrée du scraper
- `src/scrapers/` - Scrapers spécifiques par site (Swish, Grainger, VTO, Uline)
- `src/matchers/` - Logique de matching produits
- `src/exporters/` - Export des résultats

**Commandes d'exploration:**
```bash
# Lister structure
ls -la /Users/jonathangaudette/market-intelligence/Dissan/price-scraper/src

# Examiner main.ts
cat /Users/jonathangaudette/market-intelligence/Dissan/price-scraper/src/main.ts | head -100

# Voir exemple scraper
cat /Users/jonathangaudette/market-intelligence/Dissan/price-scraper/src/scrapers/swish-scraper.ts
```

---

### Tâche 2: Créer Service Scraping dans Module Pricing

**Fichier:** `src/lib/pricing/scraping-service.ts`

```typescript
import { db } from "@/db";
import { pricingCompetitors, pricingScans } from "@/db/schema-pricing";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

interface ScrapingResult {
  productUrl: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  characteristics?: Record<string, any>;
}

interface ScrapingError {
  url: string;
  error: string;
  timestamp: Date;
}

export class ScrapingService {
  /**
   * Execute scraping for a specific competitor
   */
  async scrapeCompetitor(competitorId: string): Promise<{
    success: boolean;
    productsScraped: number;
    errors: ScrapingError[];
  }> {
    const competitor = await db.query.pricingCompetitors.findFirst({
      where: eq(pricingCompetitors.id, competitorId),
    });

    if (!competitor) {
      throw new Error(`Competitor ${competitorId} not found`);
    }

    const scanId = createId();
    const scrapedProducts: ScrapingResult[] = [];
    const errors: ScrapingError[] = [];

    try {
      // 1. Create scan record
      await db.insert(pricingScans).values({
        id: scanId,
        competitorId: competitor.id,
        status: "in_progress",
        startedAt: new Date(),
        metadata: {
          scrapingSelectors: competitor.scrapingSelectors,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Execute scraping based on competitor configuration
      const results = await this.executeScraping(competitor);

      scrapedProducts.push(...results.products);
      errors.push(...results.errors);

      // 3. Update scan record
      await db
        .update(pricingScans)
        .set({
          status: errors.length > 0 ? "completed_with_errors" : "completed",
          completedAt: new Date(),
          productsScraped: scrapedProducts.length,
          errorCount: errors.length,
          errorDetails: errors.length > 0 ? errors : null,
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      // 4. Update competitor last scanned timestamp
      await db
        .update(pricingCompetitors)
        .set({
          lastScannedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pricingCompetitors.id, competitorId));

      return {
        success: errors.length === 0,
        productsScraped: scrapedProducts.length,
        errors,
      };
    } catch (error: any) {
      // Mark scan as failed
      await db
        .update(pricingScans)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorDetails: [{ error: error.message, timestamp: new Date() }],
          updatedAt: new Date(),
        })
        .where(eq(pricingScans.id, scanId));

      throw error;
    }
  }

  /**
   * Execute scraping logic (to be implemented with existing scraper)
   */
  private async executeScraping(competitor: any): Promise<{
    products: ScrapingResult[];
    errors: ScrapingError[];
  }> {
    // TODO: Integrate with /Dissan/price-scraper logic
    // This is a placeholder - Phase 6 will implement actual integration

    const products: ScrapingResult[] = [];
    const errors: ScrapingError[] = [];

    try {
      // Option 1: Import existing scraper as npm module
      // Option 2: Reuse scraper classes directly
      // Option 3: Call scraper as child process

      // For now, return mock data
      console.log(`Scraping ${competitor.domain}...`);

      // Simulate scraping delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock scraped products
      products.push({
        productUrl: `https://${competitor.domain}/product-1`,
        name: "Mock Product 1",
        price: 9.99,
        currency: "CAD",
      });

      return { products, errors };
    } catch (error: any) {
      errors.push({
        url: competitor.domain,
        error: error.message,
        timestamp: new Date(),
      });

      return { products, errors };
    }
  }

  /**
   * Scrape all active competitors for a company
   */
  async scrapeAllCompetitors(companyId: string): Promise<void> {
    const competitors = await db.query.pricingCompetitors.findMany({
      where: (competitors, { and, eq }) =>
        and(
          eq(competitors.companyId, companyId),
          eq(competitors.status, "active")
        ),
    });

    for (const competitor of competitors) {
      try {
        await this.scrapeCompetitor(competitor.id);
      } catch (error) {
        console.error(`Error scraping competitor ${competitor.name}:`, error);
        // Continue with next competitor
      }
    }
  }
}
```

---

### Tâche 3: Route API Déclenchement Scan Manuel

**Fichier:** `src/app/api/companies/[slug]/pricing/scans/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ScrapingService } from "@/lib/pricing/scraping-service";

interface ScansParams {
  params: {
    slug: string;
  };
}

// POST /api/companies/[slug]/pricing/scans
export async function POST(
  request: NextRequest,
  { params }: ScansParams
) {
  try {
    const { slug } = params;
    const body = await request.json();

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const scrapingService = new ScrapingService();

    if (body.competitorId) {
      // Scan single competitor
      const result = await scrapingService.scrapeCompetitor(body.competitorId);

      return NextResponse.json({
        success: result.success,
        productsScraped: result.productsScraped,
        errors: result.errors,
      });
    } else {
      // Scan all active competitors
      await scrapingService.scrapeAllCompetitors(company.id);

      return NextResponse.json({
        success: true,
        message: "Scan of all competitors initiated",
      });
    }
  } catch (error: any) {
    console.error("Error triggering scan:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/companies/[slug]/pricing/scans
export async function GET(
  request: NextRequest,
  { params }: ScansParams
) {
  try {
    const { slug } = params;

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch recent scans
    const scans = await db.query.pricingScans.findMany({
      where: (scans, { eq }) => eq(scans.competitorId, company.id), // TODO: Fix relation
      limit: 50,
      orderBy: (scans, { desc }) => [desc(scans.createdAt)],
      with: {
        competitor: true,
      },
    });

    return NextResponse.json({ scans });
  } catch (error) {
    console.error("Error fetching scans:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Tâche 4: Intégration avec Scraper Existant

**Options d'intégration:**

#### Option A: Import Direct (Recommandé)
Copier les classes de scraping existantes dans `src/lib/pricing/scrapers/`:

```bash
# Copier scrapers existants
cp -r /Users/jonathangaudette/market-intelligence/Dissan/price-scraper/src/scrapers \
     src/lib/pricing/scrapers

# Copier matchers
cp -r /Users/jonathangaudette/market-intelligence/Dissan/price-scraper/src/matchers \
     src/lib/pricing/matchers
```

Puis modifier `scraping-service.ts` pour utiliser ces classes:

```typescript
import { SwishScraper } from "@/lib/pricing/scrapers/swish-scraper";
import { GraingerScraper } from "@/lib/pricing/scrapers/grainger-scraper";

private async executeScraping(competitor: any): Promise<{
  products: ScrapingResult[];
  errors: ScrapingError[];
}> {
  let scraper;

  // Select scraper based on domain
  if (competitor.domain.includes("swish")) {
    scraper = new SwishScraper();
  } else if (competitor.domain.includes("grainger")) {
    scraper = new GraingerScraper();
  } else {
    // Generic scraper using configured selectors
    scraper = new GenericScraper(competitor.scrapingSelectors);
  }

  const products = await scraper.scrape();
  return { products, errors: [] };
}
```

#### Option B: Child Process
Exécuter le scraper comme processus séparé:

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

private async executeScraping(competitor: any): Promise<{
  products: ScrapingResult[];
  errors: ScrapingError[];
}> {
  const scraperPath = "/Users/jonathangaudette/market-intelligence/Dissan/price-scraper";
  const command = `cd ${scraperPath} && npx tsx src/main.ts --site ${competitor.domain} --test`;

  const { stdout, stderr } = await execAsync(command);

  // Parse stdout JSON output
  const products = JSON.parse(stdout);

  return { products, errors: [] };
}
```

---

### Tâche 5: Ajouter Bouton "Lancer Scan" au Dashboard

**Modifier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx`

```typescript
// Add state for scan status
const [scanning, setScanning] = useState(false);

// Add handler
async function handleTriggerScan() {
  setScanning(true);
  try {
    const response = await fetch(`/api/companies/${slug}/pricing/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Scan all competitors
    });

    if (!response.ok) throw new Error("Scan failed");

    const data = await response.json();
    alert(`Scan lancé: ${data.message}`);

    // Refresh dashboard data
    // ... (call existing fetch functions)
  } catch (error) {
    console.error("Error triggering scan:", error);
    alert("Erreur lors du lancement du scan");
  } finally {
    setScanning(false);
  }
}

// Update button in PageHeader actions
<Button onClick={handleTriggerScan} disabled={scanning}>
  <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
  {scanning ? "Scan en cours..." : "Lancer scan"}
</Button>
```

---

## Checklist de Validation

**Avant de marquer Phase 6 complète:**

- [ ] `ScrapingService` créé dans `src/lib/pricing/scraping-service.ts`
- [ ] Route API scan créée: `POST /api/companies/[slug]/pricing/scans`
- [ ] Route API historique scans: `GET /api/companies/[slug]/pricing/scans`
- [ ] Intégration avec scraper existant (Option A ou B)
- [ ] Test scraping Swish: au moins 1 produit extrait
- [ ] Test scraping Grainger: au moins 1 produit extrait
- [ ] Gestion d'erreurs (timeout, sélecteur invalide, 403/404)
- [ ] Enregistrement dans table `pricing_scans`
- [ ] Bouton "Lancer scan" fonctionnel dans dashboard
- [ ] Statut scan affiché (in_progress, completed, failed)

---

## Commandes de Test

```bash
# 1. Test scraper existant (validation)
cd /Users/jonathangaudette/market-intelligence/Dissan/price-scraper
npx tsx src/main.ts --site swish --test

# 2. Test API scan manuel
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "cuid_competitor_swish"}' \
  http://localhost:3000/api/companies/dissan/pricing/scans

# 3. Vérifier scans en DB
psql $DATABASE_URL -c "SELECT id, status, products_scraped, error_count FROM pricing_scans ORDER BY created_at DESC LIMIT 5;"

# 4. Test avec concurrent invalide (doit gérer erreur)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"competitorId": "invalid_id"}' \
  http://localhost:3000/api/companies/dissan/pricing/scans
```

---

## Résultat Attendu

À la fin de Phase 6:

✅ **Scraping fonctionnel** pour au moins 2 concurrents (Swish, Grainger)
✅ **API déclenchement scan** manuel
✅ **Enregistrement scans** dans `pricing_scans`
✅ **Gestion d'erreurs** robuste (timeout, 404, anti-bot)
✅ **Bouton "Lancer scan"** dans dashboard
✅ **Logs détaillés** des scans (produits scrapés, erreurs)

---

## Dépannage

### Problème: "Timeout after 30s"

**Solution:**
```typescript
// Augmenter timeout dans scraper
const timeout = 60000; // 60 secondes

// Ou utiliser scraping API (Firecrawl, Apify)
```

### Problème: "403 Forbidden" (anti-bot)

**Solution:**
```typescript
// Ajouter User-Agent et headers
const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "Accept": "text/html,application/xhtml+xml",
};

// Ou utiliser proxy rotation
```

### Problème: Sélecteurs CSS ne fonctionnent plus

**Solution:**
```bash
# Re-découvrir sélecteurs
cd /Users/jonathangaudette/market-intelligence/Dissan/price-scraper
npx tsx src/discover-selectors.ts swish.com

# Mettre à jour dans config concurrent
```

---

## Handoff JSON pour Phase 7

```json
{
  "phase": 6,
  "name": "Scraping Engine",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "7h",
  "filesCreated": [
    "src/lib/pricing/scraping-service.ts",
    "src/app/api/companies/[slug]/pricing/scans/route.ts",
    "src/lib/pricing/scrapers/swish-scraper.ts",
    "src/lib/pricing/scrapers/grainger-scraper.ts"
  ],
  "filesModified": [
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx"
  ],
  "integrationMethod": "Option A - Direct Import",
  "competitorsScraped": ["Swish", "Grainger"],
  "testResults": {
    "swishScraping": "✅ Pass - 12 products scraped",
    "graingerScraping": "✅ Pass - 8 products scraped",
    "errorHandling": "✅ Pass - 403/timeout handled",
    "scanRecordCreated": "✅ Pass - pricing_scans populated"
  },
  "nextPhaseReady": true,
  "notes": "Scraping engine fonctionnel. Produits concurrents extraits avec succès. Prêt pour matching AI (Phase 7)."
}
```

---

**Prochaine étape:** Phase 7 - Matching AI (GPT-5)
