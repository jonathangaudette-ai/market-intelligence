"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  Filter,
  Download,
  Upload,
  ToggleLeft,
  ToggleRight,
  Loader2,
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

export default function ProductsListPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: "1000",
          status: statusFilter === "all" ? "" : statusFilter,
        });

        const response = await fetch(`/api/companies/${slug}/pricing/products?${params}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des produits");
        }

        const data = await response.json();
        setProducts(data.products);
        setFilteredProducts(data.products);
        setTotal(data.pagination.total);
      } catch (err) {
        console.error("Error loading products:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [slug, statusFilter]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Toggle product active status
  async function toggleProductStatus(productId: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/companies/${slug}/pricing/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      // Update local state
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: !currentStatus } : p))
      );
    } catch (err) {
      console.error("Error toggling product:", err);
      alert("Erreur lors de la mise à jour du statut");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Mes Produits" },
        ]}
        title="Catalogue de Produits"
        description={`${total} produits dans votre catalogue`}
        badge={
          <Badge variant="default" className="gap-1">
            <Package className="h-3 w-3" />
            {total} produits
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/companies/${slug}/pricing/catalog`)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </>
        }
      />

      <div className="container mx-auto py-8 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres et recherche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par SKU, nom, marque ou catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status filter */}
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                >
                  Tous
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  onClick={() => setStatusFilter("active")}
                  size="sm"
                >
                  Actifs
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  onClick={() => setStatusFilter("inactive")}
                  size="sm"
                >
                  Inactifs
                </Button>
              </div>
            </div>

            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} résultat(s) trouvé(s) pour "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des produits</CardTitle>
            <CardDescription>
              Gérez vos produits et leur statut de surveillance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">
                <p>Erreur: {error}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun produit trouvé</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Essayez une autre recherche"
                    : "Importez votre catalogue pour commencer"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nom du produit</TableHead>
                      <TableHead>Marque</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/companies/${slug}/pricing/products/${product.id}`)}
                      >
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell className="font-medium max-w-md">
                          <div className="space-y-1">
                            <div className="truncate">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-gray-500 line-clamp-1" aria-hidden="true">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.brand || "N/A"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.category || "Non catégorisé"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.currentPrice
                            ? `${parseFloat(product.currentPrice).toFixed(2)}$`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.isActive ? (
                            <Badge variant="default" className="bg-green-600">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductStatus(product.id, product.isActive);
                            }}
                          >
                            {product.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
