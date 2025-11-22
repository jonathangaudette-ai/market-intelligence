
import { chromium, Browser, Page } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';

chromium.use(stealthPlugin());

const INPUT_FILE = path.join(__dirname, '../../analyse-comparative-a1.xlsx');
const OUTPUT_FILE = path.join(__dirname, '../../analyse-comparative-finale.xlsx');

// Swish Config
const SWISH_URL = 'https://www.swish.ca';
const SELECTORS = {
    searchInput: '#search',
    searchResults: '.product-item',
    productLink: 'a.product-item-link',
    title: 'h1.page-title',
    price: '.price-final_price .price',
    sku: '.sku .value',
};

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

async function findSwishEquivalents() {
    console.log('🚀 Starting Swish Equivalent Finder...');

    // 1. Load Input Data
    const products: ConsolidatedProduct[] = [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(INPUT_FILE);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new Error('Input file empty');

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            // Columns based on analyze-matches.ts output
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

    console.log(`✅ Loaded ${products.length} products to check.`);

    // 2. Init Browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Cloudflare Check
    console.log('🌍 Navigating to Swish.ca...');
    await page.goto(SWISH_URL, { waitUntil: 'domcontentloaded' });

    console.log('\n⚠️  === ACTION REQUISE ===');
    console.log('👉 Un navigateur s\'est ouvert. Veuillez :');
    console.log('   1. Résoudre le captcha Cloudflare si présent');
    console.log('   2. Attendre que la page Swish.ca soit complètement chargée');
    console.log('   3. Le script continuera automatiquement dans 90 secondes...\n');

    // Wait 90 seconds for user to solve Cloudflare
    await page.waitForTimeout(90000);

    console.log('✅ Délai écoulé. Démarrage de la recherche...\n');

    // 3. Search Loop
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        console.log(`\n[${i + 1}/${products.length}] Searching for: ${p.dissanName} (${p.dissanSku})`);

        try {
            // Strategy 1: Search by SKU (if valid)
            let found = false;
            if (p.dissanSku && p.dissanSku.length > 3) {
                found = await searchSwish(page, p.dissanSku, p);
            }

            // Strategy 2: Search by Name (if SKU failed)
            if (!found) {
                // Clean name: remove " - " parts or generic words if needed
                // For now, try full name, then first 4 words
                found = await searchSwish(page, p.dissanName, p);

                if (!found) {
                    const shortName = p.dissanName.split(' ').slice(0, 3).join(' ');
                    if (shortName.length > 5 && shortName !== p.dissanName) {
                        await searchSwish(page, shortName, p);
                    }
                }
            }

        } catch (e) {
            console.error(`   ❌ Error processing ${p.dissanName}:`, e);
        }

        // Save periodically
        if (i % 10 === 0) await saveReport(products);
    }

    await saveReport(products);
    await browser.close();
    console.log('🎉 Done!');
}

async function searchSwish(page: Page, term: string, product: ConsolidatedProduct): Promise<boolean> {
    try {
        const searchInput = await page.$(SELECTORS.searchInput);
        if (!searchInput) return false;

        await searchInput.fill(term);
        await searchInput.press('Enter');

        // Wait for results or "no results"
        try {
            await page.waitForSelector(`${SELECTORS.searchResults}, .message.notice`, { timeout: 5000 });
        } catch (e) { /* ignore timeout */ }

        const results = await page.$$(SELECTORS.searchResults);
        if (results.length > 0) {
            // Check first result
            const first = results[0];
            const link = await first.$(SELECTORS.productLink);
            if (link) {
                const url = await link.getAttribute('href') || '';

                // Visit product page for details
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                const title = (await page.textContent(SELECTORS.title))?.trim() || '';
                const price = (await page.textContent(SELECTORS.price))?.trim() || '';
                const sku = (await page.textContent(SELECTORS.sku))?.trim() || '';

                // Calculate Score
                const score = stringSimilarity.compareTwoStrings(product.dissanName.toLowerCase(), title.toLowerCase());

                console.log(`   ✅ Found: ${title} ($${price}) - Score: ${score.toFixed(2)}`);

                if (score > 0.4 || title.toLowerCase().includes(product.dissanSku.toLowerCase())) {
                    product.swishName = title;
                    product.swishPrice = price;
                    product.swishSku = sku;
                    product.swishUrl = url;
                    product.swishScore = score;
                    return true;
                }
            }
        }
    } catch (e) {
        console.log(`   ⚠️ Search error for "${term}":`, e.message);
    }
    return false;
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
        { header: 'A1 URL', key: 'aUrl', width: 30 },
        { header: 'Swish URL', key: 'sUrl', width: 30 },
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
            sScore: p.swishScore.toFixed(2),
            aUrl: p.a1Url,
            sUrl: p.swishUrl
        });
    });

    await workbook.xlsx.writeFile(OUTPUT_FILE);
}

findSwishEquivalents();
