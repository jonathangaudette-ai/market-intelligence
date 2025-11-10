import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RFPDetailView } from '@/components/rfp/rfp-detail-view';

export const metadata: Metadata = {
  title: 'RFP Details | RFP Assistant',
  description: 'View and manage RFP details',
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RFPDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8">
      <RFPDetailView rfpId={id} />
    </div>
  );
}
