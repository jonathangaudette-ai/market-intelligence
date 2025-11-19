/**
 * Diagnose Selectors - Capture HTML and screenshot of search results
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(StealthPlugin());

async function diagnoseSelectors() {
  const site = process.argv[2] || 'grainger';
  const searchTerm = process.argv[3] || 'Rubbermaid';

  console.log(`🔍 Diagnosing selectors for ${site} - searching for "${searchTerm}"\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    let searchUrl = '';

    // Site-specific search URLs
    if (site === 'grainger') {
      searchUrl = `https://www.grainger.ca/en/search?searchQuery=${encodeURIComponent(searchTerm)}`;
    } else if (site === 'swish') {
      searchUrl = `https://swish.ca/search?q=${encodeURIComponent(searchTerm)}`;
    } else if (site === 'uline') {
      searchUrl = `https://www.uline.ca/Product/AdvSearchResult?keywords=${encodeURIComponent(searchTerm)}`;
    } else {
      searchUrl = `https://${site}/?s=${encodeURIComponent(searchTerm)}`;
    }

    console.log(`📍 Navigating to ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for dynamic content

    // Create output directory
    const outputDir = path.resolve(__dirname, '../diagnostics');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save screenshot
    const screenshotPath = path.join(outputDir, `${site}-search-results.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Save HTML
    const html = await page.content();
    const htmlPath = path.join(outputDir, `${site}-search-results.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`💾 HTML saved: ${htmlPath}`);

    // Try to find potential product containers
    console.log('\n🔍 Analyzing page structure...\n');

    // Common product container patterns
    const potentialContainers = [
      '[data-testid*="product"]',
      '[class*="product"]',
      '[class*="item"]',
      '[class*="result"]',
      'article',
      '[data-product]',
      '.grid > div',
      'ul > li',
    ];

    for (const selector of potentialContainers) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0 && count < 100) { // Reasonable number of products
          console.log(`✅ Found ${count} elements with selector: ${selector}`);

          // Get the first element's HTML to analyze
          const firstElement = await page.locator(selector).first();
          const html = await firstElement.innerHTML();
          const preview = html.substring(0, 200).replace(/\n/g, ' ');
          console.log(`   Preview: ${preview}...`);
          console.log('');
        }
      } catch (e) {
        // Selector didn't work, skip
      }
    }

    // Try to find price elements
    console.log('\n💰 Looking for price elements...\n');
    const pricePatterns = [
      '[data-testid*="price"]',
      '[class*="price"]',
      '[class*="Price"]',
      '.amount',
      '[data-price]',
    ];

    for (const selector of pricePatterns) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0 && count < 100) {
          const text = await page.locator(selector).first().textContent();
          if (text && text.match(/\$?\d+/)) {
            console.log(`✅ Found ${count} price elements: ${selector}`);
            console.log(`   Example: "${text.trim()}"`);
            console.log('');
          }
        }
      } catch (e) {}
    }

    console.log('\n✅ Diagnosis complete!');
    console.log(`\nFiles saved in: ${outputDir}/`);
    console.log('\n📋 Next steps:');
    console.log(`1. Open ${screenshotPath}`);
    console.log(`2. Open ${htmlPath} in a browser`);
    console.log('3. Inspect the HTML to find the correct selectors');
    console.log('4. Update competitors-config.json with real selectors');

    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

diagnoseSelectors().catch(console.error);
