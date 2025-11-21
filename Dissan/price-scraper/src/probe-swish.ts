
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

// Add stealth plugin
chromium.use(stealthPlugin());

async function probe() {
  console.log('🕵️ Starting Swish.ca probe...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Home & Search
    console.log('Navigating to home...');
    await page.goto('https://www.swish.ca', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Searching for bleach...');
    // Try to find search input. Common selectors:
    const searchSelectors = ['input[type="search"]', 'input[name="q"]', '#search', '.search-input'];
    let searchInput = null;
    for (const sel of searchSelectors) {
      if (await page.$(sel)) {
        searchInput = sel;
        break;
      }
    }

    if (searchInput) {
      await page.fill(searchInput, 'bleach');
      await page.press(searchInput, 'Enter');
      await page.waitForTimeout(5000); // Wait for results

      // Save results HTML
      const resultsHtml = await page.content();
      fs.writeFileSync(path.join(__dirname, '../swish-results.html'), resultsHtml);
      console.log('Saved swish-results.html');

      // 2. Product Page
      // Try to click the first product image or link
      const productLinkSelectors = ['.product-item a', '.product-title a', '.card a', 'h3 a'];
      let productClicked = false;
      for (const sel of productLinkSelectors) {
        const link = await page.$(sel);
        if (link) {
            console.log(`Clicking product link: ${sel}`);
            await link.click();
            productClicked = true;
            break;
        }
      }

      if (productClicked) {
        await page.waitForTimeout(5000);
        const productHtml = await page.content();
        fs.writeFileSync(path.join(__dirname, '../swish-product.html'), productHtml);
        console.log('Saved swish-product.html');
      } else {
          console.log('Could not find a product link to click.');
      }

    } else {
      console.error('Could not find search input');
      // Save home html just in case
      fs.writeFileSync(path.join(__dirname, '../swish-home.html'), await page.content());
    }

  } catch (error) {
    console.error('Probe failed:', error);
  } finally {
    await browser.close();
  }
}

probe();
