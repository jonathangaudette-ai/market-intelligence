#!/usr/bin/env node

/**
 * INSPECT SWISH PAGE WITH PLAYWRIGHT
 *
 * Uses Playwright to visit the Swish product page and extract:
 * - Actual HTML structure
 * - CSS selectors for price, name, SKU, image
 * - Test scraping to validate selectors work
 */

import { chromium } from 'playwright';

const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

async function inspectSwishPage() {
  console.log('🔍 Launching Playwright to inspect Swish page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`📄 Navigating to: ${SWISH_PRODUCT_URL}`);
    await page.goto(SWISH_PRODUCT_URL, { waitUntil: 'load', timeout: 60000 });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(3000);

    console.log('✅ Page loaded successfully!\n');

    // ========================================================================
    // 1. EXTRACT PRODUCT NAME
    // ========================================================================
    console.log('🏷️  PRODUCT NAME:');
    const nameCandidates = [
      'h1.product__title',
      '.product__title',
      'h1.product-title',
      '.product-title',
      'h1',
    ];

    let productName = null;
    let nameSelector = null;

    for (const selector of nameCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          productName = await element.textContent();
          if (productName && productName.trim()) {
            nameSelector = selector;
            console.log(`   ✅ Found with selector: ${selector}`);
            console.log(`   📝 Value: ${productName.trim()}\n`);
            break;
          }
        }
      } catch (e) {
        // Continue to next candidate
      }
    }

    if (!productName) {
      console.log('   ❌ Could not find product name\n');
    }

    // ========================================================================
    // 2. EXTRACT PRODUCT PRICE
    // ========================================================================
    console.log('💰 PRODUCT PRICE:');
    const priceCandidates = [
      '.price-item.price-item--regular',
      '.price__regular .price-item',
      'span.price-item',
      '.product__price span',
      '.price',
      '[data-product-price]',
      '.money',
    ];

    let productPrice = null;
    let priceSelector = null;

    for (const selector of priceCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          productPrice = await element.textContent();
          if (productPrice && productPrice.trim() && productPrice.includes('$')) {
            priceSelector = selector;
            console.log(`   ✅ Found with selector: ${selector}`);
            console.log(`   💵 Value: ${productPrice.trim()}\n`);
            break;
          }
        }
      } catch (e) {
        // Continue to next candidate
      }
    }

    if (!productPrice) {
      console.log('   ❌ Could not find product price');
      console.log('   🔍 Let me check all text on the page for price patterns...\n');

      // Fallback: Search for any element containing price pattern
      const allText = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        const priceMatches = [];
        let node;

        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim();
          if (text && /\$\s*\d+[.,]\d{2}/.test(text)) {
            const element = node.parentElement;
            const classes = element?.className || '';
            const id = element?.id || '';
            priceMatches.push({
              text,
              selector: element?.tagName?.toLowerCase() + (classes ? `.${classes.split(' ').join('.')}` : '') + (id ? `#${id}` : ''),
              html: element?.outerHTML?.substring(0, 200) || '',
            });
          }
        }

        return priceMatches;
      });

      if (allText.length > 0) {
        console.log('   📍 Found potential price elements:');
        allText.slice(0, 5).forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.text}`);
          console.log(`      Selector: ${match.selector}`);
          console.log(`      HTML: ${match.html}\n`);
        });
      }
    }

    // ========================================================================
    // 3. EXTRACT PRODUCT SKU
    // ========================================================================
    console.log('🔢 PRODUCT SKU:');
    const skuCandidates = [
      '.product__sku',
      '[data-product-sku]',
      '.sku',
      '.variant-sku',
    ];

    let productSku = null;
    let skuSelector = null;

    for (const selector of skuCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          productSku = await element.textContent();
          if (productSku && productSku.trim()) {
            skuSelector = selector;
            console.log(`   ✅ Found with selector: ${selector}`);
            console.log(`   📝 Value: ${productSku.trim()}\n`);
            break;
          }
        }
      } catch (e) {
        // Continue to next candidate
      }
    }

    if (!productSku) {
      console.log('   ⚠️  SKU not found (optional)\n');
    }

    // ========================================================================
    // 4. EXTRACT PRODUCT IMAGE
    // ========================================================================
    console.log('🖼️  PRODUCT IMAGE:');
    const imageCandidates = [
      '.product__media img',
      '.product__image',
      '.product-featured-image',
      'img[data-product-image]',
    ];

    let productImage = null;
    let imageSelector = null;

    for (const selector of imageCandidates) {
      try {
        const element = await page.$(selector);
        if (element) {
          productImage = await element.getAttribute('src');
          if (productImage) {
            imageSelector = selector;
            console.log(`   ✅ Found with selector: ${selector}`);
            console.log(`   🔗 URL: ${productImage.substring(0, 80)}...\n`);
            break;
          }
        }
      } catch (e) {
        // Continue to next candidate
      }
    }

    // ========================================================================
    // 5. GENERATE RECOMMENDED CONFIG
    // ========================================================================
    console.log('='.repeat(80));
    console.log('📋 RECOMMENDED SCRAPER CONFIGURATION:\n');

    const recommendedConfig = {
      scraperType: 'playwright',
      playwright: {
        search: {
          url: 'https://swish.ca/search',
          method: 'GET',
          param: 'q',
        },
        selectors: {
          productName: nameSelector || '.product__title',
          productPrice: priceSelector || '.price-item--regular',
          productSku: skuSelector || '.product__sku',
          productImage: imageSelector || '.product__media img',
        },
      },
    };

    console.log('```json');
    console.log(JSON.stringify(recommendedConfig, null, 2));
    console.log('```\n');

    console.log('='.repeat(80));
    console.log('✅ Inspection complete!\n');

    // ========================================================================
    // 6. TAKE SCREENSHOT FOR DEBUGGING
    // ========================================================================
    const screenshotPath = '/tmp/swish-page-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);

  } catch (error) {
    console.error('❌ Error inspecting page:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the inspection
inspectSwishPage().catch(console.error);
