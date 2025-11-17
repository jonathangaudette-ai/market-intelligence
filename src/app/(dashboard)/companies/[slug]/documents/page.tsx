"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Documents page - DEPRECATED
 * Redirects to Knowledge Base (Support Docs RAG v4.0)
 *
 * The old Documents section has been replaced by Knowledge Base which provides:
 * - AI-powered document analysis
 * - Automatic categorization and tagging
 * - Confidence scoring
 * - Better analytics and insights
 */
export default function DocumentsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    // Redirect to Knowledge Base
    router.replace(`/companies/${slug}/knowledge-base`);
  }, [slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirection vers Knowledge Base...</p>
      </div>
    </div>
  );
}
