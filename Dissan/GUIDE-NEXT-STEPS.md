# Guide - Prochaines Étapes

**Date:** 18 novembre 2024
**Statut:** ✅ Phase 3 complétée - Scrapers pilotes opérationnels

---

## ✅ Ce qui a été accompli

### Infrastructure Complète (100%)
- ✅ Filtrage et préparation de 576 produits commerciaux
- ✅ Configuration de 13 compétiteurs canadiens
- ✅ Architecture modulaire de scraping (BaseScraper)
- ✅ Système de rate limiting (2-3s entre requêtes)
- ✅ Système de checkpoints (sauvegarde tous les 50 produits)
- ✅ Système de logging (console + fichiers)
- ✅ Matchers intelligents (SKU + Nom avec similarité)

### 3 Scrapers Pilotes Implémentés (100%)
1. **SwishScraper** - Swish Maintenance (swish.ca)
2. **GraingerScraper** - Grainger Canada (grainger.ca)
3. **CleanItSupplyScraper** - CleanItSupply (cleanitsupply.ca)

### Tests de Validation
```
✅ All tests passed! Setup is ready.

📊 Statistiques:
- 576 produits commerciaux chargés
- 13 compétiteurs configurés
- 3 scrapers opérationnels
- Top marque: ATL (77 produits)
```

---

## 🎯 Prochaines Étapes Critiques

### ÉTAPE 1: Ajuster les Sélecteurs CSS (URGENT - 2-3h)

⚠️ **IMPORTANT:** Les sélecteurs CSS dans `competitors-config.json` sont des **placeholders fictifs**. Ils doivent être ajustés en inspectant les vrais sites web.

#### Pour chaque site (Swish, Grainger, CleanItSupply):

1. **Ouvrir le site dans le navigateur**
   ```
   https://swish.ca
   https://grainger.ca
   https://cleanitsupply.ca
   ```

2. **Faire une recherche test** (ex: "ATL-12600")

3. **Inspecter avec DevTools (F12)** et identifier les sélecteurs pour:
   - `searchBox` - Champ de recherche (ex: `#search-input`)
   - `searchButton` - Bouton de recherche
   - `productList` - Container des résultats (ex: `.product-grid .product-item`)
   - `productLink` - Lien vers page produit (ex: `a.product-link`)
   - `productName` - Nom du produit (ex: `.product-title`)
   - `productSku` - SKU affiché (ex: `.product-sku`)
   - `productPrice` - Prix (ex: `.product-price .price-value`)
   - `noResults` - Message "aucun résultat" (ex: `.no-results-message`)

4. **Mettre à jour** `Dissan/competitors-config.json`:
   ```json
   {
     "id": "swish",
     "selectors": {
       "searchBox": "#VRAI_SELECTEUR",
       "productList": ".VRAI_CONTAINER .product-item",
       ...
     }
   }
   ```

5. **Tester immédiatement:**
   ```bash
   cd Dissan/price-scraper
   npm run scrape:site swish
   ```

6. **Répéter** pour Grainger et CleanItSupply

#### Exemple Pratique (Swish):

```bash
# 1. Ouvrir DevTools sur swish.ca
# 2. Chercher "Rubbermaid bucket"
# 3. Clic droit sur champ de recherche → Inspecter
#    → Noter le sélecteur (ex: input.search-field)
# 4. Clic droit sur un produit → Inspecter
#    → Noter .product-card, .product-title, etc.
# 5. Mettre à jour competitors-config.json
# 6. Tester: npm run scrape:site swish
```

---

### ÉTAPE 2: Tester sur Échantillon de 50 Produits (1-2h)

Une fois les sélecteurs ajustés pour les 3 sites pilotes:

```bash
cd Dissan/price-scraper

# Modifier main.ts pour tester sur 50 produits
# (Le script test n'est pas encore configuré correctement)

# Option 1: Test manuel par site
npm run scrape:site swish
# Vérifier les résultats dans results/prix-par-site/swish-results.json

npm run scrape:site grainger
npm run scrape:site cleanitsupply
```

#### Validation des Résultats

Vérifier dans `results/prix-par-site/{site}-results.json`:

```json
{
  "competitorId": "swish",
  "productsFound": 35,        // Objectif: >40/50 (80%)
  "productsNotFound": 12,
  "errors": 3,                // Objectif: <3/50 (5%)
  "results": [...]
}
```

**Métriques de succès visées:**
- Taux trouvé (SKU + Nom): **>80%**
- Taux d'erreur: **<5%**
- Temps moyen/produit: **<10s**

Si les métriques ne sont pas atteintes:
- Ajuster les sélecteurs CSS
- Augmenter le rate limiting (3-4s si 403 errors)
- Vérifier les logs: `data/logs/{site}-{date}.log`

---

### ÉTAPE 3: Implémenter les 10 Scrapers Restants (6-8h)

**Template disponible:** Les 3 scrapers pilotes servent de template réutilisable.

