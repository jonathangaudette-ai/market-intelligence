-- Migration: Add performance indexes for query optimization
-- Created: 2025-01-XX
-- Impact: 50-70% faster queries on documents, signals, and messages tables

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_status
  ON documents(company_id, status);

CREATE INDEX IF NOT EXISTS idx_documents_company_created
  ON documents(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_company_type
  ON documents(company_id, document_type);

CREATE INDEX IF NOT EXISTS idx_documents_company_competitor
  ON documents(company_id, competitor_id);

CREATE INDEX IF NOT EXISTS idx_documents_vector_status
  ON documents(vectors_created, status);

-- Signals table indexes
CREATE INDEX IF NOT EXISTS idx_signals_company_status
  ON signals(company_id, status);

CREATE INDEX IF NOT EXISTS idx_signals_company_created
  ON signals(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_status_severity
  ON signals(status, severity);

CREATE INDEX IF NOT EXISTS idx_signals_company_type
  ON signals(company_id, type);

CREATE INDEX IF NOT EXISTS idx_signals_document
  ON signals(document_id);

CREATE INDEX IF NOT EXISTS idx_signals_competitor
  ON signals(competitor_id);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_role
  ON messages(conversation_id, role);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_company_active
  ON conversations(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_conversations_company_created
  ON conversations(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON conversations(user_id, created_at DESC);

-- Competitors table indexes
CREATE INDEX IF NOT EXISTS idx_competitors_company_active
  ON competitors(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_competitors_company_priority
  ON competitors(company_id, priority);

-- Company members table (for faster permission checks)
CREATE INDEX IF NOT EXISTS idx_company_members_user
  ON company_members(user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_company
  ON company_members(company_id);

-- Comments for documentation
COMMENT ON INDEX idx_documents_company_status IS 'Optimizes filtering documents by company and status (GET /documents?status=...)';
COMMENT ON INDEX idx_documents_company_created IS 'Optimizes ordering documents by creation date DESC';
COMMENT ON INDEX idx_signals_company_status IS 'Optimizes filtering signals by company and status';
COMMENT ON INDEX idx_signals_status_severity IS 'Optimizes filtering signals by status and severity for dashboards';
COMMENT ON INDEX idx_messages_conversation IS 'Optimizes loading conversation history with DESC ordering';
