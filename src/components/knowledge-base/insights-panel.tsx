"use client";

/**
 * Insights Panel Component
 * Phase 1 Day 10-11 - Support Docs RAG v4.0
 *
 * Displays actionable insights about the knowledge base:
 * - Warnings for low-confidence documents
 * - Success messages for good performance
 * - Suggestions for improvement
 */

import { AlertCircle, CheckCircle2, Info, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface Insight {
  type: "success" | "warning" | "info" | "action";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return CheckCircle2;
      case "warning":
        return AlertCircle;
      case "info":
        return Info;
      case "action":
        return TrendingUp;
      default:
        return Info;
    }
  };

  const getStyles = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          icon: "text-green-600",
          title: "text-green-900",
          text: "text-green-700",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-600",
          title: "text-yellow-900",
          text: "text-yellow-700",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          title: "text-blue-900",
          text: "text-blue-700",
        };
      case "action":
        return {
          bg: "bg-teal-50",
          border: "border-teal-200",
          icon: "text-teal-600",
          title: "text-teal-900",
          text: "text-teal-700",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          icon: "text-gray-600",
          title: "text-gray-900",
          text: "text-gray-700",
        };
    }
  };

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const Icon = getIcon(insight.type);
        const styles = getStyles(insight.type);

        return (
          <Card key={index} className={`${styles.bg} border-2 ${styles.border}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${styles.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${styles.title} mb-1`}>
                    {insight.title}
                  </h3>
                  <p className={`text-sm ${styles.text}`}>{insight.description}</p>
                </div>
                {insight.action && (
                  <div className="flex-shrink-0">
                    <Link href={insight.action.href}>
                      <Button variant="outline" size="sm" className="gap-2">
                        {insight.action.label}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
