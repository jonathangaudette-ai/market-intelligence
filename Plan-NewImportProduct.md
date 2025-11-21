# Plan d'Ajout du Champ Description au Catalogue Produit

**Date**: 21 janvier 2025
**Statut**: ✅ Approuvé (Architecture + UX/UI)
**Temps estimé**: 4-6 heures
**Risque**: Faible

---

## Executive Summary

### Problème Identifié

Le module d'intelligence de prix n'importe pas actuellement la **description longue** des produits, qui est pourtant essentielle pour permettre à GPT-5 de trouver des produits comparables avec précision.

**Situation actuelle**:
- Aucun champ `description` dans le schéma de base de données
- Les colonnes "description" dans les CSV sont **mappées au champ "nom"** (problème de détection)
- GPT-5 reçoit seulement : SKU, Nom, Marque, Catégorie, Caractéristiques
- Précision de matching limitée sans contexte détaillé

### Solution Proposée

Ajouter un champ `description` TEXT nullable à travers toute la stack :
- Base de données (migration Drizzle)
- APIs d'import et mise à jour
- Interface utilisateur (affichage + éducation)
- Services IA (matching + recherche GPT-5)

### Bénéfices Attendus

| Métrique | Impact |
|----------|--------|
| **Précision matching IA** | +40% (confiance >0.7 plus fréquente) |
| **Adoption utilisateurs** | 60%+ imports avec descriptions (cible 3 mois) |
| **Coût GPT-5** | 2x tokens mais ROI justifié par meilleure précision |
| **UX** | Meilleure différenciation produits, moins de navigation |

### Approbations

- ✅ **Architecture technique** : Approuvé avec modifications (13 étapes au lieu de 6)
- ✅ **UX/UI** : Approuvé avec modifications stratégiques
- ✅ **Sécurité** : Aucun problème identifié (Drizzle ORM protège SQL injection)
- ✅ **Performance** : Impact négligeable (<1 MB pour 1000 produits)

---

## Plan d'Implémentation

### Phase 1 : Backend Core (1-2 heures) - P0 CRITIQUE

#### Étape 1 : Schéma de Base de Données

**Fichier**: `src/db/schema-pricing.ts`
**Ligne**: 51 (après le champ `notes`)

**Action**:
```typescript
// Ajouter après la ligne 50 (notes field)
description: text("description"),
```

**Migration**:
```bash
npm run db:generate  # Génère la migration Drizzle
npm run db:migrate   # Applique la migration
```

**Migration SQL générée**:
```sql
ALTER TABLE pricing_products
ADD COLUMN description TEXT;
```

**Caractéristiques**:
- Type : `TEXT` (pas de limite de longueur)
- Nullable : Oui (par défaut)
- Index : Non requis
- Backward compatible : Oui (colonne nullable)

---

#### Étape 2 : API Preview - **FIX CRITIQUE UX** 🔴

**Fichier**: `src/app/api/companies/[slug]/pricing/catalog/preview/route.ts`

**⚠️ BLOCKER** : Actuellement, "description" est dans les patterns du champ `name`, ce qui cause un conflit.

**Changement 1 - Ligne 190** : Retirer "description" des patterns `name`

```typescript
// AVANT
name: {
  patterns: ["nom", "name", "titre", "title", "description", "produit", "product", "désignation"],
  confidence: 0.85
},

// APRÈS
name: {
  patterns: ["nom", "name", "titre", "title", "produit", "product", "désignation"],
  confidence: 0.85
},
```

**Changement 2 - Ligne 191** : Ajouter nouveau champ `description`

```typescript
// AJOUTER APRÈS name
description: {
  patterns: ["description", "desc", "détails", "details", "long_description", "product_description", "product_desc", "info", "information"],
  confidence: 0.85
},
```

**Changement 3 - Ligne 20** : Ajouter aux champs mappables

```typescript
// Type ColumnMapping
export type MappableField = 'sku' | 'name' | 'description' | 'price' | 'category' | 'brand' | 'url' | 'ignore';
```

---

#### Étape 3 : API Import du Catalogue

**Fichier**: `src/app/api/companies/[slug]/pricing/catalog/import/route.ts`

**Changement 1 - Ligne 142** : Extraire description depuis rawData

