/**
 * Default configurations for web scrapers
 * These defaults are based on proven configurations from successful migrations
 */

export function getDefaultScrapingBeeConfig() {
  return {
    scraperType: 'scrapingbee' as const,
    scrapingbee: {
      api: {
        premium_proxy: true,
        country_code: 'ca',
        render_js: true,
        wait: 10000,
        block_ads: true,
        block_resources: false,
        timeout: 120000,
      },
      selectors: {
        // Generic selectors that work for most e-commerce sites
        // Ordered by specificity (most specific first)
        productName: [
          'h1.product__title',
          'h1.product-title',
          'h1[itemprop="name"]',
          '.product-name h1',
          'h1',
        ],
        productPrice: [
          '.price-item.price-item--regular',
          '.price__regular .price-item',
          'span.price-item',
          '[itemprop="price"]',
          '.price',
          '.product-price',
        ],
        productSku: [
          '.product__sku',
          '[data-product-sku]',
          '[itemprop="sku"]',
          '.sku',
          '.product-id',
        ],
        productImage: [
          '.product__media img',
          '.product__image img',
          'img[data-product-image]',
          '[itemprop="image"]',
          '.product-gallery img',
        ],
      },
      // Search config: Required by schema but not currently used
      // We scrape product URLs directly from pricing_matches table
      search: {
        url: '',  // Optional: for future product discovery feature
        method: 'GET' as const,
        param: 'q',
      },
    },
  };
}

/**
 * Get default config based on website URL patterns
 * Can be extended to detect specific platforms (Shopify, WooCommerce, etc.)
 */
export function getDefaultConfigForUrl(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();

  // Detect Shopify sites
  if (hostname.includes('.myshopify.com') || url.includes('/products/')) {
    const baseConfig = getDefaultScrapingBeeConfig();
    return {
      ...baseConfig,
      scrapingbee: {
        ...baseConfig.scrapingbee,
        selectors: {
          productName: ['h1.product__title', 'h1.product-title', 'h1'],
          productPrice: [
            '.price-item.price-item--regular',
            '.price__regular .price-item',
            'span.price',
          ],
          productSku: ['.product__sku', '.variant-sku'],
          productImage: [
            '.product__media img',
            '.product__featured-image',
            'img.product__image',
          ],
        },
      },
    };
  }

  // Default ScrapingBee config for all other sites
  return getDefaultScrapingBeeConfig();
}
