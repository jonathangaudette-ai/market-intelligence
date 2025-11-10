-- ============================================================================
-- MODULE RFP RESPONSE ASSISTANT - DATABASE SCHEMA
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Date: 2025-11-10
-- ============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour recherche textuelle performante

-- ============================================================================
-- TABLE: rfps
-- Description: RFPs (Request for Proposal) uploadés et trackés
-- ============================================================================

CREATE TABLE rfps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Informations basiques
  title VARCHAR(500) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_industry VARCHAR(100), -- 'fintech', 'healthcare', 'retail', etc.

  -- Fichier original
  original_filename VARCHAR(255),
  original_file_url TEXT, -- URL vers stockage (Vercel Blob / R2)
  file_size_bytes INTEGER,
  file_type VARCHAR(50), -- 'pdf', 'docx', 'xlsx'

  -- Parsing status
  parsing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  parsing_error TEXT,
  parsed_at TIMESTAMP,

  -- Métadonnées du RFP
  submission_deadline TIMESTAMP,
  client_contact_name VARCHAR(255),
  client_contact_email VARCHAR(255),
  estimated_deal_value DECIMAL(12,2),

  -- Concurrents identifiés
  known_competitors TEXT[], -- Array de competitor names

  -- Statut du RFP
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'in_review', 'approved', 'submitted', 'won', 'lost'
  completion_percentage DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 100.00

  -- Résultat
  result VARCHAR(50), -- 'won', 'lost', 'no_decision'
  result_competitor VARCHAR(255), -- Concurrent qui a gagné (si lost)
  result_notes TEXT,
  result_recorded_at TIMESTAMP,

  -- Ownership & Collaboration
  owner_id UUID NOT NULL, -- User qui a créé le RFP
  assigned_users UUID[], -- Array de user IDs qui collaborent

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,

  -- Metadata flexible
  metadata JSONB DEFAULT '{}'
);

-- Index pour performance
CREATE INDEX idx_rfps_status ON rfps(status);
CREATE INDEX idx_rfps_owner ON rfps(owner_id);
CREATE INDEX idx_rfps_deadline ON rfps(submission_deadline);
CREATE INDEX idx_rfps_client ON rfps(client_name);
CREATE INDEX idx_rfps_result ON rfps(result);
CREATE INDEX idx_rfps_metadata ON rfps USING gin(metadata);

-- ============================================================================
-- TABLE: rfp_sections
-- Description: Sections/chapitres d'un RFP (pour structure hiérarchique)
-- ============================================================================

CREATE TABLE rfp_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,

  -- Hiérarchie
  parent_section_id UUID REFERENCES rfp_sections(id) ON DELETE SET NULL,
  section_order INTEGER NOT NULL, -- Ordre d'affichage

  -- Contenu
  section_number VARCHAR(50), -- '1.', '1.1', '2.3.1', etc.
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rfp_sections_rfp ON rfp_sections(rfp_id);
CREATE INDEX idx_rfp_sections_parent ON rfp_sections(parent_section_id);

-- ============================================================================
-- TABLE: rfp_questions
-- Description: Questions individuelles extraites du RFP
-- ============================================================================

CREATE TABLE rfp_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  section_id UUID REFERENCES rfp_sections(id) ON DELETE SET NULL,

  -- Numérotation et ordre
  question_number VARCHAR(50), -- '1.1', '2.3.4', etc.
  question_order INTEGER NOT NULL, -- Ordre dans le RFP

  -- Question
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'text', -- 'text', 'yes_no', 'multiple_choice', 'table', 'file_upload'

  -- Contraintes
  is_mandatory BOOLEAN DEFAULT FALSE,
  char_limit INTEGER, -- Limite de caractères (si spécifiée)
  word_limit INTEGER, -- Limite de mots
  page_limit INTEGER, -- Limite de pages

  -- Catégorisation (auto ou manuelle)
  category VARCHAR(100), -- 'company', 'product', 'pricing', 'technical', 'security', 'support', 'roadmap'
  subcategory VARCHAR(100),
  tags TEXT[], -- Tags flexibles

  -- Assignment
  assigned_to UUID, -- User ID responsable de répondre

  -- Statut de réponse
  response_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'draft', 'in_review', 'approved', 'rejected'

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_rfp_questions_rfp ON rfp_questions(rfp_id);
CREATE INDEX idx_rfp_questions_section ON rfp_questions(section_id);
CREATE INDEX idx_rfp_questions_category ON rfp_questions(category);
CREATE INDEX idx_rfp_questions_status ON rfp_questions(response_status);
CREATE INDEX idx_rfp_questions_assigned ON rfp_questions(assigned_to);
CREATE INDEX idx_rfp_questions_text_search ON rfp_questions USING gin(to_tsvector('english', question_text));

