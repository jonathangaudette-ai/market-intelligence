# Phase 2: Dashboard MVP (Mock Data)

**Durée estimée:** 4-6 heures
**Complexité:** ⭐⭐ Moyenne
**Pré-requis:** Phase 0 + Phase 1 complétées

---

## 🎯 Objectif

Créer le dashboard principal du module Pricing Intelligence avec UI complète et données mock:

✅ Page `/companies/[slug]/pricing` fonctionnelle
✅ 6 KPI cards (StatCard)
✅ Graphique Recharts (évolution prix 30j)
✅ 3 alert boxes (critique/warning/opportunité)
✅ 100% conforme design-system-guidelines.md
✅ Responsive mobile/tablet/desktop

**Valeur ajoutée:** Dashboard visible et démontrable aux stakeholders (Quick Win)

---

## 📋 Pré-requis

```bash
# 1. Phases précédentes complétées
test -f module-pricing/handoffs/phase-1-handoff.json || echo "❌ Phase 1 not completed"

# 2. Tables DB créées
psql $DATABASE_URL -c "\dt pricing_products" > /dev/null 2>&1 || echo "❌ Tables not created"

# 3. Components UI existent
test -f src/components/ui/stat-card.tsx || echo "❌ StatCard component missing"
test -f src/components/ui/page-header.tsx || echo "❌ PageHeader component missing"

# 4. Recharts installé
npm list recharts > /dev/null 2>&1 || echo "❌ Recharts not installed"
```

---

## 📚 Documents à Lire (Contexte)

**CRITIQUE - Lire dans cet ordre:**

1. **`module-pricing/design-system-guidelines.md`** (15 min)
   - Section "Dashboard Pricing Intelligence" avec code complet
   - Palette couleurs (Teal-600, no emojis)
   - Composants StatCard, PageHeader, Alert boxes

2. **`module-pricing/plan-initial-pricing.md` section 3.1** (10 min)
   - Maquette React/TypeScript exacte du dashboard
   - Structure des données mock
   - Configuration Recharts

3. **`src/components/ui/stat-card.tsx`** (5 min)
   - API du composant StatCard (props acceptées)

4. **`src/app/(dashboard)/companies/[slug]/dashboard/page.tsx`** (10 min)
   - Référence: dashboard RFP existant
   - Pattern Next.js App Router
   - Structure de page standard

**Total lecture:** ~40 minutes

---

## 🛠️ Tâches à Réaliser

### Tâche 1: Créer la Page Dashboard

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/page.tsx` (nouveau)

**Code complet** (basé sur maquette section 3.1):

```typescript
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
```

**Validation:**
```bash
# Lancer dev server
npm run dev

# Naviguer vers
open http://localhost:3000/companies/[your-slug]/pricing
```

---

### Tâche 2: Validation Design System (Checklist)

**Action:** Vérifier conformité 100% avec design-system-guidelines.md

Ouvrir la checklist: `module-pricing/validation/checklist-phase-2.md` (à créer)

```markdown
# Checklist Validation Phase 2: Dashboard MVP

## Design System Compliance

### Couleurs
- [ ] Background page: `bg-gray-50`
- [ ] Primary color: `teal-600` (#059669) partout
- [ ] Cards: `bg-white` avec `border-gray-200`
- [ ] Icons badges: `bg-teal-100 text-teal-600`
- [ ] Alert boxes: `bg-red-50/yellow-50/green-50`

### Composants
- [ ] `PageHeader` utilisé avec breadcrumbs
- [ ] `StatCard` pour les 6 KPIs (pas custom cards)
- [ ] `Card` pour containers
- [ ] `Badge` pour status "Système opérationnel"
- [ ] `Button` pour actions (Exporter, Lancer scan)

### Icônes
- [ ] **AUCUN emoji** dans l'UI
- [ ] Toutes icônes de `lucide-react`
- [ ] Sizes corrects: h-4 w-4 (buttons), h-5 w-5 (cards)

### Typography
- [ ] Titre page: `text-2xl font-bold`
- [ ] Labels KPI: `text-sm text-muted-foreground`
- [ ] Valeurs KPI: `text-3xl font-bold`
- [ ] Alert text: `text-sm font-semibold`

### Layout & Responsive
- [ ] Grid KPIs: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] Main grid: `lg:col-span-2` + `lg:col-span-1`
- [ ] Spacing: `gap-4`, `gap-6`, `space-y-8`
- [ ] Container: `container mx-auto py-8`

