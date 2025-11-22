import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

async function probeLepine() {
    console.log('🔍 Analyzing Produits Lépine website...\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 Loading page...');
        await page.goto('https://produitslepine.com/catalogue-balais-brosses-vadrouilles', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForTimeout(3000);

        console.log('✅ Page loaded successfully!\n');

        // Check for Cloudflare
        const title = await page.title();
        console.log(`Page title: ${title}`);

        if (title.includes('Just a moment')) {
            console.log('⚠️  Cloudflare detected!\n');
        } else {
            console.log('✅ No Cloudflare detected!\n');
        }

        // Look for product listings
        console.log('🔍 Looking for product structures...\n');

        const selectors = [
            '.product',
            '.product-item',
            '.product-card',
            '[data-product]',
            '.card',
            '.item',
            'article'
        ];

        for (const selector of selectors) {
            const count = await page.$$(selector);
            if (count.length > 0) {
                console.log(`✓ Found ${count.length} elements with selector: ${selector}`);
            }
        }

        // Look for search functionality
        console.log('\n🔍 Looking for search...\n');
        const searchSelectors = [
            'input[type="search"]',
            'input[name="search"]',
            'input[name="q"]',
            '#search',
            '.search-input'
        ];

        for (const selector of searchSelectors) {
            const el = await page.$(selector);
            if (el) {
                console.log(`✓ Found search input: ${selector}`);
            }
        }

        // Get a sample of links
        console.log('\n🔍 Sample product links:\n');
        const links = await page.$$('a[href*="produit"], a[href*="product"]');
        for (let i = 0; i < Math.min(5, links.length); i++) {
            const href = await links[i].getAttribute('href');
            console.log(`  - ${href}`);
        }

        console.log('\n📊 Summary:');
        console.log(`  - Cloudflare: ${title.includes('Just a moment') ? 'YES' : 'NO'}`);
        console.log(`  - Scrapable: ${title.includes('Just a moment') ? 'Difficult' : 'Likely YES'}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    }

    await browser.close();
}

probeLepine();
