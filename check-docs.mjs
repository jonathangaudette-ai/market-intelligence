const url = 'https://market-intelligence-kappa.vercel.app/api/companies/groupe-dissan/documents?limit=10';
const response = await fetch(url);

if (!response.ok) {
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Error:', text);
  process.exit(1);
}

const data = await response.json();
console.log('Total documents:', data.pagination.total);
console.log('Returned:', data.documents.length);
console.log('');

const recent = data.documents.slice(0, 5);
recent.forEach((doc, i) => {
  console.log(`${i+1}. ${doc.name}`);
  console.log(`   Status: ${doc.status}`);
  console.log(`   Chunks: ${doc.totalChunks || 0}`);
  console.log(`   Vectors: ${doc.vectorsCreated ? 'OUI' : 'NON'}`);
  console.log(`   Purpose: ${doc.documentPurpose || 'N/A'}`);
  console.log(`   Créé: ${new Date(doc.createdAt).toLocaleString('fr-FR')}`);
  console.log('');
});