### Recharts
- [ ] Couleurs lignes: Vous (#059669), Swish (#3B82F6), Grainger (#8B5CF6), VTO (#F97316)
- [ ] CartesianGrid: stroke="#E5E7EB"
- [ ] Axes: stroke="#6B7280", fontSize={12}
- [ ] Tooltip: white background, border gray

### Interactions
- [ ] StatCard hover: `hover:shadow-md transition-shadow`
- [ ] Buttons clickables (même si actions vides pour MVP)
- [ ] Loading states: `loading={true}` passe au StatCard

## Fonctionnel

- [ ] Page charge sans erreurs TypeScript
- [ ] Données mock affichées correctement
- [ ] Graphique Recharts render sans crash
- [ ] Responsive: teste mobile (375px), tablet (768px), desktop (1920px)
- [ ] Navigation breadcrumbs fonctionnelle

## Code Quality

- [ ] Aucun `any` dans le code
- [ ] Types importés de `@/types/pricing` si utilisés
- [ ] Prettier formaté
- [ ] Pas de console.log oubliés
- [ ] Commentaires clairs ("Mock data for MVP Phase 2")
```

**Exécuter validation:**
```bash
# 1. Check TypeScript
npx tsc --noEmit

# 2. Check Linter
npm run lint

# 3. Visual check
open http://localhost:3000/companies/[slug]/pricing
```

---

### Tâche 3: Screenshots pour Documentation

**Action:** Capturer screenshots du dashboard pour handoff

```bash
# Créer dossier screenshots
mkdir -p module-pricing/screenshots

# Prendre screenshots manuellement:
# 1. Dashboard complet (desktop 1920x1080)
# 2. KPIs grid (zoom sur les 6 cards)
# 3. Graphique Recharts
# 4. Alert boxes sidebar
# 5. Mobile view (375px)

# Sauvegarder comme:
# - phase-2-dashboard-full.png
# - phase-2-kpis.png
# - phase-2-chart.png
# - phase-2-alerts.png
# - phase-2-mobile.png
```

---

## ✅ Critères de Succès

- [ ] Page `/companies/[slug]/pricing` accessible
- [ ] 6 KPI cards affichées avec icônes Lucide
- [ ] Graphique Recharts avec 4 lignes (Vous + 3 concurrents)
- [ ] 3 alert boxes colorées (rouge/jaune/vert)
- [ ] PageHeader avec breadcrumbs + badge + 2 boutons actions
- [ ] **AUCUN emoji** visible dans l'UI
- [ ] Couleur primaire `teal-600` partout
- [ ] Responsive: fonctionne sur mobile/tablet/desktop
- [ ] Loading states fonctionnels (skeleton StatCard)
- [ ] TypeScript compile sans erreurs (`npx tsc --noEmit`)
- [ ] Checklist validation 100% ✅

---

## 📦 Livrables Phase 2

**Fichiers créés:**
- `src/app/(dashboard)/companies/[slug]/pricing/page.tsx` (dashboard complet)
- `module-pricing/validation/checklist-phase-2.md` (checklist validation)
- `module-pricing/screenshots/phase-2-*.png` (5 screenshots)

**Visuel:**
- Dashboard fonctionnel et démontrable
- 100% conforme design system

---

## ➡️ Handoff pour Phase 3

```json
{
  "phase": 2,
  "name": "Dashboard MVP (Mock Data)",
  "completed": "2025-11-20T16:00:00Z",
  "duration": "5h",
  "status": "completed",
  "filesCreated": [
    "src/app/(dashboard)/companies/[slug]/pricing/page.tsx",
    "module-pricing/validation/checklist-phase-2.md"
  ],
  "screenshots": 5,
  "designSystemCompliance": "100%",
  "componentsCounts": {
    "StatCard": 6,
    "PageHeader": 1,
    "Card": 2,
    "Badge": 1,
    "Button": 2,
    "RechartsLines": 4
  },
  "dataSource": "mock",
  "responsive": true,
  "typeScriptErrors": 0,
  "nextPhaseReady": true,
  "blockers": [],
  "notes": "Dashboard MVP complet avec données mock. Prêt pour Phase 3: connecter API réelle et vraies données DB."
}
```

---

## 🎯 Prochaine Phase

**Phase 3: API Layer & Real Data**
- Créer l'API `/api/companies/[slug]/pricing/stats`
- Query vraies données depuis PostgreSQL
- Remplacer mock data par fetch API
- Caching stratégie

---

**Status Phase 2:** ⬜ TODO → Le Quick Win visible !
