# Plan - Analyse de Prix Compétition

**Projet:** Extraction et analyse des prix compétiteurs pour le catalogue Dissan
**Date:** 18 novembre 2024
**Objectif:** Identifier les prix des produits commerciaux chez les compétiteurs canadiens

---

## Vue d'Ensemble

### Contexte
- **Source:** 890 produits extraits de SaniDépot (ecom.sanidepot.com)
- **Produits Dissan exclusifs:** 314 produits (35.3% - SKU commence par "M-")
- **Produits commerciaux:** 576 produits (64.7% - SKU sans "M-")
- **Scope:** Analyser les prix des **576 produits commerciaux uniquement**

### Objectifs
1. Identifier quels produits sont vendus par les compétiteurs
2. Extraire les prix pour analyse comparative
3. Générer un rapport Excel consolidé avec prix par compétiteur
4. Identifier les opportunités de tarification

### Méthode
- **Approche:** Web scraping automatisé (Playwright)
- **Matching:** Combinaison SKU exact + recherche par nom/marque
- **Compétiteurs:** 13 sites e-commerce canadiens prioritaires
- **Format de sortie:** Fichier Excel enrichi avec analyse

---

## Données Source - Analyse

### Structure du fichier produits-sanidepot.xlsx

**890 produits** répartis comme suit:

| Catégorie | Nombre | % | Caractéristique SKU |
|-----------|--------|---|---------------------|
| **Produits Dissan/Maison** | 314 | 35.3% | SKU commence par "M-" |
| **Produits Commerciaux** | 576 | 64.7% | SKU sans "M-" |

### Top 10 Marques Commerciales (à rechercher chez compétiteurs)

1. **Atlas Graham Furgale (ATL)** - 77 produits
2. **Rubbermaid (RUB)** - 44 produits
3. **SCA/Tork (SCA)** - 40 produits
4. **Chicopee (CHE)** - 27 produits
5. **Clarke (CLA)** - 26 produits
6. **M2 Professional (M2P)** - 26 produits
7. **Diversey (DIV)** - 22 produits
8. **Danco (DAN)** - 20 produits
9. **Cascades (CAS)** - 17 produits
10. **Zep (ZEP)** - 17 produits

**Total:** 72 marques commerciales différentes

### Exemples de SKU

**Format standard:** `[MARQUE]-[IDENTIFIANT]`

Exemples:
- `ATL-12600` - BREAKAWAY Dust mop wood handle 60''
- `RUB-9w32-00--bla` - INFINITY Wall mount smoking receptacle
- `SCA-461002` - Produit SCA/Tork
- `DIV-101104392` - Produit Diversey
- `ZEP-CNPRO36` - Zep Professional sprayer

---

## Compétiteurs Canadiens - Liste Complète

### Priorité 1 - Sites Nationaux Majeurs (5 sites)

| # | Nom | URL | Couverture | Notes |
|---|-----|-----|------------|-------|
| 1 | **Swish Maintenance** | swish.ca | National (13 emplacements) | Leader produits verts, depuis 1956 |
| 2 | **Grainger Canada** | grainger.ca | National | 125+ ans, spécialiste MRO |
| 3 | **ULINE Canada** | uline.ca | National (14 emplacements NA) | 43,000+ produits, livraison même jour |
| 4 | **Bunzl Cleaning & Hygiene** | bunzlch.ca | National | Plus grand distributeur Canada |
| 5 | **Imperial Dade Canada** | imperialdade.com | National (35 emplacements) | 135 ans, 1500 employés |

### Priorité 2 - E-commerce Spécialisés (5 sites)

| # | Nom | URL | Couverture | Notes |
|---|-----|-----|------------|-------|
| 6 | **CleanItSupply Canada** | cleanitsupply.ca | National | Prix de gros, large sélection |
| 7 | **United Canada Inc.** | unitedcanadainc.com | National (Toronto) | Multi-secteurs (médical, janitorial) |
| 8 | **NexDay Supply** | nexdaysupply.ca | National | Distributeur gros, livraison rapide |
| 9 | **Clean Spot** | cleanspot.ca | National | Rabais jusqu'à 35% grossistes |
| 10 | **Checkers Cleaning Supply** | checkerscleaningsupply.com | National | Depuis 1983, livraison même jour |

