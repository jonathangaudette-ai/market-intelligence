
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import stringSimilarity from 'string-similarity';

const DISSAN_FILE = path.join(__dirname, '../../produits-sanidepot.xlsx');
const A1_FILE = path.join(__dirname, '../../a1-janitorial-catalog.json');
const OUTPUT_FILE = path.join(__dirname, '../../analyse-comparative-a1.xlsx');

interface DissanProduct {
    nom: string;
    sku: string;
    marque: string;
    categorie: string;
    url: string;
}

interface A1Product {
    title: string;
    url: string;
    sku: string;
    price: string;
    description: string;
    image: string;
    category: string;
}

interface MatchResult {
    dissan: DissanProduct;
    a1: A1Product;
    score: number;
    matchType: string; // 'SKU', 'HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE'
    reason: string;
}

async function analyzeMatches() {
    console.log('🚀 Starting Analysis...');

    // 1. Load Dissan Products
    const dissanProducts: DissanProduct[] = [];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(DISSAN_FILE);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new Error('No worksheet found in Dissan file');

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            const p = {
                nom: row.getCell(1).text?.trim(),
                categorie: row.getCell(2).text?.trim(),
                marque: row.getCell(4).text?.trim(),
                sku: row.getCell(6).text?.trim(),
                url: row.getCell(11).text?.trim(),
            };
            if (p.nom) dissanProducts.push(p);
        }
    });
    console.log(`✅ Loaded ${dissanProducts.length} Dissan products.`);

    // 2. Load A1 Products
    if (!fs.existsSync(A1_FILE)) {
        console.error('❌ A1 Catalog file not found. Run scraper first.');
        return;
    }
    const a1Products: A1Product[] = JSON.parse(fs.readFileSync(A1_FILE, 'utf-8'));
    console.log(`✅ Loaded ${a1Products.length} A1 products.`);

    const matches: MatchResult[] = [];
    const potentialMatches: MatchResult[] = [];

    // 3. Perform Matching
    console.log('🔍 Comparing products...');

    for (const dProd of dissanProducts) {
        let bestMatch: MatchResult | null = null;
        let bestScore = 0;

        // A. Try SKU Match (Exact)
        if (dProd.sku && dProd.sku.length > 2) {
            const skuMatch = a1Products.find(a =>
                (a.sku && a.sku.toLowerCase().includes(dProd.sku.toLowerCase())) ||
                (a.title && a.title.toLowerCase().includes(dProd.sku.toLowerCase())) ||
                (a.description && a.description.toLowerCase().includes(dProd.sku.toLowerCase()))
            );

            if (skuMatch) {
                matches.push({
                    dissan: dProd,
                    a1: skuMatch,
                    score: 1.0,
                    matchType: 'SKU',
                    reason: `SKU Match (${dProd.sku})`
                });
                continue; // Skip to next product if SKU match found
            }
        }

        // B. Fuzzy Match (Name + Description)
        // We compare Dissan Name against A1 Title
        // We can also check if A1 Description contains Dissan Name parts

        for (const aProd of a1Products) {
            // Similarity between names
            const nameScore = stringSimilarity.compareTwoStrings(dProd.nom.toLowerCase(), aProd.title.toLowerCase());

            // Check if Brand matches (if available)
            let brandBonus = 0;
            if (dProd.marque && aProd.title.toLowerCase().includes(dProd.marque.toLowerCase())) {
                brandBonus = 0.1;
            }

            // Check for key terms overlap (e.g. "5L", "Bleach")
            // Simple token overlap
            const dTokens = dProd.nom.toLowerCase().split(' ').filter(t => t.length > 3);
            const aTokens = (aProd.title + ' ' + aProd.description).toLowerCase();
            let tokenMatchCount = 0;
            dTokens.forEach(t => {
                if (aTokens.includes(t)) tokenMatchCount++;
            });
            const tokenScore = dTokens.length > 0 ? (tokenMatchCount / dTokens.length) * 0.3 : 0;

            const totalScore = nameScore + brandBonus + tokenScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMatch = {
                    dissan: dProd,
                    a1: aProd,
                    score: totalScore,
                    matchType: totalScore > 0.8 ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
                    reason: `Name Sim: ${nameScore.toFixed(2)} + Brand/Token Bonus`
                };
            }
        }

        if (bestMatch && bestScore > 0.55) { // Threshold
            matches.push(bestMatch);
        }
    }

    console.log(`✅ Found ${matches.length} matches.`);

    // 4. Export Report
    const outWorkbook = new ExcelJS.Workbook();
    const sheet = outWorkbook.addWorksheet('Comparaison A1');

    sheet.columns = [
        { header: 'Dissan - Nom', key: 'dName', width: 30 },
        { header: 'Dissan - SKU', key: 'dSku', width: 15 },
        { header: 'Dissan - Marque', key: 'dBrand', width: 15 },
        { header: 'A1 - Titre', key: 'aName', width: 30 },
        { header: 'A1 - Prix', key: 'aPrice', width: 15 },
        { header: 'A1 - SKU', key: 'aSku', width: 15 },
        { header: 'Score', key: 'score', width: 10 },
        { header: 'Type Match', key: 'type', width: 15 },
        { header: 'Raison', key: 'reason', width: 25 },
        { header: 'URL A1', key: 'aUrl', width: 40 },
        { header: 'URL Dissan', key: 'dUrl', width: 40 },
    ];

    matches.sort((a, b) => b.score - a.score); // Sort by score

    matches.forEach(m => {
        sheet.addRow({
            dName: m.dissan.nom,
            dSku: m.dissan.sku,
            dBrand: m.dissan.marque,
            aName: m.a1.title,
            aPrice: m.a1.price,
            aSku: m.a1.sku,
            score: m.score.toFixed(2),
            type: m.matchType,
            reason: m.reason,
            aUrl: m.a1.url,
            dUrl: m.dissan.url
        });
    });

    await outWorkbook.xlsx.writeFile(OUTPUT_FILE);
    console.log(`✅ Report saved to ${OUTPUT_FILE}`);
}

analyzeMatches().catch(console.error);
