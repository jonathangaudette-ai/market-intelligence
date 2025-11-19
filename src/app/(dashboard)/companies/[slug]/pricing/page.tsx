"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  DollarSign,
  Target,
  Users,
  Bell,
  BarChart3,
  Sparkles,
  AlertCircle,
  Download,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Type definitions for API responses
interface Stats {
  products: { total: number; tracked: number; matched: number; coverage: number };
  pricing: { avgGap: number; competitiveAdvantage: number; trend7d: number };
  competitors: { active: number; total: number };
  alerts: { last7d: number; trend: number; critical: number };
}

interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

export default function PricingDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<Stats>({
    products: { total: 0, tracked: 0, matched: 0, coverage: 0 },
    pricing: { avgGap: 0, competitiveAdvantage: 0, trend7d: 0 },
    competitors: { active: 0, total: 0 },
    alerts: { last7d: 0, trend: 0, critical: 0 },
  });
  const [priceHistory, setPriceHistory] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats from API
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/companies/${slug}/pricing/stats`);
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error loading stats:", err);
        setError(err instanceof Error ? err.message : "Failed to load stats");
      }
    }

    fetchStats();
  }, [slug]);

  // Fetch price history from API
  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/companies/${slug}/pricing/history?days=30`);
        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }
        const data = await response.json();

        // Transform API data to chart format
        const chartData = transformHistoryToChart(data.trends);
        setPriceHistory(chartData);
      } catch (err) {
        console.error("Error loading history:", err);
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [slug]);

  // Transform history data to chart format
  function transformHistoryToChart(trends: any[]): ChartDataPoint[] {
    // Group by date
    const grouped: { [date: string]: ChartDataPoint } = {};

    // Process trends from API
    trends.forEach((trend) => {
      const date = trend.date;
      if (!grouped[date]) {
        grouped[date] = { date };
      }

      if (!trend.competitorId || trend.competitorName === null) {
        // Your prices (competitorId is null)
        grouped[date].vous = parseFloat(trend.avgPrice);
      } else {
        // Competitor prices - use competitor name as key
        const competitorKey = trend.competitorName.toLowerCase().replace(/\s+/g, '_');
        grouped[date][competitorKey] = parseFloat(trend.avgPrice);
      }
    });

    // Convert to array and sort by date
    return Object.values(grouped).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  // Handle trigger scan
  async function handleTriggerScan() {
    setScanning(true);
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Scan all competitors
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const data = await response.json();

      // Show success message
      if (data.success) {
        alert(`Scan lancé avec succès!\n${data.totalCompetitors} concurrents scannés.\nSuccès: ${data.successfulScans}\nÉchecs: ${data.failedScans}`);

        // Refresh stats after scan
        const statsResponse = await fetch(`/api/companies/${slug}/pricing/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error("Error triggering scan:", error);
      alert("Erreur lors du lancement du scan");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Pattern standard Market Intelligence */}
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix" },
        ]}
        title="Centre de Prix Concurrentiels"
        description={`Surveillance automatisée de ${stats.products.total} produits vs ${stats.competitors.active} concurrents`}
        badge={
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Système opérationnel
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/companies/${slug}/pricing/catalog`)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer catalogue
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scan en cours..." : "Lancer scan"}
            </Button>
          </>
        }
      />

      <div className="container mx-auto py-8 space-y-8">
        {/* KPIs Grid - 6 cartes principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => router.push(`/companies/${slug}/pricing/products`)}
          >
            <StatCard
              label="Produits Surveillés"
              value={stats.products.total}
              icon={ShoppingCart}
              trend={{ value: 0, label: "vs hier", isPositive: true }}
              iconColor="bg-teal-100 text-teal-600"
              loading={loading}
            />
          </div>
          <StatCard
            label="Écart Prix Moyen"
            value={`${stats.pricing.avgGap}%`}
            icon={DollarSign}
            trend={{ value: stats.pricing.trend7d, label: "7 jours", isPositive: false }}
            iconColor="bg-blue-100 text-blue-600"
            loading={loading}
          />
          <StatCard
            label="Avantage Compétitif"
            value={`+${stats.pricing.competitiveAdvantage}%`}
            icon={Target}
            trend={{ value: 1.3, label: "7 jours", isPositive: true }}
            iconColor="bg-purple-100 text-purple-600"
            loading={loading}
          />
          <div
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => router.push(`/companies/${slug}/pricing/competitors`)}
          >
            <StatCard
              label="Concurrents Actifs"
              value={stats.competitors.active}
              icon={Users}
              iconColor="bg-orange-100 text-orange-600"
              loading={loading}
            />
          </div>
          <StatCard
            label="Alertes (7 jours)"
            value={stats.alerts.last7d}
            icon={Bell}
            trend={{ value: stats.alerts.trend, label: "vs hier", isPositive: false }}
            iconColor="bg-red-100 text-red-600"
            loading={loading}
          />
          <StatCard
            label="Couverture Marché"
            value={`${(stats.products.coverage * 100).toFixed(1)}%`}
            icon={BarChart3}
            iconColor="bg-green-100 text-green-600"
            loading={loading}
          />
        </div>

        {/* Main Content Grid 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique principal (2/3) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Évolution des Prix - 30 Derniers Jours</CardTitle>
              <CardDescription>
                Comparaison vos prix moyens vs 3 concurrents principaux
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chargement...
                </div>
              ) : error ? (
                <div className="h-[300px] flex items-center justify-center text-red-600">
                  Erreur: {error}
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée d&apos;historique disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`, ""]}
                    />
                    <Legend />

                    {/* Your price line (always first, thicker) */}
                    {priceHistory[0]?.vous !== undefined && (
                      <Line
                        type="monotone"
                        dataKey="vous"
                        name="Vous"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={false}
                      />
                    )}

                    {/* Dynamically render competitor lines */}
                    {priceHistory.length > 0 && Object.keys(priceHistory[0])
                      .filter(key => key !== 'date' && key !== 'vous')
                      .map((competitorKey, index) => {
                        const colors = ['#3B82F6', '#8B5CF6', '#F97316', '#EF4444', '#10B981', '#F59E0B'];
                        const competitorName = competitorKey.replace(/_/g, ' ')
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');

                        return (
                          <Line
                            key={competitorKey}
                            type="monotone"
                            dataKey={competitorKey}
                            name={competitorName}
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        );
                      })
                    }
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sidebar Insights IA (1/3) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                Insights IA
              </CardTitle>
              <CardDescription>Alertes et recommandations GPT-5</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Alerte Critique */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-900">
                      Swish a réduit 12 brosses de -15%
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Action recommandée sous 48h
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerte Warning */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-yellow-900">
                      "Brosse cuvette ATL-2024" +23% au-dessus
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Positionné premium vs marché
                    </p>
                  </div>
                </div>
              </div>

              {/* Opportunité */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-900">
                      45 produits sans équivalent concurrent
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Opportunité pricing premium
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
