"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CatalogueUpload } from "@/components/pricing/catalogue-upload";

export default function CatalogUploadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        breadcrumbs={[
          { label: "Market Intelligence", href: `/companies/${slug}` },
          { label: "Intelligence de Prix", href: `/companies/${slug}/pricing` },
          { label: "Import Catalogue" },
        ]}
        title="Import Catalogue Produits"
        description="Uploader votre catalogue au format CSV ou Excel avec preview et validation"
      />

      <div className="container mx-auto py-8 max-w-6xl">
        <CatalogueUpload slug={slug} />
      </div>
    </div>
  );
}
