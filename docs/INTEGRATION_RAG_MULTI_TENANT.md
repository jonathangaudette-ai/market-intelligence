# Intégration RAG + Multi-Tenant + Auth
## Comment Tout Connecter Ensemble

**Date:** 1er novembre 2025
**Objectif:** Guide complet pour intégrer le RAG engine avec votre architecture multi-tenant existante

---

## 📋 Table des Matières

1. [Vue d'Ensemble de l'Architecture](#vue-densemble-de-larchitecture)
2. [Adaptations du Schema de Base](#adaptations-du-schema-de-base)
3. [RAG Engine Multi-Tenant](#rag-engine-multi-tenant)
4. [API Endpoints avec Auth + Multi-Tenant](#api-endpoints-avec-auth--multi-tenant)
5. [Frontend Integration](#frontend-integration)
6. [Workflow Complet](#workflow-complet)
7. [Code Réutilisable](#code-réutilisable)

---

## 1. Vue d'Ensemble de l'Architecture

### 1.1 Stack Complet

```yaml
FRONTEND:
  framework: Next.js 14 (App Router)
  ui: Tailwind CSS + shadcn/ui
  chat: Vercel AI SDK
  auth_client: next-auth/react

BACKEND_AUTH:
  auth: next-auth@beta
  session: JWT + Database
  password: bcryptjs

BACKEND_DATA:
  orm: Drizzle ORM
  database: PostgreSQL (Supabase)
  vector_db: Pinecone (serverless)
  storage: Supabase Storage

AI_LAYER:
  llm: Claude Sonnet 4.5
  embeddings: OpenAI text-embedding-3-large
  rag: Custom RAG Engine (multi-tenant)

MULTI_TENANT:
  model: Company-based (companies table)
  isolation: company_id in all queries + Pinecone metadata
  switching: Cookie-based (activeCompanyId)
```

### 1.2 Flux de Données

```
User Login (NextAuth)
    ↓
JWT Token (userId + companyId)
    ↓
Select Active Company (cookie: activeCompanyId)
    ↓
Upload Document (PDF, website)
    ↓
Process: Extract → Chunk → Embed
    ↓
Store in Pinecone (metadata: tenant_id = companyId)
    ↓
Store metadata in PostgreSQL (documents table)
    ↓
User Query (Chat)
    ↓
RAG: Retrieve (filtered by companyId) → Synthesize (Claude)
    ↓
Response with Citations
```

---

## 2. Adaptations du Schema de Base

### 2.1 Schema Additions (Drizzle)

```typescript
// db/schema.ts - ADDITIONS to existing schema

import { pgTable, varchar, timestamp, boolean, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

// ============================================================================
// Competitors Table (scoped by company)
// ============================================================================

export const competitors = pgTable("competitors", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  linkedinId: varchar("linkedin_id", { length: 255 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),

  // Tracking status
  isActive: boolean("is_active").notNull().default(true),
  priority: varchar("priority", { length: 50 }).default("medium"), // high, medium, low

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdx: index("idx_competitors_company").on(table.companyId),
}));

// ============================================================================
// Documents Table (RAG documents - scoped by company)
// ============================================================================

export const documents = pgTable("documents", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  competitorId: varchar("competitor_id", { length: 255 })
    .references(() => competitors.id, { onDelete: "set null" }),

  name: varchar("name", { length: 500 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // pdf, website, news_article
  sourceType: varchar("source_type", { length: 50 }).notNull(), // manual_upload, web_crawl, api
  sourceUrl: text("source_url"),

  // File info (if uploaded)
  fileSizeBytes: integer("file_size_bytes"),
  storagePath: text("storage_path"),

  // Processing status
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  totalChunks: integer("total_chunks"),
  vectorsCreated: boolean("vectors_created").default(false),

  // Metadata
  uploadedBy: varchar("uploaded_by", { length: 255 })
    .references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  companyIdx: index("idx_documents_company").on(table.companyId),
  competitorIdx: index("idx_documents_competitor").on(table.competitorId),
  statusIdx: index("idx_documents_status").on(table.status),
}));

// ============================================================================
// Conversations Table (Chat history - scoped by company)
// ============================================================================

export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 500 }), // Auto-generated or user-defined

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyIdx: index("idx_conversations_company").on(table.companyId),
  userIdx: index("idx_conversations_user").on(table.userId),
}));

// ============================================================================
// Messages Table (Individual chat messages)
// ============================================================================

export const messages = pgTable("messages", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 })
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),

  role: varchar("role", { length: 50 }).notNull(), // user, assistant
  content: text("content").notNull(),

  // RAG metadata (if assistant message)
  sources: jsonb("sources"), // Array of sources used
  model: varchar("model", { length: 100 }), // claude-sonnet-4.5-20250514
  tokensUsed: integer("tokens_used"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  conversationIdx: index("idx_messages_conversation").on(table.conversationId),
  createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
}));

// ============================================================================
// Relations
// ============================================================================

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  company: one(companies, {
    fields: [competitors.companyId],
    references: [companies.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
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

// ============================================================================
// TypeScript Types
// ============================================================================

export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

### 2.2 Migration SQL

```sql
-- Create competitors table
CREATE TABLE competitors (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  linkedin_id VARCHAR(255),
  website VARCHAR(500),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority VARCHAR(50) DEFAULT 'medium',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competitors_company ON competitors(company_id);

-- Create documents table
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  competitor_id VARCHAR(255) REFERENCES competitors(id) ON DELETE SET NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_url TEXT,
  file_size_bytes INTEGER,
  storage_path TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  total_chunks INTEGER,
  vectors_created BOOLEAN DEFAULT false,
  uploaded_by VARCHAR(255) REFERENCES users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_competitor ON documents(competitor_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Create conversations table
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_company ON conversations(company_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);

-- Create messages table
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  model VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

---

## 3. RAG Engine Multi-Tenant

### 3.1 Core RAG Service

```typescript
// lib/services/rag-engine.ts

import { Pinecone } from "@pinecone-database/pinecone";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "intelligence");

export class MultiTenantRAGEngine {
  /**
   * Create embeddings from text
   */
  async embed(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    return response.data[0].embedding;
  }

  /**
   * Upsert document chunks to Pinecone with company isolation
   *
   * @param companyId - Company ID for tenant isolation (CRITICAL!)
   */
  async upsertDocument(params: {
    companyId: string;
    documentId: string;
    chunks: string[];
    metadata: {
      documentName: string;
      documentType: string;
      competitorId?: string;
      competitorName?: string;
      category?: string;
      sourceUrl?: string;
    };
  }): Promise<number> {
    const { companyId, documentId, chunks, metadata } = params;

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.embed(chunk);

      vectors.push({
        id: `${documentId}_chunk_${i}`,
        values: embedding,
        metadata: {
          // ═══ TENANT ISOLATION ═══
          tenant_id: companyId, // ← CRITICAL: Company isolation

          // ═══ DOCUMENT INFO ═══
          document_id: documentId,
          document_name: metadata.documentName,
          document_type: metadata.documentType,
          chunk_index: i,
          total_chunks: chunks.length,

          // ═══ COMPETITIVE INTEL ═══
          competitor_id: metadata.competitorId,
          competitor_name: metadata.competitorName,
          category: metadata.category || "general",

          // ═══ SOURCE ═══
          source_url: metadata.sourceUrl,

          // ═══ CONTENT (for citations) ═══
          text: chunk,

          // ═══ TIMESTAMP ═══
          uploaded_at: Date.now(),
        },
      });
    }

    // Batch upsert (Pinecone supports up to 100 vectors per request)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    return vectors.length;
  }

  /**
   * Query RAG with company isolation
   *
   * @param companyId - Company ID for tenant isolation (MANDATORY)
   */
  async query(params: {
    companyId: string;
    queryText: string;
    filters?: Record<string, any>;
    topK?: number;
  }): Promise<Array<{
    text: string;
    source: string;
    competitor?: string;
    score: number;
    documentId: string;
  }>> {
    const { companyId, queryText, filters = {}, topK = 5 } = params;

    // Embed query
    const queryEmbedding = await this.embed(queryText);

    // Build filter with MANDATORY tenant_id
    const baseFilter = { tenant_id: { $eq: companyId } };

    const finalFilter =
      Object.keys(filters).length > 0
        ? { $and: [baseFilter, filters] }
        : baseFilter;

    // Query Pinecone
    const results = await index.query({
      vector: queryEmbedding,
      filter: finalFilter,
      topK,
      includeMetadata: true,
    });

    // Extract results
    return results.matches.map((match) => ({
      text: match.metadata?.text as string,
      source: match.metadata?.document_name as string,
      competitor: match.metadata?.competitor_name as string,
      score: match.score || 0,
      documentId: match.metadata?.document_id as string,
    }));
  }

  /**
   * Generate answer using Claude with RAG context
   */
  async synthesize(params: {
    query: string;
    retrievedDocs: Array<{
      text: string;
      source: string;
      competitor?: string;
    }>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<{ answer: string; model: string; tokensUsed: number }> {
    const { query, retrievedDocs, conversationHistory = [] } = params;

    // Build context
    const contextText = retrievedDocs
      .map(
        (doc, idx) =>
          `[Source ${idx + 1}: ${doc.source}${doc.competitor ? ` - ${doc.competitor}` : ""}]\n${doc.text}`
      )
      .join("\n\n");

    // Build messages
    const messages = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: `Answer the following question using ONLY the provided context. Always cite your sources.

<context>
${contextText}
</context>

<question>
${query}
</question>

Instructions:
- Answer in the same language as the question (French or English)
- Be concise but complete
- Always cite sources: [Source 1], [Source 2], etc.
- If context doesn't contain the answer, say so clearly
- Provide strategic insights when relevant`,
      },
    ];

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4.5-20250514",
      max_tokens: 4000,
      messages,
    });

    return {
      answer: response.content[0].type === "text" ? response.content[0].text : "",
      model: "claude-sonnet-4.5-20250514",
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Delete all vectors for a document
   */
  async deleteDocument(params: {
    companyId: string;
    documentId: string;
  }): Promise<void> {
    const { companyId, documentId } = params;

    // Delete with filter (safety check: must match both companyId and documentId)
    await index.deleteMany({
      filter: {
        $and: [
          { tenant_id: { $eq: companyId } },
          { document_id: { $eq: documentId } },
        ],
      },
    });
  }

  /**
   * Full RAG pipeline: retrieve + synthesize
   */
  async chat(params: {
    companyId: string;
    query: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    filters?: Record<string, any>;
  }): Promise<{
    answer: string;
    sources: Array<{ source: string; competitor?: string; relevance: number }>;
    model: string;
    tokensUsed: number;
  }> {
    const { companyId, query, conversationHistory, filters } = params;

    // 1. Retrieve relevant documents
    const retrievedDocs = await this.query({
      companyId,
      queryText: query,
      filters,
      topK: 5,
    });

    // 2. Synthesize answer
    const { answer, model, tokensUsed } = await this.synthesize({
      query,
      retrievedDocs,
      conversationHistory,
    });

    // 3. Return answer with sources
    return {
      answer,
      sources: retrievedDocs.map((doc) => ({
        source: doc.source,
        competitor: doc.competitor,
        relevance: doc.score,
      })),
      model,
      tokensUsed,
    };
  }
}

// Export singleton instance
export const ragEngine = new MultiTenantRAGEngine();
```

---

## 4. API Endpoints avec Auth + Multi-Tenant

### 4.1 Chat API Route

```typescript
// app/api/companies/[slug]/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getCurrentCompany } from "@/lib/current-company";
import { ragEngine } from "@/lib/services/rag-engine";
import { db } from "@/lib/db";
import { conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // 1. Verify authentication
  const { error: authError, session } = await verifyAuth();
  if (!session) return authError!;

  // 2. Verify company context
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return NextResponse.json(
      { error: "No active company" },
      { status: 400 }
    );
  }

  // 3. Verify company slug matches
  if (currentCompany.company.slug !== params.slug) {
    return NextResponse.json(
      { error: "Company mismatch" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { message, conversationId, filters } = body;

    // 4. Get or create conversation
    let convId = conversationId;

    if (!convId) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          id: createId(),
          companyId: currentCompany.company.id,
          userId: session.user.id,
          title: message.slice(0, 100), // First 100 chars as title
        })
        .returning();

      convId = newConversation.id;
    } else {
      // Verify conversation belongs to current company
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, convId))
        .limit(1);

      if (!conversation || conversation.companyId !== currentCompany.company.id) {
        return NextResponse.json(
          { error: "Conversation not found or access denied" },
          { status: 403 }
        );
      }
    }

    // 5. Get conversation history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const conversationHistory = history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // 6. Query RAG with company isolation
    const result = await ragEngine.chat({
      companyId: currentCompany.company.id, // ← TENANT ISOLATION
      query: message,
      conversationHistory,
      filters,
    });

    // 7. Save messages to database
    await db.insert(messages).values([
      {
        id: createId(),
        conversationId: convId,
        role: "user",
        content: message,
      },
      {
        id: createId(),
        conversationId: convId,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        model: result.model,
        tokensUsed: result.tokensUsed,
      },
    ]);

    // 8. Return response
    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      conversationId: convId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 4.2 Upload Document API

```typescript
// app/api/companies/[slug]/documents/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getCurrentCompany } from "@/lib/current-company";
import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { ragEngine } from "@/lib/services/rag-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // 1. Verify auth
  const { error: authError, session } = await verifyAuth();
  if (!session) return authError!;

  // 2. Verify company
  const currentCompany = await getCurrentCompany();
  if (!currentCompany || currentCompany.company.slug !== params.slug) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const competitorId = formData.get("competitorId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Create document record
    const documentId = createId();

    const [document] = await db
      .insert(documents)
      .values({
        id: documentId,
        companyId: currentCompany.company.id,
        competitorId: competitorId || null,
        name: file.name,
        type: file.type.includes("pdf") ? "pdf" : "other",
        sourceType: "manual_upload",
        fileSizeBytes: file.size,
        status: "processing",
        uploadedBy: session.user.id,
      })
      .returning();

    // 4. Process document asynchronously (background job)
    processDocumentBackground({
      documentId,
      file,
      companyId: currentCompany.company.id,
      competitorId: competitorId || undefined,
    });

    return NextResponse.json({
      success: true,
      documentId,
      status: "processing",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

async function processDocumentBackground(params: {
  documentId: string;
  file: File;
  companyId: string;
  competitorId?: string;
}) {
  try {
    const { documentId, file, companyId, competitorId } = params;

    // 1. Extract text from PDF (pseudo-code - use pdf-parse or similar)
    const text = await extractTextFromPDF(file);

    // 2. Chunk text
    const chunks = chunkText(text, { chunkSize: 1000, overlap: 200 });

    // 3. Get competitor info if provided
    let competitorName: string | undefined;
    if (competitorId) {
      const [competitor] = await db
        .select()
        .from(competitors)
        .where(eq(competitors.id, competitorId))
        .limit(1);

      competitorName = competitor?.name;
    }

    // 4. Upsert to Pinecone with company isolation
    const numVectors = await ragEngine.upsertDocument({
      companyId, // ← TENANT ISOLATION
      documentId,
      chunks,
      metadata: {
        documentName: file.name,
        documentType: "pdf",
        competitorId,
        competitorName,
        category: "general",
      },
    });

    // 5. Update document status
    await db
      .update(documents)
      .set({
        status: "completed",
        totalChunks: chunks.length,
        vectorsCreated: true,
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    console.log(`✅ Document ${documentId} processed: ${numVectors} vectors created`);
  } catch (error) {
    console.error("Processing error:", error);

    // Update status to failed
    await db
      .update(documents)
      .set({ status: "failed" })
      .where(eq(documents.id, params.documentId));
  }
}

// Helper functions (pseudo-code)
async function extractTextFromPDF(file: File): Promise<string> {
  // Use pdf-parse or similar library
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // const data = await pdf(buffer);
  // return data.text;
  return "Extracted text..."; // Placeholder
}

function chunkText(
  text: string,
  options: { chunkSize: number; overlap: number }
): string[] {
  const { chunkSize, overlap } = options;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}
```

---

## 5. Frontend Integration

### 5.1 Chat Interface Component

```tsx
// app/companies/[slug]/chat/page.tsx

import { getCurrentCompany } from "@/lib/current-company";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage({ params }: { params: { slug: string } }) {
  const currentCompany = await getCurrentCompany();

  if (!currentCompany || currentCompany.company.slug !== params.slug) {
    redirect("/");
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold">
          Intelligence Assistant - {currentCompany.company.name}
        </h1>
      </header>
      <ChatInterface companySlug={params.slug} />
    </div>
  );
}
```

```tsx
// components/chat/chat-interface.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function ChatInterface({ companySlug }: { companySlug: string }) {
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    sources?: Array<{ source: string; competitor?: string }>;
  }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // Call API
      const response = await fetch(`/api/companies/${companySlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add assistant message to UI
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);

      // Update conversation ID
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, une erreur est survenue. Veuillez réessayer.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Posez une question sur vos concurrents...
          </div>
        ) : (
          messages.map((message, idx) => (
            <Card
              key={idx}
              className={`p-4 ${
                message.role === "user"
                  ? "bg-blue-50 ml-auto max-w-[80%]"
                  : "bg-gray-50 mr-auto max-w-[80%]"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <p className="font-semibold mb-1">Sources:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {message.sources.map((source, i) => (
                      <li key={i}>
                        {source.source}
                        {source.competitor && ` (${source.competitor})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))
        )}

        {loading && (
          <Card className="p-4 bg-gray-50 mr-auto max-w-[80%]">
            <p className="text-gray-500">Analyse en cours...</p>
          </Card>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## 6. Workflow Complet

### 6.1 User Journey

```
1. LOGIN
   User → /login → NextAuth credentials
   → JWT token with { userId, companyId, isSuperAdmin }

2. SELECT COMPANY
   User → CompanySwitcher (header)
   → Cookie: activeCompanyId = company.id
   → Redirect to /companies/[slug]/dashboard

3. UPLOAD DOCUMENT
   User → /companies/[slug]/documents/upload
   → Upload PDF about competitor
   → Backend:
      • Verify company access (getCurrentCompany)
      • Store file + metadata in PostgreSQL
      • Background job:
         - Extract text from PDF
         - Chunk text (1000 chars, 200 overlap)
         - Create embeddings (OpenAI)
         - Upsert to Pinecone with metadata.tenant_id = companyId
      • Update document status: "completed"

4. CHAT WITH RAG
   User → /companies/[slug]/chat
   → Type: "What are Acme's strengths?"
   → Backend:
      • Verify company access
      • Embed query (OpenAI)
      • Query Pinecone with filter: { tenant_id: companyId }
      • Retrieve top 5 relevant chunks
      • Send to Claude Sonnet 4.5 with context
      • Generate answer with citations
      • Save conversation + messages to PostgreSQL
   → User sees answer with sources

5. COMPANY SWITCHING
   User → CompanySwitcher → Select different company
   → Cookie updated: activeCompanyId = newCompanyId
   → Redirect to /companies/[newSlug]/dashboard
   → All queries now isolated to new company!
```

---

## 7. Code Réutilisable

### 7.1 Installation Checklist

```bash
# 1. Dependencies
npm install next-auth@beta bcryptjs
npm install @anthropic-ai/sdk openai @pinecone-database/pinecone
npm install drizzle-orm postgres
npm install @paralleldrive/cuid2
npm install -D @types/bcryptjs

# 2. Environment variables
cp .env.example .env.local

# Edit .env.local:
# AUTH_SECRET=... (openssl rand -base64 32)
# DATABASE_URL=...
# PINECONE_API_KEY=...
# PINECONE_INDEX_NAME=intelligence
# ANTHROPIC_API_KEY=...
# OPENAI_API_KEY=...

# 3. Database
npx drizzle-kit push   # Push schema to database

# 4. Pinecone
# Create index "intelligence" (dimension: 3072, metric: cosine)
```

### 7.2 File Structure

```
market-intelligence-app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── companies/[slug]/
│   │       ├── chat/route.ts
│   │       └── documents/upload/route.ts
│   ├── companies/[slug]/
│   │   ├── chat/page.tsx
│   │   └── documents/page.tsx
│   └── login/page.tsx
├── components/
│   ├── chat/chat-interface.tsx
│   └── common/company-switcher.tsx
├── db/
│   └── schema.ts  (voir section 2.1)
├── lib/
│   ├── api-auth.ts  (depuis REUSABLE_AUTHENTICATION_SECURITY.md)
│   ├── current-company.ts  (depuis REUSABLE_MULTI_TENANT_ARCHITECTURE.md)
│   ├── db.ts
│   └── services/
│       └── rag-engine.ts  (voir section 3.1)
├── auth.ts  (depuis REUSABLE_AUTHENTICATION_SECURITY.md)
├── middleware.ts  (depuis REUSABLE_MULTI_TENANT_ARCHITECTURE.md)
└── .env.local
```

---

## 🎯 Prochaines Étapes

Maintenant que l'architecture est définie, voulez-vous:

**A.** Que je génère tous les fichiers de code complets maintenant?
**B.** Qu'on commence par un prototype minimal (1 company, upload PDF, chat)?
**C.** Qu'on implémente feature par feature ensemble?

Quelle approche préférez-vous? 🚀
