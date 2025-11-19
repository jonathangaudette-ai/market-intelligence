"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, ArrowLeft, AlertCircle } from "lucide-react";

export default function CompetitorFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    isActive: true,
    scanFrequency: "daily",
    scraperConfig: {
      baseUrl: "",
      selectors: {
        productName: "",
        price: "",
        sku: "",
      },
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
      setError("Erreur lors du chargement du concurrent");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }

      router.push(`/companies/${slug}/pricing/competitors`);
    } catch (error) {
      console.error("Error saving competitor:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations Générales</CardTitle>
              <CardDescription>
                Nom et URL du site concurrent à surveiller
              </CardDescription>
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
                <Label htmlFor="websiteUrl">URL du Site Web</Label>
                <Input
                  id="websiteUrl"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://www.swish.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL complète du site (ex: https://www.competitor.com)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={form.isActive ? "active" : "paused"}
                    onValueChange={(value) =>
                      setForm({ ...form, isActive: value === "active" })
                    }
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
                    value={form.scanFrequency}
                    onValueChange={(value) =>
                      setForm({ ...form, scanFrequency: value })
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
              <CardDescription>
                Sélecteurs CSS pour extraire les données produits (optionnel pour Phase 5)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="baseUrl">URL Liste Produits</Label>
                <Input
                  id="baseUrl"
                  value={form.scraperConfig.baseUrl}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scraperConfig: {
                        ...form.scraperConfig,
                        baseUrl: e.target.value,
                      },
                    })
                  }
                  placeholder="https://www.swish.com/products"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL de la page listant les produits à surveiller
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productNameSelector">Sélecteur Nom Produit</Label>
                  <Input
                    id="productNameSelector"
                    value={form.scraperConfig.selectors.productName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scraperConfig: {
                          ...form.scraperConfig,
                          selectors: {
                            ...form.scraperConfig.selectors,
                            productName: e.target.value,
                          },
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
                    value={form.scraperConfig.selectors.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        scraperConfig: {
                          ...form.scraperConfig,
                          selectors: {
                            ...form.scraperConfig.selectors,
                            price: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder=".product-price"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="skuSelector">Sélecteur SKU (optionnel)</Label>
                <Input
                  id="skuSelector"
                  value={form.scraperConfig.selectors.sku}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scraperConfig: {
                        ...form.scraperConfig,
                        selectors: {
                          ...form.scraperConfig.selectors,
                          sku: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder=".product-sku"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Les sélecteurs CSS seront utilisés en Phase 6 (Scraping
                  Engine). Vous pouvez les configurer maintenant ou les modifier plus tard.
                </p>
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
