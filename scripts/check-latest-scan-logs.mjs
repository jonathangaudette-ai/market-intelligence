#!/usr/bin/env node
/**
 * Check logs from latest scan
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  console.log('📊 Latest Scan Details\n');

  // Get latest scan
  const [scan] = await sql`
    SELECT
      id,
      competitor_id,
      status,
      current_step,
      progress_current,
      products_scraped,
      products_matched,
      products_failed,
      logs,
      created_at
    FROM pricing_scans
    WHERE company_id = (SELECT id FROM companies WHERE slug = 'my-company')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!scan) {
    console.log('❌ No scans found');
    process.exit(1);
  }

  console.log(`Scan ID: ${scan.id}`);
  console.log(`Status: ${scan.status}`);
  console.log(`Current Step: ${scan.current_step || 'N/A'}`);
  console.log(`Progress: ${scan.progress_current || 0}%`);
  console.log(`Created: ${scan.created_at.toISOString()}\n`);

  console.log('Results:');
  console.log(`  Products scraped: ${scan.products_scraped}`);
  console.log(`  Products matched: ${scan.products_matched}`);
  console.log(`  Products failed: ${scan.products_failed}\n`);

  if (scan.logs && Array.isArray(scan.logs)) {
    console.log(`📝 Logs (${scan.logs.length} total):\n`);

    // Show all logs
    scan.logs.forEach((log, i) => {
      const icon =
        log.type === 'error' ? '❌' :
        log.type === 'success' ? '✅' :
        log.type === 'progress' ? '🔄' :
        'ℹ️';

      console.log(`${i + 1}. ${icon} [${log.type}] ${log.message}`);

      if (log.metadata) {
        console.log(`   Metadata:`, JSON.stringify(log.metadata, null, 2));
      }
    });

    // Check for GPT-5 specific logs
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const gpt5Logs = scan.logs.filter(log =>
      log.message && (
        log.message.includes('GPT-5') ||
        log.message.includes('Discovering') ||
        log.message.includes('URLs discovered')
      )
    );

    if (gpt5Logs.length > 0) {
      console.log(`✅ GPT-5 Search Logs Found (${gpt5Logs.length}):\n`);
      gpt5Logs.forEach((log, i) => {
        console.log(`${i + 1}. [${log.type}] ${log.message}`);
        if (log.metadata) {
          console.log(`   Metadata:`, JSON.stringify(log.metadata, null, 2));
        }
      });
    } else {
      console.log('⚠️  No GPT-5 Search logs found');
      console.log('   Possible reasons:');
      console.log('   - All products had cached URLs (100% cache hit)');
      console.log('   - GPT-5 Search step was skipped');
      console.log('   - Old code is still deployed\n');
    }
  } else {
    console.log('⚠️  No logs found in scan');
  }

  await sql.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