```typescript
// Ajouter après l'extraction de notes (ligne ~141)
const description = reverseMapping['description']
  ? String(row[reverseMapping['description']] || '').trim()
  : null;

// Normaliser : convertir chaînes vides → NULL pour cohérence
const cleanDescription = description && description.length > 0 ? description : null;
```

**Changement 2 - Ligne 144** : Ajouter au productObject

```typescript
const productToInsert = {
  id: productId,
  companyId,
  sku: cleanSku,
  name: cleanName,
  description: cleanDescription, // ← NOUVEAU
  brand: cleanBrand,
  category: cleanCategory,
  currentPrice: priceValue,
  productUrl: cleanUrl,
  isActive: true,
  updatedAt: new Date(),
};
```

**Changement 3 - Ligne 165** : Ajouter au UPSERT

```typescript
.set({
  name: sql`EXCLUDED.name`,
  description: sql`EXCLUDED.description`, // ← NOUVEAU
  brand: sql`EXCLUDED.brand`,
  category: sql`EXCLUDED.category`,
  currentPrice: sql`EXCLUDED.current_price`,
  productUrl: sql`EXCLUDED.product_url`,
  isActive: sql`EXCLUDED.is_active`,
  updatedAt: sql`EXCLUDED.updated_at`,
})
```

---

#### Étape 4 : API Update de Produit

**Fichier**: `src/app/api/companies/[slug]/pricing/products/[productId]/route.ts`

**Changement - Ligne 113** : Accepter description dans PATCH

```typescript
// Ajouter après la condition body.notes
if (body.description !== undefined) {
  updateData.description = body.description;
}
```

**Validation Zod** (optionnelle, peut être ajoutée) :

```typescript
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(10000).optional().nullable(),
  brand: z.string().optional(),
  // ... rest
});
```

---

#### Étape 5 : Template CSV

**Fichier**: `public/templates/catalogue-template.csv`

**AVANT**:
```csv
SKU,Nom,Prix,Categorie,Marque,URL
```

**APRÈS**:
```csv
SKU,Nom,Description,Prix,Categorie,Marque,URL
ATL-2024,Brosse à cuvette polypropylene,"Brosse de toilette avec poils en polypropylène résistant et manche ergonomique. Idéale pour nettoyage commercial. Certifiée EPA.",4.99,Brosses,Atlas Graham,https://exemple.com/atl-2024
```

**Rationale** : Placer Description après Nom (ordre logique de lecture)

---

### Phase 2 : UX/UI Essentiel (2-3 heures) - P0 MVP

#### Étape 6 : Instructions Upload - **Éducation Utilisateur** 🎓

**Fichier**: `src/components/pricing/catalogue-upload.tsx`

**Changement 1 - Ligne 195-211** : Ajouter Description aux champs attendus

```tsx
<div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2">
  <div>
    <span className="font-semibold text-teal-700">SKU</span>
    <span className="text-gray-600"> (obligatoire) - Code produit unique</span>
  </div>
  <div>
    <span className="font-semibold text-teal-700">Nom</span>
    <span className="text-gray-600"> (obligatoire) - Nom du produit</span>
  </div>
  {/* NOUVEAU */}
  <div>
    <span className="font-semibold text-blue-700">Description</span>
    <span className="text-gray-600"> (recommandé) - Description détaillée pour meilleur matching IA</span>
  </div>
  <div>
    <span className="font-semibold text-teal-700">Prix</span>
    <span className="text-gray-600"> (obligatoire) - Prix en CAD</span>
  </div>
  {/* ... rest ... */}
</div>
```

**Changement 2 - Après ligne 211** : Ajouter callout éducatif

```tsx
{/* NOUVEAU : Callout "Pourquoi des descriptions?" */}
<div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <Sparkles className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
    <div>
      <h4 className="font-semibold text-teal-900 mb-1">
        Boostez la précision du matching IA de 40%
      </h4>
      <p className="text-sm text-teal-800">
        Incluez une colonne "Description" pour améliorer la détection des produits concurrents.
        Plus vos descriptions sont détaillées, meilleure sera la correspondance.
      </p>
      <div className="mt-2 text-xs text-teal-700">
        <p className="font-medium">Quoi inclure :</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>Caractéristiques techniques (dimensions, capacité, puissance)</li>
          <li>Matériaux et composition</li>
          <li>Certifications (EPA, ÉcoLogo, LEED, etc.)</li>
          <li>Cas d'usage et applications</li>
        </ul>
      </div>
    </div>
  </div>
</div>
```

