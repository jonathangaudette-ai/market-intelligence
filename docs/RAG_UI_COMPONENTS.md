# Composants UI RAG - Design System Intégré
## Interface Chat & Documents avec Design System Teal

**Date:** 1er novembre 2025
**Design System:** Teal primary color + shadcn/ui
**Objectif:** Composants UI pour l'application RAG Intelligence Compétitive

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Chat Interface Components](#chat-interface-components)
3. [Document Upload Components](#document-upload-components)
4. [Competitor Management](#competitor-management)
5. [Dashboard & Stats](#dashboard--stats)
6. [Layout Components](#layout-components)

---

## 1. Vue d'Ensemble

### 1.1 Stack UI

```yaml
UI_FRAMEWORK: Next.js 14 + React 19
STYLING: Tailwind CSS
COMPONENTS: shadcn/ui
ICONS: lucide-react
NOTIFICATIONS: sonner
PRIMARY_COLOR: Teal (#0d9488 / teal-600)
```

### 1.2 Pages Principales

```
/companies/[slug]/
  ├── dashboard          → Stats + Quick actions
  ├── chat               → Interface conversationnelle RAG
  ├── documents          → Liste documents + Upload
  ├── competitors        → Gestion concurrents
  └── settings           → Configuration
```

---

## 2. Chat Interface Components

### 2.1 Main Chat Page

```tsx
// app/companies/[slug]/chat/page.tsx

import { getCurrentCompany } from "@/lib/current-company";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/intelligence/chat-interface";
import { PageLayout } from "@/components/layout/page-layout";
import { MessageSquare } from "lucide-react";

export default async function ChatPage({
  params,
}: {
  params: { slug: string };
}) {
  const currentCompany = await getCurrentCompany();

  if (!currentCompany || currentCompany.company.slug !== params.slug) {
    redirect("/");
  }

  return (
    <PageLayout
      title="Assistant Intelligence"
      description="Posez des questions sur vos concurrents"
      icon={MessageSquare}
    >
      <ChatInterface companySlug={params.slug} />
    </PageLayout>
  );
}
```

### 2.2 Chat Interface Component

```tsx
// components/intelligence/chat-interface.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MessageBubble } from "./message-bubble";
import { SourcesList } from "./sources-list";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ source: string; competitor?: string; relevance: number }>;
}

export function ChatInterface({ companySlug }: { companySlug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message immediately
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);

    try {
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
        throw new Error(data.error || "Erreur lors de la requête");
      }

      // Add assistant message
      setMessages([
        ...newMessages,
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
      toast.error("Une erreur s'est produite");
      setMessages([
        ...newMessages,
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
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {messages.map((message, idx) => (
                <div key={idx}>
                  <MessageBubble message={message} />
                  {message.sources && message.sources.length > 0 && (
                    <SourcesList sources={message.sources} className="mt-3" />
                  )}
                </div>
              ))}
              {loading && <LoadingBubble />}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question sur vos concurrents..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Quick suggestions */}
          {messages.length === 0 && <QuickSuggestions onSelect={setInput} />}
        </div>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="bg-teal-100 dark:bg-teal-900 rounded-full p-6 mb-4">
        <Sparkles className="h-10 w-10 text-teal-600 dark:text-teal-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Assistant Intelligence Prêt
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Posez des questions sur vos concurrents, leurs produits, stratégies ou
        dernières nouvelles.
      </p>
      <p className="text-sm text-gray-500">
        💡 Essayez: "Quelles sont les forces d'Acme Corp?"
      </p>
    </div>
  );
}

function LoadingBubble() {
  return (
    <Card className="p-4 bg-gray-50 max-w-[80%]">
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Analyse en cours...</span>
      </div>
    </Card>
  );
}

function QuickSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const suggestions = [
    "Quelles sont les forces d'Acme Corp?",
    "Compare les prix de nos concurrents",
    "Quelles sont leurs dernières nouvelles?",
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className="text-xs"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
```

### 2.3 Message Bubble Component

```tsx
// components/intelligence/message-bubble.tsx

import { Card } from "@/components/ui/card";
import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  message: {
    role: "user" | "assistant";
    content: string;
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="bg-teal-100 dark:bg-teal-900 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        </div>
      )}

      <Card
        className={`p-4 max-w-[80%] ${
          isUser
            ? "bg-teal-50 dark:bg-teal-950 border-teal-200"
            : "bg-card"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
      </Card>

      {isUser && (
        <div className="bg-gray-100 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
```

### 2.4 Sources List Component

```tsx
// components/intelligence/sources-list.tsx

import { Badge } from "@/components/ui/badge";
import { FileText, Building2 } from "lucide-react";

interface Source {
  source: string;
  competitor?: string;
  relevance: number;
}

export function SourcesList({
  sources,
  className = "",
}: {
  sources: Source[];
  className?: string;
}) {
  return (
    <div className={`pl-11 ${className}`}>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Sources ({sources.length})
        </p>
        <div className="space-y-1.5">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <FileText className="h-3 w-3 mt-0.5 flex-shrink-0 text-teal-600" />
              <div className="flex-1">
                <span className="font-medium">{source.source}</span>
                {source.competitor && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs bg-teal-50 text-teal-700 border-teal-200"
                  >
                    <Building2 className="h-2.5 w-2.5 mr-1" />
                    {source.competitor}
                  </Badge>
                )}
              </div>
              <span className="text-gray-400">
                {Math.round(source.relevance * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Document Upload Components

### 3.1 Documents Page

```tsx
// app/companies/[slug]/documents/page.tsx

import { getCurrentCompany } from "@/lib/current-company";
import { redirect } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { DocumentsTable } from "@/components/intelligence/documents-table";
import { UploadButton } from "@/components/intelligence/upload-button";
import { FileText } from "lucide-react";
import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function DocumentsPage({
  params,
}: {
  params: { slug: string };
}) {
  const currentCompany = await getCurrentCompany();

  if (!currentCompany || currentCompany.company.slug !== params.slug) {
    redirect("/");
  }

  // Fetch documents
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.companyId, currentCompany.company.id))
    .orderBy(desc(documents.uploadedAt));

  return (
    <PageLayout
      title="Documents"
      description="Gérez vos documents d'intelligence compétitive"
      icon={FileText}
      action={<UploadButton companySlug={params.slug} />}
    >
      <DocumentsTable documents={docs} companySlug={params.slug} />
    </PageLayout>
  );
}
```

### 3.2 Upload Button & Dialog

```tsx
// components/intelligence/upload-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UploadButton({ companySlug }: { companySlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [competitorId, setCompetitorId] = useState<string>("");

  async function handleUpload() {
    if (!file) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (competitorId) {
        formData.append("competitorId", competitorId);
      }

      const response = await fetch(
        `/api/companies/${companySlug}/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Document en cours de traitement");
      setOpen(false);
      setFile(null);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Upload className="h-4 w-4 mr-2" />
          Téléverser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Téléverser un Document</DialogTitle>
          <DialogDescription>
            Ajoutez un rapport, case study ou tout document sur un concurrent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="file">Fichier PDF</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Competitor select */}
          <div className="space-y-2">
            <Label htmlFor="competitor">Concurrent (optionnel)</Label>
            <Select value={competitorId} onValueChange={setCompetitorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un concurrent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {/* TODO: Fetch competitors dynamically */}
                <SelectItem value="comp-1">Acme Corp</SelectItem>
                <SelectItem value="comp-2">BigCo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Téléverser
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.3 Documents Table

```tsx
// components/intelligence/documents-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreVertical, Trash2, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  totalChunks: number | null;
  uploadedAt: Date;
}

export function DocumentsTable({
  documents,
  companySlug,
}: {
  documents: Document[];
  companySlug: string;
}) {
  if (documents.length === 0) {
    return <EmptyDocumentsState />;
  }

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Chunks</TableHead>
            <TableHead>Téléversé</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <span className="font-medium">{doc.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {doc.type.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {doc.totalChunks || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(doc.uploadedAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: "En attente", className: "bg-yellow-100 text-yellow-700" },
    processing: { label: "Traitement", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Terminé", className: "bg-green-100 text-green-700" },
    failed: { label: "Échec", className: "bg-red-100 text-red-700" },
  };

  const { label, className } = config[status as keyof typeof config] || config.pending;

  return (
    <Badge variant="secondary" className={`${className} text-xs`}>
      {label}
    </Badge>
  );
}

function EmptyDocumentsState() {
  return (
    <div className="border rounded-lg bg-card">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted rounded-full p-6 mb-4">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Commencez par téléverser des documents sur vos concurrents
        </p>
      </div>
    </div>
  );
}
```

---

## 4. Competitor Management

### 4.1 Competitor Card

```tsx
// components/intelligence/competitor-card.tsx

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, FileText } from "lucide-react";

interface CompetitorCardProps {
  competitor: {
    id: string;
    name: string;
    website?: string;
    priority: string;
    isActive: boolean;
    documentCount: number;
  };
}

export function CompetitorCard({ competitor }: CompetitorCardProps) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <Card className="p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-lg">
            <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{competitor.name}</h3>
            {competitor.website && (
              <a
                href={competitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-teal-600 flex items-center gap-1"
              >
                {competitor.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={
            priorityColors[competitor.priority as keyof typeof priorityColors]
          }
        >
          {competitor.priority}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{competitor.documentCount} documents</span>
        </div>
        <Button variant="outline" size="sm" className="border-teal-200 text-teal-600 hover:bg-teal-50">
          Voir détails
        </Button>
      </div>
    </Card>
  );
}
```

---

## 5. Dashboard & Stats

### 5.1 Stats Cards

```tsx
// components/intelligence/stats-cards.tsx

import { Card } from "@/components/ui/card";
import { FileText, Building2, MessageSquare, TrendingUp } from "lucide-react";

export function StatsCards({ stats }: { stats: {
  documents: number;
  competitors: number;
  conversations: number;
  insights: number;
}}) {
  const cards = [
    {
      label: "Documents",
      value: stats.documents,
      icon: FileText,
      trend: "+12% ce mois",
    },
    {
      label: "Concurrents",
      value: stats.competitors,
      icon: Building2,
    },
    {
      label: "Conversations",
      value: stats.conversations,
      icon: MessageSquare,
    },
    {
      label: "Insights générés",
      value: stats.insights,
      icon: TrendingUp,
      trend: "+23% cette semaine",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx} className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-lg">
              <card.icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold">{card.value}</p>
              {card.trend && (
                <p className="text-xs text-green-600 mt-1">{card.trend}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

## 6. Layout Components

### 6.1 Page Layout Wrapper

```tsx
// components/layout/page-layout.tsx

import { LucideIcon } from "lucide-react";

export function PageLayout({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-lg">
              <Icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
```

### 6.2 Intelligence Header/Nav

```tsx
// components/intelligence/intelligence-nav.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, Building2, BarChart3 } from "lucide-react";

export function IntelligenceNav({ companySlug }: { companySlug: string }) {
  const pathname = usePathname();

  const links = [
    {
      href: `/companies/${companySlug}/dashboard`,
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: `/companies/${companySlug}/chat`,
      label: "Assistant",
      icon: MessageSquare,
    },
    {
      href: `/companies/${companySlug}/documents`,
      label: "Documents",
      icon: FileText,
    },
    {
      href: `/companies/${companySlug}/competitors`,
      label: "Concurrents",
      icon: Building2,
    },
  ];

  return (
    <nav className="flex items-center gap-6">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 text-sm font-medium transition ${
              isActive
                ? "text-teal-600"
                : "text-gray-700 hover:text-teal-600"
            }`}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

---

## 🚀 Installation & Setup

### Dependencies

```bash
# shadcn/ui components (already installed per design system)
npx shadcn-ui@latest add button card input label textarea
npx shadcn-ui@latest add select dropdown-menu dialog sheet
npx shadcn-ui@latest add table badge separator skeleton
npx shadcn-ui@latest add alert toast progress scroll-area

# Additional for chat
npm install date-fns  # For date formatting
```

### Usage in App

```tsx
// app/companies/[slug]/layout.tsx

import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <div>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Company switcher, etc. */}
            <IntelligenceNav companySlug={params.slug} />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

## 🎨 Design Tokens Summary

```css
/* Primary Color: Teal */
.text-teal-600        /* Primary text/icons */
.bg-teal-600          /* Primary buttons */
.hover:bg-teal-700    /* Button hover */
.bg-teal-100          /* Light backgrounds */
.border-teal-200      /* Borders */

/* Consistent with existing design system */
```

Tous les composants suivent le **design system Teal** documenté dans `REUSABLE_DESIGN_SYSTEM.md`! 🎨
