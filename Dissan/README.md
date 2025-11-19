# Scraper SaniDépot - Guide d'utilisation

Ce script Playwright extrait automatiquement tous les produits du catalogue SaniDépot et les exporte dans un fichier Excel.

## 📋 Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn

## 🚀 Installation

### 1. Installer les dépendances (déjà fait)

```bash
npm install playwright @playwright/test exceljs
```

### 2. Installer les navigateurs Playwright

```bash
npx playwright install chromium
```

## 📖 Utilisation

### Exécution simple

```bash
npx tsx Dissan/scrape-sanidepot.ts
```

### Exécution avec Node.js (si compilé)

```bash
# Compiler le TypeScript
npx tsc Dissan/scrape-sanidepot.ts

# Exécuter
node Dissan/scrape-sanidepot.js
```

## ⚙️ Configuration

Le script peut être configuré en modifiant les constantes dans `CONFIG` au début du fichier:

```typescript
const CONFIG = {
  baseUrl: 'https://ecom.sanidepot.com',
  delayBetweenRequests: 2000,      // Délai entre les pages (ms)
  delayBetweenProducts: 1000,      // Délai entre les produits (ms)
  timeout: 30000,                  // Timeout général (ms)
  headless: false,                 // true = sans interface visuelle
  outputFile: 'produits-sanidepot.xlsx',
  checkpointFile: 'checkpoint.json',
};
```

### Paramètres importants:

- **headless**: Mettre à `true` pour exécuter sans interface (plus rapide, moins de ressources)
- **delayBetweenRequests**: Augmenter si vous êtes bloqué par le site (trop de requêtes)
- **delayBetweenProducts**: Réduire pour aller plus vite (attention au rate limiting)

## 📊 Données extraites

Pour chaque produit, le script extrait:

| Colonne | Description |
|---------|-------------|
| **Nom** | Nom du produit |
| **Catégorie** | Catégorie principale |
| **Sous-catégorie** | Sous-catégorie (si applicable) |
| **Marque** | Marque/Fournisseur |
| **Description** | Description complète du produit |
| **SKU** | Code produit/SKU |
| **Spécifications** | Spécifications techniques |
| **Statut Stock** | Disponibilité (en stock, rupture, etc.) |
| **Certifications** | Certifications (FSC, Green Seal, LEED, etc.) |
| **Images** | URLs des images (séparées par des virgules) |
| **URL** | Lien vers la page produit |

## 🔄 Reprise automatique

Le script sauvegarde automatiquement sa progression dans `checkpoint.json`:

- Si le script est interrompu (erreur, Ctrl+C, etc.), il reprendra automatiquement là où il s'était arrêté
- Un checkpoint est sauvegardé tous les 10 produits
- Le checkpoint est automatiquement supprimé à la fin de l'extraction

### Pour recommencer de zéro:

```bash
rm Dissan/checkpoint.json
```

## 📁 Fichiers générés

- **`produits-sanidepot.xlsx`**: Fichier Excel avec tous les produits
- **`checkpoint.json`**: Fichier de sauvegarde (temporaire)

## 🎯 Catégories extraites

Le script parcourt automatiquement toutes les catégories:

1. **Accessoires**
   - Quincaillerie
   - Fournitures de nettoyage
   - Distributeurs
   - Etc.

2. **Produits chimiques et solutions de nettoyage**
   - Entretien de salle de bain
   - Entretien de plancher
   - Nettoyage de cuisine
   - Etc.

3. **Équipement de nettoyage**
   - Aspirateurs
   - Balayeuses
   - Extracteurs
   - Etc.

4. **Papiers, sacs et autres commodités**
   - Papiers
   - Sacs à déchets
   - Masques
   - Etc.

## ⚡ Performance

- **Vitesse**: ~1000 produits/heure (avec les délais par défaut)
- **Mémoire**: ~200-500 MB
- **Durée estimée**: 2-4 heures pour le catalogue complet (estimation)

## 🐛 Dépannage

### Le script ne trouve pas les produits

- Vérifier que le site est accessible
- Vérifier les sélecteurs CSS (le site a peut-être changé)
- Augmenter le `timeout`

### Le script est bloqué par le site

- Augmenter `delayBetweenRequests` (ex: 5000 ms)
- Mettre `headless: false` pour voir ce qui se passe
- Vérifier qu'il n'y a pas de captcha

### Erreur "Browser not found"

```bash
npx playwright install chromium
```

### Le fichier Excel est vide

- Vérifier les logs du script
- Vérifier que les sélecteurs CSS sont corrects
- Essayer en mode `headless: false` pour déboguer

## 📝 Notes importantes

1. **Respect des serveurs**: Les délais sont configurés pour ne pas surcharger le serveur de SaniDépot
2. **Autorisation**: Assurez-vous d'avoir l'autorisation d'extraire ces données
3. **Données dynamiques**: Les prix nécessitent une authentification (non inclus dans ce script)
4. **Maintenance**: Si le site change de structure, les sélecteurs CSS devront être mis à jour

## 🔧 Personnalisation

### Extraire seulement certaines catégories

Modifier la méthode `extractCategories()` pour filtrer les catégories désirées:

```typescript
// Exemple: seulement les accessoires
if (text.toLowerCase().includes('accessoires')) {
  links.push({ name: text, url: href });
}
```

### Ajouter des champs supplémentaires

1. Modifier l'interface `Product`
2. Modifier `extractProductDetails()` pour extraire les nouvelles données
3. Ajouter les colonnes dans `exportToExcel()`

## 📞 Support

Pour toute question ou problème:
1. Vérifier les logs du script
2. Consulter ce README
3. Vérifier que le site SaniDépot est accessible

## 🎉 Exemple de sortie

```
🚀 Initialisation du scraper SaniDépot...
🌐 Navigation vers ecom.sanidepot.com...
📁 4 catégories trouvées

📂 Traitement de la catégorie: Accessoires
  📁 13 sous-catégories trouvées
    📂 Traitement de: Quincaillerie
      📦 24 produits trouvés sur cette page
        ✅ Support mural chrome
        ✅ Distributeur savon automatique
        ...
      💾 Checkpoint sauvegardé (10 produits)

...

✅ Extraction terminée! 1247 produits extraits
📊 Export vers Excel...
✅ Fichier Excel créé: /Users/.../Dissan/produits-sanidepot.xlsx
📊 Nombre de produits: 1247
🗑️  Checkpoint supprimé
```
