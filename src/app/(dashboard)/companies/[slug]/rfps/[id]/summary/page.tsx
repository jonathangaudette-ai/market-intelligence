import { RFPIntelligenceBriefView } from '@/components/rfp/intelligence-brief-view';

export default async function RFPSummaryPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <div className="container mx-auto py-8 px-4">
      <RFPIntelligenceBriefView slug={slug} rfpId={id} />
    </div>
  );
}
