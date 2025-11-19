# Guide Utilisateur - Module Intelligence de Prix

**Version:** 1.0
**Dernière mise à jour:** 19 novembre 2025

---

## Vue d'ensemble

Le module **Intelligence de Prix** surveille automatiquement les prix de vos concurrents et vous alerte sur les opportunités d'ajustement tarifaire grâce à l'IA (GPT-5 et Claude Sonnet 4.5).

### Fonctionnalités principales

- Import catalogue produits (CSV/Excel)
- Configuration concurrents avec scraping automatique
- Matching AI produits vs concurrents (GPT-5)
- Dashboard temps réel avec graphiques historiques
- Alertes intelligentes sur changements de prix

---

## Démarrage Rapide (3 étapes)

### Étape 1: Importer votre catalogue

1. Accéder à **Intelligence de Prix → Catalogue**
2. Cliquer sur **Importer Catalogue**
3. Télécharger le fichier template CSV
4. Remplir vos produits avec les colonnes requises
5. Uploader le fichier et attendre la validation

**Format CSV attendu:**

| Colonne | Obligatoire | Description | Exemple |
|---------|-------------|-------------|---------|
| sku | ✅ Oui | Code produit unique | ATL-2024 |
| name | ✅ Oui | Nom du produit | Brosse cuvette PP |
| current_price | ❌ Non | Prix actuel | 4.99 |
| brand | ❌ Non | Marque | Atlantic |
| category | ❌ Non | Catégorie | Nettoyage |
| unit | ❌ Non | Unité | EA |

**Exemple de fichier CSV valide:**

```csv
sku,name,current_price,brand,category,unit
ATL-2024,Brosse cuvette PP,4.99,Atlantic,Nettoyage,EA
ATL-3001,Balai industriel 24",12.50,Atlantic,Balais,EA
ATL-4002,Vadrouille microfibre,8.99,Atlantic,Vadrouilles,EA
```

**Conseils pour un bon matching:**
- Utilisez des noms descriptifs (matériau, dimensions, type)
- Ajoutez la catégorie pour affiner le matching
- Le brand aide à différencier les produits similaires

---

### Étape 2: Configurer vos concurrents

1. Aller à **Intelligence de Prix → Concurrents**
2. Cliquer sur **Ajouter Concurrent**
3. Remplir le formulaire:
   - **Nom:** Nom du concurrent (ex: "Swish")
   - **Site Web:** URL du site (ex: "https://swish.com")
   - **Fréquence de scan:** Quotidien (recommandé)

4. **(Optionnel avancé)** Configurer les sélecteurs CSS:
   - `productName`: Sélecteur pour le nom produit
   - `price`: Sélecteur pour le prix
   - `sku`: Sélecteur pour le SKU concurrent

**Note:** Le scraping utilise Firecrawl API pour contourner les protections anti-bot. Aucune configuration CSS n'est requise pour la plupart des sites.

---

### Étape 3: Lancer premier scan

1. Retourner au **Dashboard Pricing**
2. Cliquer sur **Lancer scan**
3. Sélectionner un ou plusieurs concurrents
4. Attendre 30-90 secondes

**Résultat:** Les produits concurrents sont automatiquement scrapés et matchés contre votre catalogue avec GPT-5.

---

## Fonctionnalités Détaillées

### Dashboard

Le dashboard affiche 6 KPI Cards en temps réel:

1. **Produits Surveillés** - Nombre de produits actifs dans votre catalogue
2. **Écart Prix Moyen** - Différence moyenne de prix vs concurrents (%)
3. **Avantage Compétitif** - % moyen de réduction vs concurrents
4. **Concurrents Actifs** - Nombre de concurrents configurés
5. **Alertes (7 jours)** - Nombre d'alertes générées cette semaine
6. **Couverture Marché** - % de produits matchés vs catalogue total

**Graphique Évolution 30 jours:**
- Compare vos prix vs prix concurrents sur 30 jours
- Ligne "vous" (vos prix) vs lignes concurrents
- Détection automatique des changements de prix >10%

---

### Page Matches (Correspondances)

Affiche tous les produits matchés avec:

- **Nom produit** (votre catalogue)
- **Nom concurrent** (produit équivalent détecté)
- **Score de confiance** GPT-5 (70-100%)
  - 95-100%: Match quasi-identique
  - 85-94%: Produits très similaires
  - 70-84%: Produits probablement équivalents
- **Écart prix** en %
  - 🟢 Vert si vous êtes moins cher
  - 🔴 Rouge si vous êtes plus cher
- **Concurrent** source du match

---

### Historique Prix

Affiche l'évolution des prix sur:
- 30 jours (par défaut)
- 60 jours
- 90 jours

