import { pgTable, varchar, timestamp, boolean, integer, text, jsonb, uniqueIndex, uuid as pgUuid, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { v4 as uuidv4 } from 'uuid';

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: varchar("logo", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").$type<{
    aiModel?: 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001';
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Prompt Templates table (for configurable AI prompts)
export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
    companyId: varchar("company_id", { length: 255 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Prompt identification
    promptKey: varchar("prompt_key", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),

    // Prompt content
    systemPrompt: text("system_prompt"),
    userPromptTemplate: text("user_prompt_template").notNull(),

    // Configuration overrides
    modelId: varchar("model_id", { length: 100 }),
    temperature: numeric("temperature", { precision: 3, scale: 2 }),
    maxTokens: integer("max_tokens"),

    // Metadata
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    variables: jsonb("variables").$type<Array<{
      key: string;
      description: string;
      required: boolean;
      defaultValue?: string;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      example?: string;
    }>>(),

    // Versioning
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    companyPromptIdx: uniqueIndex("company_prompt_idx").on(table.companyId, table.promptKey),
  })
);

// Company members table (junction table)
export const companyMembers = pgTable(
  "company_members",
  {
    id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: varchar("company_id", { length: 255 })
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull().default("viewer"), // admin, editor, viewer
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userCompanyIdx: uniqueIndex("user_company_idx").on(table.userId, table.companyId),
  })
);