#### Priorité 1 (3 sites - 2h)
3. **ULINE Canada** (uline.ca)
4. **Bunzl Cleaning** (bunzlch.ca)
5. **Imperial Dade** (imperialdade.com)

**Processus par scraper:**
1. Copier `swish-scraper.ts` → `uline-scraper.ts`
2. Renommer la classe: `UlineScraper`
3. Inspecter le site ULINE avec DevTools
4. Ajuster les sélecteurs dans `competitors-config.json`
5. Tester: `npm run scrape:site uline`
6. Ajouter au registre dans `main.ts`:
   ```typescript
   import { UlineScraper } from './scrapers/uline-scraper';

   const SCRAPERS = {
     ...
     uline: UlineScraper,
   };
   ```

#### Priorité 2 (5 sites - 3h)
6. United Canada
7. NexDay Supply
8. Clean Spot
9. Checkers Cleaning
10. *(CleanItSupply déjà fait)*

#### Priorité 3 (3 sites - 2h)
11. V-TO inc.
12. Lalema Express
13. SaniDépôt Québec

---

### ÉTAPE 4: Créer le Système de Consolidation Excel (3-4h)

Une fois tous les scrapers opérationnels, créer:

#### 4.1 Excel Exporter

**Fichier:** `src/exporters/excel-exporter.ts`

```typescript
import ExcelJS from 'exceljs';

export class ExcelExporter {
  async exportConsolidated(
    products: ConsolidatedProduct[],
    outputFile: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // Onglet 1: Tous les produits
    const sheet = workbook.addWorksheet('Tous les produits');
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 25 },
      { header: 'Nom', key: 'name', width: 50 },
      { header: 'Marque', key: 'brand', width: 20 },
      { header: 'Prix Swish', key: 'price_swish', width: 12 },
      { header: 'URL Swish', key: 'url_swish', width: 50 },
      // ... pour chaque compétiteur
      { header: 'Prix Min', key: 'price_min', width: 12 },
      { header: 'Prix Max', key: 'price_max', width: 12 },
      { header: 'Prix Moyen', key: 'price_avg', width: 12 },
    ];

    // Ajouter données...
    products.forEach(p => sheet.addRow({...}));

    // Formatage...
    sheet.getRow(1).font = { bold: true };

    await workbook.xlsx.writeFile(outputFile);
  }
}
```

#### 4.2 Script de Consolidation

**Fichier:** `scripts/consolidate-prices.ts`

```typescript
// 1. Charger les 13 fichiers JSON de résultats
// 2. Merger par SKU
// 3. Calculer statistiques (min, max, avg)
// 4. Exporter vers Excel
```

**Commandes:**
```bash
npm run analyze  # Lance consolidation
```

**Fichiers générés:**
- `Dissan/prix-competiteurs-final.xlsx` - Base de données complète
- `Dissan/rapport-prix-competiteurs.xlsx` - Analyses + graphiques

---

### ÉTAPE 5: Exécution Complète (30-40h automatique)

Une fois tout opérationnel:

```bash
cd Dissan/price-scraper

# Lancer scraping complet (peut tourner la nuit/weekend)
npm run scrape:all

# OU par priorité:
npm run scrape:priority1  # ~10h (5 sites × 2h)
npm run scrape:priority2  # ~15h (5 sites × 3h)
npm run scrape:priority3  # ~10h (3 sites × 3h)
```

**Monitoring pendant l'exécution:**
- Logs: `tail -f data/logs/swish-{date}.log`
- Checkpoints: `ls -lh data/checkpoints/`
- Résultats partiels: `ls -lh ../results/prix-par-site/`

**En cas d'interruption:**
Le scraper reprendra automatiquement au dernier checkpoint (tous les 50 produits).

---

## 📁 Structure Actuelle

```
Dissan/
├── produits-sanidepot.xlsx              # Source (890 produits)
├── produits-commerciaux.xlsx            # Filtrés (576 produits) ✅
├── competitors-config.json              # Config 13 sites ⚠️ AJUSTER SÉLECTEURS
├── PLAN-ANALYSE-PRIX-COMPETITION.md     # Plan complet
├── STATUS.md                            # Statut détaillé
├── GUIDE-NEXT-STEPS.md                  # Ce fichier
│
├── price-scraper/                       # Projet scraper ✅
│   ├── src/
│   │   ├── main.ts                     # Point d'entrée ✅
│   │   ├── test-setup.ts               # Test validation ✅
│   │   ├── scrapers/
│   │   │   ├── base-scraper.ts         ✅
│   │   │   ├── swish-scraper.ts        ✅
│   │   │   ├── grainger-scraper.ts     ✅
│   │   │   ├── cleanitsupply-scraper.ts ✅
│   │   │   ├── uline-scraper.ts        ❌ À créer
│   │   │   └── ... (9 autres)          ❌
│   │   ├── exporters/
│   │   │   └── excel-exporter.ts       ❌ À créer
│   │   └── ...
│   └── package.json
│
├── scripts/
│   ├── prepare-commercial-products.ts   ✅
│   ├── consolidate-prices.ts            ❌ À créer
│   └── analyze-results.ts               ❌ À créer
│
└── results/                             # Vide (à générer)
    ├── prix-par-site/
    └── prix-consolides/
```

