/**
 * Configuration des sites concurrents à scraper
 *
 * Cette configuration sera utilisée par le scraping engine (Phase 6)
 */

export interface CompetitorSiteConfig {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  selectors: {
    productCard: string;
    productName: string;
    productPrice: string;
    productSKU?: string;
    productImage?: string;
  };
  pagination?: {
    type: 'infinite-scroll' | 'button-click' | 'url-param';
    selector?: string;
    urlPattern?: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequests: number; // ms
  };
  stealth: {
    useProxy: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

// Configuration initiale (sera enrichie en Phase 6)
export const COMPETITOR_SITES: CompetitorSiteConfig[] = [
  {
    id: 'swish',
    name: 'Swish',
    baseUrl: 'https://swish.ca',
    enabled: false, // Désactivé pour l'instant
    selectors: {
      productCard: '.product-item',
      productName: '.product-title',
      productPrice: '.product-price',
    },
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
    },
    stealth: {
      useProxy: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
    },
  },
  // Autres sites à ajouter en Phase 6
];
