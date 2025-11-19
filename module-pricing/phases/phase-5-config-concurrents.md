# Phase 5: Configuration Concurrents

**Durée estimée:** 3-4 heures
**Complexité:** ⭐⭐ Moyenne
**Pré-requis:** Phase 0, 1, 2, 3, 4 complétées

---

## Objectif

Créer l'interface de configuration des concurrents à surveiller: ajouter/modifier/supprimer des concurrents, configurer leurs URLs de scraping, et définir la fréquence de surveillance.

---

## Tâches

### Tâche 1: Page Liste Concurrents

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/competitors/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit, Trash2, ExternalLink, RefreshCw, Globe, CheckCircle, XCircle,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  domain: string;
  status: "active" | "paused" | "error";
  scrapingFrequency: string;
  lastScannedAt: Date | null;
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
                        {comp.status === "active" && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Actif
                          </Badge>
                        )}
                        {comp.status === "paused" && (
                          <Badge variant="secondary">En pause</Badge>
                        )}
                        {comp.status === "error" && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Erreur
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <a
                            href={`https://${comp.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline flex items-center gap-1"
                          >
                            {comp.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        <p>Fréquence: {comp.scrapingFrequency}</p>
                        <p>
                          Produits matchés:{" "}
                          <span className="font-semibold text-gray-900">
                            {comp.productsMatched}
                          </span>
                        </p>
                        {comp.lastScannedAt && (
                          <p>
                            Dernier scan:{" "}
                            {new Date(comp.lastScannedAt).toLocaleDateString("fr-CA")}
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
```

---

### Tâche 2: Page Ajouter/Modifier Concurrent

**Fichier:** `src/app/(dashboard)/companies/[slug]/pricing/competitors/[id]/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ArrowLeft } from "lucide-react";

export default function CompetitorFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    status: "active" as "active" | "paused",
    scrapingFrequency: "daily",
    scrapingSelectors: {
      productListUrl: "",
      productLinkSelector: "",
      nameSelector: "",
      priceSelector: "",
    },
  });

  useEffect(() => {
    if (!isNew) {
      fetchCompetitor();
    }
  }, [id]);

  async function fetchCompetitor() {
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/competitors/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setForm(data.competitor);
    } catch (error) {
      console.error("Error loading competitor:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew
        ? `/api/companies/${slug}/pricing/competitors`
        : `/api/companies/${slug}/pricing/competitors/${id}`;

      const method = isNew ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.push(`/companies/${slug}/pricing/competitors`);
    } catch (error) {
      console.error("Error saving competitor:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Concurrents", href: `/companies/${slug}/pricing/competitors` },
          { label: isNew ? "Nouveau" : "Modifier" },
        ]}
        title={isNew ? "Ajouter Concurrent" : "Modifier Concurrent"}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${slug}/pricing/competitors`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        }
      />

      <div className="container mx-auto py-8 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du Concurrent</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Swish"
                  required
                />
              </div>

              <div>
                <Label htmlFor="domain">Domaine</Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="swish.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: any) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="paused">En pause</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="frequency">Fréquence de Scan</Label>
                  <Select
                    value={form.scrapingFrequency}
                    onValueChange={(value) =>
                      setForm({ ...form, scrapingFrequency: value })
                    }
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Toutes les heures</SelectItem>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Configuration Scraping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="productListUrl">URL Liste Produits</Label>
                <Input
                  id="productListUrl"
                  value={form.scrapingSelectors.productListUrl}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scrapingSelectors: {
                        ...form.scrapingSelectors,
                        productListUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://swish.com/products"
                />
              </div>

              <div>
                <Label htmlFor="productLinkSelector">Sélecteur Liens Produits</Label>
                <Input
                  id="productLinkSelector"
                  value={form.scrapingSelectors.productLinkSelector}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scrapingSelectors: {
                        ...form.scrapingSelectors,
                        productLinkSelector: e.target.value,
                      },
                    })
                  }
                  placeholder=".product-card a"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nameSelector">Sélecteur Nom</Label>
                  <Input
                    id="nameSelector"
                    value={form.scrapingSelectors.nameSelector}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scrapingSelectors: {
                          ...form.scrapingSelectors,
                          nameSelector: e.target.value,
                        },
                      })
                    }
                    placeholder=".product-title"
                  />
                </div>

                <div>
                  <Label htmlFor="priceSelector">Sélecteur Prix</Label>
                  <Input
                    id="priceSelector"
                    value={form.scrapingSelectors.priceSelector}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scrapingSelectors: {
                          ...form.scrapingSelectors,
                          priceSelector: e.target.value,
                        },
                      })
                    }
                    placeholder=".product-price"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/companies/${slug}/pricing/competitors`)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### Tâche 3: Routes API Concurrents

**Fichier:** `src/app/api/companies/[slug]/pricing/competitors/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pricingCompetitors, pricingMatches } from "@/db/schema-pricing";
import { eq, and, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

interface CompetitorsParams {
  params: {
    slug: string;
  };
}

// GET /api/companies/[slug]/pricing/competitors
export async function GET(
  request: NextRequest,
  { params }: CompetitorsParams
) {
  try {
    const { slug } = params;

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch competitors with product match counts
    const competitors = await db
      .select({
        id: pricingCompetitors.id,
        name: pricingCompetitors.name,
        domain: pricingCompetitors.domain,
        status: pricingCompetitors.status,
        scrapingFrequency: pricingCompetitors.scrapingFrequency,
        lastScannedAt: pricingCompetitors.lastScannedAt,
        createdAt: pricingCompetitors.createdAt,
        productsMatched: sql<number>`
          (SELECT COUNT(*)::int
           FROM ${pricingMatches}
           WHERE ${pricingMatches.competitorId} = ${pricingCompetitors.id}
           AND ${pricingMatches.status} = 'active')
        `,
      })
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.companyId, company.id));

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/companies/[slug]/pricing/competitors
export async function POST(
  request: NextRequest,
  { params }: CompetitorsParams
) {
  try {
    const { slug } = params;

    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.slug, slug),
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json();

    const newCompetitor = {
      id: createId(),
      companyId: company.id,
      name: body.name,
      domain: body.domain,
      status: body.status || "active",
      scrapingFrequency: body.scrapingFrequency || "daily",
      scrapingSelectors: body.scrapingSelectors || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(pricingCompetitors).values(newCompetitor);

    return NextResponse.json({ competitor: newCompetitor }, { status: 201 });
  } catch (error) {
    console.error("Error creating competitor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Checklist de Validation

- [ ] Page liste concurrents créée (`/companies/[slug]/pricing/competitors`)
- [ ] Page formulaire créée (`/companies/[slug]/pricing/competitors/[id]`)
- [ ] Route GET concurrents fonctionnelle
- [ ] Route POST concurrent fonctionnelle
- [ ] Route PATCH concurrent fonctionnelle (à créer)
- [ ] Route DELETE concurrent fonctionnelle (à créer)
- [ ] Affichage nombre de produits matchés
- [ ] Statut actif/pause/erreur affiché correctement
- [ ] UI conforme design system

---

## Handoff JSON

```json
{
  "phase": 5,
  "name": "Configuration Concurrents",
  "completed": "YYYY-MM-DDTHH:mm:ssZ",
  "duration": "3.5h",
  "filesCreated": [
    "src/app/(dashboard)/companies/[slug]/pricing/competitors/page.tsx",
    "src/app/(dashboard)/companies/[slug]/pricing/competitors/[id]/page.tsx",
    "src/app/api/companies/[slug]/pricing/competitors/route.ts"
  ],
  "nextPhaseReady": true
}
```

**Prochaine étape:** Phase 6 - Scraping Engine
