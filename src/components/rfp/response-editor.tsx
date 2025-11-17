'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Save,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ResponseEditorProps {
  questionId: string;
  rfpId: string;
  slug: string;
  initialContent?: string;
  wordLimit?: number | null;
  onSave?: (content: { html: string; text: string; wordCount: number }) => void;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export function ResponseEditor({
  questionId,
  rfpId,
  slug,
  initialContent = '',
  wordLimit = null,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
}: ResponseEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMode, setGenerateMode] = useState<'standard' | 'with_context' | 'manual'>('with_context');
  const [generateDepth, setGenerateDepth] = useState<'basic' | 'advanced'>('basic');
  const [customContext, setCustomContext] = useState('');
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Commencez à écrire votre réponse ici...',
      }),
      CharacterCount.configure({
        limit: wordLimit ? wordLimit * 6 : undefined, // Rough estimate: ~6 chars per word
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  const wordCount = editor?.storage.characterCount.words() || 0;
  const isOverLimit = wordLimit ? wordCount > wordLimit : false;

  // Update editor content when initialContent changes
  useEffect(() => {
    if (!editor) return;

    // Only update if we have actual content to load
    if (initialContent) {
      const currentContent = editor.getHTML();
      const isCurrentlyEmpty = !currentContent || currentContent === '<p></p>' || currentContent.trim() === '';

      // Update if current content is empty OR if content is different
      if (isCurrentlyEmpty || currentContent !== initialContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  // Auto-save functionality
  useEffect(() => {
    if (!editor || !autoSave) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, autoSaveDelay);

    return () => clearTimeout(timeout);
  }, [editor?.getHTML(), autoSave, autoSaveDelay]);

  const handleSave = useCallback(async () => {
    if (!editor || isSaving) return;

    const html = editor.getHTML();
    const text = editor.getText();
    const words = editor.storage.characterCount.words();

    // Don't save if empty
    if (!text.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Call API to save response
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseText: text,
          responseHtml: html,
          wordCount: words,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save response');
      }

      setLastSaved(new Date());
      onSave?.({ html, text, wordCount: words });
    } catch (error) {
      console.error('Failed to save response:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [editor, questionId, rfpId, slug, isSaving, onSave]);

  const handleManualSave = () => {
    handleSave();
  };

  const handleGenerateWithAI = useCallback(async () => {
    if (!editor || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Call API to generate response
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/generate-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: generateMode,
          depth: generateDepth,
          customContext: generateMode === 'manual' ? customContext : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate response');
      }

      const data = await response.json();

      // Set generated content in editor
      editor.commands.setContent(data.response.responseHtml);

      // Close dialog
      setIsAIDialogOpen(false);

      // Trigger save
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to generate response:', error);
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  }, [editor, questionId, rfpId, slug, generateMode, generateDepth, customContext, isGenerating]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Réponse</CardTitle>
          <div className="flex items-center gap-3">
            {/* Word count */}
            <div className="text-sm">
              <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
                {wordCount} {wordLimit ? `/ ${wordLimit}` : ''} mots
              </Badge>
            </div>

            {/* Save status */}
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sauvegarde en cours...</span>
              </div>
            )}

            {lastSaved && !isSaving && !saveError && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Sauvegardé à {lastSaved.toLocaleTimeString('fr-CA')}</span>
              </div>
            )}

            {saveError && !isSaving && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Erreur de sauvegarde</p>
                  <p className="text-xs text-red-600">Vérifiez votre connexion internet</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave()}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Réessayer
                </Button>
              </div>
            )}

            {/* AI Generate button with dialog */}
            <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer avec IA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Générer une réponse avec l'IA</DialogTitle>
                  <DialogDescription>
                    Choisissez le mode de génération et les options pour créer une réponse assistée par IA.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Mode selection */}
                  <div className="space-y-2">
                    <Label htmlFor="mode">Mode de génération</Label>
                    <Select
                      value={generateMode}
                      onValueChange={(value) => setGenerateMode(value as typeof generateMode)}
                    >
                      <SelectTrigger id="mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">
                          Standard (docs produit uniquement)
                        </SelectItem>
                        <SelectItem value="with_context">
                          Avec contexte client (recommandé)
                        </SelectItem>
                        <SelectItem value="manual">
                          Manuel (contexte personnalisé)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      {generateMode === 'standard' && 'Utilise uniquement les documents produit et entreprise'}
                      {generateMode === 'with_context' && 'Enrichit avec les informations du client et du RFP'}
                      {generateMode === 'manual' && 'Permet de fournir votre propre contexte personnalisé'}
                    </p>
                  </div>

                  {/* Depth selection */}
                  <div className="space-y-2">
                    <Label htmlFor="depth">Profondeur de recherche</Label>
                    <Select
                      value={generateDepth}
                      onValueChange={(value) => setGenerateDepth(value as typeof generateDepth)}
                    >
                      <SelectTrigger id="depth">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">
                          Basique (5 documents)
                        </SelectItem>
                        <SelectItem value="advanced">
                          Avancée (10 documents)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      Plus de documents = réponse plus complète mais génération plus lente
                    </p>
                  </div>

                  {/* Custom context textarea (only for manual mode) */}
                  {generateMode === 'manual' && (
                    <div className="space-y-2">
                      <Label htmlFor="context">Contexte personnalisé</Label>
                      <Textarea
                        id="context"
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        placeholder="Entrez le contexte que l'IA doit utiliser pour générer la réponse..."
                        rows={6}
                        className="resize-none"
                      />
                      <p className="text-sm text-gray-500">
                        Fournissez toutes les informations pertinentes pour cette question
                      </p>
                    </div>
                  )}

                  {/* Error display */}
                  {generateError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-700">
                        ❌ Erreur: {generateError}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAIDialogOpen(false)}
                    disabled={isGenerating}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || (generateMode === 'manual' && !customContext.trim())}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Générer
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Manual save button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive('bold') && 'bg-gray-200')}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive('italic') && 'bg-gray-200')}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(editor.isActive('heading', { level: 2 }) && 'bg-gray-200')}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(editor.isActive('heading', { level: 3 }) && 'bg-gray-200')}
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(editor.isActive('bulletList') && 'bg-gray-200')}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(editor.isActive('orderedList') && 'bg-gray-200')}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div className="min-h-[300px]">
          <EditorContent editor={editor} />
        </div>

        {/* Over limit warning */}
        {isOverLimit && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Limite de mots dépassée
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Vous avez dépassé la limite de {wordLimit} mots de {wordCount - wordLimit!} mots.
                  Veuillez réduire votre réponse.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approaching limit warning (80% threshold) */}
        {!isOverLimit && wordLimit && wordCount > wordLimit * 0.8 && (
          <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Attention: vous approchez de la limite ({wordCount}/{wordLimit} mots)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
