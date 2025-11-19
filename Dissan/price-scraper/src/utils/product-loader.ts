/**
 * Product Loader - Chargement des produits depuis le fichier Excel
 */

import ExcelJS from 'exceljs';
import type { Product } from '../types';
import { PATHS } from '../config';

/**
 * Load all commercial products from Excel file
 */
export async function loadProducts(): Promise<Product[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(PATHS.productsFile);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in products file');
  }

  const products: Product[] = [];

  // Skip header row (row 1)
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);

    const skuOriginal = row.getCell(1).value?.toString() || '';
    const skuCleaned = row.getCell(2).value?.toString() || '';
    const brand = row.getCell(3).value?.toString() || '';
    const name = row.getCell(4).value?.toString() || '';
    const nameCleaned = row.getCell(5).value?.toString() || '';
    const category = row.getCell(6).value?.toString() || '';
    const description = row.getCell(7).value?.toString() || '';
    const urlSource = row.getCell(8).value?.toString() || '';
    const stockStatus = row.getCell(9).value?.toString() || '';
    const images = row.getCell(10).value?.toString() || '';

    if (!skuCleaned) continue;

    products.push({
      skuOriginal,
      skuCleaned,
      brand,
      name,
      nameCleaned,
      category,
      description,
      urlSource,
      stockStatus,
      images,
    });
  }

  return products;
}

/**
 * Load a sample of products for testing
 */
export async function loadProductsSample(count: number = 50): Promise<Product[]> {
  const allProducts = await loadProducts();

  // Get diverse sample across different brands
  const sampleProducts: Product[] = [];

  // Strategy: Take products from different brands to ensure diversity
  const productsByBrand: Record<string, Product[]> = {};

  for (const product of allProducts) {
    if (!productsByBrand[product.brand]) {
      productsByBrand[product.brand] = [];
    }
    productsByBrand[product.brand].push(product);
  }

  // Take products from each brand in round-robin fashion
  const brands = Object.keys(productsByBrand).sort();
  let brandIndex = 0;

  while (sampleProducts.length < count && sampleProducts.length < allProducts.length) {
    const brand = brands[brandIndex % brands.length];
    const brandProducts = productsByBrand[brand];

    if (brandProducts && brandProducts.length > 0) {
      sampleProducts.push(brandProducts.shift()!);
    }

    brandIndex++;
  }

  return sampleProducts.slice(0, count);
}

/**
 * Load products by brand
 */
export async function loadProductsByBrand(brand: string): Promise<Product[]> {
  const allProducts = await loadProducts();
  return allProducts.filter((p) => p.brand === brand);
}

/**
 * Load products by SKU list
 */
export async function loadProductsBySkus(skus: string[]): Promise<Product[]> {
  const allProducts = await loadProducts();
  return allProducts.filter((p) => skus.includes(p.skuCleaned));
}

/**
 * Get product statistics
 */
export async function getProductStats(): Promise<{
  total: number;
  byBrand: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const products = await loadProducts();

  const byBrand: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const product of products) {
    byBrand[product.brand] = (byBrand[product.brand] || 0) + 1;
    byCategory[product.category] = (byCategory[product.category] || 0) + 1;
  }

  return {
    total: products.length,
    byBrand,
    byCategory,
  };
}
