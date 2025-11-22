import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

async function investigateLepine() {
    console.log('🔍 Investigating Produits Lépine site structure...\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Check main catalog page
    await page.goto('https://produitslepine.com/catalogue/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Count total products on main catalog
    const productCards = await page.$$('.product-item, .product');
    console.log(`📦 Products visible on main catalog page: ${productCards.length}`);

    // Check pagination
    const paginationInfo = await page.$('.toolbar-products, .pages');
    if (paginationInfo) {
        const text = await paginationInfo.textContent();
        console.log(`📄 Pagination info: ${text?.trim()}`);
    }

    // Look for "show all" or total count
    const totalText = await page.textContent('body');
    const match = totalText?.match(/(\d+)\s*produits?/i);
    if (match) {
        console.log(`\n🎯 Total products mentioned on page: ${match[1]}`);
    }

    // Check for category links
    console.log('\n📂 Looking for all category links...');
    const links = await page.$$('a[href*="catalogue"]');
    const categories = new Set<string>();

    for (const link of links) {
        const href = await link.getAttribute('href');
        const text = (await link.textContent())?.trim();
        if (href && text) {
            categories.add(`${text} -> ${href}`);
        }
    }

    console.log(`\n✅ Found ${categories.size} unique category links:`);
    Array.from(categories).slice(0, 30).forEach(cat => console.log(`   - ${cat}`));

    if (categories.size > 30) {
        console.log(`   ... and ${categories.size - 30} more`);
    }

    // Check sitemap
    console.log('\n🗺️  Checking for sitemap...');
    try {
        await page.goto('https://produitslepine.com/sitemap.xml', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        const content = await page.content();
        if (content.includes('<urlset')) {
            console.log('✅ Sitemap found! This could list all product URLs.');
        }
    } catch (e) {
        console.log('⚠️  No sitemap found');
    }

    await browser.close();
}

investigateLepine();
