# Plan d'Analyse des Prix Compétiteurs

## Objectif
Trouver les produits équivalents du catalogue SaniDépot (fichier `produits-sanidepot.xlsx`) sur les sites de **Swish.ca** et **A1 Cash & Carry** pour comparer les prix.

## Stratégie de Matching (Correspondance)

L'approche proposée est une stratégie en "entonnoir" pour maximiser la précision tout en gardant un bon volume de résultats.

### 1. Recherche Directe (Haute Précision)
Pour chaque produit SaniDépot :
*   **Par Code Manufacturier (SKU/Model)** : C'est la méthode la plus fiable. Si SaniDépot affiche le code du fabricant (ex: "M2P-PA-M1080"), nous chercherons ce code exact sur les sites concurrents.
*   **Par Marque + Modèle** : Recherche combinée de la marque (ex: "Rubbermaid") et du numéro de modèle.

### 2. Recherche par Mots-clés (Moyenne Précision)
Si la recherche exacte ne donne rien :
*   **Nettoyage du Nom** : On prend le nom du produit SaniDépot, on retire les mots génériques (ex: "Double bucket", "with", "cleaner") et on garde les termes spécifiques.
*   **Recherche** : On lance la recherche sur le site concurrent.
*   **Validation Fuzzy** : On compare le nom du produit trouvé avec le nom original en utilisant un algorithme de similarité (Levenshtein). Si la similarité est > 80%, on considère que c'est un match.

### 3. Validation Manuelle (Optionnelle)
*   Générer un fichier Excel avec les colonnes : `Produit SaniDépot` | `Match Trouvé` | `Score de Confiance` | `Lien`.
*   Les scores faibles (< 90%) peuvent être marqués pour révision humaine.

## Implémentation Technique

Nous allons créer deux nouveaux scripts de scraping, un pour chaque compétiteur, basés sur votre structure existante.

### Structure des Scripts
*   `scrape-swish.ts`
*   `scrape-a1.ts`
*   `match-products.ts` (Script central qui lit le Excel SaniDépot et orchestre les recherches)

### Étapes
1.  **Lecture** : Lire `produits-sanidepot.xlsx` avec `exceljs`.
2.  **Boucle** : Pour chaque produit :
    *   Lancer une recherche sur Swish.ca.
    *   Analyser le premier résultat.
    *   Calculer le score de correspondance.
    *   Extraire le prix si match validé.
    *   Répéter pour A1 Cash & Carry.
3.  **Sortie** : Créer un nouveau fichier `comparatif-prix.xlsx`.

## Prochaines Actions
1.  Créer le script de matching de base.
2.  Adapter les sélecteurs CSS pour Swish.ca et A1.
3.  Lancer un test sur 10 produits pour valider l'approche.
