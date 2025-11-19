# Quick Start Guide: Railway Worker for Pricing Intelligence

**Status**: ✅ Phase 0 & 1 Complete - Ready for Testing

---

## 🚀 Quick Test (5 minutes)

### 1. Start Railway Worker (Terminal 1)

```bash
cd worker
npm install
npm run dev
```

Expected output:
```
{"level":30,"port":3001,"environment":"development","nodeVersion":"v20.x.x","msg":"Railway worker server started"}
```

### 2. Test Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 1.234,
  "environment": "development"
}
```

### 3. Test Mock Scraping

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "companyId": "test",
    "companySlug": "dissan",
    "competitorId": "comp1",
    "competitorName": "TestCompetitor",
    "competitorUrl": "https://example.com",
    "products": [
      { "id": "1", "sku": "ABC-123", "name": "Test Product", "brand": "TestBrand", "category": "TestCat" },
      { "id": "2", "sku": "XYZ-789", "name": "Another Product", "brand": "TestBrand", "category": "TestCat" }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "scrapedProducts": [
    {
      "url": "https://example.com/product/ABC-123",
      "name": "Test Product (Competitor Version)",
      "sku": "ABC-123",
      "price": 52.34,
      "currency": "CAD",
      "inStock": true,
      "imageUrl": "https://example.com/images/ABC-123.jpg",
      "characteristics": {
        "brand": "TestBrand",
        "category": "TestCat"
      }
    }
  ],
  "productsScraped": 1,
  "productsFailed": 1,
  "errors": [...],
  "metadata": {
    "duration": 2000,
    "scraperType": "playwright"
  }
}
```

✅ **Success!** The worker is responding correctly with mock data.

---

## 🧪 Full Integration Test (10 minutes)

### 1. Set Up Environment Variables

```bash
# In your terminal or .env.local
export RAILWAY_WORKER_URL="http://localhost:3001"
export RAILWAY_WORKER_API_KEY="test-key"
```

### 2. Start Next.js (Terminal 2)

```bash
npm run dev
```

### 3. Navigate to Pricing Dashboard

Open browser: `http://localhost:3000/companies/dissan/pricing`

### 4. Trigger a Scan

1. Make sure you have products imported (at least 1 product)
2. Make sure you have at least 1 active competitor configured
3. Click "Lancer scan" button

### 5. Watch the Logs

**Terminal 1 (Worker)**:
```
{"level":30,"msg":"Incoming request","method":"POST","path":"/api/scrape"}
{"level":30,"msg":"Scrape request validated","companySlug":"dissan",...}
{"level":30,"msg":"Scraper selected","scraperType":"MockScraper"}
{"scraper":"MockScraper","message":"Starting mock scraping",...}
{"level":30,"msg":"Scraping completed successfully","duration":2000,...}
```

**Terminal 2 (Next.js)**:
```
[WorkerClient] Calling Railway worker for TestCompetitor
[WorkerClient] Products to scrape: 10
[WorkerClient] Success! Scraped 3 products
[ScrapingService] ✅ Success: TestCompetitor (3 products)
```

### 6. Check Database

```bash
node scripts/verify-pricing-schema.mjs
```

Expected: ✅ All checks pass

---

## 📦 Deploy to Railway (30 minutes)

### Prerequisites

- Railway account: https://railway.app
- Railway CLI: `npm install -g @railway/cli`

### Step 1: Login to Railway

```bash
railway login
```

### Step 2: Create New Project

```bash
cd worker
railway init
# Select "Create a new project"
# Enter project name: "pricing-worker"
```

### Step 3: Set Environment Variables

In Railway dashboard or via CLI:

```bash
railway variables set API_KEY=$(openssl rand -base64 32)
railway variables set NODE_ENV=production
railway variables set PLAYWRIGHT_HEADLESS=true
railway variables set LOG_LEVEL=info
# Optional: Sentry
railway variables set SENTRY_DSN=your-sentry-dsn
```

### Step 4: Deploy

```bash
railway up
```

Wait for deployment to complete (~5 minutes for first deployment with Playwright).

### Step 5: Get Worker URL

