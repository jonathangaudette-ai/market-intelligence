/**
 * Discover CSS Selectors - Automatique discovery of site structure
 */

import { chromium } from 'playwright';

async function discoverSelectors() {
  const site = process.argv[2] || 'grainger.ca';
  console.log(`🔍 Discovering CSS Selectors for ${site}\n`);

  const browser = await chromium.launch({ headless: false }); // Non-headless pour voir
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Navigate to site
    console.log(`📍 Navigating to https://www.${site}...`);
    await page.goto(`https://www.${site}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Try to find search box
    console.log('\n🔍 Looking for search box...');

    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[name="search"]',
      'input.search-input',
      'input#search',
      '#search-input',
      '.search-field input',
      '[placeholder*="Search"]',
      '[placeholder*="search"]',
    ];

    let searchBox = null;
    let searchSelector = '';

    for (const selector of searchSelectors) {
      try {
        const el = await page.$(selector);
        if (el && await el.isVisible()) {
          searchBox = el;
          searchSelector = selector;
          console.log(`✅ Found search box: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!searchBox) {
      console.log('❌ Could not find search box automatically');
      console.log('Manual inspection needed.');
    } else {
      // Try to search for a test product
      console.log('\n🔍 Searching for "Rubbermaid"...');
      await searchBox.fill('Rubbermaid');

      // Look for search button
      const submitButton = await page.$('button[type="submit"]') ||
                           await page.$('.search-button') ||
                           await page.$('[aria-label*="Search"]');

      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000);
      } else {
        await searchBox.press('Enter');
        await page.waitForTimeout(3000);
      }

      console.log('\n🔍 Analyzing search results page...');

      // Try to find product containers
      const productContainerSelectors = [
        '.product-item',
        '.product-card',
        '.product',
        '[data-product]',
        '.grid-item',
        '.product-grid-item',
        'article.product',
        'li.product',
      ];

      let productSelector = '';
      for (const selector of productContainerSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ Found ${count} products with: ${selector}`);
          productSelector = selector;
          break;
        }
      }

      if (productSelector) {
        // Analyze first product
        const firstProduct = await page.locator(productSelector).first();

        // Try to find product name
        const nameSelectors = [
          '.product-title',
          '.product-name',
          'h3',
          'h2',
          '.title',
          '[class*="title"]',
          '[class*="name"]',
        ];

        for (const selector of nameSelectors) {
          try {
            const name = await firstProduct.locator(selector).first().textContent();
            if (name && name.trim().length > 0) {
              console.log(`✅ Product name selector: ${selector} → "${name.trim().substring(0, 50)}"`);
              break;
            }
          } catch (e) {}
        }

        // Try to find price
        const priceSelectors = [
          '.price',
          '.product-price',
          '[class*="price"]',
          '.amount',
          '.money',
        ];

        for (const selector of priceSelectors) {
          try {
            const price = await firstProduct.locator(selector).first().textContent();
            if (price && price.match(/\d+/)) {
              console.log(`✅ Price selector: ${selector} → "${price.trim()}"`);
              break;
            }
          } catch (e) {}
        }

        // Try to find SKU
        const skuSelectors = [
          '.sku',
          '.product-sku',
          '[class*="sku"]',
          '[class*="item-number"]',
          '[data-sku]',
        ];

        for (const selector of skuSelectors) {
          try {
            const sku = await firstProduct.locator(selector).first().textContent();
            if (sku && sku.trim().length > 0) {
              console.log(`✅ SKU selector: ${selector} → "${sku.trim()}"`);
              break;
            }
          } catch (e) {}
        }
      }

      // Print page HTML structure for manual inspection
      console.log('\n📄 Page structure (first 500 chars of body):');
      const bodyHTML = await page.locator('body').innerHTML();
      console.log(bodyHTML.substring(0, 500) + '...\n');

      console.log('✅ Discovery complete!');
      console.log('\n📝 Update competitors-config.json with the selectors found above.');
    }

    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    console.log('   Use DevTools (F12) to inspect elements.');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

discoverSelectors().catch(console.error);
