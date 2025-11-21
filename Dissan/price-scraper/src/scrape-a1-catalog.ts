
import { chromium, Browser, Page } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

chromium.use(stealthPlugin());

const START_URL = 'https://www.a1cashandcarry.com/collections/wholesale-janitorial-cleaning-supplies?filter.v.availability=1';
const OUTPUT_FILE = path.join(__dirname, '../../a1-janitorial-catalog.json');

interface A1Product {
    title: string;
    url: string;
    sku: string;
    price: string;
    description: string;
    image: string;
    category: string;
}

async function scrapeCatalog() {
    console.log('🚀 Starting A1 Catalog Scraper...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    let allProducts: A1Product[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    try {
        while (hasNextPage) {
            const url = `${START_URL}&page=${currentPage}`;
            console.log(`\n📄 Scraping Page ${currentPage}... (${url})`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            // Check if products exist
            const productCards = await page.$$('.product-item, .product-card, .grid-view-item');

            if (productCards.length === 0) {
                console.log('   ⚠️ No products found. Reached end of catalog.');
                hasNextPage = false;
                break;
            }

            // Check for "No products found" message
            const bodyText = await page.textContent('body');
            if (bodyText?.includes('No products found') || bodyText?.includes('Sorry, there are no products')) {
                console.log('   ⚠️ "No products found" message detected. Stopping.');
                hasNextPage = false;
                break;
            }

            // Check for "Next" button to determine if this is the last page
            // If there is no next button, this is the last page.
            // We still process the current products, but set hasNextPage = false for next iteration.
            const nextButton = await page.$('.pagination .next a, .pagination__next, a[aria-label="Next page"]');
            if (!nextButton) {
                console.log('   ⚠️ No "Next" button found. This is the last page.');
                hasNextPage = false;
            }
            // The original code had a `break;` here, which would exit the loop prematurely.
            // Assuming the intent was to only set hasNextPage = false and continue processing current page.
            // If the intent was to break, it should be inside the `if` block.
            // Given the comment "// We still process current page products", I'm removing the misplaced break.

            console.log(`   Found ${productCards.length} products on page ${currentPage}. Extracting...`);

            const pageProducts: A1Product[] = [];

            for (const card of productCards) {
                try {
                    // Extract basic info from card
                    const titleEl = await card.$('h3.product-title a, .grid-view-item__title, .product-card__title');
                    const title = titleEl ? (await titleEl.textContent())?.trim() || '' : '';

                    const urlEl = await card.$('a');
                    let productUrl = urlEl ? (await urlEl.getAttribute('href')) || '' : '';
                    if (productUrl && !productUrl.startsWith('http')) {
                        productUrl = 'https://www.a1cashandcarry.com' + productUrl;
                    }

                    const skuEl = await card.$('.sku, .product-sku');
                    const sku = skuEl ? (await skuEl.textContent())?.trim() || '' : '';

                    const priceEl = await card.$('.price, .price-item--regular');
                    const price = priceEl ? (await priceEl.textContent())?.trim() || '' : '';

                    const imgEl = await card.$('img');
                    let image = imgEl ? (await imgEl.getAttribute('src')) || '' : '';
                    if (image && image.startsWith('//')) image = 'https:' + image;

                    if (title && productUrl) {
                        pageProducts.push({
                            title,
                            url: productUrl,
                            sku,
                            price,
                            description: '', // Will fetch later
                            image,
                            category: 'Janitorial'
                        });
                    }
                } catch (e) {
                    console.error('   Error extracting card:', e);
                }
            }

            allProducts = allProducts.concat(pageProducts);
            console.log(`   ✅ Added ${pageProducts.length} products. Total: ${allProducts.length}`);

            // Pagination check
            // Look for "Next" button or just increment page and see if we get products
            // A1 seems to use standard pagination. If we found products, we try next page.
            // Safety break
            if (currentPage > 50) { // Safety limit
                console.log('   ⚠️ Reached safety page limit (50). Stopping.');
                break;
            }

            currentPage++;
            await page.waitForTimeout(2000); // Polite delay
        }

        console.log(`\n🎉 Catalog discovery complete. Found ${allProducts.length} products.`);

        // Phase 2: Deep Scraping (Descriptions)
        console.log('\n🕵️‍♀️ Starting Phase 2: Fetching full descriptions...');
        // We can close the main page and open new ones, or reuse.
        // Let's process in chunks to save memory/time

        const CHUNK_SIZE = 5;
        for (let i = 0; i < allProducts.length; i += CHUNK_SIZE) {
            const chunk = allProducts.slice(i, i + CHUNK_SIZE);
            console.log(`   Processing chunk ${i + 1}-${Math.min(i + CHUNK_SIZE, allProducts.length)} / ${allProducts.length}`);

            await Promise.all(chunk.map(async (p) => {
                try {
                    const pPage = await browser.newPage();
                    await pPage.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    // Get Description
                    // Selectors based on previous analysis
                    const descEl = await pPage.$('.product-description, .description, .product-single__description, .rte');
                    if (descEl) {
                        p.description = (await descEl.textContent())?.trim() || '';
                    }

                    // Get SKU if missing
                    if (!p.sku) {
                        const skuEl = await pPage.$('.uom-holder, .product-single__sku, .sku');
                        if (skuEl) {
                            p.sku = (await skuEl.textContent())?.trim() || '';
                        }
                    }

                    await pPage.close();
                } catch (e) {
                    console.error(`   ❌ Error fetching details for ${p.title}:`, e);
                    // Keep going
                }
            }));

            // Save progress periodically
            if (i % 20 === 0) {
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
                console.log('   💾 Progress saved.');
            }
        }

    } catch (error) {
        console.error('❌ Fatal Error:', error);
    } finally {
        // Final save
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
        console.log(`✅ Final data saved to ${OUTPUT_FILE}`);
        await browser.close();
    }
}

scrapeCatalog();
