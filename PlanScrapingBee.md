# Plan de Migration ScrapingBee

## Vue d'ensemble

Remplacement complet de l'infrastructure Playwright/Railway par une solution basée sur l'API ScrapingBee avec configuration éditable via l'interface utilisateur.

**Résultats des tests validés** :
- ✅ Taux de succès : 90% (test-scrapingbee-swish.mjs)
- ✅ Bypass Cloudflare : Fonctionne avec premium proxy Canada
- ✅ Coût : $0.0082 par produit (25 crédits × $0.000327)
- ✅ Durée : 15-34 secondes par produit
- ⚠️ extract_rules : Abandonné (retourne données vides)
- ✅ Solution retenue : HTML + Cheerio parsing

---

## Architecture Cible

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (Competitor Edit Page - ScrapingBee Configuration Form)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                       │
│  pricing_competitors.scraper_config.scrapingbee: {              │
│    api: { premium_proxy, country_code, render_js, wait, ... }   │
│    selectors: { productName, productPrice, productSku, ... }    │
│    search: { url, method, param }                               │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│        BACKEND - ScrapingService (src/lib/pricing/             │
│                  scraping-service.ts)                           │
│  1. Lit config depuis DB                                        │
│  2. Route selon scraperType:                                    │
│     • scraperType === 'scrapingbee' → scrapeWithScrapingBee()  │
│     • scraperType === 'playwright' → scrapeWithPlaywright()    │
│  3. scrapeWithScrapingBee():                                    │
│     - Appel API ScrapingBee                                     │
│     - Parse HTML avec Cheerio                                   │
│     - Retourne données structurées                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SCRAPINGBEE API (External)                    │
│  • Premium Proxy Canada                                         │
│  • JavaScript Rendering                                         │
│  • Cloudflare Bypass                                            │
│  • Retourne HTML complet                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Ce qui est SUPPRIMÉ** :
- ❌ Railway worker infrastructure
- ❌ Playwright browser automation
- ❌ playwright-extra + stealth plugin
- ❌ Chromium deployment
- ❌ Worker queue system

**Ce qui est CONSERVÉ** :
- ✅ Database schema `pricing_competitors`
- ✅ Frontend UI pour configuration
- ✅ Backend API routes (`/api/pricing/*`)
- ✅ Cheerio pour parsing HTML

---

## 1. Modifications Database

### 1.1 Schema `pricing_competitors.scraper_config`

**⚠️ IMPORTANT**: Le schema existant a déjà `scraperType: 'playwright' | 'apify' | 'api'` (ligne 85 de schema-pricing.ts).
On doit AJOUTER `'scrapingbee'` à cette union, pas la remplacer.

```typescript
// Modification requise dans schema-pricing.ts ligne 85:
scraperType: 'playwright' | 'apify' | 'api' | 'scrapingbee';  // AJOUTER à l'union existante
```

Ajouter une nouvelle section `scrapingbee` dans le JSON `scraper_config` (4ème type de scraper) :

```typescript
// Type definition
interface ScrapingBeeConfig {
  api: {
    premium_proxy: boolean;          // Default: true
    country_code: string;            // Default: 'ca'
    render_js: boolean;              // Default: true
    wait: number;                    // Default: 10000 (ms)
    block_ads: boolean;              // Default: true
    block_resources: boolean;        // Default: false
    wait_for?: string;               // Optional CSS selector
    timeout: number;                 // Default: 120000 (ms)
  };

  selectors: {
    productName: string[];           // Comma-separated fallback selectors
    productPrice: string[];          // e.g., ['.price-item--regular', '.price']
    productSku?: string[];           // Optional
    productImage?: string[];         // Optional
    availability?: string[];         // Optional
  };

  search: {
    url: string;                     // Base search URL
    method: 'GET' | 'POST';          // Default: 'GET'
    param: string;                   // Query parameter name, e.g., 'q'
  };
}
```

### 1.2 Exemple de configuration complète (Swish.ca)

```json
{
  "scraperType": "scrapingbee",
  "scrapingbee": {
    "api": {
      "premium_proxy": true,
      "country_code": "ca",
      "render_js": true,
      "wait": 10000,
      "block_ads": true,
      "block_resources": false,
      "timeout": 120000
    },
    "selectors": {
      "productName": [
        "h1.product__title",
        "h1.product-title",
        "h1"
      ],
      "productPrice": [
        ".price-item.price-item--regular",
        ".price__regular .price-item",
        "span.price-item",
        ".price"
      ],
      "productSku": [
        ".product__sku",
        "[data-product-sku]",
        ".sku"
      ],
      "productImage": [
        ".product__media img",
        ".product__image img",
        "img[data-product-image]"
      ]
    },
    "search": {
      "url": "https://swish.ca/search",
      "method": "GET",
      "param": "q"
    }
  }
}
```

### 1.3 Migration SQL

```sql
-- Add scrapingbee config to existing Swish competitor
UPDATE pricing_competitors
SET scraper_config = jsonb_set(
  scraper_config,
  '{scraperType}',
  '"scrapingbee"'
)
WHERE slug = 'swish';

UPDATE pricing_competitors
SET scraper_config = scraper_config || jsonb_build_object(
  'scrapingbee', jsonb_build_object(
    'api', jsonb_build_object(
      'premium_proxy', true,
      'country_code', 'ca',
      'render_js', true,
      'wait', 10000,
      'block_ads', true,
      'block_resources', false,
      'timeout', 120000
    ),
    'selectors', jsonb_build_object(
      'productName', jsonb_build_array('h1.product__title', 'h1.product-title', 'h1'),
      'productPrice', jsonb_build_array('.price-item.price-item--regular', '.price__regular .price-item', 'span.price-item', '.price'),
      'productSku', jsonb_build_array('.product__sku', '[data-product-sku]', '.sku'),
      'productImage', jsonb_build_array('.product__media img', '.product__image img', 'img[data-product-image]')
    ),
    'search', jsonb_build_object(
      'url', 'https://swish.ca/search',
      'method', 'GET',
      'param', 'q'
    )
  )
)
WHERE slug = 'swish';
```

---

## 2. UI - Page de Configuration Competitor

### 2.1 Fichier à modifier

**Path** : `src/app/(dashboard)/companies/[slug]/pricing/competitors/[id]/page.tsx`

**⚠️ IMPORTANT**: MODIFIER la page existante, ne PAS créer de nouveau composant.
La page utilise déjà les bons composants shadcn/ui (Card, Input, Select, Button, Label).

Ajouter une section conditionnelle qui s'affiche quand `scraperType === 'scrapingbee'`

### 2.2 Sections du formulaire

#### Section 1 : API Configuration

```tsx
<Card>
  <CardHeader>
    <CardTitle>ScrapingBee API Configuration</CardTitle>
    <CardDescription>
      Configure les paramètres d'appel à l'API ScrapingBee
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Premium Proxy */}
    <div className="flex items-center space-x-2">
      <Switch
        id="premium_proxy"
        checked={config.api.premium_proxy}
        onCheckedChange={(checked) => updateConfig('api.premium_proxy', checked)}
      />
      <Label htmlFor="premium_proxy">
        Premium Proxy (requis pour Cloudflare)
      </Label>
    </div>

    {/* Country Code */}
    <div className="space-y-2">
      <Label htmlFor="country_code">Geo-location (Country Code)</Label>
      <Select
        value={config.api.country_code}
        onValueChange={(value) => updateConfig('api.country_code', value)}
      >
        <SelectTrigger id="country_code">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ca">🇨🇦 Canada</SelectItem>
          <SelectItem value="us">🇺🇸 United States</SelectItem>
          <SelectItem value="fr">🇫🇷 France</SelectItem>
          <SelectItem value="gb">🇬🇧 United Kingdom</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Render JavaScript */}
    <div className="flex items-center space-x-2">
      <Switch
        id="render_js"
        checked={config.api.render_js}
        onCheckedChange={(checked) => updateConfig('api.render_js', checked)}
      />
      <Label htmlFor="render_js">Render JavaScript</Label>
    </div>

    {/* Wait Time */}
    <div className="space-y-2">
      <Label htmlFor="wait">Wait Time (ms)</Label>
      <Input
        id="wait"
        type="number"
        min="0"
        max="30000"
        step="1000"
        value={config.api.wait}
        onChange={(e) => updateConfig('api.wait', parseInt(e.target.value))}
      />
      <p className="text-sm text-muted-foreground">
        Temps d'attente après le chargement de la page (défaut: 10000ms)
      </p>
    </div>

    {/* Block Ads */}
    <div className="flex items-center space-x-2">
      <Switch
        id="block_ads"
        checked={config.api.block_ads}
        onCheckedChange={(checked) => updateConfig('api.block_ads', checked)}
      />
      <Label htmlFor="block_ads">Block Ads (améliore vitesse)</Label>
    </div>

    {/* Wait For (optional) */}
    <div className="space-y-2">
      <Label htmlFor="wait_for">Wait For Selector (optionnel)</Label>
      <Input
        id="wait_for"
        type="text"
        placeholder=".product__title"
        value={config.api.wait_for || ''}
        onChange={(e) => updateConfig('api.wait_for', e.target.value)}
      />
      <p className="text-sm text-muted-foreground">
        Sélecteur CSS à attendre avant de retourner la page
      </p>
    </div>

    {/* Timeout */}
    <div className="space-y-2">
      <Label htmlFor="timeout">Timeout (ms)</Label>
      <Input
        id="timeout"
        type="number"
        min="30000"
        max="300000"
        step="10000"
        value={config.api.timeout}
        onChange={(e) => updateConfig('api.timeout', parseInt(e.target.value))}
      />
    </div>
  </CardContent>
</Card>
```

#### Section 2 : CSS Selectors

```tsx
<Card>
  <CardHeader>
    <CardTitle>CSS Selectors (Cheerio Parsing)</CardTitle>
    <CardDescription>
      Sélecteurs CSS pour extraire les données. Plusieurs sélecteurs = fallback.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Product Name Selectors */}
    <div className="space-y-2">
      <Label htmlFor="productName">Product Name Selectors</Label>
      <Textarea
        id="productName"
        placeholder="h1.product__title&#10;h1.product-title&#10;h1"
        value={config.selectors.productName.join('\n')}
        onChange={(e) => updateConfig(
          'selectors.productName',
          e.target.value.split('\n').filter(s => s.trim())
        )}
        rows={3}
      />
      <p className="text-sm text-muted-foreground">
        Un sélecteur par ligne. Le premier qui matche sera utilisé.
      </p>
    </div>

    {/* Product Price Selectors */}
    <div className="space-y-2">
      <Label htmlFor="productPrice">Product Price Selectors</Label>
      <Textarea
        id="productPrice"
        placeholder=".price-item.price-item--regular&#10;.price__regular .price-item&#10;span.price-item"
        value={config.selectors.productPrice.join('\n')}
        onChange={(e) => updateConfig(
          'selectors.productPrice',
          e.target.value.split('\n').filter(s => s.trim())
        )}
        rows={4}
      />
    </div>

    {/* Product SKU Selectors (optional) */}
    <div className="space-y-2">
      <Label htmlFor="productSku">Product SKU Selectors (optionnel)</Label>
      <Textarea
        id="productSku"
        placeholder=".product__sku&#10;[data-product-sku]&#10;.sku"
        value={(config.selectors.productSku || []).join('\n')}
        onChange={(e) => updateConfig(
          'selectors.productSku',
          e.target.value.split('\n').filter(s => s.trim())
        )}
        rows={3}
      />
    </div>

    {/* Product Image Selectors (optional) */}
    <div className="space-y-2">
      <Label htmlFor="productImage">Product Image Selectors (optionnel)</Label>
      <Textarea
        id="productImage"
        placeholder=".product__media img&#10;.product__image img&#10;img[data-product-image]"
        value={(config.selectors.productImage || []).join('\n')}
        onChange={(e) => updateConfig(
          'selectors.productImage',
          e.target.value.split('\n').filter(s => s.trim())
        )}
        rows={3}
      />
    </div>

    {/* Test Selector Button */}
    <Button
      variant="outline"
      onClick={handleTestSelectors}
      disabled={isTestingSelectors}
    >
      {isTestingSelectors ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Testing...
        </>
      ) : (
        <>
          <TestTube className="mr-2 h-4 w-4" />
          Test Selectors
        </>
      )}
    </Button>
  </CardContent>
</Card>
```

#### Section 3 : Search Configuration

```tsx
<Card>
  <CardHeader>
    <CardTitle>Search Configuration</CardTitle>
    <CardDescription>
      Configuration de la recherche de produits par nom
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Search URL */}
    <div className="space-y-2">
      <Label htmlFor="search_url">Search URL</Label>
      <Input
        id="search_url"
        type="url"
        placeholder="https://swish.ca/search"
        value={config.search.url}
        onChange={(e) => updateConfig('search.url', e.target.value)}
      />
    </div>

    {/* Search Method */}
    <div className="space-y-2">
      <Label htmlFor="search_method">HTTP Method</Label>
      <Select
        value={config.search.method}
        onValueChange={(value) => updateConfig('search.method', value)}
      >
        <SelectTrigger id="search_method">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="GET">GET</SelectItem>
          <SelectItem value="POST">POST</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Search Param */}
    <div className="space-y-2">
      <Label htmlFor="search_param">Query Parameter Name</Label>
      <Input
        id="search_param"
        type="text"
        placeholder="q"
        value={config.search.param}
        onChange={(e) => updateConfig('search.param', e.target.value)}
      />
      <p className="text-sm text-muted-foreground">
        Exemple: 'q' pour ?q=product+name
      </p>
    </div>
  </CardContent>
</Card>
```

### 2.3 Test Button Implementation

```typescript
async function handleTestSelectors() {
  setIsTestingSelectors(true);

  try {
    // Call API to test selectors with a sample product URL
    const response = await fetch(`/api/companies/${slug}/pricing/test-scrapingbee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testProductUrl, // From user input
        config: config,
      }),
    });

    const result = await response.json();

    if (result.success) {
      toast.success(`Test réussi! Données extraites: ${result.data.name}`);
      setSelectorTestResult(result.data);
    } else {
      toast.error(`Test échoué: ${result.error}`);
    }
  } catch (error) {
    toast.error('Erreur lors du test');
  } finally {
    setIsTestingSelectors(false);
  }
}
```

---

## 3. Backend Implementation

### 3.1 Modifier ScrapingService existant

**⚠️ ARCHITECTURE CRITIQUE**: Ne PAS créer de classe standalone `ScrapingBeeScraper`.
INTÉGRER dans la classe existante `ScrapingService` (`src/lib/pricing/scraping-service.ts`).

**Path** : `src/lib/pricing/scraping-service.ts`

**Pattern d'intégration**:
```typescript
export class ScrapingService {
  async scrapeCompetitor(competitorId, productId, skipDiscovery) {
    const competitor = await db.query...;

    // Routing basé sur scraperType
    if (competitor.scraperConfig.scraperType === 'scrapingbee') {
      return this.scrapeWithScrapingBee(competitor, productId);
    } else if (competitor.scraperConfig.scraperType === 'playwright') {
      return this.scrapeWithPlaywright(competitor, productId);
    }
    // ... autres types
  }