-- ============================================================================
-- TABLE: rfp_responses
-- Description: Réponses aux questions (avec versioning)
-- ============================================================================

CREATE TABLE rfp_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES rfp_questions(id) ON DELETE CASCADE,

  -- Contenu de la réponse
  response_text TEXT NOT NULL,
  response_html TEXT, -- Version HTML si formatage riche

  -- Metadata de génération
  generation_method VARCHAR(50), -- 'ai_generated', 'library_reused', 'manual', 'hybrid'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 (si AI generated)

  -- Sources utilisées (pour AI generation)
  sources_used JSONB DEFAULT '[]', -- Array of {doc_id, doc_name, relevance_score}

  -- Competitive positioning
  competitive_suggestions TEXT, -- Suggestions de différenciation
  competitive_warnings TEXT, -- Warnings si question expose une faiblesse

  -- Versioning
  version INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT TRUE,
  previous_version_id UUID REFERENCES rfp_responses(id),

  -- Review & Approval
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_review', 'approved', 'rejected'
  reviewed_by UUID, -- User ID du reviewer
  reviewed_at TIMESTAMP,
  review_comments TEXT,

  -- Quality metrics
  char_count INTEGER,
  word_count INTEGER,
  quality_score DECIMAL(3,2), -- 0.00 to 1.00 (computed)

  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_rfp_responses_question ON rfp_responses(question_id);
CREATE INDEX idx_rfp_responses_current ON rfp_responses(is_current_version) WHERE is_current_version = TRUE;
CREATE INDEX idx_rfp_responses_status ON rfp_responses(status);
CREATE INDEX idx_rfp_responses_creator ON rfp_responses(created_by);

-- ============================================================================
-- TABLE: response_library
-- Description: Bibliothèque de réponses réutilisables (golden responses)
-- ============================================================================

CREATE TABLE response_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Question pattern (pour matching)
  question_pattern TEXT NOT NULL, -- Question type générique
  question_keywords TEXT[], -- Keywords pour recherche
  question_embedding VECTOR(1536), -- Embedding pour semantic search (pgvector extension)

  -- Réponse
  response_text TEXT NOT NULL,
  response_html TEXT,

  -- Catégorisation
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  tags TEXT[],

  -- Context
  applicable_industries TEXT[], -- Industries où applicable
  applicable_deal_sizes VARCHAR(50)[], -- 'smb', 'mid-market', 'enterprise'
  competitive_context TEXT, -- Contre quels concurrents cette réponse fonctionne bien

  -- Provenance
  source_rfp_id UUID REFERENCES rfps(id), -- Si créé à partir d'un RFP spécifique
  source_rfp_won BOOLEAN, -- Si le RFP source a été gagné

  -- Quality & Usage metrics
  quality_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
  times_reused INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2), -- % de RFPs gagnés quand cette réponse utilisée
  last_used_at TIMESTAMP,

  -- Approval
  is_approved BOOLEAN DEFAULT FALSE,
  is_golden BOOLEAN DEFAULT FALSE, -- Marqué comme "golden response" recommandée
  approved_by UUID,
  approved_at TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Index
CREATE INDEX idx_response_library_category ON response_library(category);
CREATE INDEX idx_response_library_quality ON response_library(quality_score DESC);
CREATE INDEX idx_response_library_golden ON response_library(is_golden) WHERE is_golden = TRUE;
CREATE INDEX idx_response_library_keywords ON response_library USING gin(question_keywords);
CREATE INDEX idx_response_library_tags ON response_library USING gin(tags);
CREATE INDEX idx_response_library_text_search ON response_library USING gin(to_tsvector('english', question_pattern));

-- Note: Pour embeddings, nécessite extension pgvector
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE INDEX idx_response_library_embedding ON response_library USING ivfflat (question_embedding vector_cosine_ops);

-- ============================================================================
-- TABLE: response_usage_tracking
-- Description: Tracking de l'utilisation des réponses de la library
-- ============================================================================

CREATE TABLE response_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  library_response_id UUID NOT NULL REFERENCES response_library(id) ON DELETE CASCADE,
  rfp_question_id UUID NOT NULL REFERENCES rfp_questions(id) ON DELETE CASCADE,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,

  -- Adaptation
  was_modified BOOLEAN DEFAULT FALSE,
  modification_extent VARCHAR(50), -- 'minor', 'moderate', 'major'

  -- Outcome (rempli après résultat du RFP)
  rfp_result VARCHAR(50), -- 'won', 'lost', 'no_decision'

  -- Audit
  used_by UUID NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_tracking_library ON response_usage_tracking(library_response_id);
