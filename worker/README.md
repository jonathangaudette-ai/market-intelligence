# Pricing Intelligence Railway Worker

Multi-tenant Playwright-based scraping worker for pricing intelligence platform.

## Architecture

This worker runs on Railway and handles heavy Playwright scraping that cannot run on Vercel due to:
- Binary size limits (Chromium = 200MB)
- Timeout constraints (scraping can take 30+ minutes)
- Read-only filesystem restrictions

## Features

- ✅ **Multi-tenant scrapers** - Different implementations per company (Dissan, Akonovia, etc.)
- ✅ **Automatic pagination** - Batches of 100 products to avoid timeouts
- ✅ **Rate limiting** - 100 requests per 15 minutes per API key
- ✅ **Structured logging** - Pino for JSON logs
- ✅ **Error tracking** - Sentry integration
- ✅ **Retry logic** - Automatic retries with exponential backoff
- ✅ **Health checks** - `/health` endpoint for Railway monitoring

## Project Structure

```
worker/
├── src/
│   ├── index.ts              # Express server with middleware
│   ├── types/
│   │   └── index.ts          # Zod schemas & TypeScript types
│   ├── scrapers/
│   │   ├── base-scraper.ts   # Abstract base class
│   │   ├── factory.ts        # Multi-tenant scraper selection
│   │   ├── mock-scraper.ts   # MVP mock implementation
│   │   └── dissan-scraper.ts # TODO: Playwright scraper for Dissan
│   ├── utils/
│   └── middleware/
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
# Server
PORT=3001
NODE_ENV=development

# Security
API_KEY=your-secret-api-key-here

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn-here
LOG_LEVEL=info

# Playwright
PLAYWRIGHT_HEADLESS=true
```

### 3. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`.

## API Endpoints

### POST /api/scrape

Scrape a competitor website for pricing data.

**Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key
```

**Request Body:**
```json
{
  "companyId": "comp_123",
  "companySlug": "dissan",
  "competitorId": "comp_456",
  "competitorName": "Swish",
  "competitorUrl": "https://swish.ca",
  "products": [
    {
      "id": "prod_1",
      "sku": "ABC-123",
      "name": "Product Name",
      "brand": "Brand X",
      "category": "Category Y"
    }
  ],
  "batchInfo": {
    "batchNumber": 0,
    "totalBatches": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "scrapedProducts": [
    {
      "url": "https://competitor.com/product/abc-123",
      "name": "Product Name",
      "sku": "ABC-123",
      "price": 49.99,
      "currency": "CAD",
      "inStock": true,
      "imageUrl": "https://...",
      "characteristics": {}
    }
  ],
  "productsScraped": 87,
  "productsFailed": 13,
  "errors": [],
  "metadata": {
    "duration": 180000,
    "scraperType": "playwright"
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 12345.67,
  "environment": "production"
}
```

### GET /metrics

Prometheus-compatible metrics endpoint (placeholder).

## Deployment to Railway

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init
```

### 2. Set Environment Variables

In Railway dashboard, add:

```
API_KEY=<generate-strong-key>
SENTRY_DSN=<your-sentry-dsn>
NODE_ENV=production
PLAYWRIGHT_HEADLESS=true
```

### 3. Deploy

```bash
# Push to Railway
railway up

# Or connect to GitHub for auto-deploy
railway link
```

### 4. Configure Health Checks

Railway will automatically monitor `/health` endpoint.

## Next.js Integration

In your Next.js app (`.env.local`):

```bash
RAILWAY_WORKER_URL=https://your-worker.railway.app
RAILWAY_WORKER_API_KEY=your-secret-api-key
```

The `WorkerClient` in Next.js will automatically call this worker.

## Multi-Tenant Scrapers

The `ScraperFactory` selects scrapers based on `company_slug`:

```typescript
// worker/src/scrapers/factory.ts
case 'dissan':
  return new DissanScraper(); // Playwright scraper for Dissan

case 'akonovia':
  return new AkonoviaScraper(); // Different scraper for Akonovia
```

To add a new company:

1. Create `src/scrapers/{company}-scraper.ts` extending `BaseScraper`
2. Implement `scrapeCompetitor()` method
3. Add case to `ScraperFactory.getScraperForCompany()`

## Performance

### Batch Processing

- Products are automatically batched into groups of 100
- Each batch = 1 API call to worker
- Example: 576 products = 6 batches = 6 sequential API calls

### Timeouts

- WorkerClient timeout: 30 minutes per competitor
- Suitable for 576 products × 3s/product = ~30 minutes

### Estimated Duration

- 100 products × 1 competitor: ~5 minutes
- 576 products × 1 competitor: ~30 minutes
- 576 products × 13 competitors: ~6.5 hours (sequential)

## Security

- ✅ Rate limiting: 100 req/15min per API key
- ✅ API key validation on all scraping endpoints
- ✅ Sentry filters sensitive headers (API keys)
- TODO: IP whitelist (Vercel IPs only)
- TODO: JWT tokens (Phase 2)

## Monitoring

- **Logs**: Structured JSON via Pino
- **Errors**: Sentry with transaction tracing
- **Metrics**: Placeholder `/metrics` endpoint

## Troubleshooting

### "Unauthorized" error

Check `X-API-Key` header matches `API_KEY` env var.

### Timeout errors

Increase `timeout` in `WorkerClient` (Next.js side) or reduce batch size.

### Playwright errors

```bash
# Reinstall browsers
npx playwright install chromium --force
```

## Development Roadmap

- [x] Phase 0: Database migration (company_slug)
- [x] Phase 1: MVP worker with MockScraper
- [ ] Phase 2: Implement DissanScraper (Playwright)
- [ ] Phase 3: Port 13 competitor scrapers from /Dissan/price-scraper
- [ ] Phase 4: Add circuit breaker pattern
- [ ] Phase 5: Implement checkpointing for crash recovery
- [ ] Phase 6: Add Prometheus metrics
- [ ] Phase 7: JWT authentication

## License

Proprietary - Market Intelligence Platform
