"use client";

/**
 * Content Distribution Component
 * Phase 1 Day 10-11 - Support Docs RAG v4.0
 *
 * Displays distribution of documents by content type
 * with visual representation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentDistributionProps {
  byContentType: Record<string, number>;
  total: number;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  methodology_guide: "Guide méthodologique",
  case_study: "Étude de cas",
  technical_spec: "Spécification technique",
  certification: "Certification",
  financial_info: "Information financière",
  company_overview: "Présentation entreprise",
  product_datasheet: "Fiche produit",
  security_whitepaper: "Livre blanc sécurité",
  service_agreement: "Accord de service",
  training_manual: "Manuel de formation",
  other: "Autre",
  unknown: "Non catégorisé",
};

const COLORS = [
  "bg-teal-600",
  "bg-teal-500",
  "bg-teal-400",
  "bg-teal-700",
  "bg-teal-800",
  "bg-teal-300",
  "bg-teal-900",
  "bg-teal-200",
  "bg-cyan-600",
  "bg-cyan-500",
];

export function ContentDistribution({ byContentType, total }: ContentDistributionProps) {
  // Sort by count descending
  const sortedTypes = Object.entries(byContentType).sort(([, a], [, b]) => b - a);

  // Calculate percentages
  const typesWithPercentage = sortedTypes.map(([type, count], index) => ({
    type,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: COLORS[index % COLORS.length],
    label: CONTENT_TYPE_LABELS[type] || type,
  }));

  if (sortedTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribution par type de contenu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">
            Aucun document analysé pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution par type de contenu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual bar chart */}
        <div className="space-y-3">
          {typesWithPercentage.map((item) => (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{item.count}</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.percentage}%
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${item.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total des types</span>
            <span className="font-semibold text-gray-900">{sortedTypes.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
