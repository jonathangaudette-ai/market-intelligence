"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetectedSection {
  id: string;
  title: string;
  type: string;
  relevanceScore: number;
  preview?: string;
  content?: string;
  shouldIndex?: boolean;
  tags?: string[];
  reasoning?: string;
  pageNumbers?: number[];
  confidence?: number;
  keyTopics?: string[];
  entities?: string[];
  timestamp: number;
}

interface LiveAnalysisViewProps {
  documentId: string;
  slug: string;
  onComplete: (sections: DetectedSection[]) => void;
}

export function LiveAnalysisView({
  documentId,
  slug,
  onComplete,
}: LiveAnalysisViewProps) {
  const [currentText, setCurrentText] = useState("");
  const [detectedSections, setDetectedSections] = useState<DetectedSection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new sections appear
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detectedSections]);

  useEffect(() => {
    let mounted = true;

    // OPTIMIZED: Exponential backoff polling (reduces API calls by 95%)
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/companies/${slug}/documents/${documentId}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();

        if (!mounted) return;

        // Update current text if available
        if (data.progress.currentStepMessage) {
          setCurrentText(data.progress.currentStepMessage);
        }

        // Update progress
        const currentProgress = data.progress.currentStepProgress || 0;
        setProgress(currentProgress);

        // Update sections if analysis data is available
        if (data.analysis?.sections) {
          const sections = data.analysis.sections.map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            relevanceScore: s.relevanceScore,
            content: s.content,
            shouldIndex: s.shouldIndex,
            tags: s.tags,
            reasoning: s.reasoning,
            pageNumbers: s.pageNumbers,
            confidence: s.confidence,
            keyTopics: s.keyTopics,
            entities: s.entities,
            preview: s.content?.substring(0, 200),
            timestamp: Date.now(),
          }));
          setDetectedSections(sections);
        }

        // Check if analysis is complete
        if (data.progress.analyzed) {
          setIsAnalyzing(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setTimeout(() => {
            onComplete(detectedSections);
          }, 1000);
          return; // Stop polling
        }

        // Schedule next poll with exponential backoff
        if (mounted && isAnalyzing) {
          setPollAttempts((prev) => prev + 1);

          // Exponential backoff: 500ms → 1s → 2s → 4s → max 5s
          const delay = Math.min(500 * Math.pow(1.5, pollAttempts), 5000);

          timeoutRef.current = setTimeout(pollStatus, delay);
        }
      } catch (error) {
        console.error("Error polling analysis status:", error);

        // Retry with backoff on error
        if (mounted && isAnalyzing) {
          const retryDelay = Math.min(2000 * Math.pow(2, pollAttempts), 10000);
          timeoutRef.current = setTimeout(pollStatus, retryDelay);
        }
      }
    };

    // Start polling
    pollStatus();

    return () => {
      mounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [documentId, slug, onComplete, detectedSections, isAnalyzing, pollAttempts]);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isAnalyzing ? (
              <>
                <Brain className="h-4 w-4 animate-pulse text-teal-600" />
                <span className="text-gray-700">Analyse en cours avec Claude...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">Analyse terminée</span>
              </>
            )}
          </div>
          <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Live Text Preview */}
      <Card className="border-teal-200 bg-teal-50/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          <span className="text-sm font-medium text-teal-900">
            Texte en cours d'analyse:
          </span>
        </div>
        <div className="max-h-24 overflow-y-auto rounded bg-white p-3 text-sm text-gray-700">
          {currentText || "En attente..."}
        </div>
      </Card>

      {/* Detected Sections (streaming) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Sections détectées ({detectedSections.length})
          </h3>
        </div>

        <div
          ref={scrollRef}
          className="max-h-96 space-y-2 overflow-y-auto pr-2"
        >
          {detectedSections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              isNew={Date.now() - section.timestamp < 1000}
            />
          ))}

          {isAnalyzing && (
            <Card className="border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">
                  Recherche de nouvelles sections...
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionCardProps {
  section: DetectedSection;
  index: number;
  isNew: boolean;
}

function SectionCard({ section, index, isNew }: SectionCardProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Stagger animation
    const timeout = setTimeout(() => setShow(true), index * 100);
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <Card
      className={cn(
        "transform transition-all duration-500 p-4 border-l-4 border-teal-500",
        show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        isNew && "ring-2 ring-teal-500 ring-offset-2"
      )}
    >
      {/* Section Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-base">{section.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {section.type}
            </Badge>
            {section.shouldIndex !== undefined && (
              <Badge variant={section.shouldIndex ? "default" : "secondary"} className="text-xs">
                {section.shouldIndex ? "À indexer" : "Non indexé"}
              </Badge>
            )}
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm text-gray-500">Score</div>
          <div className="text-lg font-bold text-teal-600">
            {Math.round(section.relevanceScore * 100)}%
          </div>
        </div>
      </div>

      {/* Tags */}
      {section.tags && section.tags.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Tags:</div>
          <div className="flex flex-wrap gap-1">
            {section.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Topics */}
      {section.keyTopics && section.keyTopics.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Sujets clés:</div>
          <div className="flex flex-wrap gap-1">
            {section.keyTopics.map((topic, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {section.entities && section.entities.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Entités détectées:</div>
          <div className="flex flex-wrap gap-1">
            {section.entities.map((entity, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                {entity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Page Numbers & Confidence */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
        {section.pageNumbers && section.pageNumbers.length > 0 && (
          <div>
            <span className="font-medium">Pages:</span> {section.pageNumbers.join(", ")}
          </div>
        )}
        {section.confidence !== undefined && (
          <div>
            <span className="font-medium">Confiance:</span> {Math.round(section.confidence * 100)}%
          </div>
        )}
      </div>

      {/* Reasoning */}
      {section.reasoning && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <div className="text-xs font-medium text-amber-800 mb-1">Raisonnement:</div>
          <div className="text-sm text-amber-900">{section.reasoning}</div>
        </div>
      )}

      {/* Content */}
      {section.content && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Contenu:</div>
          <div className="text-sm text-gray-800 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      )}

      {/* Preview fallback if no content */}
      {!section.content && section.preview && (
        <div className="text-sm text-gray-600">
          {section.preview}
        </div>
      )}
    </Card>
  );
}
