import { chromium, Browser, Page } from 'playwright';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  baseUrl: 'https://ecom.sanidepot.com',
  delayBetweenRequests: 2000, // 2 secondes entre chaque requête
  delayBetweenProducts: 1000, // 1 seconde entre chaque produit
  timeout: 30000, // 30 secondes de timeout
  headless: false, // Mettre à true pour mode sans interface
  outputFile: 'produits-sanidepot.xlsx',
  checkpointFile: 'checkpoint.json', // Pour reprendre en cas d'interruption
};

// Interface pour les données produit
interface Product {
  nom: string;
  categorie: string;
  sousCategorie: string;
  marque: string;
  description: string;
  sku: string;
  specifications: string;
  imageUrls: string[];
  statutStock: string;
  certifications: string[];
  urlProduit: string;
}

// État pour reprendre en cas d'interruption
interface Checkpoint {
  products: Product[];
  lastProcessedCategory: string;
  lastProcessedSubcategory: string;
  lastProcessedProductUrl: string;
}

class SaniDepotScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private products: Product[] = [];
  private checkpoint: Checkpoint = {
    products: [],
    lastProcessedCategory: '',
    lastProcessedSubcategory: '',
    lastProcessedProductUrl: '',
  };

  async init() {
    console.log('🚀 Initialisation du scraper SaniDépot...');
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
    });
    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Charger le checkpoint s'il existe
    this.loadCheckpoint();
  }

  private loadCheckpoint() {
    const checkpointPath = path.join(__dirname, CONFIG.checkpointFile);
    if (fs.existsSync(checkpointPath)) {
      try {
        this.checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
        this.products = this.checkpoint.products;
        console.log(`📂 Checkpoint chargé: ${this.products.length} produits déjà extraits`);
      } catch (error) {
        console.error('❌ Erreur lors du chargement du checkpoint:', error);
      }
    }
  }

  private saveCheckpoint() {
    const checkpointPath = path.join(__dirname, CONFIG.checkpointFile);
    this.checkpoint.products = this.products;
    try {
      fs.writeFileSync(checkpointPath, JSON.stringify(this.checkpoint, null, 2));
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde du checkpoint:', error);
    }
  }

  async scrape() {
    if (!this.page) {
      throw new Error('Page non initialisée');
    }

    try {
      // Naviguer vers la page d'accueil
      console.log('🌐 Navigation vers ecom.sanidepot.com...');
      await this.page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
      await this.delay(CONFIG.delayBetweenRequests);

      // Extraire les catégories principales
      const categories = await this.extractCategories();
      console.log(`📁 ${categories.length} catégories trouvées`);

      // Parcourir chaque catégorie
      for (const category of categories) {
        console.log(`\n📂 Traitement de la catégorie: ${category.name}`);

        const initialProductCount = this.products.length;
        await this.processCategory(category);

        // Ne sauvegarder le checkpoint que si des produits ont été extraits
        if (this.products.length > initialProductCount) {
          this.checkpoint.lastProcessedCategory = category.name;
          this.saveCheckpoint();
        }
      }

      console.log(`\n✅ Extraction terminée! ${this.products.length} produits extraits`);
    } catch (error) {
      console.error('❌ Erreur lors du scraping:', error);
      throw error;
    }
  }

  private async extractCategories() {
    if (!this.page) throw new Error('Page non initialisée');

    // Attendre que la page soit chargée
    await this.page.waitForLoadState('networkidle');
    await this.delay(2000); // Attendre que le menu soit rendu

    // Extraire les liens de catégories
    const categories = await this.page.evaluate((baseUrl) => {
      const links: { name: string; url: string }[] = [];
      const seenUrls = new Set<string>();

      // Chercher les liens de catégories dans le menu principal
      const navLinks = document.querySelectorAll('nav a');

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const text = link.textContent?.trim();

        if (href && text && href.endsWith('.html')) {
          // Ne garder que les catégories finales (celles qui se terminent par .html)
          // Exclure les liens de navigation inutiles
          if (
            !href.includes('#') &&
            !href.includes('contact') &&
            !href.includes('suppliers') &&
            !href.includes('certifications') &&
            !href.includes('productlist') &&
            text.length > 0 &&
            text !== 'See All'
          ) {
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

            // Éviter les doublons
            if (!seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              links.push({
                name: text,
                url: fullUrl,
              });
            }
          }
        }
      });

      return links;
    }, CONFIG.baseUrl);

    return categories;
  }

  private async processCategory(category: { name: string; url: string }) {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Naviguer vers la catégorie
      console.log(`  🌐 Navigation vers: ${category.url}`);
      await this.page.goto(category.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      await this.delay(CONFIG.delayBetweenRequests);

      // Extraire les produits de cette catégorie
      await this.extractProductsFromPage(category.name, '');

      // Gérer la pagination
      await this.handlePagination(category.name, '');
    } catch (error) {
      console.error(`  ❌ Erreur lors du traitement de ${category.name}:`, error);
    }
  }

  private async extractSubcategories() {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Chercher les filtres ou sous-catégories
      const subcategories = await this.page.evaluate(() => {
        const links: { name: string; url: string }[] = [];

        // Chercher dans les filtres, sidebar, ou listes de sous-catégories
        const selectors = [
          '.category-list a',
          '.subcategory a',
          '.filter a',
          '[class*="subcategor"] a',
          'aside a',
          '.sidebar a',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach((link) => {
            const href = link.getAttribute('href');
            const text = link.textContent?.trim();

            if (href && text && !links.some(l => l.url === href)) {
              links.push({
                name: text,
                url: href,
              });
            }
          });

          if (links.length > 0) break;
        }

        return links;
      });

      return subcategories;
    } catch (error) {
      return [];
    }
  }

  private async processSubcategory(categoryName: string, subcategory: { name: string; url: string }) {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Naviguer vers la sous-catégorie
      const url = subcategory.url.startsWith('http')
        ? subcategory.url
        : `${CONFIG.baseUrl}${subcategory.url}`;

      await this.page.goto(url, { waitUntil: 'networkidle' });
      await this.delay(CONFIG.delayBetweenRequests);

      // Extraire les produits
      await this.extractProductsFromPage(categoryName, subcategory.name);

      // Gérer la pagination
      await this.handlePagination(categoryName, subcategory.name);
    } catch (error) {
      console.error(`    ❌ Erreur lors du traitement de ${subcategory.name}:`, error);
    }
  }

  private async extractProductsFromPage(categoryName: string, subcategoryName: string) {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Attendre que les produits soient chargés
      const hasProducts = await this.page.waitForSelector('li.product-item', {
        timeout: CONFIG.timeout,
      }).catch(() => null);

      if (!hasProducts) {
        console.log('    ⚠️  Aucun produit trouvé sur cette page');
        return;
      }

      // Petit délai pour s'assurer que tout est chargé
      await this.delay(1000);

      // Extraire les URLs des produits depuis la liste
      const productUrls = await this.page.evaluate(() => {
        const urls: string[] = [];

        // Sélectionner tous les produits dans la liste
        const productItems = document.querySelectorAll('li.product-item');

        productItems.forEach((item) => {
          // Chercher le lien principal du produit
          const link = item.querySelector('a.product-item-link');
          if (link) {
            const href = link.getAttribute('href');
            if (href && !urls.includes(href)) {
              urls.push(href);
            }
          }
        });

        return urls;
      });

      console.log(`      📦 ${productUrls.length} produits trouvés sur cette page`);

      // Traiter chaque produit
      for (const productUrl of productUrls) {
        // Si on est en mode reprise (checkpoint existe), sauter jusqu'au dernier produit traité
        if (this.checkpoint.lastProcessedProductUrl) {
          // On a trouvé le produit où reprendre
          if (this.checkpoint.lastProcessedProductUrl === productUrl) {
            console.log(`      ⏭️  Reprise après ce produit`);
            this.checkpoint.lastProcessedProductUrl = ''; // Reset pour traiter les suivants
          }
          // Continuer à sauter tant qu'on n'a pas atteint le point de reprise
          continue;
        }

        await this.extractProductDetails(productUrl, categoryName, subcategoryName);

        // Sauvegarder régulièrement
        if (this.products.length % 10 === 0) {
          this.saveCheckpoint();
          console.log(`      💾 Checkpoint sauvegardé (${this.products.length} produits)`);
        }

        await this.delay(CONFIG.delayBetweenProducts);
      }
    } catch (error) {
      console.error('      ❌ Erreur lors de l\'extraction des produits:', error);
    }
  }

  private async extractProductDetails(url: string, categoryName: string, subcategoryName: string) {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Naviguer vers la page produit
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      await this.delay(500);

      // Extraire les détails du produit
      const productData = await this.page.evaluate(() => {
        // Nom du produit
        let nom = '';
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent) nom = h1.textContent.trim();

        // Description
        let description = '';
        const desc = document.querySelector('.description') ||
                    document.querySelector('[class*="description"]') ||
                    document.querySelector('.product-details');
        if (desc && desc.textContent) description = desc.textContent.trim();

        // Marque
        let marque = '';
        const brand = document.querySelector('.brand') ||
                     document.querySelector('[class*="brand"]') ||
                     document.querySelector('.manufacturer');
        if (brand && brand.textContent) marque = brand.textContent.trim();

        // SKU
        let sku = '';
        const skuEl = document.querySelector('.sku') ||
                     document.querySelector('[class*="sku"]') ||
                     document.querySelector('.product-code');
        if (skuEl && skuEl.textContent) sku = skuEl.textContent.trim();

        // Spécifications
        const specifications = [];
        const specElements = document.querySelectorAll('.specifications li, .specs li, [class*="spec"] li');
        for (let i = 0; i < specElements.length; i++) {
          const text = specElements[i].textContent;
          if (text) specifications.push(text.trim());
        }

        // Statut de stock
        let statutStock = '';
        const stock = document.querySelector('.stock-status') ||
                     document.querySelector('[class*="stock"]') ||
                     document.querySelector('.availability');
        if (stock && stock.textContent) statutStock = stock.textContent.trim();

        // Certifications
        const certifications = [];
        const certElements = document.querySelectorAll('.certification, [class*="cert"], .badge');
        for (let i = 0; i < certElements.length; i++) {
          const text = certElements[i].textContent;
          if (text) certifications.push(text.trim());
        }

        // Images
        const imageUrls = [];
        const imgSelectors = ['.product-image img', '[class*="product"] img', '.gallery img'];
        for (let i = 0; i < imgSelectors.length; i++) {
          const imgs = document.querySelectorAll(imgSelectors[i]);
          for (let j = 0; j < imgs.length; j++) {
            const src = imgs[j].getAttribute('src') || imgs[j].getAttribute('data-src');
            if (src && imageUrls.indexOf(src) === -1) {
              imageUrls.push(src);
            }
          }
          if (imageUrls.length > 0) break;
        }

        return {
          nom: nom,
          description: description,
          marque: marque,
          sku: sku,
          specifications: specifications.join(' | '),
          statutStock: statutStock,
          certifications: certifications,
          imageUrls: imageUrls,
        };
      });

      // Créer l'objet produit
      const product: Product = {
        nom: productData.nom,
        categorie: categoryName,
        sousCategorie: subcategoryName,
        marque: productData.marque,
        description: productData.description,
        sku: productData.sku,
        specifications: productData.specifications,
        imageUrls: productData.imageUrls,
        statutStock: productData.statutStock,
        certifications: productData.certifications,
        urlProduit: url,
      };

      this.products.push(product);
      console.log(`        ✅ ${product.nom || 'Produit sans nom'}`);
    } catch (error) {
      console.error(`        ❌ Erreur lors de l'extraction de ${url}:`, error);
    }
  }

  private async handlePagination(categoryName: string, subcategoryName: string) {
    if (!this.page) throw new Error('Page non initialisée');

    try {
      // Chercher le bouton "page suivante"
      const hasNextPage = await this.page.evaluate(() => {
        const selectors = [
          '.next-page',
          '.pagination .next',
          'a[rel="next"]',
          '[class*="next"]',
        ];

        for (const selector of selectors) {
          const nextButton = document.querySelector(selector);
          if (nextButton && !nextButton.classList.contains('disabled')) {
            return true;
          }
        }
        return false;
      });

      if (hasNextPage) {
        console.log('      📄 Page suivante trouvée...');
        await this.page.click('.next-page, .pagination .next, a[rel="next"], [class*="next"]');
        await this.delay(CONFIG.delayBetweenRequests);
        await this.extractProductsFromPage(categoryName, subcategoryName);
        await this.handlePagination(categoryName, subcategoryName);
      }
    } catch (error) {
      // Pas de pagination ou fin de la pagination
    }
  }

  async exportToExcel() {
    console.log('\n📊 Export vers Excel...');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produits SaniDépot');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'Nom', key: 'nom', width: 40 },
      { header: 'Catégorie', key: 'categorie', width: 25 },
      { header: 'Sous-catégorie', key: 'sousCategorie', width: 25 },
      { header: 'Marque', key: 'marque', width: 20 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Spécifications', key: 'specifications', width: 50 },
      { header: 'Statut Stock', key: 'statutStock', width: 15 },
      { header: 'Certifications', key: 'certifications', width: 30 },
      { header: 'Images', key: 'images', width: 50 },
      { header: 'URL', key: 'urlProduit', width: 60 },
    ];

    // Ajouter les données
    this.products.forEach((product) => {
      worksheet.addRow({
        nom: product.nom,
        categorie: product.categorie,
        sousCategorie: product.sousCategorie,
        marque: product.marque,
        description: product.description,
        sku: product.sku,
        specifications: product.specifications,
        statutStock: product.statutStock,
        certifications: product.certifications.join(', '),
        images: product.imageUrls.join(', '),
        urlProduit: product.urlProduit,
      });
    });

    // Formater l'en-tête
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Activer les filtres
    worksheet.autoFilter = {
      from: 'A1',
      to: `K${this.products.length + 1}`,
    };

    // Sauvegarder le fichier
    const outputPath = path.join(__dirname, CONFIG.outputFile);
    await workbook.xlsx.writeFile(outputPath);

    console.log(`✅ Fichier Excel créé: ${outputPath}`);
    console.log(`📊 Nombre de produits: ${this.products.length}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }

    // Supprimer le checkpoint si l'extraction est complète
    const checkpointPath = path.join(__dirname, CONFIG.checkpointFile);
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      console.log('🗑️  Checkpoint supprimé');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Fonction principale
async function main() {
  const scraper = new SaniDepotScraper();

  try {
    await scraper.init();
    await scraper.scrape();
    await scraper.exportToExcel();
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

// Lancer le script
main().catch(console.error);
