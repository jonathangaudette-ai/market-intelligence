/**
 * Excel Exporter - Génération de fichiers Excel consolidés
 */

import ExcelJS from 'exceljs';
import type { ConsolidatedProduct } from '../types';
import { EXCEL_CONFIG } from '../config';

export class ExcelExporter {
  /**
   * Export consolidated products to Excel with multiple sheets
   */
  async exportConsolidated(
    products: ConsolidatedProduct[],
    outputFile: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: All products with prices from all competitors
    await this.createProductsSheet(workbook, products);

    // Sheet 2: Summary by brand
    await this.createBrandSummarySheet(workbook, products);

    // Sheet 3: Summary by competitor
    await this.createCompetitorSummarySheet(workbook, products);

    // Sheet 4: Products not found
    await this.createNotFoundSheet(workbook, products);

    // Sheet 5: Price outliers
    await this.createOutliersSheet(workbook, products);

    // Save workbook
    await workbook.xlsx.writeFile(outputFile);
  }

  /**
   * Create main products sheet
   */
  private async createProductsSheet(
    workbook: ExcelJS.Workbook,
    products: ConsolidatedProduct[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Tous les produits');

    // Define columns
    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'SKU', key: 'sku', width: EXCEL_CONFIG.columnWidths.sku },
      { header: 'Nom', key: 'name', width: EXCEL_CONFIG.columnWidths.name },
      { header: 'Marque', key: 'brand', width: EXCEL_CONFIG.columnWidths.brand },
      { header: 'Catégorie', key: 'category', width: EXCEL_CONFIG.columnWidths.category },
    ];

    // Add competitor columns (Price + URL for each)
    const competitors = [
      'swish',
      'grainger',
      'uline',
      'bunzl',
      'imperial-dade',
      'cleanitsupply',
      'united-canada',
      'nexday',
      'cleanspot',
      'checkers',
      'vto',
      'lalema',
      'sanidepot',
    ];

    competitors.forEach((comp) => {
      columns.push(
        {
          header: `Prix ${comp}`,
          key: `price_${comp}`,
          width: EXCEL_CONFIG.columnWidths.price,
        },
        {
          header: `URL ${comp}`,
          key: `url_${comp}`,
          width: EXCEL_CONFIG.columnWidths.url,
        }
      );
    });

    // Add stats columns
    columns.push(
      { header: 'Prix Min', key: 'price_min', width: EXCEL_CONFIG.columnWidths.stats },
      { header: 'Prix Max', key: 'price_max', width: EXCEL_CONFIG.columnWidths.stats },
      { header: 'Prix Moyen', key: 'price_avg', width: EXCEL_CONFIG.columnWidths.stats },
      { header: 'Nb Sources', key: 'nb_sources', width: EXCEL_CONFIG.columnWidths.stats },
      { header: 'Écart %', key: 'ecart_pct', width: EXCEL_CONFIG.columnWidths.stats },
      {
        header: 'Sites Vendeurs',
        key: 'sites_vendeurs',
        width: EXCEL_CONFIG.columnWidths.name,
      }
    );

    sheet.columns = columns;

    // Add data rows
    products.forEach((product) => {
      const row: any = {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price_min: product.stats.priceMin,
        price_max: product.stats.priceMax,
        price_avg: product.stats.priceAvg,
        nb_sources: product.stats.nbSources,
        ecart_pct: product.stats.ecartPct,
        sites_vendeurs: product.stats.sitesVendeurs.join(', '),
      };

      // Add competitor prices
      competitors.forEach((comp) => {
        const priceData = product.prices[comp];
        row[`price_${comp}`] = priceData?.price || null;
        row[`url_${comp}`] = priceData?.url || null;
      });

      sheet.addRow(row);
    });

    // Style header row
    this.styleHeaderRow(sheet.getRow(1));

    // Format price columns
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header
        competitors.forEach((comp, index) => {
          const priceColIndex = 5 + index * 2; // Starting after basic columns
          const cell = row.getCell(priceColIndex);
          if (cell.value) {
            cell.numFmt = EXCEL_CONFIG.priceFormat;
          }
        });

