"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Target,
  ShoppingCart,
  Clock,
  RefreshCw,
  Search,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  currentPrice: string | null;
  category: string | null;
  brand: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CompetitorMatch {
  id: string;
  competitorName: string;
  competitorSku: string;
  competitorProductName: string;
  competitorPrice: string;
  competitorUrl: string | null;
  matchConfidence: string; // Comes from DB as string
  lastChecked: Date;
  needsRevalidation: boolean | null;
}

interface PricingAnalysis {
  yourPrice: number;
  marketAverage: number;
  minPrice: number;
  maxPrice: number;
  minCompetitor: string;
  maxCompetitor: string;
  pricePosition: number; // 0-100 percentage
  competitiveGap: number; // percentage difference from average
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const productId = params.productId as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [matches, setMatches] = useState<CompetitorMatch[]>([]);
  const [analysis, setAnalysis] = useState<PricingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchProductData() {
      try {
        setLoading(true);

        // Fetch product details
        const productRes = await fetch(`/api/companies/${slug}/pricing/products/${productId}`);
        if (!productRes.ok) throw new Error("Failed to load product");
        const productData = await productRes.json();
        setProduct(productData.product);

        // Fetch competitor matches
        const matchesRes = await fetch(`/api/companies/${slug}/pricing/matches?productId=${productId}`);
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          setMatches(matchesData.matches || []);

          // Calculate pricing analysis if we have matches
          if (matchesData.matches && matchesData.matches.length > 0 && productData.product.currentPrice) {
            const yourPrice = parseFloat(productData.product.currentPrice);
            const competitorPrices = matchesData.matches.map((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice)
            );

            const minPrice = Math.min(...competitorPrices);
            const maxPrice = Math.max(...competitorPrices);
            const avgPrice = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;

            const minMatch = matchesData.matches.find((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice) === minPrice
            );
            const maxMatch = matchesData.matches.find((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice) === maxPrice
            );

            // Calculate position on scale (0-100)
            const pricePosition = ((yourPrice - minPrice) / (maxPrice - minPrice)) * 100;
            const competitiveGap = ((yourPrice - avgPrice) / avgPrice) * 100;

            setAnalysis({
              yourPrice,
              marketAverage: avgPrice,
              minPrice,
              maxPrice,
              minCompetitor: minMatch?.competitorName || "N/A",
              maxCompetitor: maxMatch?.competitorName || "N/A",
              pricePosition,
              competitiveGap,
            });
          }
        }
      } catch (err) {
        console.error("Error loading product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProductData();
  }, [slug, productId]);

