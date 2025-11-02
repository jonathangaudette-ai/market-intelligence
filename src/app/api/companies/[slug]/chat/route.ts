import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getCurrentCompany } from "@/lib/auth/helpers";
import { ragEngine } from "@/lib/rag/engine";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    // 1. Verify authentication
    const { error: authError, session } = await verifyAuth();
    if (!session) return authError;

    // 2. Verify company context
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) {
      return NextResponse.json({ error: "No active company" }, { status: 403 });
    }

    // 3. Verify company slug matches
    const { slug } = await params;
    if (currentCompany.company.slug !== slug) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
    }

    // 4. Parse request body
    const body = await request.json();
    const { message, conversationId, filters } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 5. Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          companyId: currentCompany.company.id,
          userId: session.user.id,
          title: message.slice(0, 100), // First message as title
        })
        .returning();

      activeConversationId = newConversation.id;
    }

    // 6. Get conversation history
    const conversationHistory = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.conversationId, activeConversationId))
      .orderBy(messages.createdAt)
      .limit(10); // Last 10 messages for context

    // 7. Query RAG with company isolation
    const result = await ragEngine.chat({
      companyId: currentCompany.company.id, // ← TENANT ISOLATION
      query: message,
      conversationHistory,
      filters,
    });

    // 8. Save user message and assistant response
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

    // 9. Return response
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
