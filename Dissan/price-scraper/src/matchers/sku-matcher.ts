/**
 * SKU Matcher - Fonctions pour matcher les produits par SKU
 */

/**
 * Normalize SKU for comparison
 * - Remove spaces, dashes, underscores
 * - Convert to uppercase
 * - Remove special characters
 */
export function normalizeSku(sku: string): string {
  return sku
    .toUpperCase()
    .replace(/[\s\-_]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Check if two SKUs match (exact or normalized)
 */
export function skusMatch(sku1: string, sku2: string): boolean {
  // Exact match
  if (sku1 === sku2) {
    return true;
  }

  // Normalized match
  const normalized1 = normalizeSku(sku1);
  const normalized2 = normalizeSku(sku2);

  return normalized1 === normalized2;
}

/**
 * Extract SKU from text using common patterns
 */
export function extractSkuFromText(text: string): string | null {
  if (!text) return null;

  // Common SKU patterns
  const patterns = [
    /SKU[\s:]+([A-Z0-9\-_]+)/i,
    /Item[\s#:]+([A-Z0-9\-_]+)/i,
    /Model[\s#:]+([A-Z0-9\-_]+)/i,
    /Product[\s#:]+([A-Z0-9\-_]+)/i,
    /Part[\s#:]+([A-Z0-9\-_]+)/i,
    /Code[\s:]+([A-Z0-9\-_]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Generate SKU variations (common formats)
 */
export function generateSkuVariations(sku: string): string[] {
  const variations: string[] = [sku];

  // Add variation without dashes
  if (sku.includes('-')) {
    variations.push(sku.replace(/-/g, ''));
  }

  // Add variation without underscores
  if (sku.includes('_')) {
    variations.push(sku.replace(/_/g, ''));
  }

  // Add variation with dashes replaced by underscores
  if (sku.includes('-')) {
    variations.push(sku.replace(/-/g, '_'));
  }

  // Add variation with underscores replaced by dashes
  if (sku.includes('_')) {
    variations.push(sku.replace(/_/g, '-'));
  }

  // Add variation with spaces removed
  if (sku.includes(' ')) {
    variations.push(sku.replace(/\s/g, ''));
  }

  // Add uppercase version
  variations.push(sku.toUpperCase());

  // Remove duplicates
  return [...new Set(variations)];
}

/**
 * Check if SKU is valid (basic validation)
 */
export function isValidSku(sku: string): boolean {
  if (!sku || sku.trim().length === 0) {
    return false;
  }

  // SKU should have at least 2 characters
  if (sku.trim().length < 2) {
    return false;
  }

  // SKU should contain at least one alphanumeric character
  if (!/[A-Z0-9]/i.test(sku)) {
    return false;
  }

  return true;
}
