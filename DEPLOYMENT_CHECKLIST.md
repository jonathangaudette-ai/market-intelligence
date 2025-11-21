# Deployment Checklist

## Environment Variables in Vercel

### ⚠️ CRITICAL: Avoid Newline Characters

When adding environment variables to Vercel via CLI, **always use `echo -n`** to prevent trailing newlines:

```bash
# ❌ WRONG - Adds invisible newline character
echo "API_KEY_VALUE" | vercel env add API_KEY production

# ✅ CORRECT - No newline
echo -n "API_KEY_VALUE" | vercel env add API_KEY production
```

### Why This Matters

- **Symptom**: API returns `401 UNAUTHORIZED` even with correct key
- **Root Cause**: Trailing `\n` character makes the key invalid
- **Detection**: Key length is 1 character longer than expected
- **Impact**: Complete API failure, hard to debug

### How to Verify

Create a debug endpoint to check environment variables:

```typescript
// src/app/api/test-env-debug/route.ts
export const runtime = "nodejs";
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.YOUR_API_KEY;

  return NextResponse.json({
    hasKey: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyStart: apiKey?.substring(0, 10) || 'N/A',
    keyEnd: apiKey?.substring(apiKey.length - 10) || 'N/A',
  });
}
```

Look for unexpected `\n` in the `keyEnd` field.

## Runtime Configuration

### Node.js vs Edge Runtime

**ScrapingBee requires Node.js runtime** because it uses:
- `axios` for HTTP requests
- `cheerio` for HTML parsing
- Dynamic `require()` statements (in some cases)

Add this to all ScrapingBee-related API routes:

```typescript
export const runtime = "nodejs";
```

### Files That Need Node.js Runtime

- `src/app/api/companies/[slug]/pricing/scans/route.ts`
- `src/app/api/companies/[slug]/pricing/test-scrapingbee/route.ts`
- `src/app/api/test-scrapingbee-direct/route.ts`
- Any route that imports `axios`, `cheerio`, or calls ScrapingService

## Deployment Process

### 1. Update Environment Variables

```bash
# For each environment (production, preview, development):

# Remove old key
echo "y" | vercel env rm SCRAPINGBEE_API_KEY production

# Add new key (note the -n flag!)
echo -n "YOUR_API_KEY_HERE" | vercel env add SCRAPINGBEE_API_KEY production
```

### 2. Deploy to Production

```bash
# Deploy
vercel --prod

# Or force redeploy of existing build
vercel redeploy https://your-deployment-url.vercel.app
```

### 3. Verify Deployment

```bash
# Test environment variable
curl https://your-domain.vercel.app/api/test-env-debug

# Test ScrapingBee integration
curl https://your-domain.vercel.app/api/test-scrapingbee-direct
```

### 4. Check Logs

```bash
# View real-time logs
vercel logs https://your-domain.vercel.app --since 5m

# Or via Vercel dashboard
# https://vercel.com/your-team/your-project/deployments
```

## Common Issues

### Issue 1: "Request failed with status code 401"

**Cause**: API key has trailing newline or is incorrect

**Fix**:
1. Check key length: `curl https://your-domain/api/test-env-debug`
2. If length is 81 instead of 80, remove and re-add with `echo -n`
3. Redeploy

### Issue 2: "Dynamic require() not supported in edge runtime"

**Cause**: Route is using Edge runtime instead of Node.js runtime

**Fix**:
1. Add `export const runtime = "nodejs";` to the route file
2. Move dynamic imports to top-level if possible
3. Redeploy

### Issue 3: Build fails with TypeScript errors in unrelated directories

**Cause**: Vercel is trying to compile excluded directories (like `Dissan/`)

**Fix**:
1. Add to `.vercelignore`:
   ```
   Dissan/
   ```
2. Update `next.config.ts` webpack config:
   ```typescript
   webpack: (config) => {
     config.watchOptions = {
       ...config.watchOptions,
       ignored: ['**/node_modules', '**/Dissan/**', '**/.git/**'],
     };
     return config;
   }
   ```

## Pre-Deployment Checklist

- [ ] All environment variables set with `echo -n`
- [ ] Node.js runtime specified where needed
- [ ] `.vercelignore` excludes unnecessary directories
- [ ] Test endpoints created for debugging
- [ ] Local testing completed
- [ ] Database migrations applied
- [ ] No secrets in code (use environment variables)

## Post-Deployment Verification

- [ ] Test endpoint returns expected results
- [ ] Environment variables loaded correctly (no newlines)
- [ ] ScrapingBee API calls succeed
- [ ] No runtime errors in logs
- [ ] Credits being consumed as expected
- [ ] Response times acceptable (<30s)

## Rollback Plan

If deployment fails:

```bash
# Find previous successful deployment
vercel ls

# Redeploy it
vercel redeploy https://previous-deployment-url.vercel.app
```

Or use Vercel dashboard to promote a previous deployment to production.

## Monitoring

### ScrapingBee Dashboard
- https://app.scrapingbee.com/dashboard
- Monitor credit usage
- Check API call success rate
- Review error logs

### Vercel Logs
```bash
# Real-time logs
vercel logs https://your-domain.vercel.app --follow

# Logs since specific time
vercel logs https://your-domain.vercel.app --since 1h
```

### Database Queries
```sql
-- Check recent scan results
SELECT
  id,
  competitor_id,
  status,
  products_found,
  products_updated,
  errors,
  started_at,
  completed_at
FROM pricing_scans
ORDER BY started_at DESC
LIMIT 10;

-- Check pricing matches
SELECT
  pm.product_id,
  pm.competitor_id,
  pm.competitor_price,
  pm.competitor_url,
  pm.scraped_at
FROM pricing_matches pm
WHERE pm.competitor_id = 'YOUR_COMPETITOR_ID'
ORDER BY pm.scraped_at DESC;
```

## Reference

- [ScrapingBee Migration Summary](./SCRAPINGBEE_MIGRATION_SUMMARY.md)
- [ScrapingBee Documentation](https://www.scrapingbee.com/documentation/)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
