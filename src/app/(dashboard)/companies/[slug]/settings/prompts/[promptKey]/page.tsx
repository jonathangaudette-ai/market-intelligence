'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  AlertCircle,
  Database,
  FileCode,
  Eye,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface PromptTemplate {
  id: string;
  companyId: string;
  promptKey: string;
  category: string;
  systemPrompt: string | null;
  userPromptTemplate: string;
  modelId: string | null;
  temperature: number | null;
  maxTokens: number | null;
  name: string;
  description: string | null;
  variables: Array<{
    key: string;
    description: string;
    required: boolean;
    type: string;
    example?: string;
  }>;
  version: number;
  isActive: boolean;
  createdBy: string | null;
  updatedAt: string;
}

interface PromptVersion {
  id: string;
  version: number;
  systemPrompt: string | null;
  userPromptTemplate: string;
  modelId: string | null;
  temperature: number | null;
  maxTokens: number | null;
  createdBy: string | null;
  createdAt: string;
  isActive: boolean;
}

interface PreviewResult {
  rendered: {
    system?: string;
    user: string;
    model: string | null;
    temperature: number | null;
    maxTokens: number | null;
  };
}

export default function PromptEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params?.slug as string;
  const promptKey = params?.promptKey as string;

  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usesDatabase, setUsesDatabase] = useState(false);

  // Form state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [modelId, setModelId] = useState('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(4000);

  // Preview variables (test data)
  const [previewVars, setPreviewVars] = useState<Record<string, any>>({});

  useEffect(() => {
    loadPrompt();
    loadVersions();
  }, [slug, promptKey]);

  async function loadPrompt() {
    try {
      const response = await fetch(`/api/companies/${slug}/prompts/${promptKey}`);
      if (!response.ok) throw new Error('Failed to load prompt');

      const data = await response.json();
      setPrompt(data.prompt);
      setUsesDatabase(data.usesDatabase);

      // Initialize form state
      setSystemPrompt(data.prompt.systemPrompt || '');
      setUserPromptTemplate(data.prompt.userPromptTemplate);
      setModelId(data.prompt.modelId || '');
      setTemperature(data.prompt.temperature ?? 0.7);
      setMaxTokens(data.prompt.maxTokens || 4000);

      // Initialize preview variables with examples
      const initialVars: Record<string, any> = {};
      data.prompt.variables?.forEach((v: any) => {
        initialVars[v.key] = v.example || '';
      });
      setPreviewVars(initialVars);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions() {
    try {
      const response = await fetch(`/api/companies/${slug}/prompts/${promptKey}/versions`);
      if (!response.ok) throw new Error('Failed to load versions');

      const data = await response.json();
      setVersions(data.versions);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }

  async function handleSave() {
    if (!prompt) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${slug}/prompts/${promptKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt || undefined,
          userPromptTemplate,
          modelId: modelId || undefined,
          temperature: temperature,
          maxTokens: maxTokens,
          variables: prompt.variables,
        }),
      });

      if (!response.ok) throw new Error('Failed to save prompt');

      const data = await response.json();
      toast({
        title: 'Success',
        description: `Prompt saved as version ${data.prompt.version}`,
      });

      // Reload prompt and versions
      await loadPrompt();
      await loadVersions();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    try {
      const response = await fetch(`/api/companies/${slug}/prompts/${promptKey}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt || undefined,
          userPromptTemplate,
          modelId: modelId || undefined,
          temperature,
          maxTokens,
          variables: previewVars,
        }),
      });

      if (!response.ok) throw new Error('Failed to preview prompt');

      const data = await response.json();
      setPreview(data);
      toast({
        title: 'Preview Generated',
        description: 'Prompt rendered successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to preview prompt',
        variant: 'destructive',
      });
    }
  }

  async function handleRollback(version: number) {
    if (!confirm(`Roll back to version ${version}? This will create a new version.`)) return;

    try {
      const response = await fetch(`/api/companies/${slug}/prompts/${promptKey}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });

      if (!response.ok) throw new Error('Failed to rollback');

      const data = await response.json();
      toast({
        title: 'Success',
        description: data.message,
      });

      // Reload prompt and versions
      await loadPrompt();
      await loadVersions();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to rollback',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Prompt not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/companies/${slug}/settings/prompts`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Prompts
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{prompt.name}</h1>
            <Badge
              variant="outline"
              className={
                usesDatabase
                  ? 'bg-green-500/10 text-green-700 border-green-300'
                  : 'bg-blue-500/10 text-blue-700 border-blue-300'
              }
            >
              {usesDatabase ? (
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
            <Badge variant="outline">v{prompt.version}</Badge>
          </div>
          <p className="text-muted-foreground mt-2">{prompt.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePreview} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Main Editor */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="versions">
            <History className="w-4 h-4 mr-2" />
            Versions ({versions.length})
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>
                The system message that sets the context and behavior for the AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
                className="min-h-[300px] font-mono text-sm"
                rows={12}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Prompt Template</CardTitle>
              <CardDescription>
                The user message template with Mustache syntax (
                {'{{'} variable {'}}'}  , {'{{#if}}{{/if}}'}, {'{{#each}}{{/each}}'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={userPromptTemplate}
                onChange={(e) => setUserPromptTemplate(e.target.value)}
                placeholder="Enter user prompt template with {{variables}}..."
                className="min-h-[400px] font-mono text-sm"
                rows={16}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID</Label>
                <Input
                  id="modelId"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="claude-sonnet-4-5-20250929"
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to use default from route
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">Temperature</Label>
                  <span className="text-sm text-muted-foreground">{temperature}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                />
                <p className="text-sm text-muted-foreground">
                  Controls randomness: 0 is focused, 2 is very creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4000)}
                  min={100}
                  max={200000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of tokens in the response
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variables</CardTitle>
              <CardDescription>Variables available in this prompt template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prompt.variables && prompt.variables.length > 0 ? (
                  prompt.variables.map((variable) => (
                    <div key={variable.key} className="border rounded p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {'{{' + variable.key + '}}'}
                        </code>
                        <Badge variant={variable.required ? 'default' : 'secondary'}>
                          {variable.required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{variable.description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Type: {variable.type}</span>
                        {variable.example && <span>Example: "{variable.example}"</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No variables defined</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Variables</CardTitle>
              <CardDescription>
                Enter test values for preview (will not be saved)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prompt.variables && prompt.variables.length > 0 ? (
                prompt.variables.map((variable) => (
                  <div key={variable.key} className="space-y-2">
                    <Label htmlFor={`var-${variable.key}`}>
                      {variable.key}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      id={`var-${variable.key}`}
                      value={previewVars[variable.key] || ''}
                      onChange={(e) =>
                        setPreviewVars({ ...previewVars, [variable.key]: e.target.value })
                      }
                      placeholder={variable.example || variable.description}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No variables to configure</p>
              )}
              <Button onClick={handlePreview} className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>
            </CardContent>
          </Card>

          {preview && (
            <>
              {preview.rendered.system && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rendered System Prompt</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded text-sm">
                      {preview.rendered.system}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Rendered User Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded text-sm">
                    {preview.rendered.user}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>View and rollback to previous versions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.length > 0 ? (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className={`border rounded p-4 ${
                        version.version === prompt.version ? 'border-green-500 bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={version.isActive ? 'default' : 'secondary'}>
                            v{version.version}
                          </Badge>
                          {version.version === prompt.version && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                          {version.version !== prompt.version && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRollback(version.version)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                      {version.createdBy && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Created by: {version.createdBy}
                        </p>
                      )}
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <div>Model: {version.modelId || 'default'}</div>
                        <div>
                          Temperature: {version.temperature !== null ? version.temperature : 'default'}
                        </div>
                        <div>Max Tokens: {version.maxTokens || 'default'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No version history available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