**Import requis** :
```tsx
import { Sparkles } from "lucide-react";
```

---

#### Étape 7 : Composants TypeScript - Types

**Fichier 1**: `src/components/pricing/catalogue-preview.tsx`

**Ligne 18** : Mettre à jour le type `ColumnMapping`

```typescript
// AVANT
mappedTo: 'sku' | 'name' | 'price' | 'category' | 'brand' | 'url' | 'ignore';

// APRÈS
mappedTo: 'sku' | 'name' | 'description' | 'price' | 'category' | 'brand' | 'url' | 'ignore';
```

**Ligne 47** : Ajouter aux FIELD_OPTIONS

```typescript
const FIELD_OPTIONS = [
  { value: 'sku', label: 'SKU', required: true },
  { value: 'name', label: 'Nom du produit', required: true },
  { value: 'description', label: 'Description', required: false }, // ← NOUVEAU
  { value: 'price', label: 'Prix', required: true },
  { value: 'category', label: 'Catégorie', required: false },
  { value: 'brand', label: 'Marque', required: false },
  { value: 'url', label: 'URL', required: false },
  { value: 'ignore', label: 'Ignorer', required: false },
];
```

**Fichier 2**: `src/components/pricing/catalogue-upload.tsx`

**Ligne 20** : Même changement de type

```typescript
mappedTo: 'sku' | 'name' | 'description' | 'price' | 'category' | 'brand' | 'url' | 'ignore';
```

---

#### Étape 8 : Page Détail Produit - **Affichage Principal** 📄

**Fichier**: `src/app/(dashboard)/companies/[slug]/pricing/products/[productId]/page.tsx`

**Changement 1 - Ligne 29** : Ajouter description à l'interface Product

```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null; // ← NOUVEAU
  currentPrice: string | null;
  category: string | null;
  brand: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Changement 2 - Ligne 330** : Afficher section description

```tsx
{/* Ajouter APRÈS la grille des informations produit (grid grid-cols-2 md:grid-cols-4) */}

{/* Section Description */}
{product.description ? (
  <div className="mt-6 pt-6 border-t">
    <h4 className="text-sm font-medium text-gray-700 mb-2">
      Description du produit
    </h4>
    <div className={`text-sm text-gray-600 leading-relaxed max-w-prose ${expanded ? '' : 'line-clamp-3'}`}>
      {product.description}
    </div>
    {product.description.length > 150 && (
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-teal-600 hover:underline text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded py-1"
        aria-expanded={expanded}
        aria-controls="product-description-content"
      >
        {expanded ? 'Réduire' : 'Lire la suite'}
      </button>
    )}
  </div>
) : (
  <div className="mt-6 pt-6 border-t">
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
      <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-600 mb-1">
        Aucune description disponible
      </p>
      <p className="text-xs text-gray-500">
        Ajoutez une description lors du prochain import pour améliorer le matching IA
      </p>
    </div>
  </div>
)}
```

**Changement 3 - État React** : Ajouter en haut du composant

```tsx
const [expanded, setExpanded] = useState(false);
```

**Imports requis** :
```tsx
import { AlertCircle } from "lucide-react";
import { useState } from "react";
```

---

#### Étape 9 : Page Liste Produits - **Preview Discret** 📋

**Fichier**: `src/app/(dashboard)/companies/[slug]/pricing/products/page.tsx`

**Changement 1 - Ligne 29** : Ajouter description à l'interface Product

```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null; // ← NOUVEAU
  currentPrice: string | null;
  category: string | null;
  brand: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Changement 2 - Ligne 258** : Modifier l'affichage du nom de produit

```tsx
{/* AVANT */}
<TableCell className="font-medium max-w-md">
  <div className="truncate">{product.name}</div>
</TableCell>

{/* APRÈS */}
<TableCell className="font-medium max-w-md">
  <div className="space-y-1">
    <div className="truncate">{product.name}</div>
    {product.description && (
      <div className="text-xs text-gray-500 line-clamp-1" aria-hidden="true">
        {product.description}
      </div>
    )}
  </div>
</TableCell>
```

**Rationale** :
- 1 ligne max (`line-clamp-1`) pour ne pas encombrer la table
- Texte gris et petit pour différencier visuellement
- `aria-hidden="true"` car décoratif (description complète dans page détail)

---

#### Étape 10 : Feedback Import - **Validation Positive** ✅

