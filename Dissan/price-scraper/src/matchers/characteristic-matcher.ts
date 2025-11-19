/**
 * Characteristic Matcher - Matches products based on characteristics instead of exact names
 *
 * This matcher extracts product characteristics (type, material, size, features) and
 * matches products based on similarity of these attributes rather than exact SKU/name matching.
 *
 * Use case: Finding equivalent products from different brands
 * Example: ATL bowl brush → matches Rubbermaid bowl brush with similar characteristics
 */

import { compareTwoStrings } from 'string-similarity';

/**
 * Product characteristics extracted from name/description
 */
export interface ProductCharacteristics {
  /** Product type (e.g., "bowl brush", "mop", "plunger") */
  type: string[];

  /** Material (e.g., "polypropylene", "metal", "wood") */
  materials: string[];

  /** Size/dimensions (e.g., "60\"", "8\"", "24oz") */
  sizes: string[];

  /** Features (e.g., "telescopic", "flexible", "acid-resistant") */
  features: string[];

  /** Colors */
  colors: string[];

  /** Original name for reference */
  originalName: string;
}

/**
 * Matching result with confidence score
 */
export interface CharacteristicMatchResult {
  /** Confidence score 0-1 */
  confidence: number;

  /** Matching characteristics */
  matchedTypes: string[];
  matchedMaterials: string[];
  matchedSizes: string[];
  matchedFeatures: string[];

  /** Details for debugging */
  details: {
    typeScore: number;
    materialScore: number;
    sizeScore: number;
    featureScore: number;
  };
}

/**
 * Product type keywords (most important for matching)
 */
const PRODUCT_TYPES = [
  'bowl brush', 'toilet brush',
  'mop', 'dust mop', 'wall mop',
  'plunger', 'toilet plunger',
  'brush', 'scrub brush', 'vehicle brush',
  'handle', 'telescopic handle',
  'duster', 'flexible duster', 'lambswool duster',
  'squeegee',
  'frame',
  'caddy',
  'bottle', 'spray bottle', 'trigger sprayer',
  'cap', 'lid', 'top',
  'receptacle', 'smoking receptacle',
  'tool', 'wash tool',
  'sprayer',
  'container', 'jug',
];

/**
 * Material keywords
 */
const MATERIALS = [
  'polypropylene', 'polyester',
  'metal', 'aluminium', 'aluminum', 'stainless steel',
  'wood', 'wooden',
  'plastic',
  'fibre', 'fiber', 'union fibre',
  'cotton',
  'lambswool',
  'acid-resistant',
  'chemical resistant',
];

/**
 * Feature keywords
 */
const FEATURES = [
  'telescopic', 'flexible', 'breakaway',
  'wall mount', 'surface mount',
  'heavy duty', 'commercial',
  'threaded',
  'graduated',
  'turks head',
  'rectangular',
  'wall hugger',
  'infinity',
  'kwik',
  'wooly wonder',
  'hydro thrust',
];

/**
 * Color keywords
 */
const COLORS = [
  'black', 'white', 'grey', 'gray', 'red', 'blue', 'green', 'yellow',
  'stainless', 'light gray',
];

/**
 * Size/dimension patterns
 */
const SIZE_PATTERNS = [
  /(\d+)\s*(?:inch|in|''|")/gi,           // 60", 8 inch
  /(\d+)\s*(?:oz|ml|l)\b/gi,              // 24oz, 946 mL
  /(\d+)\s*(?:cm|mm)\b/gi,                // 60cm
  /(\d+(?:\.\d+)?)\s*(?:ml|mL)\b/gi,      // 3.4mL
  /(\d+)\s*(?:ft|')/gi,                   // 30'-44'
];

/**
 * Normalize text for matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract product characteristics from name
 */
export function extractCharacteristics(productName: string): ProductCharacteristics {
  const normalized = normalize(productName);

  // Extract types (prioritize longer matches first)
  const types: string[] = [];
  const sortedTypes = [...PRODUCT_TYPES].sort((a, b) => b.length - a.length);
  for (const type of sortedTypes) {
    if (normalized.includes(type)) {
      types.push(type);
    }
  }

  // Extract materials
  const materials: string[] = [];
  for (const material of MATERIALS) {
    if (normalized.includes(material)) {
      materials.push(material);
    }
  }

  // Extract features
  const features: string[] = [];
  for (const feature of FEATURES) {
    if (normalized.includes(feature)) {
      features.push(feature);
    }
  }

  // Extract colors
  const colors: string[] = [];
  for (const color of COLORS) {
    if (normalized.includes(color)) {
      colors.push(color);
    }
  }

  // Extract sizes/dimensions
  const sizes: string[] = [];
  for (const pattern of SIZE_PATTERNS) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      sizes.push(match[0]);
    }
  }

  return {
    type: types,
    materials,
    sizes,
    features,
    colors,
    originalName: productName,
  };
}

