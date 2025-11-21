
import { chromium, Browser, Page } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';

// Add stealth plugin
chromium.use(stealthPlugin());

// Load config
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'competitors-config.json'), 'utf-8'));

interface ProductMatch {
    sourceProduct: any;
    competitor: string;
    matchedName: string;
    matchedUrl: string;
    price: string;
    score: number;
    matchType: 'SKU' | 'EXACT_NAME' | 'FUZZY' | 'NONE';
}

class CompetitorPriceFinder {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private products: any[] = [];
    private matches: ProductMatch[] = [];

    async init() {
        console.log('🚀 Initializing Competitor Price Finder...');
        this.browser = await chromium.launch({
            headless: false, // Must be false for Cloudflare
        });
        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1280, height: 800 });
    }

    async loadProducts(filePath: string) {
        console.log(`📂 Loading products from ${filePath}...`);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) throw new Error('No worksheet found');

        // Assuming headers are in row 1
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const product = {
                    nom: row.getCell(1).text,
                    categorie: row.getCell(2).text,
                    marque: row.getCell(4).text,
                    sku: row.getCell(6).text,
                    url: row.getCell(11).text,
                };
                // Filter empty rows
                if (product.nom) {
                    this.products.push(product);
                }
            }
        });
        console.log(`✅ Loaded ${this.products.length} products.`);
    }

    async searchSwish(product: any): Promise<ProductMatch | null> {
        return this.searchSite(product, CONFIG.swish);
    }

    async searchA1(product: any): Promise<ProductMatch | null> {
        return this.searchSite(product, CONFIG.a1);
    }

    async searchSite(product: any, siteConfig: any): Promise<ProductMatch | null> {
        if (!this.page) return null;

        try {
            console.log(`\n🔍 Searching ${siteConfig.name} for: ${product.nom} (${product.sku})`);

            // Go to home
            await this.page.goto(siteConfig.baseUrl, { waitUntil: 'domcontentloaded' });

            // Check for Cloudflare
            const title = await this.page.title();
            if (title.includes('Just a moment') || title.includes('Attention Required')) {
                console.log('⚠️  Cloudflare detected! Please solve the captcha in the browser window.');
                await this.page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 60000 });
                console.log('✅ Captcha solved (hopefully). Continuing...');
            }

            // Search by SKU first (High precision)
            let searchTerm = product.sku;
            // If SKU is short or empty, use name
            if (!searchTerm || searchTerm.length < 3) {
                searchTerm = product.nom;
            }

            // Perform search
            const searchInput = await this.page.$(siteConfig.selectors.searchInput);
            if (searchInput) {
                await searchInput.fill(searchTerm);
                await searchInput.press('Enter');
                await this.page.waitForTimeout(5000); // Wait for results
            } else {
                console.log(`   ❌ Search input not found on ${siteConfig.name}`);
                return null;
            }

            // Check results
            const results = await this.page.$$(siteConfig.selectors.searchResults);
            if (results.length === 0) {
                console.log(`   ❌ No results found for "${searchTerm}"`);

                // Retry with name if we tried SKU
                if (searchTerm === product.sku && product.nom) {
                    console.log(`   🔄 Retrying with name: "${product.nom}"`);
                    await this.page.goto(siteConfig.baseUrl);
                    await this.page.fill(siteConfig.selectors.searchInput, product.nom);
                    await this.page.press(siteConfig.selectors.searchInput, 'Enter');
                    await this.page.waitForTimeout(3000);
                } else {
                    return null;
                }
            }

            // Analyze first result
            // Re-query results after potential retry
            const finalResults = await this.page.$$(siteConfig.selectors.searchResults);
            if (finalResults.length > 0) {
                const firstItem = finalResults[0];

                // Extract info
                let matchedName = '';
                let matchedUrl = '';
                let price = '';

                // Click to go to product page for details (more reliable)
                // Or extract from list if possible
                const link = await firstItem.$(siteConfig.selectors.productLink);
                if (link) {
                    matchedUrl = await link.getAttribute('href') || '';
                    if (matchedUrl && !matchedUrl.startsWith('http')) {
                        matchedUrl = siteConfig.baseUrl + matchedUrl;
                    }

                    // Navigate to product page
                    await this.page.goto(matchedUrl, { waitUntil: 'domcontentloaded' });

                    // Get details
                    matchedName = await this.page.textContent(siteConfig.selectors.title).catch(() => '') || '';
                    matchedName = matchedName.trim();

                    // Get price (try multiple selectors or metadata)
                    const priceEl = await this.page.$(siteConfig.selectors.price);
                    if (priceEl) {
                        price = await priceEl.textContent() || '';
                    } else {
                        // Try metadata
                        price = await this.page.getAttribute('meta[property="og:price:amount"]', 'content').catch(() => '') || '';
                    }
                }

                // Calculate Score
                const score = stringSimilarity.compareTwoStrings(product.nom.toLowerCase(), matchedName.toLowerCase());
                console.log(`   🎯 Match found: "${matchedName}" (Score: ${score.toFixed(2)}) - Price: ${price}`);

                if (score > 0.4) { // Threshold
                    return {
                        sourceProduct: product,
                        competitor: siteConfig.name,
                        matchedName,
                        matchedUrl,
                        price: price.trim(),
                        score,
                        matchType: score > 0.9 ? 'EXACT_NAME' : 'FUZZY'
                    };
                }
            }

        } catch (error) {
            console.error(`   ❌ Error searching ${siteConfig.name}:`, error);
        }

        return null;
    }

    async run() {
        await this.init();

        // Path to input file (adjust as needed)
        const inputPath = path.join(__dirname, '../../produits-sanidepot.xlsx');
        await this.loadProducts(inputPath);

        // Limit for testing
        const productsToProcess = this.products.slice(0, 5); // Process first 5 for test
        console.log(`\n🧪 Processing first ${productsToProcess.length} products for testing...`);

        for (const product of productsToProcess) {
            const swishMatch = await this.searchSwish(product);
            if (swishMatch) this.matches.push(swishMatch);

            const a1Match = await this.searchA1(product);
            if (a1Match) this.matches.push(a1Match);
        }

        await this.exportResults();
        await this.browser?.close();
    }

    async exportResults() {
        console.log('\n📊 Exporting results...');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Comparaison Prix');

        worksheet.columns = [
            { header: 'Produit SaniDépot', key: 'sourceName', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Compétiteur', key: 'competitor', width: 15 },
            { header: 'Produit Trouvé', key: 'matchedName', width: 30 },
            { header: 'Prix', key: 'price', width: 15 },
            { header: 'Score', key: 'score', width: 10 },
            { header: 'URL', key: 'url', width: 40 },
        ];

        this.matches.forEach(m => {
            worksheet.addRow({
                sourceName: m.sourceProduct.nom,
                sku: m.sourceProduct.sku,
                competitor: m.competitor,
                matchedName: m.matchedName,
                price: m.price,
                score: m.score.toFixed(2),
                url: m.matchedUrl
            });
        });

        const outputPath = path.join(__dirname, '../../comparatif-prix.xlsx');
        await workbook.xlsx.writeFile(outputPath);
        console.log(`✅ Results saved to ${outputPath}`);
    }
}

// Run
new CompetitorPriceFinder().run().catch(console.error);