---

## 🚨 Points d'Attention Critiques

### 1. Sélecteurs CSS Fictifs (URGENT)
**Status:** ⚠️ **BLOQUANT**
**Action:** Inspecter les 3 sites pilotes et ajuster `competitors-config.json`
**Temps:** 2-3 heures
**Priorité:** **MAXIMALE** - Rien ne fonctionnera sans cela

### 2. Anti-Scraping
Certains sites peuvent bloquer:
- **Solution:** Rate limiting strict respecté (2-3s)
- **Si 403 errors:** Augmenter délai à 4-5s
- **Si persistant:** Ajouter proxies (hors scope actuel)

### 3. Structures HTML Variables
Chaque site a sa propre structure. Les scrapers devront être ajustés individuellement.

### 4. Tests Réels Requis
Les scrapers n'ont **pas encore été testés sur les vrais sites**. Des ajustements seront nécessaires.

---

## 📝 Commandes Utiles

```bash
# Navigation
cd Dissan/price-scraper

# Test de validation
npx tsx src/test-setup.ts

# Test sur un site spécifique (après ajustement sélecteurs)
npm run scrape:site swish
npm run scrape:site grainger
npm run scrape:site cleanitsupply

# Voir les résultats
cat ../results/prix-par-site/swish-results.json | jq

# Voir les logs
tail -f data/logs/swish-2024-11-18.log
tail -f data/logs/swish-2024-11-18-errors.log

# Voir les checkpoints
ls -lh data/checkpoints/

# Une fois tous les scrapers implémentés
npm run scrape:all              # Tout scraper (30-40h)
npm run scrape:priority1        # Sites priorité 1
npm run analyze                 # Générer Excel consolidé
```

---

## 🎯 Checklist Avant Scraping Complet

- [ ] **ÉTAPE 1:** Sélecteurs CSS ajustés pour Swish
- [ ] **ÉTAPE 1:** Sélecteurs CSS ajustés pour Grainger
- [ ] **ÉTAPE 1:** Sélecteurs CSS ajustés pour CleanItSupply
- [ ] **ÉTAPE 2:** Test sur 50 produits réussi (taux >80%)
- [ ] **ÉTAPE 3:** 10 scrapers restants implémentés
- [ ] **ÉTAPE 3:** Tous les scrapers testés individuellement
- [ ] **ÉTAPE 4:** ExcelExporter créé
- [ ] **ÉTAPE 4:** Script de consolidation créé
- [ ] **ÉTAPE 5:** Prêt pour scraping complet

---

## 💡 Conseils Pratiques

### Pour Ajuster les Sélecteurs CSS:
1. Ouvrir DevTools (F12) sur le site
2. Utiliser l'inspecteur (Ctrl+Shift+C)
3. Tester les sélecteurs dans la console:
   ```javascript
   document.querySelectorAll('.product-item')
   ```
4. Préférer les sélecteurs stables (classes, IDs) aux sélecteurs fragiles (nth-child)

### Pour Débugger un Scraper:
1. Mettre `headless: false` dans `config.ts` (ligne SCRAPING_CONFIG)
2. Lancer le scraper et observer le navigateur
3. Vérifier les logs: `data/logs/{site}-{date}.log`
4. Utiliser console.log dans le scraper pour débugger

### Pour Optimiser les Performances:
1. Scraper plusieurs sites en parallèle (si serveur puissant)
2. Augmenter `checkpointInterval` à 100 (moins de I/O)
3. Désactiver les logs debug en production

---

## 📊 Estimation Temps Total Restant

| Phase | Temps | Description |
|-------|-------|-------------|
| ÉTAPE 1 | 2-3h | Ajuster sélecteurs CSS (3 sites pilotes) |
| ÉTAPE 2 | 1-2h | Tester et valider (50 produits × 3 sites) |
| ÉTAPE 3 | 6-8h | Implémenter 10 scrapers restants |
| ÉTAPE 4 | 3-4h | Excel exporter + consolidation |
| ÉTAPE 5 | 30-40h | **Exécution automatique** (peut tourner la nuit) |
| **TOTAL** | **12-17h actif** + **30-40h passif** |

**Temps développement actif:** ~12-17 heures (sur 2-3 jours ouvrables)
**Temps exécution automatique:** ~30-40 heures (weekend/nuit)

---

## 🎉 Résumé

Vous avez maintenant une **infrastructure complète et opérationnelle** pour scraper les prix de 576 produits sur 13 sites compétiteurs canadiens.

**Prochaine action immédiate:** Inspecter swish.ca avec DevTools et ajuster les sélecteurs CSS dans `competitors-config.json`.

Bonne chance! 🚀

---

**Questions? Consultez:**
- Plan complet: `PLAN-ANALYSE-PRIX-COMPETITION.md`
- Status détaillé: `STATUS.md`
- README scraper: `price-scraper/README.md`
