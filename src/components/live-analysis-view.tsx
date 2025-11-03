"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetectedSection {
  id: string;
  title: string;
  type: string;
  relevanceScore: number;
  preview: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new sections appear
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detectedSections]);

  useEffect(() => {
    // Simulate streaming analysis
    // TODO: Replace with actual EventSource streaming from API
    let sectionIndex = 0;
    const mockSections = [
      {
        id: "sec-1",
        title: "I. Synthèse Analytique",
        type: "analysis",
        relevanceScore: 0.95,
        preview: "First Databank (FDB) s'est imposé comme le leader incontesté...",
      },
      {
        id: "sec-2",
        title: "II. Positionnement Stratégique",
        type: "strategy",
        relevanceScore: 0.92,
        preview: "L'entreprise occupe une position dominante grâce à...",
      },
      {
        id: "sec-3",
        title: "III. Analyse Concurrentielle",
        type: "competitive",
        relevanceScore: 0.88,
        preview: "Face à Wolters Kluwer et Elsevier, FDB maintient...",
      },
    ];

    const interval = setInterval(() => {
      if (sectionIndex < mockSections.length) {
        const section = mockSections[sectionIndex];
        setDetectedSections((prev) => [
          ...prev,
          { ...section, timestamp: Date.now() },
        ]);
        setProgress(((sectionIndex + 1) / mockSections.length) * 100);
        setCurrentText(section.preview);
        sectionIndex++;
      } else {
        setIsAnalyzing(false);
        clearInterval(interval);
        setTimeout(() => {
          onComplete(detectedSections);
        }, 1000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documentId, slug]);

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
        "transform transition-all duration-500",
        show ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        isNew && "ring-2 ring-teal-500 ring-offset-2"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              section.relevanceScore >= 0.9
                ? "bg-green-100 text-green-700"
                : section.relevanceScore >= 0.75
                ? "bg-teal-100 text-teal-700"
                : "bg-yellow-100 text-yellow-700"
            )}
          >
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-gray-900">{section.title}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="text-sm font-medium text-teal-600">
                {Math.round(section.relevanceScore * 100)}%
              </span>
            </div>
          </div>

          <div className="mt-1 text-xs text-gray-500">
            Type: <span className="font-medium">{section.type}</span>
          </div>

          <div className="mt-2 text-sm text-gray-600 line-clamp-2">
            {section.preview}
          </div>
        </div>
      </div>
    </Card>
  );
}