// Competitors table
export const competitors = pgTable("competitors", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  linkedinId: varchar("linkedin_id", { length: 255 }),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 255 }),
  description: text("description"),
  logo: varchar("logo", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  priority: varchar("priority", { length: 50 }).default("medium"), // high, medium, low
  metadata: jsonb("metadata"), // Flexible additional data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 }).references(() => competitors.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 500 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // pdf, website, linkedin, manual
  sourceUrl: varchar("source_url", { length: 1000 }),
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  totalChunks: integer("total_chunks"),
  vectorsCreated: boolean("vectors_created").default(false),
  errorMessage: text("error_message"),
  uploadedBy: varchar("uploaded_by", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),

  // Intelligent analysis fields
  documentType: varchar("document_type", { length: 50 }), // competitive_report, financial_report, contract, rfp, etc.
  analysisCompleted: boolean("analysis_completed").default(false),
  analysisConfidence: integer("analysis_confidence"), // 0-100

  // RAG Support Documents fields (Phase 0.5 - Support Docs RAG v4)
  documentPurpose: varchar("document_purpose", { length: 50 }).$type<'rfp_response' | 'rfp_support' | 'company_info'>(), // Purpose of document for RAG
  contentType: varchar("content_type", { length: 100 }), // methodology_guide, case_study, technical_spec, etc.
  contentTypeTags: text("content_type_tags").array(), // Array of content tags for categorization
  isHistoricalRfp: boolean("is_historical_rfp").default(false), // True for historical RFP responses

  // Progress tracking for real-time updates
  processingSteps: jsonb("processing_steps"), // Array of { step: string, status: 'pending'|'in_progress'|'completed'|'failed', timestamp: number }

  metadata: jsonb("metadata"), // Full analysis metadata (DocumentMetadata type)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), // user, assistant
  content: text("content").notNull(),
  sources: jsonb("sources"), // Array of sources from RAG
  model: varchar("model", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Signals table (detected from document analysis)
export const signals = pgTable("signals", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  documentId: varchar("document_id", { length: 255 })
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 }).references(() => competitors.id, {
    onDelete: "set null",
  }),

  type: varchar("type", { length: 50 }).notNull(), // competitor_mention, price_change, hiring_spike, new_product, contract_win
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high
  summary: text("summary").notNull(),
  details: text("details"),
  relatedEntities: jsonb("related_entities"), // Array of competitor names, products, etc.

  status: varchar("status", { length: 50 }).default("new"), // new, reviewed, archived
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  companyMembers: many(companyMembers),
  conversations: many(conversations),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
  competitors: many(competitors),
  documents: many(documents),
  conversations: many(conversations),
  signals: many(signals),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  user: one(users, {
    fields: [companyMembers.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [companyMembers.companyId],
    references: [companies.id],
  }),
}));

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  company: one(companies, {
    fields: [competitors.companyId],
    references: [companies.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
  competitor: one(competitors, {
    fields: [documents.competitorId],
    references: [competitors.id],
  }),
  uploadedByUser: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  signals: many(signals),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  company: one(companies, {
    fields: [conversations.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  company: one(companies, {
    fields: [signals.companyId],
    references: [companies.id],
  }),
  document: one(documents, {
    fields: [signals.documentId],
    references: [documents.id],
  }),
  competitor: one(competitors, {
    fields: [signals.competitorId],
    references: [competitors.id],
  }),
  reviewedByUser: one(users, {
    fields: [signals.reviewedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// RFP MODULE TABLES
// ============================================================================

// RFPs table
export const rfps = pgTable("rfps", {
  id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey(),

  // Basic information
  title: varchar("title", { length: 500 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientIndustry: varchar("client_industry", { length: 100 }),

  // RFP Mode (NEW - for surgical retrieval)
  mode: varchar("mode", { length: 20 }).default("active"), // active, historical, template
  isHistorical: boolean("is_historical").default(false),

  // Original file
  originalFilename: varchar("original_filename", { length: 255 }),
  originalFileUrl: text("original_file_url"),
  fileSizeBytes: integer("file_size_bytes"),
  fileType: varchar("file_type", { length: 50 }),

  // Parsing status
  parsingStatus: varchar("parsing_status", { length: 50 }).default("pending"), // pending, processing, extracted, completed, failed
  parsingError: text("parsing_error"),
  parsedAt: timestamp("parsed_at"),

  // Parsing progress tracking
  parsingStage: varchar("parsing_stage", { length: 50 }), // downloading, parsing, extracting, categorizing, saving
  parsingProgressCurrent: integer("parsing_progress_current").default(0), // Current batch/step number
  parsingProgressTotal: integer("parsing_progress_total").default(0), // Total batches/steps
  questionsExtracted: integer("questions_extracted").default(0), // Number of questions found so far
  parsingLogs: jsonb("parsing_logs").$type<Array<{
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'progress';
    stage: string;
    message: string;
    metadata?: Record<string, any>;
  }>>().default([]), // Detailed parsing event logs for advanced UI
  extractedQuestions: jsonb("extracted_questions"), // Temporary storage for extracted questions before categorization

  // RFP metadata
  submissionDeadline: timestamp("submission_deadline"),
  clientContactName: varchar("client_contact_name", { length: 255 }),
  clientContactEmail: varchar("client_contact_email", { length: 255 }),
  estimatedDealValue: integer("estimated_deal_value"),

  // Known competitors
  knownCompetitors: jsonb("known_competitors"), // Array of competitor names

  // Enrichment data for AI context
  extractedText: text("extracted_text"), // Full text extracted from PDF for RAG context
  manualEnrichment: jsonb("manual_enrichment").$type<{
    clientBackground?: string;
    keyNeeds?: string;
    constraints?: string;
    relationships?: string;
    customNotes?: string;
    lastUpdatedAt?: string;
    lastUpdatedBy?: string;
  }>(), // Manual context notes about the client/RFP
  linkedinEnrichment: jsonb("linkedin_enrichment").$type<{
    companyName?: string;
    companyUrl?: string;
    employeeCount?: string;
    industry?: string;
    specialties?: string[];
    description?: string;
    headquarters?: string;
    founded?: string;
    fetchedAt?: string;
    source?: 'proxycurl' | 'manual';
  }>(), // LinkedIn/Proxycurl company data

  // Status
  status: varchar("status", { length: 50 }).default("draft"), // draft, in_progress, in_review, approved, submitted, won, lost
  completionPercentage: integer("completion_percentage").default(0), // 0-100

  // Result
  result: varchar("result", { length: 50 }), // won, lost, no_decision
  resultCompetitor: varchar("result_competitor", { length: 255 }),
  resultNotes: text("result_notes"),
  resultRecordedAt: timestamp("result_recorded_at"),

  // Ownership & Collaboration
  ownerId: varchar("owner_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedUsers: jsonb("assigned_users"), // Array of user IDs

  // Company association
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Historical RFP fields (NEW - for surgical retrieval)
  submittedDocument: text("submitted_document"), // S3/Vercel Blob URL of submitted response
  outcomeNotes: text("outcome_notes"), // Notes about why won/lost
  qualityScore: integer("quality_score"), // 0-100 quality score
  usageCount: integer("usage_count").default(0), // How many times used as source
  lastUsedAt: timestamp("last_used_at"), // Last time used as source
  dealValue: integer("deal_value"), // Actual deal value if won

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),

  // Metadata
  metadata: jsonb("metadata"),

  // AI-Generated Intelligence Brief
  intelligenceBrief: jsonb("intelligence_brief"), // AI-generated executive summary for Go/No-Go decision
});

// RFP Questions table
export const rfpQuestions = pgTable("rfp_questions", {
  id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey(),
  rfpId: pgUuid("rfp_id")
    .notNull()
    .references(() => rfps.id, { onDelete: "cascade" }),

  // Question details
  sectionTitle: varchar("section_title", { length: 500 }),
  questionNumber: varchar("question_number", { length: 50 }),
  questionText: text("question_text").notNull(),
  requiresAttachment: boolean("requires_attachment").default(false),
  wordLimit: integer("word_limit"),

  // Categorization
  category: varchar("category", { length: 100 }), // technical, pricing, company_info, etc.
  tags: jsonb("tags"), // Array of tags
  difficulty: varchar("difficulty", { length: 20 }), // easy, medium, hard
  estimatedMinutes: integer("estimated_minutes"),

  // Content Type Classification (NEW - for surgical retrieval)
  contentTypes: jsonb("content_types").$type<string[]>().default([]), // Array of content types
  primaryContentType: varchar("primary_content_type", { length: 100 }), // Main content type
  detectionConfidence: integer("detection_confidence"), // 0-100 confidence score
  selectedSourceRfpId: pgUuid("selected_source_rfp_id"), // Selected source RFP for this question
  adaptationLevel: varchar("adaptation_level", { length: 20 }).default("contextual"), // verbatim, light, contextual, creative
  appliedFromSettings: boolean("applied_from_settings").default(false), // true if auto-configured

  // Status
  status: varchar("status", { length: 50 }).default("pending"), // pending, in_progress, completed, reviewed
  assignedTo: varchar("assigned_to", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),

  // Response
  hasResponse: boolean("has_response").default(false),
  responseQuality: integer("response_quality"), // 1-5 rating

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  metadata: jsonb("metadata"),
});

// RFP Responses table
export const rfpResponses = pgTable("rfp_responses", {
  id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey(),
  questionId: pgUuid("question_id")
    .notNull()
    .references(() => rfpQuestions.id, { onDelete: "cascade" }),

  // Response content
  responseText: text("response_text").notNull(),
  responseHtml: text("response_html"), // Formatted version
  wordCount: integer("word_count"),

  // Generation metadata
  wasAiGenerated: boolean("was_ai_generated").default(false),
  aiModel: varchar("ai_model", { length: 100 }),
  sourcesUsed: jsonb("sources_used"), // Array of source references
  confidenceScore: integer("confidence_score"), // 0-100

  // Surgical Retrieval metadata (NEW)
  sourceRfpIds: jsonb("source_rfp_ids").$type<string[]>().default([]), // RFP IDs used as sources
  adaptationUsed: varchar("adaptation_used", { length: 20 }), // Adaptation level used

  // Editing history
  version: integer("version").default(1),
  previousVersionId: varchar("previous_version_id", { length: 255 }),

  // Review status
  status: varchar("status", { length: 50 }).default("draft"), // draft, in_review, approved
  reviewedBy: varchar("reviewed_by", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  // Authorship
  createdBy: varchar("created_by", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  metadata: jsonb("metadata"),
});

// RFP Source Preferences table (NEW - for surgical retrieval)
export const rfpSourcePreferences = pgTable("rfp_source_preferences", {
  id: pgUuid("id").$defaultFn(() => uuidv4()).primaryKey(),
  rfpId: pgUuid("rfp_id")
    .notNull()
    .references(() => rfps.id, { onDelete: "cascade" })
    .unique(),

  // Smart defaults (AI-generated)
  defaultSourceStrategy: varchar("default_source_strategy", { length: 20 }).default("hybrid"), // auto, manual, hybrid
  defaultAdaptationLevel: varchar("default_adaptation_level", { length: 20 }).default("contextual"), // verbatim, light, contextual, creative

  // Simplified: top 3 sources per content-type (not 12 manual configs)
  suggestedSources: jsonb("suggested_sources").default({}), // Record<ContentType, string[]>
  // Format: { "project-methodology": ["rfp-id-1", "rfp-id-2", "rfp-id-3"] }

  // Global mandate context
  globalMandateContext: text("global_mandate_context"),

  // RAG filters (simplified)
  preferWonRfps: boolean("prefer_won_rfps").default(true),
  minQualityScore: integer("min_quality_score").default(70),

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// RFP Relations
export const rfpsRelations = relations(rfps, ({ one, many }) => ({
  company: one(companies, {
    fields: [rfps.companyId],
    references: [companies.id],
  }),
  owner: one(users, {
    fields: [rfps.ownerId],
    references: [users.id],
  }),
  questions: many(rfpQuestions),
  sourcePreferences: one(rfpSourcePreferences),
}));

export const rfpQuestionsRelations = relations(rfpQuestions, ({ one, many }) => ({
  rfp: one(rfps, {
    fields: [rfpQuestions.rfpId],
    references: [rfps.id],
  }),
  assignedUser: one(users, {
    fields: [rfpQuestions.assignedTo],
    references: [users.id],
  }),
  responses: many(rfpResponses),
}));

export const rfpResponsesRelations = relations(rfpResponses, ({ one }) => ({
  question: one(rfpQuestions, {
    fields: [rfpResponses.questionId],
    references: [rfpQuestions.id],
  }),
  createdByUser: one(users, {
    fields: [rfpResponses.createdBy],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [rfpResponses.reviewedBy],
    references: [users.id],
  }),
}));

export const rfpSourcePreferencesRelations = relations(rfpSourcePreferences, ({ one }) => ({
  rfp: one(rfps, {
    fields: [rfpSourcePreferences.rfpId],
    references: [rfps.id],
  }),
}));

// ============================================================================
// PRICING MODULE TABLES
// ============================================================================
export * from './schema-pricing';
