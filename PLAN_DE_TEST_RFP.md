# Plan de Test Complet - RFP Upload Fix

## Contexte
Résolution de l'erreur "No active company context" lors de l'upload de RFP et vérification que les anciennes données s'affichent correctement.

## Changements Déployés

### Commit 6cd2d78 - Fix principal
- ✅ Ajout de `getCompanyBySlug()` et `requireRFPAuthWithSlug()` dans `/src/lib/rfp/auth.ts`
- ✅ Modification de `/src/components/rfp/upload-form.tsx` pour passer `companySlug` dans FormData
- ✅ Mise à jour de `/src/app/api/v1/rfp/rfps/route.ts` pour utiliser l'auth basée sur le slug

### Commit 3e22d90 - Logs de debugging
- ✅ Validation que le slug est chargé avant soumission (client)
- ✅ Logs côté client: slug value, FormData contents
- ✅ Logs côté serveur: companySlug reçu, résultat d'auth
- ✅ Message d'erreur amélioré si slug pas chargé

## Plan de Test Détaillé

### 🔴 TEST 1: Cache du Navigateur (CRITIQUE)
**Problème**: L'ancienne version du code JavaScript peut être en cache

**Actions**:
1. Ouvrir Chrome DevTools (F12)
2. Aller dans l'onglet "Network"
3. Cocher "Disable cache"
4. Faire un Hard Refresh: Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
5. OU: Ouvrir fenêtre privée/incognito

**Résultat attendu**: La nouvelle version du code doit charger

---

### ✅ TEST 2: Upload de Nouveau RFP
**URL**: `https://market-intelligence-kappa.vercel.app/companies/[slug]/rfps/new`

**Actions**:
1. Se connecter à l'application
2. Aller sur la page RFP Assistant
3. Cliquer sur "Nouveau RFP"
4. Remplir le formulaire:
   - RFP Title: "Test RFP Upload"
   - Client Name: "Test Client"
   - Industry: "Technology"
   - Deal Value: 100000
5. Upload un fichier PDF
6. **Ouvrir la Console (F12)** avant de soumettre
7. Cliquer sur "Upload & Parse RFP"

**Logs à vérifier dans la Console**:
```
[RFP Upload] Starting upload with slug: [slug-value]
[RFP Upload] FormData companySlug: [slug-value]
```

**Résultats attendus**:
- ✅ Aucun message d'erreur "No active company context"
- ✅ Slug est défini et non vide
- ✅ Upload réussit
- ✅ Redirection vers `/companies/[slug]/rfps/[new-id]`

**Si erreur "Company context not loaded"**:
- Cela indique que le slug n'est pas encore chargé
- Attendre 1-2 secondes et réessayer
- Vérifier dans les logs React DevTools que le params Promise est résolu

---

### ✅ TEST 3: Vérification des Logs Serveur
**Plateforme**: Vercel Dashboard

**Actions**:
1. Aller sur https://vercel.com/jonathan-gaudettes-projects/market-intelligence
2. Cliquer sur "Logs" ou "Functions"
3. Filtrer par `/api/v1/rfp/rfps`
4. Rechercher les logs de la requête POST

**Logs serveur à vérifier**:
```
[RFP API] POST request received
[RFP API] companySlug from FormData: [slug-value]
[RFP API] title: Test RFP Upload
[RFP API] clientName: Test Client
[RFP API] Auth result: {
  hasError: false,
  hasUser: true,
  hasCompany: true,
  companyId: [company-id],
  companyName: [company-name]
}
```

**Résultats attendus**:
- ✅ `companySlug` est présent et non null
- ✅ `hasError` est `false`
- ✅ `hasCompany` est `true`
- ✅ `companyId` et `companyName` sont définis

---

### ✅ TEST 4: Affichage de la Liste des RFPs
**URL**: `https://market-intelligence-kappa.vercel.app/companies/[slug]/rfps`

**Actions**:
1. Naviguer vers la page RFP Assistant
2. Vérifier que les RFPs existants s'affichent

**Vérifications**:
- ✅ Les statistiques (Total RFPs, En cours, Soumis, Gagnés) affichent les bons chiffres
- ✅ Les RFPs existants apparaissent dans la liste
- ✅ Chaque RFP affiche:
  - Titre
  - Client Name
  - Statut (Brouillon, En cours, etc.)
  - Statut de parsing (En attente, Terminée, etc.)
  - Date de création
  - Deal value (si présent)
  - Deadline (si présente)
  - % de complétion

