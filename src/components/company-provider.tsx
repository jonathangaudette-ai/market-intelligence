"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

/**
 * Sets the active company cookie based on URL slug
 * This is needed for API routes to know which company context to use
 */
export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    if (slug) {
      // Set active company by calling API
      fetch(`/api/companies/${slug}/set-active`, {
        method: "POST",
      }).catch(console.error);
    }
  }, [slug]);

  return <>{children}</>;
}