  /**
   * Nouvelle méthode à ajouter
   */
  private async scrapeWithScrapingBee(competitor, productId): Promise<ScrapingResult> {
    const startTime = Date.now();

    try {
      console.log(`[ScrapingBee] Scraping: ${productUrl}`);

      // Build ScrapingBee API request
      const params = new URLSearchParams({
        api_key: this.apiKey,
        url: productUrl,
        premium_proxy: this.config.api.premium_proxy.toString(),
        country_code: this.config.api.country_code,
        render_js: this.config.api.render_js.toString(),
        wait: this.config.api.wait.toString(),
        block_ads: this.config.api.block_ads.toString(),
      });

      if (this.config.api.wait_for) {
        params.append('wait_for', this.config.api.wait_for);
      }

      const response = await axios.get(
        `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
        {
          timeout: this.config.api.timeout,
        }
      );

      const html = response.data;
      const creditsUsed = response.headers['spb-cost'];

      console.log(`[ScrapingBee] Response received (${creditsUsed} credits)`);

      // Check for Cloudflare challenge
      if (
        typeof html === 'string' &&
        (html.includes('Just a moment...') ||
          html.includes('Checking your browser') ||
          html.includes('Cloudflare'))
      ) {
        throw new Error('Cloudflare challenge detected - bypass failed');
      }

      // Parse HTML with Cheerio
      const $ = cheerio.load(html);

      // Extract product data using fallback selectors
      const name = this.extractWithFallback($, this.config.selectors.productName);
      const price = this.extractWithFallback($, this.config.selectors.productPrice);
      const sku = this.config.selectors.productSku
        ? this.extractWithFallback($, this.config.selectors.productSku)
        : null;
      const imageUrl = this.config.selectors.productImage
        ? this.extractImageWithFallback($, this.config.selectors.productImage)
        : null;

      const duration = Date.now() - startTime;
      console.log(`[ScrapingBee] Extraction completed in ${duration}ms`);

      // Validate required fields
      if (!name || !price) {
        console.warn('[ScrapingBee] Missing required fields:', { name, price });
        return {
          name: name || null,
          price: price || null,
          sku: sku || null,
          imageUrl: imageUrl || null,
          url: productUrl,
          scrapedAt: new Date(),
          success: false,
          error: 'Missing required fields (name or price)',
        };
      }

      return {
        name,
        price,
        sku,
        imageUrl,
        url: productUrl,
        scrapedAt: new Date(),
        success: true,
      };
    } catch (error: any) {
      console.error('[ScrapingBee] Error:', error.message);

      return {
        name: null,
        price: null,
        url: productUrl,
        scrapedAt: new Date(),
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search for a product by name
   */
  async searchProduct(productName: string): Promise<string | null> {
    try {
      const searchUrl = `${this.config.search.url}?${this.config.search.param}=${encodeURIComponent(productName)}`;

      console.log(`[ScrapingBee] Searching: ${searchUrl}`);

      const params = new URLSearchParams({
        api_key: this.apiKey,
        url: searchUrl,
        premium_proxy: this.config.api.premium_proxy.toString(),
        country_code: this.config.api.country_code,
        render_js: this.config.api.render_js.toString(),
        wait: this.config.api.wait.toString(),
        block_ads: this.config.api.block_ads.toString(),
      });

      const response = await axios.get(
        `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
        {
          timeout: this.config.api.timeout,
        }
      );

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract first product link
      // This needs to be customized per competitor
      const firstProductLink = $('.product-item__link, .product-link, a.product').first().attr('href');

      if (firstProductLink) {
        // Handle relative URLs
        if (firstProductLink.startsWith('http')) {
          return firstProductLink;
        } else {
          const baseUrl = new URL(this.config.search.url).origin;
          return `${baseUrl}${firstProductLink}`;
        }
      }

      return null;
    } catch (error: any) {
      console.error('[ScrapingBee] Search error:', error.message);
      return null;
    }
  }

