"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Target,
  Trophy,
  DollarSign,
  BarChart3,
  BookOpen,
  Lightbulb,
  FileCheck,
  Brain,
} from "lucide-react";

interface RFPStats {
  pipeline: {
    activeRfps: number;
    totalValue: number;
    avgCompletion: number;
    urgentCount: number;
  };
  questions: {
    total: number;
    answered: number;
    pending: number;
    aiGeneratedPercent: number;
    avgConfidence: number;
    pendingReview: number;
  };
  documents: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    avgConfidence: number;
    totalChunks: number;
  };
  historical: {
    total: number;
    won: number;
    lost: number;
    winRate: number;
    totalDealValue: number;
    avgDealSize: number;
    avgQualityScore: number;
    totalReuse: number;
  };
  winRate: {
    current: number;
    historical: number;
    recentWon: number;
    recentLost: number;
    period: string;
  };
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [rfpStats, setRfpStats] = useState<RFPStats | null>(null);

  // Load RFP stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`/api/companies/${slug}/rfp-stats`);
        if (response.ok) {
          const data = await response.json();
          setRfpStats(data);
        }
      } catch (error) {
        console.error("Error loading RFP stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [slug]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M$`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K$`;
    }
    return `${value}$`;
  };

  // Build stats cards from RFP data
  const stats = rfpStats ? [
    {
      label: "RFPs Actifs",
      value: rfpStats.pipeline.activeRfps.toString(),
      change: rfpStats.pipeline.urgentCount > 0 ? `${rfpStats.pipeline.urgentCount} urgents` : "Aucun urgent",
      trend: rfpStats.pipeline.urgentCount > 0 ? "down" : "up" as const,
      icon: FileText,
      color: "teal",
      urgent: rfpStats.pipeline.urgentCount > 0,
    },
    {
      label: "Valeur Pipeline",
      value: formatCurrency(rfpStats.pipeline.totalValue),
      change: rfpStats.pipeline.activeRfps > 0 ? `${rfpStats.pipeline.activeRfps} opportunités` : "",
      trend: "up" as const,
      icon: DollarSign,
      color: "blue",
    },
    {
      label: "Complétion Moyenne",
      value: `${rfpStats.pipeline.avgCompletion}%`,
      change: rfpStats.pipeline.avgCompletion >= 75 ? "Bon progrès" : "À compléter",
      trend: rfpStats.pipeline.avgCompletion >= 75 ? "up" : "down" as const,
      icon: BarChart3,
      color: "purple",
    },
    {
      label: "Win Rate (90j)",
      value: `${rfpStats.winRate.current}%`,
      change: `${rfpStats.winRate.recentWon}W / ${rfpStats.winRate.recentLost}L`,
      trend: rfpStats.winRate.current >= 50 ? "up" : "down" as const,
      icon: Trophy,
      color: "green",
    },
    {
      label: "Génération IA",
      value: `${rfpStats.questions.aiGeneratedPercent}%`,
      change: `Conf: ${rfpStats.questions.avgConfidence}%`,
      trend: "up" as const,
      icon: Brain,
      color: "orange",
    },
    {
      label: "Bibliothèque Historique",
      value: rfpStats.historical.total.toString(),
      change: `${rfpStats.historical.totalReuse} réutilisations`,
      trend: "up" as const,
      icon: BookOpen,
      color: "yellow",
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold">Dashboard RFP</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vue d'ensemble de vos appels d'offres et réponses
              </p>
            </div>
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Système opérationnel
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Chargement des statistiques...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
                const trendColor = stat.trend === "up" ? "text-green-600" : "text-red-600";

                return (
                  <Card
                    key={stat.label}
                    className={`hover:shadow-md transition-shadow ${stat.urgent ? 'border-red-300 bg-red-50/50' : ''}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                        <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                        <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-xs">{stat.change}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pipeline RFP */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline RFP</CardTitle>
                    <CardDescription>
                      État des appels d'offres en cours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rfpStats && rfpStats.pipeline.activeRfps > 0 ? (
                      <div className="space-y-4">
                        {/* Summary row */}
                        <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total actif</p>
                              <p className="text-2xl font-bold">{rfpStats.pipeline.activeRfps} RFPs</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Valeur totale</p>
                            <p className="text-2xl font-bold text-teal-600">
                              {formatCurrency(rfpStats.pipeline.totalValue)}
                            </p>
                          </div>
                        </div>

                        {/* Questions stats */}
                        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Questions totales</p>
                            <p className="text-2xl font-bold">{rfpStats.questions.total}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Répondues</p>
                            <p className="text-2xl font-bold text-green-600">
                              {rfpStats.questions.answered}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">En attente</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {rfpStats.questions.pending}
                            </p>
                          </div>
                        </div>

                        {/* Urgent alerts */}
                        {rfpStats.pipeline.urgentCount > 0 && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-red-900">
                                {rfpStats.pipeline.urgentCount} RFP{rfpStats.pipeline.urgentCount > 1 ? 's' : ''} avec échéance urgente
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                Échéance dans moins de 7 jours
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/companies/${slug}/rfps`)}
                            >
                              Voir
                            </Button>
                          </div>
                        )}

                        {/* Review pending */}
                        {rfpStats.questions.pendingReview > 0 && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                            <FileCheck className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-yellow-900">
                                {rfpStats.questions.pendingReview} réponse{rfpStats.questions.pendingReview > 1 ? 's' : ''} à reviewer
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Réponses en attente d'approbation
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/companies/${slug}/rfps`)}
                            >
                              Reviewer
                            </Button>
                          </div>
                        )}

                        <Button
                          className="w-full gap-2"
                          variant="outline"
                          onClick={() => router.push(`/companies/${slug}/rfps`)}
                        >
                          <FileText className="h-4 w-4" />
                          Voir tous les RFPs
                          <ArrowRight className="h-4 w-4 ml-auto" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Aucun RFP actif pour le moment
                        </p>
                        <Button
                          onClick={() => router.push(`/companies/${slug}/rfps`)}
                        >
                          Créer un RFP
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Performance Historique */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-green-600" />
                      Performance Historique
                    </CardTitle>
                    <CardDescription>
                      Résultats passés et bibliothèque
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rfpStats && rfpStats.historical.total > 0 ? (
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-4xl font-bold text-green-600">
                            {rfpStats.historical.winRate}%
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Win Rate Global</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {rfpStats.historical.won}W / {rfpStats.historical.lost}L
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">RFPs historiques</span>
                            <span className="font-semibold">{rfpStats.historical.total}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valeur gagnée</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(rfpStats.historical.totalDealValue)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deal moyen</span>
                            <span className="font-semibold">
                              {formatCurrency(rfpStats.historical.avgDealSize)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Score qualité</span>
                            <span className="font-semibold">{rfpStats.historical.avgQualityScore}/100</span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-muted-foreground">Réutilisations</span>
                            <span className="font-semibold text-teal-600">
                              {rfpStats.historical.totalReuse}x
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => router.push(`/companies/${slug}/rfps/library`)}
                        >
                          Voir bibliothèque
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          Aucun RFP historique
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bibliothèque de Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      Documents Support
                    </CardTitle>
                    <CardDescription>
                      Base de connaissances indexée
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rfpStats && (
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-4xl font-bold text-purple-600">
                            {rfpStats.documents.total}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">Documents indexés</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {rfpStats.documents.totalChunks.toLocaleString()} chunks recherchables
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-muted-foreground">Complétés</span>
                            </div>
                            <span className="font-semibold">{rfpStats.documents.completed}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span className="text-muted-foreground">En traitement</span>
                            </div>
                            <span className="font-semibold">{rfpStats.documents.processing}</span>
                          </div>
                          {rfpStats.documents.failed > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-muted-foreground">Échecs</span>
                              </div>
                              <span className="font-semibold text-red-600">
                                {rfpStats.documents.failed}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-muted-foreground">Confidence moyenne</span>
                            <span className="font-semibold">{rfpStats.documents.avgConfidence}%</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => router.push(`/companies/${slug}/documents`)}
                        >
                          Gérer documents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => router.push(`/companies/${slug}/intelligence`)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Poser une question IA
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => router.push(`/companies/${slug}/documents`)}
                    >
                      <FileText className="h-4 w-4" />
                      Uploader un document
                    </Button>
                    <Button
                      className="w-full justify-start gap-2"
                      variant="outline"
                      onClick={() => router.push(`/companies/${slug}/rfps`)}
                    >
                      <Target className="h-4 w-4" />
                      Créer un RFP
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
