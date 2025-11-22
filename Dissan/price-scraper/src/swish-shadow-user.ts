import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';

const INPUT_FILE = path.join(__dirname, '../../analyse-comparative-a1.xlsx');
const OUTPUT_FILE = path.join(__dirname, '../../analyse-comparative-finale.xlsx');

// Chrome Profile Path (macOS default)
const CHROME_PROFILE = path.join(process.env.HOME || '', 'Library/Application Support/Google/Chrome');

// Swish Config
const SWISH_URL = 'https://www.swish.ca';

interface ConsolidatedProduct {
    dissanName: string;
    dissanSku: string;
    dissanBrand: string;
    dissanUrl: string;

    a1Name: string;
    a1Price: string;
    a1Sku: string;
    a1Url: string;
    a1Score: number;

    swishName: string;
    swishPrice: string;
    swishSku: string;
    swishUrl: string;
    swishScore: number;
}

async function swishShadowUser() {
    console.log('🚀 Starting Swish Shadow User Scraper...');
    console.log(`📂 Using Chrome profile: ${CHROME_PROFILE}`);

    // 1. Load Input Data
    const products: ConsolidatedProduct[] = [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(INPUT_FILE);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new Error('Input file empty');

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            products.push({
                dissanName: row.getCell(1).text,
                dissanSku: row.getCell(2).text,
                dissanBrand: row.getCell(3).text,
                a1Name: row.getCell(4).text,
                a1Price: row.getCell(5).text,
                a1Sku: row.getCell(6).text,
                a1Score: parseFloat(row.getCell(7).text || '0'),
                a1Url: row.getCell(10).text,
                dissanUrl: row.getCell(11).text,

                swishName: '',
                swishPrice: '',
                swishSku: '',
                swishUrl: '',
                swishScore: 0
            });
        }
    });

    console.log(`✅ Loaded ${products.length} products to check.\n`);

    // 2. Launch Browser with Persistent Context
    console.log('🌐 Lancement du navigateur...');
    console.log('⚠️  IMPORTANT: Veuillez fermer Chrome si vous l\'avez ouvert.\n');

    // Use a dedicated profile for Playwright that won't conflict
    const playwrightProfile = path.join(process.env.HOME || '', '.playwright-swish-profile');

    const browser = await chromium.launchPersistentContext(playwrightProfile, {
        headless: false,
        channel: 'chrome',
    });

    const page = browser.pages()[0] || await browser.newPage();

    // 3. Initial Manual Visit
    console.log('\n⚠️  === ACTION REQUISE ===');
    console.log('👉 Le navigateur Chrome s\'est ouvert avec VOTRE profil.');
    console.log('   Veuillez :');
    console.log('   1. Visiter Swish.ca manuellement');
    console.log('   2. Résoudre le captcha Cloudflare si présent');
    console.log('   3. Faire UNE recherche test (ex: "bleach")');
    console.log('   4. Revenir sur la page d\'accueil de Swish.ca');
    console.log('\n   Le script démarrera automatiquement dans 120 secondes...\n');

    await page.goto(SWISH_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(120000); // 2 minutes for user setup

    console.log('✅ Délai écoulé. Démarrage de la recherche automatique...\n');

    // 4. Automated Search Loop
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        console.log(`[${i + 1}/${products.length}] Recherche: ${p.dissanName.substring(0, 40)}...`);

        try {
            // Strategy 1: Search by SKU
            let found = false;
            if (p.dissanSku && p.dissanSku.length > 3) {
                found = await searchSwish(page, p.dissanSku, p);
            }

            // Strategy 2: Search by Name
            if (!found) {
                found = await searchSwish(page, p.dissanName, p);

                if (!found) {
                    const shortName = p.dissanName.split(' ').slice(0, 3).join(' ');
                    if (shortName.length > 5 && shortName !== p.dissanName) {
                        await searchSwish(page, shortName, p);
                    }
                }
            }

        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        }

        // Save periodically
        if ((i + 1) % 20 === 0) {
            await saveReport(products);
            console.log(`   💾 Progress saved (${i + 1}/${products.length})`);
        }
    }

    await saveReport(products);
    await browser.close();
    console.log('\n🎉 Scraping terminé!');
}