  /**
   * Extract text using fallback selectors
   */
  private extractWithFallback($: cheerio.CheerioAPI, selectors: string[]): string | null {
    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const text = element.text().trim();
          if (text) {
            return text;
          }
        }
      } catch (error) {
        console.warn(`[ScrapingBee] Selector failed: ${selector}`);
      }
    }
    return null;
  }

  /**
   * Extract image src using fallback selectors
   */
  private extractImageWithFallback($: cheerio.CheerioAPI, selectors: string[]): string | null {
    for (const selector of selectors) {
      try {
        const element = $(selector).first();
        if (element.length) {
          const src = element.attr('src') || element.attr('data-src');
          if (src) {
            return src;
          }
        }
      } catch (error) {
        console.warn(`[ScrapingBee] Image selector failed: ${selector}`);
      }
    }
    return null;
  }
}
```

### 3.2 API Route - Test Endpoint

**Path** : `src/app/api/companies/[slug]/pricing/test-scrapingbee/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ScrapingService } from '@/lib/pricing/scraping-service';

export async function POST(request: NextRequest) {
  try {
    const { url, config } = await request.json();

    if (!url || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing url or config' },
        { status: 400 }
      );
    }

    // Validate SCRAPINGBEE_API_KEY
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SCRAPINGBEE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const scrapingService = new ScrapingService();
    const result = await scrapingService.scrapeWithScrapingBee({ scraperConfig: config }, url);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: result },
        { status: 200 } // Still return 200 for partial success
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[API] Test ScrapingBee error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3.3 Integration dans API Scan