  // Handle URL discovery (GPT-5 search)
  async function handleDiscoverUrls() {
    setDiscovering(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error("Discovery failed");
      }

      const data = await response.json();

      if (data.success) {
        // Refresh matches to show newly discovered URLs
        const matchesRes = await fetch(`/api/companies/${slug}/pricing/matches?productId=${productId}`);
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          setMatches(matchesData.matches || []);
        }

        alert(`Découverte terminée!\nURLs découvertes: ${data.totalUrlsDiscovered}\nÉchecs: ${data.totalUrlsFailed}`);
      }
    } catch (error) {
      console.error("Error discovering URLs:", error);
      alert("Erreur lors de la découverte des URLs");
    } finally {
      setDiscovering(false);
    }
  }

  // Handle price scan (skip URL discovery)
  async function handleScanPrices() {
    setScanning(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          skipDiscovery: true // NEW: Skip GPT-5 URL discovery, only scrape prices
        }),
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const data = await response.json();

      if (data.success) {
        // Refresh matches after scan
        const matchesRes = await fetch(`/api/companies/${slug}/pricing/matches?productId=${productId}`);
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          const newMatches = matchesData.matches || [];
          setMatches(newMatches);

          // Recalculate pricing analysis
          if (newMatches.length > 0 && product?.currentPrice) {
            const yourPrice = parseFloat(product.currentPrice);
            const competitorPrices = newMatches.map((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice)
            );

            const minPrice = Math.min(...competitorPrices);
            const maxPrice = Math.max(...competitorPrices);
            const avgPrice = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;

            const minMatch = newMatches.find((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice) === minPrice
            );
            const maxMatch = newMatches.find((m: CompetitorMatch) =>
              parseFloat(m.competitorPrice) === maxPrice
            );

            const pricePosition = ((yourPrice - minPrice) / (maxPrice - minPrice)) * 100;
            const competitiveGap = ((yourPrice - avgPrice) / avgPrice) * 100;

            setAnalysis({
              yourPrice,
              marketAverage: avgPrice,
              minPrice,
              maxPrice,
              minCompetitor: minMatch?.competitorName || "N/A",
              maxCompetitor: maxMatch?.competitorName || "N/A",
              pricePosition,
              competitiveGap,
            });
          }
        }

        alert(`Scan terminé!\n${data.totalCompetitors} concurrents scannés.\nSuccès: ${data.successfulScans}\nÉchecs: ${data.failedScans}`);
      }
    } catch (error) {
      console.error("Error scanning prices:", error);
      alert("Erreur lors du scan des prix");
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Erreur</p>
          <p>{error || "Produit introuvable"}</p>
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${slug}/pricing/products`)}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
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
          { label: "Produits", href: `/companies/${slug}/pricing/products` },
          { label: product.sku },
        ]}
        title={product.name}
        description={`SKU: ${product.sku}`}
        badge={
          product.isActive ? (
            <Badge variant="default" className="bg-green-600">
              Actif
            </Badge>
          ) : (
            <Badge variant="secondary">Inactif</Badge>
          )
        }
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${slug}/pricing/products`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        }
      />

      <div className="container mx-auto py-8 space-y-6">
        {/* Product Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Produit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-mono font-semibold">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marque</p>
                <p className="font-semibold">{product.brand || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Catégorie</p>
                <p className="font-semibold">{product.category || "Non catégorisé"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prix actuel</p>
                <p className="font-semibold text-lg">
                  {product.currentPrice
                    ? `${parseFloat(product.currentPrice).toFixed(2)} $`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Section Description */}
            {product.description ? (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Description du produit
                </h4>
                <div className={`text-sm text-gray-600 leading-relaxed max-w-prose ${expanded ? '' : 'line-clamp-3'}`}>
                  {product.description}
                </div>
                {product.description.length > 150 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-teal-600 hover:underline text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded py-1"
                    aria-expanded={expanded}
                    aria-controls="product-description-content"
                  >
                    {expanded ? 'Réduire' : 'Lire la suite'}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Aucune description disponible
                  </p>
                  <p className="text-xs text-gray-500">
                    Ajoutez une description lors du prochain import pour améliorer le matching IA
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Dernière mise à jour:{" "}
                {new Date(product.updatedAt).toLocaleDateString("fr-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Analysis Card */}
        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Analyse de Prix Concurrentiel
              </CardTitle>
              <CardDescription>
                Position de votre prix par rapport au marché
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Price Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-sm text-teal-700 font-medium">Votre Prix</p>
                  <p className="text-2xl font-bold text-teal-900">
                    ${analysis.yourPrice.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">Prix Moyen Marché</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ${analysis.marketAverage.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">Prix Min</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${analysis.minPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">{analysis.minCompetitor}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-700 font-medium">Prix Max</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ${analysis.maxPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">{analysis.maxCompetitor}</p>
                </div>
              </div>

              {/* Visual Price Position Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Position Prix</span>
                  <span className="font-semibold">
                    {analysis.competitiveGap > 0 ? (
                      <span className="text-orange-600 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        +{Math.abs(analysis.competitiveGap).toFixed(1)}% au-dessus
                      </span>
                    ) : (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        {Math.abs(analysis.competitiveGap).toFixed(1)}% en-dessous
                      </span>
                    )}
                  </span>
                </div>

                {/* Gradient Bar with Position Marker */}
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between text-xs text-gray-500">
                    <div>${analysis.minPrice.toFixed(2)}</div>
                    <div>${analysis.maxPrice.toFixed(2)}</div>
                  </div>
                  <div className="overflow-hidden h-3 text-xs flex rounded-lg bg-gray-200 relative">
                    <div
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                      style={{ width: "100%" }}
                    ></div>
                    {/* Your Price Marker */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-gray-900"
                      style={{ left: `${analysis.pricePosition}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm border">
                          Vous ↓
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Plus compétitif</span>
                    <span>Moins compétitif</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitor Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Correspondances Concurrents ({matches.length})
            </CardTitle>
            <CardDescription>
              Produits équivalents identifiés chez les concurrents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune correspondance trouvée</p>
                <p className="text-sm mb-4">
                  Découvrez d'abord les produits équivalents, puis scannez leurs prix
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={handleDiscoverUrls}
                    disabled={discovering}
                    variant="default"
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Search className={`h-4 w-4 mr-2 ${discovering ? "animate-spin" : ""}`} />
                    {discovering ? "Recherche..." : "Rechercher Équivalents"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-2 justify-end">
                  <Button
                    onClick={handleDiscoverUrls}
                    disabled={discovering}
                    variant="outline"
                    size="sm"
                  >
                    <Search className={`h-4 w-4 mr-2 ${discovering ? "animate-spin" : ""}`} />
                    {discovering ? "Re-recherche..." : "Re-scanner Équivalents"}
                  </Button>
                  <Button
                    onClick={handleScanPrices}
                    disabled={scanning}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                    {scanning ? "Scan en cours..." : "Scanner Prix"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((match) => {
                  const yourPrice = product.currentPrice
                    ? parseFloat(product.currentPrice)
                    : 0;
                  const competitorPrice = parseFloat(match.competitorPrice);
                  const priceDiff =
                    yourPrice > 0
                      ? ((yourPrice - competitorPrice) / competitorPrice) * 100
                      : 0;

                  return (
                    <Card key={match.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(parseFloat(match.matchConfidence) * 100)}% correspondance
                            </Badge>
                            {match.needsRevalidation && (
                              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                URL à revalider
                              </Badge>
                            )}
                          </div>
                          {match.competitorUrl && (
                            <a
                              href={match.competitorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:text-teal-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <CardTitle className="text-base mt-2">
                          {match.competitorName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Produit</p>
                          <p className="text-sm font-medium line-clamp-2">
                            {match.competitorProductName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {match.competitorSku}
                          </p>
                        </div>

                        <div className="pt-3 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Leur prix:</span>
                            {competitorPrice > 0 ? (
                              <span className="text-lg font-bold">
                                ${competitorPrice.toFixed(2)}
                              </span>
                            ) : match.competitorUrl ? (
                              <span className="text-sm text-muted-foreground italic">
                                Prix non scanné
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </div>
                          {yourPrice > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Écart:</span>
                              <span
                                className={`text-sm font-semibold ${
                                  priceDiff > 0 ? "text-orange-600" : "text-green-600"
                                }`}
                              >
                                {priceDiff > 0 ? "+" : ""}
                                {priceDiff.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Vérifié:{" "}
                            {new Date(match.lastChecked).toLocaleDateString("fr-CA")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Recommandations Stratégiques IA
            </CardTitle>
            <CardDescription>
              Actions suggérées basées sur l&apos;analyse concurrentielle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recommendation 1: Competitive Alignment */}
              <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Alignement Compétitif
                    </h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Ajuster le prix pour se positionner à -5% du marché
                    </p>
                    {analysis && (
                      <div className="space-y-1 text-xs text-blue-700">
                        <p>
                          Prix suggéré:{" "}
                          <span className="font-bold">
                            ${(analysis.marketAverage * 0.95).toFixed(2)}
                          </span>
                        </p>
                        <p>Impact volume: +8-12%</p>
                        <p>Impact marge: -3%</p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="mt-3 w-full">
                      Analyser
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recommendation 2: Bundle Strategy */}
              <div className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 mb-2">
                      Stratégie Bundles
                    </h4>
                    <p className="text-sm text-purple-800 mb-3">
                      Créer des lots avec produits complémentaires
                    </p>
                    <div className="space-y-1 text-xs text-purple-700">
                      <p>Réduction suggérée: 15%</p>
                      <p>Impact volume: +20-25%</p>
                      <p>Impact marge: +5%</p>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full">
                      Configurer
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recommendation 3: Premium Positioning */}
              <div className="p-4 border-2 border-amber-200 rounded-lg bg-amber-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-2">
                      Positionnement Premium
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Valoriser la qualité avec certificat ÉcoLogo
                    </p>
                    {analysis && (
                      <div className="space-y-1 text-xs text-amber-700">
                        <p>
                          Prix suggéré:{" "}
                          <span className="font-bold">
                            ${(analysis.marketAverage * 1.15).toFixed(2)}
                          </span>
                        </p>
                        <p>Impact volume: -5%</p>
                        <p>Impact marge: +12%</p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="mt-3 w-full">
                      Évaluer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
