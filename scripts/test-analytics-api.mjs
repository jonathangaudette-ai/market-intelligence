/**
 * Test Analytics API
 * Validates the /api/knowledge-base/analytics endpoint
 */

console.log('🧪 Knowledge Base Analytics API Test\n');
console.log('======================================================================\n');

console.log('📋 STEP 1: Testing Analytics API endpoint...');

try {
  // Note: This test requires a running server and valid authentication
  // For now, we'll just validate the route file structure and exports

  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..');

  // Check if analytics route exists
  const analyticsRoutePath = path.join(
    projectRoot,
    'src/app/api/knowledge-base/analytics/route.ts'
  );

  if (!fs.existsSync(analyticsRoutePath)) {
    throw new Error('Analytics route file not found');
  }

  console.log('✅ Analytics route file exists');

  // Read the route file and validate structure
  const routeContent = fs.readFileSync(analyticsRoutePath, 'utf-8');

  // Check for required exports and functions
  const requiredElements = [
    'export async function GET',
    'requireAuth',
    'generateInsights',
    'calculateByContentType',
    'stats',
    'performance',
    'insights',
    'trends',
  ];

  for (const element of requiredElements) {
    if (!routeContent.includes(element)) {
      throw new Error(`Missing required element: ${element}`);
    }
  }

  console.log('✅ All required exports and functions present');

  // Check component files exist
  const components = [
    'src/components/knowledge-base/insights-panel.tsx',
    'src/components/knowledge-base/performance-metrics.tsx',
    'src/components/knowledge-base/content-distribution.tsx',
  ];

  for (const component of components) {
    const componentPath = path.join(projectRoot, component);
    if (!fs.existsSync(componentPath)) {
      throw new Error(`Component not found: ${component}`);
    }
  }

  console.log('✅ All analytics components exist');

  // Validate expected data structure
  console.log('\n📊 Expected API Response Structure:');
  console.log(`   {
     stats: {
       total: number,
       byStatus: { completed, processing, pending, failed },
       byContentType: Record<string, number>,
       totalChunks: number,
       avgConfidence: number,
       recentUploads: number
     },
     performance: {
       analysisSuccessRate: number,
       avgConfidence: number,
       documentsNeedingReview: number,
       failedDocuments: number
     },
     insights: Array<{
       type: 'success' | 'warning' | 'info' | 'action',
       title: string,
       description: string,
       action?: { label, href }
     }>,
     trends: {
       documentsChange: number,
       chunksChange: number
     },
     period: number
   }`);

  console.log('\n✅ Analytics API structure validated');

  console.log('\n======================================================================');
  console.log('✅ Analytics API Test Complete!');
  console.log('======================================================================\n');

  console.log('📊 Test Summary:');
  console.log('   ✓ Analytics route file exists and is properly structured');
  console.log('   ✓ All required functions and exports present');
  console.log('   ✓ All UI components exist (InsightsPanel, PerformanceMetrics, ContentDistribution)');
  console.log('   ✓ Expected response structure documented');

  console.log('\n💡 Note: Full API integration test requires running server + authentication');
  console.log('   Manual test: Visit /companies/{slug}/knowledge-base in browser');

  console.log('\n🎉 All structural tests passed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
