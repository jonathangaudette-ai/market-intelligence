import { Metadata } from 'next';
import { HistoricalImportForm } from '@/components/rfp/historical-import-form';

export const metadata: Metadata = {
  title: 'Importer un RFP historique | RFP Assistant',
  description: 'Importez un RFP passé pour enrichir votre bibliothèque de sources',
};

export default function ImportHistoricalRFPPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Importer un RFP historique
        </h1>
        <p className="mt-2 text-gray-600">
          Ajoutez un RFP passé à votre bibliothèque pour améliorer la qualité des réponses futures.
          L'IA fera correspondre automatiquement les questions aux réponses pour une réutilisation intelligente.
        </p>
      </div>

      <HistoricalImportForm params={params} />
    </div>
  );
}
