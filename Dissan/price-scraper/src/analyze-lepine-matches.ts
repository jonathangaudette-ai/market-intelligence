import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';

const DISSAN_FILE = path.join(__dirname, '../../produits-sanidepot.xlsx');
const LEPINE_FILE = path.join(__dirname, '../../lepine-catalog-clean.json');
const OUTPUT_FILE = path.join(__dirname, '../../analyse-comparative-lepine.xlsx');

interface LepineProduct {
    name: string;
    price: string;
    sku: string;
    brand: string;
    category: string;
    url: string;
    imageUrl: string;
    description: string;
}

interface Match {
    dissanName: string;
    dissanSku: string;
    dissanBrand: string;
    lepineName: string;
    lepinePrice: string;
    lepineSku: string;
    lepineUrl: string;
    score: number;
    matchType: string;
    matchReason: string;
}

async function analyzeLepineMatches() {
    console.log('🔍 Starting Lépine Product Matching...\n');

    // 1. Load Dissan products
    const dissanWorkbook = new ExcelJS.Workbook();
    await dissanWorkbook.xlsx.readFile(DISSAN_FILE);
    const dissanSheet = dissanWorkbook.getWorksheet(1);

    const dissanProducts: any[] = [];
    dissanSheet?.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            dissanProducts.push({
                name: row.getCell(1).text,
                sku: row.getCell(2).text || row.getCell(3).text,
                brand: row.getCell(4).text || '',
            });
        }
    });

    console.log(`✅ Loaded ${dissanProducts.length} Dissan products`);

    // 2. Load Lépine catalog
    const lepineProducts: LepineProduct[] = JSON.parse(fs.readFileSync(LEPINE_FILE, 'utf-8'));
    console.log(`✅ Loaded ${lepineProducts.length} Lépine products\n`);

    // 3. Matching logic
    const matches: Match[] = [];

    for (const dissan of dissanProducts) {
        let bestMatch: LepineProduct | null = null;
        let bestScore = 0;
        let matchType = '';
        let matchReason = '';

        for (const lepine of lepineProducts) {
            let score = 0;
            let reason = '';
            let type = '';

            // Strategy 1: SKU match
            if (dissan.sku && lepine.sku && dissan.sku.toLowerCase() === lepine.sku.toLowerCase()) {
                score = 1.0;
                type = 'HIGH_CONFIDENCE';
                reason = 'SKU Match';
            }
            // Strategy 2: Brand + Name similarity
            else {
                const nameSim = stringSimilarity.compareTwoStrings(
                    dissan.name.toLowerCase(),
                    lepine.name.toLowerCase()
                );

                const descSim = lepine.description
                    ? stringSimilarity.compareTwoStrings(dissan.name.toLowerCase(), lepine.description.toLowerCase())
                    : 0;

                const maxSim = Math.max(nameSim, descSim);

                // Brand bonus
                if (dissan.brand && lepine.brand && dissan.brand.toLowerCase() === lepine.brand.toLowerCase()) {
                    score = maxSim + 0.3;
                    type = maxSim > 0.5 ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE';
                    reason = `Name Sim: ${maxSim.toFixed(2)} + Brand Match`;
                } else {
                    score = maxSim;
                    type = maxSim > 0.7 ? 'HIGH_CONFIDENCE' : maxSim > 0.5 ? 'MEDIUM_CONFIDENCE' : 'LOW_CONFIDENCE';
                    reason = `Name Sim: ${maxSim.toFixed(2)}`;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = lepine;
                matchType = type;
                matchReason = reason;
            }
        }

        // Only add matches with score > 0.4
        if (bestMatch && bestScore > 0.4) {
            matches.push({
                dissanName: dissan.name,
                dissanSku: dissan.sku,
                dissanBrand: dissan.brand,
                lepineName: bestMatch.name,
                lepinePrice: bestMatch.price,
                lepineSku: bestMatch.sku,
                lepineUrl: bestMatch.url,
                score: bestScore,
                matchType,
                matchReason
            });
        }
    }

    console.log(`✅ Found ${matches.length} matches\n`);

    // 4. Export to Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Analyse Comparative');

    sheet.columns = [
        { header: 'Produit Dissan', key: 'dName', width: 40 },
        { header: 'SKU Dissan', key: 'dSku', width: 20 },
        { header: 'Marque Dissan', key: 'dBrand', width: 20 },
        { header: 'Produit Lépine', key: 'lName', width: 40 },
        { header: 'Prix Lépine', key: 'lPrice', width: 15 },
        { header: 'SKU Lépine', key: 'lSku', width: 20 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Type', key: 'type', width: 20 },
        { header: 'Raison', key: 'reason', width: 30 },
        { header: 'URL Lépine', key: 'lUrl', width: 50 },
    ];

    matches.forEach(m => {
        sheet.addRow({
            dName: m.dissanName,
            dSku: m.dissanSku,
            dBrand: m.dissanBrand,
            lName: m.lepineName,
            lPrice: m.lepinePrice,
            lSku: m.lepineSku,
            score: m.score.toFixed(2),
            type: m.matchType,
            reason: m.matchReason,
            lUrl: m.lepineUrl
        });
    });

    // Style
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
    };

    await workbook.xlsx.writeFile(OUTPUT_FILE);
    console.log(`✅ Report saved to: ${OUTPUT_FILE}`);
}

analyzeLepineMatches();
