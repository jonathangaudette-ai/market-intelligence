import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pino } from 'pino';
import * as Sentry from '@sentry/node';
import { ScraperFactory } from './scrapers/factory.js';
import { ScrapeRequestSchema } from './types/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Structured Logging with Pino
// ============================================================================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// ============================================================================
// Sentry Error Tracking
// ============================================================================

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['x-api-key'];
        delete event.request.headers['authorization'];
      }
      return event;
    },
  });

  // Sentry request handler (must be first)
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ============================================================================
// Middleware
// ============================================================================

app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key as identifier (better than IP for multi-tenant)
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
});

app.use('/api/scrape', limiter);

// API Key validation
app.use((req, res, next) => {
  // Skip auth for health check
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  }, 'Incoming request');
  next();
});

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  // TODO: Implement Prometheus metrics
  res.setHeader('Content-Type', 'text/plain');
  res.send('# Metrics placeholder\n# scrape_duration_seconds\n# scrape_total\n');
});

// Main scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const startTime = Date.now();

  // Sentry transaction
  const transaction = Sentry.startTransaction({
    op: 'scrape',
    name: 'POST /api/scrape',
  });

  try {
    logger.info('Received scrape request');

    // Validate request
    const request = ScrapeRequestSchema.parse(req.body);

    logger.info({
      companySlug: request.companySlug,
      competitorName: request.competitorName,
      productsCount: request.products.length,
      batchInfo: request.batchInfo,
    }, 'Scrape request validated');

    // Get appropriate scraper
    const scraper = ScraperFactory.getScraperForCompany(request.companySlug);

    logger.info({
      scraperType: scraper.constructor.name,
    }, 'Scraper selected');

    // Separate products into search vs direct (NEW v3: URL cache optimization)
    const searchProducts = request.products.filter(p => !p.type || p.type === 'search');
    const directProducts = request.products.filter(p => p.type === 'direct');

    logger.info({
      totalProducts: request.products.length,
      searchProducts: searchProducts.length,
      directProducts: directProducts.length,
    }, 'Products separated by type');

    // Execute scraping (handle both types)
    let combinedResult = {
      scrapedProducts: [],
      productsScraped: 0,
      productsFailed: 0,
      errors: [],
    };

    // Scrape direct URLs first (fast path)
    if (directProducts.length > 0) {
      logger.info('Executing direct URL scraping (cached URLs)');
      const directResult = await scraper.scrapeDirect(directProducts);
      combinedResult = {
        scrapedProducts: [...directResult.scrapedProducts],
        productsScraped: directResult.productsScraped,
        productsFailed: directResult.productsFailed,
        errors: [...directResult.errors],
      };
    }

    // Scrape search products (slow path)
    if (searchProducts.length > 0) {
      logger.info('Executing search-based scraping');
      const searchResult = await scraper.scrapeCompetitor({
        competitorId: request.competitorId,
        competitorName: request.competitorName,
        competitorUrl: request.competitorUrl,
        products: searchProducts as any[], // TODO: Fix type
      });
      combinedResult = {
        scrapedProducts: [...combinedResult.scrapedProducts, ...searchResult.scrapedProducts],
        productsScraped: combinedResult.productsScraped + searchResult.productsScraped,
        productsFailed: combinedResult.productsFailed + searchResult.productsFailed,
        errors: [...combinedResult.errors, ...searchResult.errors],
      };
    }

    const result = combinedResult;

    const duration = Date.now() - startTime;

    // Build response
    const response = {
      success: true,
      scrapedProducts: result.scrapedProducts,
      productsScraped: result.productsScraped,
      productsFailed: result.productsFailed,
      errors: result.errors,
      metadata: {
        duration,
        scraperType: scraper.scraperType,
      },
    };

    logger.info({
      duration,
      productsScraped: result.productsScraped,
      productsFailed: result.productsFailed,
    }, 'Scraping completed successfully');

    transaction.setStatus('ok');
    transaction.finish();

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error({
      error: error.message,
      stack: error.stack,
      duration,
    }, 'Scraping failed');

    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/scrape',
      },
    });

    transaction.setStatus('internal_error');
    transaction.finish();

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================================================
// Error Handler
// ============================================================================

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
  }, 'Unhandled error');

  Sentry.captureException(err);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Sentry error handler (must be last)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  }, 'Railway worker server started');
});
