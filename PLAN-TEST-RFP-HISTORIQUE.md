# Plan de Test - RFP Historique avec Q&R Complètes

## Vue d'ensemble

Ce document détaille le plan de test pour valider les nouvelles fonctionnalités de visualisation et gestion des RFPs historiques avec affichage complet des questions/réponses et suppression RAG.

## Corrections Appliquées

### ✅ Bug Fix: Erreur `getTime is not a function`
- **Problème**: TypeError dans la console du navigateur lors de l'affichage des dates
- **Cause**: formatRelativeTime() attendait un objet Date mais recevait une string depuis l'API JSON
- **Solution**: Fonction robuste qui accepte Date | string | number avec conversion automatique
- **Fichiers modifiés**:
  - `src/lib/utils/formatting.ts`
  - `src/components/rfp/historical-qa-browser.tsx`

## Tests à Effectuer

### 1. Test de la Page Détail RFP Historique

#### 1.1 Navigation vers un RFP Historique
**Étapes:**
1. Se connecter à l'application
2. Aller dans "Bibliothèque RFP" (menu latéral)
3. Cliquer sur un RFP avec le badge "📚 Historique"

**Résultat attendu:**
- ✅ Page se charge sans erreur dans la console
- ✅ Banner amber/jaune avec badge de résultat (Won/Lost)
- ✅ Section "Questions et Réponses Archivées" visible

#### 1.2 Affichage des Statistiques
**Étapes:**
1. Observer les 4 cartes de statistiques en haut de la section Q&R

**Résultat attendu:**
- ✅ "Réponses complètes" affiche le nombre correct
- ✅ "Questions totales" affiche le total
- ✅ "Mots moyens/réponse" affiche une moyenne calculée
- ✅ "Générées par IA" affiche le nombre de réponses IA

### 2. Test de Visualisation des Réponses

#### 2.1 Expansion d'une Question avec Réponse
**Étapes:**
1. Cliquer sur une carte de question avec bordure verte (= avec réponse)

**Résultat attendu:**
- ✅ La carte s'expand pour montrer le contenu de la réponse
- ✅ Métadonnées visibles:
  - Icône Bot (🤖) ou User (👤)
  - Nombre de mots
  - Score de confiance (si applicable)
  - Date relative (ex: "Il y a 2 jours") **SANS ERREUR**
- ✅ Texte de la réponse affiché (HTML formaté si disponible)
- ✅ Sources RFP affichées en badges en bas (si applicable)
- ✅ Bouton "Supprimer" visible en rouge

#### 2.2 Expansion d'une Question sans Réponse
**Étapes:**
1. Cliquer sur une carte de question avec bordure grise (= sans réponse)

**Résultat attendu:**
- ✅ La carte s'expand
- ✅ Message: "Aucune réponse disponible pour cette question."

#### 2.3 Collapsing de Questions
**Étapes:**
1. Cliquer à nouveau sur une question expandée

**Résultat attendu:**
- ✅ La carte se referme
- ✅ Chevron change de bas vers droite

### 3. Test de la Recherche

#### 3.1 Recherche dans les Questions
**Étapes:**
1. Dans la barre de recherche, taper un mot-clé présent dans une question
2. Observer le filtrage

**Résultat attendu:**
- ✅ Seules les questions contenant le mot-clé sont affichées
- ✅ Le compteur est mis à jour
- ✅ La recherche est insensible à la casse

#### 3.2 Recherche dans les Réponses
**Étapes:**
1. Dans la barre de recherche, taper un mot-clé présent dans une réponse (mais pas dans la question)
2. Observer le filtrage

**Résultat attendu:**
- ✅ La question contenant cette réponse est affichée
- ✅ Les autres questions sont filtrées
- ✅ Le filtrage fonctionne dans le contenu des réponses

#### 3.3 Réinitialisation de la Recherche
**Étapes:**
1. Effacer le texte de recherche

**Résultat attendu:**
- ✅ Toutes les questions réapparaissent
- ✅ Les stats retournent aux valeurs initiales

### 4. Test de Suppression RAG

#### 4.1 Suppression d'une Réponse
**Étapes:**
1. Expander une question avec réponse
2. Cliquer sur le bouton "Supprimer" (rouge)
3. Confirmer dans la boîte de dialogue

**Résultat attendu:**
- ✅ Message de confirmation apparaît avec texte:
  - "Êtes-vous sûr de vouloir supprimer cette réponse?"
  - "Cette action supprimera également les données du RAG."
- ✅ Après confirmation:
  - La question se met à jour (bordure devient grise)
  - Les stats sont rafraîchies
  - Message de succès ou rafraîchissement automatique
- ✅ **Console serveur**: Log `[RAG] Successfully deleted vectors for question {id}`
- ✅ **Pinecone**: Les vecteurs sont supprimés du namespace `rfp-library`

#### 4.2 Annulation de Suppression
**Étapes:**
1. Cliquer sur "Supprimer"
2. Cliquer sur "Annuler" dans la confirmation

**Résultat attendu:**
- ✅ Aucune suppression n'a lieu
- ✅ La réponse reste intacte
- ✅ Retour à l'état normal

### 5. Tests de Console et Erreurs

