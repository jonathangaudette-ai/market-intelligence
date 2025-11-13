'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronRight,
  Search,
  FileText,
  Bot,
  User,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatting';
import type { ContentType } from '@/types/content-types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Response {
  id: string;
  responseText: string;
  responseHtml: string | null;
  wordCount: number | null;
  wasAiGenerated: boolean;
  aiModel: string | null;
  sourcesUsed: any;
  sourceRfpIds: string[];
  confidenceScore: number | null;
  adaptationUsed: string | null;
  version: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface QuestionWithResponse {
  id: string;
  questionNumber: string | null;
  questionText: string;
  sectionTitle: string | null;
  category: string | null;
  primaryContentType: ContentType | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  wordLimit: number | null;
  response: Response | null;
}

interface HistoricalQABrowserProps {
  rfpId: string;
  slug: string;
  onDelete?: (responseId: string) => Promise<void>;
}

export function HistoricalQABrowser({
  rfpId,
  slug,
  onDelete,
}: HistoricalQABrowserProps) {
  const { data, error, isLoading, mutate } = useSWR<{
    questions: QuestionWithResponse[];
    stats: {
      total: number;
      withResponses: number;
      withoutResponses: number;
      avgWordCount: number;
      byContentType: Record<string, number>;
      aiGenerated: number;
    };
    rfp: {
      id: string;
      title: string;
      clientName: string;
      isHistorical: boolean;
      result: string | null;
      qualityScore: number | null;
    };
  }>(`/api/companies/${slug}/rfps/${rfpId}/questions-with-responses`, fetcher);

  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (questionId: string) => {
    setExpandedQuestionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleDelete = async (responseId: string, questionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réponse? Cette action supprimera également les données du RAG.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/response`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete response');
      }

      // Refresh the data
      mutate();

      if (onDelete) {
        await onDelete(responseId);
      }
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Erreur lors de la suppression de la réponse');
    }
  };

  const filteredQuestions = data?.questions.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.questionText.toLowerCase().includes(query) ||
      q.response?.responseText.toLowerCase().includes(query) ||
      q.sectionTitle?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Erreur lors du chargement des questions et réponses
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-teal-600">
              {data.stats.withResponses}
            </div>
            <p className="text-sm text-gray-600">Réponses complètes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">
              {data.stats.total}
            </div>
            <p className="text-sm text-gray-600">Questions totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {data.stats.avgWordCount}
            </div>
            <p className="text-sm text-gray-600">Mots moyens/réponse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {data.stats.aiGenerated}
            </div>
            <p className="text-sm text-gray-600">Générées par IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher dans les questions et réponses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions && filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => {
            const isExpanded = expandedQuestionIds.has(question.id);
            const hasResponse = !!question.response;

            return (
              <Card
                key={question.id}
                className={`border-l-4 transition-colors ${
                  hasResponse ? 'border-l-green-500' : 'border-l-gray-300'
                }`}
              >
                <CardHeader
                  className="pb-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(question.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {question.questionNumber && (
                            <Badge variant="outline" className="text-xs">
                              {question.questionNumber}
                            </Badge>
                          )}
                          {question.category && (
                            <Badge variant="secondary" className="text-xs">
                              {question.category}
                            </Badge>
                          )}
                          {question.primaryContentType && (
                            <Badge className="bg-teal-100 text-teal-800 text-xs">
                              {question.primaryContentType}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {question.questionText}
                        </h3>
                        {question.sectionTitle && (
                          <p className="text-xs text-gray-500 mt-1">
                            {question.sectionTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {hasResponse ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && hasResponse && question.response && (
                  <CardContent className="border-t pt-4">
                    {/* Response Metadata */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {question.response.wasAiGenerated ? (
                          <>
                            <Bot className="h-4 w-4" />
                            <span>IA ({question.response.aiModel})</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4" />
                            <span>
                              {question.response.createdByUser?.name ||
                                question.response.createdByUser?.email ||
                                'Utilisateur'}
                            </span>
                          </>
                        )}
                      </div>
                      {question.response.wordCount && (
                        <div className="text-sm text-gray-600">
                          {question.response.wordCount} mots
                        </div>
                      )}
                      {question.response.confidenceScore && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          {question.response.confidenceScore}% confiance
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatRelativeTime(question.response.createdAt)}
                      </div>
                      <div className="ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDelete(question.response!.id, question.id)
                          }
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {/* Response Content */}
                    <div className="prose prose-sm max-w-none">
                      {question.response.responseHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: question.response.responseHtml,
                          }}
                        />
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {question.response.responseText}
                        </p>
                      )}
                    </div>

                    {/* Source RFPs */}
                    {question.response.sourceRfpIds &&
                      question.response.sourceRfpIds.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            Sources utilisées:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {question.response.sourceRfpIds.map((sourceId) => (
                              <Badge
                                key={sourceId}
                                variant="outline"
                                className="text-xs"
                              >
                                RFP {sourceId.substring(0, 8)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                )}

                {isExpanded && !hasResponse && (
                  <CardContent className="border-t pt-4">
                    <p className="text-sm text-gray-500 italic">
                      Aucune réponse disponible pour cette question.
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery
                  ? 'Aucune question ne correspond à votre recherche'
                  : 'Aucune question disponible'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
