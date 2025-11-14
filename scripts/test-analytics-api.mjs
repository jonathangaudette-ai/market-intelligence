const DEPLOYMENT_URL = 'https://market-intelligence-kappa.vercel.app';

async function testAnalytics() {
  console.log('Testing Knowledge Base Analytics API\n');

  const url = `${DEPLOYMENT_URL}/api/companies/groupe-dissan/knowledge-base/analytics?period=30`;
  console.log('URL:', url);

  const response = await fetch(url);

  console.log('Status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
    return;
  }

  const data = await response.json();

  console.log('\nSummary:');
  console.log('Total documents:', data.stats.total);
  console.log('Total chunks:', data.stats.totalChunks);
  console.log('Average confidence:', data.stats.avgConfidence);
  console.log('Recent uploads:', data.stats.recentUploads);

  console.log('\nBy Status:');
  console.log('  Completed:', data.stats.byStatus.completed);
  console.log('  Processing:', data.stats.byStatus.processing);
  console.log('  Failed:', data.stats.byStatus.failed);
}

testAnalytics().catch(console.error);