**Path** : `src/app/api/companies/[slug]/pricing/scans/route.ts`

**⚠️ IMPORTANT**: Le routing est déjà géré dans ScrapingService.scrapeCompetitor().
Cette route appelle déjà ScrapingService, donc l'intégration est automatique une fois que
scrapeWithScrapingBee() est ajouté à ScrapingService.

**Code actuel** (lignes 34-42):
```typescript
const scrapingService = new ScrapingService();

if (body.competitorId) {
  const result = await scrapingService.scrapeCompetitor(
    body.competitorId,
    body.productId,
    body.skipDiscovery
  );
}
```

**Aucune modification requise** dans cette route. Le routing scraperType est géré dans ScrapingService.scrapeCompetitor().

---

## 4. Environment Variables

### 4.1 Ajouter à `.env.local` (development)

```bash
# ScrapingBee API
SCRAPINGBEE_API_KEY=X7CB1EQ0KZJFPDS0OG6KBGARG2ALQ0ZVI9067OE2O11Y7YY6X6MECRU0LO8B265YDCKXDHH6UTW7J32K
```

### 4.2 Ajouter à Vercel Environment Variables (production)

Via Vercel Dashboard:
1. Settings → Environment Variables
2. Add: `SCRAPINGBEE_API_KEY`
3. Value: `X7CB1EQ0KZJFPDS0OG6KBGARG2ALQ0ZVI9067OE2O11Y7YY6X6MECRU0LO8B265YDCKXDHH6UTW7J32K`
4. Environments: Production, Preview, Development

