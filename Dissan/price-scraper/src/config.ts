/**
 * Configuration globale pour le Price Scraper
 */

import fs from 'fs';
import path from 'path';
import type {
  CompetitorsConfigFile,
  CompetitorConfig,
  GlobalSettings,
} from './types';

// ============================================================================
// Paths Configuration
// ============================================================================

export const PATHS = {
  root: path.resolve(__dirname, '../..'),
  competitorsConfig: path.resolve(__dirname, '../../competitors-config.json'),
  productsFile: path.resolve(__dirname, '../../produits-commerciaux.xlsx'),
  resultsDir: path.resolve(__dirname, '../../results'),
  resultsBySite: path.resolve(__dirname, '../../results/prix-par-site'),
  resultsConsolidated: path.resolve(__dirname, '../../results/prix-consolides'),
  checkpointsDir: path.resolve(__dirname, '../data/checkpoints'),
  logsDir: path.resolve(__dirname, '../data/logs'),
};

// ============================================================================
// Load Competitors Configuration
// ============================================================================

let competitorsConfig: CompetitorsConfigFile | null = null;

export function loadCompetitorsConfig(): CompetitorsConfigFile {
  if (competitorsConfig) {
    return competitorsConfig;
  }

  try {
    const configContent = fs.readFileSync(PATHS.competitorsConfig, 'utf-8');
    competitorsConfig = JSON.parse(configContent) as CompetitorsConfigFile;
    return competitorsConfig;
  } catch (error) {
    throw new Error(
      `Failed to load competitors config from ${PATHS.competitorsConfig}: ${error}`
    );
  }
}

export function getCompetitorConfig(competitorId: string): CompetitorConfig {
  const config = loadCompetitorsConfig();
  const competitor = config.competitors.find((c) => c.id === competitorId);

  if (!competitor) {
    throw new Error(`Competitor "${competitorId}" not found in config`);
  }

  return competitor;
}

export function getCompetitorsByPriority(priority: number): CompetitorConfig[] {
  const config = loadCompetitorsConfig();
  return config.competitors.filter(
    (c) => c.priority === priority && c.enabled
  );
}

export function getAllCompetitors(): CompetitorConfig[] {
  const config = loadCompetitorsConfig();
  return config.competitors.filter((c) => c.enabled);
}

export function getGlobalSettings(): GlobalSettings {
  const config = loadCompetitorsConfig();
  return config.globalSettings;
}

// ============================================================================
// Scraping Configuration
// ============================================================================

export const SCRAPING_CONFIG = {
  // Retry configuration
  maxRetries: 3,
  retryDelays: [2000, 4000, 8000], // Exponential backoff (ms)

  // Timeouts
  navigationTimeout: 30000, // 30 seconds
  elementTimeout: 10000, // 10 seconds
  pageLoadTimeout: 30000, // 30 seconds

  // Rate limiting defaults
  defaultRequestDelay: 2000, // 2 seconds between requests
  defaultProductDelay: 1000, // 1 second between products

  // Checkpoints
  checkpointInterval: 50, // Save every 50 products

  // Matching thresholds
  nameSimilarityThreshold: 0.8, // 80% similarity for name matching

  // Playwright configuration
  headless: true,
  slowMo: 0, // No artificial slowdown (rate limiter handles this)
  devtools: false,
};

// ============================================================================
// User Agents
// ============================================================================

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ============================================================================
// Logging Configuration
// ============================================================================

export const LOGGING_CONFIG = {
  console: {
    enabled: true,
    level: 'info' as const, // 'debug' | 'info' | 'warn' | 'error'
  },
  file: {
    enabled: true,
    level: 'debug' as const,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  },
  errorFile: {
    enabled: true,
    level: 'error' as const,
  },
};

// ============================================================================
// Excel Export Configuration
// ============================================================================

export const EXCEL_CONFIG = {
  // File names
  consolidatedPricesFile: 'prix-competiteurs-final.xlsx',
  analysisReportFile: 'rapport-prix-competiteurs.xlsx',

  // Formatting
  headerColor: 'FF0066CC', // Blue
  headerFontColor: 'FFFFFFFF', // White
  priceFormat: '$#,##0.00',
  percentFormat: '0.0%',

  // Options
  autoFilter: true,
  freezePanes: true,
  columnWidths: {
    sku: 25,
    name: 50,
    brand: 20,
    category: 30,
    price: 12,
    url: 50,
    stats: 15,
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

export function validatePaths(): void {
  const requiredDirs = [
    PATHS.resultsDir,
    PATHS.resultsBySite,
    PATHS.resultsConsolidated,
    PATHS.checkpointsDir,
    PATHS.logsDir,
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  if (!fs.existsSync(PATHS.competitorsConfig)) {
    throw new Error(
      `Competitors config file not found: ${PATHS.competitorsConfig}`
    );
  }

  if (!fs.existsSync(PATHS.productsFile)) {
    throw new Error(`Products file not found: ${PATHS.productsFile}`);
  }
}

// ============================================================================
// Initialize on module load
// ============================================================================

// Ensure all required directories exist
validatePaths();