        // Format stats columns
        const statsStartCol = 5 + competitors.length * 2;
        row.getCell(statsStartCol).numFmt = EXCEL_CONFIG.priceFormat; // Min
        row.getCell(statsStartCol + 1).numFmt = EXCEL_CONFIG.priceFormat; // Max
        row.getCell(statsStartCol + 2).numFmt = EXCEL_CONFIG.priceFormat; // Avg
        row.getCell(statsStartCol + 4).numFmt = EXCEL_CONFIG.percentFormat; // Écart %
      }
    });

    // Enable auto-filter
    if (EXCEL_CONFIG.autoFilter) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
    }

    // Freeze header row and first column
    if (EXCEL_CONFIG.freezePanes) {
      sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
    }
  }

  /**
   * Create brand summary sheet
   */
  private async createBrandSummarySheet(
    workbook: ExcelJS.Workbook,
    products: ConsolidatedProduct[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Résumé par marque');

    sheet.columns = [
      { header: 'Marque', key: 'brand', width: 20 },
      { header: 'Nb Produits', key: 'count', width: 15 },
      { header: 'Nb Trouvés', key: 'found', width: 15 },
      { header: '% Couverture', key: 'coverage', width: 15 },
      { header: 'Prix Moyen', key: 'avgPrice', width: 15 },
      { header: 'Prix Min', key: 'minPrice', width: 15 },
      { header: 'Prix Max', key: 'maxPrice', width: 15 },
    ];

    // Group by brand
    const brandStats: Record<
      string,
      {
        count: number;
        found: number;
        prices: number[];
      }
    > = {};

    products.forEach((p) => {
      if (!brandStats[p.brand]) {
        brandStats[p.brand] = { count: 0, found: 0, prices: [] };
      }

      brandStats[p.brand].count++;
      if (p.stats.nbSources > 0) {
        brandStats[p.brand].found++;
        if (p.stats.priceAvg) {
          brandStats[p.brand].prices.push(p.stats.priceAvg);
        }
      }
    });

    // Add rows
    Object.entries(brandStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([brand, stats]) => {
        const avgPrice =
          stats.prices.length > 0
            ? stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length
            : null;
        const minPrice = stats.prices.length > 0 ? Math.min(...stats.prices) : null;
        const maxPrice = stats.prices.length > 0 ? Math.max(...stats.prices) : null;

        sheet.addRow({
          brand,
          count: stats.count,
          found: stats.found,
          coverage: stats.found / stats.count,
          avgPrice,
          minPrice,
          maxPrice,
        });
      });

    this.styleHeaderRow(sheet.getRow(1));

    // Format numbers
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(4).numFmt = EXCEL_CONFIG.percentFormat;
        row.getCell(5).numFmt = EXCEL_CONFIG.priceFormat;
        row.getCell(6).numFmt = EXCEL_CONFIG.priceFormat;
        row.getCell(7).numFmt = EXCEL_CONFIG.priceFormat;
      }
    });
  }

  /**
   * Create competitor summary sheet
   */
  private async createCompetitorSummarySheet(
    workbook: ExcelJS.Workbook,
    products: ConsolidatedProduct[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Résumé par compétiteur');

    sheet.columns = [
      { header: 'Compétiteur', key: 'competitor', width: 25 },
      { header: 'Nb Produits Trouvés', key: 'found', width: 20 },
      { header: '% Couverture', key: 'coverage', width: 15 },
      { header: 'Prix Moyen', key: 'avgPrice', width: 15 },
    ];

    const competitors = [
      'swish',
      'grainger',
      'uline',
      'bunzl',
      'imperial-dade',
      'cleanitsupply',
      'united-canada',
      'nexday',
      'cleanspot',
      'checkers',
      'vto',
      'lalema',
      'sanidepot',
    ];

    competitors.forEach((comp) => {
      let found = 0;
      const prices: number[] = [];

      products.forEach((p) => {
        if (p.prices[comp]?.found && p.prices[comp].price) {
          found++;
          prices.push(p.prices[comp].price!);
        }
      });

      const avgPrice =
        prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

      sheet.addRow({
        competitor: comp,
        found,
        coverage: found / products.length,
        avgPrice,
      });
    });

    this.styleHeaderRow(sheet.getRow(1));

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(3).numFmt = EXCEL_CONFIG.percentFormat;
        row.getCell(4).numFmt = EXCEL_CONFIG.priceFormat;
      }
    });
  }

  /**
   * Create not found products sheet
   */
  private async createNotFoundSheet(
    workbook: ExcelJS.Workbook,
    products: ConsolidatedProduct[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Produits non trouvés');

    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 25 },
      { header: 'Nom', key: 'name', width: 50 },
      { header: 'Marque', key: 'brand', width: 20 },
      { header: 'Nb Sources', key: 'sources', width: 15 },
    ];

    // Filter products with < 3 sources
    const notFound = products.filter((p) => p.stats.nbSources < 3);

    notFound.forEach((p) => {
      sheet.addRow({
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        sources: p.stats.nbSources,
      });
    });

    this.styleHeaderRow(sheet.getRow(1));
  }

  /**
   * Create price outliers sheet
   */
  private async createOutliersSheet(
    workbook: ExcelJS.Workbook,
    products: ConsolidatedProduct[]
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Outliers de prix');

    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 25 },
      { header: 'Nom', key: 'name', width: 50 },
      { header: 'Prix Min', key: 'minPrice', width: 15 },
      { header: 'Prix Max', key: 'maxPrice', width: 15 },
      { header: 'Écart %', key: 'gap', width: 15 },
    ];

    // Filter products with price gap > 50%
    const outliers = products.filter(
      (p) => p.stats.ecartPct !== null && p.stats.ecartPct > 50
    );

    outliers
      .sort((a, b) => (b.stats.ecartPct || 0) - (a.stats.ecartPct || 0))
      .forEach((p) => {
        sheet.addRow({
          sku: p.sku,
          name: p.name,
          minPrice: p.stats.priceMin,
          maxPrice: p.stats.priceMax,
          gap: p.stats.ecartPct,
        });
      });

    this.styleHeaderRow(sheet.getRow(1));

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(3).numFmt = EXCEL_CONFIG.priceFormat;
        row.getCell(4).numFmt = EXCEL_CONFIG.priceFormat;
        row.getCell(5).numFmt = EXCEL_CONFIG.percentFormat;
      }
    });
  }

  /**
   * Style header row
   */
  private styleHeaderRow(row: ExcelJS.Row): void {
    row.font = {
      bold: true,
      color: { argb: EXCEL_CONFIG.headerFontColor },
    };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_CONFIG.headerColor },
    };
    row.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  }
}
