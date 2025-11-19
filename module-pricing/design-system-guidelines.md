# Guidelines UX/UI - Module Competitive Pricing Intelligence

**Version:** 1.0
**Date:** 19 novembre 2025
**Owner:** UX/UI Lead
**Status:** ✅ Approuvé

---

## 📋 Objectif

Ce document définit les guidelines de design pour le module Competitive Pricing Intelligence, garantissant une **cohérence parfaite** avec le design system existant de la plateforme Market Intelligence.

---

## 🎨 Design System - Référence Officielle

### Palette de Couleurs (CSS Variables)

```css
/* Light Mode - Thème Principal */
--primary: 142.1 76.2% 36.3%;        /* Teal-600 (#059669) */
--primary-foreground: 355.7 100% 97.3%;
--background: 0 0% 100%;             /* White */
--foreground: 240 10% 3.9%;          /* Near Black */
--card: 0 0% 100%;                   /* White */
--border: 240 5.9% 90%;              /* Gray-200 */
--muted-foreground: 240 5% 35%;      /* Gray-600 */
```

**Couleurs d'Usage:**

| Usage | Couleur Tailwind | Hex | Contexte |
|-------|------------------|-----|----------|
| **Primaire** | `teal-600` | `#059669` | Boutons primaires, badges status, icônes principales |
| **Background pages** | `gray-50` | `#F9FAFB` | Fond des pages dashboard |
| **Cards** | `white` | `#FFFFFF` | Background des cards |
| **Borders** | `gray-200` | `#E5E7EB` | Bordures cards, dividers |
| **Text principal** | `gray-900` | `#111827` | Titres, texte important |
| **Text secondaire** | `gray-600` | `#4B5563` | Labels, descriptions |
| **Success** | `green-600` | `#16A34A` | Valeurs positives, wins |
| **Warning** | `yellow-600` | `#CA8A04` | Alertes modérées |
| **Danger** | `red-600` | `#DC2626` | Alertes critiques, erreurs |

### Icônes (Lucide React)

**❌ JAMAIS D'EMOJIS** - Toujours utiliser `lucide-react`:

```tsx
import {
  DollarSign,    // Pricing, revenue
  TrendingUp,    // Trends positifs
  TrendingDown,  // Trends négatifs
  Target,        // Objectifs, competitive positioning
  AlertCircle,   // Alertes critiques
  FileText,      // Documents, produits
  ShoppingCart,  // Products, SKUs
  BarChart3,     // Analytics
  Sparkles,      // AI recommendations
  Clock,         // Time, historique
  CheckCircle2,  // Success, validation
} from "lucide-react";
```

**Sizing Standards:**
- Cards headers: `h-5 w-5` (20px)
- Stats grandes valeurs: `h-6 w-6` (24px)
- Buttons icons: `h-4 w-4` (16px)
- Badge icons: `h-3 w-3` (12px)

### Typography

```tsx
// Titres de page (PageHeader)
<h1 className="text-2xl font-bold text-gray-900">

// Titres de cards
<CardTitle className="font-semibold leading-none">

// Valeurs stats principales
<p className="text-3xl font-bold tracking-tight">

// Labels
<span className="text-sm text-muted-foreground">

// Descriptions
<p className="text-sm text-gray-600">
```

### Composants Standards

#### 1. StatCard (Utilisé pour KPIs)

```tsx
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp } from "lucide-react";

<StatCard
  label="Écart Prix Moyen"
  value="-12.4%"
  icon={DollarSign}
  trend={{
    value: -2.1,
    label: "vs 7 jours",
    isPositive: false,
  }}
  iconColor="bg-teal-100 text-teal-600"
/>
```

**Output visuel:**
```
┌──────────────────────────┐
│ Écart Prix Moyen    [$]  │ ← Icon teal-600 dans badge teal-100
│ -12.4%              ↓    │ ← Valeur text-3xl + trend icon
│ -2.1% vs 7 jours         │ ← Trend text-xs
└──────────────────────────┘
```

