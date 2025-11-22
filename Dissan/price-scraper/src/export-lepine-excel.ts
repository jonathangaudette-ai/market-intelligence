import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.join(__dirname, '../../lepine-catalog-clean.json');
const OUTPUT_FILE = path.join(__dirname, '../../lepine-catalog.xlsx');

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

async function exportToExcel() {
    console.log('📊 Converting Lépine catalog to Excel...\n');

    // Load JSON
    const products: Product[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`✅ Loaded ${products.length} products\n`);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Catalogue Lépine');

    // Define columns
    sheet.columns = [
        { header: 'Nom du produit', key: 'name', width: 50 },
        { header: 'Prix', key: 'price', width: 15 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Marque', key: 'brand', width: 20 },
        { header: 'Catégorie', key: 'category', width: 30 },
        { header: 'Description', key: 'description', width: 60 },
        { header: 'URL Produit', key: 'url', width: 50 },
        { header: 'URL Image', key: 'imageUrl', width: 50 },
    ];

    // Add data
    products.forEach(p => {
        sheet.addRow({
            name: p.name,
            price: p.price,
            sku: p.sku,
            brand: p.brand,
            category: p.category,
            description: p.description,
            url: p.url,
            imageUrl: p.imageUrl
        });
    });

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };

    // Save
    await workbook.xlsx.writeFile(OUTPUT_FILE);
    console.log(`✅ Excel file created: ${OUTPUT_FILE}`);
    console.log(`📊 Total: ${products.length} products`);
}

exportToExcel();
