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

const OUTPUT_FILE = path.join(__dirname, '../../lepine-full-catalog.json');
const BASE_URL = 'https://produitslepine.com';
const CATALOG_URL = 'https://produitslepine.com/catalogue/';

async function scrapeFullCatalog() {
    console.log('🚀 Starting Full Lépine Catalog Scraper...\n');
    console.log('🎯 Target: Main catalog with ~1217 products\n');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const allProducts: Product[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const pageUrl = currentPage === 1 ? CATALOG_URL : `${CATALOG_URL}?p=${currentPage}`;
            console.log(`\n📄 Page ${currentPage}...`);
            console.log(`   URL: ${pageUrl}`);

            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            // Get products on this page
            const productCards = await page.$$('.product-item');

            if (productCards.length === 0) {
                console.log('   ⚠️ No products found. End of catalog.');
                hasNextPage = false;
                break;
            }

            console.log(`   Found ${productCards.length} products. Collecting URLs...`);

            // Collect product URLs
            const productUrls: string[] = [];
            for (const card of productCards) {
                try {
                    const linkEl = await card.$('.product-item-link, .product-item-photo a');
                    const productUrl = linkEl ? await linkEl.getAttribute('href') : '';

                    if (productUrl && !productUrl.includes('login') && !productUrl.includes('wishlist')) {
                        const fullUrl = productUrl.startsWith('http') ? productUrl : `${BASE_URL}${productUrl}`;
                        productUrls.push(fullUrl);
                    }
                } catch (e) {
                    // Skip
                }
            }

            console.log(`   ✅ Collected ${productUrls.length} URLs`);

            // Visit each product
            for (let i = 0; i < productUrls.length; i++) {
                const productUrl = productUrls[i];

                try {
                    if ((i + 1) % 10 === 0) {
                        console.log(`   [${i + 1}/${productUrls.length}] Processing...`);
                    }

                    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    await page.waitForTimeout(800);

                    const nameEl = await page.$('.product-name, h1.page-title, [itemprop="name"]');
                    const name = nameEl ? (await nameEl.textContent())?.trim() || '' : '';

                    const priceEl = await page.$('.price, [data-price-amount], .price-final_price');
                    const price = priceEl ? (await priceEl.textContent())?.trim() || '' : '';

                    const descEl = await page.$('.product-description, .description, [itemprop="description"]');
                    const description = descEl ? (await descEl.textContent())?.trim().substring(0, 500) || '' : '';

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
                            category: 'Catalogue',
                            url: productUrl,
                            imageUrl,
                            description
                        });
                    }

                } catch (e) {
                    console.error(`   ❌ Error on product ${i + 1}: ${e.message}`);
                }
            }

            console.log(`   ✅ Processed ${productUrls.length} products. Total: ${allProducts.length}`);

            // Check if we got fewer products than expected (last page indicator)
            if (productUrls.length < 20) {
                console.log('\n   ⚠️ Fewer products than expected. Likely last page.');
                hasNextPage = false;
            } else {
                currentPage++;
                // Safety limit: stop after 60 pages
                if (currentPage > 60) {
                    console.log('\n   ⚠️ Reached page limit (60). Stopping.');
                    hasNextPage = false;
                }
            }

            // Save progress every 5 pages
            if (currentPage % 5 === 0) {
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
                console.log(`   💾 Progress saved (${allProducts.length} products)`);
            }

            // Small delay between pages
            await page.waitForTimeout(1000);
        }

        // Final save
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
        console.log(`\n✅ Scraping complete!`);
        console.log(`📊 Total products extracted: ${allProducts.length}`);
        console.log(`📁 Saved to: ${OUTPUT_FILE}`);

    } catch (e) {
        console.error('❌ Error:', e);
        if (allProducts.length > 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
            console.log(`💾 Partial results saved: ${allProducts.length} products`);
        }
    }

    await browser.close();
}

scrapeFullCatalog();