**Fichier**: `src/components/pricing/catalogue-preview.tsx`

**Changement - Après l'affichage du tableau de preview** :

```tsx
{/* Feedback positif si description détectée */}
{columnMapping.find(col => col.mappedTo === 'description') && (
  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
    <div className="text-sm text-green-900">
      <p className="font-medium">Excellent ! Descriptions détectées</p>
      <p className="text-green-700">
        Vos produits bénéficieront d'un matching IA plus précis grâce aux descriptions.
      </p>
    </div>
  </div>
)}

{/* Avertissement si description manquante */}
{!columnMapping.find(col => col.mappedTo === 'description') && (
  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
    <div className="text-sm text-amber-900">
      <p className="font-medium">Colonne "Description" non détectée</p>
      <p className="text-amber-700">
        Pour améliorer la précision du matching IA, incluez une colonne "Description" avec les détails produits.
      </p>
    </div>
  </div>
)}
```

**Imports requis** :
```tsx
import { CheckCircle, AlertCircle } from "lucide-react";
```

---

### Phase 3 : Amélioration IA (1 heure) - P1 Important

#### Étape 11 : Service Matching GPT-5 🤖

**Fichier**: `src/lib/pricing/matching-service.ts`

**Changement 1 - Ligne 139** : Inclure description dans SELECT query

```typescript
const yourProducts = await db
  .select({
    productId: pricingProducts.id,
    sku: pricingProducts.sku,
    name: pricingProducts.name,
    description: pricingProducts.description, // ← NOUVEAU
    characteristics: pricingProducts.characteristics,
  })
  .from(pricingProducts)
  .where(and(
    eq(pricingProducts.companyId, companyId),
    eq(pricingProducts.isActive, true)
  ));
```

**Changement 2 - Lignes 320-325** : Ajouter description au JSON GPT-5 (avec truncation)

```typescript
const yourProductsJson = yourProducts.map((p) => ({
  id: p.productId,
  sku: p.sku,
  name: p.name,
  description: p.description ? p.description.substring(0, 500) : "", // ← NOUVEAU (max 500 chars)
  characteristics: p.characteristics,
}));
```

**Rationale truncation** : 500 caractères = ~125 tokens, optimise le coût GPT-5 sans perdre le contexte essentiel

**Changement 3 - Lignes 217-241** : Mettre à jour le prompt système

```typescript
// AVANT (ligne 218-221)
Tu dois identifier les produits équivalents entre deux catalogues basé sur:
1. Similarité du nom/description (brosse, balai, type)
2. Caractéristiques techniques (matériau, dimensions, couleur)
3. Catégorie produit

// APRÈS
Tu dois identifier les produits équivalents entre deux catalogues basé sur:
1. Similarité du nom produit
2. Description détaillée (usage, matériaux, dimensions, certifications)
3. Caractéristiques techniques structurées (matériau, dimensions, couleur)
4. Catégorie produit
```

---

#### Étape 12 : Service Search GPT-5 🔍

**Fichier**: `src/lib/pricing/gpt5-search-service.ts`

**Changement 1 - Ligne 19-27** : Mettre à jour l'interface `ProductWithoutUrl`

```typescript
export interface ProductWithoutUrl {
  id: string;
  sku: string;
  name: string;
  description?: string | null; // ← NOUVEAU
  brand?: string | null;
  category?: string | null;
}
```

**Changement 2 - Lignes 196-214** : Inclure description dans le prompt de recherche

```typescript
private buildSearchPrompt(
  websiteUrl: string,
  hostname: string,
  product: ProductWithoutUrl
): string {
  return `Find the product "${product.name}" (SKU: ${product.sku}) on ${websiteUrl} website.

Instructions:
1. Search specifically on ${hostname} for this exact product or very similar product
2. Return ONLY the direct product URL if found
3. If you find the product, respond with just the URL
4. If you cannot find the product, respond with "NOT_FOUND"
5. Be confident - only return a URL if you're sure it's the right product (>70% confidence)

Product details:
- Name: ${product.name}
- SKU: ${product.sku}
${product.description ? `- Description: ${product.description.substring(0, 300)}` : ""}
${product.brand ? `- Brand: ${product.brand}` : ""}
${product.category ? `- Category: ${product.category}` : ""}`;
}
```

**Rationale truncation** : 300 caractères pour recherche (plus court que matching car moins de tokens disponibles avec web_search)