**Fonctionnalités:**
- Détection changements significatifs (>10%)
- Snapshot quotidien automatique (2h AM)
- Export CSV (à venir)

---

### Alertes (Dashboard Sidebar)

Types d'alertes automatiques:

1. **Baisse prix concurrent** (>10%)
   - Exemple: "Concurrent a baissé prix de 15.2% (12.99$ → 11.02$)"
   - Sévérité: Critical si >20%, Warning si 10-20%

2. **Votre prix trop élevé** (>20% au-dessus marché)
   - Exemple: "Votre prix 25.3% au-dessus du concurrent"
   - Sévérité: Critical si >30%, Warning si 20-30%

3. **Nouveau produit concurrent** détecté
   - Exemple: "Nouveau produit: Nettoyant Multi-Surfaces 1L à 8.99$"
   - Sévérité: Info

4. **Anomalies de prix**
   - Prix < 0.10$ (trop bas, erreur probable)
   - Prix > 10,000$ (trop élevé, erreur probable)
   - Sévérité: Warning

**Note:** Les alertes sont actuellement visibles dans le dashboard uniquement. L'envoi par email/Slack sera ajouté dans une version future.

---

## FAQ

### Q: Comment améliorer la précision du matching GPT-5?

**R:** Ajoutez des caractéristiques détaillées dans votre catalogue CSV:
- Matériau (polypropylène, microfibre, etc.)
- Dimensions (24", 1L, etc.)
- Type de produit (brosse, balai, vadrouille)
- Features spéciales (antibactérien, ergonomique)

Plus vous donnez de contexte, meilleur sera le matching!

---

### Q: Pourquoi certains produits ne matchent pas?

**R:** Plusieurs raisons possibles:
1. **Aucun équivalent** chez le concurrent
2. **Confiance < 70%** - GPT-5 n'est pas assez certain du match
3. **Nom trop vague** - Exemple: "Produit A" ne peut pas être matché
4. **Produit non scrapé** - Le concurrent n'affiche pas ce produit sur son site

**Solution:** Enrichissez les noms de produits et ajoutez la catégorie.

---

### Q: Puis-je scraper plus souvent que quotidien?

**R:** Oui, vous pouvez configurer:
- **Quotidien** (recommandé pour la plupart des cas)
- **Toutes les 6 heures** (pour produits à forte volatilité)
- **Toutes les heures** (coût scraping élevé, réservé aux cas critiques)

**Attention:** Le coût de scraping augmente proportionnellement à la fréquence.

---

### Q: Les prix scrapés sont-ils toujours à jour?

**R:** Les prix sont mis à jour selon la fréquence de scan configurée:
- **Quotidien:** Dernière mise à jour il y a max 24h
- **6 heures:** Dernière mise à jour il y a max 6h
- **Horaire:** Dernière mise à jour il y a max 1h

Le timestamp "Dernier scan" est affiché sur chaque match.

---

### Q: Que faire si un site concurrent bloque le scraping?

**R:** Notre scraping utilise Firecrawl API qui contourne la plupart des protections anti-bot. Si un site reste bloqué:

1. Vérifiez que l'URL du concurrent est correcte
2. Essayez de changer les sélecteurs CSS si configurés
3. Contactez le support pour investigation

---

### Q: Les alertes sont-elles envoyées par email?

**R:** Actuellement, les alertes sont **uniquement visibles dans le dashboard**. L'envoi par email/Slack/Teams sera ajouté dans une future version (post-MVP).

---

### Q: Comment exporter les données de pricing?

**R:** Fonctionnalité d'export en développement. Prochainement disponible:
- Export CSV (produits + matches + prix)
- Export Excel avec graphiques
- Export PDF (rapport exécutif)

---

## Support Technique

### Bugs ou Questions

Pour signaler un bug ou poser une question technique:
- **Email:** support@market-intelligence.com
- **Documentation:** [Lien documentation technique]

### Bonnes Pratiques

1. **Import catalogue:**
   - Utilisez des SKU uniques et stables
   - Mettez à jour régulièrement (hebdomadaire recommandé)
   - Nettoyez les produits inactifs

2. **Configuration concurrents:**
   - Scannez max 3-5 concurrents clés (performance)
   - Évitez de scanner trop fréquemment (coût)
   - Vérifiez que les sites sont accessibles

3. **Analyse matches:**
   - Validez les matches avec confiance < 80%
   - Surveillez les alertes critiques quotidiennement
   - Ajustez vos prix basé sur l'avantage compétitif

---

**Dernière mise à jour:** 19 novembre 2025
**Version:** 1.0 - MVP
**Prochaines features:** Email notifications, Export Excel, API publique
