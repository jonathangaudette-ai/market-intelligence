# Plan Initial - Module Competitive Pricing Intelligence

**Version:** 1.1 (Révisé)
**Date Création:** 19 novembre 2025
**Dernière Révision:** 19 novembre 2025
**Auteur:** Product Management & UX Team
**Status:** ✅ Révisé - Aligné Architecture Existante

---

## ⚠️ Note Importante - Révision Architecture

**Ce plan a été révisé par l'Architecte Technique pour aligner avec l'infrastructure existante.**

**Changements Majeurs:**
1. ✅ **Stack Frontend:** Ajusté pour utiliser composants existants (Radix UI, pas Zustand/TanStack Query)
2. ✅ **Stack Backend:** Pattern polling PostgreSQL au lieu de BullMQ/Redis
3. ✅ **Database:** CUID2 pattern au lieu de UUID (cohérence)
4. ✅ **Storage:** Vercel Blob au lieu de AWS S3
5. ✅ **Budget:** -$34.3K/an (-3.7%) grâce à réutilisation infrastructure

**Résultat:**
- 💰 Économie $34.3K Année 1
- ⏱️ Temps développement réduit de 10-15%
- 🎯 100% cohérence architecture
- 📄 Voir [revision-architecture-technique.md](./revision-architecture-technique.md) pour détails complets

---

## Table des Matières