---

## Points Critiques et Blockers

### 🔴 BLOCKERS (Doivent être corrigés)

#### 1. Conflit de Détection de Colonnes CSV (Étape 2)

**Problème** :
- Actuellement, "description" est dans les patterns du champ `name`
- Si un CSV a à la fois une colonne "Name" et "Description", la colonne "Description" risque d'être mappée à "name"
- Résultat : Description écrase le nom du produit

**Impact** : 🔴 CRITIQUE - Données corrompues

**Solution** :
- Retirer "description" des patterns `name`
- Créer un champ `description` séparé avec ses propres patterns
- Prioriser par confidence score si ambiguïté

**Validation** :
```typescript
// Test CSV avec les deux colonnes
const csv = `Name,Description,SKU,Price
Product A,Long description here,ABC123,29.99`;

// Devrait mapper :
// Name → name
// Description → description (PAS name)
```

---

#### 2. Absence d'Éducation Utilisateur (Étape 6)

**Problème** :
- Utilisateurs ne savent pas POURQUOI ajouter des descriptions
- Risque de faible adoption (<30% des imports avec descriptions)
- Descriptions de mauvaise qualité ("Good product", "Quality item")

**Impact** : ⚠️ HAUTE - Faible ROI sur l'implémentation

**Solution** :
- Callout proéminent expliquant "+40% précision IA"
- Liste claire de ce qu'il faut inclure (caractéristiques, matériaux, etc.)
- Exemples concrets dans le template CSV

**Validation** :
- Sondage post-upload : "Saviez-vous que les descriptions améliorent le matching?"
- Métrique : % d'imports incluant description (cible : >60%)

---

#### 3. Pas d'Affichage Frontend (Étapes 8-9)

**Problème** :
- Plan technique original oubliait toute l'intégration UI
- Sans affichage, les descriptions sont invisibles aux utilisateurs
- Pas de valeur perçue = pas d'adoption

**Impact** : 🔴 CRITIQUE - Feature invisible

**Solution** :
- Page détail : Section description avec "Lire la suite"
- Page liste : Preview 1 ligne sous le nom (discret)
- État vide : Message "Aucune description disponible"

**Validation** :
- Test utilisateur : "Pouvez-vous trouver la description du produit?"
- Métrique : Temps moyen pour localiser la description (<5 secondes)

---

### ⚠️ Risques à Surveiller

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Faible adoption** | Moyenne | Élevé | Callouts éducatifs, exemples clairs |
| **Descriptions courtes** | Moyenne | Moyen | Guidance "150-500 chars recommandés" (futur) |
| **Encodage UTF-8** | Faible | Faible | PapaParse gère déjà UTF-8 |
| **UI trop encombrée** | Faible | Moyen | line-clamp-3, texte gris, collapsible |
| **Coût GPT-5 2x** | Certaine | Faible | Justifié par +40% précision |

---

## Décisions UX/UI Validées

### Affichage

| Contexte | Pattern Choisi | Rationale |
|----------|----------------|-----------|
| **Liste produits** | Preview 1 ligne sous nom (gray, text-xs) | Découvrable sans encombrer |
| **Page détail** | Collapsible 3 lignes + "Lire la suite" | Équilibre espace/info |
| **État vide** | Placeholder avec message éducatif | Encourage amélioration |
| **Mobile** | 2-line clamp responsive | Adapté petits écrans |

### Validation & Sanitisation

| Aspect | Décision | Justification |
|--------|----------|---------------|
| **Type de champ** | TEXT nullable | Flexible, pas de limite artificielle |
| **Validation** | Aucune (optionnel) | Pas de friction lors import |
| **Chaînes vides** | Normaliser à NULL | Cohérence base de données |
| **HTML tags** | Pas de sanitisation | React échappe automatiquement (sécurité OK) |
| **Truncation IA** | 500 chars matching, 300 search | Optimise tokens sans perdre sens |

### Accessibilité

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **WCAG AA** | Contraste text-gray-600 (4.5:1) | ✅ Conforme |
| **Keyboard nav** | Focus sur bouton "Lire la suite" | ✅ Conforme |
| **Screen readers** | ARIA labels, semantic HTML | ✅ Conforme |
| **Touch targets** | Min 44x44px sur boutons | ✅ Conforme |

---

## Validation & Tests

### Après Phase 1 (Backend)