#### 5.1 Vérification Console Navigateur
**Étapes:**
1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet Console
3. Naviguer vers une page de RFP historique
4. Expander plusieurs questions avec réponses

**Résultat attendu:**
- ✅ **AUCUNE** erreur `TypeError: e.getTime is not a function`
- ✅ Aucune erreur "not available"
- ✅ Aucune erreur 404
- ✅ Logs d'info normaux uniquement

#### 5.2 Vérification Network
**Étapes:**
1. Onglet Network des DevTools ouvert
2. Recharger la page RFP historique
3. Observer les requêtes

**Résultat attendu:**
- ✅ `GET /api/companies/{slug}/rfps/{id}/questions-with-responses` retourne 200
- ✅ Response contient les questions avec réponses complètes
- ✅ Les dates sont au format ISO string dans le JSON
- ✅ Pas de requêtes échouées (404, 500)

### 6. Tests d'Intégration

#### 6.1 Workflow Complet
**Étapes:**
1. Créer un nouveau RFP actif
2. Parser les questions
3. Ajouter quelques réponses manuellement
4. Marquer le RFP comme historique (Won)
5. Aller dans la bibliothèque
6. Ouvrir le RFP historique
7. Vérifier que toutes les réponses sont visibles
8. Supprimer une réponse
9. Vérifier la suppression RAG

**Résultat attendu:**
- ✅ Le cycle complet fonctionne sans erreur
- ✅ La transition actif → historique préserve les données
- ✅ Les réponses sont accessibles dans la vue historique
- ✅ La suppression RAG fonctionne

#### 6.2 Test Multi-Utilisateur
**Étapes:**
1. Utilisateur A crée des réponses
2. Utilisateur B consulte le RFP historique
3. Utilisateur B essaie de supprimer une réponse de A

**Résultat attendu:**
- ✅ Les métadonnées d'auteur sont correctes
- ✅ La suppression fonctionne (si permissions OK)
- ✅ Les logs montrent le bon utilisateur

### 7. Tests de Performance

#### 7.1 RFP avec Beaucoup de Questions
**Étapes:**
1. Ouvrir un RFP historique avec 50+ questions

**Résultat attendu:**
- ✅ Chargement initial < 3 secondes
- ✅ Expansion/collapse fluide
- ✅ Recherche instantanée
- ✅ Pas de lag dans l'UI

#### 7.2 Réponses Volumineuses
**Étapes:**
1. Expander une question avec réponse de 1000+ mots

**Résultat attendu:**
- ✅ L'affichage est fluide
- ✅ Le HTML est correctement formaté
- ✅ Pas de problème de scroll

### 8. Tests de Compatibilité Navigateurs

**Navigateurs à tester:**
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (si macOS/iOS disponible)

**Tests à effectuer sur chaque:**
- Affichage des dates
- Expansion/collapse
- Recherche
- Suppression

## Checklist de Validation Finale

### Fonctionnalités Core
- [ ] Les réponses complètes sont visibles (texte + HTML)
- [ ] Les métadonnées sont affichées correctement
- [ ] La recherche fonctionne dans questions ET réponses
- [ ] La suppression RAG fonctionne correctement
- [ ] Les statistiques sont exactes

### Interface Utilisateur
- [ ] Design cohérent avec le thème amber/historique
- [ ] Animations fluides (expand/collapse)
- [ ] Boutons et actions clairs
- [ ] Responsive (mobile, tablet, desktop)

### Erreurs Résolues
- [ ] **Plus d'erreur `getTime is not a function`**
- [ ] Pas d'erreurs 404 dans la console
- [ ] Pas d'erreurs "not available"
- [ ] Build Next.js réussi sans warnings

### Performance
- [ ] Chargement initial rapide
- [ ] Recherche instantanée
- [ ] Suppression sans lag
- [ ] Pas de memory leaks

## Bugs Connus / Limitations

### Actuelles
- Aucun bug connu après les corrections

### Futures Améliorations Possibles
1. **Filtres Avancés**: Filtrer par type de contenu, confiance, auteur
2. **Comparaison**: Comparer les réponses entre différents RFPs
3. **Export**: Exporter les Q&R en PDF/Word
4. **Versioning**: Voir l'historique des versions de réponses
5. **Analytics**: Statistiques d'utilisation des réponses comme sources RAG

## Notes de Déploiement

### Environnement de Staging
- Tester d'abord sur une branche de staging
- Vérifier les logs Vercel pour erreurs
- Confirmer que Pinecone est accessible

### Production
- Deploy via GitHub → Vercel auto-deploy
- Monitorer les logs post-déploiement
- Vérifier que les utilisateurs ne voient pas d'erreurs

## Support

En cas de problème, vérifier:
1. **Console navigateur**: Erreurs JavaScript
2. **Logs serveur Vercel**: Erreurs API/Pinecone
3. **Network tab**: Requêtes échouées
4. **Build logs**: Erreurs TypeScript

## Contacts

Pour questions ou bugs:
- GitHub Issues: https://github.com/jonathangaudette-ai/market-intelligence/issues
- Documentation: CLAUDE.md dans le repo

---

**Dernière mise à jour**: 2025-01-13
**Version testée**: Commits `cbe971d` + `ef52af1`
**Status**: ✅ Build réussi, prêt pour tests manuels
