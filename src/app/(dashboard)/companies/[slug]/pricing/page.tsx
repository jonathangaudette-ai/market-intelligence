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

// Mock data pour MVP Phase 2
const MOCK_STATS = {
  products: { total: 576, tracked: 576, matched: 107, coverage: 0.185 },
  pricing: { avgGap: -12.4, competitiveAdvantage: 8.2, trend7d: -2.1 },
  competitors: { active: 13, total: 13 },
  alerts: { last7d: 23, trend: 15, critical: 3 },
};

// Mock price history (30 jours)
const MOCK_PRICE_HISTORY = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split('T')[0],
    vous: 4.85 + Math.random() * 0.3,
    swish: 4.10 + Math.random() * 0.2,
    grainger: 4.75 + Math.random() * 0.25,
    vto: 5.20 + Math.random() * 0.15,
  };
});

export default function PricingDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(MOCK_STATS);
  const [priceHistory, setPriceHistory] = useState(MOCK_PRICE_HISTORY);

  // Simulate data loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Pattern standard Market Intelligence */}
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix" },
        ]}
        title="Centre de Prix Concurrentiels"
        description="Surveillance automatisée de 576 produits vs 13 concurrents"
        badge={
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Système opérationnel
          </Badge>
        }
        actions={
          <>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Lancer scan
            </Button>
          </>
        }
      />

      <div className="container mx-auto py-8 space-y-8">
        {/* KPIs Grid - 6 cartes principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Produits Surveillés"
            value={stats.products.total}
            icon={ShoppingCart}
            trend={{ value: 0, label: "vs hier", isPositive: true }}
            iconColor="bg-teal-100 text-teal-600"
            loading={loading}
          />
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
          <StatCard
            label="Concurrents Actifs"
            value={stats.competitors.active}
            icon={Users}
            iconColor="bg-orange-100 text-orange-600"
            loading={loading}
          />
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
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => [`$${value.toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="vous"
                      name="Vous (Dissan)"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="swish"
                      name="Swish"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="grainger"
                      name="Grainger"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="vto"
                      name="VTO"
                      stroke="#F97316"
                      strokeWidth={2}
                      dot={false}
                    />
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