async function searchSwish(page: any, term: string, product: ConsolidatedProduct): Promise<boolean> {
    try {
        // Navigate to home page first to ensure we have the search bar
        await page.goto(SWISH_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Try multiple search selectors
        const searchSelectors = [
            '#search',
            'input[name="q"]',
            'input[type="search"]',
            '.search-input',
            '[placeholder*="Search"]',
            '[placeholder*="Recherche"]'
        ];

        let searchInput = null;
        for (const selector of searchSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) {
                console.log(`   ✓ Using search selector: ${selector}`);
                break;
            }
        }

        if (!searchInput) {
            console.log('   ⚠️ Search input not found');
            return false;
        }

        // Clear and fill search
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type(term, { delay: 50 });
        await searchInput.press('Enter');

        // Wait for results
        await page.waitForTimeout(3000);

        // Try multiple result selectors
        const resultSelectors = [
            '.product-item',
            '.product-card',
            '.product',
            '[data-product-id]',
            '.item.product'
        ];

        let results = [];
        for (const selector of resultSelectors) {
            results = await page.$$(selector);
            if (results.length > 0) {
                console.log(`   ✓ Found ${results.length} results with: ${selector}`);
                break;
            }
        }

        if (results.length === 0) {
            console.log(`   ⚠️ No results for "${term}"`);
            return false;
        }

        // Get first result link
        const first = results[0];
        const linkSelectors = ['a.product-item-link', 'a.product-link', 'a[href*="/products/"]', 'a'];

        let link = null;
        for (const selector of linkSelectors) {
            link = await first.$(selector);
            if (link) break;
        }

        if (!link) {
            console.log('   ⚠️ No product link found');
            return false;
        }

        const url = await link.getAttribute('href');
        if (!url) return false;

        const fullUrl = url.startsWith('http') ? url : `${SWISH_URL}${url}`;

        // Visit product page
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Extract product details
        const titleSelectors = ['h1.page-title', 'h1', '.product-name', '.product-title'];
        let title = '';
        for (const selector of titleSelectors) {
            const el = await page.$(selector);
            if (el) {
                title = (await el.textContent())?.trim() || '';
                if (title) break;
            }
        }

        const priceSelectors = ['.price', '.price-final_price .price', '[data-price-amount]', '.product-price'];
        let price = '';
        for (const selector of priceSelectors) {
            const el = await page.$(selector);
            if (el) {
                price = (await el.textContent())?.trim() || '';
                if (price) break;
            }
        }

        const skuSelectors = ['.sku .value', '.sku', '[itemprop="sku"]'];
        let sku = '';
        for (const selector of skuSelectors) {
            const el = await page.$(selector);
            if (el) {
                sku = (await el.textContent())?.trim() || '';
                if (sku) break;
            }
        }

        // Calculate similarity score
        const score = stringSimilarity.compareTwoStrings(
            product.dissanName.toLowerCase(),
            title.toLowerCase()
        );

        if (title) {
            console.log(`   ✅ ${title.substring(0, 40)}... (${price}) - Score: ${score.toFixed(2)}`);
        }

        // Accept if score is decent or SKU matches
        if (score > 0.4 || (sku && product.dissanSku && sku.toLowerCase().includes(product.dissanSku.toLowerCase()))) {
            product.swishName = title;
            product.swishPrice = price;
            product.swishSku = sku;
            product.swishUrl = fullUrl;
            product.swishScore = score;
            return true;
        }

        return false;

    } catch (e) {
        console.log(`   ⚠️ Error: ${e.message}`);
        return false;
    }
}

async function saveReport(products: ConsolidatedProduct[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Comparatif Final');

    sheet.columns = [
        { header: 'Dissan Name', key: 'dName', width: 30 },
        { header: 'Dissan SKU', key: 'dSku', width: 15 },
        { header: 'A1 Name', key: 'aName', width: 30 },
        { header: 'A1 Price', key: 'aPrice', width: 15 },
        { header: 'A1 Score', key: 'aScore', width: 10 },
        { header: 'Swish Name', key: 'sName', width: 30 },
        { header: 'Swish Price', key: 'sPrice', width: 15 },
        { header: 'Swish Score', key: 'sScore', width: 10 },
        { header: 'A1 URL', key: 'aUrl', width: 50 },
        { header: 'Swish URL', key: 'sUrl', width: 50 },
    ];

    products.forEach(p => {
        sheet.addRow({
            dName: p.dissanName,
            dSku: p.dissanSku,
            aName: p.a1Name,
            aPrice: p.a1Price,
            aScore: p.a1Score,
            sName: p.swishName,
            sPrice: p.swishPrice,
            sScore: p.swishScore > 0 ? p.swishScore.toFixed(2) : '',
            aUrl: p.a1Url,
            sUrl: p.swishUrl
        });
    });

    await workbook.xlsx.writeFile(OUTPUT_FILE);
}

swishShadowUser();
