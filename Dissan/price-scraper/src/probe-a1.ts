
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(stealthPlugin());

async function probe() {
    console.log('🕵️ Starting A1 Cash & Carry probe...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('Navigating to home...');
        await page.goto('https://www.a1cashandcarry.com', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        console.log('Searching for bleach...');
        // Common search selectors
        const searchSelectors = ['input[name="q"]', 'input[type="search"]', '.search-bar input', '#search-input'];
        let searchInput = null;
        for (const sel of searchSelectors) {
            if (await page.$(sel)) {
                searchInput = sel;
                break;
            }
        }

        if (searchInput) {
            console.log(`Found search input: ${searchInput}`);
            await page.fill(searchInput, 'bleach');
            await page.press(searchInput, 'Enter');
            await page.waitForTimeout(5000);

            const resultsHtml = await page.content();
            fs.writeFileSync(path.join(__dirname, '../a1-results.html'), resultsHtml);
            console.log('Saved a1-results.html');

            // Try to click first product
            const productLinkSelectors = ['.product-card a', '.grid-view-item__link', '.product-item a', 'a.product-title'];
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
                fs.writeFileSync(path.join(__dirname, '../a1-product.html'), productHtml);
                console.log('Saved a1-product.html');
            }

        } else {
            console.error('Could not find search input');
            fs.writeFileSync(path.join(__dirname, '../a1-home.html'), await page.content());
        }

    } catch (error) {
        console.error('Probe failed:', error);
    } finally {
        await browser.close();
    }
}

probe();
