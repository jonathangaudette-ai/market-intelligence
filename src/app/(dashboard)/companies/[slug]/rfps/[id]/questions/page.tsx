import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { rfps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { QuestionList } from '@/components/rfp/question-list';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface QuestionsPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: QuestionsPageProps): Promise<Metadata> {
  const { id } = await params;
  const [rfp] = await db.select().from(rfps).where(eq(rfps.id, id)).limit(1);

  return {
    title: rfp ? `Questions - ${rfp.title} | RFP Assistant` : 'Questions RFP',
    description: 'Répondre aux questions du RFP',
  };
}

export default async function QuestionsPage({ params }: QuestionsPageProps) {
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

  // Verify parsing is completed
  if (rfp.parsingStatus !== 'completed') {
    redirect(`/companies/${slug}/rfps/${id}`);
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/companies/${slug}/rfps/${id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au RFP
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
            </div>
            <p className="text-gray-600">{rfp.title}</p>
            <p className="text-sm text-gray-500 mt-1">{rfp.clientName}</p>
          </div>
        </div>
      </div>

      {/* Question List - Full width */}
      <QuestionList rfpId={id} />
    </div>
  );
}
