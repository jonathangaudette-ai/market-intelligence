# Dissan Price Scraper

Web scraper automatisé pour l'analyse de prix compétiteurs sur 13 sites canadiens.

## 📊 Vue d'Ensemble

**Objectif:** Extraire les prix de 576 produits commerciaux Dissan chez 13 compétiteurs canadiens

**Méthode:** Web scraping automatisé avec Playwright + Matching intelligent (SKU + Nom)

**Output:** Fichier Excel consolidé avec prix par compétiteur + statistiques

## 🏗️ Architecture

```
price-scraper/
├── src/
│   ├── main.ts                    # Point d'entrée principal
│   ├── config.ts                  # Configuration globale
│   ├── types.ts                   # Types TypeScript
│   ├── scrapers/
│   │   ├── base-scraper.ts        # Classe de base abstraite
│   │   ├── swish-scraper.ts       # Scraper Swish
│   │   ├── grainger-scraper.ts    # Scraper Grainger
│   │   └── ...                    # Autres scrapers
│   ├── matchers/
│   │   ├── sku-matcher.ts         # Matching par SKU exact
│   │   └── name-matcher.ts        # Matching par nom/marque
│   ├── utils/
│   │   ├── rate-limiter.ts        # Rate limiting
│   │   ├── checkpoint-manager.ts  # Gestion checkpoints
│   │   └── logger.ts              # Logging
│   └── exporters/
│       └── excel-exporter.ts      # Export Excel
├── data/
│   ├── checkpoints/               # Sauvegardes progression
│   └── logs/                      # Fichiers de logs
└── package.json
```

## 🎯 Compétiteurs (13 sites)

### Priorité 1 (5 sites nationaux)
1. **Swish Maintenance** (swish.ca) - Leader produits verts
2. **Grainger Canada** (grainger.ca) - 100,000+ produits MRO
3. **ULINE Canada** (uline.ca) - 43,000+ produits
4. **Bunzl Cleaning & Hygiene** (bunzlch.ca) - Plus grand distributeur
5. **Imperial Dade** (imperialdade.com) - 35 emplacements

### Priorité 2 (5 sites e-commerce)
6. **CleanItSupply** (cleanitsupply.ca) - Prix de gros
7. **United Canada** (unitedcanadainc.com) - Multi-secteurs
8. **NexDay Supply** (nexdaysupply.ca) - Livraison rapide
9. **Clean Spot** (cleanspot.ca) - Rabais grossistes
10. **Checkers Cleaning** (checkerscleaningsupply.com) - Depuis 1983

### Priorité 3 (3 sites Québec)
11. **V-TO inc.** (vto.qc.ca) - Fabricant/distributeur QC
12. **Lalema Express** (lalemaexpress.com) - Montréal
13. **SaniDépôt** (sani-depot.ca) - 90+ ans expérience

## 🚀 Installation

```bash
cd Dissan/price-scraper
npm install
npx playwright install
```

## 📝 Commandes Disponibles

### Développement et Test
```bash
npm run dev              # Mode développement
npm run scrape:test      # Test sur 50 produits échantillon
```

### Production
```bash
npm run scrape:all       # Scraping complet (13 sites × 576 produits)
npm run scrape:priority1 # Sites priorité 1 uniquement
npm run scrape:priority2 # Sites priorité 2 uniquement
npm run scrape:priority3 # Sites priorité 3 uniquement
npm run scrape:site swish # Scraper un seul site
npm run scrape:update    # Mise à jour incrémentale (re-scrape produits trouvés)
```

### Analyse
```bash
npm run analyze          # Générer rapports Excel consolidés
npm run stats            # Afficher statistiques de progression
npm run validate         # Valider résultats (cohérence prix, URLs)
```

## 🔧 Configuration

### Fichiers de Config
- `../competitors-config.json` - Configuration des 13 sites (sélecteurs CSS, rate limiting)
- `src/config.ts` - Paramètres globaux du scraper

### Paramètres Clés
- **Rate Limiting:** 2-3 secondes entre requêtes
- **Timeout:** 30 secondes par requête
- **Max Retries:** 3 tentatives
- **Checkpoint:** Sauvegarde tous les 50 produits
- **User-Agent:** Rotation de 5 user-agents

## 🎯 Stratégie de Matching

