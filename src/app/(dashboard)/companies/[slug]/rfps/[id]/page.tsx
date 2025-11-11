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
import { Calendar, DollarSign, Building2, FileText, ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { StartParsingButton } from '@/components/rfp/start-parsing-button';
import { EnrichmentForm } from '@/components/rfp/enrichment-form';

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

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/companies/${slug}/rfps`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux RFPs
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{rfp.title}</h1>
            <p className="mt-2 text-gray-600">{rfp.clientName}</p>
          </div>

          {rfp.parsingStatus === 'pending' && (
            <StartParsingButton rfpId={id} />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - RFP Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parsing Progress */}
          <ParsingProgress rfpId={id} />

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
                      <p className="text-sm text-green-700">Complétées</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{questionStats.completed}</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Circle className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-700">En attente</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">
                      {questionStats.total - questionStats.completed}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-700 mb-1">Progression</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {questionStats.total > 0
                        ? Math.round((questionStats.completed / questionStats.total) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
                  <FileText className="h-12 w-12 text-blue-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                    Répondre aux questions
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 text-center">
                    Accédez à l'interface de réponse avec filtres et éditeur de texte
                  </p>
                  <Link href={`/companies/${slug}/rfps/${id}/questions`} className="w-full">
                    <Button className="w-full" size="lg">
                      Commencer
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Enrichment Form - Full width */}
      <div className="mt-6">
        <EnrichmentForm
          rfpId={id}
          initialData={rfp.manualEnrichment as any}
        />
      </div>
    </div>
  );
}
