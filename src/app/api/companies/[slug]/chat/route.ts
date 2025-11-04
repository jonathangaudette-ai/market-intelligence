import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { ragEngine } from "@/lib/rag/engine";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // 1. Verify authentication using middleware
    const { slug } = await params;
    const authResult = await requireAuth("viewer", slug);
    if (!authResult.success) return authResult.error;

    const { session, company } = authResult.data;

    // 2. Parse request body
    const body = await request.json();
    const { message, conversationId, filters } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Validate message length
    const MAX_MESSAGE_LENGTH = 10000;
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // 3. Get or create conversation
    let activeConversationId = conversationId;
    let conversationHistory: Array<{ role: string; content: string }> = [];

    if (!activeConversationId) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          companyId: company.company.id,
          userId: session.user.id,
          title: message.slice(0, 100), // First message as title
        })
        .returning();

      activeConversationId = newConversation.id;
    } else {
      // 4. OPTIMIZED: Load conversation with messages in single query (fixes N+1)
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, activeConversationId),
        with: {
          messages: {
            orderBy: [desc(messages.createdAt)],
            limit: 10,
            columns: {
              role: true,
              content: true,
            },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      // Verify conversation belongs to company
      if (conversation.companyId !== company.company.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      conversationHistory = conversation.messages.reverse(); // Reverse to get chronological order
    }

    // 5. Query RAG with company isolation
    const result = await ragEngine.chat({
      companyId: company.company.id, // ← TENANT ISOLATION
      query: message,
      conversationHistory,
      filters,
    });

    // 6. Save user message and assistant response
    await db.insert(messages).values([
      {
        conversationId: activeConversationId,
        role: "user",
        content: message,
      },
      {
        conversationId: activeConversationId,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        model: result.model,
        tokensUsed: result.tokensUsed,
      },
    ]);

    // 7. Return response
    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      conversationId: activeConversationId,
      model: result.model,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
