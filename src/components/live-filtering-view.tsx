"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  relevanceScore: number;
  type: string;
  preview: string;
}

interface FilterDecision {
  section: Section;
  kept: boolean;
  reason: string;
}

interface LiveFilteringViewProps {
  sections: Section[];
  onComplete: (keptSections: Section[]) => void;
  minRelevanceScore?: number;
}

export function LiveFilteringView({
  sections,
  onComplete,
  minRelevanceScore = 0.7,
}: LiveFilteringViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<FilterDecision[]>([]);
  const [isFiltering, setIsFiltering] = useState(true);

  useEffect(() => {
    if (currentIndex >= sections.length) {
      setIsFiltering(false);
      const keptSections = decisions
        .filter((d) => d.kept)
        .map((d) => d.section);
      setTimeout(() => onComplete(keptSections), 1000);
      return;
    }

    const timer = setTimeout(() => {
      const section = sections[currentIndex];
      const kept = section.relevanceScore >= minRelevanceScore;
      const reason = kept
        ? `Score de pertinence élevé (${Math.round(section.relevanceScore * 100)}%)`
        : `Score trop faible (${Math.round(section.relevanceScore * 100)}% < ${Math.round(minRelevanceScore * 100)}%)`;

      setDecisions((prev) => [
        ...prev,
        {
          section,
          kept,
          reason,
        },
      ]);

      setCurrentIndex((prev) => prev + 1);
    }, 1500); // 1.5s per section

    return () => clearTimeout(timer);
  }, [currentIndex, sections, minRelevanceScore, onComplete]);

  const keptCount = decisions.filter((d) => d.kept).length;
  const rejectedCount = decisions.filter((d) => !d.kept).length;
  const progress = (currentIndex / sections.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isFiltering ? (
              <>
                <Filter className="h-4 w-4 animate-pulse text-teal-600" />
                <span className="text-gray-700">Filtrage des sections...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">Filtrage terminé</span>
              </>
            )}
          </div>
          <span className="font-medium text-gray-900">
            {currentIndex} / {sections.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700">Gardées</div>
              <div className="mt-1 text-2xl font-bold text-green-900">
                {keptCount}
              </div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-700">Rejetées</div>
              <div className="mt-1 text-2xl font-bold text-red-900">
                {rejectedCount}
              </div>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Current Section Being Evaluated */}
      {isFiltering && currentIndex < sections.length && (
        <Card className="border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Évaluation en cours:
            </span>
          </div>
          <div className="rounded bg-white p-3">
            <div className="font-medium text-gray-900">
              {sections[currentIndex].title}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Score: {Math.round(sections[currentIndex].relevanceScore * 100)}%
            </div>
          </div>
        </Card>
      )}

      {/* Decisions List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">
          Décisions de filtrage
        </h3>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
          {decisions.map((decision, index) => (
            <FilterDecisionCard
              key={decision.section.id}
              decision={decision}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface FilterDecisionCardProps {
  decision: FilterDecision;
  index: number;
}

function FilterDecisionCard({ decision, index }: FilterDecisionCardProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Card
      className={cn(
        "transform transition-all duration-500",
        show ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
        decision.kept
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {decision.kept ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-gray-900">
              {decision.section.title}
            </h4>
            <div
              className={cn(
                "flex items-center gap-1 flex-shrink-0",
                decision.kept ? "text-green-600" : "text-red-600"
              )}
            >
              {decision.kept ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {Math.round(decision.section.relevanceScore * 100)}%
              </span>
            </div>
          </div>

          <div
            className={cn(
              "mt-1 text-xs font-medium",
              decision.kept ? "text-green-700" : "text-red-700"
            )}
          >
            {decision.kept ? "✓ Gardée" : "✗ Rejetée"}
          </div>

          <div className="mt-1 text-xs text-gray-600">{decision.reason}</div>

          <div className="mt-2 text-sm text-gray-600 line-clamp-1">
            {decision.section.preview}
          </div>
        </div>
      </div>
    </Card>
  );
}