/**
 * Calculate Jaccard similarity between two arrays
 */
function jaccardSimilarity(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map(normalize));
  const set2 = new Set(arr2.map(normalize));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate fuzzy match score for arrays (allows partial matches)
 */
function fuzzyArrayMatch(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1;
  if (arr1.length === 0 || arr2.length === 0) return 0;

  let totalScore = 0;
  let matchCount = 0;

  for (const item1 of arr1) {
    for (const item2 of arr2) {
      const similarity = compareTwoStrings(normalize(item1), normalize(item2));
      if (similarity > 0.7) { // 70% similarity threshold
        totalScore += similarity;
        matchCount++;
      }
    }
  }

  const maxPossible = Math.max(arr1.length, arr2.length);
  return matchCount > 0 ? totalScore / maxPossible : 0;
}

/**
 * Match two products based on their characteristics
 */
export function matchCharacteristics(
  char1: ProductCharacteristics,
  char2: ProductCharacteristics
): CharacteristicMatchResult {

  // Type matching (weight: 40%) - most important
  const typeScore = fuzzyArrayMatch(char1.type, char2.type);

  // Material matching (weight: 25%)
  const materialScore = jaccardSimilarity(char1.materials, char2.materials);

  // Size matching (weight: 20%)
  const sizeScore = jaccardSimilarity(char1.sizes, char2.sizes);

  // Feature matching (weight: 15%)
  const featureScore = jaccardSimilarity(char1.features, char2.features);

  // Weighted confidence score
  const confidence =
    typeScore * 0.40 +
    materialScore * 0.25 +
    sizeScore * 0.20 +
    featureScore * 0.15;

  // Find matched characteristics
  const matchedTypes = char1.type.filter(t1 =>
    char2.type.some(t2 => compareTwoStrings(normalize(t1), normalize(t2)) > 0.7)
  );

  const matchedMaterials = char1.materials.filter(m => char2.materials.includes(m));
  const matchedSizes = char1.sizes.filter(s => char2.sizes.includes(s));
  const matchedFeatures = char1.features.filter(f => char2.features.includes(f));

  return {
    confidence,
    matchedTypes,
    matchedMaterials,
    matchedSizes,
    matchedFeatures,
    details: {
      typeScore,
      materialScore,
      sizeScore,
      featureScore,
    },
  };
}

/**
 * Find best characteristic match from a list of product names
 */
export function findBestCharacteristicMatch(
  searchProduct: string,
  candidateProducts: string[],
  minConfidence: number = 0.5
): { name: string; confidence: number; matchResult: CharacteristicMatchResult } | null {

  if (candidateProducts.length === 0) {
    return null;
  }

  const searchChar = extractCharacteristics(searchProduct);

  const matches = candidateProducts.map(candidateName => {
    const candidateChar = extractCharacteristics(candidateName);
    const matchResult = matchCharacteristics(searchChar, candidateChar);

    return {
      name: candidateName,
      confidence: matchResult.confidence,
      matchResult,
    };
  }).sort((a, b) => b.confidence - a.confidence);

  const bestMatch = matches[0];

  // Only return if confidence exceeds minimum threshold
  if (bestMatch.confidence >= minConfidence) {
    return bestMatch;
  }

  return null;
}

/**
 * Debug: Print characteristics extraction
 */
export function debugCharacteristics(productName: string): void {
  const char = extractCharacteristics(productName);
  console.log(`\n📊 Characteristics for: "${productName}"`);
  console.log(`  Types: ${char.type.join(', ') || 'none'}`);
  console.log(`  Materials: ${char.materials.join(', ') || 'none'}`);
  console.log(`  Sizes: ${char.sizes.join(', ') || 'none'}`);
  console.log(`  Features: ${char.features.join(', ') || 'none'}`);
  console.log(`  Colors: ${char.colors.join(', ') || 'none'}`);
}
