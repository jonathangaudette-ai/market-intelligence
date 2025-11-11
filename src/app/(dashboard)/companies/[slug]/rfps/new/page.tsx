import { Metadata } from 'next';
import { RFPUploadForm } from '@/components/rfp/upload-form';

export const metadata: Metadata = {
  title: 'New RFP | RFP Assistant',
  description: 'Upload a new RFP document for processing',
};

export default function NewRFPPage() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload New RFP</h1>
        <p className="mt-2 text-gray-600">
          Upload your RFP document and let AI help you generate responses
        </p>
      </div>

      <RFPUploadForm />
    </div>
  );
}
