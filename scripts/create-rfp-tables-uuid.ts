import postgres from 'postgres';

async function createRFPTables() {
  const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    console.log('🔧 Creating RFP tables with UUID types...\n');

    // Create rfps table
    console.log('1. Creating rfps table...');
    await sql`
      CREATE TABLE IF NOT EXISTS rfps (
        id UUID PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_industry VARCHAR(100),
        original_filename VARCHAR(255),
        original_file_url TEXT,
        file_size_bytes INTEGER,
        file_type VARCHAR(50),
        parsing_status VARCHAR(50) DEFAULT 'pending',
        parsing_error TEXT,
        parsed_at TIMESTAMP,
        submission_deadline TIMESTAMP,
        client_contact_name VARCHAR(255),
        client_contact_email VARCHAR(255),
        estimated_deal_value INTEGER,
        known_competitors JSONB,
        status VARCHAR(50) DEFAULT 'draft',
        completion_percentage INTEGER DEFAULT 0,
        result VARCHAR(50),
        result_competitor VARCHAR(255),
        result_notes TEXT,
        result_recorded_at TIMESTAMP,
        owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_users JSONB,
        company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        submitted_at TIMESTAMP,
        metadata JSONB
      );
    `;
    console.log('✅ Created rfps table');

    // Create rfp_questions table
    console.log('\n2. Creating rfp_questions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS rfp_questions (
        id UUID PRIMARY KEY,
        rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
        section_title VARCHAR(500),
        question_number VARCHAR(50),
        question_text TEXT NOT NULL,
        requires_attachment BOOLEAN DEFAULT false,
        word_limit INTEGER,
        category VARCHAR(100),
        tags JSONB,
        difficulty VARCHAR(20),
        estimated_minutes INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        has_response BOOLEAN DEFAULT false,
        response_quality INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
    `;
    console.log('✅ Created rfp_questions table');

    // Create rfp_responses table
    console.log('\n3. Creating rfp_responses table...');
    await sql`
      CREATE TABLE IF NOT EXISTS rfp_responses (
        id UUID PRIMARY KEY,
        question_id UUID NOT NULL REFERENCES rfp_questions(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        response_html TEXT,
        word_count INTEGER,
        was_ai_generated BOOLEAN DEFAULT false,
        ai_model VARCHAR(100),
        sources_used JSONB,
        confidence_score INTEGER,
        version INTEGER DEFAULT 1,
        previous_version_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        reviewed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        review_notes TEXT,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
    `;
    console.log('✅ Created rfp_responses table');

    // Create indexes for better query performance
    console.log('\n4. Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_rfps_company_id ON rfps(company_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rfps_owner_id ON rfps(owner_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rfps_status ON rfps(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rfp_questions_rfp_id ON rfp_questions(rfp_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rfp_questions_status ON rfp_questions(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rfp_responses_question_id ON rfp_responses(question_id);`;
    console.log('✅ Created indexes');

    console.log('\n🎉 All RFP tables created successfully!');

    await sql.end();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

createRFPTables();