#### 2. PageHeader (Structure de page standard)

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

<PageHeader
  breadcrumbs={[
    { label: "Market Intelligence", href: `/companies/${slug}` },
    { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
  ]}
  title="Centre de Prix Concurrentiels"
  description="Surveillance et analyse de 576 produits vs 13 concurrents"
  badge={
    <Badge variant="default" className="gap-1">
      <Sparkles className="h-3 w-3" />
      Système opérationnel
    </Badge>
  }
  actions={
    <Button onClick={() => router.push(`/companies/${slug}/pricing/scan`)}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Lancer scan
    </Button>
  }
/>
```

#### 3. Card (Container principal)

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card className="hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle>Pipeline RFP</CardTitle>
    <CardDescription>État des appels d'offres en cours</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenu */}
  </CardContent>
</Card>
```

**Propriétés standards:**
- `className="rounded-lg border bg-card shadow-sm"`
- Padding header/content: `p-6`
- Hover effect: `hover:shadow-md transition-shadow`

#### 4. Badge (Status indicators)

```tsx
import { Badge } from "@/components/ui/badge";

// Variants disponibles
<Badge variant="default">Actif</Badge>           // Teal
<Badge variant="secondary">En attente</Badge>    // Gray
<Badge variant="destructive">Critique</Badge>    // Red
<Badge variant="outline">Neutral</Badge>         // Border only
```

#### 5. Alert Boxes (Notifications importantes)

```tsx
// ❌ PAS d'emojis - Utiliser icônes + backgrounds colorés
<div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
  <div className="flex-1">
    <p className="font-semibold text-sm text-red-900">
      3 RFPs avec échéance urgente
    </p>
    <p className="text-xs text-red-700 mt-1">
      Échéance dans moins de 7 jours
    </p>
  </div>
  <Button variant="outline" size="sm">Voir</Button>
</div>
```

**Color Mapping:**
- Critique: `bg-red-50 border-red-200 text-red-900`
- Warning: `bg-yellow-50 border-yellow-200 text-yellow-900`
- Success: `bg-green-50 border-green-200 text-green-900`
- Info: `bg-blue-50 border-blue-200 text-blue-900`

---

## 🏗️ Layout Standards

### Grid KPIs (Dashboard)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {stats.map((stat) => (
    <StatCard key={stat.label} {...stat} />
  ))}
</div>
```

**Breakpoints:**
- Mobile: 1 colonne
- Tablet (md): 2 colonnes
- Desktop (lg): 3 colonnes
- Gap: `gap-4` (16px)

### Layout 2-colonnes (Dashboard standard)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Colonne principale (2/3) */}
  <div className="lg:col-span-2">
    <Card>...</Card>
  </div>

  {/* Sidebar (1/3) */}
  <div className="space-y-6">
    <Card>...</Card>
    <Card>...</Card>
  </div>
</div>
```

### Page Structure

```tsx
<div className="min-h-screen bg-gray-50">
  {/* Header sticky */}
  <div className="border-b bg-card sticky top-0 z-50 shadow-sm">
    <PageHeader {...} />
  </div>

  {/* Content */}
  <div className="container mx-auto py-8 space-y-8">
    {/* KPIs Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ...
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      ...
    </div>
  </div>
</div>
```

---

## 🎯 Patterns Spécifiques - Module Pricing

### Dashboard Pricing Intelligence

```tsx
export default function PricingDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
            Actif
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={handleScan}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Lancer scan
            </Button>
          </>
        }
      />

      <div className="container mx-auto py-8 space-y-8">
        {/* KPIs Grid */}
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
            iconColor="bg-green-100 text-green-600"
          />
          {/* ... autres KPIs */}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline (2/3) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des Prix - 30 jours</CardTitle>
                <CardDescription>
                  Comparaison vos prix vs concurrents principaux
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistory}>
                    {/* Recharts config */}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                  Insights IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Alert Critique */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-900">
                        Swish a réduit 12 brosses de -15%
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Réaction recommandée sous 48h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alert Warning */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-yellow-900">
                        "Brosse cuvette ATL-2024" 23% au-dessus
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
    </div>
  );
}
```

