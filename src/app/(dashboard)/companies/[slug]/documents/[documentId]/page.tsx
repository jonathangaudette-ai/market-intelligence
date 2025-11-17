"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Document Detail Page - DEPRECATED
 * Redirects to Knowledge Base (Support Docs RAG v4.0)
 *
 * The old document detail/edit functionality has been replaced by Knowledge Base
 * which provides superior document management and AI-powered analysis.
 */
export default function DocumentDetailRedirectPage() {
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
