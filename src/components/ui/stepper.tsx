"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export type StepStatus = "pending" | "in_progress" | "completed" | "failed";

interface StepperProps {
  steps: Step[];
  currentStep: number;
  stepStatuses: Record<string, StepStatus>;
  className?: string;
}

export function Stepper({ steps, currentStep, stepStatuses, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar container */}
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-gray-200">
          {/* Progress line */}
          <div
            className="h-full bg-teal-600 transition-all duration-500"
            style={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const status = stepStatuses[step.id] || "pending";
          const isActive = index === currentStep;
          const isPast = index < currentStep;

          return (
            <div
              key={step.id}
              className="relative flex flex-col items-center"
              style={{ zIndex: 10 }}
            >
              {/* Step circle */}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg border-2 bg-white transition-all duration-300",
                  {
                    "border-teal-600 bg-teal-600 text-white shadow-lg":
                      status === "completed" || isPast,
                    "border-teal-600 bg-teal-600 text-white animate-pulse":
                      isActive && status === "in_progress",
                    "border-gray-300 bg-white text-gray-400":
                      status === "pending" && !isPast,
                    "border-red-600 bg-red-50 text-red-600": status === "failed",
                  }
                )}
              >
                {status === "completed" || (isPast && status !== "failed") ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : status === "in_progress" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : status === "failed" ? (
                  <XCircle className="h-6 w-6" />
                ) : step.icon ? (
                  step.icon
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>

              {/* Step label */}
              <div
                className={cn(
                  "mt-2 text-center text-sm font-medium transition-colors",
                  {
                    "text-teal-600": isActive || status === "completed" || isPast,
                    "text-gray-400": status === "pending" && !isPast,
                    "text-red-600": status === "failed",
                  }
                )}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StepContentProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function StepContent({
  currentStep,
  totalSteps,
  title,
  description,
  children,
  icon,
}: StepContentProps) {
  return (
    <div className="mt-8">
      {/* Step header */}
      <div className="mb-6 flex items-start gap-4">
        {icon && (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-medium text-teal-600">
            Étape {currentStep + 1} sur {totalSteps}
          </div>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