### Catalogue de Produits (Table View)

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Catalogue Produits</CardTitle>
      <CardDescription>576 produits | 107 matchés (18.5%)</CardDescription>
    </div>
    <div className="flex items-center gap-2">
      <Input placeholder="Rechercher..." className="w-64" />
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
        {products.map((product) => (
          <TableRow key={product.id} className="hover:bg-gray-50">
            <TableCell className="font-mono text-sm">{product.sku}</TableCell>
            <TableCell>
              <div className="max-w-md">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category}</p>
              </div>
            </TableCell>
            <TableCell className="text-right font-semibold">
              ${product.price}
            </TableCell>
            <TableCell className="text-right">
              ${product.marketMin}
            </TableCell>
            <TableCell className="text-right">
              <span className={cn(
                "font-semibold",
                product.gap > 0 ? "text-red-600" : "text-green-600"
              )}>
                {product.gap > 0 ? "+" : ""}{product.gap}%
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={
                product.status === "critical" ? "destructive" :
                product.status === "warning" ? "secondary" :
                "default"
              }>
                {product.statusLabel}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Page Détail Produit

```tsx
<div className="min-h-screen bg-gray-50">
  <PageHeader
    breadcrumbs={[
      { label: "Market Intelligence", href: `/companies/${slug}` },
      { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
      { label: "ATL-2024" },
    ]}
    title="Brosse à Cuvette Polypropylene"
    description="ATL-2024 | Catégorie: Brosses"
    badge={
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        +23% au-dessus marché
      </Badge>
    }
    actions={
      <>
        <Button variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Voir historique
        </Button>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Ajuster prix
        </Button>
      </>
    }
  />

  <div className="container mx-auto py-8 space-y-6">
    {/* Info Cards Row */}
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

      {/* ... autres cards */}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Graphique Historique */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Historique 90 jours</CardTitle>
          <CardDescription>Évolution prix vs 3 concurrents</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={history}>
              {/* Recharts config avec couleurs cohérentes */}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recommandations IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Recommandations IA
          </CardTitle>
          <CardDescription>Suggestions GPT-5</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{rec.strategy}</p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  <p className="text-sm font-semibold text-teal-600 mt-2">
                    ${rec.price} ({rec.change})
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
```

---

## 📊 Data Visualization (Recharts)

### Configuration Standard

```tsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
    <XAxis
      dataKey="date"
      stroke="#6B7280"
      fontSize={12}
      tickLine={false}
    />
    <YAxis
      stroke="#6B7280"
      fontSize={12}
      tickLine={false}
      tickFormatter={(value) => `$${value}`}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
      }}
    />
    <Legend />

    {/* Lignes avec couleurs cohérentes */}
    <Line
      type="monotone"
      dataKey="yourPrice"
      name="Vous"
      stroke="#059669"      // Teal-600
      strokeWidth={3}
      dot={false}
    />
    <Line
      type="monotone"
      dataKey="competitor1"
      name="Swish"
      stroke="#3B82F6"      // Blue-500
      strokeWidth={2}
      dot={false}
    />
    <Line
      type="monotone"
      dataKey="competitor2"
      name="Grainger"
      stroke="#8B5CF6"      // Purple-500
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

**Color Palette Graphiques:**
- Vous (ligne principale): `teal-600` (#059669) - épaisseur 3px
- Concurrent 1: `blue-500` (#3B82F6)
- Concurrent 2: `purple-500` (#8B5CF6)
- Concurrent 3: `orange-500` (#F97316)
- Grille: `gray-200` (#E5E7EB)
- Axes: `gray-500` (#6B7280)

---

## ⚠️ Anti-Patterns à Éviter

### ❌ N'utilisez JAMAIS

1. **Emojis dans l'UI finale**
   ```tsx
   ❌ <span>📦 Produits</span>
   ✅ <ShoppingCart className="h-4 w-4" />
   ```

2. **Couleurs hardcodées hors design system**
   ```tsx
   ❌ style={{ color: "#FF5733" }}
   ✅ className="text-red-600"
   ```

3. **Fonts personnalisées**
   ```tsx
   ❌ style={{ fontFamily: "Comic Sans" }}
   ✅ className="font-semibold"  // Utilise la font système
   ```

4. **Spacing custom**
   ```tsx
   ❌ style={{ margin: "13px" }}
   ✅ className="mt-4 mb-2"      // Tailwind scale (4=16px, 2=8px)
   ```

5. **Components UI custom sans raison**
   ```tsx
   ❌ <div className="my-custom-card">...</div>
   ✅ <Card>...</Card>            // Utiliser composants existants
   ```

6. **Icônes de sources multiples**
   ```tsx
   ❌ import { FaDollar } from "react-icons/fa";
   ✅ import { DollarSign } from "lucide-react";
   ```

---

## ✅ Checklist Validation UX/UI

Avant de merger une feature du module Pricing, vérifier:

- [ ] ✅ Toutes les icônes proviennent de `lucide-react`
- [ ] ✅ Aucun emoji dans l'UI finale (sauf markdown docs)
- [ ] ✅ Utilise `PageHeader` pour toutes les pages
- [ ] ✅ Utilise `StatCard` pour les KPIs
- [ ] ✅ Background pages: `bg-gray-50`
- [ ] ✅ Cards: `<Card>` avec `hover:shadow-md`
- [ ] ✅ Couleur primaire: `teal-600` partout
- [ ] ✅ Badges avec variants appropriés
- [ ] ✅ Alert boxes avec backgrounds colorés + icônes (pas emojis)
- [ ] ✅ Typography respecte les standards (text-2xl, text-sm, etc.)
- [ ] ✅ Spacing Tailwind (p-4, p-6, gap-4, etc.)
- [ ] ✅ Responsive: grids avec breakpoints md/lg
- [ ] ✅ Graphiques Recharts avec palette standard
- [ ] ✅ Hover states sur éléments cliquables
- [ ] ✅ Loading states (Skeleton components)
- [ ] ✅ Empty states avec icônes + messages

---

## 📚 Ressources Complémentaires

### Documentation Officielle

- **Radix UI**: https://www.radix-ui.com/primitives/docs/overview/introduction
- **Lucide Icons**: https://lucide.dev/icons/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Recharts**: https://recharts.org/en-US/

### Composants Existants à Réutiliser

| Composant | Fichier | Usage Pricing |
|-----------|---------|---------------|
| `StatCard` | `/src/components/ui/stat-card.tsx` | KPIs dashboard |
| `PageHeader` | `/src/components/ui/page-header.tsx` | Headers toutes pages |
| `Card` | `/src/components/ui/card.tsx` | Containers principaux |
| `Badge` | `/src/components/ui/badge.tsx` | Status, tags |
| `Button` | `/src/components/ui/button.tsx` | Actions |
| `Table` | `/src/components/ui/table.tsx` | Listes produits |
| `EmptyState` | `/src/components/ui/empty-state.tsx` | États vides |
| `Skeleton` | `/src/components/ui/skeleton.tsx` | Loading states |

### Exemples de Pages à Imiter

- **Dashboard RFP**: `/src/app/(dashboard)/companies/[slug]/dashboard/page.tsx`
  - Utilise StatCard, PageHeader, Cards, Badges, Alert boxes
  - Excellent modèle pour dashboard pricing

---

## 📝 Changelog

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-11-19 | UX Lead | Version initiale - Guidelines complètes |

---

**Pour questions ou clarifications:**
📧 Contact: ux@market-intelligence.com
💬 Slack: #design-system