CREATE INDEX idx_usage_tracking_rfp ON response_usage_tracking(rfp_id);

-- ============================================================================
-- TABLE: rfp_comments
-- Description: Comments et feedback sur questions/réponses
-- ============================================================================

CREATE TABLE rfp_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target (question ou response)
  target_type VARCHAR(50) NOT NULL, -- 'question', 'response', 'rfp'
  target_id UUID NOT NULL, -- ID of question, response, or rfp

  -- Comment
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50), -- 'feedback', 'suggestion', 'approval_rejection_reason', 'question'

  -- Thread (pour replies)
  parent_comment_id UUID REFERENCES rfp_comments(id) ON DELETE CASCADE,

  -- Metadata
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,

  -- Audit
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rfp_comments_target ON rfp_comments(target_type, target_id);
CREATE INDEX idx_rfp_comments_parent ON rfp_comments(parent_comment_id);
CREATE INDEX idx_rfp_comments_unresolved ON rfp_comments(is_resolved) WHERE is_resolved = FALSE;

-- ============================================================================
-- TABLE: rfp_exports
-- Description: Historique des exports de RFPs
-- ============================================================================

CREATE TABLE rfp_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,

  -- Export details
  export_format VARCHAR(50) NOT NULL, -- 'docx', 'pdf'
  export_template VARCHAR(100), -- Template utilisé
  file_url TEXT, -- URL du fichier exporté
  file_size_bytes INTEGER,

  -- Audit
  exported_by UUID NOT NULL,
  exported_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rfp_exports_rfp ON rfp_exports(rfp_id);

-- ============================================================================
-- TABLE: rfp_analytics_events
-- Description: Events pour analytics (temps passé, actions, etc.)
-- ============================================================================

CREATE TABLE rfp_analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Context
  rfp_id UUID REFERENCES rfps(id) ON DELETE CASCADE,
  question_id UUID REFERENCES rfp_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Event
  event_type VARCHAR(100) NOT NULL, -- 'question_viewed', 'response_edited', 'ai_generated', 'library_searched', etc.
  event_data JSONB DEFAULT '{}', -- Flexible data pour chaque type d'event

  -- Timing
  duration_seconds INTEGER, -- Temps passé (si applicable)

  -- Audit
  occurred_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_rfp ON rfp_analytics_events(rfp_id);
CREATE INDEX idx_analytics_events_user ON rfp_analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON rfp_analytics_events(event_type);
CREATE INDEX idx_analytics_events_time ON rfp_analytics_events(occurred_at DESC);

-- ============================================================================
-- VIEWS: Vues utiles pour analytics et reporting
-- ============================================================================

-- Vue: RFP Completion Status
CREATE VIEW v_rfp_completion AS
SELECT
  r.id as rfp_id,
  r.title,
  r.client_name,
  r.status,
  COUNT(q.id) as total_questions,
  COUNT(CASE WHEN q.response_status = 'approved' THEN 1 END) as approved_questions,
  COUNT(CASE WHEN q.response_status IN ('draft', 'in_review') THEN 1 END) as in_progress_questions,
  COUNT(CASE WHEN q.response_status = 'pending' THEN 1 END) as pending_questions,
  ROUND(
    (COUNT(CASE WHEN q.response_status = 'approved' THEN 1 END)::DECIMAL / NULLIF(COUNT(q.id), 0)) * 100,
    2
  ) as completion_percentage
FROM rfps r
LEFT JOIN rfp_questions q ON q.rfp_id = r.id
GROUP BY r.id, r.title, r.client_name, r.status;

-- Vue: Library Response Performance
CREATE VIEW v_library_performance AS
SELECT
  rl.id as library_response_id,
  rl.question_pattern,
  rl.category,
  rl.quality_score,
  rl.times_reused,
  rl.is_golden,
  COUNT(rut.id) as total_usage,
  COUNT(CASE WHEN rut.rfp_result = 'won' THEN 1 END) as won_count,
  COUNT(CASE WHEN rut.rfp_result = 'lost' THEN 1 END) as lost_count,
  CASE
    WHEN COUNT(CASE WHEN rut.rfp_result IN ('won', 'lost') THEN 1 END) > 0 THEN
      ROUND(
        (COUNT(CASE WHEN rut.rfp_result = 'won' THEN 1 END)::DECIMAL /
         COUNT(CASE WHEN rut.rfp_result IN ('won', 'lost') THEN 1 END)) * 100,
        2
      )
    ELSE NULL
  END as win_rate_percentage
