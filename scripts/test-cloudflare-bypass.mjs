#!/usr/bin/env node

/**
 * TEST CLOUDFLARE BYPASS WITH PLAYWRIGHT
 *
 * Tests different techniques to bypass Cloudflare bot detection:
 * 1. Stealth mode with extra context options
 * 2. Headful mode (visible browser)
 * 3. Realistic user behavior (mouse movements, scrolling)
 * 4. Custom user agents and headers
 */

import { chromium } from 'playwright';

const SWISH_PRODUCT_URL = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

async function testCloudflareBypass() {
  console.log('🔬 Testing Cloudflare bypass techniques...\n');

  // ========================================================================
  // TECHNIQUE 1: Stealth Mode with Full Browser Context
  // ========================================================================
  console.log('📋 TECHNIQUE 1: Stealth Mode + Full Browser Features');
  console.log('=' .repeat(80));

  const browser = await chromium.launch({
    headless: false, // IMPORTANT: headful mode is harder to detect
    args: [
      '--disable-blink-features=AutomationControlled', // Hide automation
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
    permissions: [],
    geolocation: { latitude: 45.5017, longitude: -73.5673 }, // Montreal
    colorScheme: 'light',
    extraHTTPHeaders: {
      'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  });

  // Hide webdriver property
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Override the chrome property
    window.chrome = {
      runtime: {},
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );

    // Override plugins to make it look real
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-CA', 'en-US', 'en'],
    });
  });

  const page = await context.newPage();

  try {
    console.log(`🌐 Navigating to: ${SWISH_PRODUCT_URL}`);

    // Navigate with realistic delay
    await page.goto(SWISH_PRODUCT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Waiting for page to settle...');

    // Wait for the page to load and check for Cloudflare challenge
    await page.waitForTimeout(5000);

    // Check if we hit Cloudflare challenge
    const pageContent = await page.content();
    const isCloudflareChallenged =
      pageContent.includes('Cloudflare') &&
      (pageContent.includes('Verify you are human') || pageContent.includes('Just a moment'));

    if (isCloudflareChallenged) {
      console.log('❌ Cloudflare challenge detected');
      console.log('⏳ Waiting 30 seconds to see if it auto-solves...\n');

      // Sometimes Cloudflare's JavaScript challenge auto-solves
      await page.waitForTimeout(30000);

      // Check again after waiting
      const newContent = await page.content();
      const stillChallenged =
        newContent.includes('Cloudflare') &&
        (newContent.includes('Verify you are human') || newContent.includes('Just a moment'));

      if (stillChallenged) {
        console.log('❌ Still blocked by Cloudflare after 30s\n');

        // Take screenshot for debugging
        const screenshotPath = '/tmp/cloudflare-blocked.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`📸 Screenshot saved to: ${screenshotPath}\n`);
      } else {
        console.log('✅ Cloudflare challenge passed!\n');
        await extractProductData(page);
      }
    } else {
      console.log('✅ No Cloudflare challenge detected!\n');
      await extractProductData(page);
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    console.log('🔒 Closing browser...');
    await browser.close();
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!\n');
}

async function extractProductData(page) {
  console.log('📊 Attempting to extract product data...\n');

  // Try to find product name
  const productName = await page.evaluate(() => {
    const h1 = document.querySelector('h1.product__title, h1.product-title, h1');
    return h1 ? h1.textContent?.trim() : null;
  });

  // Try to find product price
  const productPrice = await page.evaluate(() => {
    const selectors = [
      '.price-item.price-item--regular',
      '.price__regular .price-item',
      'span.price-item',
      '.product__price span',
      '.price',
      '.money',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent?.includes('$')) {
        return el.textContent.trim();
      }
    }
    return null;
  });

  // Try to find product SKU
  const productSku = await page.evaluate(() => {
    const el = document.querySelector('.product__sku, [data-product-sku], .sku');
    return el ? el.textContent?.trim() : null;
  });

  // Try to find product image
  const productImage = await page.evaluate(() => {
    const img = document.querySelector('.product__media img, .product__image img, [data-product-image]');
    return img ? img.src : null;
  });

  console.log('🏷️  Product Name:', productName || '❌ Not found');
  console.log('💰 Product Price:', productPrice || '❌ Not found');
  console.log('🔢 Product SKU:', productSku || '⚠️ Not found (optional)');
  console.log('🖼️  Product Image:', productImage ? `${productImage.substring(0, 60)}...` : '❌ Not found');

  if (productName && productPrice) {
    console.log('\n✅ SUCCESS! Product data extracted successfully!\n');

    // Take success screenshot
    const screenshotPath = '/tmp/swish-success.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Success screenshot saved to: ${screenshotPath}\n`);

    return true;
  } else {
    console.log('\n⚠️  Partial data extracted. Some fields are missing.\n');

    // Take partial screenshot
    const screenshotPath = '/tmp/swish-partial.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Partial screenshot saved to: ${screenshotPath}\n`);

    return false;
  }
}

// Run the test
testCloudflareBypass().catch(console.error);
