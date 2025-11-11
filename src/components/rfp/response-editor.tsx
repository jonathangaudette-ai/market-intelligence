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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseEditorProps {
  questionId: string;
  initialContent?: string;
  wordLimit?: number | null;
  onSave?: (content: { html: string; text: string; wordCount: number }) => void;
  autoSave?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export function ResponseEditor({
  questionId,
  initialContent = '',
  wordLimit = null,
  onSave,
  autoSave = true,
  autoSaveDelay = 2000,
}: ResponseEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const response = await fetch(`/api/v1/rfp/questions/${questionId}/response`, {
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
  }, [editor, questionId, isSaving, onSave]);

  const handleManualSave = () => {
    handleSave();
  };

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
                <span>Sauvegarde...</span>
              </div>
            )}

            {lastSaved && !isSaving && (
              <div className="text-sm text-green-600">
                Sauvegardé à {lastSaved.toLocaleTimeString('fr-CA')}
              </div>
            )}

            {saveError && (
              <div className="text-sm text-red-600">
                Erreur: {saveError}
              </div>
            )}

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
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-700">
              ⚠️ Vous avez dépassé la limite de {wordLimit} mots de {wordCount - wordLimit!} mots.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
