'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponseEditor } from './response-editor';
import {
  FileQuestion,
  Clock,
  Tag,
  AlertCircle,
  Circle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Question {
  id: string;
  questionNumber: string | null;
  questionText: string;
  sectionTitle: string | null;
  category: string | null;
  tags: string[] | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  estimatedMinutes: number | null;
  status: string;
  hasResponse: boolean;
  requiresAttachment: boolean;
  wordLimit: number | null;
}

interface QuestionDetailModalProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResponseSaved?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800 border-blue-200',
  pricing: 'bg-green-100 text-green-800 border-green-200',
  company_info: 'bg-purple-100 text-purple-800 border-purple-200',
  case_study: 'bg-orange-100 text-orange-800 border-orange-200',
  compliance: 'bg-red-100 text-red-800 border-red-200',
  implementation: 'bg-teal-100 text-teal-800 border-teal-200',
  support: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  security: 'bg-pink-100 text-pink-800 border-pink-200',
  legal: 'bg-gray-100 text-gray-800 border-gray-200',
};

const DIFFICULTY_ICONS = {
  easy: <Circle className="h-3 w-3 text-green-600" />,
  medium: <AlertCircle className="h-3 w-3 text-yellow-600" />,
  hard: <TrendingUp className="h-3 w-3 text-red-600" />,
};

export function QuestionDetailModal({
  question,
  open,
  onOpenChange,
  onResponseSaved,
}: QuestionDetailModalProps) {
  const [initialContent, setInitialContent] = useState('');

  // Fetch existing response when question changes
  const { data: responseData, mutate } = useSWR(
    question ? `/api/v1/rfp/questions/${question.id}/response` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (responseData?.response) {
      setInitialContent(responseData.response.responseHtml || '');
    } else {
      setInitialContent('');
    }
  }, [responseData]);

  const handleSave = async () => {
    // Revalidate the response data
    await mutate();
    onResponseSaved?.();
  };

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Question {question.questionNumber || ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question details */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Header badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {question.questionNumber && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {question.questionNumber}
                  </Badge>
                )}
                {question.category && (
                  <Badge
                    variant="outline"
                    className={CATEGORY_COLORS[question.category] || 'bg-gray-100'}
                  >
                    {question.category}
                  </Badge>
                )}
                {question.difficulty && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100">
                    {DIFFICULTY_ICONS[question.difficulty]}
                    <span className="capitalize">{question.difficulty}</span>
                  </div>
                )}
                {question.hasResponse && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Répondue
                  </Badge>
                )}
              </div>

              {/* Section title */}
              {question.sectionTitle && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Section
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{question.sectionTitle}</p>
                </div>
              )}

              {/* Question text */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Question
                </p>
                <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {question.questionText}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                {question.estimatedMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{question.estimatedMinutes} min</span>
                  </div>
                )}

                {question.wordLimit && (
                  <div className="flex items-center gap-1">
                    <FileQuestion className="h-3 w-3" />
                    <span>Limite: {question.wordLimit} mots</span>
                  </div>
                )}

                {question.requiresAttachment && (
                  <Badge variant="outline" className="text-xs">
                    Pièce jointe requise
                  </Badge>
                )}

                {question.tags && question.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>{question.tags.join(', ')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Response editor */}
          <ResponseEditor
            questionId={question.id}
            initialContent={initialContent}
            wordLimit={question.wordLimit}
            onSave={handleSave}
            autoSave={true}
            autoSaveDelay={2000}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