FROM response_library rl
LEFT JOIN response_usage_tracking rut ON rut.library_response_id = rl.id
GROUP BY rl.id, rl.question_pattern, rl.category, rl.quality_score, rl.times_reused, rl.is_golden;

-- Vue: User RFP Workload
CREATE VIEW v_user_rfp_workload AS
SELECT
  q.assigned_to as user_id,
  COUNT(DISTINCT q.rfp_id) as assigned_rfps,
  COUNT(q.id) as assigned_questions,
  COUNT(CASE WHEN q.response_status = 'pending' THEN 1 END) as pending_questions,
  COUNT(CASE WHEN q.response_status IN ('draft', 'in_review') THEN 1 END) as in_progress_questions,
  COUNT(CASE WHEN q.response_status = 'approved' THEN 1 END) as completed_questions
FROM rfp_questions q
JOIN rfps r ON r.id = q.rfp_id
WHERE r.status IN ('draft', 'in_progress', 'in_review')
  AND q.assigned_to IS NOT NULL
GROUP BY q.assigned_to;

-- ============================================================================
-- FUNCTIONS: Fonctions utilitaires
-- ============================================================================

-- Function: Update RFP completion percentage
CREATE OR REPLACE FUNCTION update_rfp_completion_percentage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rfps
  SET
    completion_percentage = (
      SELECT ROUND(
        (COUNT(CASE WHEN response_status = 'approved' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        2
      )
      FROM rfp_questions
      WHERE rfp_id = NEW.rfp_id
    ),
    updated_at = NOW()
  WHERE id = NEW.rfp_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update completion percentage when question status changes
CREATE TRIGGER trg_update_rfp_completion
AFTER INSERT OR UPDATE OF response_status ON rfp_questions
FOR EACH ROW
EXECUTE FUNCTION update_rfp_completion_percentage();

-- Function: Update library response quality score
CREATE OR REPLACE FUNCTION update_library_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE response_library
  SET
    quality_score = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0.50
          ELSE ROUND(
            (
              (COUNT(CASE WHEN rfp_result = 'won' THEN 1 END)::DECIMAL * 1.0) +
              (COUNT(CASE WHEN was_modified = FALSE THEN 1 END)::DECIMAL * 0.3)
            ) / (COUNT(*) * 1.3),
            2
          )
        END
      FROM response_usage_tracking
      WHERE library_response_id = NEW.library_response_id
    ),
    times_reused = (
      SELECT COUNT(*)
      FROM response_usage_tracking
      WHERE library_response_id = NEW.library_response_id
    ),
    last_used_at = NEW.used_at
  WHERE id = NEW.library_response_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update quality score when library response is used
CREATE TRIGGER trg_update_library_quality
AFTER INSERT OR UPDATE ON response_usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_library_quality_score();

-- Function: Auto-assign response status to approved
CREATE OR REPLACE FUNCTION update_question_status_on_response_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE rfp_questions
    SET response_status = 'approved'
    WHERE id = NEW.question_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync question status with response status
CREATE TRIGGER trg_sync_question_status
AFTER UPDATE OF status ON rfp_responses
FOR EACH ROW
EXECUTE FUNCTION update_question_status_on_response_approval();

-- ============================================================================
-- SAMPLE DATA (optionnel - pour développement)
-- ============================================================================

-- Uncomment pour insérer des données de test

/*
-- Sample RFP
INSERT INTO rfps (id, title, client_name, client_industry, status, owner_id, submission_deadline)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Enterprise SaaS Platform RFP',
  'Acme Corporation',
  'fintech',
  'in_progress',
  '00000000-0000-0000-0000-000000000099', -- Replace with real user ID
  NOW() + INTERVAL '14 days'
);

-- Sample Questions
INSERT INTO rfp_questions (rfp_id, question_number, question_order, question_text, category, is_mandatory)
VALUES
  ('00000000-0000-0000-0000-000000000001', '1.1', 1, 'Describe your company history and mission', 'company', true),
  ('00000000-0000-0000-0000-000000000001', '2.1', 2, 'What security certifications do you hold?', 'security', true),
  ('00000000-0000-0000-0000-000000000001', '3.1', 3, 'Describe your pricing model', 'pricing', true);
*/

-- ============================================================================
-- GRANTS & PERMISSIONS (à adapter selon votre setup)
-- ============================================================================

-- Example: Grant permissions to application role
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
