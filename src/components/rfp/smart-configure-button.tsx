'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SmartConfigureButtonProps {
  rfpId: string;
  slug: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

interface SmartConfigResult {
  suggestedSources: Record<string, string[]>;
  questionsClassified: number;
  averageConfidence: number;
  contentTypeBreakdown: Record<string, number>;
}

export function SmartConfigureButton({
  rfpId,
  slug,
  variant = 'default',
  size = 'default',
  className = '',
}: SmartConfigureButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartConfigResult | null>(null);

  const handleConfigure = async () => {
    setIsConfiguring(true);
    setError(null);
    setResult(null);

    try {
      console.log(`[Smart Configure] Starting configuration for RFP ${rfpId}...`);

      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/smart-configure`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || 'Échec de la configuration intelligente');
        throw new Error(errorMessage);
      }

      console.log('[Smart Configure] Success:', data);

      setResult({
        suggestedSources: data.suggestedSources || {},
        questionsClassified: data.questionsClassified || 0,
        averageConfidence: data.averageConfidence || 0,
        contentTypeBreakdown: data.contentTypeBreakdown || {},
      });
    } catch (err) {
      console.error('[Smart Configure] Error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setResult(null);
    setIsConfiguring(false);
    // Refresh the page to show updated configuration
    router.refresh();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setIsOpen(true);
          handleConfigure();
        }}
        className={className}
      >
        <Wand2 className="h-4 w-4 mr-2" />
        Configuration intelligente
      </Button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !isConfiguring && (open ? setIsOpen(true) : handleClose())}>
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Configuration intelligente des sources
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                L'IA analyse vos questions et trouve les meilleures sources historiques
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* Loading state */}
              {isConfiguring && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mb-4" />
                    <p className="text-gray-700 font-medium">Analyse en cours...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Classification des questions et recherche des sources optimales
                    </p>
                  </div>

                  <Progress value={50} className="h-2" />

                  <div className="text-xs text-gray-500 space-y-1">
                    <p>✓ Extraction des questions</p>
                    <p>✓ Classification par type de contenu</p>
                    <p className="animate-pulse">→ Calcul des scores de correspondance...</p>
                    <p className="text-gray-400">• Sélection des meilleures sources</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && !isConfiguring && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-8">
                    <XCircle className="h-12 w-12 text-red-600 mb-4" />
                    <p className="text-red-700 font-medium">Échec de la configuration</p>
                    <p className="text-sm text-gray-600 mt-2 text-center max-w-md">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Success state */}
              {result && !isConfiguring && !error && (
                <div className="space-y-6">
                  {/* Success icon */}
                  <div className="flex flex-col items-center py-6">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                    <p className="text-green-700 font-medium text-lg">
                      Configuration réussie!
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-700 mb-1">Questions classifiées</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {result.questionsClassified}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-700">Confiance moyenne</p>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        {Math.round(result.averageConfidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Content type breakdown */}
                  {Object.keys(result.contentTypeBreakdown).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Répartition par type de contenu
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(result.contentTypeBreakdown)
                          .sort(([, a], [, b]) => b - a)
                          .map(([contentType, count]) => (
                            <div key={contentType} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-700">
                                {contentType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                              <Badge variant="secondary">{count} question{count > 1 ? 's' : ''}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Source count */}
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <p className="text-sm text-teal-900">
                      <span className="font-semibold">
                        {Object.values(result.suggestedSources).flat().length} sources historiques
                      </span>{' '}
                      ont été configurées pour optimiser vos réponses.
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                    <p className="mb-1">
                      ✓ Les questions ont été automatiquement liées aux meilleurs RFPs historiques
                    </p>
                    <p>
                      ✓ L'IA utilisera ces sources pour générer des réponses plus pertinentes et contextuelles
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {!isConfiguring && (
                <>
                  {error && (
                    <Button
                      onClick={() => {
                        setError(null);
                        handleConfigure();
                      }}
                      variant="outline"
                    >
                      Réessayer
                    </Button>
                  )}
                  <Button
                    onClick={handleClose}
                    variant={result ? 'default' : 'outline'}
                  >
                    {result ? 'Terminer' : 'Fermer'}
                  </Button>
                </>
              )}
              {isConfiguring && (
                <Button disabled variant="outline">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Configuration en cours...
                </Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