### Priorité 3 - Distributeurs Québec (3 sites)

| # | Nom | URL | Couverture | Notes |
|---|-----|-----|------------|-------|
| 11 | **V-TO inc.** | vto.qc.ca | Québec | Fabricant + distributeur, 3e génération |
| 12 | **Lalema Express** | lalemaexpress.com | Québec (Montréal) | Catalogue complet en ligne |
| 13 | **SaniDépôt** | sani-depot.ca | Québec | 90+ ans expérience |

### Sites Secondaires (pour phase future)

14. CleanSource Inc. (cleansourceinc.com)
15. A1 Cash and Carry (a1cashandcarry.com) - Ontario
16. Linen Plus Canada (linenplus.ca)
17. Costco Business Centre (costcobusinesscentre.ca)
18. Home Depot Canada (homedepot.ca)
19. Cintas Canada (cintas.com)

---

## Phase 1: Préparation des Données

**Durée estimée:** 1-2 heures

### 1.1 Analyse et filtrage du fichier source

**Tâches:**
1. Lire `Dissan/produits-sanidepot.xlsx`
2. Identifier et filtrer les produits commerciaux (SKU sans "M-")
3. Extraire les informations clés de chaque produit

**Script:** `Dissan/scripts/prepare-commercial-products.ts`

**Données extraites par produit:**
- SKU original (format "SKU  [CODE]")
- SKU nettoyé (sans préfixe "SKU  ")
- Marque (extraite du SKU - préfixe avant "-")
- Nom du produit
- Nom nettoyé (normalisé pour recherche)
- Catégorie
- Description
- URL source SaniDépot
- Statut stock
- Images

**Sortie:** `Dissan/produits-commerciaux.xlsx`

### 1.2 Configuration des compétiteurs

**Fichier:** `Dissan/competitors-config.json`

**Structure:**
```json
{
  "competitors": [
    {
      "id": "swish",
      "name": "Swish Maintenance",
      "url": "https://swish.ca",
      "priority": 1,
      "search_url": "https://swish.ca/search",
      "selectors": {
        "searchBox": "#search-input",
        "productLink": ".product-item a",
        "productName": ".product-title",
        "productSku": ".product-sku",
        "productPrice": ".product-price"
      }
    },
    // ... autres compétiteurs
  ]
}
```

### 1.3 Création de la structure de projet

**Arborescence:**
```
Dissan/
├── produits-sanidepot.xlsx (existant)
├── produits-commerciaux.xlsx (nouveau)
├── competitors-config.json (nouveau)
├── price-scraper/ (nouveau)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── main.ts
│   │   ├── scrapers/
│   │   │   ├── base-scraper.ts
│   │   │   ├── swish-scraper.ts
│   │   │   ├── grainger-scraper.ts
│   │   │   └── ...
│   │   ├── matchers/
│   │   │   ├── sku-matcher.ts
│   │   │   └── name-matcher.ts
│   │   ├── utils/
│   │   │   ├── rate-limiter.ts
│   │   │   ├── checkpoint-manager.ts
│   │   │   └── logger.ts
│   │   └── exporters/
│   │       └── excel-exporter.ts
│   └── data/
│       ├── checkpoints/
│       └── logs/
├── scripts/
│   ├── prepare-commercial-products.ts
│   └── analyze-results.ts
└── results/ (nouveau)
    ├── prix-par-site/
    └── prix-consolides/
```

---

## Phase 2: Infrastructure de Scraping

**Durée estimée:** 3-4 heures

### 2.1 Architecture Modulaire

**Principe:** Un scraper de base (classe abstraite) + scrapers spécifiques par site

**Classe de base:** `BaseScraper` (base-scraper.ts)

