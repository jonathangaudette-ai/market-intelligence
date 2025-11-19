"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Match {
  match: {
    id: string;
    competitorProductName: string;
    competitorProductUrl: string;
    price: number;
    confidenceScore: number;
    currency: string;
    matchDetails?: {
      reasoning?: string;
    };
  };
  product: {
    name: string;
    sku: string;
    currentPrice: number | string;
  };
  competitor: {
    name: string;
  };
}

export default function MatchesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [slug]);

  async function fetchMatches() {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/matches`);
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error("Error loading matches:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateGap(yourPrice: number, competitorPrice: number): number {
    if (competitorPrice === 0) return 0;
    return ((yourPrice - competitorPrice) / competitorPrice) * 100;
  }

  function getConfidenceBadgeColor(confidenceScore: number): "default" | "secondary" {
    return confidenceScore >= 0.9 ? "default" : "secondary";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          breadcrumbs={[
            { label: "Market Intelligence", href: `/companies/${slug}` },
            { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
            { label: "Matches" },
          ]}
          title="Produits Matchés"
          description="Chargement des correspondances..."
        />
        <div className="container mx-auto py-8 max-w-6xl">
          <div className="text-center text-gray-500">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Matches" },
        ]}
        title="Produits Matchés"
        description={`${matches.length} correspondances identifiées par GPT-5`}
      />

      <div className="container mx-auto py-8 max-w-6xl">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">Aucun match trouvé</p>
              <p className="text-gray-400 text-sm">
                Lancez un scan pour identifier les produits concurrents équivalents
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matches.map((m) => {
              const yourPrice = typeof m.product.currentPrice === 'string'
                ? parseFloat(m.product.currentPrice)
                : m.product.currentPrice;
              const competitorPrice = typeof m.match.price === 'string'
                ? parseFloat(m.match.price)
                : m.match.price;

              const gap = calculateGap(yourPrice, competitorPrice);
              const isHigher = gap > 0;
              const isLower = gap < 0;

              return (
                <Card key={m.match.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Your Product */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Votre Produit</p>
                        <p className="font-semibold text-gray-900">{m.product.name}</p>
                        <p className="text-sm text-gray-600 mt-1">SKU: {m.product.sku}</p>
                        <p className="text-lg font-bold text-teal-600 mt-2">
                          {yourPrice.toFixed(2)} {m.match.currency}
                        </p>
                      </div>

                      {/* Competitor Product */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">
                          Concurrent: {m.competitor.name}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {m.match.competitorProductName}
                        </p>
                        <a
                          href={m.match.competitorProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          Voir produit <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-lg font-bold text-blue-600 mt-2">
                          {competitorPrice.toFixed(2)} {m.match.currency}
                        </p>
                      </div>

                      {/* Price Gap & Confidence */}
                      <div className="flex flex-col items-end justify-between">
                        <Badge
                          variant={getConfidenceBadgeColor(m.match.confidenceScore)}
                          className="mb-2"
                        >
                          Confiance: {(m.match.confidenceScore * 100).toFixed(0)}%
                        </Badge>

                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Écart Prix</p>
                          <div className="flex items-center gap-2 justify-end">
                            {isHigher && <TrendingUp className="h-5 w-5 text-red-600" />}
                            {isLower && <TrendingDown className="h-5 w-5 text-green-600" />}
                            {!isHigher && !isLower && <Minus className="h-5 w-5 text-gray-400" />}
                            <span
                              className={`text-xl font-bold ${
                                isHigher
                                  ? "text-red-600"
                                  : isLower
                                  ? "text-green-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {gap > 0 ? "+" : ""}
                              {gap.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning (if available) */}
                    {m.match.matchDetails?.reasoning && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Raisonnement AI</p>
                        <p className="text-sm text-gray-700 italic">
                          "{m.match.matchDetails.reasoning}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