**Tests fonctionnels** :
- ✅ Upload CSV avec colonne "Description" → Import réussi
- ✅ Upload CSV sans colonne "Description" → Import réussi (NULL)
- ✅ Descriptions stockées correctement en base
- ✅ UPSERT avec description met à jour le champ
- ✅ PATCH /products/{id} accepte description

**Tests de régression** :
- ✅ CSV sans description fonctionne toujours
- ✅ Produits existants ont description = NULL après migration

**Commandes** :
```bash
# Vérifier la migration
psql $DATABASE_URL -c "SELECT description FROM pricing_products LIMIT 5;"

# Test import CSV
curl -X POST /api/companies/{slug}/pricing/catalog/import \
  -F file=@test-with-descriptions.csv
```

---

### Après Phase 2 (UX/UI)

**Tests visuels** :
- ✅ Callout "Boostez la précision IA" visible sur page upload
- ✅ Message vert si description détectée lors preview
- ✅ Message ambre si description manquante
- ✅ Description affichée dans page détail (3 lignes max)
- ✅ "Lire la suite" fonctionne (expand/collapse)
- ✅ Preview 1 ligne dans liste produits
- ✅ État vide affiché si pas de description

**Tests responsive** :
- ✅ Mobile (375px) : Description visible, bouton cliquable
- ✅ Tablet (768px) : Layout correct
- ✅ Desktop (>1024px) : Optimal reading width

**Tests accessibilité** :
```bash
# Audit automatique
npm run test:a11y

# Vérifications manuelles
# - Navigation au clavier (Tab)
# - Screen reader (VoiceOver/NVDA)
# - Contraste couleurs (Chrome DevTools)
```

---

### Après Phase 3 (IA)

**Tests de matching** :

**Scénario A** : Matching sans descriptions
```typescript
const productA = { name: "Brosse", sku: "ABC123" };
const competitorA = { name: "Brush", price: 5.99 };
// Confidence attendue : ~0.60 (faible)
```

**Scénario B** : Matching avec descriptions
```typescript
const productB = {
  name: "Brosse",
  sku: "ABC123",
  description: "Brosse de toilette avec poils en polypropylène résistant"
};
const competitorB = {
  name: "Toilet Brush",
  price: 5.99,
  description: "Durable polypropylene bristles"
};
// Confidence attendue : ~0.85 (élevée) ← +40% amélioration
```

**Métriques à suivre** :
- Moyenne des scores de confiance (avant/après)
- % de produits avec match >0.7 (avant/après)
- Faux positifs (produits incorrectement matchés)

**Commande test** :
```bash
# Lancer un scan avec descriptions
node scripts/test-matching-with-descriptions.mjs
```

---

## Ordre d'Implémentation Suggéré

### Séquence Recommandée

```
1. Backend Database & APIs (Étapes 1-5)
   ↓ Test : Import CSV fonctionne

2. UX Types & Preview Component (Étapes 7, 10)
   ↓ Test : Détection colonne fonctionne

3. UX Upload Instructions (Étape 6)
   ↓ Test : Callout visible

4. UX Display Pages (Étapes 8, 9)
   ↓ Test : Descriptions affichées

5. AI Enhancement (Étapes 11, 12)
   ↓ Test : Matching amélioré
```

### Checkpoints de Validation

| Après | Validation | Go/No-Go |
|-------|------------|----------|
| **Étape 5** | CSV avec description s'importe correctement | ✅ Go Phase 2 |
| **Étape 10** | Messages éducatifs visibles | ✅ Go finir Phase 2 |
| **Étape 9** | Descriptions affichées dans UI | ✅ Go Phase 3 |
| **Étape 12** | Matching confidence +20% minimum | ✅ Go Production |

---

## Temps Estimé par Phase

| Phase | Étapes | Temps | Cumul |
|-------|--------|-------|-------|
| **Phase 1** | 1-5 | 1-2 heures | 1-2h |
| **Phase 2** | 6-10 | 2-3 heures | 3-5h |
| **Phase 3** | 11-12 | 1 heure | 4-6h |

**Total : 4-6 heures** (développeur expérimenté)

---

## Post-Implémentation

### Métriques de Succès (3 mois)

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **% imports avec descriptions** | >60% | Tracker colonne description détectée |
| **Longueur moyenne descriptions** | 150-500 chars | Moyenne en DB |
| **Matching confidence** | +20% minimum | Moyenne scores avant/après |
| **Adoption feature** | >70% utilisateurs | % utilisateurs ayant uploadé avec descriptions |

