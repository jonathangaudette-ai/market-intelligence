/**
 * Name Matcher - Fonctions pour matcher les produits par nom et marque
 */

import { compareTwoStrings } from 'string-similarity';
import { SCRAPING_CONFIG } from '../config';

/**
 * Normalize product name for comparison
 * - Convert to lowercase
 * - Remove special characters (®, ™, ©)
 * - Normalize whitespace
 * - Remove common filler words
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity score between two product names (0-1)
 * Uses Levenshtein distance algorithm via string-similarity
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  return compareTwoStrings(normalized1, normalized2);
}

/**
 * Check if two names match based on similarity threshold
 */
export function namesMatch(
  name1: string,
  name2: string,
  threshold: number = SCRAPING_CONFIG.nameSimilarityThreshold
): boolean {
  const similarity = calculateNameSimilarity(name1, name2);
  return similarity >= threshold;
}

/**
 * Extract brand from product name
 */
export function extractBrandFromName(name: string, knownBrands: string[]): string | null {
  const normalizedName = normalizeName(name);

  for (const brand of knownBrands) {
    const normalizedBrand = normalizeName(brand);
    if (normalizedName.includes(normalizedBrand)) {
      return brand;
    }
  }

  return null;
}

/**
 * Check if brand matches in product name
 */
export function brandMatchesInName(productName: string, brand: string): boolean {
  const normalizedName = normalizeName(productName);
  const normalizedBrand = normalizeName(brand);

  return normalizedName.includes(normalizedBrand);
}

/**
 * Generate search query from name and brand
 */
export function generateSearchQuery(name: string, brand: string): string {
  // If brand is already in the name, just return the name
  if (brandMatchesInName(name, brand)) {
    return normalizeName(name);
  }

  // Otherwise, combine brand + name
  return normalizeName(`${brand} ${name}`);
}

/**
 * Extract key features from product name
 * Useful for matching products with different naming conventions
 */
export function extractKeyFeatures(name: string): string[] {
  const normalized = normalizeName(name);
  const words = normalized.split(' ');

  // Filter out common filler words
  const fillerWords = [
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ];

  return words.filter(
    (word) =>
      word.length > 2 && !fillerWords.includes(word)
  );
}

/**
 * Calculate feature overlap between two product names
 * Returns a score between 0-1 based on common features
 */
export function calculateFeatureOverlap(name1: string, name2: string): number {
  const features1 = extractKeyFeatures(name1);
  const features2 = extractKeyFeatures(name2);

  if (features1.length === 0 || features2.length === 0) {
    return 0;
  }

  const commonFeatures = features1.filter((feature) =>
    features2.includes(feature)
  );

  const maxFeatures = Math.max(features1.length, features2.length);

  return commonFeatures.length / maxFeatures;
}

/**
 * Advanced name matching using multiple strategies
 * Returns confidence score (0-1)
 */
export function advancedNameMatch(
  searchName: string,
  foundName: string,
  brand: string
): number {
  // Strategy 1: Direct similarity (weight: 50%)
  const directSimilarity = calculateNameSimilarity(searchName, foundName);

  // Strategy 2: Feature overlap (weight: 30%)
  const featureOverlap = calculateFeatureOverlap(searchName, foundName);

  // Strategy 3: Brand presence (weight: 20%)
  const brandPresent = brandMatchesInName(foundName, brand) ? 1 : 0;

  // Weighted average
  const confidence =
    directSimilarity * 0.5 + featureOverlap * 0.3 + brandPresent * 0.2;

  return confidence;
}

/**
 * Filter product results by name similarity
 */
export function filterByNameSimilarity(
  searchName: string,
  productNames: string[],
  threshold: number = SCRAPING_CONFIG.nameSimilarityThreshold
): Array<{ name: string; similarity: number }> {
  const results = productNames
    .map((name) => ({
      name,
      similarity: calculateNameSimilarity(searchName, name),
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Find best matching product name from a list
 */
export function findBestMatch(
  searchName: string,
  productNames: string[],
  brand: string
): { name: string; confidence: number } | null {
  if (productNames.length === 0) {
    return null;
  }

  const matches = productNames
    .map((name) => ({
      name,
      confidence: advancedNameMatch(searchName, name, brand),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const bestMatch = matches[0];

  // Only return if confidence is above threshold
  if (bestMatch.confidence >= SCRAPING_CONFIG.nameSimilarityThreshold) {
    return bestMatch;
  }

  return null;
}
