# 🚀 Démarrage Rapide - Analyse Prix Compétition

**Statut:** ✅ 100% PRÊT
**Temps d'exécution:** 30-40h (automatique en arrière-plan)

---

## Étapes d'Exécution

### 1. Test de l'Installation (2 min)

```bash
cd /Users/jonathangaudette/market-intelligence/Dissan/price-scraper
npm run test:setup
```

✅ **Résultat attendu:**
```
✅ All tests passed! Setup is ready.
- 576 produits chargés
- 13 compétiteurs configurés
- 13 scrapers opérationnels
```

---

### 2. Ajuster Sélecteurs CSS (2-4h) ⚠️ IMPORTANT

**Pour chaque site pilote (Swish, Grainger, CleanItSupply):**

1. Ouvrir le site dans Chrome
2. F12 → DevTools
3. Faire une recherche test
4. Inspecter les éléments:
   - Champ de recherche → Noter le sélecteur
   - Résultats produits → Noter le sélecteur
   - Nom, SKU, Prix → Noter les sélecteurs

5. Mettre à jour `competitors-config.json`:
   ```json
   {
     "id": "swish",
     "selectors": {
       "searchBox": "#VRAI_SELECTEUR",
       "productList": ".VRAI_CONTAINER",
       "productPrice": ".VRAI_PRIX"
     }
   }
   ```

6. Tester:
   ```bash
   npm run scrape:site swish
   ```

7. Vérifier résultats:
   ```bash
   cat ../results/prix-par-site/swish-results.json | jq
   ```

**Objectif:** >60% de produits trouvés, <5% d'erreurs

---

### 3. Scraping Complet (30-40h automatique)

```bash
# Option A: Tout scraper en une fois (recommandé)
nohup npm run scrape:all > ../logs/scraping-$(date +%Y%m%d).log 2>&1 &

# Option B: Par priorité
npm run scrape:priority1  # 5 sites × 2h = 10h
npm run scrape:priority2  # 5 sites × 3h = 15h
npm run scrape:priority3  # 3 sites × 3h = 9h
```

**Monitoring:**
```bash
# Suivre les logs
tail -f data/logs/swish-2024-11-18.log

# Vérifier progression
ls -lh ../results/prix-par-site/
```

---

### 4. Génération Excel (1 min)

```bash
npm run analyze
```

**Résultat:** `/Users/jonathangaudette/market-intelligence/Dissan/prix-competiteurs-final.xlsx`

**5 onglets:**
1. Tous les produits (576 lignes)
2. Résumé par marque
3. Résumé par compétiteur
4. Produits non trouvés
5. Outliers de prix (>50%)

---

## 🎯 Résultat Final

Fichier Excel avec:
- 576 produits analysés
- Prix de 13 compétiteurs
- Statistiques complètes (Min/Max/Moyen)
- Analyse des outliers
- Opportunités tarifaires

---

## 📚 Documentation Complète

Pour plus de détails, voir:
- **[GUIDE-EXECUTION.md](GUIDE-EXECUTION.md)** - Guide complet avec troubleshooting
- **[COMPLETION.md](COMPLETION.md)** - Résumé de tout ce qui a été accompli

---

## ⚡ Commandes Essentielles

```bash
# Test
npm run test:setup

# Scraping
npm run scrape:site <id>    # Un site spécifique
npm run scrape:all           # Tous les sites

# Consolidation
npm run analyze              # Générer Excel final
```

---

**C'est parti! 🚀**

Commencez par l'ÉTAPE 2 (ajustement sélecteurs CSS) puis lancez le scraping complet.
