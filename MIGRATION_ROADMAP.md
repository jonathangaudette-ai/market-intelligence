# Migration Roadmap - Architecture Slug-based

## ✅ Phase 1: COMPLÉTÉE (Actuel)

Architecture slug-based fonctionnelle sans cookies!

### Ce qui fonctionne:
- ✅ Upload de RFP via `/api/companies/[slug]/rfps`
- ✅ Liste des RFPs avec extraction automatique du slug depuis referer
- ✅ Détails RFP accessible
- ✅ Enrichissement, parsing, questions fonctionnent
- ✅ Plus d'erreurs "No active company context"

### Technique:
- `requireRFPAuth()` extrait le slug depuis le header Referer automatiquement
- Fallback intelligent: cookie → referer → erreur
- Aucune modification des composants clients nécessaire (pour l'instant)

---

## 🔄 Phase 2: Nettoyage Mineur (30 min)

**Timing**: Quand tout est stable et testé

### Tâches:

1. **Retirer les logs de debugging**
   - `console.log('[RFP Upload] Starting upload...')` dans upload-form.tsx
   - `console.log('[requireRFPAuth] No cookie...')` dans auth.ts
   - `console.log('[RFP API] POST request...')` dans route.ts

2. **Supprimer endpoint inutilisé**
   - Supprimer `/api/companies/[slug]/set-active/route.ts`
   - Plus aucun code ne l'appelle

3. **Nettoyer imports inutiles**
   - Vérifier imports non utilisés dans layout.tsx
   - Cleanup dependencies

**Effort**: 30 minutes
**Risque**: Très faible
**Impact**: Code plus propre

---

## 🚀 Phase 3: Migration Complète des Endpoints (2-3h)

**Timing**: Quand on veut une architecture 100% cohérente

### Objectif:
Migrer TOUS les endpoints RFP vers `/api/companies/[slug]/...`

### Endpoints à Migrer:

#### Priorité 1 - Endpoints Critiques:
- [ ] `/api/v1/rfp/rfps/[id]` → `/api/companies/[slug]/rfps/[id]`
  - GET: Détails RFP
  - PUT: Mise à jour RFP
  - DELETE: Suppression RFP

- [ ] `/api/v1/rfp/rfps/[id]/parse` → `/api/companies/[slug]/rfps/[id]/parse`
  - POST: Démarrer le parsing

- [ ] `/api/v1/rfp/rfps/[id]/progress` → `/api/companies/[slug]/rfps/[id]/progress`
  - GET: Progression du parsing

#### Priorité 2 - Questions:
- [ ] `/api/v1/rfp/rfps/[id]/questions` → `/api/companies/[slug]/rfps/[id]/questions`
  - GET: Liste des questions

- [ ] `/api/v1/rfp/questions/[id]/response` → `/api/companies/[slug]/rfp/questions/[id]/response`
  - POST: Sauvegarder réponse

- [ ] `/api/v1/rfp/questions/[id]/generate-response` → `/api/companies/[slug]/rfp/questions/[id]/generate-response`
  - POST: Générer réponse AI

#### Priorité 3 - Enrichissement:
- [ ] `/api/v1/rfp/rfps/[id]/enrichment` → `/api/companies/[slug]/rfps/[id]/enrichment`
  - POST: Enrichir contexte

- [ ] `/api/v1/rfp/rfps/[id]/enrich-linkedin` → `/api/companies/[slug]/rfps/[id]/enrich-linkedin`
  - POST: Enrichir LinkedIn

- [ ] `/api/v1/rfp/rfps/[id]/categorize` → `/api/companies/[slug]/rfps/[id]/categorize`
  - POST: Catégoriser questions

### Composants à Mettre à Jour:

#### Client Components:
- [ ] `src/components/rfp/enrichment-form.tsx` - Appels API enrichment
- [ ] `src/components/rfp/response-editor.tsx` - Appels API réponses
- [ ] `src/components/rfp/question-list.tsx` - Appels API questions
- [ ] `src/components/rfp/question-detail-modal.tsx` - Appels API détails
- [ ] `src/components/rfp/parsing-progress.tsx` - Appels API progress
- [ ] `src/components/rfp/start-parsing-button.tsx` - Appels API parse
- [ ] `src/components/rfp/rfp-detail-view.tsx` - Appels API détails

#### Pattern de Migration:

**Avant:**
```typescript
const response = await fetch('/api/v1/rfp/rfps/123/parse', {
  method: 'POST'
});
```

**Après:**
```typescript
// Composant doit recevoir le slug
interface Props {
  rfpId: string;
  slug: string; // NOUVEAU
}

const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/parse`, {
  method: 'POST'
});
```

**Effort**: 2-3 heures
**Risque**: Moyen (beaucoup de fichiers)
**Impact**: Architecture 100% cohérente

---

## 🗑️ Phase 4: Suppression Complète (1h)

**Timing**: Après Phase 3 complétée et testée

### Tâches:

1. **Supprimer anciens endpoints**
   ```bash
   rm -rf src/app/api/v1/rfp
   ```

2. **Nettoyer code de cookies**
   - Supprimer `getCurrentCompany()` dans `auth/helpers.ts`
   - Supprimer lecture de cookie `activeCompanyId`
   - Simplifier `requireRFPAuth()` (plus besoin de fallback cookie)

3. **Mettre à jour tests**
   - Adapter les tests pour nouvelles URLs
   - Vérifier que tous les tests passent

4. **Cleanup final**
   - Vérifier aucune référence à `/api/v1/rfp` dans le code
   - Vérifier aucune référence à `activeCompanyId`
   - Cleanup imports inutilisés

**Effort**: 1 heure
**Risque**: Faible (si Phase 3 bien testée)
**Impact**: Codebase ultra propre

---

## 📚 Phase 5: Documentation (30 min)

**Timing**: À la fin de tout le processus

### Tâches:

1. **Documenter l'architecture**
   - Créer `/docs/ARCHITECTURE.md`
   - Expliquer le système slug-based
   - Documenter les patterns d'auth

2. **Mettre à jour README**
   - Ajouter section sur l'architecture multi-tenant
   - Expliquer comment ajouter de nouveaux endpoints

3. **Guide pour développeurs**
   - Comment créer un nouvel endpoint avec slug
   - Patterns de sécurité à suivre
   - Exemples de code

**Effort**: 30 minutes
**Risque**: Aucun
**Impact**: Meilleure maintenabilité

---

## 🎯 Estimation Totale

| Phase | Durée | Risque | Quand |
|-------|-------|--------|-------|
| ✅ Phase 1 | Complétée | - | Fait! |
| Phase 2 | 30 min | Très faible | Quand stable |
| Phase 3 | 2-3h | Moyen | Quand prêt |
| Phase 4 | 1h | Faible | Après Phase 3 |
| Phase 5 | 30 min | Aucun | À la fin |
| **TOTAL** | **4-5h** | - | Sur plusieurs sessions |

---

## ✨ Bénéfices de la Migration Complète

### Technique:
- Architecture 100% cohérente
- Aucune dépendance aux cookies
- Code plus maintenable
- Meilleure sécurité (contexte explicite dans URL)

### Performance:
- Moins de requêtes (pas d'appel à set-active)
- Pas de race conditions
- Caching plus efficace (URLs explicites)

### Développeur:
- Plus facile à débugger (tout dans l'URL)
- Moins de bugs potentiels
- Meilleure DX (Developer Experience)

---

## 🚦 Décision Recommandée

**Court terme (maintenant):**
- ✅ Rester sur Phase 1 (tout fonctionne!)
- Tester en production quelques jours
- S'assurer que tout est stable

**Moyen terme (semaine prochaine):**
- Faire Phase 2 (nettoyage mineur)
- Pas de risque, code plus propre

**Long terme (quand du temps libre):**
- Planifier Phase 3 sur une matinée
- Faire Phase 4 + 5 après

**Aucune urgence** - tout fonctionne parfaitement tel quel! 🎉
