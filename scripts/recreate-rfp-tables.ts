import postgres from 'postgres';

async function recreateRfpTables() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🗑️  Dropping all RFP tables and views...\n');

    // Drop views first
    await sql`DROP VIEW IF EXISTS v_user_rfp_workload CASCADE;`;
    await sql`DROP VIEW IF EXISTS v_rfp_completion CASCADE;`;
    console.log('✅ Dropped views');

    // Drop tables in correct order (reverse of dependencies)
    await sql`DROP TABLE IF EXISTS rfp_analytics_events CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfp_exports CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfp_comments CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfp_responses CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfp_questions CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfp_sections CASCADE;`;
    await sql`DROP TABLE IF EXISTS response_library CASCADE;`;
    await sql`DROP TABLE IF EXISTS rfps CASCADE;`;
    console.log('✅ Dropped all RFP tables');

    console.log('\n🎉 RFP tables dropped successfully!');
    console.log('Now you can push the new schema with: npm run db:push');

    await sql.end();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

recreateRfpTables();
