import * as fs from 'fs';

// Generate a large test catalog to see progress in action
const rows = 200; // 200 products
const csvLines = ['SKU,Nom,Prix,Marque,Categorie'];

for (let i = 1; i <= rows; i++) {
  const sku = `LARGE-TEST-${String(i).padStart(4, '0')}`;
  const name = `Produit Test Large Catalogue ${i}`;
  const price = (Math.random() * 100 + 10).toFixed(2);
  const brands = ['MarqueA', 'MarqueB', 'MarqueC', 'MarqueD'];
  const categories = ['CatA', 'CatB', 'CatC', 'CatD'];
  const brand = brands[i % brands.length];
  const category = categories[i % categories.length];

  csvLines.push(`${sku},${name},${price},${brand},${category}`);
}

fs.writeFileSync('/tmp/large-catalog.csv', csvLines.join('\n'));
console.log(`✅ Generated /tmp/large-catalog.csv with ${rows} products`);
console.log(`\nYou can now test this file at:`);
console.log(`https://market-intelligence-kappa.vercel.app/companies/my-company/pricing/catalog`);
console.log(`\nWith ${rows} products, you should see the progress bars and logs update in real-time!`);
