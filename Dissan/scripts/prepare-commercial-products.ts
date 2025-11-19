import ExcelJS from 'exceljs';
import path from 'path';

interface Product {
  skuOriginal: string;
  skuCleaned: string;
  brand: string;
  name: string;
  nameCleaned: string;
  category: string;
  description: string;
  urlSource: string;
  stockStatus: string;
  images: string;
}

async function prepareCommercialProducts() {
  console.log('🚀 Starting commercial products preparation...\n');

  const inputFile = '/Users/jonathangaudette/market-intelligence/Dissan/produits-sanidepot.xlsx';
  const outputFile = '/Users/jonathangaudette/market-intelligence/Dissan/produits-commerciaux.xlsx';

  // Load the workbook
  console.log('📖 Reading source file:', inputFile);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputFile);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  console.log(`📊 Total rows: ${worksheet.rowCount}`);

  // Extract headers from first row
  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || '';
  });

  console.log('📋 Headers:', headers.join(', '));

  // Process products
  const allProducts: Product[] = [];
  const commercialProducts: Product[] = [];

  // Iterate through rows (skip header)
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);

    // Extract data based on actual column structure:
    // Col 1: Nom, Col 2: Catégorie, Col 3: Sous-catégorie, Col 4: Marque
    // Col 5: Description, Col 6: SKU, Col 8: Statut Stock, Col 10: Images, Col 11: URL
    const name = row.getCell(1).value?.toString() || '';
    const category = row.getCell(2).value?.toString() || '';
    const subCategory = row.getCell(3).value?.toString() || '';
    const brandColumn = row.getCell(4).value?.toString() || '';
    const description = row.getCell(5).value?.toString() || '';
    const skuOriginal = row.getCell(6).value?.toString() || '';
    const stockStatus = row.getCell(8).value?.toString() || '';
    const images = row.getCell(10).value?.toString() || '';
    const urlSource = row.getCell(11).value?.toString() || '';

    // Skip if SKU is empty
    if (!skuOriginal) continue;

    // Clean SKU (remove "SKU  " prefix if present)
    const skuCleaned = skuOriginal.replace(/^SKU\s+/, '').trim();

    // Extract brand from SKU (prefix before "-")
    const brandMatch = skuCleaned.match(/^([A-Z0-9]+)-/);
    const brand = brandMatch ? brandMatch[1] : '';

    // Clean name for search (normalize)
    const nameCleaned = name
      .toLowerCase()
      .replace(/[®™©]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Combine category with subcategory if exists
    const fullCategory = subCategory
      ? `${category} > ${subCategory}`
      : category;

    const product: Product = {
      skuOriginal,
      skuCleaned,
      brand,
      name,
      nameCleaned,
      category: fullCategory,
      description,
      urlSource,
      stockStatus,
      images,
    };

    allProducts.push(product);

    // Filter commercial products (SKU without "M-" prefix)
    if (!skuCleaned.startsWith('M-')) {
      commercialProducts.push(product);
    }
  }

  console.log(`\n📊 Statistics:`);
  console.log(`   Total products: ${allProducts.length}`);
  console.log(`   Dissan/Maison products (M-): ${allProducts.length - commercialProducts.length} (${((allProducts.length - commercialProducts.length) / allProducts.length * 100).toFixed(1)}%)`);
  console.log(`   Commercial products: ${commercialProducts.length} (${(commercialProducts.length / allProducts.length * 100).toFixed(1)}%)`);

  // Count products by brand
  const brandCounts: Record<string, number> = {};
  commercialProducts.forEach(p => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });

  // Sort brands by count
  const sortedBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\n🏷️  Top 10 Commercial Brands:`);
  sortedBrands.forEach(([brand, count], index) => {
    console.log(`   ${index + 1}. ${brand}: ${count} products`);
  });

  // Create output workbook
  console.log(`\n💾 Creating output file: ${outputFile}`);
  const outputWorkbook = new ExcelJS.Workbook();
  const outputSheet = outputWorkbook.addWorksheet('Produits Commerciaux');

  // Add headers
  outputSheet.columns = [
    { header: 'SKU Original', key: 'skuOriginal', width: 25 },
    { header: 'SKU Nettoyé', key: 'skuCleaned', width: 25 },
    { header: 'Marque', key: 'brand', width: 20 },
    { header: 'Nom du Produit', key: 'name', width: 50 },
    { header: 'Nom Nettoyé', key: 'nameCleaned', width: 50 },
    { header: 'Catégorie', key: 'category', width: 30 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'URL Source', key: 'urlSource', width: 50 },
    { header: 'Statut Stock', key: 'stockStatus', width: 15 },
    { header: 'Images', key: 'images', width: 50 },
  ];

  // Style header row
  const headerRowOut = outputSheet.getRow(1);
  headerRowOut.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRowOut.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0066CC' },
  };
  headerRowOut.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  commercialProducts.forEach(product => {
    outputSheet.addRow(product);
  });

  // Enable auto-filter
  outputSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 10 },
  };

  // Save file
  await outputWorkbook.xlsx.writeFile(outputFile);

  console.log(`✅ Success! Commercial products exported to: ${outputFile}`);
  console.log(`   ${commercialProducts.length} products ready for competitor price analysis\n`);

  return {
    totalProducts: allProducts.length,
    commercialProducts: commercialProducts.length,
    dissanProducts: allProducts.length - commercialProducts.length,
    brands: sortedBrands,
  };
}

// Run the script
prepareCommercialProducts()
  .then((result) => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
