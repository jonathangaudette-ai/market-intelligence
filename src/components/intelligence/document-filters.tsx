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
    label: "Informations Entreprise",
    description: "Profil, valeurs, histoire, équipe",
    icon: Building2,
    emoji: "🏢",
  },
  {
    id: "knowledge_base",
    label: "Base de Connaissances",
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
    label: "Historique RFP (tous)",
    description: "Toutes les réponses RFP passées",
    icon: FileText,
    emoji: "📋",
  },
  {
    id: "competitive",
    label: "Intelligence Concurrentielle",
    description: "Recherche et analyse concurrents",
    icon: Target,
    emoji: "🎯",
  },
  {
    id: "product",
    label: "Documentation Produits",
    description: "Spécifications techniques, features",
    icon: Package,
    emoji: "🔧",
  },
];

const DEFAULT_FILTERS: DocumentFilterId[] = ["company_info", "knowledge_base"];

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
      <CardContent className="p-4">
        <div className="space-y-4">
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

          {/* Filter Checkboxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedFilters.includes(option.id);

              return (
                <button
                  key={option.id}
                  onClick={() => handleToggle(option.id)}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left
                    ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div
                    className={`
                      mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                      ${
                        isSelected
                          ? "bg-teal-600 border-teal-600"
                          : "bg-white border-gray-300"
                      }
                    `}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{option.emoji}</span>
                      <h4
                        className={`text-sm font-medium ${
                          isSelected ? "text-teal-900" : "text-gray-900"
                        }`}
                      >
                        {option.label}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning if no filters selected */}
          {activeCount === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
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
