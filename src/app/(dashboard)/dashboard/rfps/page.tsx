import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { getCurrentCompany } from '@/lib/auth/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RFP Assistant | Market Intelligence',
  description: 'Manage your RFP responses with AI assistance',
};

export default async function RFPsListPage() {
  // Get authenticated user
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Get company context
  const companyContext = await getCurrentCompany();
  if (!companyContext) {
    redirect('/companies');
  }

  // Fetch RFPs for this company
  const userRfps = await db
    .select()
    .from(rfps)
    .where(eq(rfps.companyId, companyContext.company.id))
    .orderBy(desc(rfps.createdAt));

  // Format date helper
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return null;
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'won':
        return 'default';
      case 'failed':
      case 'lost':
        return 'destructive';
      case 'processing':
      case 'in_progress':
      case 'in_review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      in_progress: 'En cours',
      in_review: 'En révision',
      approved: 'Approuvé',
      submitted: 'Soumis',
      won: 'Gagné',
      lost: 'Perdu',
    };
    return labels[status || 'draft'] || status || 'Brouillon';
  };

  const getParsingStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      processing: 'En cours',
      completed: 'Terminée',
      failed: 'Échouée',
    };
    return labels[status || 'pending'] || status || 'En attente';
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">RFP Assistant</h1>
          <p className="mt-2 text-gray-600">
            Gérez vos appels d'offres avec l'aide de l'IA
          </p>
        </div>
        <Link href="/dashboard/rfps/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Nouveau RFP
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total RFPs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRfps.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              En cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRfps.filter((r) => r.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Soumis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRfps.filter((r) => r.status === 'submitted').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">
              Gagnés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {userRfps.filter((r) => r.result === 'won').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RFPs List */}
      {userRfps.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun RFP pour le moment
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par créer votre premier RFP pour profiter de l'assistance IA
            </p>
            <Link href="/dashboard/rfps/new">
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Créer mon premier RFP
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userRfps.map((rfp) => (
            <Link key={rfp.id} href={`/dashboard/rfps/${rfp.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rfp.title}
                        </h3>
                        <Badge variant={getStatusVariant(rfp.status)}>
                          {getStatusLabel(rfp.status)}
                        </Badge>
                        <Badge
                          variant={getStatusVariant(rfp.parsingStatus)}
                        >
                          {getParsingStatusLabel(rfp.parsingStatus)}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {rfp.clientName}
                        {rfp.clientIndustry && ` • ${rfp.clientIndustry}`}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        {rfp.submissionDeadline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Date limite: {formatDate(rfp.submissionDeadline)}
                            </span>
                          </div>
                        )}

                        {rfp.estimatedDealValue && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(rfp.estimatedDealValue)}</span>
                          </div>
                        )}

                        {rfp.completionPercentage !== null && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">
                              {rfp.completionPercentage}% complété
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div>Créé le {formatDate(rfp.createdAt)}</div>
                      {rfp.parsedAt && (
                        <div className="text-xs mt-1">
                          Analysé le {formatDate(rfp.parsedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
