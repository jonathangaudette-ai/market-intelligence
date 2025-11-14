"use client";

/**
 * Performance Metrics Component
 * Phase 1 Day 10-11 - Support Docs RAG v4.0
 *
 * Displays performance indicators:
 * - Analysis success rate
 * - Average confidence score
 * - Documents needing review
 * - Failed documents count
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PerformanceMetricsProps {
  performance: {
    analysisSuccessRate: number;
    avgConfidence: number;
    documentsNeedingReview: number;
    failedDocuments: number;
  };
  trends: {
    documentsChange: number;
    chunksChange: number;
  };
}

export function PerformanceMetrics({ performance, trends }: PerformanceMetricsProps) {
  const getTrendIcon = (value: number) => {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-400";
  };

  const metrics = [
    {
      label: "Taux de succès d'analyse",
      value: `${performance.analysisSuccessRate}%`,
      description: "Documents analysés avec succès",
      trend: trends.documentsChange,
      color: performance.analysisSuccessRate >= 90 ? "text-green-600" : "text-yellow-600",
    },
    {
      label: "Confiance moyenne",
      value: `${performance.avgConfidence}%`,
      description: "Score de confiance moyen de Claude",
      trend: 0, // TODO: Track this over time
      color: performance.avgConfidence >= 80 ? "text-green-600" : "text-yellow-600",
    },
    {
      label: "Documents à réviser",
      value: performance.documentsNeedingReview,
      description: "Confiance < 70%",
      trend: 0,
      color: performance.documentsNeedingReview === 0 ? "text-green-600" : "text-orange-600",
    },
    {
      label: "Échecs d'analyse",
      value: performance.failedDocuments,
      description: "Documents en erreur",
      trend: 0,
      color: performance.failedDocuments === 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const TrendIcon = getTrendIcon(metric.trend);
        const trendColor = getTrendColor(metric.trend);

        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${metric.color}`}>{metric.value}</span>
                  {metric.trend !== 0 && (
                    <div className={`flex items-center gap-1 ${trendColor}`}>
                      <TrendIcon className="h-4 w-4" />
                      <span className="text-xs font-medium">{Math.abs(metric.trend)}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
