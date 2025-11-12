'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Sparkles, Linkedin } from 'lucide-react';

interface EnrichmentFormProps {
  rfpId: string;
  slug: string;
  initialData?: {
    clientBackground?: string;
    keyNeeds?: string;
    constraints?: string;
    relationships?: string;
    customNotes?: string;
  };
}

export function EnrichmentForm({ rfpId, slug, initialData }: EnrichmentFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // LinkedIn enrichment state
  const [isEnrichingLinkedIn, setIsEnrichingLinkedIn] = useState(false);
  const [linkedInSuccess, setLinkedInSuccess] = useState(false);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientBackground: initialData?.clientBackground || '',
    keyNeeds: initialData?.keyNeeds || '',
    constraints: initialData?.constraints || '',
    relationships: initialData?.relationships || '',
    customNotes: initialData?.customNotes || '',
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/enrichment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save enrichment');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save enrichment:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.clientBackground !== (initialData?.clientBackground || '') ||
      formData.keyNeeds !== (initialData?.keyNeeds || '') ||
      formData.constraints !== (initialData?.constraints || '') ||
      formData.relationships !== (initialData?.relationships || '') ||
      formData.customNotes !== (initialData?.customNotes || '')
    );
  };

  const handleLinkedInEnrich = async () => {
    setIsEnrichingLinkedIn(true);
    setLinkedInError(null);
    setLinkedInSuccess(false);

    try {
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/enrich-linkedin`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to enrich from LinkedIn');
      }

      setLinkedInSuccess(true);
      setTimeout(() => setLinkedInSuccess(false), 5000);

      // Reload page to show new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to enrich from LinkedIn:', error);
      setLinkedInError(error instanceof Error ? error.message : 'Failed to enrich');
    } finally {
      setIsEnrichingLinkedIn(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>Enrichissement contextuel (IA)</CardTitle>
            </div>
            <CardDescription>
              Ajoutez des informations manuelles sur le client pour améliorer la génération de réponses IA
            </CardDescription>
          </div>

          {/* LinkedIn Enrich Button */}
          <Button
            onClick={handleLinkedInEnrich}
            disabled={isEnrichingLinkedIn}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isEnrichingLinkedIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrichissement...
              </>
            ) : (
              <>
                <Linkedin className="h-4 w-4 text-blue-600" />
                Enrichir avec LinkedIn
              </>
            )}
          </Button>
        </div>

        {/* LinkedIn status messages */}
        {linkedInSuccess && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              ✓ Données LinkedIn récupérées avec succès! La page va se recharger...
            </p>
          </div>
        )}
        {linkedInError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">
              ❌ Erreur: {linkedInError}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Background */}
        <div className="space-y-2">
          <Label htmlFor="clientBackground">Contexte du client</Label>
          <Textarea
            id="clientBackground"
            value={formData.clientBackground}
            onChange={(e) => handleChange('clientBackground', e.target.value)}
            placeholder="Décrivez le contexte général du client (historique, mission, culture d'entreprise...)"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Ex: Entreprise familiale depuis 25 ans, leader dans l'industrie manufacturière, valeurs axées sur l'innovation durable
          </p>
        </div>

        {/* Key Needs */}
        <div className="space-y-2">
          <Label htmlFor="keyNeeds">Besoins clés identifiés</Label>
          <Textarea
            id="keyNeeds"
            value={formData.keyNeeds}
            onChange={(e) => handleChange('keyNeeds', e.target.value)}
            placeholder="Quels sont les principaux besoins ou défis du client que vous avez identifiés ?"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Ex: Besoin urgent de moderniser leur infrastructure IT, optimiser leurs processus, former leurs équipes
          </p>
        </div>

        {/* Constraints */}
        <div className="space-y-2">
          <Label htmlFor="constraints">Contraintes connues</Label>
          <Textarea
            id="constraints"
            value={formData.constraints}
            onChange={(e) => handleChange('constraints', e.target.value)}
            placeholder="Y a-t-il des contraintes budgétaires, techniques ou organisationnelles à considérer ?"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Ex: Budget limité à 500K$, migration doit être terminée avant T2 2025, équipe IT réduite
          </p>
        </div>

        {/* Relationships */}
        <div className="space-y-2">
          <Label htmlFor="relationships">Relation et historique</Label>
          <Textarea
            id="relationships"
            value={formData.relationships}
            onChange={(e) => handleChange('relationships', e.target.value)}
            placeholder="Avez-vous déjà travaillé avec ce client ? Y a-t-il des décideurs clés à mentionner ?"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Ex: Contact principal: Marie Dupont (VP IT), relation existante depuis projet pilote 2023
          </p>
        </div>

        {/* Custom Notes */}
        <div className="space-y-2">
          <Label htmlFor="customNotes">Notes additionnelles</Label>
          <Textarea
            id="customNotes"
            value={formData.customNotes}
            onChange={(e) => handleChange('customNotes', e.target.value)}
            placeholder="Toute autre information pertinente pour contextualiser les réponses..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Ex: Sensibles à la sécurité des données, préfèrent solutions canadiennes, ont eu mauvaise expérience avec compétiteur X
          </p>
        </div>

        {/* Save button and status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {saveSuccess && (
              <div className="text-sm text-green-600 flex items-center gap-2">
                ✓ Enregistré avec succès
              </div>
            )}
            {saveError && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                ❌ Erreur: {saveError}
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer l'enrichissement
              </>
            )}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Conseil :</strong> Plus vous fournissez de contexte, plus les réponses générées par l'IA seront pertinentes et personnalisées pour ce client spécifique.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
