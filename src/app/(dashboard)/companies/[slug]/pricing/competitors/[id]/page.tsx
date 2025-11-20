"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, ArrowLeft, AlertCircle, TestTube, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ScrapingBeeConfig {
  api: {
    premium_proxy: boolean;
    country_code: string;
    render_js: boolean;
    wait: number;
    block_ads: boolean;
    block_resources: boolean;
    wait_for?: string;
    timeout: number;
  };
  selectors: {
    productName: string[];
    productPrice: string[];
    productSku?: string[];
    productImage?: string[];
    availability?: string[];
  };
  search: {
    url: string;
    method: 'GET' | 'POST';
    param: string;
  };
}

export default function CompetitorFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = params.id as string;
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState("");

  const [form, setForm] = useState<any>({
    name: "",
    websiteUrl: "",
    isActive: true,
    scanFrequency: "daily",
    scraperConfig: {
      scraperType: "playwright",
      baseUrl: "",
      selectors: {
        productName: "",
        price: "",
        sku: "",
      },
      scrapingbee: {
        api: {
          premium_proxy: true,
          country_code: "ca",
          render_js: true,
          wait: 10000,
          block_ads: true,
          block_resources: false,
          timeout: 120000,
        },
        selectors: {
          productName: ["h1.product__title", "h1.product-title", "h1"],
          productPrice: [".price-item.price-item--regular", ".price__regular .price-item", "span.price-item", ".price"],
          productSku: [".product__sku", "[data-product-sku]", ".sku"],
          productImage: [".product__media img", ".product__image img", "img[data-product-image]"],
        },
        search: {
          url: "",
          method: "GET" as const,
          param: "q",
        },
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

      // Ensure scraperConfig has proper structure
      const competitor = data.competitor;
      if (!competitor.scraperConfig.scrapingbee) {
        competitor.scraperConfig.scrapingbee = form.scraperConfig.scrapingbee;
      }

      setForm(competitor);
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

      toast.success("Concurrent sauvegardé avec succès");
      router.push(`/companies/${slug}/pricing/competitors`);
    } catch (error) {
      console.error("Error saving competitor:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSelectors() {
    if (!testUrl) {
      toast.error("Veuillez entrer une URL de test");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${slug}/pricing/test-scrapingbee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: testUrl,
          config: form.scraperConfig.scrapingbee,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast.success("Test réussi! Données extraites correctement");
      } else {
        toast.error(`Test échoué: ${result.error}`);
      }
    } catch (error) {
      console.error("Error testing selectors:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur lors du test";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  }

  // Helper to update nested ScrapingBee config
  const updateScrapingBeeConfig = (path: string, value: any) => {
    const keys = path.split('.');
    const newConfig = { ...form.scraperConfig };
    let current: any = newConfig.scrapingbee;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    setForm({ ...form, scraperConfig: newConfig });
  };

  const scraperType = form.scraperConfig?.scraperType || "playwright";

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

      <div className="container mx-auto py-8 max-w-4xl">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information */}
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

          {/* Scraper Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Type de Scraper</CardTitle>
              <CardDescription>
                Choisissez la méthode de scraping pour ce concurrent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="scraperType">Méthode de Scraping</Label>
                <Select
                  value={scraperType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      scraperConfig: {
                        ...form.scraperConfig,
                        scraperType: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="scraperType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playwright">Playwright (Railway Worker)</SelectItem>
                    <SelectItem value="scrapingbee">ScrapingBee API</SelectItem>
                    <SelectItem value="apify">Apify</SelectItem>
                    <SelectItem value="api">API Directe</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {scraperType === "scrapingbee" && "Recommandé pour contourner Cloudflare"}
                  {scraperType === "playwright" && "Pour les sites simples sans protection"}
                  {scraperType === "apify" && "Utilise un acteur Apify personnalisé"}
                  {scraperType === "api" && "Pour les APIs REST directes"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ScrapingBee Configuration */}
          {scraperType === "scrapingbee" && (
            <>
              {/* API Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration API ScrapingBee</CardTitle>
                  <CardDescription>
                    Paramètres d'appel à l'API ScrapingBee
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="premium_proxy">Premium Proxy</Label>
                      <p className="text-xs text-gray-500">
                        Requis pour contourner Cloudflare (recommandé)
                      </p>
                    </div>
                    <Switch
                      id="premium_proxy"
                      checked={form.scraperConfig.scrapingbee?.api.premium_proxy}
                      onCheckedChange={(checked) =>
                        updateScrapingBeeConfig('api.premium_proxy', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="country_code">Géolocalisation (Code Pays)</Label>
                    <Select
                      value={form.scraperConfig.scrapingbee?.api.country_code}
                      onValueChange={(value) =>
                        updateScrapingBeeConfig('api.country_code', value)
                      }
                    >
                      <SelectTrigger id="country_code">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ca">🇨🇦 Canada</SelectItem>
                        <SelectItem value="us">🇺🇸 États-Unis</SelectItem>
                        <SelectItem value="fr">🇫🇷 France</SelectItem>
                        <SelectItem value="gb">🇬🇧 Royaume-Uni</SelectItem>
                        <SelectItem value="de">🇩🇪 Allemagne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="render_js">Render JavaScript</Label>
                      <p className="text-xs text-gray-500">
                        Active le rendu JavaScript (requis pour la plupart des sites)
                      </p>
                    </div>
                    <Switch
                      id="render_js"
                      checked={form.scraperConfig.scrapingbee?.api.render_js}
                      onCheckedChange={(checked) =>
                        updateScrapingBeeConfig('api.render_js', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="wait">Temps d'attente (ms)</Label>
                    <Input
                      id="wait"
                      type="number"
                      min="0"
                      max="30000"
                      step="1000"
                      value={form.scraperConfig.scrapingbee?.api.wait}
                      onChange={(e) =>
                        updateScrapingBeeConfig('api.wait', parseInt(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Temps d'attente après le chargement de la page (défaut: 10000ms)
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="block_ads">Bloquer les Publicités</Label>
                      <p className="text-xs text-gray-500">
                        Améliore la vitesse de scraping
                      </p>
                    </div>
                    <Switch
                      id="block_ads"
                      checked={form.scraperConfig.scrapingbee?.api.block_ads}
                      onCheckedChange={(checked) =>
                        updateScrapingBeeConfig('api.block_ads', checked)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="wait_for">Wait For Selector (optionnel)</Label>
                    <Input
                      id="wait_for"
                      type="text"
                      placeholder=".product__title"
                      value={form.scraperConfig.scrapingbee?.api.wait_for || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig('api.wait_for', e.target.value)
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sélecteur CSS à attendre avant de retourner la page
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="30000"
                      max="300000"
                      step="10000"
                      value={form.scraperConfig.scrapingbee?.api.timeout}
                      onChange={(e) =>
                        updateScrapingBeeConfig('api.timeout', parseInt(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Timeout maximum de la requête (défaut: 120000ms)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* CSS Selectors */}
              <Card>
                <CardHeader>
                  <CardTitle>Sélecteurs CSS (Cheerio Parsing)</CardTitle>
                  <CardDescription>
                    Sélecteurs CSS pour extraire les données. Un par ligne, utilisés comme fallback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="productName">Product Name Selectors</Label>
                    <Textarea
                      id="productName"
                      placeholder="h1.product__title&#10;h1.product-title&#10;h1"
                      value={form.scraperConfig.scrapingbee?.selectors.productName?.join('\n') || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig(
                          'selectors.productName',
                          e.target.value.split('\n').filter(s => s.trim())
                        )
                      }
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Un sélecteur par ligne. Le premier qui matche sera utilisé.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="productPrice">Product Price Selectors</Label>
                    <Textarea
                      id="productPrice"
                      placeholder=".price-item.price-item--regular&#10;.price__regular .price-item&#10;span.price-item&#10;.price"
                      value={form.scraperConfig.scrapingbee?.selectors.productPrice?.join('\n') || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig(
                          'selectors.productPrice',
                          e.target.value.split('\n').filter(s => s.trim())
                        )
                      }
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="productSku">Product SKU Selectors (optionnel)</Label>
                    <Textarea
                      id="productSku"
                      placeholder=".product__sku&#10;[data-product-sku]&#10;.sku"
                      value={form.scraperConfig.scrapingbee?.selectors.productSku?.join('\n') || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig(
                          'selectors.productSku',
                          e.target.value.split('\n').filter(s => s.trim())
                        )
                      }
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="productImage">Product Image Selectors (optionnel)</Label>
                    <Textarea
                      id="productImage"
                      placeholder=".product__media img&#10;.product__image img&#10;img[data-product-image]"
                      value={form.scraperConfig.scrapingbee?.selectors.productImage?.join('\n') || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig(
                          'selectors.productImage',
                          e.target.value.split('\n').filter(s => s.trim())
                        )
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Search Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration de Recherche</CardTitle>
                  <CardDescription>
                    Configuration pour la recherche de produits par nom
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="search_url">Search URL</Label>
                    <Input
                      id="search_url"
                      type="url"
                      placeholder="https://swish.ca/search"
                      value={form.scraperConfig.scrapingbee?.search.url || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig('search.url', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="search_method">HTTP Method</Label>
                    <Select
                      value={form.scraperConfig.scrapingbee?.search.method}
                      onValueChange={(value) =>
                        updateScrapingBeeConfig('search.method', value)
                      }
                    >
                      <SelectTrigger id="search_method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="search_param">Query Parameter Name</Label>
                    <Input
                      id="search_param"
                      type="text"
                      placeholder="q"
                      value={form.scraperConfig.scrapingbee?.search.param || ""}
                      onChange={(e) =>
                        updateScrapingBeeConfig('search.param', e.target.value)
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Exemple: 'q' pour ?q=product+name
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Test Selectors */}
              <Card>
                <CardHeader>
                  <CardTitle>Tester les Sélecteurs</CardTitle>
                  <CardDescription>
                    Testez votre configuration avec une URL de produit réelle
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="testUrl">URL de Test</Label>
                    <Input
                      id="testUrl"
                      type="url"
                      placeholder="https://swish.ca/product-example"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestSelectors}
                    disabled={testing || !testUrl}
                  >
                    {testing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        Tester les Sélecteurs
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {testResult.success ? 'Test réussi!' : 'Test échoué'}
                          </p>
                          {testResult.data && (
                            <div className="mt-2 space-y-1 text-sm">
                              <p><strong>Nom:</strong> {testResult.data.name || 'Non extrait'}</p>
                              <p><strong>Prix:</strong> {testResult.data.price ? `$${testResult.data.price}` : 'Non extrait'}</p>
                              {testResult.data.sku && <p><strong>SKU:</strong> {testResult.data.sku}</p>}
                              {testResult.metadata && (
                                <p className="text-xs text-gray-600 mt-2">
                                  Crédits: {testResult.metadata.creditsUsed} | Durée: {testResult.metadata.duration}ms
                                </p>
                              )}
                            </div>
                          )}
                          {testResult.error && (
                            <p className="mt-1 text-sm text-red-700">{testResult.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Legacy Playwright Configuration */}
          {scraperType === "playwright" && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration Playwright</CardTitle>
                <CardDescription>
                  Sélecteurs CSS pour extraire les données produits
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
              </CardContent>
            </Card>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
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
