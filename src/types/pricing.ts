/**
 * Types partagés pour le module Pricing Intelligence
 */

// Status d'un scan
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Niveau d'alerte
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

// Type de matching
export type MatchType = 'exact_sku' | 'name_similarity' | 'characteristic_match' | 'manual';

// Statistiques dashboard
export interface PricingStats {
  products: {
    total: number;
    tracked: number;
    matched: number;
    coverage: number; // Pourcentage 0-1
  };
  pricing: {
    avgGap: number; // Pourcentage (peut être négatif)
    competitiveAdvantage: number; // Pourcentage
    trend7d: number; // Variation 7 derniers jours
  };
  competitors: {
    active: number;
    total: number;
  };
  alerts: {
    last7d: number;
    trend: number;
    critical: number;
  };
}

// Point de données historique
export interface PriceHistoryPoint {
  date: string; // ISO 8601
  yourPrice?: number;
  competitorPrices: Record<string, number>; // { 'swish': 3.85, 'grainger': 3.95 }
}

// Configuration d'une règle d'alerte
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    type: 'price_drop' | 'price_increase' | 'gap_threshold' | 'new_competitor';
    threshold?: number;
    competitors?: string[]; // IDs des concurrents
    categories?: string[];
  }[];
  actions: {
    type: 'email' | 'slack' | 'webhook';
    config: Record<string, any>;
  }[];
}

// Résultat de matching produit
export interface ProductMatch {
  productId: string;
  competitorId: string;
  competitorProductName: string;
  competitorPrice: number;
  confidence: number; // 0-1
  matchType: MatchType;
  characteristics?: {
    types?: string[];
    materials?: string[];
    sizes?: string[];
    features?: string[];
  };
}
