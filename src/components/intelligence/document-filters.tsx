"use client";

/**
 * Document Filters Component
 * Filtres hiérarchiques pour la page Intelligence/Chat
 *
 * Permet de sélectionner les sources de documents à interroger:
 * - Informations Entreprise
 * - Base de Connaissances
 * - RFPs Gagnés
 * - Historique RFP
 * - Intelligence Concurrentielle
 * - Documentation Produits
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  BookOpen,
  Trophy,
  FileText,
  Target,
  Package,
  Filter,
  RotateCcw
} from "lucide-react";

export type DocumentFilterId =
  | "company_info"
  | "knowledge_base"
  | "rfp_won"
  | "rfp_all"
  | "competitive"
  | "product";

interface FilterOption {
  id: DocumentFilterId;
  label: string;
  description: string;
  icon: typeof Building2;
  emoji: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: "company_info",
    label: "Infos Entreprise",
    description: "Profil, valeurs, histoire, équipe",
    icon: Building2,
    emoji: "🏢",
  },
  {
    id: "knowledge_base",
    label: "Connaissances",
    description: "Méthodologies, guides, best practices",
    icon: BookOpen,
    emoji: "📚",
  },
  {
    id: "rfp_won",
    label: "RFPs Gagnés",
    description: "Réponses RFP qui ont remporté le contrat",
    icon: Trophy,
    emoji: "🏆",
  },
  {
    id: "rfp_all",
    label: "Historique RFP",
    description: "Toutes les réponses RFP passées",
    icon: FileText,
    emoji: "📋",
  },
  {
    id: "competitive",
    label: "Intelligence",
    description: "Recherche et analyse concurrents",
    icon: Target,
    emoji: "🎯",
  },
  {
    id: "product",
    label: "Produits",
    description: "Spécifications techniques, features",
    icon: Package,
    emoji: "🔧",
  },
];

const DEFAULT_FILTERS: DocumentFilterId[] = [
  "company_info",
  "knowledge_base",
  "rfp_won",
  "rfp_all",
  "competitive",
  "product",
];

interface DocumentFiltersProps {
  selectedFilters: DocumentFilterId[];
  onChange: (filters: DocumentFilterId[]) => void;
}

export function DocumentFilters({ selectedFilters, onChange }: DocumentFiltersProps) {
  const handleToggle = (filterId: DocumentFilterId) => {
    if (selectedFilters.includes(filterId)) {
      // Remove filter
      onChange(selectedFilters.filter((id) => id !== filterId));
    } else {
      // Add filter
      onChange([...selectedFilters, filterId]);
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_FILTERS);
  };

  const activeCount = selectedFilters.length;

  return (
    <Card className="border-2 border-gray-200">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-gray-900">Sources de recherche</h3>
              <Badge variant="secondary" className="text-xs">
                {activeCount} {activeCount === 1 ? "source" : "sources"}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          </div>

          {/* Filter Pills/Tags - Compact Design */}
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isSelected = selectedFilters.includes(option.id);

                return (
                  <Tooltip key={option.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleToggle(option.id)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          border-2 transition-all cursor-pointer
                          ${
                            isSelected
                              ? "bg-teal-50 border-teal-500 text-teal-900 hover:bg-teal-100"
                              : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                          }
                        `}
                      >
                        <span className="text-sm">{option.emoji}</span>
                        <span>{option.label}</span>
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-teal-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{option.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Warning if no filters selected */}
          {activeCount === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-xs text-amber-800">
                ⚠️ Aucune source sélectionnée. Sélectionnez au moins une catégorie pour
                interroger vos documents.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
