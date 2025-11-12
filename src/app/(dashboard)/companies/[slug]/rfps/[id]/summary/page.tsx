import { RFPIntelligenceBriefView } from '@/components/rfp/intelligence-brief-view';

export default async function RFPSummaryPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            margin: 1.5cm;
            size: A4;
          }

          /* Hide navigation and unnecessary elements */
          nav, header, .print\\:hidden {
            display: none !important;
          }

          /* Optimize spacing for print */
          .container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          /* Ensure cards don't break across pages */
          .card, [class*="Card"] {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Better spacing between sections */
          .space-y-6 > * {
            margin-bottom: 1.5rem !important;
          }

          /* Ensure charts are visible in print */
          svg {
            max-width: 100% !important;
            height: auto !important;
          }

          /* Remove shadows and unnecessary decorations */
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="container mx-auto py-8 px-4">
        <RFPIntelligenceBriefView slug={slug} rfpId={id} />
      </div>
    </>
  );
}