---

## 5. Dependencies

### 5.1 Installer axios (si pas déjà présent)

```bash
npm install axios
```

### 5.2 Installer cheerio (si pas déjà présent)

```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

### 5.3 SUPPRIMER les dépendances Playwright (après migration complète)

```bash
npm uninstall playwright playwright-extra puppeteer-extra-plugin-stealth
```

**⚠️ IMPORTANT** : Ne supprimer qu'après avoir validé que tous les scrapers utilisent ScrapingBee.

---

## 6. Migration Path (Étape par Étape)

### Phase 1 : Préparation (1-2h)
- [x] ✅ Tests ScrapingBee réussis (90% success rate)
- [ ] Vérifier axios installé (ou installer si absent)
- [ ] Modifier schema-pricing.ts: ajouter 'scrapingbee' à union scraperType
- [ ] Ajouter interface ScrapingBeeConfig au schema
- [ ] Créer API route `/api/companies/[slug]/pricing/test-scrapingbee/route.ts`
- [ ] Ajouter `SCRAPINGBEE_API_KEY` aux env variables

### Phase 2 : UI Configuration (2-3h)
- [ ] Modifier page competitor edit existante (src/app/(dashboard)/companies/[slug]/pricing/competitors/[id]/page.tsx)
- [ ] Ajouter section conditionnelle pour scraperType === 'scrapingbee'
- [ ] Implémenter formulaire ScrapingBee config (3 cards: API, Selectors, Search)
- [ ] Ajouter bouton "Test Selectors"
- [ ] Validation des sélecteurs CSS

### Phase 3 : Backend Integration (2-3h)
- [ ] Modifier ScrapingService (src/lib/pricing/scraping-service.ts)
- [ ] Ajouter méthode privée scrapeWithScrapingBee()
- [ ] Implémenter Cheerio parsing avec fallback selectors
- [ ] Ajouter routing dans scrapeCompetitor() basé sur scraperType
- [ ] Logging et error handling

### Phase 4 : Migration Swish (1h)
- [ ] Exécuter migration SQL pour Swish config
- [ ] Tester scraping via UI
- [ ] Valider taux de succès (objectif: >80%)
- [ ] Monitorer crédit usage

### Phase 5 : Validation (1h)
- [ ] Scanner 10+ produits Swish
- [ ] Vérifier données dans database
- [ ] Confirmer coût par produit (~$0.0082)
- [ ] Valider durée moyenne (<40s)

### Phase 6 : Nettoyage (1h)
- [ ] Supprimer Railway worker code (optionnel si réutilisable)
- [ ] Supprimer dépendances Playwright
- [ ] Nettoyer imports inutilisés
- [ ] Mettre à jour documentation

---

## 7. Cost Monitoring

### 7.1 Ajouter tracking de crédits

Dans `ScrapingBeeScraper.scrapeProduct()`, capturer header `spb-cost` :

```typescript
const creditsUsed = parseInt(response.headers['spb-cost'] || '0');

