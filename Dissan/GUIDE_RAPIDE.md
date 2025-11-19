# Guide Rapide - Scraper SaniDépot

## ✅ Installation terminée!

Tout est prêt pour extraire les produits de SaniDépot.

## 🚀 Lancer le scraping

### Option 1: Script automatique (Recommandé)

```bash
./Dissan/run.sh
```

### Option 2: Commande directe

```bash
npx tsx Dissan/scrape-sanidepot.ts
```

## 📊 Résultat

Le fichier Excel sera créé dans: `Dissan/produits-sanidepot.xlsx`

## ⏸️ Arrêter et reprendre

- **Arrêter**: Appuyez sur `Ctrl+C`
- **Reprendre**: Relancez simplement le script - il reprendra automatiquement là où il s'était arrêté

## 🔧 Configuration

Vous pouvez modifier les paramètres dans `Dissan/scrape-sanidepot.ts`:

```typescript
const CONFIG = {
  baseUrl: 'https://ecom.sanidepot.com',
  delayBetweenRequests: 2000,      // Délai entre les pages (ms)
  delayBetweenProducts: 1000,      // Délai entre les produits (ms)
  timeout: 30000,                  // Timeout (ms)
  headless: false,                 // true = mode invisible
  outputFile: 'produits-sanidepot.xlsx',
};
```

### Pour aller plus vite:

```typescript
delayBetweenRequests: 1000,  // Réduire à 1 seconde
delayBetweenProducts: 500,   // Réduire à 0.5 seconde
headless: true,              // Mode invisible (plus rapide)
```

⚠️ **Attention**: Réduire trop les délais peut vous faire bloquer par le site

## 📁 Fichiers créés

- `produits-sanidepot.xlsx` - Fichier Excel final avec tous les produits
- `checkpoint.json` - Fichier de sauvegarde (supprimé automatiquement à la fin)

## 🧪 Scripts de test

- `test-scraper.ts` - Test complet de la structure
- `test-product-extraction.ts` - Test d'extraction de produits
- `analyze-page-structure.ts` - Analyse de la structure HTML

## ❓ Problèmes courants

### Le script ne démarre pas

```bash
npm install playwright @playwright/test exceljs
npx playwright install chromium
```

### Le navigateur ne s'ouvre pas

Modifier `headless: true` dans CONFIG (ligne 12)

### Le script est trop lent

- Réduire `delayBetweenRequests` et `delayBetweenProducts`
- Mettre `headless: true`

## 📈 Estimation

- **Catégories à traiter**: ~110 catégories
- **Produits estimés**: 1000-3000 produits
- **Durée estimée**: 2-4 heures (selon configuration)
- **Vitesse**: ~10-20 produits/minute

## 🎯 Données extraites

Chaque produit contient:

1. Nom
2. Catégorie
3. Sous-catégorie
4. Marque
5. Description complète
6. SKU/Code produit
7. Spécifications
8. Statut de stock
9. Certifications
10. URLs des images
11. URL de la page produit

## 💡 Conseils

1. **Première fois**: Laissez `headless: false` pour voir le progrès
2. **Production**: Utilisez `headless: true` pour aller plus vite
3. **Nuit**: Lancez le script le soir, il tournera pendant la nuit
4. **Checkpoint**: Ne supprimez pas `checkpoint.json` tant que le script n'est pas terminé!

## ✨ C'est parti!

Lancez simplement:

```bash
./Dissan/run.sh
```

Et attendez que le fichier Excel soit généré! 🎉