```typescript
abstract class BaseScraper {
  protected browser: Browser;
  protected page: Page;
  protected competitorId: string;
  protected config: CompetitorConfig;
  protected rateLimiter: RateLimiter;
  protected checkpointManager: CheckpointManager;

  // Méthodes abstraites (à implémenter par scrapers spécifiques)
  abstract searchBySku(sku: string): Promise<SearchResult>;
  abstract searchByName(name: string, brand: string): Promise<SearchResult>;
  abstract extractProductDetails(url: string): Promise<ProductDetails>;

  // Méthodes communes
  async init(): Promise<void>;
  async close(): Promise<void>;
  protected async navigate(url: string): Promise<void>;
  protected async delay(ms: number): Promise<void>;
  protected async retry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T>;
}
```

**Scrapers spécifiques:** Héritent de `BaseScraper`

Exemple: `SwishScraper` (swish-scraper.ts)
```typescript
class SwishScraper extends BaseScraper {
  async searchBySku(sku: string): Promise<SearchResult> {
    // Implémentation spécifique à Swish
    // 1. Naviguer vers page de recherche
    // 2. Entrer SKU dans barre de recherche
    // 3. Parser résultats
    // 4. Retourner produit si match exact
  }

  async searchByName(name: string, brand: string): Promise<SearchResult> {
    // Recherche par nom + marque
  }

  async extractProductDetails(url: string): Promise<ProductDetails> {
    // Extraire prix, disponibilité, etc.
  }
}
```

### 2.2 Stratégie de Matching des Produits

**Approche en 2 étapes (cascade):**

#### Étape 1: Recherche par SKU exact (priorité haute)
- Rechercher le SKU nettoyé dans la barre de recherche
- Vérifier si résultat exact (SKU identique)
- Si match → extraire prix et détails
- Si pas de match → passer à l'étape 2

#### Étape 2: Recherche par nom + marque (fallback)
- Construire requête: `"[MARQUE] [NOM_PRODUIT]"`
- Exemple: `"Rubbermaid WAVEBRAKE Bucket"`
- Filtrer résultats par similarité de nom (>80% Levenshtein)
- Vérifier correspondance marque
- Si match confiant (>80%) → extraire prix
- Si pas de match ou faible confiance → marquer "non trouvé"

**Fichier:** `sku-matcher.ts` + `name-matcher.ts`

### 2.3 Rate Limiting et Politesse

**Configuration:**
- Délai entre requêtes: **2-3 secondes**
- Délai entre produits: **1 seconde**
- Timeout requête: **30 secondes**
- Max retry: **3 tentatives**
- User-Agent rotation: **5 user-agents différents**

**Fichier:** `rate-limiter.ts`

```typescript
class RateLimiter {
  private lastRequestTime: number = 0;
  private minDelay: number = 2000; // 2 sec

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}
```

### 2.4 Système de Checkpoint

**Objectif:** Reprendre le scraping en cas d'interruption

**Fichier:** `checkpoint-manager.ts`

**Checkpoint sauvegardé tous les 50 produits:**
```json
{
  "competitorId": "swish",
  "lastProcessedProductIndex": 245,
  "lastProcessedSku": "ATL-12600",
  "totalProducts": 576,
  "successCount": 187,
  "notFoundCount": 58,
  "timestamp": "2024-11-18T20:30:00Z",
  "results": [
    {
      "sku": "ATL-12600",
      "found": true,
      "price": 15.99,
      "url": "https://swish.ca/products/...",
      "matchType": "sku"
    }
    // ...
  ]
}
```

### 2.5 Gestion des Erreurs

