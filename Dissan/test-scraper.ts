import { chromium, Browser, Page } from 'playwright';

/**
 * Script de test pour vérifier les sélecteurs et la structure du site SaniDépot
 * Ce script extrait seulement quelques produits pour validation
 */

const CONFIG = {
  baseUrl: 'https://ecom.sanidepot.com',
  timeout: 30000,
  maxProductsToTest: 5, // Limiter à 5 produits pour le test
};

async function testScraper() {
  console.log('🧪 Test du scraper SaniDépot...\n');

  let browser: Browser | null = null;

  try {
    // Lancer le navigateur
    console.log('1️⃣ Lancement du navigateur...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Naviguer vers le site
    console.log('2️⃣ Navigation vers', CONFIG.baseUrl);
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
    console.log('   ✅ Page chargée\n');

    // Attendre un peu pour voir la page
    await page.waitForTimeout(2000);

    // Test 1: Extraire les catégories principales
    console.log('3️⃣ Test extraction des catégories...');
    const categories = await extractCategories(page);
    console.log(`   ✅ ${categories.length} catégories trouvées:`);
    categories.forEach((cat, i) => {
      console.log(`      ${i + 1}. ${cat.name}`);
      console.log(`         URL: ${cat.url}`);
    });
    console.log('');

    if (categories.length === 0) {
      console.log('   ⚠️  ATTENTION: Aucune catégorie trouvée!');
      console.log('   Il faut probablement ajuster les sélecteurs CSS\n');

      // Essayer d'extraire tous les liens pour debug
      console.log('   🔍 Debug: Extraction de tous les liens du menu...');
      const allLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll('nav a, .navigation a, .menu a, header a').forEach((link) => {
          const text = link.textContent?.trim();
          const href = link.getAttribute('href');
          if (text && href) {
            links.push(`${text} -> ${href}`);
          }
        });
        return links.slice(0, 20); // Limiter à 20 premiers liens
      });

      console.log('   Liens trouvés dans le menu:');
      allLinks.forEach(link => console.log(`      - ${link}`));
      console.log('');
    }

    // Test 2: Si on a des catégories, essayer d'en visiter une
    if (categories.length > 0) {
      const firstCategory = categories[0];
      console.log(`4️⃣ Test navigation vers: ${firstCategory.name}`);

      await page.goto(firstCategory.url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      console.log('   ✅ Page catégorie chargée\n');

      await page.waitForTimeout(2000);

      // Test 3: Extraire les produits de la page
      console.log('5️⃣ Test extraction des produits...');
      const productUrls = await extractProductUrls(page);
      console.log(`   ✅ ${productUrls.length} produits trouvés sur cette page\n`);

      if (productUrls.length === 0) {
        console.log('   ⚠️  ATTENTION: Aucun produit trouvé!');
        console.log('   Il faut probablement ajuster les sélecteurs CSS\n');

        // Debug: capturer une screenshot
        await page.screenshot({ path: 'Dissan/debug-category-page.png', fullPage: true });
        console.log('   📸 Screenshot sauvegardé: Dissan/debug-category-page.png\n');

        // Debug: extraire la structure HTML
        const structure = await page.evaluate(() => {
          const mainContent = document.querySelector('main, .main, .content, #content');
          if (mainContent) {
            // Récupérer les classes principales
            const classes: string[] = [];
            mainContent.querySelectorAll('[class]').forEach((el) => {
              const classList = Array.from(el.classList);
              classList.forEach(cls => {
                if (cls.includes('product') || cls.includes('item') || cls.includes('card')) {
                  classes.push(cls);
                }
              });
            });
            return [...new Set(classes)];
          }
          return [];
        });

        console.log('   🔍 Classes CSS contenant "product", "item" ou "card":');
        structure.forEach(cls => console.log(`      - ${cls}`));
        console.log('');
      }

      // Test 4: Si on a des produits, en visiter un
      if (productUrls.length > 0) {
        const firstProduct = productUrls[0];
        console.log(`6️⃣ Test extraction détails produit...`);
        console.log(`   URL: ${firstProduct}\n`);

        await page.goto(firstProduct, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
        await page.waitForTimeout(2000);

        // Extraire les détails
        const productData = await page.evaluate(() => {
          const getText = (selectors: string[]): string => {
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element?.textContent?.trim()) {
                return element.textContent.trim();
              }
            }
            return '';
          };

          const getImages = (): string[] => {
            const images: string[] = [];
            document.querySelectorAll('img').forEach((img) => {
              const src = img.getAttribute('src') || img.getAttribute('data-src');
              if (src && !src.includes('logo') && !src.includes('icon')) {
                images.push(src);
              }
            });
            return images.slice(0, 5); // Max 5 images
          };

          return {
            titre: getText(['h1', '.product-title', '[class*="product-name"]']),
            description: getText(['.description', '[class*="description"]', '.product-details']),
            marque: getText(['.brand', '[class*="brand"]', '.manufacturer']),
            sku: getText(['.sku', '[class*="sku"]', '.product-code']),
            prix: getText(['.price', '[class*="price"]']),
            stock: getText(['.stock', '[class*="stock"]', '.availability']),
            images: getImages(),
          };
        });

        console.log('   📦 Données extraites:');
        console.log(`      Titre: ${productData.titre || '❌ NON TROUVÉ'}`);
        console.log(`      Marque: ${productData.marque || '❌ NON TROUVÉ'}`);
        console.log(`      SKU: ${productData.sku || '❌ NON TROUVÉ'}`);
        console.log(`      Prix: ${productData.prix || '❌ NON TROUVÉ (normal, nécessite login)'}`);
        console.log(`      Stock: ${productData.stock || '❌ NON TROUVÉ'}`);
        console.log(`      Description: ${productData.description ? productData.description.substring(0, 100) + '...' : '❌ NON TROUVÉ'}`);
        console.log(`      Images: ${productData.images.length} trouvée(s)`);
        if (productData.images.length > 0) {
          productData.images.forEach((img, i) => {
            console.log(`         ${i + 1}. ${img}`);
          });
        }
        console.log('');

        // Screenshot de la page produit
        await page.screenshot({ path: 'Dissan/debug-product-page.png', fullPage: true });
        console.log('   📸 Screenshot sauvegardé: Dissan/debug-product-page.png\n');
      }
    }

    console.log('✅ Test terminé!\n');
    console.log('📋 Résumé:');
    console.log(`   - Catégories trouvées: ${categories.length}`);
    console.log(`   - Le scraper ${categories.length > 0 ? 'devrait fonctionner' : 'NÉCESSITE des ajustements'}`);
    console.log('');

    if (categories.length === 0) {
      console.log('⚠️  Action requise:');
      console.log('   1. Vérifier les screenshots dans Dissan/');
      console.log('   2. Ajuster les sélecteurs CSS dans le script principal');
      console.log('   3. Relancer ce test\n');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function extractCategories(page: Page) {
  try {
    // Attendre le menu
    await page.waitForSelector('nav, .navigation, .menu, header', { timeout: CONFIG.timeout });

    return await page.evaluate((baseUrl) => {
      const links: { name: string; url: string }[] = [];

      // Chercher dans différents sélecteurs possibles
      const selectors = [
        'nav a',
        '.navigation a',
        '.menu a',
        'header a',
        '[class*="nav"] a',
        '[class*="menu"] a',
      ];

      for (const selector of selectors) {
        const navLinks = document.querySelectorAll(selector);

        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();

          if (href && text && !href.includes('#') && !href.includes('contact')) {
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

            // Éviter les doublons
            if (!links.some(l => l.url === fullUrl)) {
              links.push({ name: text, url: fullUrl });
            }
          }
        });

        if (links.length > 0) break;
      }

      return links;
    }, CONFIG.baseUrl);
  } catch (error) {
    return [];
  }
}

async function extractProductUrls(page: Page) {
  try {
    // Attendre que les produits soient chargés
    await page.waitForTimeout(2000);

    return await page.evaluate((baseUrl) => {
      const urls: string[] = [];

      // Chercher les produits avec différents sélecteurs
      const selectors = [
        '[class*="product"] a[href*="product"]',
        '.product-item a',
        '[data-product] a',
        '.product-link',
        'a[href*="/product/"]',
        'a[href*="/item/"]',
        '[class*="item"] a',
      ];

      for (const selector of selectors) {
        const links = document.querySelectorAll(selector);
        links.forEach((link) => {
          const href = link.getAttribute('href');
          if (href) {
            const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
            if (!urls.includes(fullUrl)) {
              urls.push(fullUrl);
            }
          }
        });

        if (urls.length > 0) break;
      }

      return urls.slice(0, CONFIG.maxProductsToTest);
    }, CONFIG.baseUrl);
  } catch (error) {
    return [];
  }
}

// Lancer le test
testScraper().catch(console.error);
