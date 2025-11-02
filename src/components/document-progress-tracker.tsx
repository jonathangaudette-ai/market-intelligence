"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

interface ProcessingStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: number;
  details?: string;
}

interface DocumentProgressTrackerProps {
  slug: string;
  documentId: string;
  documentName: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function DocumentProgressTracker({
  slug,
  documentId,
  documentName,
  onComplete,
  onError,
}: DocumentProgressTrackerProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [status, setStatus] = useState<string>("processing");
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!isPolling) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(
          `/api/companies/${slug}/documents/${documentId}/progress`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch progress");
        }

        const data = await response.json();
        setSteps(data.steps || []);
        setStatus(data.status);

        // Stop polling if completed or failed
        if (data.status === "completed") {
          setIsPolling(false);
          onComplete?.();
        } else if (data.status === "failed") {
          setIsPolling(false);
          onError?.(data.errorMessage || "Processing failed");
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    // Poll immediately
    pollProgress();

    // Then poll every 2 seconds
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [slug, documentId, isPolling, onComplete, onError]);

  // Calculate progress percentage
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          Traitement en cours: {documentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                step.status === "in_progress"
                  ? "bg-blue-50"
                  : step.status === "completed"
                  ? "bg-green-50"
                  : step.status === "failed"
                  ? "bg-red-50"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{getStepIcon(step.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{step.step}</p>
                {step.details && (
                  <p className="text-xs text-gray-600 mt-0.5">{step.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {status === "completed" && (
          <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              Document analysé avec succès!
            </span>
          </div>
        )}

        {status === "failed" && (
          <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Échec du traitement du document
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
