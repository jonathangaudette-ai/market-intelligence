import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import * as path from 'path';

const INPUT_FILE = path.join(__dirname, '../../analyse-comparative-a1.xlsx');
const OUTPUT_FILE = path.join(__dirname, '../../analyse-comparative-finale.xlsx');

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

    swishUrl: string;
    swishFound: boolean;
}

async function findSwishViaGoogle() {
    console.log('🔍 Starting Google Search for Swish URLs...\n');

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

                swishUrl: '',
                swishFound: false
            });
        }
    });

    console.log(`✅ Loaded ${products.length} products to search.\n`);

    // 2. Launch Browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // 3. Google Search Loop
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        console.log(`[${i + 1}/${products.length}] Searching: ${p.dissanName.substring(0, 40)}...`);

        try {
            // Try SKU first, then name
            let found = false;

            if (p.dissanSku && p.dissanSku.length > 3) {
                found = await searchGoogle(page, `site:swish.ca "${p.dissanSku}"`, p);
            }

            if (!found && p.dissanBrand) {
                const query = `site:swish.ca "${p.dissanBrand}" ${p.dissanName.split(' ').slice(0, 3).join(' ')}`;
                found = await searchGoogle(page, query, p);
            }

            if (!found) {
                const shortName = p.dissanName.split(' ').slice(0, 4).join(' ');
                await searchGoogle(page, `site:swish.ca ${shortName}`, p);
            }

        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        }

        // Save progress every 20 products
        if ((i + 1) % 20 === 0) {
            await saveReport(products);
            console.log(`   💾 Progress saved (${i + 1}/${products.length})\n`);
        }

        // Delay between searches to avoid rate limiting
        await page.waitForTimeout(2000);
    }

    await saveReport(products);
    await browser.close();

    const foundCount = products.filter(p => p.swishFound).length;
    console.log(`\n🎉 Done! Found ${foundCount}/${products.length} products on Swish.`);
}

async function searchGoogle(page: any, query: string, product: ConsolidatedProduct): Promise<boolean> {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        // Look for swish.ca links in results
        const links = await page.$$('a[href*="swish.ca"]');

        for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && href.includes('swish.ca') && !href.includes('google.com')) {
                // Clean the URL (Google sometimes wraps it)
                let cleanUrl = href;
                if (href.includes('/url?q=')) {
                    const match = href.match(/url\?q=([^&]+)/);
                    if (match) cleanUrl = decodeURIComponent(match[1]);
                }

                // Verify it's a product page
                if (cleanUrl.includes('swish.ca') &&
                    (cleanUrl.includes('/product') || cleanUrl.includes('/p/') || cleanUrl.match(/swish\.ca\/[^\/]+$/))) {
                    product.swishUrl = cleanUrl;
                    product.swishFound = true;
                    console.log(`   ✅ Found: ${cleanUrl}`);
                    return true;
                }
            }
        }

        console.log(`   ⚠️ No Swish link found`);
        return false;

    } catch (e) {
        console.log(`   ⚠️ Search error: ${e.message}`);
        return false;
    }
}

async function saveReport(products: ConsolidatedProduct[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Comparatif Final');

    sheet.columns = [
        { header: 'Dissan Name', key: 'dName', width: 40 },
        { header: 'Dissan SKU', key: 'dSku', width: 15 },
        { header: 'Dissan Brand', key: 'dBrand', width: 20 },
        { header: 'A1 Name', key: 'aName', width: 40 },
        { header: 'A1 Price', key: 'aPrice', width: 15 },
        { header: 'A1 Score', key: 'aScore', width: 10 },
        { header: 'Swish Found?', key: 'sFound', width: 12 },
        { header: 'A1 URL', key: 'aUrl', width: 50 },
        { header: 'Swish URL', key: 'sUrl', width: 50 },
    ];

    products.forEach(p => {
        sheet.addRow({
            dName: p.dissanName,
            dSku: p.dissanSku,
            dBrand: p.dissanBrand,
            aName: p.a1Name,
            aPrice: p.a1Price,
            aScore: p.a1Score,
            sFound: p.swishFound ? 'YES' : 'NO',
            aUrl: p.a1Url,
            sUrl: p.swishUrl
        });
    });

    await workbook.xlsx.writeFile(OUTPUT_FILE);
}

findSwishViaGoogle();
