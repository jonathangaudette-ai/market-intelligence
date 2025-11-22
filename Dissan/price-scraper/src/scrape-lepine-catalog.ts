import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(stealthPlugin());

interface Product {
    name: string;
    price: string;
    sku: string;
    brand: string;
    category: string;
    url: string;
    imageUrl: string;
    description: string;
}

const OUTPUT_FILE = path.join(__dirname, '../../lepine-catalog.json');
const BASE_URL = 'https://produitslepine.com';

async function scrapeLepineCatalog() {
    console.log('🚀 Starting Produits Lépine Full Catalog Scraper...\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const allProducts: Product[] = [];

    try {
        // 1. Discover all categories
        console.log('📂 Discovering categories...');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Look for navigation menu with categories
        const categoryLinks = await page.$$('nav a[href*="catalogue"], .nav-item a, .category-link a');
        const categories: { name: string; url: string }[] = [];

        for (const link of categoryLinks) {
            const href = await link.getAttribute('href');
            const text = (await link.textContent())?.trim();

            if (href && text && href.includes('catalogue')) {
                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                categories.push({ name: text, url: fullUrl });
            }
        }

        // If no categories found via navigation, try to find them differently
        if (categories.length === 0) {
            console.log('⚠️  No categories found in nav. Trying alternative approach...');
            // Start with the known category
            categories.push({
                name: 'Balais, Brosses et Vadrouilles',
                url: 'https://produitslepine.com/catalogue-balais-brosses-vadrouilles'
            });
        }

        console.log(`✅ Found ${categories.length} categories\n`);

        // 2. Scrape each category
        for (let catIndex = 0; catIndex < categories.length; catIndex++) {
            const category = categories[catIndex];
            console.log(`\n📦 [${catIndex + 1}/${categories.length}] Scraping: ${category.name}`);
            console.log(`   URL: ${category.url}`);

            let currentPage = 1;
            let hasNextPage = true;

            while (hasNextPage) {
                const pageUrl = currentPage === 1 ? category.url : `${category.url}?p=${currentPage}`;
                console.log(`\n   📄 Page ${currentPage}...`);

                await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(2000);

                // Get products on this page
                const productCards = await page.$$('.product-item, .product');

                if (productCards.length === 0) {
                    console.log('   ⚠️ No products found. Moving to next category.');
                    hasNextPage = false;
                    break;
                }

                console.log(`   Found ${productCards.length} products. Collecting URLs...`);

                // First pass: collect all product URLs from this page
                const productUrls: string[] = [];
                for (const card of productCards) {
                    try {
                        const linkEl = await card.$('.product-item-link, a[href*="produit"], .product-item-photo a');
                        const productUrl = linkEl ? await linkEl.getAttribute('href') : '';

                        if (productUrl && !productUrl.includes('login') && !productUrl.includes('wishlist') && !productUrl.includes('cart')) {
                            const fullProductUrl = productUrl.startsWith('http') ? productUrl : `${BASE_URL}${productUrl}`;
                            productUrls.push(fullProductUrl);
                        }
                    } catch (e) {
                        // Skip this product
                    }
                }

                console.log(`   ✅ Collected ${productUrls.length} product URLs`);

                // Second pass: visit each product page
                for (let i = 0; i < productUrls.length; i++) {
                    const productUrl = productUrls[i];

                    try {
                        console.log(`   [${i + 1}/${productUrls.length}] Fetching product details...`);

                        await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        await page.waitForTimeout(1000);

                        const nameEl = await page.$('.product-name, h1.page-title, [itemprop="name"]');
                        const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';

                        const priceEl = await page.$('.price, [data-price-amount]');
                        const price = priceEl ? (await priceEl.textContent())?.trim() || '' : '';

                        const descEl = await page.$('.product-description, .description, [itemprop="description"]');
                        const description = descEl ? (await descEl.textContent())?.trim() || '' : '';

                        const skuEl = await page.$('.sku .value, [itemprop="sku"]');
                        const sku = skuEl ? (await skuEl.textContent())?.trim() || '' : '';

                        const brandEl = await page.$('.brand, [itemprop="brand"]');
                        const brand = brandEl ? (await brandEl.textContent())?.trim() || '' : '';

                        const imgEl = await page.$('img.gallery-image, .product-image img, [itemprop="image"]');
                        const imageUrl = imgEl ? await imgEl.getAttribute('src') || '' : '';

                        if (name) {
                            allProducts.push({
                                name,
                                price,
                                sku,
                                brand,
                                category: category.name,
                                url: productUrl,
                                imageUrl,
                                description
                            });
                        }

                    } catch (e) {
                        console.error(`   ❌ Error: ${e.message}`);
                    }
                }

                console.log(`   ✅ Processed ${productUrls.length} products. Total: ${allProducts.length}`);

                // Check for next page
                const nextButton = await page.$('.pages .next, .pagination .next, a[title="Next"]');
                if (!nextButton) {
                    hasNextPage = false;
                } else {
                    currentPage++;
                }

                // Save progress
                if (allProducts.length % 50 === 0) {
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
                    console.log(`   💾 Progress saved (${allProducts.length} products)`);
                }
            }
        }

        // Final save
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
        console.log(`\n✅ Scraping complete! Total: ${allProducts.length} products`);
        console.log(`📁 Saved to: ${OUTPUT_FILE}`);

    } catch (e) {
        console.error('❌ Error:', e);
        // Save what we have
        if (allProducts.length > 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
            console.log(`💾 Partial results saved: ${allProducts.length} products`);
        }
    }

    await browser.close();
}

scrapeLepineCatalog();
