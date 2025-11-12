'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuestionDetailModal } from './question-detail-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileQuestion,
  Search,
  Filter,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  Circle,
  TrendingUp,
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

interface QuestionListProps {
  rfpId: string;
  slug: string;
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

export function QuestionList({ rfpId, slug }: QuestionListProps) {
  const { data, error, isLoading, mutate } = useSWR<{
    questions: Question[];
    stats: {
      total: number;
      byCategory: Record<string, number>;
      byStatus: Record<string, number>;
      byDifficulty: Record<string, number>;
      totalEstimatedTime: number;
    };
  }>(`/api/companies/${slug}/rfps/${rfpId}/questions`, fetcher, {
    refreshInterval: 0, // No auto-refresh
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsModalOpen(true);
  };

  const handleResponseSaved = () => {
    // Refresh the question list when a response is saved
    mutate();
  };

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (!data?.questions) return [];

    return data.questions.filter((q) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          q.questionText.toLowerCase().includes(query) ||
          q.questionNumber?.toLowerCase().includes(query) ||
          q.sectionTitle?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filterCategory !== 'all' && q.category !== filterCategory) {
        return false;
      }

      // Difficulty filter
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && q.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [data?.questions, searchQuery, filterCategory, filterDifficulty, filterStatus]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">Chargement des questions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <p>Erreur lors du chargement des questions</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <FileQuestion className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune question trouvée</p>
            <p className="text-sm mt-2">L'analyse du RFP n'a pas encore été effectuée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(data.stats.byCategory).sort();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{data.stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">Questions totales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {data.stats.byStatus?.completed || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Complétées</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {data.stats.byStatus?.in_progress || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">En cours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(data.stats.totalEstimatedTime / 60)}h
              </p>
              <p className="text-sm text-gray-500 mt-1">Temps estimé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Questions ({filteredQuestions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({data.stats.byCategory[cat]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes difficultés</SelectItem>
                <SelectItem value="easy">Facile</SelectItem>
                <SelectItem value="medium">Moyen</SelectItem>
                <SelectItem value="hard">Difficile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <div
                key={question.id}
                onClick={() => handleQuestionClick(question)}
                className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-1 text-xs">
                        {DIFFICULTY_ICONS[question.difficulty]}
                        <span className="capitalize">{question.difficulty}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {question.hasResponse ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                </div>

                {/* Section Title */}
                {question.sectionTitle && (
                  <p className="text-xs text-gray-500 mb-2">{question.sectionTitle}</p>
                )}

                {/* Question Text */}
                <p className="text-sm text-gray-900 leading-relaxed mb-3">
                  {question.questionText}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {question.estimatedMinutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{question.estimatedMinutes} min</span>
                    </div>
                  )}

                  {question.wordLimit && (
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-3 w-3" />
                      <span>Max: {question.wordLimit} mots</span>
                    </div>
                  )}

                  {question.tags && question.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{question.tags.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune question ne correspond aux filtres sélectionnés</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Detail Modal */}
      <QuestionDetailModal
        question={selectedQuestion}
        rfpId={rfpId}
        slug={slug}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onResponseSaved={handleResponseSaved}
      />
    </div>
  );
}