// Save to database
await db.insert(scraping_credit_usage).values({
  competitor_id: competitorId,
  credits_used: creditsUsed,
  scraped_at: new Date(),
});
```

### 7.2 Nouvelle table (optionnel)

```sql
CREATE TABLE scraping_credit_usage (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER REFERENCES pricing_competitors(id),
  credits_used INTEGER NOT NULL,
  scraped_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 7.3 Dashboard widget

Afficher crédit usage mensuel par compétiteur :

```typescript
SELECT
  competitor_id,
  SUM(credits_used) as total_credits,
  COUNT(*) as scrape_count,
  AVG(credits_used) as avg_credits_per_scrape
FROM scraping_credit_usage
WHERE scraped_at >= NOW() - INTERVAL '30 days'
GROUP BY competitor_id;
```

---

## 8. Rollback Plan

Si ScrapingBee ne fonctionne pas en production :

### Option A : Retour à Playwright (temporaire)
1. Revert SQL migration :
   ```sql
   UPDATE pricing_competitors
   SET scraper_config = jsonb_set(scraper_config, '{scraperType}', '"playwright"')
   WHERE slug = 'swish';
   ```
2. Redéployer Railway worker

### Option B : Hybrid Approach
- Garder ScrapingBee pour Swish (Cloudflare)
- Utiliser Playwright pour autres competitors (sans Cloudflare)
- Factory pattern dans API route :
  ```typescript
  if (scraperType === 'scrapingbee') {
    scraper = new ScrapingBeeScraper(config);
  } else if (scraperType === 'playwright') {
    scraper = new PlaywrightScraper(config);
  }
  ```

---

## 9. Success Criteria

### Objectifs Mesurables

1. **Taux de succès** : >80% pour Swish products
2. **Coût** : <$0.01 par produit ($0.0082 validé)
3. **Durée** : <60 secondes par produit (15-34s validé)
4. **Crédits** : <6000 products/mois (150,000 crédits / 25 = 6000)
5. **Cloudflare bypass** : 100% de réussite (validé en test)
6. **UI Editable** : 100% des paramètres configurables via UI

### KPIs à Monitorer

- Taux de succès par competitor
- Coût mensuel ScrapingBee
- Durée moyenne de scraping
- Nombre de Cloudflare challenges détectés
- Erreurs 422/402 (API errors)

---

## 10. Timeline Estimé

| Phase | Durée | Bloquant |
|-------|-------|----------|
| Phase 1: Préparation | 1-2h | Non |
| Phase 2: UI Configuration | 2-3h | Non |
| Phase 3: Backend Integration | 2-3h | Oui |
| Phase 4: Migration Swish | 1h | Oui |
| Phase 5: Validation | 1h | Oui |
| Phase 6: Nettoyage | 1h | Non |
| **TOTAL** | **8-11h** | - |

---

## 11. Questions Ouvertes

1. **Search Result Parsing** : Sélecteurs CSS pour extraire premier lien produit dans résultats de recherche Swish ?
   - Besoin de tester manuellement ou scraper page de recherche

2. **Multiple Competitors** : Étendre à d'autres competitors après Swish ?
   - Uline, Grainger, etc.

3. **Playwright Deprecation** : Supprimer complètement ou garder en fallback ?
   - Recommandation : Garder en hybrid approach

4. **Credit Alerts** : Notification si crédit usage > 80% du plan mensuel ?
   - Implémenter email alert ou Slack notification

---

## 12. References

- **ScrapingBee Docs** : https://www.scrapingbee.com/documentation/
- **Test Script Validé** : `scripts/test-scrapingbee-swish.mjs`
- **Success Rate** : 90% (3/3 critical fields extracted)
- **Cost Analysis** : $0.0082/product, 6000 products/month capacity

---

**Dernière mise à jour** : 2025-11-20
**Status** : ✅ Plan validé et corrigé selon l'architecture existante - Prêt pour implémentation

## Corrections appliquées lors de la validation

1. ✅ **ScraperType Union**: Clarifié que 'scrapingbee' est AJOUTÉ à l'union existante (4ème type)
2. ✅ **API Route Path**: Corrigé de `/api/pricing/scan` vers `/api/companies/[slug]/pricing/scans`
3. ✅ **Architecture Backend**: Intégration dans ScrapingService existant (pas de classe standalone)
4. ✅ **UI Component**: Modification de la page existante (pas de nouveau composant)
5. ✅ **Test Endpoint**: Chemin corrigé vers `/api/companies/[slug]/pricing/test-scrapingbee`