**Types d'erreurs à gérer:**
- Timeout (30s)
- 403 Forbidden (rate limiting détecté)
- 404 Not Found (page n'existe pas)
- Sélecteur introuvable (structure HTML changée)
- Connexion réseau perdue

**Stratégie:**
- Retry 3x avec délai exponentiel (2s, 4s, 8s)
- Si échec après 3 tentatives → marquer produit comme "erreur"
- Logger erreur détaillée
- Continuer avec produit suivant
- Sauvegarder checkpoint

---

## Phase 3: Développement Sites Pilotes

**Durée estimée:** 4-6 heures

### 3.1 Sélection des sites pilotes

**3 sites choisis pour test:**

1. **Swish.ca** (référence canadienne)
   - Site canadien bien établi
   - Interface e-commerce standard
   - Bon candidat pour validation

2. **Grainger.ca** (gros catalogue)
   - Très gros catalogue (100,000+ produits)
   - Moteur de recherche puissant
   - Test de performance

3. **CleanItSupply.ca** (e-commerce simple)
   - Structure HTML simple
   - Bon pour développement initial
   - Moins de protections anti-scraping

### 3.2 Implémentation des 3 scrapers pilotes

**Fichiers à créer:**
- `src/scrapers/swish-scraper.ts`
- `src/scrapers/grainger-scraper.ts`
- `src/scrapers/cleanitsupply-scraper.ts`

**Chaque scraper implémente:**
- `searchBySku()`: Recherche par SKU
- `searchByName()`: Recherche par nom/marque
- `extractProductDetails()`: Extraction prix et détails

### 3.3 Test sur échantillon de 50 produits

**Sélection de l'échantillon:**
- 25 produits haute fréquence:
  - 10 produits Rubbermaid (RUB)
  - 8 produits Atlas Graham (ATL)
  - 7 produits SCA/Tork (SCA)

- 25 produits variés (autres marques):
  - 5 produits Diversey (DIV)
  - 5 produits Zep (ZEP)
  - 5 produits Cascades (CAS)
  - 10 produits marques moins communes

**Fichier:** `Dissan/test-sample-50-products.xlsx`

### 3.4 Métriques de succès

**Mesures à collecter:**

| Métrique | Description | Objectif |
|----------|-------------|----------|
| **Taux de match SKU** | % produits trouvés par SKU exact | >60% |
| **Taux de match Nom** | % produits trouvés par nom/marque | >25% |
| **Taux total trouvé** | % produits trouvés (SKU + Nom) | >80% |
| **Précision prix** | % prix extraits correctement | >95% |
| **Temps moyen/produit** | Temps pour scraper 1 produit | <10s |
| **Taux d'erreur** | % requêtes en erreur (timeout, 403) | <5% |

**Fichier de rapport:** `Dissan/results/pilot-test-report.json`

### 3.5 Validation et ajustements

**Validation manuelle (échantillon de 20 produits):**
1. Vérifier que le produit trouvé correspond au bon produit
2. Vérifier que le prix extrait est correct
3. Vérifier que l'URL du produit est valide

**Ajustements si nécessaire:**
- Optimiser sélecteurs CSS/XPath
- Ajuster stratégie de matching (seuil de similarité)
- Modifier rate limiting si trop d'erreurs 403
- Corriger bugs d'extraction de prix

---

## Phase 4: Déploiement Complet

**Durée estimée:** 2-3 jours (incluant temps d'exécution)

### 4.1 Implémentation scrapers Priorité 1 (5 sites)

**Sites à implémenter:**
1. Swish (déjà fait en Phase 3)
2. Grainger (déjà fait en Phase 3)
3. ULINE
4. Bunzl
5. Imperial Dade

**Processus par site:**
1. Analyser structure HTML du site
2. Identifier sélecteurs (barre recherche, résultats, prix)
3. Implémenter scraper spécifique
4. Tester sur 50 produits échantillon
5. Valider taux de succès >75%
6. Déployer sur les 576 produits

**Durée:** ~6-8h de développement + 10-12h d'exécution automatique

### 4.2 Implémentation scrapers Priorité 2 (5 sites)

**Sites à implémenter:**
6. CleanItSupply (déjà fait en Phase 3)
7. United Canada
8. NexDay Supply
9. Clean Spot
10. Checkers Cleaning Supply

**Même processus que Priorité 1**

**Durée:** ~6-8h de développement + 10-12h d'exécution automatique

### 4.3 Implémentation scrapers Priorité 3 (3 sites)

**Sites à implémenter:**
11. V-TO
12. Lalema Express
13. SaniDépôt Québec

**Même processus**

**Durée:** ~4h de développement + 6-8h d'exécution automatique

### 4.4 Exécution complète (576 produits × 13 sites)

**Configuration d'exécution:**
- Mode background avec logs détaillés
- Checkpoint tous les 50 produits
- Rapport de progression en temps réel
- Alertes en cas d'erreurs critiques

**Commande:**
```bash
cd Dissan/price-scraper
npm run scrape:all
```

**Durée totale estimée:** 30-40 heures d'exécution automatique
- ~2-3 heures par site × 13 sites
- Peut être lancé la nuit / weekend

**Fichiers générés:**
```
Dissan/results/prix-par-site/
├── swish-results.json (576 produits)
├── grainger-results.json
├── uline-results.json
├── bunzl-results.json
├── imperial-dade-results.json
├── cleanitsupply-results.json
├── united-canada-results.json
├── nexday-results.json
├── cleanspot-results.json
├── checkers-results.json
├── vto-results.json
├── lalema-results.json
└── sanidepot-qc-results.json
```

---

## Phase 5: Consolidation et Export Excel

**Durée estimée:** 2-3 heures

### 5.1 Consolidation des données

**Script:** `Dissan/scripts/consolidate-prices.ts`

**Processus:**
1. Charger les 13 fichiers JSON de résultats
2. Merger par SKU (clé unique)
3. Calculer statistiques par produit:
   - Prix minimum trouvé
   - Prix maximum trouvé
   - Prix moyen
   - Nombre de sources (combien de sites ont le produit)
   - Écart % entre min et max
   - Liste des compétiteurs qui vendent le produit

4. Enrichir avec données source (nom, marque, catégorie)

**Format consolidé:**
```json
{
  "sku": "ATL-12600",
  "nom": "BREAKAWAY Dust mop wood handle 60''",
  "marque": "Atlas Graham Furgale",
  "categorie": "Mops, handles and frames",
  "prix": {
    "sanidepot": null,
    "swish": { "price": 15.99, "url": "...", "found": true },
    "grainger": { "price": 17.50, "url": "...", "found": true },
    "uline": { "price": 16.25, "url": "...", "found": true },
    "bunzl": { "price": null, "found": false },
    "imperial_dade": { "price": 15.75, "url": "...", "found": true },
    // ... autres sites
  },
  "stats": {
    "prix_min": 15.75,
    "prix_max": 17.50,
    "prix_moyen": 16.37,
    "nb_sources": 4,
    "ecart_pct": 11.1,
    "sites_vendeurs": ["swish", "grainger", "uline", "imperial_dade"]
  }
}
```

### 5.2 Export Excel principal

**Fichier:** `Dissan/prix-competiteurs-final.xlsx`

**Structure:**

#### Onglet 1: "Tous les produits" (576 lignes)

Colonnes:
- **A:** SKU
- **B:** Nom produit
- **C:** Marque
- **D:** Catégorie
- **E:** Prix SaniDépot (si disponible)
- **F:** Prix Swish
- **G:** URL Swish
- **H:** Prix Grainger
- **I:** URL Grainger
- **J:** Prix ULINE
- **K:** URL ULINE
- ... (3 colonnes par compétiteur: Prix, URL, Date)
- **AO:** Prix Min
- **AP:** Prix Max
- **AQ:** Prix Moyen
- **AR:** Nb Sources
- **AS:** Écart %
- **AT:** Sites vendeurs

**Formatage:**
- En-têtes en gras, couleur bleue
- Prix formatés en $ CAD (ex: 15,99 $)
- URLs cliquables
- Filtres automatiques activés
- Colonnes redimensionnées

#### Onglet 2: "Résumé par marque"

Statistiques agrégées par marque:
- Marque
- Nb produits
- Nb produits trouvés
- % couverture
- Prix moyen
- Prix min
- Prix max

#### Onglet 3: "Résumé par compétiteur"

Statistiques par site:
- Compétiteur
- Nb produits trouvés
- % couverture (sur 576)
- Prix moyen
- Durée scraping
- Taux d'erreur

### 5.3 Rapport d'analyse détaillé

**Fichier:** `Dissan/rapport-prix-competiteurs.xlsx`

**Onglets:**

#### 1. "Vue d'ensemble"
- Statistiques globales du projet
- Taux de succès total
- Temps d'exécution
- Problèmes rencontrés

#### 2. "Analyse par compétiteur"
- Tableau comparatif des 13 sites
- Graphiques de couverture
- Analyse des prix moyens

#### 3. "Produits non trouvés"
- Liste des produits introuvables (<3 sources)
- Raisons probables
- Recommandations

#### 4. "Outliers de prix"
- Produits avec écarts >50% entre min/max
- Analyse des différences
- Opportunités de repositionnement

#### 5. "Analyse par catégorie"
- Prix moyens par catégorie de produit
- Compétitivité par segment

#### 6. "Recommandations"
- Produits à prix compétitifs
- Produits à ajuster
- Opportunités de marché

### 5.4 Fichiers de logs et documentation

**Logs générés:**
```
Dissan/price-scraper/data/logs/
├── scraping-2024-11-18.log (log complet)
├── errors-2024-11-18.log (erreurs uniquement)
└── stats-2024-11-18.json (statistiques)
```

**Documentation:**
```
Dissan/
├── PLAN-ANALYSE-PRIX-COMPETITION.md (ce fichier)
└── GUIDE-UTILISATION-SCRAPER.md (guide utilisateur)
```

---

## Livrables Finaux

### Fichiers Excel
1. **`produits-commerciaux.xlsx`**
   - 576 produits commerciaux filtrés
   - Colonnes: SKU, Nom, Marque, Catégorie, Description

2. **`prix-competiteurs-final.xlsx`**
   - Base de données complète des prix
   - 576 lignes × 40+ colonnes
   - Prix de 13 compétiteurs + statistiques

3. **`rapport-prix-competiteurs.xlsx`**
   - Analyses et insights
   - Graphiques et visualisations
   - Recommandations stratégiques

### Code Source
```
Dissan/price-scraper/
├── package.json
├── tsconfig.json
├── src/ (code TypeScript complet)
└── README.md
```

### Configuration
```
Dissan/
├── competitors-config.json (config des 13 sites)
└── scraper-config.json (paramètres globaux)
```

### Scripts Utilitaires

1. **`run-scraper.sh`**
   ```bash
   #!/bin/bash
   # Lance le scraping complet (13 sites × 576 produits)
   cd Dissan/price-scraper
   npm run scrape:all
   ```

2. **`update-prices.sh`**
   ```bash
   #!/bin/bash
   # Met à jour les prix (mode incrémental)
   cd Dissan/price-scraper
   npm run scrape:update
   ```

3. **`analyze-results.sh`**
   ```bash
   #!/bin/bash
   # Génère les rapports d'analyse
   cd Dissan/scripts
   npx tsx analyze-results.ts
   ```

4. **`test-scraper.sh`**
   ```bash
   #!/bin/bash
   # Test sur 50 produits échantillon
   cd Dissan/price-scraper
   npm run scrape:test
   ```

### Documentation

1. **`PLAN-ANALYSE-PRIX-COMPETITION.md`** (ce fichier)
   - Plan complet du projet
   - Architecture technique
   - Phases d'implémentation

2. **`GUIDE-UTILISATION-SCRAPER.md`**
   - Instructions d'utilisation
   - Commandes disponibles
   - Troubleshooting
   - Maintenance

---

## Calendrier d'Exécution

### Semaine 1

**Jour 1 (4h):**
- Phase 1: Préparation des données (2h)
- Phase 2: Infrastructure (2h)

**Jour 2 (6h):**
- Phase 2: Infrastructure (suite - 2h)
- Phase 3: Sites pilotes (4h)

**Jour 3 (4h):**
- Phase 3: Sites pilotes (suite - 2h)
- Phase 4: Début Priorité 1 (2h)

### Semaine 2

**Jour 4-5 (background):**
- Phase 4: Exécution automatique Priorité 1 (24h)
- Monitoring et correction erreurs

**Jour 6-7 (background):**
- Phase 4: Exécution automatique Priorité 2 (24h)
- Monitoring

### Semaine 3

**Jour 8 (background):**
- Phase 4: Exécution automatique Priorité 3 (12h)

**Jour 9 (3h):**
- Phase 5: Consolidation des données
- Génération Excel final

**Jour 10 (2h):**
- Phase 5: Rapports d'analyse
- Documentation finale
- Livraison

---

## Estimation Temps Total

| Phase | Développement | Exécution | Total |
|-------|---------------|-----------|-------|
| Phase 1: Préparation | 2h | - | 2h |
| Phase 2: Infrastructure | 4h | - | 4h |
| Phase 3: Sites pilotes | 6h | 2h | 8h |
| Phase 4: Déploiement | 16h | 30-40h | 46-56h |
| Phase 5: Consolidation | 3h | - | 3h |
| **TOTAL** | **31h** | **32-42h** | **63-73h** |

**Temps actif (développement):** 31 heures (~4 jours ouvrables)
**Temps passif (exécution automatique):** 32-42 heures (peut tourner la nuit/weekend)

---

## Risques et Mitigation

### Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Bannissement IP** (403) | Moyen | Élevé | Rate limiting strict, rotation User-Agent, proxies si nécessaire |
| **Changement structure HTML** | Moyen | Moyen | Sélecteurs flexibles, fallback, tests réguliers |
| **Timeout/connexion** | Faible | Moyen | Retry logic, checkpoint, logs détaillés |
| **Produits non trouvés** | Élevé | Faible | Matching en 2 étapes (SKU + Nom), acceptable si <20% |
| **Prix mal extraits** | Moyen | Élevé | Validation format, tests sur échantillon, logs |
| **Scraping trop lent** | Moyen | Moyen | Optimisation rate limiting après Phase 3 |

### Risques Opérationnels

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Données source incorrectes** | Faible | Élevé | Validation Phase 1, échantillonnage |
| **Besoins changent en cours** | Moyen | Moyen | Architecture modulaire, config externe |
| **Maintenance future** | Élevé | Moyen | Documentation complète, code commenté |

---

## Notes Techniques Importantes

### Conformité et Éthique

**Légalité du web scraping au Canada:**
- ✅ Scraping de données publiques est généralement légal
- ✅ Respect des conditions d'utilisation des sites
- ✅ Rate limiting pour ne pas surcharger les serveurs
- ✅ Pas d'authentification non autorisée
- ✅ Usage commercial interne (analyse de marché)

**Bonnes pratiques:**
- Respecter robots.txt si présent
- Identifier le bot (User-Agent descriptif)
- Limiter fréquence des requêtes (2-3 sec)
- Ne pas scraper hors heures d'ouverture (respect serveurs)

### Technologies Utilisées

**Stack technique:**
- **Langage:** TypeScript (cohérence avec projet existant)
- **Scraping:** Playwright (déjà installé, performant)
- **Excel:** ExcelJS (déjà utilisé dans scrape-sanidepot.ts)
- **Logging:** Winston ou console simple
- **Configuration:** JSON files

**Dépendances (package.json):**
```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "exceljs": "^4.3.0",
    "string-similarity": "^4.0.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

### Performance et Optimisation

**Optimisations possibles après Phase 3:**
1. **Parallélisation:** Scraper plusieurs sites en parallèle
2. **Caching:** Garder résultats intermédiaires
3. **Smart retry:** Augmenter délai progressivement si erreurs
4. **Sélecteurs XPath:** Plus rapides que CSS pour certains cas

**Métriques de performance cibles:**
- Temps/produit: <10 secondes
- Taux de succès: >80%
- Taux d'erreur: <5%

---

## Suivi et Maintenance

### Mise à jour des prix

**Fréquence recommandée:** Mensuelle ou trimestrielle

**Script de mise à jour:**
```bash
./update-prices.sh
```

Fonctionnement:
1. Charge les résultats précédents
2. Re-scrape uniquement les produits trouvés la dernière fois
3. Met à jour le fichier Excel
4. Compare avec prix précédents (delta %)

### Monitoring

**Logs à surveiller:**
- Taux d'erreur par site
- Temps d'exécution
- Nombre de produits trouvés (variations)

**Alertes:**
- Si taux d'erreur >20% sur un site → vérifier structure HTML
- Si temps d'exécution double → optimiser ou vérifier connexion
- Si produits trouvés chute >30% → vérifier sélecteurs

---

## Prochaines Étapes

### Après Phase 5 (Extensions futures possibles)

1. **Automatisation complète**
   - Cron job mensuel
   - Export automatique vers Google Sheets
   - Alertes email si prix changent significativement

2. **Visualisation avancée**
   - Dashboard PowerBI ou Tableau
   - Graphiques d'évolution des prix
   - Heatmaps de compétitivité

3. **Expansion**
   - Ajouter les 15 sites secondaires
   - Scraper marchés internationaux (US)
   - Intégrer données de vente pour ROI

4. **Intelligence artificielle**
   - Prédiction évolution des prix
   - Recommandations automatiques de tarification
   - Détection d'opportunités de marché

---

## Contact et Support

**Développeur:** Claude Code
**Date:** 18 novembre 2024
**Version:** 1.0

**En cas de questions:**
- Documentation: `Dissan/GUIDE-UTILISATION-SCRAPER.md`
- Logs: `Dissan/price-scraper/data/logs/`
- Issues: Créer un ticket avec détails de l'erreur

---

## Annexes

### Annexe A: Exemple de résultat consolidé

Extrait de `prix-competiteurs-final.xlsx`:

| SKU | Nom | Marque | Swish | Grainger | ULINE | Prix Min | Prix Max | Nb Sources | Écart % |
|-----|-----|--------|-------|----------|-------|----------|----------|------------|---------|
| ATL-12600 | BREAKAWAY Dust mop wood handle 60'' | Atlas Graham | 15,99$ | 17,50$ | 16,25$ | 15,99$ | 17,50$ | 3 | 9.4% |
| RUB-9w32-00--bla | INFINITY Wall mount smoking receptacle | Rubbermaid | 89,99$ | 94,50$ | - | 89,99$ | 94,50$ | 2 | 5.0% |
| SCA-461002 | Tork Matic Hand Towel Roll | SCA/Tork | 45,50$ | 46,99$ | 44,75$ | 44,75$ | 46,99$ | 3 | 5.0% |

### Annexe B: Exemple de configuration compétiteur

Extrait de `competitors-config.json`:

```json
{
  "id": "swish",
  "name": "Swish Maintenance",
  "url": "https://swish.ca",
  "priority": 1,
  "enabled": true,
  "search": {
    "url": "https://swish.ca/search",
    "method": "GET",
    "param": "q"
  },
  "selectors": {
    "searchBox": "#search-input",
    "searchButton": "button[type='submit']",
    "productList": ".product-grid .product-item",
    "productLink": "a.product-link",
    "productName": ".product-title",
    "productSku": ".product-sku",
    "productPrice": ".product-price .price-value",
    "noResults": ".no-results-message"
  },
  "pagination": {
    "enabled": true,
    "selector": ".pagination .next-page",
    "maxPages": 5
  },
  "rateLimiting": {
    "requestDelay": 2000,
    "productDelay": 1000
  }
}
```

### Annexe C: Commandes disponibles

**Développement et test:**
```bash
npm run dev              # Mode développement
npm run test             # Tests unitaires
npm run test:scraper     # Test sur 50 produits
```

**Production:**
```bash
npm run scrape:all       # Scraping complet (13 sites)
npm run scrape:priority1 # Seulement sites priorité 1
npm run scrape:site swish # Scraper un seul site
npm run scrape:update    # Mise à jour incrémentale
```

**Analyse:**
```bash
npm run analyze          # Générer rapports Excel
npm run stats            # Afficher statistiques
npm run validate         # Valider résultats
```

---

**FIN DU PLAN**
