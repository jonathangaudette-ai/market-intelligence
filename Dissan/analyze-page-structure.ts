import { chromium } from 'playwright';
import * as fs from 'fs';

/**
 * Analyse la structure HTML de la page pour identifier les bons sélecteurs
 */

async function analyzePage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const testUrl = 'https://ecom.sanidepot.com/en/accessories/bottles-and-sprays/bottles.html';

    console.log('📂 Navigation vers:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('✅ Page chargée\n');

    // Extraire la structure HTML et l'analyser
    const analysis = await page.evaluate(() => {
      const info: any = {};

      // Trouver le container principal de produits
      info.possibleProductContainers = [];
      const selectors = [
        '.products-grid',
        '.product-items',
        '.category-products',
        '[class*="product-list"]',
        '[class*="products"]',
        'ol.products',
        'ul.products',
        '.catalog-category-view main',
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach(el => {
            info.possibleProductContainers.push({
              selector,
              className: el.className,
              childrenCount: el.children.length,
              html: el.innerHTML.substring(0, 500), // Premiers 500 caractères
            });
          });
        }
      });

      // Compter les différents types d'éléments
      info.elementCounts = {
        'li': document.querySelectorAll('li').length,
        'div': document.querySelectorAll('div').length,
        'a': document.querySelectorAll('a').length,
        'img': document.querySelectorAll('img').length,
      };

      // Chercher des patterns de classes
      info.classPatterns = [];
      const allElements = document.querySelectorAll('[class]');
      const classSet = new Set<string>();

      allElements.forEach(el => {
        Array.from(el.classList).forEach(cls => {
          if (cls.toLowerCase().includes('product') ||
              cls.toLowerCase().includes('item') ||
              cls.toLowerCase().includes('grid') ||
              cls.toLowerCase().includes('list') ||
              cls.toLowerCase().includes('catalog')) {
            classSet.add(cls);
          }
        });
      });

      info.classPatterns = Array.from(classSet).slice(0, 20);

      // Obtenir le HTML d'une section du body
      const main = document.querySelector('main, .main-content, #maincontent');
      if (main) {
        info.mainStructure = {
          tag: main.tagName,
          className: main.className,
          id: main.id,
          childrenTags: Array.from(main.children).map(child => ({
            tag: child.tagName,
            className: child.className,
            id: child.id,
          })).slice(0, 10),
        };
      }

      return info;
    });

    console.log('📊 Analyse de la structure:\n');

    console.log('🎯 Containers potentiels de produits:');
    if (analysis.possibleProductContainers.length > 0) {
      analysis.possibleProductContainers.forEach((container: any, i: number) => {
        console.log(`\n${i + 1}. Sélecteur: ${container.selector}`);
        console.log(`   Classe: ${container.className}`);
        console.log(`   Enfants: ${container.childrenCount}`);
        console.log(`   HTML: ${container.html.substring(0, 200)}...`);
      });
    } else {
      console.log('   ❌ Aucun container trouvé');
    }

    console.log('\n\n📝 Classes CSS intéressantes:');
    analysis.classPatterns.forEach((cls: string) => {
      console.log(`   - ${cls}`);
    });

    console.log('\n\n🏗️  Structure principale:');
    if (analysis.mainStructure) {
      console.log(`   Tag: <${analysis.mainStructure.tag.toLowerCase()}>`);
      console.log(`   Classe: ${analysis.mainStructure.className}`);
      console.log(`   ID: ${analysis.mainStructure.id}`);
      console.log('\n   Enfants directs:');
      analysis.mainStructure.childrenTags.forEach((child: any, i: number) => {
        console.log(`      ${i + 1}. <${child.tag.toLowerCase()}> class="${child.className}"`);
      });
    }

    console.log('\n\n📈 Statistiques:');
    console.log(`   LI éléments: ${analysis.elementCounts.li}`);
    console.log(`   DIV éléments: ${analysis.elementCounts.div}`);
    console.log(`   Liens (A): ${analysis.elementCounts.a}`);
    console.log(`   Images: ${analysis.elementCounts.img}`);

    // Sauvegarder le HTML complet pour inspection
    const html = await page.content();
    fs.writeFileSync('Dissan/page-source.html', html);
    console.log('\n💾 HTML complet sauvegardé dans: Dissan/page-source.html');

    // Screenshot
    await page.screenshot({ path: 'Dissan/page-structure.png', fullPage: true });
    console.log('📸 Screenshot sauvegardé dans: Dissan/page-structure.png');

    console.log('\n✅ Analyse terminée!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await browser.close();
  }
}

analyzePage().catch(console.error);
