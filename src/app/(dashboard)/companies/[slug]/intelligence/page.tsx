"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, FileText, Building2, Sparkles, BookOpen, Trophy, Target, Package } from "lucide-react";
import { toast } from "sonner";
import { DocumentFilters, DocumentFilterId } from "@/components/intelligence/document-filters";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    source: string;
    documentId: string;
    competitor?: string;
    relevance: number;
    documentPurpose?: string;
    documentType?: string;
  }>;
};

// Mock messages for prototype
const mockMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Bonjour! Je suis votre assistant d'intelligence concurrentielle. Je peux vous aider à analyser vos concurrents, résumer des documents, et répondre à vos questions stratégiques. Comment puis-je vous aider aujourd'hui?",
  },
];

// Mapping filtres → Pinecone filters
function buildPineconeFilters(selectedFilters: DocumentFilterId[]) {
  if (selectedFilters.length === 0) return undefined;

  const conditions: any[] = [];

  selectedFilters.forEach((filter) => {
    switch (filter) {
      case "company_info":
        conditions.push({ documentPurpose: { $eq: "company_info" } });
        break;
      case "knowledge_base":
        conditions.push({
          $and: [
            { documentPurpose: { $eq: "rfp_support" } },
            { documentType: { $eq: "product_doc" } },
          ],
        });
        break;
      case "rfp_won":
        conditions.push({
          $and: [
            { documentPurpose: { $eq: "rfp_response" } },
            { isHistoricalRfp: { $eq: true } },
            { rfpOutcome: { $eq: "won" } },
          ],
        });
        break;
      case "rfp_all":
        conditions.push({
          $and: [
            { documentPurpose: { $eq: "rfp_response" } },
            { isHistoricalRfp: { $eq: true } },
          ],
        });
        break;
      case "competitive":
        conditions.push({ documentType: { $eq: "competitive_intel" } });
        break;
      case "product":
        conditions.push({
          $and: [
            { documentPurpose: { $eq: "rfp_support" } },
            { documentType: { $eq: "product_doc" } },
          ],
        });
        break;
    }
  });

  return conditions.length > 1 ? { $or: conditions } : conditions[0];
}

export default function IntelligencePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<DocumentFilterId[]>([
    "company_info",
    "knowledge_base",
    "rfp_won",
    "rfp_all",
    "competitive",
    "product",
  ]); // All 6 categories selected by default

  // Load messages and conversationId from sessionStorage on mount
  useEffect(() => {
    const savedMessages = sessionStorage.getItem(`chat-messages-${slug}`);
    const savedConversationId = sessionStorage.getItem(`chat-conversation-${slug}`);

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (e) {
        console.error("Error loading messages from sessionStorage:", e);
        setMessages(mockMessages); // Fallback to mock messages
      }
    } else {
      setMessages(mockMessages); // First visit, show mock messages
    }

    if (savedConversationId) {
      setConversationId(savedConversationId);
    }
  }, [slug]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`chat-messages-${slug}`, JSON.stringify(messages));
    }
  }, [messages, slug]);

  // Save conversationId to sessionStorage whenever it changes
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem(`chat-conversation-${slug}`, conversationId);
    }
  }, [conversationId, slug]);

  // Persistance localStorage for filters
  useEffect(() => {
    const saved = localStorage.getItem(`chat-filters-${slug}`);
    if (saved) {
      try {
        setSelectedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading filters from localStorage:", e);
      }
    }
  }, [slug]);

  useEffect(() => {
    localStorage.setItem(`chat-filters-${slug}`, JSON.stringify(selectedFilters));
  }, [selectedFilters, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = input;
    setInput("");
    setLoading(true);

    try {
      // Build Pinecone filters from selected categories
      const filters = buildPineconeFilters(selectedFilters);

      // Call real chat API
      const response = await fetch(`/api/companies/${slug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          filters: filters,
          conversationId: conversationId, // Pass existing conversationId to continue conversation
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();

      // Update conversationId if returned by API (for session persistence)
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources?.map((s: any) => ({
          source: s.source,
          documentId: s.documentId,
          competitor: s.competitor,
          relevance: s.relevance,
          documentPurpose: s.documentPurpose, // ✅ Add category metadata
          documentType: s.documentType, // ✅ Add category metadata
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la communication avec l'IA");
      console.error("Chat error:", error);

      // Remove user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for source badges
  const getCategoryIcon = (source: any) => {
    const { documentPurpose, documentType } = source;
    if (documentPurpose === "company_info") return "🏢";
    if (documentPurpose === "rfp_support") {
      if (documentType === "competitive_intel") return "🎯";
      if (documentType === "product_doc") return "📚";
      return "📚";
    }
    if (documentPurpose === "rfp_response") return "🏆";
    return "📄";
  };

  const getCategoryLabel = (source: any) => {
    const { documentPurpose, documentType } = source;
    if (documentPurpose === "company_info") return "Info Entreprise";
    if (documentPurpose === "rfp_support") {
      if (documentType === "competitive_intel") return "Intelligence";
      if (documentType === "product_doc") return "Base Connaissances";
      return "Support";
    }
    if (documentPurpose === "rfp_response") return "Historique RFP";
    return "Autre";
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intelligence</h1>
            <p className="text-sm text-gray-600 mt-1">
              Posez vos questions stratégiques - Alimenté par Claude Sonnet 4.5
            </p>
          </div>
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            IA Active
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-5xl mx-auto px-4 py-6 flex flex-col">
          {/* Document Filters */}
          <div className="mb-6">
            <DocumentFilters
              selectedFilters={selectedFilters}
              onChange={setSelectedFilters}
            />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 mb-6">
            <div className="space-y-6 pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-teal-600" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] ${
                      message.role === "user" ? "order-1" : "order-2"
                    }`}
                  >
                    <Card
                      className={
                        message.role === "user"
                          ? "bg-teal-50 border-teal-200"
                          : "bg-white"
                      }
                    >
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {message.content}
                        </p>

                        {/* Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Sources ({message.sources.length})
                            </p>
                            <div className="space-y-2">
                              {message.sources.map((source, idx) => (
                                <Link
                                  key={idx}
                                  href={`/companies/${slug}/knowledge-base/support-docs/${source.documentId}`}
                                  className="flex items-start gap-2 text-xs bg-gray-50 p-2 rounded hover:bg-teal-50 hover:border-teal-200 border border-transparent transition-colors cursor-pointer"
                                >
                                  <FileText className="h-3 w-3 text-teal-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-gray-900 hover:text-teal-700 hover:underline">
                                        {source.source}
                                      </span>
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <span>{getCategoryIcon(source)}</span>
                                        <span>{getCategoryLabel(source)}</span>
                                      </Badge>
                                    </div>
                                    {source.competitor && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Building2 className="h-2.5 w-2.5 text-gray-400" />
                                        <span className="text-gray-600">
                                          {source.competitor}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(source.relevance * 100)}%
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-teal-600 animate-pulse" />
                  </div>
                  <Card className="max-w-[80%]">
                    <CardContent className="p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <Card className="border-2 border-teal-200">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question sur vos concurrents..."
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
