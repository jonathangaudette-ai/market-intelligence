"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, Settings } from "lucide-react";

export default function PricingSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  async function handleDeleteAllProducts() {
    if (deleteConfirm !== "DELETE ALL") {
      alert('Veuillez taper "DELETE ALL" pour confirmer');
      return;
    }

    if (!confirm("⚠️ ATTENTION: Cette action est irréversible!\n\nTous les produits seront supprimés définitivement.\n\nContinuer?")) {
      return;
    }

    setDeleting(true);
    setDeleteSuccess(false);

    try {
      const response = await fetch(
        `/api/companies/${slug}/pricing/products/bulk-delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      const data = await response.json();
      setDeleteSuccess(true);
      setDeleteConfirm("");

      alert(`✅ Succès!\n\n${data.deletedCount} produits supprimés.`);

      // Redirect to products page after 2 seconds
      setTimeout(() => {
        router.push(`/companies/${slug}/pricing/products`);
      }, 2000);
    } catch (error) {
      console.error("Error deleting products:", error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Paramètres" },
        ]}
        title="Paramètres"
        description="Configuration et gestion du module de prix"
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${slug}/pricing`)}
          >
            Retour au dashboard
          </Button>
        }
      />

      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Zone Dangereuse</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              Actions irréversibles - À utiliser avec précaution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delete All Products */}
            <div className="border border-red-300 rounded-lg p-6 bg-white">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    Supprimer Tous les Produits
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Supprime définitivement tous les produits du catalogue de prix.
                    Cette action ne peut pas être annulée.
                  </p>
                </div>

                {deleteSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                    ✅ Tous les produits ont été supprimés avec succès!
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tapez <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">DELETE ALL</code> pour confirmer:
                    </label>
                    <Input
                      type="text"
                      placeholder="DELETE ALL"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      className="max-w-xs font-mono"
                      disabled={deleting}
                    />
                  </div>

                  <Button
                    onClick={handleDeleteAllProducts}
                    disabled={deleteConfirm !== "DELETE ALL" || deleting}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? "Suppression en cours..." : "Supprimer Tous les Produits"}
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  ⚠️ <strong>Avertissement:</strong> Cette action supprimera:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Tous les produits du catalogue</li>
                    <li>Toutes les correspondances avec les concurrents</li>
                    <li>Tout l'historique de prix associé</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Settings (placeholder for future) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Paramètres Généraux</CardTitle>
            </div>
            <CardDescription>
              Configuration du module de prix
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 italic">
              Aucun paramètre général pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
