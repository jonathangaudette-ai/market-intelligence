'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database, FileCode, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PromptListItem {
  id: string;
  promptKey: string;
  name: string;
  description: string | null;
  category: string;
  version: number;
  modelId: string | null;
  temperature: number | null;
  maxTokens: number | null;
  usesDatabase: boolean;
  source: 'database' | 'hardcoded';
  isActive: boolean;
  createdBy: string | null;
  updatedAt: string;
}

interface PromptsResponse {
  prompts: PromptListItem[];
  companyId: string;
  companyName: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  rfp_generation: 'bg-blue-500/10 text-blue-700 border-blue-300',
  question_analysis: 'bg-purple-500/10 text-purple-700 border-purple-300',
  document_analysis: 'bg-green-500/10 text-green-700 border-green-300',
  intelligence: 'bg-orange-500/10 text-orange-700 border-orange-300',
  enrichment: 'bg-pink-500/10 text-pink-700 border-pink-300',
  chat: 'bg-cyan-500/10 text-cyan-700 border-cyan-300',
};

export default function PromptsSettingsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrompts() {
      try {
        const response = await fetch(`/api/companies/${slug}/prompts`);
        if (!response.ok) {
          throw new Error('Failed to load prompts');
        }

        const data: PromptsResponse = await response.json();
        setPrompts(data.prompts);
        setCompanyName(data.companyName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadPrompts();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Group prompts by category
  const promptsByCategory = prompts.reduce((acc, prompt) => {
    if (!acc[prompt.category]) {
      acc[prompt.category] = [];
    }
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, PromptListItem[]>);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Prompts</h1>
        <p className="text-muted-foreground mt-2">
          Gérez et personnalisez les prompts IA pour {companyName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Prompts</CardDescription>
            <CardTitle className="text-3xl">{prompts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Using Database</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {prompts.filter((p) => p.usesDatabase).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Using Defaults</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {prompts.filter((p) => !p.usesDatabase).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Prompts by Category */}
      <div className="space-y-8">
        {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {category.replace(/_/g, ' ')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryPrompts.map((prompt) => (
                <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {prompt.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Badge
                        variant="outline"
                        className={
                          prompt.usesDatabase
                            ? 'bg-green-500/10 text-green-700 border-green-300'
                            : 'bg-blue-500/10 text-blue-700 border-blue-300'
                        }
                      >
                        {prompt.usesDatabase ? (
                          <>
                            <Database className="w-3 h-3 mr-1" />
                            Database
                          </>
                        ) : (
                          <>
                            <FileCode className="w-3 h-3 mr-1" />
                            Default
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        v{prompt.version}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {prompt.modelId && (
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-mono text-xs">{prompt.modelId}</span>
                        </div>
                      )}
                      {prompt.temperature !== null && (
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <span>{prompt.temperature}</span>
                        </div>
                      )}
                      {prompt.maxTokens && (
                        <div className="flex justify-between">
                          <span>Max Tokens:</span>
                          <span>{prompt.maxTokens.toLocaleString()}</span>
                        </div>
                      )}
                      {prompt.updatedAt && (
                        <div className="flex justify-between text-xs">
                          <span>Updated:</span>
                          <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/companies/${slug}/settings/prompts/${prompt.promptKey}`}>
                      <Button className="w-full mt-4" variant="outline">
                        Edit Prompt
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {prompts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No prompts found. Please run the seed script to initialize default prompts.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