**Si pas de données**:
- Vérifier que vous êtes dans la bonne company (slug dans l'URL)
- Vérifier dans la base de données que les RFPs existent pour cette company
- Vérifier les logs serveur pour erreurs

---

### ✅ TEST 5: Navigation vers Détail d'un RFP
**URL**: `https://market-intelligence-kappa.vercel.app/companies/[slug]/rfps/[id]`

**Actions**:
1. Depuis la liste des RFPs, cliquer sur un RFP existant
2. Vérifier que la page de détail s'affiche correctement

**Vérifications**:
- ✅ Les informations du RFP s'affichent (titre, client, etc.)
- ✅ Le bouton "Back" fonctionne et retourne à `/companies/[slug]/rfps`
- ✅ Le bouton "View Questions" navigue vers `/companies/[slug]/rfps/[id]/questions`
- ✅ Pas d'erreur de routing

---

### ✅ TEST 6: Backward Compatibility (Cookie-based Auth)
**Objectif**: Vérifier que l'ancienne approche fonctionne toujours

**Actions**:
1. Ouvrir la console du navigateur
2. Vérifier que le cookie `activeCompanyId` est défini:
   ```js
   document.cookie.split(';').find(c => c.includes('activeCompanyId'))
   ```
3. Tester l'API directement sans slug (simuler ancienne requête):
   ```js
   // Ne PAS faire ça normalement, c'est juste pour tester
   fetch('/api/v1/rfp/rfps', {
     method: 'GET'
   }).then(r => r.json()).then(console.log)
   ```

**Résultats attendus**:
- ✅ Cookie est défini après navigation
- ✅ GET request fonctionne avec cookie seul (backward compat)

---

### ✅ TEST 7: Test de Sécurité
**Objectif**: Vérifier qu'un utilisateur ne peut pas accéder aux RFPs d'une autre company

**Actions**:
1. Noter le slug de votre company actuelle
2. Dans l'URL, essayer de changer le slug pour une autre company
3. Essayer d'accéder à `/companies/autre-slug/rfps`

**Résultats attendus**:
- ✅ Redirection vers `/login` si pas membre de cette company
- ✅ Message d'erreur approprié
- ✅ Pas de fuite de données

---

### ✅ TEST 8: Test Super Admin
**Objectif**: Vérifier que les super admins peuvent accéder à toutes les companies

**Prérequis**: Compte super admin

**Actions**:
1. Se connecter avec un compte super admin
2. Naviguer vers `/companies/[any-slug]/rfps`
3. Upload un RFP dans différentes companies

**Résultats attendus**:
- ✅ Super admin peut voir toutes les companies
- ✅ Super admin peut upload dans n'importe quelle company
- ✅ Pas d'erreur d'authentification

---

## Checklist de Déploiement

- [x] Code buildé sans erreurs
- [x] Tests TypeScript passent
- [x] Commit poussé sur GitHub
- [x] Déployé sur Vercel production
- [x] Logs de debugging activés
- [ ] Tests manuels effectués (à faire par l'utilisateur)
- [ ] Logs serveur vérifiés
- [ ] Validation que l'erreur est résolue

## Debugging Supplémentaire

### Si l'erreur persiste:

1. **Vérifier le slug dans l'URL**
   - L'URL doit être: `/companies/[slug]/rfps/new`
   - Vérifier que `[slug]` n'est pas vide ou undefined

2. **Vérifier la console navigateur**
   - Rechercher erreurs JavaScript
   - Vérifier les logs `[RFP Upload]`
   - Vérifier que le slug est défini

3. **Vérifier les logs Vercel**
   - Aller dans Vercel Dashboard > Logs
   - Filtrer par `/api/v1/rfp/rfps`
   - Vérifier les logs `[RFP API]`

4. **Vérifier la base de données**
   ```sql
   SELECT id, name, slug FROM companies WHERE is_active = true;
   SELECT id, user_id, company_id, role FROM company_members WHERE user_id = '[your-user-id]';
   ```

5. **Tester en local**
   ```bash
   npm run dev
   # Naviguer vers http://localhost:3000
   # Tester l'upload localement avec les logs
   ```

## Prochaines Étapes

Si les tests passent:
1. ✅ Retirer les logs de debugging (optionnel)
2. ✅ Documenter la solution
3. ✅ Fermer le ticket

Si les tests échouent:
1. 🔍 Analyser les logs collectés
2. 🔧 Identifier le problème spécifique
3. 💻 Appliquer le fix approprié
4. 🔄 Redéployer et retester

## Contact

En cas de problème persistant, fournir:
- Screenshot de l'erreur
- Logs de la console navigateur (F12 > Console)
- URL exacte où l'erreur se produit
- Logs Vercel de la requête (si possible)
