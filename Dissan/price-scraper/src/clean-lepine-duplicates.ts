import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.join(__dirname, '../../lepine-catalog.json');
const OUTPUT_FILE = path.join(__dirname, '../../lepine-catalog-clean.json');

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

function cleanDuplicates() {
    console.log('🧹 Cleaning duplicates from Lépine catalog...\n');

    const products: Product[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📊 Original: ${products.length} products`);

    // Remove duplicates based on URL (most reliable unique identifier)
    const seenUrls = new Set<string>();
    const uniqueProducts: Product[] = [];

    for (const product of products) {
        if (!seenUrls.has(product.url)) {
            seenUrls.add(product.url);
            uniqueProducts.push(product);
        }
    }

    console.log(`✅ Cleaned: ${uniqueProducts.length} unique products`);
    console.log(`🗑️  Removed: ${products.length - uniqueProducts.length} duplicates\n`);

    // Save cleaned catalog
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueProducts, null, 2));
    console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

cleanDuplicates();
