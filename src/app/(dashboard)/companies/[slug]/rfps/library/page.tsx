import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { rfps, companies, companyMembers } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, TrendingUp, Upload } from 'lucide-react';
import Link from 'next/link';
import { RFPLibraryClient } from '@/components/rfp/rfp-library-client';

export const metadata: Metadata = {
  title: 'Bibliothèque RFP | RFP Assistant',
  description: 'Gérer vos RFPs historiques pour améliorer les réponses futures',
};

export default async function RFPLibraryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { slug } = await params;

  // Get company by slug
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.slug, slug), eq(companies.isActive, true)))
    .limit(1);

  if (!company) {
    redirect('/login');
  }

  // Verify user has access (unless super admin)
  if (!session.user.isSuperAdmin) {
    const [membership] = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.userId, session.user.id),
          eq(companyMembers.companyId, company.id)
        )
      )
      .limit(1);

    if (!membership) {
      redirect('/login');
    }
  }

  // Fetch historical RFPs for this company
  const historicalRfps = await db
    .select()
    .from(rfps)
    .where(and(
      eq(rfps.companyId, company.id),
      eq(rfps.isHistorical, true)
    ))
    .orderBy(desc(rfps.submittedAt));

  // Calculate stats
  const totalRfps = historicalRfps.length;
  const wonRfps = historicalRfps.filter(r => r.result === 'won').length;
  const lostRfps = historicalRfps.filter(r => r.result === 'lost').length;
  const pendingRfps = historicalRfps.filter(r => r.result === 'pending').length;
  const winRate = totalRfps > 0 ? Math.round((wonRfps / totalRfps) * 100) : 0;
  const avgQualityScore = totalRfps > 0
    ? Math.round(
        historicalRfps.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / totalRfps
      )
    : 0;


  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Bibliothèque de RFPs historiques
              </h1>
            </div>
            <p className="text-gray-600">
              Vos RFPs passés sont utilisés pour améliorer la qualité des réponses futures
            </p>
          </div>

          <Link href={`/companies/${slug}/rfps/import`}>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Upload className="h-4 w-4 mr-2" />
              Importer un RFP
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{totalRfps}</p>
                <p className="text-sm text-gray-500 mt-1">RFPs historiques</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{wonRfps}</p>
                <p className="text-sm text-gray-500 mt-1">Gagnés</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{lostRfps}</p>
                <p className="text-sm text-gray-500 mt-1">Perdus</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">{winRate}%</p>
                </div>
                <p className="text-sm text-gray-500">Taux de succès</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{avgQualityScore}</p>
                <p className="text-sm text-gray-500 mt-1">Qualité moyenne</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RFPs List with Filters */}
      {historicalRfps.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Aucun RFP historique</p>
              <p className="text-sm text-gray-400 mt-2">
                Importez vos RFPs passés pour améliorer la qualité des réponses
              </p>
              <Link href={`/companies/${slug}/rfps/import`}>
                <Button className="mt-4" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importer votre premier RFP
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <RFPLibraryClient
          rfps={historicalRfps.map(rfp => ({
            ...rfp,
            result: rfp.result as 'won' | 'lost' | 'pending' | null
          }))}
          slug={slug}
        />
      )}

      {/* Info Card */}
      {totalRfps > 0 && (
        <Card className="mt-6 bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1 text-sm text-purple-900">
                <p className="font-medium mb-1">
                  Comment fonctionne la bibliothèque de RFPs?
                </p>
                <p className="text-purple-700">
                  Lorsque vous générez une réponse, l'IA analyse votre bibliothèque historique
                  pour trouver les meilleures réponses similaires. Les RFPs gagnés avec un score de
                  qualité élevé sont prioritaires pour améliorer vos chances de succès.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