### Étape 1: Recherche par SKU exact (priorité haute)
1. Rechercher le SKU nettoyé dans la barre de recherche
2. Vérifier si résultat exact (SKU identique)
3. Si match → extraire prix et détails
4. Si pas de match → passer à l'étape 2

### Étape 2: Recherche par Nom + Marque (fallback)
1. Construire requête: `"[MARQUE] [NOM_PRODUIT]"`
2. Exemple: `"Rubbermaid WAVEBRAKE Bucket"`
3. Filtrer résultats par similarité de nom (>80% Levenshtein)
4. Vérifier correspondance marque
5. Si match confiant → extraire prix
6. Sinon → marquer "non trouvé"

## 📂 Fichiers Générés

### Résultats par Site
```
../results/prix-par-site/
├── swish-results.json         # 576 produits Swish
├── grainger-results.json      # 576 produits Grainger
├── ...
└── sanidepot-qc-results.json  # 576 produits SaniDépôt
```

### Rapports Consolidés
```
../prix-competiteurs-final.xlsx      # Base de données complète (576 lignes × 40+ colonnes)
../rapport-prix-competiteurs.xlsx    # Analyses, graphiques, recommandations
```

### Logs
```
data/logs/
├── scraping-2024-11-18.log    # Log complet
├── errors-2024-11-18.log      # Erreurs uniquement
└── stats-2024-11-18.json      # Statistiques JSON
```

## 📊 Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| Taux de match SKU | >60% |
| Taux de match Nom | >25% |
| Taux total trouvé | >80% |
| Précision prix | >95% |
| Temps moyen/produit | <10s |
| Taux d'erreur | <5% |

## 🛡️ Gestion des Erreurs

### Types d'Erreurs
- **Timeout** (30s) → Retry 3x avec délai exponentiel
- **403 Forbidden** → Rate limiting détecté, augmenter délais
- **404 Not Found** → Page n'existe pas, marquer comme "non trouvé"
- **Sélecteur introuvable** → Structure HTML changée, vérifier sélecteurs
- **Connexion perdue** → Retry avec backoff exponentiel

### Stratégie de Recovery
1. Retry automatique (max 3 tentatives)
2. Sauvegarde checkpoint tous les 50 produits
3. Logs détaillés pour debugging
4. Continuer avec produit suivant en cas d'échec

## 🔄 Mise à Jour des Prix

**Fréquence recommandée:** Mensuelle ou trimestrielle

```bash
npm run scrape:update
```

**Fonctionnement:**
1. Charge résultats précédents
2. Re-scrape uniquement produits trouvés la dernière fois
3. Met à jour fichier Excel
4. Compare avec prix précédents (delta %)

## 📈 Monitoring

### Logs à Surveiller
- Taux d'erreur par site
- Temps d'exécution
- Nombre de produits trouvés (variations)

### Alertes
- Si taux d'erreur >20% sur un site → vérifier structure HTML
- Si temps d'exécution double → optimiser ou vérifier connexion
- Si produits trouvés chute >30% → vérifier sélecteurs

## 🚨 Troubleshooting

### Problème: Bannissement IP (403)
**Solution:** Augmenter rate limiting (3-4s), utiliser proxies

### Problème: Produits non trouvés (>30%)
**Solution:** Vérifier sélecteurs CSS, ajuster stratégie de matching

### Problème: Prix mal extraits
**Solution:** Vérifier format prix (regex), valider sélecteur `.product-price`

### Problème: Timeout fréquents
**Solution:** Augmenter timeout (45s), vérifier connexion internet

## 📋 Conformité et Éthique

**Légalité du web scraping au Canada:**
- ✅ Scraping de données publiques généralement légal
- ✅ Respect des conditions d'utilisation
- ✅ Rate limiting pour ne pas surcharger serveurs
- ✅ Pas d'authentification non autorisée
- ✅ Usage commercial interne (analyse de marché)

**Bonnes pratiques:**
- Respecter robots.txt si présent
- Identifier le bot (User-Agent descriptif)
- Limiter fréquence requêtes (2-3 sec)
- Scraper pendant heures ouverture

## 📞 Support

**Documentation:** `../PLAN-ANALYSE-PRIX-COMPETITION.md`
**Guide Utilisateur:** `../GUIDE-UTILISATION-SCRAPER.md` (à créer)
**Logs:** `data/logs/`

## 📄 License

MIT License - Usage interne Dissan
