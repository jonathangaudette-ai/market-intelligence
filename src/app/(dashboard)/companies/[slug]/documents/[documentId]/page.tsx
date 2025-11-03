"use client";

import { useParams, useRouter } from "next/navigation";
import { DocumentUploadWizard } from "@/components/document-upload-wizard";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const documentId = params.documentId as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <DocumentUploadWizard
        slug={slug}
        documentId={documentId}
        onComplete={() => router.push(`/companies/${slug}/documents`)}
        onCancel={() => router.push(`/companies/${slug}/documents`)}
      />
    </div>
  );
}
