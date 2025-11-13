import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { rfps, rfpQuestions } from '@/db/schema';
import { eq, count, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { ParsingProgress } from '@/components/rfp/parsing-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Calendar, DollarSign, Building2, FileText, ArrowLeft, ArrowRight, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { StartParsingButton } from '@/components/rfp/start-parsing-button';
import { EnrichmentForm } from '@/components/rfp/enrichment-form';
import { ExportButton } from '@/components/rfp/export-button';
import { SmartConfigureButton } from '@/components/rfp/smart-configure-button';

interface RFPDetailPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: RFPDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, id)).limit(1);

  return {
    title: rfp ? `${rfp.title} | RFP Assistant` : 'RFP Not Found',
    description: rfp?.clientName ? `RFP for ${rfp.clientName}` : 'RFP details',
  };
}

export default async function RFPDetailPage({ params }: RFPDetailPageProps) {
  const { id, slug } = await params;

  // Get authenticated user
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch RFP
  const [rfp] = await db
    .select()
    .from(rfps)
    .where(eq(rfps.id, id))
    .limit(1);

  if (!rfp) {
    notFound();
  }

  // Get question stats if parsing is completed
  let questionStats = null;
  if (rfp.parsingStatus === 'completed') {
    const [totalCount] = await db
      .select({ count: count() })
      .from(rfpQuestions)
      .where(eq(rfpQuestions.rfpId, id));

    const [completedCount] = await db
      .select({ count: count() })
      .from(rfpQuestions)
      .where(
        and(
          eq(rfpQuestions.rfpId, id),
          eq(rfpQuestions.hasResponse, true)
        )
      );

    questionStats = {
      total: totalCount?.count || 0,
      completed: completedCount?.count || 0,
    };
  }

  // Format date helper
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  // Prepare status badge
  const getStatusBadge = () => {
    if (rfp.isHistorical) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">📚 Historique</Badge>;
    }
    if (rfp.parsingStatus === 'completed') {
      return <Badge variant="default">Parsing terminé</Badge>;
    }
    if (rfp.parsingStatus === 'processing') {
      return <Badge variant="secondary">En cours de parsing</Badge>;
    }
    return <Badge variant="outline">En attente</Badge>;
  };

  return (
    <>
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: `/companies/${slug}/dashboard` },
          { label: "RFPs", href: `/companies/${slug}/rfps` },
          { label: rfp.title || "RFP" },
        ]}
        title={rfp.title || "RFP"}
        description={rfp.clientName || undefined}
        badge={getStatusBadge()}
        actions={
          <>
            {rfp.parsingStatus === 'pending' && (
              <StartParsingButton rfpId={id} slug={slug} />
            )}
            {rfp.parsingStatus === 'completed' && !rfp.isHistorical && (
              <SmartConfigureButton
                rfpId={id}
                slug={slug}
                variant="outline"
              />
            )}
            {rfp.parsingStatus === 'completed' && (
              <ExportButton
                rfpId={id}
                slug={slug}
                rfpTitle={rfp.title || 'RFP'}
              />
            )}
          </>
        }
      />

      <div className="container mx-auto py-8 max-w-6xl">

      {/* Historical RFP Banner */}
      {rfp.isHistorical && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-1">
                RFP Historique - Archive
              </h3>
              <p className="text-sm text-amber-800">
                Ce RFP a été soumis et est maintenant utilisé comme source pour améliorer les réponses futures via le système de récupération chirurgicale.
                Les questions et réponses sont en <strong>lecture seule</strong>.
              </p>
              {rfp.result && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={rfp.result === 'won' ? 'default' : 'secondary'} className={rfp.result === 'won' ? 'bg-green-100 text-green-800 border-green-300' : ''}>
                    Résultat: {rfp.result === 'won' ? '🏆 Gagné' : rfp.result === 'lost' ? '❌ Perdu' : '⏳ En attente'}
                  </Badge>
                  {rfp.qualityScore && (
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-300">
                      Score qualité: {rfp.qualityScore}/100
                    </Badge>
                  )}
                  {rfp.usageCount !== null && rfp.usageCount > 0 && (
                    <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-300">
                      Utilisé {rfp.usageCount}× comme source
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - RFP Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parsing Progress - Only for active RFPs */}
          {!rfp.isHistorical && <ParsingProgress rfpId={id} slug={slug} />}

          {/* RFP Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du RFP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p className="text-sm text-gray-900">{rfp.clientName}</p>
                  </div>
                </div>

                {rfp.clientIndustry && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Industrie</p>
                      <p className="text-sm text-gray-900">{rfp.clientIndustry}</p>
                    </div>
                  </div>
                )}

                {rfp.submissionDeadline && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Date limite
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatDate(rfp.submissionDeadline)}
                      </p>
                    </div>
                  </div>
                )}

                {rfp.estimatedDealValue && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Valeur estimée
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatCurrency(rfp.estimatedDealValue)}
                      </p>
                    </div>
                  </div>
                )}

                {rfp.originalFilename && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Fichier original
                      </p>
                      <p className="text-sm text-gray-900 truncate max-w-[200px]">
                        {rfp.originalFilename}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Statut du RFP</p>
                <Badge variant={rfp.status === 'draft' ? 'secondary' : 'default'}>
                  {rfp.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Analyse</p>
                <Badge
                  variant={
                    rfp.parsingStatus === 'completed'
                      ? 'default'
                      : rfp.parsingStatus === 'failed'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {rfp.parsingStatus === 'pending' && 'En attente'}
                  {rfp.parsingStatus === 'processing' && 'En cours'}
                  {rfp.parsingStatus === 'completed' && 'Terminée'}
                  {rfp.parsingStatus === 'failed' && 'Échouée'}
                </Badge>
              </div>

              {rfp.completionPercentage !== null && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Complétion</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rfp.completionPercentage}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Créé le:</span>
                <p className="text-gray-900">{formatDate(rfp.createdAt)}</p>
              </div>

              <div>
                <span className="text-gray-500">Mis à jour:</span>
                <p className="text-gray-900">{formatDate(rfp.updatedAt)}</p>
              </div>

              {rfp.parsedAt && (
                <div>
                  <span className="text-gray-500">Analysé le:</span>
                  <p className="text-gray-900">{formatDate(rfp.parsedAt)}</p>
                </div>
              )}

              {rfp.submittedAt && (
                <div>
                  <span className="text-gray-500">Soumis le:</span>
                  <p className="text-gray-900">{formatDate(rfp.submittedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Questions Summary & CTA - Full width */}
      {rfp.parsingStatus === 'completed' && questionStats && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questions du RFP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Questions totales</p>
                    <p className="text-3xl font-bold text-gray-900">{questionStats.total}</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-700">{rfp.isHistorical ? 'Réponses archivées' : 'Complétées'}</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{questionStats.completed}</p>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-4 w-4 text-teal-600" />
                      <p className="text-sm text-teal-700">En attente</p>
                    </div>
                    <p className="text-3xl font-bold text-teal-900">
                      {questionStats.total - questionStats.completed}
                    </p>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-4">
                    <p className="text-sm text-teal-700 mb-1">Progression</p>
                    <p className="text-3xl font-bold text-teal-900">
                      {questionStats.total > 0
                        ? Math.round((questionStats.completed / questionStats.total) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* CTA - Different for historical vs active */}
                {rfp.isHistorical ? (
                  <div className="flex flex-col justify-center gap-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-6 border-2 border-amber-200">
                    <div className="flex flex-col items-center mb-2">
                      <FileText className="h-10 w-10 text-amber-600 mb-2" />
                      <h3 className="text-base font-semibold text-gray-900 text-center">
                        Archive en lecture seule
                      </h3>
                    </div>

                    <Link href={`/companies/${slug}/rfps/${id}/questions`} className="w-full">
                      <Button className="w-full" size="lg" variant="outline">
                        Voir les Q&R archivées
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center gap-3 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6 border-2 border-teal-200">
                    <div className="flex flex-col items-center mb-2">
                      <FileText className="h-10 w-10 text-teal-600 mb-2" />
                      <h3 className="text-base font-semibold text-gray-900 text-center">
                        Prochaines étapes
                      </h3>
                    </div>

                    <Link href={`/companies/${slug}/rfps/${id}/summary`} className="w-full">
                      <Button className="w-full bg-teal-600 hover:bg-teal-700" size="lg" variant="default">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Sommaire Intelligent
                      </Button>
                    </Link>

                    <Link href={`/companies/${slug}/rfps/${id}/questions`} className="w-full">
                      <Button className="w-full" size="lg" variant="outline">
                        Répondre aux questions
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Enrichment Form - Full width (only for active RFPs) */}
      {!rfp.isHistorical && (
        <div className="mt-6">
          <EnrichmentForm
            rfpId={id}
            slug={slug}
            initialData={rfp.manualEnrichment as any}
          />
        </div>
      )}
      </div>
    </>
  );
}
