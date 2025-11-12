'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import type { RFPIntelligenceBrief } from '@/types/rfp-intelligence';

interface Props {
  slug: string;
  rfpId: string;
}

export function RFPIntelligenceBriefView({ slug, rfpId }: Props) {
  const [brief, setBrief] = useState<RFPIntelligenceBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBrief();
  }, [slug, rfpId]);

  async function loadBrief() {
    try {
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/generate-brief`);

      if (response.status === 404) {
        // No brief exists yet
        setBrief(null);
      } else if (response.ok) {
        const data = await response.json();
        setBrief(data.brief);
      } else {
        throw new Error('Failed to load brief');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function generateBrief() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/generate-brief`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate brief');
      }

      const data = await response.json();
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!brief) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Sommaire Intelligent RFP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Aucun sommaire n'a encore été généré pour ce RFP. Cliquez ci-dessous pour générer une analyse AI complète.
          </p>
          <Button onClick={generateBrief} disabled={generating}>
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Génération en cours...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Générer le Sommaire Intelligent</>
            )}
          </Button>
          {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  const recommendationIcon = {
    GO: <CheckCircle className="h-6 w-6 text-green-600" />,
    CAUTION: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    NO_GO: <XCircle className="h-6 w-6 text-red-600" />,
  }[brief.recommendation.goNoGo];

  const recommendationColor = {
    GO: 'bg-green-100 text-green-800 border-green-200',
    CAUTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    NO_GO: 'bg-red-100 text-red-800 border-red-200',
  }[brief.recommendation.goNoGo];

  return (
    <div className="space-y-6">
      {/* Header with Recommendation */}
      <Card className={`border-2 ${recommendationColor}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {recommendationIcon}
              <div>
                <CardTitle className="text-2xl">Recommandation: {brief.recommendation.goNoGo}</CardTitle>
                <p className="text-sm mt-1">Confiance: {brief.recommendation.confidence}%</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={generateBrief} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Régénérer'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{brief.recommendation.reasoning}</p>
          {brief.recommendation.keyConsiderations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">Points clés à considérer:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {brief.recommendation.keyConsiderations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
        <CardHeader><CardTitle>Aperçu du Projet</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-600">Type de Projet</p>
            <p>{brief.overview.projectType}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">Industrie</p>
            <p>{brief.overview.industry}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">Budget Estimé</p>
            <p>{brief.overview.estimatedBudget || 'Non spécifié'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600">Durée Estimée</p>
            <p>{brief.overview.estimatedDuration || 'Non spécifié'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-semibold text-gray-600">Portée</p>
            <p className="text-sm">{brief.overview.scope}</p>
          </div>
        </CardContent>
      </Card>

      {/* Restrictive Clauses & Red Flags */}
      {(brief.restrictiveClauses.redFlags.length > 0 ||
        brief.restrictiveClauses.penalties.length > 0) && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Clauses Restrictives & Drapeaux Rouges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {brief.restrictiveClauses.redFlags.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">🚩 Drapeaux Rouges:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {brief.restrictiveClauses.redFlags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            {brief.restrictiveClauses.penalties.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">💰 Pénalités:</h4>
                {brief.restrictiveClauses.penalties.map((penalty, i) => (
                  <div key={i} className="mb-2 p-2 bg-red-50 rounded">
                    <p className="text-sm font-medium">{penalty.description}</p>
                    <p className="text-xs text-gray-600">
                      {penalty.amount && `Montant: ${penalty.amount} | `}
                      {penalty.trigger}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {brief.riskFactors.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Facteurs de Risque</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {brief.riskFactors.map((risk, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                  <Badge variant={
                    risk.severity === 'critical' ? 'destructive' :
                    risk.severity === 'high' ? 'default' : 'secondary'
                  }>{risk.severity}</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{risk.risk}</p>
                    {risk.mitigation && (
                      <p className="text-xs text-gray-600 mt-1">Mitigation: {risk.mitigation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Functional Scope Summary */}
      <Card>
        <CardHeader><CardTitle>Portée Fonctionnelle</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {brief.functionalScope.coreRequirements.length} exigences principales identifiées
          </p>
          <div className="space-y-2">
            {brief.functionalScope.coreRequirements.slice(0, 5).map((req, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline">{req.complexity}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{req.category}</p>
                  <p className="text-xs text-gray-600">{req.description}</p>
                </div>
              </div>
            ))}
          </div>
          {brief.functionalScope.coreRequirements.length > 5 && (
            <p className="text-xs text-gray-500 mt-3">
              ... et {brief.functionalScope.coreRequirements.length - 5} autres exigences
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generated timestamp */}
      <p className="text-xs text-gray-500 text-center">
        Généré le {new Date(brief.generatedAt).toLocaleDateString('fr-CA')} avec {brief.modelUsed}
      </p>
    </div>
  );
}