```bash
railway open
# Copy the URL (e.g., https://pricing-worker-production.up.railway.app)
```

### Step 6: Update Next.js Production Env

In Vercel dashboard, add environment variables:

```
RAILWAY_WORKER_URL=https://pricing-worker-production.up.railway.app
RAILWAY_WORKER_API_KEY=<paste-from-railway-variables>
```

### Step 7: Test Production

```bash
curl https://pricing-worker-production.up.railway.app/health
```

Expected: `{"status":"healthy",...}`

---

## 🔍 Troubleshooting

### Worker: "Unauthorized" error

**Problem**: API key mismatch

**Solution**:
```bash
# Check Railway worker API_KEY
railway variables get API_KEY

# Check Next.js env var
echo $RAILWAY_WORKER_API_KEY

# They must match exactly
```

### Worker: Health check failing

**Problem**: Worker not started or crashed

**Solution**:
```bash
# Check Railway logs
railway logs

# Common issues:
# - Missing Playwright installation
# - Port conflict (change PORT env var)
# - Out of memory (upgrade Railway plan)
```

### Next.js: Timeout calling worker

**Problem**: Worker taking too long (>30 minutes)

**Solutions**:
1. Reduce batch size in `worker-client.ts`: `BATCH_SIZE = 50`
2. Increase timeout: `this.timeout = 3600000` (60 min)
3. Check worker logs for errors

### MockScraper returning 0 products

**Problem**: products array is empty

**Solution**:
```bash
# Verify you have active products
node scripts/verify-pricing-schema.mjs

# Check ScrapingService logs
# Should show: "[ScrapingService] Sending X products to Railway worker"
```

---

## 📊 Monitoring

### Railway Dashboard

1. Go to Railway project: https://railway.app/project/your-project
2. Click "Deployments" tab
3. View:
   - CPU usage
   - Memory usage
   - Request logs
   - Build logs

### Logs in Development

**Worker logs** (Terminal 1):
```bash
cd worker
npm run dev
# Logs appear in real-time
```

**Next.js logs** (Terminal 2):
```bash
npm run dev
# Look for [WorkerClient] and [ScrapingService] prefixes
```

### Sentry (Optional)

1. Create Sentry project: https://sentry.io
2. Get DSN
3. Add to Railway:
   ```bash
   railway variables set SENTRY_DSN=https://...@sentry.io/123456
   ```
4. View errors in Sentry dashboard

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Health check returns 200: `curl $RAILWAY_WORKER_URL/health`
- [ ] API key validation works (401 without key)
- [ ] Rate limiting activates after 100 requests
- [ ] Sentry receives test error
- [ ] Mock scraping returns 30% success rate
- [ ] Pagination works for >100 products
- [ ] Next.js can call worker successfully
- [ ] Database schema has company_slug
- [ ] Logs appear in Railway dashboard

---

## 🎯 Next Steps

Once verified:

1. **Phase 2**: Implement DissanScraper (Playwright)
   - Port scrapers from `/Dissan/price-scraper`
   - Replace MockScraper with real scraping
   - Test against live competitor sites

2. **Phase 3**: Production Hardening
   - Add circuit breaker pattern
   - Implement checkpointing
   - Add Prometheus metrics
   - JWT authentication
   - IP whitelist

3. **Scale Testing**
   - Test with 576 products
   - Test with 13 competitors
   - Monitor Railway memory usage
   - Optimize batch sizes

---

## 📚 Documentation

- **Architecture**: [NewphaseRailway-v2.md](./NewphaseRailway-v2.md)
- **Implementation Summary**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Worker README**: [../../worker/README.md](../../worker/README.md)

---

## 💡 Tips

1. **Development**: Use MockScraper (fast, no external dependencies)
2. **Testing**: Start with 1 competitor, 10 products
3. **Production**: Monitor Railway memory (Playwright uses ~500MB)
4. **Debugging**: Check both Next.js AND worker logs
5. **Performance**: Pagination happens automatically (don't worry about it)

---

**Questions?** Check the full documentation or open an issue.

**Ready?** Start with the 5-minute Quick Test above! 🚀
