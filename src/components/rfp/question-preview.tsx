'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, Sparkles } from 'lucide-react';

interface Question {
  questionNumber?: string;
  questionText: string;
  sectionTitle?: string;
  wordLimit?: number;
  timestamp: string;
}

interface QuestionPreviewProps {
  logs: Array<{
    timestamp: string;
    type: string;
    message: string;
    metadata?: {
      questions?: Question[];
      questionNumber?: string;
      questionText?: string;
      sectionTitle?: string;
    };
  }>;
  maxQuestions?: number;
}

export function QuestionPreview({ logs, maxQuestions = 5 }: QuestionPreviewProps) {
  // Extract questions from logs
  const questions = useMemo(() => {
    const allQuestions: Question[] = [];

    logs.forEach((log) => {
      if (log.metadata?.questions && Array.isArray(log.metadata.questions)) {
        // Batch extraction - multiple questions
        log.metadata.questions.forEach((q) => {
          allQuestions.push({
            ...q,
            timestamp: log.timestamp,
          });
        });
      } else if (log.metadata?.questionText) {
        // Single question
        allQuestions.push({
          questionNumber: log.metadata.questionNumber,
          questionText: log.metadata.questionText,
          sectionTitle: log.metadata.sectionTitle,
          timestamp: log.timestamp,
        });
      }
    });

    // Sort by timestamp (most recent first) - NO LIMIT, show all questions
    return allQuestions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  const totalQuestions = useMemo(() => {
    return logs.reduce((sum, log) => {
      if (log.metadata?.questions?.length) {
        return sum + log.metadata.questions.length;
      } else if (log.metadata?.questionText) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }, [logs]);

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileQuestion className="h-4 w-4 text-teal-600" />
            Aperçu des Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-sm text-gray-500 py-8">
            <Sparkles className="h-8 w-8 text-gray-300 mb-2" />
            <p>En attente des premières questions...</p>
            <p className="text-xs mt-1">Les questions apparaîtront ici en temps réel</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileQuestion className="h-4 w-4 text-teal-600" />
          Aperçu des Questions
          <span className="text-xs font-normal text-gray-500 ml-auto">
            ({totalQuestions} trouvée{totalQuestions > 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {questions.map((question, index) => (
            <div
              key={index}
              className="relative bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              {/* New badge for first 3 items */}
              {index < 3 && (
                <div className="absolute -top-2 -right-2 bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  NEW
                </div>
              )}

              {/* Question header */}
              <div className="flex items-start gap-2 mb-2">
                {question.questionNumber && (
                  <span className="flex-shrink-0 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">
                    {question.questionNumber}
                  </span>
                )}
                {question.sectionTitle && (
                  <span className="text-xs text-teal-700 bg-teal-100 px-2 py-1 rounded truncate">
                    {question.sectionTitle}
                  </span>
                )}
              </div>

              {/* Question text - FULL TEXT, no truncation */}
              <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {question.questionText}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-teal-100">
                {question.wordLimit && (
                  <span className="text-xs text-teal-600">
                    Limite: {question.wordLimit} mots
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(question.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
