"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  RefreshCw,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  websiteUrl: string;
  isActive: boolean;
  scanFrequency: string;
  lastScanAt: Date | null;
  productsMatched: number;
  createdAt: Date;
}

export default function CompetitorsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitors();
  }, [slug]);

  async function fetchCompetitors() {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/competitors`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCompetitors(data.competitors);
    } catch (error) {
      console.error("Error loading competitors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce concurrent?")) return;

    try {
      const response = await fetch(
        `/api/companies/${slug}/pricing/competitors/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      await fetchCompetitors();
    } catch (error) {
      console.error("Error deleting competitor:", error);
    }
  }

  function extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  const frequencyLabels: Record<string, string> = {
    hourly: "Toutes les heures",
    daily: "Quotidien",
    weekly: "Hebdomadaire",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Concurrents" },
        ]}
        title="Concurrents Surveillés"
        description="Gérer les sites concurrents à surveiller automatiquement"
        actions={
          <Button
            onClick={() => router.push(`/companies/${slug}/pricing/competitors/new`)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter Concurrent
          </Button>
        }
      />

      <div className="container mx-auto py-8 max-w-6xl">
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Chargement...
              </CardContent>
            </Card>
          ) : competitors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Aucun concurrent configuré</p>
                <Button
                  onClick={() => router.push(`/companies/${slug}/pricing/competitors/new`)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier concurrent
                </Button>
              </CardContent>
            </Card>
          ) : (
            competitors.map((comp) => (
              <Card key={comp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {comp.name}
                        </h3>
                        {comp.isActive ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            En pause
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <a
                            href={comp.websiteUrl.startsWith('http') ? comp.websiteUrl : `https://${comp.websiteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline flex items-center gap-1"
                          >
                            {extractDomain(comp.websiteUrl)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <p>Fréquence: {frequencyLabels[comp.scanFrequency] || comp.scanFrequency}</p>
                        <p>
                          Produits matchés:{" "}
                          <span className="font-semibold text-gray-900">
                            {comp.productsMatched}
                          </span>
                        </p>
                        {comp.lastScanAt && (
                          <p>
                            Dernier scan:{" "}
                            {new Date(comp.lastScanAt).toLocaleDateString("fr-CA")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/companies/${slug}/pricing/competitors/${comp.id}`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(comp.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
