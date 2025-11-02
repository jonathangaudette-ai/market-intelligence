"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, FileText, Building2, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    source: string;
    competitor?: string;
    relevance: number;
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

export default function IntelligencePage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "D'après les documents analysés, Competitor X a récemment lancé une nouvelle fonctionnalité d'IA qui améliore leur taux de conversion de 22%. Ils ont également augmenté leur équipe produit de 15 personnes ce trimestre, suggérant un investissement significatif dans le développement.",
        sources: [
          { source: "rapport-q4-competitor-x.pdf", competitor: "Competitor X", relevance: 0.92 },
          { source: "analyse-linkedin-competitor-x.pdf", competitor: "Competitor X", relevance: 0.87 },
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 1500);
  };

  const quickPrompts = [
    "Quelles sont les forces de nos principaux concurrents?",
    "Résume les dernières nouvelles sur Competitor X",
    "Compare nos prix avec ceux de Competitor Y",
    "Quels sont les signaux d'embauche chez nos concurrents?",
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Intelligence Concurrentielle</h1>
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
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-xs bg-gray-50 p-2 rounded"
                                >
                                  <FileText className="h-3 w-3 text-teal-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-gray-900">
                                      {source.source}
                                    </span>
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
                                </div>
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

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Questions suggérées:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors text-sm text-gray-700"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

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
