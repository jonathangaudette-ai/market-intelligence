"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  FileText,
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      label: "Messages IA",
      value: "247",
      change: "+12%",
      trend: "up" as const,
      icon: MessageSquare,
      color: "teal",
    },
    {
      label: "Concurrents actifs",
      value: "8",
      change: "+2",
      trend: "up" as const,
      icon: Users,
      color: "blue",
    },
    {
      label: "Documents analysés",
      value: "24",
      change: "+5",
      trend: "up" as const,
      icon: FileText,
      color: "purple",
    },
    {
      label: "Signaux détectés",
      value: "15",
      change: "+8",
      trend: "up" as const,
      icon: Target,
      color: "orange",
    },
    {
      label: "Taux de réponse",
      value: "98%",
      change: "+2%",
      trend: "up" as const,
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "Temps moyen",
      value: "1.2s",
      change: "-0.3s",
      trend: "down" as const,
      icon: Zap,
      color: "yellow",
    },
  ];

  const recentActivity = [
    {
      id: "1",
      type: "document",
      title: "Nouveau document analysé",
      description: "rapport-q4-competitor-x.pdf",
      time: "Il y a 2 heures",
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: "2",
      type: "message",
      title: "Question posée par John Doe",
      description: "Quelles sont les forces de Competitor X?",
      time: "Il y a 3 heures",
      icon: MessageSquare,
      color: "bg-teal-100 text-teal-600",
    },
    {
      id: "3",
      type: "competitor",
      title: "Concurrent ajouté",
      description: "New Startup ajouté à la liste de surveillance",
      time: "Il y a 5 heures",
      icon: Building2,
      color: "bg-purple-100 text-purple-600",
    },
    {
      id: "4",
      type: "signal",
      title: "Signal détecté",
      description: "Competitor Y a publié 5 nouvelles offres d'emploi",
      time: "Il y a 1 jour",
      icon: AlertCircle,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const insights = [
    {
      title: "Tendance d'embauche",
      description: "3 concurrents ont augmenté leur recrutement de 40% ce mois-ci",
      action: "Voir détails",
      badge: "Haute priorité",
      badgeVariant: "destructive" as const,
    },
    {
      title: "Nouvelle fonctionnalité",
      description: "Competitor X a lancé une feature d'IA similaire à la vôtre",
      action: "Analyser",
      badge: "Moyen",
      badgeVariant: "warning" as const,
    },
    {
      title: "Changement de prix",
      description: "Competitor Y a réduit ses prix de 15%",
      action: "Comparer",
      badge: "À surveiller",
      badgeVariant: "default" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vue d'ensemble de votre intelligence concurrentielle
              </p>
            </div>
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Tous les systèmes opérationnels
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
            const trendColor = stat.trend === "up" ? "text-green-600" : "text-red-600";

            return (
              <Card key={stat.label} className="hover:shadow-md transition-shadow">
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
                      <span>{stat.change}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
                <CardDescription>
                  Dernières actions et événements détectés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg ${activity.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Insights clés</CardTitle>
                <CardDescription>
                  Alertes et signaux importants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border hover:border-teal-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-semibold">
                          {insight.title}
                        </h4>
                        <Badge variant={insight.badgeVariant} className="text-xs">
                          {insight.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {insight.description}
                      </p>
                      <Button variant="link" size="sm" className="p-0 h-auto">
                        {insight.action} →
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <MessageSquare className="h-4 w-4" />
                  Poser une question
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <FileText className="h-4 w-4" />
                  Ajouter un document
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Building2 className="h-4 w-4" />
                  Ajouter un concurrent
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Chart (Visual Mock) */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisation de l'IA ce mois-ci</CardTitle>
            <CardDescription>Messages et analyses par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {[12, 18, 15, 24, 32, 28, 35, 42, 38, 45, 52, 48, 55, 61].map((value, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg hover:from-teal-700 hover:to-teal-500 transition-colors cursor-pointer relative group"
                  style={{ height: `${(value / 61) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {value} messages
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-muted-foreground">
              <span>Semaine 1</span>
              <span>Semaine 2</span>
              <span>Semaine 3</span>
              <span>Semaine 4</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
