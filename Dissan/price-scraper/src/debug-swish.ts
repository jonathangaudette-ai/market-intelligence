
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

async function debugSwish() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.swish.ca', { waitUntil: 'domcontentloaded' });
    console.log('Please solve Cloudflare if needed...');
    await page.waitForTimeout(5000);

    // Search for something common
    await page.fill('#search', 'bleach');
    await page.press('#search', 'Enter');
    await page.waitForTimeout(5000);

    // Check selectors
    const items = await page.$$('.product-item');
    console.log(`Found ${items.length} items with .product-item`);

    const itemsInfo = await page.$$('.product-item-info');
    console.log(`Found ${itemsInfo.length} items with .product-item-info`);

    const links = await page.$$('a.product-item-link');
    console.log(`Found ${links.length} links with a.product-item-link`);

    // Dump some HTML
    if (items.length > 0) {
        console.log('First item HTML:', await items[0].innerHTML());
    } else {
        console.log('Body HTML snippet:', (await page.content()).substring(0, 1000));
    }

    await browser.close();
}

debugSwish();