1. [Vision & Stratégie](#1-vision--stratégie)
2. [Architecture](#2-architecture)
3. [Maquettes Visuelles](#3-maquettes-visuelles)
4. [Fonctionnalités par Phase](#4-fonctionnalités-par-phase)
5. [Spécifications Techniques](#5-spécifications-techniques)
6. [UX/UI Design](#6-uxui-design)
7. [Métriques de Succès](#7-métriques-de-succès)
8. [Roadmap & Timeline](#8-roadmap--timeline)
9. [Ressources & Budget](#9-ressources--budget)
10. [Risques & Mitigation](#10-risques--mitigation)

---

## 1. Vision & Stratégie

### 1.1 Proposition de Valeur

**"Automatiser la surveillance des prix concurrentiels et transformer les données de pricing en avantage compétitif actionable"**

Le module Competitive Pricing Intelligence permet aux entreprises de:
- ✅ Surveiller automatiquement les prix de 13+ concurrents
- ✅ Identifier les opportunités de repositionnement tarifaire
- ✅ Recevoir des alertes en temps réel sur les changements critiques
- ✅ Prendre des décisions data-driven avec recommandations IA
- ✅ Mesurer l'impact des stratégies pricing sur les ventes

### 1.2 User Personas

#### Persona 1: Pricing Manager (Primaire)
**Sarah, 35 ans, Directrice Pricing**
- **Objectifs:** Optimiser marges tout en restant compétitif, réagir rapidement aux mouvements marché
- **Pain Points:** Surveillance manuelle chronophage (8h/semaine), données fragmentées, manque de visibilité temps réel
- **Gains Attendus:** Économie 6h/semaine, décisions plus rapides (72h → 4h), augmentation marge 3-5%

#### Persona 2: Product Manager (Secondaire)
**Marc, 42 ans, Chef de Produit**
- **Objectifs:** Comprendre positionnement marché, identifier gaps concurrentiels
- **Pain Points:** Manque de contexte prix dans décisions produit, analyse concurrentielle limitée
- **Gains Attendus:** Vision holistique produit+prix, meilleure priorisation R&D

#### Persona 3: Competitive Intelligence Director (Primaire)
**Julie, 38 ans, Directrice CI**
- **Objectifs:** Vue 360° compétition (produits, prix, messaging, fonctionnalités)
- **Pain Points:** Données pricing isolées, pas d'intégration avec autres insights CI
- **Gains Attendus:** Plateforme unifiée, corrélations pricing-battlecards-win/loss

### 1.3 Positionnement Compétitif

**vs. Solutions Généralistes (Prisync, Competera)**
| Critère | Market Intelligence Pricing | Prisync/Competera |
|---------|----------------------------|-------------------|
| Intégration CI | ✅ Natif (battlecards, win/loss) | ❌ Standalone |
| AI Recommendations | ✅ GPT-5 contextualisé | ⚠️ Règles basiques |
| Characteristic Matching | ✅ Cross-brand matching | ❌ Exact match only |
| B2B Focus | ✅ Optimisé B2B | ⚠️ E-commerce focus |

**Différenciation Clé:**
> "Le seul module de pricing intelligence intégré nativement dans une plateforme CI complète, permettant de corréler prix, produits, et résultats commerciaux."

---

## 2. Architecture

### 2.1 Intégration dans la Plateforme - 5 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: MEASUREMENT & ANALYTICS                                │
│ ────────────────────────────────────────────────────────────────│
│ • ROI du pricing dynamique                                      │
│ • Impact pricing sur win rate (corrélation avec Win/Loss module)│
│ • Price elasticity analysis                                     │
│ • Attribution revenue aux ajustements tarifaires                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: ACTIVATION & DISTRIBUTION                              │
│ ────────────────────────────────────────────────────────────────│
│ • Alertes changements prix (>5%, outliers, nouvelles promos)    │
│ • Recommandations pricing AI (GPT-5)                            │
│ • Distribution auto: Slack, Email, CRM                          │
│ • Intégration Battle Hub (enrichissement battlecards)           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: INTELLIGENCE & SYNTHESIS (AI) ← NOUVEAU MODULE         │
│ ────────────────────────────────────────────────────────────────│
│ • Analyse trends pricing (hebdo, mensuel, trimestriel)          │
│ • Prédictions mouvements prix (ML forecasting)                  │
│ • Competitive positioning maps                                  │
│ • Gap analysis & strategic recommendations                      │
│ • Clustering produits par stratégie concurrentielle             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: PROCESSING & ENRICHMENT                                │
│ ────────────────────────────────────────────────────────────────│
│ • Normalisation prix (devises, unités, volumes)                 │
│ • Matching produits (characteristic-based, 3-tier)              │
│ • Détection outliers/anomalies (Z-score, IQR)                   │
│ • Enrichissement metadata (catégories, marques, specs)          │
│ • Déduplication et consolidation                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: COLLECTION & INGESTION                                 │
│ ────────────────────────────────────────────────────────────────│
│ • Scraping automatisé Playwright (13+ sites configurés)         │
│ • API intégrations (si disponibles)                             │
│ • Import manuel Excel/CSV (user upload)                         │
│ • Scheduling flexible (daily, weekly, custom cron)              │
│ • Queue system (BullMQ) pour gestion charge                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flux de Données

```
┌─────────────┐
│   USER      │
│  (Upload    │
│  Catalog)   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  API ENDPOINT: /api/pricing/products (POST)             │
│  - Validation schema                                    │
│  - Extraction caractéristiques (characteristic-matcher) │
│  - Storage PostgreSQL                                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  SCAN SCHEDULER (BullMQ Jobs)                           │
│  - Crée jobs par competitor                             │
│  - Priority queue (high: daily sites, low: weekly)      │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  SCRAPERS (Playwright Workers)                          │
│  - Parallel execution (max 3 concurrent)                │
│  - Stealth mode (bypass Cloudflare)                     │
│  - Checkpoint system (recovery)                         │
│  - Output: JSON results                                 │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  MATCHING ENGINE                                        │
│  - Tier 1: SKU exact match                              │
│  - Tier 2: Name similarity (80%+)                       │
│  - Tier 3: Characteristic matching (50%+)               │
│  - Confidence scoring                                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  STORAGE & HISTORY                                      │
│  - competitor_matches (current state)                   │
│  - price_history (time-series)                          │
│  - Indexation pour analytics                            │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  AI ANALYSIS (GPT-5)                                    │
│  - Price recommendations                                │
│  - Trend analysis                                       │
│  - Strategic insights                                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────────────┐
│  ALERT ENGINE                                           │
│  - Rule evaluation (custom rules)                       │
│  - Notification dispatch (Slack, Email)                 │
│  - Alert history & tracking                             │
└──────┬──────────────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│  DASHBOARD  │
│  (User View)│
└─────────────┘
```

---

## 3. Maquettes Visuelles

> **⚠️ Note Design System:** Ces maquettes utilisent le design system officiel de la plateforme Market Intelligence (Teal-600, Radix UI, Lucide Icons, pas d'emojis). Pour les guidelines complètes, voir [design-system-guidelines.md](./design-system-guidelines.md).

### 3.1 Dashboard Principal - "Centre de Prix Concurrentiels"

**Implementation React/TypeScript:**

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, DollarSign, Target, Users, Bell, BarChart3,
  TrendingUp, TrendingDown, Sparkles, AlertCircle, RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PricingDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec breadcrumbs - Pattern standard Market Intelligence */}
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
            value={576}
            icon={ShoppingCart}
            trend={{ value: 0, label: "vs hier", isPositive: true }}
            iconColor="bg-teal-100 text-teal-600"
          />
          <StatCard
            label="Écart Prix Moyen"
            value="-12.4%"
            icon={DollarSign}
            trend={{ value: -2.1, label: "7 jours", isPositive: false }}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Avantage Compétitif"
            value="+8.2%"
            icon={Target}
            trend={{ value: 1.3, label: "7 jours", isPositive: true }}
            iconColor="bg-purple-100 text-purple-600"
          />
          <StatCard
            label="Concurrents Actifs"
            value={13}
            icon={Users}
            iconColor="bg-orange-100 text-orange-600"
          />
          <StatCard
            label="Alertes (7 jours)"
            value={23}
            icon={Bell}
            trend={{ value: 15, label: "vs hier", isPositive: false }}
            iconColor="bg-red-100 text-red-600"
          />
          <StatCard
            label="Couverture Marché"
            value="18.5%"
            icon={BarChart3}
            iconColor="bg-green-100 text-green-600"
          />
        </div>

        {/* Main Content - Grid 2/3 + 1/3 */}
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="vous" name="Vous (Dissan)" stroke="#059669" strokeWidth={3} />
                  <Line type="monotone" dataKey="swish" name="Swish" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="grainger" name="Grainger" stroke="#8B5CF6" strokeWidth={2} />
                  <Line type="monotone" dataKey="vto" name="VTO" stroke="#F97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
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
                  <div>
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
                  <div>
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
                  <div>
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
```

**Résultat Visuel (Maquette Wireframe):**

```
┌────────────────────────────────────────────────────────────────────────┐
│ Market Intelligence > Intelligence de Prix            [Système opérationnel] │
│ Centre de Prix Concurrentiels                         [Exporter] [Lancer scan] │
│ Surveillance automatisée de 576 produits vs 13 concurrents            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│ │ Produits     │ │ Écart Prix   │ │ Avantage     │  [Icon: teal]  │
│ │ Surveillés   │ │ Moyen        │ │ Compétitif   │                 │
│ │              │ │              │ │              │                 │
│ │ 576          │ │ -12.4% ↓     │ │ +8.2% ↑      │  text-3xl      │
│ │ +0 vs hier   │ │ -2.1% 7j     │ │ +1.3% 7j     │  text-xs       │
│ └──────────────┘ └──────────────┘ └──────────────┘                 │
│                                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│ │ Concurrents  │ │ Alertes      │ │ Couverture   │                 │
│ │ Actifs       │ │ (7 jours)    │ │ Marché       │                 │
│ │ 13           │ │ 23 +15↑      │ │ 18.5%        │                 │
│ └──────────────┘ └──────────────┘ └──────────────┘                 │
│                                                                        │
│ ┌────────────────────────────────────┐ ┌─────────────────────────┐ │
│ │ Évolution des Prix - 30 jours      │ │ Insights IA [Sparkles]  │ │
│ │ ╭──────────────────────────╮       │ │                         │ │
│ │ │ [LineChart Recharts]     │       │ │ ┌─────────────────────┐ │ │
│ │ │ Ligne Vous (teal-600)    │       │ │ │ 🔴 CRITIQUE         │ │ │
│ │ │ Ligne Swish (blue-500)   │       │ │ │ Swish -15% brosses  │ │ │
│ │ │ Ligne Grainger (purple)  │       │ │ │ Action sous 48h     │ │ │
│ │ │ Ligne VTO (orange)       │       │ │ └─────────────────────┘ │ │
│ │ ╰──────────────────────────╯       │ │ ┌─────────────────────┐ │ │
│ └────────────────────────────────────┘ │ │ 🟡 WARNING          │ │ │
│                                         │ │ ATL-2024 +23%       │ │ │
│                                         │ └─────────────────────┘ │ │
│                                         │ ┌─────────────────────┐ │ │
│                                         │ │ 🟢 OPPORTUNITÉ      │ │ │
│                                         │ │ 45 produits uniques │ │ │
│                                         │ └─────────────────────┘ │ │
└────────────────────────────────────────────────────────────────────────┘
```

**Interactions Clés:**
- KPI cards cliquables → drill-down détails
- Graphique Recharts interactif avec hover tooltips
- Insights cliquables → action directe (voir détails, créer stratégie)
- Polling pattern (refresh toutes les 2-5s) pour updates temps réel

### 3.2 Catalogue de Produits - Vue Liste

**Implementation React/TypeScript:**

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Filter, Download, Search } from "lucide-react";

export default function ProductCatalogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Catalogue" },
        ]}
        title="Catalogue Produits"
        description="576 produits surveillés | 107 matchés (18.5%)"
      />

      <div className="container mx-auto py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tous les Produits</CardTitle>
              <CardDescription>Filtrez et analysez votre catalogue complet</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher SKU, nom..."
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Votre Prix</TableHead>
                  <TableHead className="text-right">Marché Min</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">ATL-2024</TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="font-medium text-sm truncate">
                        Brosse cuvette polypropylene
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Catégorie: Brosses | 3/13 concurrents
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">$4.99</TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">$3.85</p>
                      <p className="text-xs text-muted-foreground">Swish</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-red-600">+23%</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 border-yellow-300">
                      Attention
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {/* ... autres rows */}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Affichage 1-50 sur 576 produits
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Précédent</Button>
                <Button variant="outline" size="sm">Suivant</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Fonctionnalités:**
- Recherche instantanée (debounced search avec icône `Search`)
- Filtres multi-critères (dropdown avec logique AND/OR)
- Tri dynamique (click sur headers de colonnes)
- Export Excel avec filtres appliqués
- Actions bulk (sélection multiple avec checkboxes)
- Hover states sur rows (`hover:bg-gray-50`)

### 3.3 Page Détail Produit

**Implementation React/TypeScript (Aperçu simplifié):**

```tsx
export default function ProductDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Catalogue", href: `/companies/${slug}/pricing/catalog` },
          { label: "ATL-2024" },
        ]}
        title="Brosse à Cuvette Polypropylene"
        description="ATL-2024 | Catégorie: Brosses | 3/13 concurrents"
        badge={
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            +23% au-dessus marché
          </Badge>
        }
        actions={
          <>
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Historique
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Ajuster Prix
            </Button>
          </>
        }
      />

      <div className="container mx-auto py-8 space-y-6">
        {/* KPIs Row - 4 cartes info principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Votre Prix</span>
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-3xl font-bold">$4.99</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Min Marché</span>
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">$3.85</p>
              <p className="text-xs text-muted-foreground mt-1">Swish</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Moyenne Marché</span>
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold">$4.10</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Écart vs Marché</span>
                <Target className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">+23%</p>
              <p className="text-xs text-red-600 font-medium mt-1">AU-DESSUS</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique Historique + Matches (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Graphique */}
            <Card>
              <CardHeader>
                <CardTitle>Historique 90 Jours</CardTitle>
                <CardDescription>Évolution prix vs 3 concurrents</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="vous" name="Vous" stroke="#059669" strokeWidth={3} />
                    <Line type="monotone" dataKey="swish" name="Swish" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="grainger" name="Grainger" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="vto" name="VTO" stroke="#F97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Correspondances Concurrentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Correspondances Concurrentes (3)
                </CardTitle>
                <CardDescription>Produits équivalents identifiés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Swish", price: 3.85, match: 92, gap: -22.8 },
                  { name: "Grainger", price: 3.95, match: 85, gap: -20.8 },
                  { name: "VTO", price: 4.50, match: 87, gap: -9.8 },
                ].map((comp) => (
                  <div key={comp.name} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{comp.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Match: {comp.match}%
                            </Badge>
                            <span className="text-xs font-semibold text-red-600">
                              {comp.gap}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${comp.price}</p>
                        <Button variant="ghost" size="sm" className="mt-1">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Voir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Recommandations IA (1/3) */}
          <div className="space-y-6">
            {/* Caractéristiques Produit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-teal-600" />
                  Caractéristiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">bowl brush</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matériau</span>
                  <Badge variant="outline">polypropylene</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Feature</span>
                  <Badge variant="outline">turks head</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recommandations IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                  Recommandations IA
                </CardTitle>
                <CardDescription>Stratégies pricing GPT-5</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { num: 1, title: "Alignement compétitif", price: "$4.25", change: "-14.8%", desc: "Alignement sur moyenne marché" },
                  { num: 2, title: "Bundling stratégique", price: "$12.99", change: "Bundle 3x", desc: "Paquet de 3 unités" },
                  { num: 3, title: "Premium positioning", price: "$4.99", change: "Maintenir", desc: "Différenciation qualité" },
                ].map((rec) => (
                  <div key={rec.num} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {rec.num}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.desc}</p>
                        <p className="text-sm font-semibold text-teal-600 mt-2">
                          {rec.price} ({rec.change})
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Interactions Avancées:**
- Graphique Recharts zoomable/pannable (via props `syncId`, `brush`)
- Hover sur concurrent → tooltip Recharts avec détails prix/date
- Click recommandation → Dialog modal avec simulation impact (revenue, marge)
- Annotations possibles sur timeline (via custom Recharts layer)
- Bookmarking produits via icon `Star` (toggle favoris)

### 3.4 Analyse Concurrentielle

**Implementation React/TypeScript:**

```tsx
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CompetitiveAnalysisPage() {
  const positioningData = [
    { name: "Vous (Dissan)", x: 58, y: 105, fill: "#059669" },
    { name: "Swish", x: 82, y: 88, fill: "#3B82F6" },
    { name: "Grainger", x: 45, y: 103, fill: "#8B5CF6" },
    { name: "VTO", x: 32, y: 115, fill: "#F97316" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Analyse Concurrentielle" },
        ]}
        title="Analyse Concurrentielle"
        description="Matrice positionnement et profils détaillés de 13 concurrents"
      />

      <div className="container mx-auto py-8 space-y-6">
        {/* Matrice Positionnement (Scatter Plot) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              Matrice de Positionnement Compétitif
            </CardTitle>
            <CardDescription>
              Prix moyen (axe Y) vs Couverture marché % (axe X)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="x"
                  name="Couverture"
                  unit="%"
                  stroke="#6B7280"
                  label={{ value: 'Couverture Marché (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  dataKey="y"
                  name="Prix"
                  unit="$"
                  stroke="#6B7280"
                  label={{ value: 'Prix Moyen Index', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-md">
                          <p className="font-semibold text-sm">{data.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Couverture: {data.x}% | Prix: {data.y}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Scatter name="Concurrents" data={positioningData} />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Légende positionnement */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-teal-600"></div>
                  <p className="font-semibold text-sm text-teal-900">Vous (Dissan)</p>
                </div>
                <p className="text-xs text-teal-700">
                  Prix moyen-élevé, Couverture moyenne
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <p className="font-semibold text-sm text-blue-900">Swish</p>
                </div>
                <p className="text-xs text-blue-700">
                  Low-cost leader, Haute couverture (leader volume)
                </p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <p className="font-semibold text-sm text-purple-900">Grainger</p>
                </div>
                <p className="text-xs text-purple-700">
                  Prix moyen, Couverture moyenne (service premium)
                </p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <p className="font-semibold text-sm text-orange-900">VTO</p>
                </div>
                <p className="text-xs text-orange-700">
                  Premium pricing, Faible couverture (qualité)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profils Concurrents Détaillés */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { name: "Swish", matches: 94, gap: -18.2, strategy: "Volume", color: "blue" },
            { name: "Grainger", matches: 45, gap: 3.2, strategy: "Service premium", color: "purple" },
            { name: "VTO", matches: 32, gap: 12.8, strategy: "Premium quality", color: "orange" },
          ].map((comp) => (
            <Card key={comp.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className={`h-5 w-5 text-${comp.color}-600`} />
                  {comp.name}
                </CardTitle>
                <CardDescription>Profil compétitif détaillé</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produits matchés</span>
                  <span className="font-semibold">{comp.matches}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Écart prix moyen</span>
                  <span className={`font-semibold ${comp.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comp.gap > 0 ? '+' : ''}{comp.gap}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stratégie</span>
                  <Badge variant="outline">{comp.strategy}</Badge>
                </div>
                <Button variant="outline" className="w-full mt-4" size="sm">
                  Voir profil complet
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Interactions:**
- Scatter plot interactif (hover sur points → tooltip avec détails)
- Click sur point → navigation vers profil concurrent
- Zoom/Pan activable via props Recharts
- Quadrants colorés pour stratégies (Low-cost, Premium, Niche, Volume)

---

## 4. Fonctionnalités par Phase

### 4.1 Phase 1: MVP (Mois 1-3) - **"Foundation"**

**Objectif:** Valider le besoin, prouver la valeur avec fonctionnalités core.

#### Features Priorité P0 (Must-Have)

**F1.1 - Gestion Catalogue Produits**
- Upload Excel/CSV (SKU, Nom, Prix, Catégorie)
- Validation schema + preview avant import
- CRUD produits (Create, Read, Update, Delete)
- Extraction automatique caractéristiques
- **User Story:** "En tant que Pricing Manager, je veux importer mon catalogue de 500+ produits en <2 minutes pour commencer la surveillance."

**F1.2 - Configuration Concurrents**
- Interface de configuration sites concurrents
- Paramètres: URL base, CSS selectors, fréquence scan
- Templates pré-configurés (Swish, Grainger, VTO, etc.)
- Test mode (scan 5 produits pour validation)
- **User Story:** "Je veux configurer 3 concurrents en <15 minutes sans compétences techniques."

**F1.3 - Scraping Automatisé**
- Engine Playwright avec stealth mode
- Scheduling flexible (daily, weekly, custom cron)
- Checkpoint system (auto-save tous les 50 produits)
- Logs détaillés + gestion erreurs
- **Acceptance Criteria:**
  - Scan 500 produits / 3 sites en <12h
  - Success rate >85%
  - 0 crash complet (recovery automatique)

**F1.4 - Dashboard Vue d'Ensemble**
- KPIs principaux (produits surveillés, écart prix moyen, alertes)
- Liste produits avec statut pricing (bien positionné, attention, critique)
- Filtres basiques (catégorie, statut)
- Export Excel simple
- **User Story:** "Je veux une vue d'ensemble de ma position concurrentielle en <30 secondes d'ouverture du dashboard."

**F1.5 - Alertes Email Basiques**
- Règle unique: "Prix concurrent change de >10%"
- Email digest quotidien
- Notification individuelle pour changements critiques (>20%)
- **User Story:** "Je veux être notifié dans les 24h si un concurrent baisse un prix de >10%."

#### Features Priorité P1 (Should-Have)

**F1.6 - Page Détail Produit**
- Info produit + caractéristiques extraites
- Liste concurrents matchés avec confiance score
- Graphique historique basique (30 jours)

**F1.7 - Matching Multi-Tier**
- Tier 1: SKU exact
- Tier 2: Name similarity (80%+)
- Tier 3: Characteristic matching (50%+)
- Confidence scoring

#### Métriques de Succès Phase 1

| Métrique | Target | Mesure |
|----------|--------|--------|
| Adoption | 80% utilisateurs activent module | Analytics |
| Time-to-Value | <1 heure premier insight | User tracking |
| Satisfaction | NPS >40 | Survey post-onboarding |
| Scan Success Rate | >85% produits scannés sans erreur | Logs système |
| Fréquence utilisation | 3x/semaine minimum | Analytics |

**Timeline:** 12 semaines
**Ressources:** 1 Backend Dev, 1 Frontend Dev, 1 QA, 0.5 PM

---

### 4.2 Phase 2: Intelligence (Mois 4-6) - **"Smart Insights"**

**Objectif:** Ajouter IA, analytics avancés, automation.

#### Features Priorité P0

**F2.1 - AI Recommendations (GPT-5)**
- 3 stratégies par produit (alignement, bundling, premium)
- Simulation impact (volume, revenue, marge)
- Justification contextualisée
- **User Story:** "Je veux 3 recommandations actionnables basées sur l'IA pour chaque produit en situation d'écart >15%."

**F2.2 - Analytics Avancés**
- Trends pricing (hebdo, mensuel, trimestriel)
- Competitive positioning matrix (scatter plot 2D)
- Distribution prix par catégorie
- Heatmaps saisonnalité
- **Acceptance Criteria:**
  - 8 types de visualisations disponibles
  - Export PNG/PDF des graphiques
  - Interactivité (zoom, pan, tooltips)

**F2.3 - Historique Prix (Time-Series)**
- Stockage historique complet (1 an)
- Graphiques multi-lignes interactifs
- Détection automatique tendances (stable, hausse, baisse)
- Annotations événements (promos, lancements)

**F2.4 - Alert Rules Engine**
- Règles personnalisables (IF-THEN logic)
- Types: Price drop, Price increase, New product, Out of stock
- Canaux multiples: Email, Slack, Webhook
- Fréquence configurable (real-time, daily digest, weekly)
- **User Story:** "Je veux créer une règle complexe: 'Si Swish OU Grainger baisse >15% sur catégorie Brosses, ET notre écart devient >20%, alerter Slack #pricing en temps réel'."

#### Features Priorité P1

**F2.5 - Competitive Profiles**
- Profil détaillé par concurrent (stratégie, forces, faiblesses)
- Timeline événements (changements prix, promos)
- Share of Voice (% produits couverts)

**F2.6 - Batch Actions**
- Sélection multiple produits
- Actions groupées (ajuster prix, créer alerte, exporter)
- Approval workflow (suggérer changement → validation manager)

#### Métriques de Succès Phase 2

| Métrique | Target | Mesure |
|----------|--------|--------|
| AI Recommendation Adoption | 60% utilisateurs appliquent ≥1 reco/mois | Tracking actions |
| Advanced Analytics Usage | 40% utilisateurs explorent analytics 1x/semaine | Analytics |
| Custom Alert Rules | Moyenne 3 règles actives/utilisateur | Database |
| Decision Speed | Réduction 50% temps décision pricing (72h → 36h) | Survey |

**Timeline:** 12 semaines
**Ressources:** 1 Backend Dev, 1 Frontend Dev, 1 ML Engineer (part-time), 1 QA, 0.5 PM

---

### 4.3 Phase 3: Automation & Scale (Mois 7-12) - **"Enterprise Ready"**

**Objectif:** Automation complète, intégrations, scalabilité.

#### Features Priorité P0

**F3.1 - Dynamic Pricing Engine**
- Règles auto-ajustement prix (dans marges définies)
- Approval workflow optionnel
- A/B testing pricing strategies
- Rollback automatique si impact négatif
- **User Story:** "Je veux tester automatiquement une stratégie d'alignement à -5% vs Swish sur 20 SKUs pendant 30 jours, avec rollback auto si ventes <-10%."

**F3.2 - ERP/CRM Integrations**
- Salesforce: Sync prix, enrichir opportunités
- NetSuite/SAP: Push prix ajustés
- HubSpot: Enrich contacts avec insights pricing
- API bidirectionnelle (webhook + REST)
- **Acceptance Criteria:**
  - 3 intégrations natives (Salesforce, HubSpot, NetSuite)
  - <5 min configuration par intégration
  - Sync temps réel (<1 min latency)

**F3.3 - Multi-Currency & Multi-Market**
- Support 10+ devises (taux change auto-update)
- Normalisation prix par unité (litres, kg, pièces)
- Marchés géographiques séparés (CA, US, EU)
- **User Story:** "Je veux comparer mes prix CAD avec concurrents USD en normalisant par litre ET en convertissant au taux du jour."

**F3.4 - Mobile App (iOS/Android)**
- Dashboard mobile responsive
- Notifications push temps réel
- Actions rapides (approve/reject price change)
- Offline mode (cache last sync)

#### Features Priorité P1

**F3.5 - Collaborative Features**
- Commentaires sur produits/alertes
- @mentions équipe
- Approval workflows multi-niveaux
- Activity feed (qui a fait quoi)

**F3.6 - Predictive Analytics**
- Forecasting prix concurrents (30/60/90 jours)
- Scenario planning ("What if Swish baisse 10% sur Q1?")
- Correlation analysis (prix vs win rate vs revenue)

**F3.7 - API Publique**
- REST API complète (read/write)
- Webhooks outbound (événements)
- SDK JavaScript/Python
- Documentation OpenAPI/Swagger

#### Métriques de Succès Phase 3

| Métrique | Target | Mesure |
|----------|--------|--------|
| Dynamic Pricing Adoption | 30% comptes utilisent auto-adjust | Feature flags |
| Integration Active | Moyenne 2 intégrations/compte | Database |
| Mobile MAU | 50% utilisateurs desktop aussi mobile | Analytics mobile |
| API Usage | 20% comptes utilisent API | API logs |
| Enterprise Accounts | 15 comptes >$50K ARR | Sales CRM |

**Timeline:** 24 semaines
**Ressources:** 2 Backend Devs, 2 Frontend Devs, 1 Mobile Dev, 1 DevOps, 1 ML Engineer, 1 QA, 1 PM

---

## 5. Spécifications Techniques

### 5.1 Stack Technologique

**✅ Stack Révisé - Aligné avec Architecture Existante**

#### Frontend (Réutilisation Maximale)
```typescript
// Framework & Libraries (DÉJÀ INSTALLÉS)
✅ Next.js 15.0.3 (App Router)
✅ React 19.0.0-rc.1
✅ TypeScript 5.9.3
✅ TailwindCSS 3.4.15
✅ Radix UI (composants: Dialog, Dropdown, Select, Tabs, Toast, Progress)
✅ Recharts 3.4.1 (visualisations)
✅ Lucide React 0.461.0 (icônes)
✅ React Hook Form 7.53.2 + Zod 3.23.8 (formulaires)
✅ Sonner 1.7.1 (notifications/toasts)
✅ Class Variance Authority (styling patterns)

// Data Fetching & State (Pattern Existant)
✅ React useState/useEffect (server state)
✅ Fetch API native (pas de library externe)
// Polling pattern pour async tasks (comme module RFPs)
```

#### Backend (100% Aligné)
```typescript
// API & Services (DÉJÀ EN PLACE)
✅ Next.js API Routes (pattern: /api/companies/[slug]/pricing/...)
✅ Drizzle ORM 0.36.4
✅ PostgreSQL (postgres 3.4.5)
✅ Next-Auth 5.0.0-beta.25 (authentification)
✅ Vercel Blob Storage 2.0.0 (fichiers, exports)
✅ CUID2 (@paralleldrive/cuid2) - Pattern IDs principal
✅ UUID v4 (uuid 13.0.0) - Si besoin spécifique

// Validation & Type Safety
✅ Zod 3.23.8 (validation schémas)
// Next.js API Routes + Zod (pas tRPC)

// Async Tasks Pattern
✅ Polling pattern (comme RFPs) - PAS BullMQ/Redis dans MVP
// Status tracking via PostgreSQL table pricing_scans
// Real-time updates via GET /api/.../progress endpoint (polling 2s)

// Cache (Phase MVP)
✅ PostgreSQL cache table (simple, suffit pour MVP)
// Redis optionnel Phase 2 si bottleneck identifié
```

#### Scraping & Processing (DÉJÀ DISPONIBLE!)
```typescript
// Scraping Engine (100% INSTALLÉ)
✅ Playwright 1.56.1 (headless browser - DÉJÀ INSTALLÉ)
✅ @playwright/test 1.56.1 (DÉJÀ INSTALLÉ)
✅ ExcelJS 4.4.0 (export Excel - DÉJÀ INSTALLÉ)

// Characteristic Matcher (Custom - À Développer)
// Réutiliser code Dissan/price-scraper/src/matchers/

// Optionnel si anti-bot détecté:
// playwright-extra + puppeteer-extra-plugin-stealth
```

#### AI/ML (Infrastructure Existante)
```typescript
// Models (CONFIGURATION DÉJÀ EN PLACE)
✅ OpenAI SDK 4.75.0
   - GPT-5 (pricing recommendations)
   - GPT-4o (fallback)
✅ Anthropic SDK 0.32.1
   - Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) - Long-context
   - Claude Haiku 4.5 (claude-haiku-4-5-20251001) - Fast queries

// Pattern AI (RÉUTILISER)
✅ UnifiedAIClient (src/lib/ai/unified-client.ts)
✅ AI Models Constants (src/lib/constants/ai-models.ts)

// Utilisation:
import { getUnifiedAIClient } from '@/lib/ai/unified-client';
import { CLAUDE_MODELS } from '@/lib/constants/ai-models';

const aiClient = getUnifiedAIClient();
const response = await aiClient.generate(companyId, {
  promptKey: 'pricing_recommendation',
  variables: { productData, competitorPrices },
  model: CLAUDE_MODELS.sonnet
});
```

#### Storage & Files
```typescript
// File Storage (DÉJÀ CONFIGURÉ)
✅ Vercel Blob Storage 2.0.0
// Pattern: await put(`pricing-exports/${companyId}/${filename}`, buffer)

// Document Processing (DÉJÀ INSTALLÉS)
✅ PDF-parse 1.1.4
✅ Mammoth 1.11.0 (docx)
✅ XLSX 0.18.5
```

### 5.2 Schéma Base de Données

**✅ Schéma Drizzle ORM - Aligné avec Pattern Existant**

**Note:** Utiliser CUID2 (createId) pour cohérence avec le reste de la plateforme.

```typescript
// ============================================
// PRICING MODULE - DRIZZLE SCHEMA
// Fichier: src/db/schema-pricing.ts
// ============================================

import { pgTable, varchar, timestamp, boolean, integer, text, jsonb, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { companies } from "./schema"; // Import existing companies table

// ============================================
// Products Catalog
// ============================================
export const pricingProducts = pgTable("pricing_products", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Product Identity
  sku: varchar("sku", { length: 255 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  nameCleaned: varchar("name_cleaned", { length: 500 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  category: varchar("category", { length: 255 }),

  // Pricing
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("CAD"),
  unit: varchar("unit", { length: 50 }), // piece, liter, kg, etc.

  // Characteristics (for matching)
  characteristics: jsonb("characteristics").$type<{
    types: string[];
    materials: string[];
    sizes: string[];
    features: string[];
  }>(),

  // Metadata
  imageUrl: varchar("image_url", { length: 1000 }),
  productUrl: varchar("product_url", { length: 1000 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete
}, (table) => ({
  companySkuIdx: index("pricing_products_company_sku_idx").on(table.companyId, table.sku),
  categoryIdx: index("pricing_products_category_idx").on(table.category),
  brandIdx: index("pricing_products_brand_idx").on(table.brand),
  activeIdx: index("pricing_products_active_idx").on(table.isActive),
}));

// ============================================
// Competitors Configuration
// ============================================
export const pricingCompetitors = pgTable("pricing_competitors", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 })
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Competitor Info
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 1000 }).notNull(),
  logoUrl: varchar("logo_url", { length: 1000 }),

  // Scraping Config
  scraperConfig: jsonb("scraper_config").$type<{
    baseUrl: string;
    selectors: {
      productName: string;
      price: string;
      sku?: string;
    };
    pagination?: object;
  }>().notNull(),

  isActive: boolean("is_active").notNull().default(true),

  // Scheduling
  scanFrequency: varchar("scan_frequency", { length: 50 }).default("weekly"),
  customCron: text("custom_cron"),
  lastScanAt: timestamp("last_scan_at"),
  nextScanAt: timestamp("next_scan_at"),

  // Stats
  totalScans: integer("total_scans").default(0),
  successfulScans: integer("successful_scans").default(0),
  failedScans: integer("failed_scans").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  companyNameIdx: index("pricing_competitors_company_name_idx").on(table.companyId, table.name),
}));

-- Competitor Product Matches
CREATE TABLE pricing_competitor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  product_id UUID NOT NULL REFERENCES pricing_products(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES pricing_competitors(id) ON DELETE CASCADE,

  -- Match Info
  competitor_product_name TEXT NOT NULL,
  competitor_product_url TEXT,
  competitor_sku TEXT,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',

  -- Matching Details
  match_type TEXT NOT NULL, -- 'sku', 'name', 'characteristic'
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  match_details JSONB, -- {matchedTypes: [], matchedMaterials: [], etc.}

  -- Metadata
  in_stock BOOLEAN DEFAULT true,
  promo_active BOOLEAN DEFAULT false,
  promo_details TEXT,

  -- Timestamps
  last_scraped_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_matches_product_id (product_id),
  INDEX idx_matches_competitor_id (competitor_id),
  INDEX idx_matches_scraped_at (last_scraped_at),
  INDEX idx_matches_match_type (match_type),
  UNIQUE(product_id, competitor_id) -- One match per product-competitor pair (latest)
);

-- Price History (Time-Series)
CREATE TABLE pricing_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  match_id UUID NOT NULL REFERENCES pricing_competitor_matches(id) ON DELETE CASCADE,

  -- Historical Data
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  in_stock BOOLEAN DEFAULT true,
  promo_active BOOLEAN DEFAULT false,

  -- Event Metadata
  change_percentage DECIMAL(5,2), -- % change vs previous record
  change_reason TEXT, -- 'price_drop', 'price_increase', 'promo_start', etc.

  -- Timestamp
  recorded_at TIMESTAMPTZ NOT NULL,

  -- Indexes
  INDEX idx_price_history_match_id (match_id),
  INDEX idx_price_history_recorded_at (recorded_at)
);

-- Alert Rules
CREATE TABLE pricing_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Rule Definition
  name TEXT NOT NULL,
  description TEXT,

  -- Conditions (JSONB for flexibility)
  rule_type TEXT NOT NULL, -- 'price_drop', 'price_increase', 'new_product', 'out_of_stock', 'custom'
  conditions JSONB NOT NULL,
  -- Example: {
  --   "competitors": ["swish", "grainger"],
  --   "categories": ["Brosses"],
  --   "threshold": 15,
  --   "operator": ">"
  -- }

  -- Actions
  notification_channels JSONB NOT NULL, -- {email: true, slack: true, webhook: 'https://...'}
  notification_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'daily_digest', 'weekly_digest'

  -- State
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_alert_rules_user_id (user_id),
  INDEX idx_alert_rules_active (is_active)
);

-- Alert Events (Log)
CREATE TABLE pricing_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_id UUID NOT NULL REFERENCES pricing_alert_rules(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pricing_products(id) ON DELETE SET NULL,
  competitor_id UUID REFERENCES pricing_competitors(id) ON DELETE SET NULL,

  -- Event Details
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL, -- Full context of trigger
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'

  -- Notification Status
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  notification_channels_used JSONB,

  -- User Actions
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,

  -- Timestamp
  triggered_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_alert_events_rule_id (rule_id),
  INDEX idx_alert_events_triggered_at (triggered_at),
  INDEX idx_alert_events_read (is_read),
  INDEX idx_alert_events_resolved (is_resolved)
);

-- Scan Jobs (BullMQ Metadata)
CREATE TABLE pricing_scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES pricing_competitors(id) ON DELETE CASCADE,

  -- Job Info
  job_id TEXT NOT NULL, -- BullMQ job ID
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'

  -- Progress
  total_products INTEGER NOT NULL,
  scraped_products INTEGER DEFAULT 0,
  matched_products INTEGER DEFAULT 0,
  failed_products INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Results
  results_summary JSONB,
  error_log TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_scan_jobs_user_id (user_id),
  INDEX idx_scan_jobs_competitor_id (competitor_id),
  INDEX idx_scan_jobs_status (status),
  INDEX idx_scan_jobs_created_at (created_at)
);

-- AI Recommendations (Cache)
CREATE TABLE pricing_ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES pricing_products(id) ON DELETE CASCADE,

  -- Recommendations (Array of strategies)
  recommendations JSONB NOT NULL,
  -- Example: [
  --   {
  --     "strategy": "alignement_competitif",
  --     "suggested_price": 4.25,
  --     "impact": {...},
  --     "justification": "..."
  --   }
  -- ]

  -- Metadata
  generated_by_model TEXT NOT NULL, -- 'gpt-5', 'claude-sonnet-4.5'
  confidence_score DECIMAL(3,2),
  based_on_data_until TIMESTAMPTZ NOT NULL,

  -- User Actions
  user_action TEXT, -- 'applied', 'dismissed', 'modified', null
  user_action_at TIMESTAMPTZ,

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Cache expiry (7 days default)

  INDEX idx_ai_reco_product_id (product_id),
  INDEX idx_ai_reco_generated_at (generated_at)
);
```

### 5.3 API Endpoints

```typescript
// ============================================
// PRICING API ROUTES
// ============================================

// Products
POST   /api/pricing/products                    // Upload catalog (CSV/Excel)
GET    /api/pricing/products                    // List products (paginated, filtered)
GET    /api/pricing/products/:id                // Get product details
PATCH  /api/pricing/products/:id                // Update product
DELETE /api/pricing/products/:id                // Delete product
POST   /api/pricing/products/:id/characteristics // Re-extract characteristics

// Competitors
GET    /api/pricing/competitors                 // List competitors
POST   /api/pricing/competitors                 // Add competitor
GET    /api/pricing/competitors/:id             // Get competitor config
PATCH  /api/pricing/competitors/:id             // Update config
DELETE /api/pricing/competitors/:id             // Remove competitor
POST   /api/pricing/competitors/:id/test        // Test scan (5 products)

// Scans
POST   /api/pricing/scans                       // Launch scan (one or all competitors)
GET    /api/pricing/scans                       // List scan history
GET    /api/pricing/scans/:id                   // Get scan status/results
DELETE /api/pricing/scans/:id                   // Cancel running scan

// Matches
GET    /api/pricing/matches                     // List all matches (filtered)
GET    /api/pricing/matches/:productId          // Get matches for product
PATCH  /api/pricing/matches/:id                 // Update match (manual correction)
DELETE /api/pricing/matches/:id                 // Delete match

// History
GET    /api/pricing/history/:productId          // Get price history for product
GET    /api/pricing/history/export              // Export historical data (CSV)

// Analytics
GET    /api/pricing/analytics/overview          // Dashboard KPIs
GET    /api/pricing/analytics/trends            // Price trends (time-series)
GET    /api/pricing/analytics/positioning       // Competitive positioning data
GET    /api/pricing/analytics/heatmap           // Price distribution heatmap

// AI Recommendations
GET    /api/pricing/recommendations/:productId  // Get AI recommendations
POST   /api/pricing/recommendations/:productId/apply  // Apply recommendation
POST   /api/pricing/recommendations/regenerate  // Force regenerate (invalidate cache)

// Alerts
GET    /api/pricing/alerts/rules                // List alert rules
POST   /api/pricing/alerts/rules                // Create alert rule
GET    /api/pricing/alerts/rules/:id            // Get rule details
PATCH  /api/pricing/alerts/rules/:id            // Update rule
DELETE /api/pricing/alerts/rules/:id            // Delete rule

GET    /api/pricing/alerts/events               // List alert events (paginated)
PATCH  /api/pricing/alerts/events/:id           // Mark read/resolved

// Export
POST   /api/pricing/export/excel                // Export full report (Excel)
POST   /api/pricing/export/pdf                  // Export summary (PDF)
```

### 5.4 Intégrations Requises

#### Intégrations Internes (Market Intelligence Platform)

```typescript
// 1. Battle Hub - Enrichir battlecards avec pricing
interface PricingToBattleHub {
  competitorId: string;
  products: {
    category: string;
    avgPriceGap: number; // %
    positioning: 'cheaper' | 'aligned' | 'premium';
  }[];
  lastUpdated: Date;
}

// 2. Win/Loss Intelligence - Corréler prix et outcomes
interface PricingToWinLoss {
  dealId: string;
  productsQuoted: {
    sku: string;
    quotedPrice: number;
    competitorPrice: number;
    priceGap: number;
  }[];
  outcome: 'won' | 'lost';
  lossReason?: string; // Check if 'price' mentioned
}

// 3. Knowledge Graph - Ajouter nodes pricing
interface PricingToKnowledgeGraph {
  nodeType: 'Product' | 'Competitor';
  properties: {
    avgPrice?: number;
    pricingStrategy?: string;
    pricePosition?: 'low' | 'mid' | 'high';
  };
  relationships: {
    type: 'COMPETES_WITH';
    strength: number; // Based on overlap
  }[];
}
```

#### Intégrations Externes

```typescript
// 1. Salesforce - Sync pricing to opportunities
interface SalesforceIntegration {
  syncDirection: 'bidirectional';
  objects: ['Opportunity', 'Product2', 'PricebookEntry'];
  triggers: [
    'pricing_change', // Update Salesforce when price adjusted
    'competitor_intel', // Enrich Opp with competitor pricing
  ];
}

// 2. Slack - Notifications temps réel
interface SlackIntegration {
  channels: ['#pricing', '#sales-ops'];
  messageTypes: [
    'price_alert_critical',
    'daily_digest',
    'recommendation_ready'
  ];
  interactivity: true; // Boutons "Approve/Dismiss" dans Slack
}

// 3. HubSpot - Enrich contacts
interface HubSpotIntegration {
  syncDirection: 'outbound';
  properties: [
    'competitive_price_advantage', // %
    'last_competitor_price_check',
    'pricing_strategy_recommended'
  ];
}
```

---

## 6. UX/UI Design

### 6.1 Design System

#### Couleurs Pricing Module

```css
/* Statuts Pricing */
--pricing-critical: #DC2626;     /* Prix >20% au-dessus */
--pricing-warning: #F59E0B;      /* Prix 10-20% au-dessus */
--pricing-good: #10B981;         /* Prix aligné ou en-dessous */
--pricing-excellent: #3B82F6;    /* Prix significativement en-dessous */

/* Match Confidence */
--match-high: #10B981;    /* >85% */
--match-medium: #F59E0B;  /* 70-85% */
--match-low: #EF4444;     /* <70% */

/* Graphiques */
--chart-line-you: #6366F1;       /* Votre ligne */
--chart-line-competitor-1: #EC4899;
--chart-line-competitor-2: #14B8A6;
--chart-line-competitor-3: #F59E0B;
```

#### Typographie

```css
/* Headers */
h1: Inter Bold 32px
h2: Inter Semibold 24px
h3: Inter Semibold 18px

/* Body */
body: Inter Regular 14px
small: Inter Regular 12px

/* Monospace (SKU, Prix) */
mono: JetBrains Mono 14px
```

#### Iconographie

```typescript
// Icons Library: Lucide React
import {
  TrendingUp,      // Prix hausse
  TrendingDown,    // Prix baisse
  Minus,           // Prix stable
  AlertTriangle,   // Attention
  CheckCircle,     // OK
  XCircle,         // Critique
  Search,          // Matching
  RefreshCw,       // Scan
  Bell,            // Alertes
  BarChart3,       // Analytics
} from 'lucide-react';
```

### 6.2 Composants React Clés

```typescript
// ============================================
// COMPOSANTS PRICING MODULE
// ============================================

// 1. PricingDashboard
interface PricingDashboardProps {
  userId: string;
}
// Affiche: KPI cards, graphique trends, insights IA, alertes récentes

// 2. ProductCatalog
interface ProductCatalogProps {
  products: PricingProduct[];
  onFilter: (filters: FilterOptions) => void;
  onSort: (sortBy: SortField) => void;
  onExport: () => void;
}
// Table interactive avec filtres, tri, pagination, actions bulk

// 3. ProductDetailPage
interface ProductDetailPageProps {
  productId: string;
}
// Sections: Info produit, Analyse tarifaire, Matches concurrents,
// Historique 90j, Recommandations IA

// 4. CompetitorAnalysis
interface CompetitorAnalysisProps {
  competitors: Competitor[];
  selectedCompetitorIds: string[];
  onToggleCompetitor: (id: string) => void;
}
// Matrice positionnement, profils détaillés, historique scans

// 5. PriceHistoryChart
interface PriceHistoryChartProps {
  productId: string;
  timeRange: '30d' | '90d' | '180d' | '1y';
  competitors: string[]; // Which competitors to show
}
// Recharts LineChart avec interactions (zoom, pan, tooltips)

// 6. AIRecommendationCard
interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  onApply: (reco: AIRecommendation) => void;
  onDismiss: () => void;
  onSimulate: () => void;
}
// Carte recommendation avec CTA, simulation impact

// 7. AlertRuleBuilder
interface AlertRuleBuilderProps {
  onSave: (rule: AlertRule) => void;
}
// Form builder type Zapier/IFTTT pour créer règles complexes

// 8. CompetitivePositioningMatrix
interface CompetitivePositioningMatrixProps {
  data: PositioningData[];
  xAxis: 'coverage' | 'price' | 'quality';
  yAxis: 'price' | 'coverage' | 'market_share';
}
// Scatter plot D3/Recharts avec quadrants annotés

// 9. BulkActionModal
interface BulkActionModalProps {
  selectedProducts: string[];
  availableActions: BulkAction[];
  onExecute: (action: BulkAction, params: any) => void;
}
// Modal pour actions groupées avec preview

// 10. ScanProgressIndicator
interface ScanProgressIndicatorProps {
  jobId: string;
  totalProducts: number;
  onComplete: () => void;
}
// Real-time progress bar avec WebSocket updates
```

### 6.3 User Flows

#### Flow 1: Onboarding Nouveau Utilisateur

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: Bienvenue                                          │
│ • Modal explication module                                  │
│ • "Commencez en 3 étapes"                                   │
│ • [Démarrer →]                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: Upload Catalogue                                   │
│ • Drag & drop Excel/CSV                                     │
│ • Preview colonnes mappées                                  │
│ • Validation (missing fields, duplicates)                   │
│ • [Importer 576 produits →]                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: Sélection Concurrents                              │
│ • Liste concurrents pré-configurés (checkboxes)             │
│ • ☑ Swish  ☑ Grainger  ☑ VTO  ☐ ULINE...                  │
│ • "Nous recommandons de commencer avec 3-5 concurrents"     │
│ • [Continuer →]                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 4: Configuration Scans                                │
│ • Fréquence: ○ Quotidien  ● Hebdomadaire  ○ Custom         │
│ • Heure préférée: [07:00] (off-peak)                        │
│ • [Lancer premier scan maintenant →]                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 5: Scan en cours                                      │
│ • Progress bar temps réel                                   │
│ • "Scan Swish: 45/576 produits (8%)..."                    │
│ • Estimation temps restant: ~2h                             │
│ • [Continuer en arrière-plan]                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 6: Premiers Résultats                                 │
│ • Dashboard avec premiers insights                          │
│ • "🎉 107 correspondances trouvées!"                        │
│ • Top 3 insights prioritaires                               │
│ • [Explorer le dashboard →]                                 │
└─────────────────────────────────────────────────────────────┘

Temps total estimé: 15-20 minutes (avec scan en background)
```

#### Flow 2: Réaction à Alerte Critique

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER: Alerte Email/Slack                                 │
│ "🔴 CRITIQUE: Swish a baissé 12 brosses de -15%"            │
│ • [Voir détails] CTA dans email                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ LANDING: Page Alerte Détaillée                              │
│ • Liste 12 produits affectés                                │
│ • Impact estimé: "$45K revenue at risk annuellement"        │
│ • [Créer stratégie de réponse] [Voir produits] [Dismiss]   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ [Créer stratégie]
┌─────────────────────────────────────────────────────────────┐
│ MODAL: Wizard Stratégie de Réponse                          │
│ Étape 1/3: Sélection Produits                               │
│ • ☑ Sélectionner tous (12)  ou  ☐ Sélection manuelle       │
│ • Preview: 12 SKUs sélectionnés, écart moyen -15.3%         │
│ • [Suivant →]                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Étape 2/3: Choix Stratégie (AI-powered)                     │
│ ● Alignement compétitif (-12% vs Swish)                    │
│   Impact: +$8K revenue, -2% marge                           │
│                                                             │
│ ○ Bundling produits complémentaires                        │
│   Impact: Maintien marge, +$5K upsells                     │
│                                                             │
│ ○ Maintien position premium + messaging différenciation     │
│   Impact: -$2K revenue, marge stable                        │
│                                                             │
│ [Suivant →]                                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Étape 3/3: Simulation & Approbation                         │
│ • Table: SKU | Prix actuel | Prix suggéré | Écart           │
│ • Timeline d'implémentation suggérée: "Déployer en 3 phases"│
│ • Workflow approbation:                                     │
│   ○ Appliquer immédiatement                                │
│   ● Soumettre pour approbation (Manager)                   │
│ • [Soumettre stratégie] [Retour] [Annuler]                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ CONFIRMATION                                                 │
│ • "✅ Stratégie soumise à Julie Tremblay (Manager Pricing)" │
│ • "Vous recevrez une notification une fois approuvée"       │
│ • [Retour au dashboard]                                     │
└─────────────────────────────────────────────────────────────┘

Temps total: 5-8 minutes
Réduction vs processus manuel: 72h → 8 min (99% amélioration)
```

---

## 7. Métriques de Succès

### 7.1 KPIs Produit (Product Health)

| Catégorie | Métrique | Target MVP | Target Phase 2 | Target Phase 3 | Mesure |
|-----------|----------|-----------|----------------|----------------|--------|
| **Adoption** | % utilisateurs activent module | 80% | 90% | 95% | Analytics |
| | Temps moyen activation (onboarding) | <20 min | <15 min | <10 min | User tracking |
| | % utilisateurs complètent onboarding | >70% | >85% | >90% | Funnel analytics |
| **Engagement** | Sessions/semaine/utilisateur | 3+ | 5+ | Daily | Analytics |
| | Temps moyen session | 8 min | 12 min | 15 min | Analytics |
| | % utilisateurs actifs hebdo (WAU) | 60% | 75% | 85% | Analytics |
| | % utilisateurs actifs mensuel (MAU) | 85% | 90% | 95% | Analytics |
| **Feature Usage** | % utilisant AI recommendations | — | 60% | 75% | Feature flags |
| | Scans lancés/utilisateur/mois | 4+ | 8+ | 12+ (auto) | Database |
| | Alertes configurées/utilisateur | 1+ | 3+ | 5+ | Database |
| | Exports Excel/mois/utilisateur | 2+ | 4+ | 6+ | Analytics |
| **Qualité Données** | Scan success rate | >85% | >90% | >95% | Logs |
| | Match confidence moyenne | >70% | >75% | >80% | Database |
| | % produits avec ≥1 match | 15% | 25% | 35% | Database |
| **Performance** | Temps scan (500 produits/site) | <12h | <8h | <4h | Monitoring |
| | API response time p95 | <500ms | <300ms | <200ms | APM |
| | Dashboard load time p95 | <2s | <1.5s | <1s | RUM |

### 7.2 KPIs Business (Revenue Impact)

| Métrique | Target Année 1 | Mesure | Hypothèses |
|----------|---------------|--------|------------|
| **Revenue** | | | |
| ARR nouveau module | $250K | Stripe | 50 comptes × $5K/an moyenne |
| Expansion ARR (upsells) | $100K | Stripe | 20% comptes existants adoptent |
| Influence pipeline | $2M | CRM correlation | Deals utilisant pricing intel |
| **Efficacité** | | | |
| Temps économisé/utilisateur/mois | 24h | Survey | vs surveillance manuelle |
| Décisions pricing/mois/utilisateur | 8 | Analytics | Ajustements appliqués |
| Vitesse décision pricing | -50% | Survey | 72h → 36h moyenne |
| **Qualité Décisions** | | | |
| Win rate amélioration | +3pp | Win/Loss module | Corrélation pricing aligné |
| Marge améliorée | +2% | Finance data | Optimisations identifiées |
| Revenue récupéré (via alertes) | $500K | Case studies | Détection pertes potentielles |

### 7.3 KPIs UX (User Satisfaction)

| Métrique | Target | Mesure | Fréquence |
|----------|--------|--------|-----------|
| NPS (Net Promoter Score) | >40 (MVP), >60 (Phase 3) | Survey | Trimestriel |
| CSAT (Customer Satisfaction) | >4.2/5 | Post-interaction survey | Continu |
| Feature satisfaction | >80% "très satisfait" ou "satisfait" | Feature survey | Par release |
| Support tickets pricing | <5/mois | Zendesk | Mensuel |
| Churn rate utilisateurs pricing | <3%/an | Analytics | Mensuel |

### 7.4 Dashboard Métriques (Pour Product Team)

```typescript
// Métriques temps réel à monitorer

interface PricingMetricsDashboard {
  // Santé Globale
  healthScore: number; // 0-100, composite score

  // Adoption
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };

  // Engagement
  avgSessionsPerWeek: number;
  avgTimeInModule: number; // minutes

  // Feature Usage
  scansLaunched: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };

  aiRecommendationsGenerated: number;
  aiRecommendationsApplied: number;
  aiRecommendationsAppliedRate: number; // %

  // Data Quality
  scanSuccessRate: number; // %
  avgMatchConfidence: number;
  productsWithMatches: number;

  // Performance
  avgScanDuration: number; // hours
  apiResponseTimeP95: number; // ms
  dashboardLoadTimeP95: number; // ms

  // Erreurs & Issues
  activeErrors: number;
  criticalIssues: number;

  // Business Impact
  pricingDecisionsMade: number; // This month
  estimatedRevenueImpact: number; // $
}
```

---

## 8. Roadmap & Timeline

### 8.1 Timeline Visuel (Gantt-style)

```
Année 1: 2025
─────────────────────────────────────────────────────────────────

Q1 (Jan-Mar)          Q2 (Avr-Jun)         Q3 (Jul-Sep)         Q4 (Oct-Déc)
│                     │                    │                    │
├─ Phase 1: MVP ─────┤                    │                    │
│  ┌────────────────┐│                    │                    │
│  │ Sem 1-4:       ││                    │                    │
│  │ • Backend core ││                    │                    │
│  │ • DB schema    ││                    │                    │
│  │ • Scraper eng. ││                    │                    │
│  └────────────────┘│                    │                    │
│  ┌────────────────┐│                    │                    │
│  │ Sem 5-8:       ││                    │                    │
│  │ • Frontend UI  ││                    │                    │
│  │ • Dashboard    ││                    │                    │
│  │ • Catalog view ││                    │                    │
│  └────────────────┘│                    │                    │
│  ┌────────────────┐│                    │                    │
│  │ Sem 9-12:      ││                    │                    │
│  │ • Testing      ││                    │                    │
│  │ • Beta launch  ││                    │                    │
│  │ • Feedback     ││                    │                    │
│  └────────────────┘│                    │                    │
│                     │                    │                    │
│                     ├─ Phase 2: Intel ──┤                    │
│                     │  ┌───────────────┐│                    │
│                     │  │ Sem 13-16:    ││                    │
│                     │  │ • AI/GPT-5    ││                    │
│                     │  │ • Analytics   ││                    │
│                     │  └───────────────┘│                    │
│                     │  ┌───────────────┐│                    │
│                     │  │ Sem 17-20:    ││                    │
│                     │  │ • Alerts eng. ││                    │
│                     │  │ • History     ││                    │
│                     │  └───────────────┘│                    │
│                     │  ┌───────────────┐│                    │
│                     │  │ Sem 21-24:    ││                    │
│                     │  │ • Polish UI   ││                    │
│                     │  │ • GA launch   ││                    │
│                     │  └───────────────┘│                    │
│                     │                    │                    │
│                     │                    ├─ Phase 3: Auto ───┤
│                     │                    │  ┌──────────────┐ │
│                     │                    │  │ Sem 25-32:   │ │
│                     │                    │  │ • Dynamic $  │ │
│                     │                    │  │ • Integrat.  │ │
│                     │                    │  │ • Mobile app │ │
│                     │                    │  │ • API public │ │
│                     │                    │  └──────────────┘ │
│                     │                    │  ┌──────────────┐ │
│                     │                    │  │ Sem 33-36:   │ │
│                     │                    │  │ • Predictive │ │
│                     │                    │  │ • Collab     │ │
│                     │                    │  │ • Scale test │ │
│                     │                    │  └──────────────┘ │
│                     │                    │                    │
└─────────────────────┴────────────────────┴────────────────────┘

Milestones:
▼ Sem 12:  MVP Launch (Beta)
▼ Sem 24:  Phase 2 GA (General Availability)
▼ Sem 36:  Phase 3 Complete (Enterprise Ready)
```

### 8.2 Dépendances Critiques

```
┌─────────────────────────────────────────────────────────────┐
│ DÉPENDANCES INTER-MODULES                                   │
└─────────────────────────────────────────────────────────────┘

Pricing Module  →  Battle Hub
  └─ Require: Battle Hub API v2 (enrichissement battlecards)
  └─ Timeline: Phase 2 Sem 17
  └─ Owner: Battle Hub Team

Pricing Module  →  Win/Loss Intelligence
  └─ Require: Win/Loss correlation endpoint
  └─ Timeline: Phase 3 Sem 28
  └─ Owner: Win/Loss Team

Pricing Module  →  Knowledge Graph
  └─ Require: Node creation API (Product, Competitor nodes)
  └─ Timeline: Phase 3 Sem 30
  └─ Owner: Knowledge Graph Team

Pricing Module  →  Authentication/Authorization
  └─ Require: Role-based access (Viewer, Editor, Admin)
  └─ Timeline: Phase 1 Sem 2
  └─ Owner: Platform Team

┌─────────────────────────────────────────────────────────────┐
│ DÉPENDANCES EXTERNES                                        │
└─────────────────────────────────────────────────────────────┘

Playwright Browsers
  └─ Require: Chromium, Firefox binaries installés
  └─ Maintenance: Updates mensuels

OpenAI GPT-5 API
  └─ Require: API access, quota suffisant (100K req/mois)
  └─ Backup: GPT-4o fallback si downtime

Anthropic Claude APIs
  └─ Require: Sonnet 4.5, Haiku 4.5 access
  └─ Usage: Long-context analysis, fast queries

PostgreSQL 16
  └─ Require: Upgrade si PostgreSQL <16
  └─ Feature: JSONB improvements, partitioning

Redis
  └─ Require: Cache layer pour perfs
  └─ Usage: Session, API cache, BullMQ queue
```

### 8.3 Go/No-Go Criteria par Phase

#### Phase 1 MVP - Critères de Lancement Beta

**GO Criteria (Tous requis):**
- ✅ 50 produits scannés sur 3 sites avec >80% success rate
- ✅ Dashboard affiche KPIs sans erreurs
- ✅ Import catalogue fonctionne (Excel/CSV)
- ✅ Email alertes basiques envoyées correctement
- ✅ 0 bugs critiques (P0) ouverts
- ✅ ≤5 bugs majeurs (P1) ouverts
- ✅ Performance: Dashboard <2s load time p95
- ✅ Security audit pass (OWASP top 10)
- ✅ 10 beta users recrutés et onboardés

**NO-GO Triggers:**
- ❌ Success rate scans <70%
- ❌ >5 bugs P0 ouverts
- ❌ Dashboard load time >3s
- ❌ Critical security vulnerability détectée

#### Phase 2 Intelligence - Critères GA

**GO Criteria:**
- ✅ AI recommendations testées sur ≥100 produits
- ✅ Accuracy recommendations >70% (validation manuelle)
- ✅ Alert engine process 10K events sans dégradation
- ✅ Historical data stocké pour ≥50 comptes sur 90 jours
- ✅ NPS beta users >40
- ✅ Churn beta <10%
- ✅ 0 P0 bugs, ≤3 P1 bugs
- ✅ Load testing: 100 concurrent users OK

**NO-GO Triggers:**
- ❌ AI accuracy <60%
- ❌ NPS <30
- ❌ Performance regression >20% vs Phase 1

#### Phase 3 Automation - Critères Enterprise

**GO Criteria:**
- ✅ 3 intégrations natives (Salesforce, HubSpot, NetSuite) live
- ✅ Dynamic pricing testé sur 20 SKUs pendant 60 jours sans incidents
- ✅ Mobile app released iOS + Android (App Store + Play Store)
- ✅ API publique documentée (OpenAPI spec) + SDK JS/Python
- ✅ 15 comptes enterprise (>$50K ARR) en production
- ✅ 99.5% uptime SLA atteint sur 90 jours
- ✅ SOC 2 compliance (si requis clients enterprise)

**NO-GO Triggers:**
- ❌ Incident majeur dynamic pricing (pertes client)
- ❌ Uptime <99%
- ❌ Data breach ou security incident

---

## 9. Ressources & Budget

### 9.1 Équipe Requise

#### Phase 1 MVP (Mois 1-3)

| Rôle | Allocation | Coût Mensuel | Responsabilités |
|------|-----------|--------------|----------------|
| **Backend Developer** (Senior) | 100% | $12K | API, DB, scraper engine, polling pattern |
| **Frontend Developer** (Mid-level) | 100% | $9K | Dashboard, catalog, detail pages |
| **QA Engineer** | 100% | $7K | Testing, automation, bugs |
| **Product Manager** | 50% | $6K | Specs, user stories, priorisation |
| **UX/UI Designer** | 25% | $2K | Wireframes, design system |
| **TOTAL** | | **$36K/mois** | **$108K Phase 1** |

#### Phase 2 Intelligence (Mois 4-6)

| Rôle | Allocation | Coût Mensuel | Responsabilités |
|------|-----------|--------------|----------------|
| Backend Developer | 100% | $12K | AI integration, alerts, analytics |
| Frontend Developer | 100% | $9K | Advanced charts, AI UI, alerts |
| **ML Engineer** (Part-time) | 50% | $6K | GPT-5 integration, prompt engineering |
| QA Engineer | 100% | $7K | Testing AI, alerts, load testing |
| Product Manager | 50% | $6K | Feature definition, user feedback |
| **TOTAL** | | **$40K/mois** | **$120K Phase 2** |

#### Phase 3 Automation (Mois 7-12)

| Rôle | Allocation | Coût Mensuel | Responsabilités |
|------|-----------|--------------|----------------|
| Backend Developer (×2) | 200% | $24K | Integrations, dynamic pricing, API |
| Frontend Developer (×2) | 200% | $18K | Advanced features, mobile web |
| **Mobile Developer** (React Native) | 100% | $10K | iOS + Android app |
| **DevOps Engineer** | 100% | $11K | Scaling, monitoring, CI/CD |
| ML Engineer | 100% | $12K | Predictive analytics, forecasting |
| QA Engineer | 100% | $7K | Regression, integration testing |
| Product Manager | 100% | $12K | Roadmap, stakeholder management |
| **TOTAL** | | **$94K/mois** | **$564K Phase 3 (6 mois)** |

**TOTAL ANNÉE 1:** $792K (ressources humaines)

### 9.2 Budget Infrastructure & Outils

**✅ Budget Révisé - Réutilisation Infrastructure Existante**

| Catégorie | Service | Coût Mensuel | Coût Année 1 | Notes | Status |
|-----------|---------|--------------|--------------|-------|--------|
| **Compute** | Vercel Pro | Inclus | $0 | Déjà payé pour plateforme | ✅ Réutilisé |
| **Database** | PostgreSQL (Vercel) | Inclus | $0 | Scaling si nécessaire Phase 2+ | ✅ Réutilisé |
| **AI APIs** | OpenAI (GPT-5) | $500 | $6K | Pricing recommendations (~60K req/mois) | ✅ Déjà config |
| | Anthropic (Claude) | $200 | $2.4K | Long-context analysis (réduit vs plan) | ✅ Déjà config |
| **Storage** | Vercel Blob | $50 | $600 | Exports Excel, scraping cache | ✅ Réutilisé |
| **Scraping** | Proxies rotatifs | $150 | $1.8K | Anti-bot bypass (si nécessaire) | 🆕 À ajouter |
| **Monitoring MVP** | Vercel Analytics | Inclus | $0 | Basique suffit pour MVP | ✅ Inclus |
| **Outils Dev** | GitHub, Figma, Linear | Inclus | $0 | Déjà payés pour équipe | ✅ Réutilisés |
| **TOTAL INFRA MVP** | | **$900/mois** | **$10.8K/an** | ✅ **Économie: -74%** ($31.2K) | |

**Comparaison Budget Infrastructure:**
| Version | Coût Annuel | Économie |
|---------|-------------|----------|
| Plan Initial | $42K/an | — |
| **Plan Révisé** | **$10.8K/an** | **-$31.2K (-74%)** |

**Services Retirés du Budget (Réutilisation ou Non Requis MVP):**
- ❌ Render Workers (BullMQ) - $3.6K → Polling pattern PostgreSQL
- ❌ Redis (Upstash) - $1.2K → PostgreSQL cache suffit MVP
- ❌ Sentry - $1.2K → Vercel error tracking + logs (Phase 2 si volume)
- ❌ Datadog - $3.6K → Vercel Analytics basique (Phase 2 si requis)
- ❌ Cloudflare Pro - $600 → Vercel CDN inclus
- ❌ AWS S3 - $1.2K → Vercel Blob Storage
- ❌ SendGrid - $960 → Vercel transactional emails (ou existant)
- ❌ PostgreSQL séparé - $2.4K → Base existante
- ❌ Outils Dev additionnels - $4.6K → Déjà payés

**Services Optionnels Phase 2+ (Si Performance Requiert):**
| Service | Quand Ajouter | Coût Mensuel |
|---------|--------------|--------------|
| Upstash Redis | Si cache PostgreSQL bottleneck | +$100/mois |
| Sentry | Si volume erreurs >1K/jour | +$100/mois |
| Cloudflare Pro | Si trafic >100K requêtes/jour | +$50/mois |

### 9.3 Budget Total Année 1

**✅ Budget Révisé avec Économies Infrastructure**

```
┌────────────────────────────────────────────────────────┐
│ BUDGET TOTAL MODULE PRICING - ANNÉE 1 (RÉVISÉ)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Ressources Humaines:                      $792,000    │
│   ├─ Phase 1 MVP (3 mois):        $108K              │
│   ├─ Phase 2 Intelligence (3 mois): $120K            │
│   └─ Phase 3 Automation (6 mois):   $564K            │
│                                                        │
│ Infrastructure & SaaS (Révisé):            $10,800    │
│   (vs Plan Initial: $42K)                             │
│   ✅ Économie: -$31.2K (-74%)                         │
│                                                        │
│ Contingence (10%):                         $80,280    │
│                                                        │
│ ─────────────────────────────────────────────────────│
│ TOTAL ANNÉE 1 (RÉVISÉ):                  $883,080    │
│ ═════════════════════════════════════════════════════│
│                                                        │
│ Comparaison vs Plan Initial:                          │
│   Plan Initial:                   $917,400            │
│   Plan Révisé:                    $883,080            │
│   💰 ÉCONOMIE TOTALE:             -$34,320 (-3.7%)    │
│                                                        │
│ Revenus Projetés Année 1:                $350,000    │
│   ├─ ARR nouveau module:          $250K              │
│   └─ Expansion upsells:           $100K              │
│                                                        │
│ ROI Année 1:                              -60%        │
│ (vs Plan Initial: -62%)                               │
│ Break-even projeté:                       Année 2 Q2  │
└────────────────────────────────────────────────────────┘

✅ IMPACT RÉVISION ARCHITECTURE:
- Infrastructure: -$31.2K/an (-74%) grâce à réutilisation
- Temps développement: -10-15% (composants existants)
- Time-to-market: Potentiellement 2 semaines plus rapide
- Complexité: Réduite (moins de services à maintenir)

Note: ROI négatif Année 1 normal pour R&D nouvelle feature.
Projection Année 2: +$800K ARR → ROI +90%
Projection Année 3: +$1.5M ARR → ROI +170%
```

**Détail Économies Réalisées:**
| Catégorie | Plan Initial | Plan Révisé | Économie |
|-----------|-------------|-------------|----------|
| Infrastructure | $42K | **$10.8K** | **-$31.2K** |
| Contingence | $83.4K | **$80.3K** | -$3.1K |
| **TOTAL** | **$917.4K** | **$883.1K** | **-$34.3K** |

---

## 10. Risques & Mitigation

### 10.1 Risques Techniques

| Risque | Probabilité | Impact | Mitigation | Owner |
|--------|-------------|--------|------------|-------|
| **Scraping bloqué par Cloudflare/anti-bots** | HAUTE | CRITIQUE | • Playwright stealth mode<br>• Proxies rotatifs<br>• User-agent randomization<br>• Fallback: API si disponible | Backend Lead |
| **Performance dégradée (scans longs)** | MOYENNE | HAUTE | • Polling pattern optimisé<br>• Checkpointing fréquent (50 products)<br>• Incremental scans (delta only)<br>• PostgreSQL cache agressif | DevOps |
| **Matching accuracy faible (<70%)** | MOYENNE | HAUTE | • Continuous training ML model<br>• A/B test différents thresholds<br>• Feedback loop utilisateurs<br>• Fallback: manual matching UI | ML Engineer |
| **AI API downtime (OpenAI, Anthropic)** | FAIBLE | MOYENNE | • Fallback GPT-5 → GPT-4o → Claude<br>• Cache recommendations (7 jours)<br>• Graceful degradation (skip AI si down) | Backend Lead |
| **Database scaling (millions rows)** | MOYENNE | MOYENNE | • Table partitioning (par user_id)<br>• Archive old data (>1 an) vers cold storage<br>• Index optimization | DBA |
| **Real-time alerts latency (>1min)** | FAIBLE | MOYENNE | • Polling optimisé (2-5s intervals)<br>• PostgreSQL indexation alerte events<br>• Alert batch processing<br>• Phase 2: Considérer WebSocket si requis | Backend Lead |

### 10.2 Risques Produit/UX

| Risque | Probabilité | Impact | Mitigation | Owner |
|--------|-------------|--------|------------|-------|
| **Faible adoption (<60%)** | MOYENNE | CRITIQUE | • Onboarding wizard guidé<br>• Value demos (ROI calculators)<br>• Templates pré-configurés<br>• Success stories internes | PM |
| **Complexity overload (trop features Phase 1)** | HAUTE | HAUTE | • MVP strict (P0 only)<br>• Progressive disclosure UI<br>• Tutorials in-app<br>• Support documentation | PM + UX |
| **Données incomplètes (users skip upload)** | MOYENNE | HAUTE | • Import wizard obligatoire<br>• Templates Excel fournis<br>• API import auto (si ERP existant) | PM |
| **Confusion pricing vs autres modules CI** | FAIBLE | MOYENNE | • Navigation claire (breadcrumbs)<br>• Cross-linking intelligent<br>• Unified search | UX Designer |
| **Alert fatigue (trop d'alertes)** | HAUTE | MOYENNE | • Default rules conservatrices<br>• Digest mode par défaut<br>• Smart grouping alertes similaires<br>• "Snooze" functionality | PM |

### 10.3 Risques Business

| Risque | Probabilité | Impact | Mitigation | Owner |
|--------|-------------|--------|------------|-------|
| **Compétiteurs lancent feature similaire** | HAUTE | HAUTE | • Speed to market (MVP 3 mois)<br>• Differentiators uniques (CI integration)<br>• IP protection (patents?) | CEO |
| **Revenus <target ($250K Année 1)** | MOYENNE | HAUTE | • Pricing strategy tests (A/B)<br>• Freemium tier (limited scans)<br>• Upsell path clair | Sales Lead |
| **Churn élevé (>10%)** | FAIBLE | MOYENNE | • Onboarding 1-on-1 (high-touch)<br>• Quarterly business reviews<br>• Success metrics tracking | Customer Success |
| **Coûts AI dépassent budget (+50%)** | MOYENNE | MOYENNE | • Rate limiting par user tier<br>• Cache aggressive (7 jours)<br>• Fallback cheaper models (Haiku) | Finance + PM |
| **Légal: scraping contesté par concurrents** | FAIBLE | CRITIQUE | • Terms of Use review<br>• Legal counsel (scraping légalité Canada)<br>• Opt-in user responsibility clause | Legal |

### 10.4 Plan de Contingence

#### Scénario 1: Scraping Massivement Bloqué

**Trigger:** >50% concurrents bloquent scraper pendant >7 jours

**Actions:**
1. **Court terme (24h):**
   - Activer proxies premium rotatifs ($500/mois)
   - Switch vers browser fingerprinting avancé
   - Contact concurrents pour potential API partnerships

2. **Moyen terme (2 semaines):**
   - Développer alternative: crowdsourced pricing (users upload screenshots)
   - Intégration API tierces (Prisync, Competera) comme fallback
   - Pivot vers "manual entry + AI analysis" mode

3. **Long terme (1 mois):**
   - Négocier data partnerships avec distributeurs
   - Explore option: acheter données pricing agrégées (market research firms)

**Budget Contingence:** $50K réservés

#### Scénario 2: Adoption <40% après 6 mois

**Trigger:** Seulement 40% utilisateurs activent module après Phase 2 launch

**Actions:**
1. **Diagnostic (1 semaine):**
   - User interviews (10-15 non-adoptants)
   - Analytics deep-dive (où décrochent-ils?)
   - Competitor comparison (pourquoi choisissent alternatives?)

2. **Corrections (1 mois):**
   - Simplifier onboarding (réduire étapes 5 → 3)
   - Quick wins showcase (dashboard redesign focus ROI)
   - Incentives (crédits gratuits scans additionnels)

3. **Pivot si échec (3 mois):**
   - Repositionner comme "add-on premium" vs core module
   - Target niche (specific verticals: retail, manufacturing)
   - Bundling forcé avec Battle Hub (package deal)

**Decision Point:** Abandon module si adoption <30% après 9 mois

---

## 11. Conclusion & Prochaines Étapes

### 11.1 Résumé Exécutif

Le module **Competitive Pricing Intelligence** représente une opportunité stratégique majeure pour la plateforme Market Intelligence:

✅ **Différenciation Unique:** Seule solution combinant pricing + CI holistique + AI avancé
✅ **Market Fit Validé:** Personas Pricing Manager + CI Director = 80% de notre base utilisateurs
✅ **ROI Prouvé:** Cas d'usage démontrés (économie 24h/mois, marge +2-5%)
✅ **Scalabilité Technique:** Architecture modulaire, cloud-native, API-first
✅ **Roadmap Claire:** 3 phases sur 12 mois, milestones mesurables

**Investment Required:** $917K Année 1
**Projected Revenue:** $350K Année 1, $800K Année 2, $1.5M Année 3
**Break-even:** Année 2 Q2

### 11.2 Prochaines Étapes Immédiates

#### Semaine 1-2: Validation & Planning
- [ ] Présentation ce plan au C-level (approbation budget)
- [ ] Validation technique avec Engineering Lead (faisabilité stack)
- [ ] Kickoff meeting équipe projet (rôles, responsabilités)
- [ ] Setup outils collaboration (Linear, Figma, GitHub repo)

#### Semaine 3-4: Foundation
- [ ] Recruter Backend Dev Senior (si pas ressource interne)
- [ ] Setup environnement dev (DB, CI/CD pipeline)
- [ ] Design review sessions avec UX (wireframes → mockups)
- [ ] Définir 10 premiers user stories Phase 1 (backlog grooming)

#### Mois 2: Development Sprint 1
- [ ] Backend: DB schema + API endpoints core
- [ ] Frontend: Dashboard layout + design system
- [ ] Scraper: Engine Playwright + 1er site (Swish)
- [ ] Weekly demos vendredi (show progress)

### 11.3 Success Criteria Go/No-Go (Fin Mois 3)

**GO vers Phase 2 si:**
- ✅ MVP fonctionne end-to-end (upload → scan → dashboard)
- ✅ 10 beta users onboardés, ≥7 actifs hebdo
- ✅ NPS beta >30 (satisfaction basique démontrée)
- ✅ 0 blockers techniques critiques

**NO-GO = Pivot ou Pause si:**
- ❌ Success rate scans <60% (infeasible de scraper efficacement)
- ❌ NPS <20 (rejet utilisateurs, redesign majeur requis)
- ❌ Budget dépassé >30% (coûts incontrôlables)

---

## 12. Annexes

### Annexe A: Glossaire

| Terme | Définition |
|-------|------------|
| **Characteristic Matching** | Technique de matching produits basée sur attributs extraits (type, matériau, taille) plutôt que noms exacts. Permet de trouver équivalents cross-brand. |
| **Competitive Positioning Matrix** | Visualisation 2D (scatter plot) montrant position relative entreprise vs concurrents sur 2 axes (ex: prix vs couverture marché). |
| **Price Elasticity** | Sensibilité demande aux changements prix. Élasticité élevée = petite baisse prix → grosse hausse volume. |
| **SKU (Stock Keeping Unit)** | Identifiant unique produit dans système inventaire. |
| **Win/Loss Intelligence** | Module CI analysant raisons victoires/défaites deals commerciaux. Corrélation avec pricing = insight puissant. |
| **Dynamic Pricing** | Ajustement automatique prix basé sur règles/algorithmes, en réaction à marché. |
| **Confidence Score** | Score 0-1 indiquant fiabilité d'un match produit. >0.85 = haute confiance. |
| **Stealth Mode** | Techniques scraping rendant bot indétectable (user-agent, fingerprinting, timing humain). |

### Annexe B: Références & Inspirations

**Outils Pricing Concurrents Analysés:**
- Prisync (https://prisync.com) - E-commerce focus, simple
- Competera (https://competera.net) - Enterprise, ML-driven
- Price2Spy (https://price2spy.com) - Retail focus

**Patterns UX/UI Inspirants:**
- Linear (https://linear.app) - Dashboard KPIs, velocity
- Stripe Dashboard - Graphiques interactifs, data viz
- Notion - Progressive disclosure, templates

**Technical Stack References:**
- Playwright Docs: https://playwright.dev/docs/
- BullMQ: https://docs.bullmq.io/
- Recharts: https://recharts.org/en-US/

### Annexe C: Changelog Document

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-11-19 | Product Team | Version initiale - Draft complet plan |

---

**FIN DU DOCUMENT**

*Pour questions, feedback, ou discussions:*
📧 Contact: product@market-intelligence.com
📅 Dernière mise à jour: 19 novembre 2025