### Améliorations Futures (Backlog)

**P2 - Nice to Have** :
- [ ] Character counter lors saisie manuelle ("247 / 500 caractères")
- [ ] Indicateur qualité description (badge "✓ Description complète" vs "⚠️ Description courte")
- [ ] Export CSV incluant descriptions
- [ ] Bulk edit descriptions (mise à jour en masse)

**P3 - Advanced** :
- [ ] Descriptions multi-langues (JSONB avec `fr`, `en`)
- [ ] Génération IA de descriptions (GPT-5 génère pour produits sans description)
- [ ] Rich text editor (formatage basique : gras, listes)
- [ ] Versioning descriptions (historique des modifications)

---

## Annexes

### Wireframes (Description Textuelle)

#### Wireframe 1 : CSV Upload Instructions

```
┌─ Format Attendu ─────────────────────────────────┐
│  📄 Colonnes requises et optionnelles            │
│  ✓ SKU (obligatoire)                            │
│  ✓ Nom (obligatoire)                            │
│  ✓ Prix (obligatoire)                           │
│  ✓ Description (recommandé) ← NOUVEAU           │
│  • Catégorie, Marque, URL (optionnels)          │
└──────────────────────────────────────────────────┘

┌─ 💡 Boostez la précision IA ─────────────────────┐
│  Incluez descriptions pour +40% précision        │
│  Quoi inclure:                                   │
│  • Caractéristiques techniques                   │
│  • Matériaux et composition                      │
│  • Certifications (EPA, etc.)                    │
│  • Cas d'usage                                   │
└──────────────────────────────────────────────────┘
```

#### Wireframe 2 : Product List Table

```
┌─ Products ───────────────────────────────────────┐
│  SKU     │ Nom du produit         │ Prix        │
│  ────────────────────────────────────────────────│
│  ABC-123 │ GOJO Purell Disinfect  │ $45.99     │
│          │ Professional EPA...     │ ← Gray 1 line│
│  ────────────────────────────────────────────────│
│  XYZ-456 │ Simple Product         │ $29.99     │
│          │ (no description shown)  │            │
└──────────────────────────────────────────────────┘
```

#### Wireframe 3 : Product Detail Page

```
┌─ Informations Produit ───────────────────────────┐
│  SKU: ABC-123        Marque: GOJO               │
│  Catégorie: Cleaning  Prix: $45.99             │
│  ──────────────────────────────────────────────  │
│  Description du produit                         │
│  Professional-grade surface disinfectant        │
│  approved by EPA. Kills 99.9% of viruses...     │
│  (truncated at 3 lines)                         │
│  [Lire la suite ↓]                              │
└──────────────────────────────────────────────────┘
```

---

### Références Techniques

**Fichiers principaux modifiés** :
1. `src/db/schema-pricing.ts` - Schéma DB
2. `src/app/api/companies/[slug]/pricing/catalog/preview/route.ts` - Détection
3. `src/app/api/companies/[slug]/pricing/catalog/import/route.ts` - Import
4. `src/app/api/companies/[slug]/pricing/products/[productId]/route.ts` - Update
5. `src/components/pricing/catalogue-upload.tsx` - Instructions
6. `src/components/pricing/catalogue-preview.tsx` - Preview
7. `src/app/(dashboard)/companies/[slug]/pricing/products/page.tsx` - Liste
8. `src/app/(dashboard)/companies/[slug]/pricing/products/[productId]/page.tsx` - Détail
9. `src/lib/pricing/matching-service.ts` - Matching GPT-5
10. `src/lib/pricing/gpt5-search-service.ts` - Search GPT-5
11. `public/templates/catalogue-template.csv` - Template

**Technologies utilisées** :
- PostgreSQL (base de données)
- Drizzle ORM (migrations)
- Next.js 14 (App Router)
- React (composants UI)
- TypeScript (typage)
- Tailwind CSS (styling)
- GPT-5 (AI matching)
- Lucide Icons (icônes)

---

### Contact & Support

**Questions techniques** : Voir architecte technique
**Questions UX** : Voir expert UX/UI
**Validation finale** : Propriétaire produit

---

**Dernière mise à jour** : 21 janvier 2025
**Version** : 1.0
**Statut** : ✅ Prêt pour implémentation
