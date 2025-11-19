import { chromium } from 'playwright';

/**
 * Test rapide pour extraire quelques produits d'une sous-catégorie spécifique
 */

async function testProductExtraction() {
  console.log('🧪 Test d\'extraction de produits...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Aller directement dans une sous-catégorie qui devrait contenir des produits
    // Par exemple: "Bottles"
    const testUrl = 'https://ecom.sanidepot.com/en/accessories/bottles-and-sprays/bottles.html';

    console.log('📂 Navigation vers:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('✅ Page chargée\n');

    // Essayer d'extraire les produits avec plusieurs stratégies
    console.log('🔍 Recherche de produits...\n');

    const products = await page.evaluate(() => {
      const results: any[] = [];

      // Stratégie 1: Chercher les éléments de produits
      const productElements = document.querySelectorAll('.product-item, [class*="product"], .item');

      productElements.forEach((el, index) => {
        if (index < 5) { // Limiter à 5 produits pour le test
          const nameEl = el.querySelector('a[title], .product-name, h2, h3');
          const linkEl = el.querySelector('a[href]');
          const imgEl = el.querySelector('img');
          const priceEl = el.querySelector('.price, [class*="price"]');

          results.push({
            nom: nameEl?.textContent?.trim() || nameEl?.getAttribute('title') || '',
            url: linkEl?.getAttribute('href') || '',
            image: imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '',
            prix: priceEl?.textContent?.trim() || 'Login required',
            html: el.className,
          });
        }
      });

      // Si rien trouvé, essayer une autre approche
      if (results.length === 0) {
        const allLinks = document.querySelectorAll('a[href]');
        allLinks.forEach((link, index) => {
          if (index < 10) {
            const href = link.getAttribute('href') || '';
            const title = link.getAttribute('title') || link.textContent?.trim() || '';

            if (href.includes('.html') && !href.includes('category') && title.length > 0) {
              results.push({
                nom: title,
                url: href,
                type: 'lien',
              });
            }
          }
        });
      }

      return results;
    });

    console.log(`📦 ${products.length} produits trouvés:\n`);

    products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.nom}`);
      if (product.url) console.log(`   URL: ${product.url}`);
      if (product.image) console.log(`   Image: ${product.image}`);
      if (product.prix) console.log(`   Prix: ${product.prix}`);
      if (product.html) console.log(`   Classes: ${product.html}`);
      console.log('');
    });

    // Si on a trouvé des produits, en visiter un
    if (products.length > 0 && products[0].url) {
      const productUrl = products[0].url.startsWith('http')
        ? products[0].url
        : `https://ecom.sanidepot.com${products[0].url}`;

      console.log('\n🔬 Test d\'extraction de détails du premier produit...');
      console.log('📍 URL:', productUrl, '\n');

      await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const productDetails = await page.evaluate(() => {
        const getText = (selectors: string[]): string => {
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el?.textContent?.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const getAllText = (selectors: string[]): string[] => {
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              return Array.from(elements)
                .map(el => el.textContent?.trim())
                .filter(Boolean) as string[];
            }
          }
          return [];
        };

        const getImages = (): string[] => {
          const imgs: string[] = [];
          document.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src');
            if (src && !src.includes('logo') && !src.includes('icon') && !imgs.includes(src)) {
              imgs.push(src);
            }
          });
          return imgs.slice(0, 3);
        };

        return {
          titre: getText(['h1', '.page-title', '.product-name', '[class*="product-name"]']),
          sku: getText(['.sku', '[class*="sku"]', '.product-code', '[itemprop="sku"]']),
          marque: getText(['.brand', '[class*="brand"]', '.manufacturer', '[itemprop="brand"]']),
          description: getText([
            '.description',
            '[class*="description"]',
            '.product-description',
            '[itemprop="description"]',
          ]),
          specifications: getAllText([
            '.product-info li',
            '.specs li',
            '.specifications li',
            '[class*="spec"] li',
            '.attributes li',
          ]),
          stock: getText(['.stock', '[class*="stock"]', '.availability', '[class*="availability"]']),
          images: getImages(),
          certifications: getAllText(['.certification', '.badge', '[class*="cert"]']),
        };
      });

      console.log('📋 Détails extraits:');
      console.log('   Titre:', productDetails.titre || '❌');
      console.log('   SKU:', productDetails.sku || '❌');
      console.log('   Marque:', productDetails.marque || '❌');
      console.log('   Stock:', productDetails.stock || '❌');
      console.log('   Description:', productDetails.description
        ? `${productDetails.description.substring(0, 100)}...`
        : '❌');
      console.log('   Spécifications:', productDetails.specifications.length, 'trouvée(s)');
      productDetails.specifications.slice(0, 3).forEach(spec => {
        console.log(`      - ${spec}`);
      });
      console.log('   Images:', productDetails.images.length);
      productDetails.images.forEach(img => {
        console.log(`      - ${img}`);
      });
      console.log('   Certifications:', productDetails.certifications.join(', ') || 'Aucune');

      // Screenshot de la page produit
      await page.screenshot({ path: 'Dissan/test-product-details.png', fullPage: true });
      console.log('\n📸 Screenshot sauvegardé: Dissan/test-product-details.png');
    }

    console.log('\n✅ Test terminé!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await browser.close();
  }
}

testProductExtraction().catch(console.error);
