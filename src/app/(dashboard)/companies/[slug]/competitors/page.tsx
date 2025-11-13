"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Plus, Globe, Linkedin, TrendingUp, Users, FileText, AlertCircle } from "lucide-react";

type Competitor = {
  id: string;
  name: string;
  website?: string;
  linkedinId?: string;
  industry?: string;
  priority: "high" | "medium" | "low";
  documentCount: number;
  lastActivity?: string;
};

// Mock data
const mockCompetitors: Competitor[] = [
  {
    id: "1",
    name: "Competitor X",
    website: "https://competitorx.com",
    linkedinId: "competitor-x",
    industry: "SaaS",
    priority: "high",
    documentCount: 8,
    lastActivity: "Il y a 2 jours",
  },
  {
    id: "2",
    name: "Competitor Y",
    website: "https://competitory.com",
    linkedinId: "competitor-y",
    industry: "SaaS",
    priority: "high",
    documentCount: 5,
    lastActivity: "Il y a 5 jours",
  },
  {
    id: "3",
    name: "Competitor Z",
    website: "https://competitorz.com",
    industry: "Analytics",
    priority: "medium",
    documentCount: 3,
    lastActivity: "Il y a 1 semaine",
  },
  {
    id: "4",
    name: "New Startup",
    linkedinId: "new-startup",
    industry: "AI/ML",
    priority: "low",
    documentCount: 1,
    lastActivity: "Il y a 2 semaines",
  },
];

export default function CompetitorsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [competitors] = useState<Competitor[]>(mockCompetitors);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-teal-100 text-teal-700 border-teal-200";
      case "medium":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Priorité haute";
      case "medium":
        return "Priorité moyenne";
      case "low":
        return "Priorité basse";
      default:
        return priority;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: `/companies/${slug}/dashboard` },
          { label: "Concurrents" },
        ]}
        title="Concurrents"
        description="Gérez et suivez vos concurrents principaux"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un concurrent
          </Button>
        }
      />

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total concurrents</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{competitors.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Haute priorité</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {competitors.filter((c) => c.priority === "high").length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Documents</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {competitors.reduce((sum, c) => sum + c.documentCount, 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avec LinkedIn</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {competitors.filter((c) => c.linkedinId).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Linkedin className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Competitors Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {competitors.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={Users}
                title="Aucun concurrent suivi"
                description="Commencez à surveiller vos concurrents en ajoutant leurs informations. Suivez leur activité, analysez leurs documents et restez informé."
                action={{
                  label: "Ajouter un concurrent",
                  onClick: () => {}, // TODO: Implement add competitor
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitors.map((competitor) => (
            <Card key={competitor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-50 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{competitor.name}</CardTitle>
                      {competitor.industry && (
                        <CardDescription className="text-xs mt-0.5">
                          {competitor.industry}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge className={getPriorityColor(competitor.priority)}>
                    {getPriorityLabel(competitor.priority)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Links */}
                <div className="flex gap-2">
                  {competitor.website && (
                    <a
                      href={competitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Globe className="h-3 w-3" />
                        Site web
                      </Button>
                    </a>
                  )}
                  {competitor.linkedinId && (
                    <a
                      href={`https://linkedin.com/company/${competitor.linkedinId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </Button>
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{competitor.documentCount} documents</span>
                  </div>
                  <span className="text-xs text-gray-500">{competitor.lastActivity}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Analyser
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Card */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Ajouter un concurrent
              </p>
              <p className="text-xs text-gray-500">
                Suivez un nouveau concurrent
              </p>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
