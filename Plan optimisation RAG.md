# Plan d'Optimisation RAG - Documents de Support RFP

**Version:** 1.0
**Date:** 14 novembre 2025
**Auteur:** Claude Code
**Statut:** Planification

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Objectifs](#objectifs)
3. [Architecture technique](#architecture-technique)
4. [Plan d'implémentation](#plan-dimplémentation)
5. [Détails techniques par composant](#détails-techniques-par-composant)
6. [Timeline et ressources](#timeline-et-ressources)
7. [Métriques de succès](#métriques-de-succès)
8. [Risques et mitigation](#risques-et-mitigation)

---

## 🎯 Vue d'ensemble

### Contexte

Le système actuel intègre déjà un RAG sophistiqué avec:
- ✅ Pipeline complet de traitement de documents (Extract → Analyze → Chunk → Embed)
- ✅ RAG multi-tenant avec Pinecone
- ✅ Retrieval "surgical" pour RFP historiques avec scoring multi-facteurs
- ✅ Génération de réponses avec Claude Sonnet 4.5

### Problématique

Les utilisateurs ont besoin d'intégrer des **documents de support** (guides méthodologiques, specs techniques, templates, études de cas) dans le même processus RAG pour enrichir la génération de réponses RFP, mais ces documents:
- Ne sont **pas liés** à un RFP historique spécifique
- Ont des **cas d'usage différents** (référence générale vs réponse historique)
- Nécessitent une **catégorisation différente** (par type de contenu vs par résultat RFP)

### Solution proposée

Étendre le système existant pour supporter les documents de support tout en:
- **Réutilisant** le pipeline de traitement existant (80% du code déjà prêt)
- **Distinguant** clairement docs support vs RFP historiques via métadonnées
- **Combinant** intelligemment les deux types lors du retrieval
- **Optimisant** l'UX pour une adoption rapide

---

## 🎯 Objectifs

### Objectifs business

1. **Accélérer la génération RFP** : Réduire de 45 min à 3 min par question grâce aux docs de support
2. **Améliorer la qualité** : Taux d'acceptation de 90%+ grâce aux sources éprouvées
3. **Faciliter l'adoption** : 80% des utilisateurs uploadent ≥5 docs dans le premier mois
4. **Mesurer l'impact** : Analytics d'utilisation pour optimisation continue

### Objectifs techniques

1. **Réutiliser l'infrastructure** : 0 duplication de code, extension du système existant
2. **Isolation multi-tenant** : Sécurité garantie via `companyId` filtering
3. **Performance** : Retrieval <500ms, génération <10s
4. **Scalabilité** : Support pour 1000+ documents par compagnie

### Objectifs UX

1. **Simplicité** : Upload en 4 étapes, ≤5 min par document
2. **Automatisation** : Auto-catégorisation, auto-suggestion de sources
3. **Transparence** : Scores de pertinence visibles, citations automatiques
4. **Contrôle** : Utilisateur valide les sections IA avant indexation

---

## 🏗️ Architecture technique

### Composants existants (à réutiliser)

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTANT (80% prêt)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📊 Base de données                                           │
│  ├─ Table `documents` (générique, multi-usage) ✅            │
│  ├─ Champs: documentType, metadata (JSONB flexible) ✅       │
│  └─ Support déjà pour competitive intel docs ✅              │
│                                                               │
│  🔄 Pipeline de traitement                                    │
│  ├─ API /extract (PDF → text) ✅                             │
│  ├─ API /analyze (Claude section detection) ✅               │
│  ├─ API /chunk (RecursiveCharacterTextSplitter) ✅           │
│  └─ API /embed (Batch OpenAI embeddings) ✅                  │
│                                                               │
│  🗄️ Vector Store                                             │
│  ├─ Pinecone namespace 'rfp-library' ✅                      │
│  ├─ Interface RFPVectorMetadata (flexible) ✅                │
│  └─ Multi-tenant filtering ✅                                │
│                                                               │
│  🤖 RAG Engine                                                │
│  ├─ MultiTenantRAGEngine class ✅                            │
│  ├─ Query + Synthesis pipeline ✅                            │
│  └─ Claude Sonnet 4.5 integration ✅                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Nouveaux composants (à développer)

```
┌─────────────────────────────────────────────────────────────┐
│                 NOUVEAUX COMPOSANTS (20%)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📁 Knowledge Base Management                                │
│  ├─ Page /knowledge-base (liste documents) 🆕                │
│  ├─ API /knowledge-base/upload (wizard) 🆕                   │
│  ├─ Composant KnowledgeBaseTable 🆕                          │
│  └─ Composant SupportDocUploadWizard 🆕                      │
│                                                               │
│  🏷️ Categorization System                                    │
│  ├─ Types de documents prédéfinis 🆕                         │
│  ├─ Auto-suggestion de tags (AI) 🆕                          │
│  └─ Mapping contentType ↔ document types 🆕                  │
│                                                               │
│  🔍 Enhanced Retrieval                                        │
│  ├─ Retrieval pondéré (support vs historical) 🔧            │
│  ├─ Filtres combinés (OR logic) 🔧                           │
│  └─ Source type indicators in UI 🆕                          │
│                                                               │
│  📊 Analytics & Insights                                      │
│  ├─ Usage tracking per document 🆕                           │
│  ├─ Dashboard analytics 🆕                                   │
│  └─ Optimization suggestions 🆕                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Flux de données complet

```
┌─────────────────────────────────────────────────────────────┐
│                      UPLOAD WORKFLOW                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [1. Upload PDF/DOCX]
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   API: /knowledge-base/upload           │
        │   - Validation fichier                  │
        │   - Création record `documents`         │
        │   - metadata.documentPurpose = 'rfp_support' │
        └─────────────────────────────────────────┘
                              │
                              ▼
                [2. Auto-catégorisation (AI)]
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Service: categorizeSupportDocument()  │
        │   - Claude Haiku: détection type        │
        │   - Suggestion tags                     │
        │   - Mapping relevantForCategories       │
        └─────────────────────────────────────────┘
                              │
                              ▼
              [3. User validation (optionnel)]
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Pipeline existant (RÉUTILISÉ)         │
        │   - /extract → texte                    │
        │   - /analyze → sections + scores        │
        │   - /chunk → 245 chunks                 │
        │   - /embed → vectors (batch)            │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Pinecone: namespace 'rfp-library'     │
        │   metadata: {                           │
        │     documentPurpose: 'rfp_support',     │
        │     isHistoricalRfp: false,             │
        │     category: 'methodology',            │
        │     tags: [...],                        │
        │     relevantForCategories: [...]        │
        │   }                                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
                    [✅ Document prêt]


┌─────────────────────────────────────────────────────────────┐
│                    RETRIEVAL WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
            [Question RFP: "Méthodologie projet?"]
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Content Type Detection                │
        │   - Claude: "project-methodology"       │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Pinecone Query avec OR filter:        │
        │   {                                     │
        │     companyId: "acme",                  │
        │     $or: [                              │
        │       {                                 │
        │         documentPurpose: 'rfp_support', │
        │         relevantForCategories: {        │
        │           $contains: 'project-methodology' │
        │         }                               │
        │       },                                │
        │       {                                 │
        │         isHistoricalRfp: true,          │
        │         rfpOutcome: 'won',              │
        │         contentType: 'project-methodology' │
        │       }                                 │
        │     ]                                   │
        │   }                                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Results (Top 10):                     │
        │   - 3× Support docs (score boost 1.2×)  │
        │   - 2× Historical RFPs (score 1.0×)     │
        │   - 5× General docs                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │   Synthesis avec Claude Sonnet 4.5:     │
        │   Context = {                           │
        │     SUPPORT DOCS: [sources 1-3],        │
        │     HISTORICAL RFPS: [sources 4-5],     │
        │     GENERAL: [sources 6-10]             │
        │   }                                     │
        └─────────────────────────────────────────┘
                              │
                              ▼
              [✅ Réponse générée avec citations]
```

---

## 📅 Plan d'implémentation

### Phase 0: Préparation (1 jour)

**Objectif:** Setup environnement et validation architecture

#### Tâches:
- [ ] Audit complet du code existant (documents, RFP, RAG)
- [ ] Validation des schémas de base de données
- [ ] Review de l'interface Pinecone `RFPVectorMetadata`
- [ ] Création de branches Git : `feature/support-docs-rag`
- [ ] Setup environnement de test
- [ ] Documentation des endpoints existants à réutiliser

#### Livrables:
- Document d'architecture validé
- Liste des APIs à créer vs réutiliser
- Environnement de dev prêt

---

### Phase 1: Backend - Data Model & API Core (3 jours)

**Objectif:** Étendre le modèle de données et créer les APIs de base

#### 1.1 Extension du modèle de données (0.5 jour)

**Fichiers:**
- `src/db/schema.ts`
- `src/lib/rfp/pinecone.ts`

**Tâches:**
- [ ] Ajouter types de documents support dans `RFPVectorMetadata`
  ```typescript
  documentType:
    | 'company_info'
    | 'product_doc'
    | 'technical_spec'    // NOUVEAU
    | 'methodology_guide'  // NOUVEAU
    | 'case_study'        // NOUVEAU
    | 'template'          // NOUVEAU
    | 'marketing_material' // NOUVEAU
    | 'past_rfp'
    | 'rfp_content'
  ```

- [ ] Ajouter champs métadonnées dans interface:
  ```typescript
  documentPurpose?: 'rfp_support' | 'historical_reference';
  isHistoricalRfp?: boolean;
  category?: string;
  tags?: string[];
  relevantForCategories?: string[];  // Content types pertinents
  version?: string;
  qualityScore?: number;
  timesUsed?: number;
  lastUsedAt?: string;
  ```

- [ ] Créer migration Drizzle pour nouveaux champs optionnels

**Tests:**
- [ ] Migration s'exécute sans erreur
- [ ] Interfaces TypeScript compilent
- [ ] Backward compatibility avec données existantes

#### 1.2 Service de catégorisation automatique (1 jour)

**Fichiers:**
- `src/lib/knowledge-base/auto-categorizer.ts` (NOUVEAU)

**Tâches:**
- [ ] Créer service `categorizeSupportDocument()`
  - Input: Texte extrait du document
  - Output: `{ documentType, suggestedTags, relevantForCategories, confidence }`

- [ ] Implémenter avec Claude Haiku (stratégie coût-optimisée)
  ```typescript
  const prompt = `
  Analyse ce document et retourne en JSON:
  {
    "documentType": "methodology_guide" | "product_doc" | ...,
    "suggestedTags": ["agile", "scrum", ...],
    "relevantForCategories": ["project-methodology", "team-structure"],
    "confidence": 0-100
  }

  Document:
  ${extractedText.slice(0, 4000)} // Premiers 4K chars
  `;
  ```

- [ ] Retry avec Claude Sonnet si confidence < 85%
- [ ] Caching des résultats (éviter re-analyse)

**Tests:**
- [ ] Test avec PDF méthodologie → `methodology_guide`
- [ ] Test avec specs technique → `technical_spec`
- [ ] Test retry sur low confidence
- [ ] Test performance (<2s par document)

#### 1.3 API Upload Knowledge Base (1.5 jours)

**Fichiers:**
- `src/app/api/companies/[slug]/knowledge-base/upload/route.ts` (NOUVEAU)

**Tâches:**
- [ ] Endpoint POST `/api/companies/[slug]/knowledge-base/upload`
  - Accept: `multipart/form-data` (file + metadata)
  - Validation: Type fichier, taille max (50MB)

- [ ] Workflow:
  1. Upload fichier vers Vercel Blob
  2. Créer record `documents` avec `documentPurpose: 'rfp_support'`
  3. Trigger auto-catégorisation (async)
  4. Retourner `documentId` + suggested metadata

- [ ] Endpoint PATCH `/api/companies/[slug]/knowledge-base/[documentId]/metadata`
  - Update tags, category, relevantForCategories (après validation user)

- [ ] Endpoint POST `/api/companies/[slug]/knowledge-base/[documentId]/process`
  - Trigger pipeline: extract → analyze → chunk → embed
  - Utilise les APIs existantes (réutilisation!)

**Tests:**
- [ ] Upload PDF 5MB → success
- [ ] Upload file >50MB → reject
- [ ] Auto-categorization appelée
- [ ] Pipeline processing fonctionne
- [ ] Multi-tenant isolation (companyId)

---

### Phase 2: Backend - Enhanced Retrieval (2 jours)

**Objectif:** Modifier le retrieval pour combiner support docs + historical RFPs

#### 2.1 Service de retrieval combiné (1 jour)

**Fichiers:**
- `src/lib/rfp/enhanced-retrieval.ts` (NOUVEAU)
- `src/app/api/companies/[slug]/rfps/[id]/questions/[questionId]/generate-response/route.ts` (MODIFIER)

**Tâches:**
- [ ] Créer fonction `retrieveWithSupportDocs()`
  ```typescript
  async function retrieveWithSupportDocs(params: {
    queryEmbedding: number[];
    contentType: string;
    companyId: string;
    excludeRfpIds?: string[];
    mode: 'basic' | 'standard' | 'advanced';
  }): Promise<{
    supportDocs: Source[];
    historicalRfps: Source[];
    generalDocs: Source[];
  }>
  ```

- [ ] Implémenter retrieval pondéré:
  ```typescript
  // Query 1: Support docs (boost 1.2×)
  const supportResults = await namespace.query({
    vector: queryEmbedding,
    topK: 5,
    filter: {
      companyId,
      documentPurpose: 'rfp_support',
      relevantForCategories: { $contains: contentType }
    }
  });

  // Query 2: Historical RFPs (boost 1.0×)
  const historicalResults = await namespace.query({
    vector: queryEmbedding,
    topK: 5,
    filter: {
      companyId,
      isHistoricalRfp: true,
      rfpOutcome: 'won',
      contentType: contentType
    }
  });

  // Combine avec pondération
  const combined = [
    ...supportResults.matches.map(m => ({
      ...m,
      score: m.score * 1.2,
      sourceType: 'support_doc'
    })),
    ...historicalResults.matches.map(m => ({
      ...m,
      score: m.score * 1.0,
      sourceType: 'historical_rfp'
    }))
  ].sort((a, b) => b.score - a.score).slice(0, 10);
  ```

- [ ] Modifier `generate-response/route.ts` pour utiliser nouveau retrieval

**Tests:**
- [ ] Query retourne mix support + historical
- [ ] Scores pondérés correctement
- [ ] Filtering par contentType fonctionne
- [ ] Exclusion RFPs fonctionne
- [ ] Performance <500ms

#### 2.2 Source tracking & analytics (1 jour)

**Fichiers:**
- `src/lib/knowledge-base/usage-tracker.ts` (NOUVEAU)

**Tâches:**
- [ ] Fonction `trackDocumentUsage(documentId, context)`
  - Incrémente `usageCount` dans metadata
  - Update `lastUsedAt` timestamp
  - Log usage context (rfpId, questionId, contentType)

- [ ] Fonction `getDocumentAnalytics(companyId, period)`
  - Top documents par usage
  - Documents sous-utilisés (<5 usages)
  - Tendances d'utilisation
  - Impact sur génération (temps, taux acceptation)

- [ ] Integration dans `generate-response/route.ts`
  - Tracker après génération réussie
  - Associer sources utilisées

**Tests:**
- [ ] Usage count s'incrémente
- [ ] Analytics retourne données correctes
- [ ] Performance queries analytics

---

### Phase 3: Frontend - UI Core (4 jours)

**Objectif:** Créer les interfaces utilisateur principales

#### 3.1 Page Knowledge Base (1 jour)

**Fichiers:**
- `src/app/(dashboard)/companies/[slug]/knowledge-base/page.tsx` (NOUVEAU)
- `src/components/knowledge-base/knowledge-base-table.tsx` (NOUVEAU)

**Tâches:**
- [ ] Page principale `/companies/[slug]/knowledge-base`
  - PageHeader avec breadcrumbs + bouton [+ Ajouter]
  - StatCards: Total docs, Par catégorie, Utilisés ce mois
  - Filtres: Search, Category dropdown, Tags multi-select
  - Table ou Grid de documents

- [ ] Composant `KnowledgeBaseTable`
  - Colonnes: Nom, Catégorie, Tags, Qualité, Usage, Date, Actions
  - Badges colorés par catégorie
  - Actions: Modifier, Réindexer, Archiver
  - Tri et pagination

- [ ] Empty State
  - Icon + message explicatif
  - CTA "Ajouter votre premier document"
  - Liste de docs suggérés

**Design:**
- Réutiliser patterns de `/documents` (table view)
- Color coding par documentType
- Hover effects sur cartes/rows

**Tests:**
- [ ] Page se charge sans erreur
- [ ] Filtres fonctionnent
- [ ] Actions (modifier, archiver) appellent API
- [ ] Empty state s'affiche si 0 docs

#### 3.2 Upload Wizard (1.5 jours)

**Fichiers:**
- `src/components/knowledge-base/support-doc-upload-wizard.tsx` (NOUVEAU)

**Tâches:**
- [ ] Wizard 4 étapes (inspiré de DocumentUploadWizard)

  **Étape 1: Upload**
  - FileDropzone réutilisable
  - Validation client (type, taille)
  - Preview file info

  **Étape 2: Catégorisation**
  - Select documentType (6 options)
  - Tags input avec suggestions AI
  - Checkboxes relevantForCategories (10 content types)
  - Select industries (optionnel)

  **Étape 3: Analyse**
  - Affichage live analyse IA
  - Liste sections détectées avec scores
  - Checkboxes pour inclusion/exclusion
  - Bouton "Modifier sélection"

  **Étape 4: Indexation**
  - Progress bar chunking + embedding
  - Messages de statut
  - Récapitulatif final
  - CTA "Fermer" ou "Ajouter autre"

- [ ] Gestion d'état wizard
  - Stepper component (réutiliser)
  - Navigation prev/next
  - Validation par étape
  - Error handling

**Tests:**
- [ ] Navigation entre étapes
- [ ] Validation bloque next si incomplet
- [ ] Upload API appelé correctement
- [ ] Progress tracking fonctionne
- [ ] Success state s'affiche

#### 3.3 Source Indicators in RFP UI (1 jour)

**Fichiers:**
- `src/components/rfp/question-list.tsx` (MODIFIER)
- `src/components/rfp/enhanced-source-indicator.tsx` (NOUVEAU)

**Tâches:**
- [ ] Composant `EnhancedSourceIndicator`
  - Affiche: "📚 X docs support | 📂 Y RFP gagnés | ✨ Ready"
  - Popover au hover: Liste sources avec scores
  - Color coding: Vert si ≥5 sources, jaune si 2-4, gris si <2

- [ ] Modifier `QuestionList` pour afficher indicateur
  - Fetch auto-detected sources via API
  - Display badge sous metadata question
  - Visual feedback "Ready to generate"

- [ ] API endpoint `/api/companies/[slug]/rfps/[id]/questions/[questionId]/sources/preview`
  - Retourne sources auto-détectées sans générer
  - Utilisé pour preview dans liste

**Tests:**
- [ ] Indicateur s'affiche correctement
- [ ] Popover montre détails sources
- [ ] API preview performante (<200ms)
- [ ] UI responsive

#### 3.4 Generation Modal Enhanced (0.5 jour)

**Fichiers:**
- `src/components/rfp/question-detail-modal.tsx` (MODIFIER)

**Tâches:**
- [ ] Section "Sources utilisées" dans modal génération
  - Groupées par type: Support docs, Historical RFPs, General
  - Checkboxes pour inclusion/exclusion manuelle
  - Scores de pertinence affichés

- [ ] Onglet "Sources" dans résultat généré
  - Liste toutes sources utilisées
  - Lien vers document source
  - Extraits de texte utilisés
  - Compteur utilisation par source

**Tests:**
- [ ] Sources groupées correctement
- [ ] Checkboxes fonctionnent
- [ ] Onglet Sources accessible
- [ ] Liens vers docs valides

---

### Phase 4: Frontend - Analytics & Optimization (2 jours)

**Objectif:** Dashboard analytics et suggestions d'optimisation

#### 4.1 Analytics Dashboard (1 jour)

**Fichiers:**
- `src/app/(dashboard)/companies/[slug]/knowledge-base/analytics/page.tsx` (NOUVEAU)
- `src/components/knowledge-base/analytics-dashboard.tsx` (NOUVEAU)

**Tâches:**
- [ ] Page Analytics `/knowledge-base/analytics`
  - Period selector (7j, 30j, 90j, custom)
  - Stats overview cards

- [ ] Section "Performance des Documents"
  - Top 10 documents utilisés (table avec tendances)
  - Graphique utilisation dans le temps
  - Documents sous-utilisés (<5 usages)

- [ ] Section "Impact sur RFP"
  - % questions avec docs support
  - Temps génération moyen (avec/sans support)
  - Taux d'acceptation (avec/sans support)
  - Graphique évolution

- [ ] Section "Suggestions d'optimisation"
  - Documents à mettre à jour (vieux ou obsolètes)
  - Gaps de couverture (content types sans docs)
  - Recommandations IA

**Tests:**
- [ ] Données chargées correctement
- [ ] Graphiques s'affichent
- [ ] Filtres période fonctionnent
- [ ] Suggestions pertinentes

#### 4.2 Notifications & Insights (1 jour)

**Fichiers:**
- `src/lib/knowledge-base/insights-engine.ts` (NOUVEAU)
- `src/components/knowledge-base/insight-card.tsx` (NOUVEAU)

**Tâches:**
- [ ] Service `generateInsights(companyId)`
  - Analyse patterns d'utilisation
  - Détecte anomalies (doc très utilisé soudainement)
  - Identifie gaps (content types sans docs)
  - Génère recommandations actionnables

- [ ] Affichage insights dans UI
  - Insight cards sur page principale KB
  - Badges "Nouveau" sur insights non lus
  - Actions rapides (ex: "Mettre à jour doc X")

- [ ] Exemples d'insights:
  - "Le Guide Méthodologie est très utilisé (+40% ce mois). Pensez à le mettre à jour."
  - "Vous n'avez aucun document pour 'pricing-structure'. Ajoutez-en un."
  - "Le doc X n'a pas été utilisé en 90 jours. Archiver?"

**Tests:**
- [ ] Insights générés correctement
- [ ] Affichage dans UI
- [ ] Actions rapides fonctionnent

---

### Phase 5: Testing & Quality Assurance (2 jours)

**Objectif:** Tests end-to-end et validation qualité

#### 5.1 Tests unitaires et d'intégration (1 jour)

**Tâches:**
- [ ] Tests backend
  - Auto-categorization service
  - Enhanced retrieval
  - Usage tracking
  - Analytics queries

- [ ] Tests frontend
  - Upload wizard flow
  - Knowledge base table
  - Source indicators
  - Analytics dashboard

- [ ] Tests d'intégration
  - Upload → Process → Index → Retrieve (full flow)
  - Multi-tenant isolation
  - Performance sous charge (100+ docs)

**Coverage target:** >80%

#### 5.2 Tests utilisateur et QA (1 jour)

**Tâches:**
- [ ] Scénarios utilisateur
  - Sarah upload premier doc (onboarding)
  - Marc génère RFP avec support docs
  - Julie consulte analytics

- [ ] Tests edge cases
  - Upload fichier corrompu
  - Document sans sections pertinentes
  - Query sans résultats
  - Très grand document (500 pages)

- [ ] Tests cross-browser
  - Chrome, Firefox, Safari
  - Mobile responsive

- [ ] Performance testing
  - Upload 10 docs simultanément
  - Retrieval avec 500+ docs indexés
  - Analytics avec 90 jours de données

**Livrables:**
- [ ] Test report avec screenshots
- [ ] Liste bugs identifiés + priorités
- [ ] Performance benchmarks

---

### Phase 6: Documentation & Déploiement (1 jour)

**Objectif:** Documentation et mise en production

#### 6.1 Documentation (0.5 jour)

**Tâches:**
- [ ] Documentation technique
  - README dans `/src/lib/knowledge-base/`
  - API documentation (endpoints, payloads)
  - Architecture diagrams mis à jour

- [ ] Documentation utilisateur
  - Guide "Getting Started" (first upload)
  - Best practices (naming, tagging)
  - FAQ

- [ ] Changelog
  - Features ajoutées
  - Breaking changes (s'il y en a)
  - Migration guide

**Livrables:**
- [ ] `/docs/knowledge-base/README.md`
- [ ] `/docs/knowledge-base/USER_GUIDE.md`
- [ ] `/docs/knowledge-base/API.md`

#### 6.2 Déploiement (0.5 jour)

**Tâches:**
- [ ] Préparation production
  - Variables d'environnement
  - Secrets (Pinecone, OpenAI, Claude)
  - Database migration script

- [ ] Déploiement staging
  - Deploy branch sur Vercel staging
  - Run migrations
  - Smoke tests

- [ ] Déploiement production
  - Merge vers main
  - Deploy production
  - Monitoring setup
  - Rollback plan

- [ ] Post-déploiement
  - Smoke tests production
  - Monitor logs 24h
  - User communication (email, in-app notification)

**Livrables:**
- [ ] Déploiement réussi
- [ ] Monitoring dashboards configurés
- [ ] Rollback plan documenté

---

## 📋 Détails techniques par composant

### Component 1: Auto-Categorizer Service

**Fichier:** `src/lib/knowledge-base/auto-categorizer.ts`

**Responsabilités:**
- Analyser le contenu d'un document
- Classifier le type de document
- Suggérer tags pertinents
- Mapper vers content types RFP

**Interface:**
```typescript
export interface CategorizationResult {
  documentType:
    | 'product_doc'
    | 'company_info'
    | 'technical_spec'
    | 'methodology_guide'
    | 'case_study'
    | 'template'
    | 'marketing_material';
  suggestedTags: string[];
  relevantForCategories: ContentType[];  // 'project-methodology', etc.
  confidence: number;  // 0-100
  reasoning: string;
}

export async function categorizeSupportDocument(
  extractedText: string,
  fileName?: string
): Promise<CategorizationResult>;
```

**Implémentation:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function categorizeSupportDocument(
  extractedText: string,
  fileName?: string
): Promise<CategorizationResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const prompt = `Analyse ce document et retourne un JSON avec cette structure exacte:

{
  "documentType": "methodology_guide",
  "suggestedTags": ["agile", "scrum", "project-management"],
  "relevantForCategories": ["project-methodology", "team-structure"],
  "confidence": 95,
  "reasoning": "Le document décrit une méthodologie Agile complète..."
}

Types possibles: product_doc, company_info, technical_spec, methodology_guide, case_study, template, marketing_material

Content types RFP possibles: company-overview, corporate-info, team-structure, company-history, values-culture, product-description, service-offering, project-methodology, technical-solution, project-timeline, pricing-structure

Nom du fichier: ${fileName || 'N/A'}

Extrait du document (premiers 4000 caractères):
${extractedText.slice(0, 4000)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',  // Fast + cheap
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(content.text) as CategorizationResult;

    // Retry avec Sonnet si confiance basse
    if (result.confidence < 85) {
      return await categorizeSupportDocumentWithSonnet(extractedText, fileName);
    }

    return result;
  } catch (error) {
    console.error('Categorization failed:', error);
    // Fallback: classification par défaut
    return {
      documentType: 'product_doc',
      suggestedTags: [],
      relevantForCategories: [],
      confidence: 0,
      reasoning: 'Fallback classification',
    };
  }
}

async function categorizeSupportDocumentWithSonnet(
  extractedText: string,
  fileName?: string
): Promise<CategorizationResult> {
  // Même logique mais avec claude-sonnet-4-5
  // Plus lent mais plus précis
}
```

**Tests:**
```typescript
describe('Auto-Categorizer', () => {
  it('should categorize methodology guide', async () => {
    const text = 'This guide describes our Agile Scrum methodology...';
    const result = await categorizeSupportDocument(text);

    expect(result.documentType).toBe('methodology_guide');
    expect(result.suggestedTags).toContain('agile');
    expect(result.relevantForCategories).toContain('project-methodology');
    expect(result.confidence).toBeGreaterThan(85);
  });

  it('should retry with Sonnet on low confidence', async () => {
    const text = 'Ambiguous content...';
    const result = await categorizeSupportDocument(text);
    // Should have called Sonnet
  });
});
```

---

### Component 2: Enhanced Retrieval Service

**Fichier:** `src/lib/rfp/enhanced-retrieval.ts`

**Responsabilités:**
- Combiner support docs + historical RFPs
- Pondération intelligente des scores
- Groupement par source type

**Interface:**
```typescript
export interface RetrievalSource {
  id: string;
  text: string;
  score: number;
  sourceType: 'support_doc' | 'historical_rfp' | 'general';
  metadata: {
    documentId?: string;
    documentName?: string;
    rfpId?: string;
    rfpTitle?: string;
    category?: string;
    tags?: string[];
  };
}

export interface EnhancedRetrievalResult {
  supportDocs: RetrievalSource[];
  historicalRfps: RetrievalSource[];
  generalDocs: RetrievalSource[];
  totalSources: number;
}

export async function retrieveWithSupportDocs(params: {
  queryEmbedding: number[];
  contentType: string;
  companyId: string;
  excludeRfpIds?: string[];
  mode: 'basic' | 'standard' | 'advanced';
}): Promise<EnhancedRetrievalResult>;
```

**Implémentation:**
```typescript
import { getPineconeIndex, getRFPNamespace } from './pinecone';

export async function retrieveWithSupportDocs(params: {
  queryEmbedding: number[];
  contentType: string;
  companyId: string;
  excludeRfpIds?: string[];
  mode: 'basic' | 'standard' | 'advanced';
}): Promise<EnhancedRetrievalResult> {
  const { queryEmbedding, contentType, companyId, excludeRfpIds = [], mode } = params;

  const topK = mode === 'basic' ? 5 : mode === 'standard' ? 8 : 15;
  const namespace = getRFPNamespace();

  // Query 1: Support documents
  const supportFilter: any = {
    companyId: { $eq: companyId },
    documentPurpose: { $eq: 'rfp_support' },
  };

  // Filtrer par content type si possible
  if (contentType && contentType !== 'general') {
    supportFilter.relevantForCategories = { $contains: contentType };
  }

  const supportResults = await namespace.query({
    vector: queryEmbedding,
    topK: Math.ceil(topK * 0.4),  // 40% des résultats
    includeMetadata: true,
    filter: supportFilter,
  });

  // Query 2: Historical RFPs
  const historicalFilter: any = {
    companyId: { $eq: companyId },
    isHistoricalRfp: { $eq: true },
    rfpOutcome: { $eq: 'won' },  // Seulement gagnés
  };

  if (contentType && contentType !== 'general') {
    historicalFilter.contentType = { $eq: contentType };
  }

  if (excludeRfpIds.length > 0) {
    historicalFilter.rfpId = { $nin: excludeRfpIds };
  }

  const historicalResults = await namespace.query({
    vector: queryEmbedding,
    topK: Math.ceil(topK * 0.4),  // 40% des résultats
    includeMetadata: true,
    filter: historicalFilter,
  });

  // Query 3: General documents (fallback)
  const generalFilter: any = {
    companyId: { $eq: companyId },
    documentType: { $in: ['company_info', 'product_doc'] },
  };

  const generalResults = await namespace.query({
    vector: queryEmbedding,
    topK: Math.ceil(topK * 0.2),  // 20% des résultats
    includeMetadata: true,
    filter: generalFilter,
  });

  // Pondération et combinaison
  const supportDocs = supportResults.matches.map(m => ({
    id: m.id,
    text: (m.metadata?.text as string) || '',
    score: (m.score || 0) * 1.2,  // Boost 20%
    sourceType: 'support_doc' as const,
    metadata: {
      documentId: m.metadata?.documentId as string,
      documentName: m.metadata?.documentName as string,
      category: m.metadata?.category as string,
      tags: m.metadata?.tags as string[],
    },
  }));

  const historicalRfps = historicalResults.matches.map(m => ({
    id: m.id,
    text: (m.metadata?.text as string) || '',
    score: (m.score || 0) * 1.0,  // Pas de boost
    sourceType: 'historical_rfp' as const,
    metadata: {
      rfpId: m.metadata?.rfpId as string,
      rfpTitle: m.metadata?.rfpTitle as string,
      category: m.metadata?.category as string,
    },
  }));

  const generalDocs = generalResults.matches.map(m => ({
    id: m.id,
    text: (m.metadata?.text as string) || '',
    score: (m.score || 0) * 0.8,  // Pénalité 20%
    sourceType: 'general' as const,
    metadata: {
      documentId: m.metadata?.documentId as string,
      documentName: m.metadata?.documentName as string,
    },
  }));

  // Trier par score final
  const allSources = [...supportDocs, ...historicalRfps, ...generalDocs]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    supportDocs: allSources.filter(s => s.sourceType === 'support_doc'),
    historicalRfps: allSources.filter(s => s.sourceType === 'historical_rfp'),
    generalDocs: allSources.filter(s => s.sourceType === 'general'),
    totalSources: allSources.length,
  };
}
```

**Tests:**
```typescript
describe('Enhanced Retrieval', () => {
  it('should combine support docs and historical RFPs', async () => {
    const embedding = new Array(1536).fill(0.1);
    const result = await retrieveWithSupportDocs({
      queryEmbedding: embedding,
      contentType: 'project-methodology',
      companyId: 'test-company',
      mode: 'standard',
    });

    expect(result.supportDocs.length).toBeGreaterThan(0);
    expect(result.historicalRfps.length).toBeGreaterThan(0);
    expect(result.totalSources).toBeLessThanOrEqual(8);
  });

  it('should boost support docs scores by 1.2x', async () => {
    // Test que les scores sont pondérés
  });

  it('should exclude specified RFP IDs', async () => {
    // Test exclusion
  });
});
```

---

### Component 3: Upload Wizard UI

**Fichier:** `src/components/knowledge-base/support-doc-upload-wizard.tsx`

**Responsabilités:**
- Guider l'utilisateur à travers 4 étapes
- Valider les inputs à chaque étape
- Communiquer avec les APIs backend
- Afficher progression en temps réel

**Interface:**
```typescript
interface SupportDocUploadWizardProps {
  companyId: string;
  onComplete: (documentId: string) => void;
  onCancel: () => void;
}

export default function SupportDocUploadWizard(props: SupportDocUploadWizardProps);
```

**Implémentation (structure):**
```typescript
'use client';

import { useState } from 'react';
import { Stepper } from '@/components/ui/stepper';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';

type Step = 'upload' | 'categorize' | 'analyze' | 'index';

export default function SupportDocUploadWizard({
  companyId,
  onComplete,
  onCancel,
}: SupportDocUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string>('');
  const [categorization, setCategorization] = useState<any>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const steps = [
    { id: 'upload', label: 'Upload' },
    { id: 'categorize', label: 'Catégorisation' },
    { id: 'analyze', label: 'Analyse' },
    { id: 'index', label: 'Indexation' },
  ];

  // Step 1: Upload
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);

    // Upload to backend
    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch(
      `/api/companies/${companyId}/knowledge-base/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    setDocumentId(data.documentId);
    setCategorization(data.suggestedMetadata);
    setCurrentStep('categorize');
  };

  // Step 2: Categorization
  const handleCategorize = async (metadata: any) => {
    // Update document metadata
    await fetch(
      `/api/companies/${companyId}/knowledge-base/${documentId}/metadata`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      }
    );

    // Trigger analysis
    const response = await fetch(
      `/api/companies/${companyId}/documents/${documentId}/analyze`,
      { method: 'POST' }
    );

    const analysis = await response.json();
    setSelectedSections(
      analysis.sections.filter((s: any) => s.shouldIndex).map((s: any) => s.id)
    );
    setCurrentStep('analyze');
  };

  // Step 3: Analysis (user can modify section selection)
  const handleAnalyze = async () => {
    // Update kept sections
    await fetch(
      `/api/companies/${companyId}/documents/${documentId}/filter`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keptSectionIds: selectedSections }),
      }
    );

    setCurrentStep('index');
    // Trigger processing
    await handleProcess();
  };

  // Step 4: Processing (auto-triggered)
  const handleProcess = async () => {
    // Chunk
    await fetch(
      `/api/companies/${companyId}/documents/${documentId}/chunk`,
      { method: 'POST' }
    );

    // Embed (with progress tracking)
    await fetch(
      `/api/companies/${companyId}/documents/${documentId}/embed`,
      { method: 'POST' }
    );

    // Complete!
    onComplete(documentId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Stepper steps={steps} currentStep={currentStep} />

      <div className="mt-8">
        {currentStep === 'upload' && (
          <UploadStep onFileSelect={handleFileSelect} />
        )}

        {currentStep === 'categorize' && (
          <CategorizeStep
            suggestedMetadata={categorization}
            onNext={handleCategorize}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'analyze' && (
          <AnalyzeStep
            sections={selectedSections}
            onSectionsChange={setSelectedSections}
            onNext={handleAnalyze}
            onBack={() => setCurrentStep('categorize')}
          />
        )}

        {currentStep === 'index' && (
          <IndexStep documentId={documentId} />
        )}
      </div>
    </div>
  );
}
```

**Tests:**
```typescript
describe('SupportDocUploadWizard', () => {
  it('should render upload step initially', () => {
    render(<SupportDocUploadWizard companyId="test" onComplete={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/glissez-déposez/i)).toBeInTheDocument();
  });

  it('should progress through steps', async () => {
    // Test flow complet
  });

  it('should call onComplete when finished', async () => {
    const onComplete = jest.fn();
    // Test completion
  });
});
```

---

## ⏱️ Timeline et ressources

### Timeline récapitulatif

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Phase 0: Préparation | 1 jour | - |
| Phase 1: Backend Core | 3 jours | Phase 0 |
| Phase 2: Enhanced Retrieval | 2 jours | Phase 1 |
| Phase 3: Frontend UI | 4 jours | Phase 1 |
| Phase 4: Analytics | 2 jours | Phase 2, 3 |
| Phase 5: Testing & QA | 2 jours | Phase 1-4 |
| Phase 6: Documentation & Deploy | 1 jour | Phase 5 |
| **TOTAL** | **15 jours** | - |

### Ressources nécessaires

#### Équipe recommandée

**Option A: Équipe complète (15 jours → 10 jours)**
- 1× Full-stack lead (architecture + reviews)
- 1× Backend developer (APIs + services)
- 1× Frontend developer (UI + components)
- 1× QA engineer (testing)

**Option B: Solo developer (recommandé)**
- 1× Full-stack developer (15 jours)
- Permet meilleure cohérence
- Phases séquentielles claires

#### Services externes

- **Pinecone:** Index existant (pas de coût additionnel)
- **OpenAI:** Embeddings (~$5-10 pour tests)
- **Anthropic:** Claude pour categorization (~$2-5 pour tests)
- **Vercel:** Storage Blob (inclus dans plan)

### Milestones critiques

| Date | Milestone | Critère de succès |
|------|-----------|-------------------|
| J+1 | Architecture validée | Document approuvé |
| J+4 | Backend Core ready | APIs testées, 100% pass |
| J+6 | Retrieval enhanced | Tests integration pass |
| J+10 | UI Core ready | Wizard fonctionne E2E |
| J+12 | Analytics ready | Dashboard affiche données |
| J+14 | QA complete | 0 bugs P0, <5 bugs P1 |
| J+15 | Production deploy | Smoke tests pass |

---

## 📊 Métriques de succès

### Métriques techniques

| Métrique | Target | Mesure |
|----------|--------|--------|
| **Temps d'upload** | <5 min par document | Time to indexed |
| **Retrieval latency** | <500ms | P95 latency |
| **Génération latency** | <10s | P95 latency |
| **Test coverage** | >80% | Jest/Vitest |
| **Uptime** | >99.5% | Premier mois |
| **Error rate** | <1% | Premier mois |

### Métriques business

| Métrique | Target | Délai |
|----------|--------|-------|
| **Adoption utilisateurs** | 80% upload ≥5 docs | 30 jours |
| **Temps de génération** | -85% (45min → 3min) | Immédiat |
| **Taux d'acceptation** | >90% réponses acceptées | 30 jours |
| **Utilisation docs support** | 70%+ questions utilisent support | 30 jours |
| **ROI perçu** | >80% utilisateurs satisfaits | 60 jours |

### Métriques utilisateur (UX)

| Métrique | Target | Mesure |
|----------|--------|--------|
| **Time to first upload** | <10 min après onboarding | User tracking |
| **Wizard completion rate** | >95% | Funnel analytics |
| **Support tickets** | <5 par semaine | Support system |
| **NPS Score** | >50 | Survey à 30 jours |

### Monitoring

**Dashboards à créer:**
1. **Technical Health**
   - API latencies (P50, P95, P99)
   - Error rates par endpoint
   - Pinecone query performance
   - OpenAI/Anthropic API status

2. **Usage Analytics**
   - Documents uploadés par jour
   - Top document types
   - Questions générées avec support docs
   - Taux d'acceptation des réponses

3. **User Engagement**
   - Active users par jour
   - Wizard completion rate
   - Documents par utilisateur
   - Time in app

---

## ⚠️ Risques et mitigation

### Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Performance Pinecone dégradée** | Faible | Élevé | - Batch queries<br>- Caching layer<br>- Fallback queries |
| **Coût embeddings explose** | Moyen | Moyen | - Batch embedding (déjà implémenté)<br>- Monitoring coûts<br>- Alertes seuils |
| **Migration données échoue** | Faible | Élevé | - Backup DB avant migration<br>- Dry-run tests<br>- Rollback plan |
| **Claude API rate limits** | Moyen | Faible | - Retry avec backoff<br>- Queue system<br>- Fallback sur Haiku |
| **Bugs backward compatibility** | Faible | Élevé | - Tests régression<br>- Feature flags<br>- Phased rollout |

### Risques business

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Faible adoption utilisateurs** | Moyen | Élevé | - Onboarding guidé<br>- Empty states clairs<br>- Documentation user-friendly |
| **Qualité docs support basse** | Moyen | Moyen | - Guidelines upload<br>- Quality score visible<br>- Suggestions amélioration |
| **Confusion RFP vs support docs** | Faible | Moyen | - UI claire avec badges<br>- Namespaces séparés visuellement<br>- Documentation |
| **ROI non prouvé** | Faible | Élevé | - Analytics détaillées<br>- A/B testing<br>- Surveys utilisateurs |

### Risques UX

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Wizard trop complexe** | Moyen | Moyen | - User testing<br>- Simplifier étapes<br>- Smart defaults partout |
| **Auto-categorization imprécise** | Moyen | Faible | - Confidence scores affichés<br>- Édition manuelle facile<br>- Retry avec Sonnet |
| **Surcharge d'information** | Faible | Moyen | - Progressive disclosure<br>- Sections collapsibles<br>- Filtres efficaces |
| **Temps d'upload trop long** | Faible | Moyen | - Progress indicators<br>- Background processing<br>- Notifications |

### Plan de contingence

**Si retards importants (>3 jours):**
1. **Réduire scope Phase 4 (Analytics)**
   - Lancer sans analytics avancées
   - Ajouter dans v1.1 post-launch

2. **Simplifier UI Wizard**
   - Réduire à 3 étapes (merge Analyze + Index)
   - Auto-accept sections IA (pas de validation user)

3. **MVP version**
   - Phase 1-3 seulement
   - Manual categorization (pas d'AI)
   - Analytics basiques

**Si bugs critiques en production:**
1. **Feature flag rollback**
   - Désactiver knowledge base UI
   - Laisser APIs actives pour debug

2. **Hotfix process**
   - Branch `hotfix/knowledge-base-*`
   - Fast-track review + deploy
   - Post-mortem dans 48h

---

## 📝 Notes d'implémentation

### Conventions de code

**Naming:**
- Composants: `PascalCase` (ex: `SupportDocUploadWizard`)
- Fichiers: `kebab-case` (ex: `support-doc-upload-wizard.tsx`)
- API routes: `kebab-case` (ex: `/knowledge-base/upload`)
- Functions: `camelCase` (ex: `categorizeSupportDocument`)

**File structure:**
```
src/
├── app/
│   └── (dashboard)/
│       └── companies/
│           └── [slug]/
│               └── knowledge-base/
│                   ├── page.tsx
│                   ├── analytics/
│                   │   └── page.tsx
│                   └── [documentId]/
│                       └── page.tsx
├── components/
│   └── knowledge-base/
│       ├── knowledge-base-table.tsx
│       ├── support-doc-upload-wizard.tsx
│       ├── analytics-dashboard.tsx
│       └── insight-card.tsx
├── lib/
│   └── knowledge-base/
│       ├── auto-categorizer.ts
│       ├── usage-tracker.ts
│       └── insights-engine.ts
└── app/
    └── api/
        └── companies/
            └── [slug]/
                └── knowledge-base/
                    ├── upload/
                    │   └── route.ts
                    └── [documentId]/
                        └── metadata/
                            └── route.ts
```

### Environnement variables

**Nouvelles variables (aucune!):**
- Réutilise existantes: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`

### Feature flags

**Recommandé pour rollout progressif:**
```typescript
// src/lib/feature-flags.ts
export const FEATURES = {
  KNOWLEDGE_BASE: process.env.NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE === 'true',
  KNOWLEDGE_BASE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_KB_ANALYTICS === 'true',
};

// Usage dans UI
{FEATURES.KNOWLEDGE_BASE && (
  <Link href="/knowledge-base">Base de Connaissances</Link>
)}
```

### Logs et monitoring

**Structured logging:**
```typescript
import { logger } from '@/lib/logger';

logger.info('Document uploaded', {
  documentId,
  companyId,
  documentType,
  fileSize,
  duration: Date.now() - startTime,
});

logger.error('Categorization failed', {
  documentId,
  error: error.message,
  stack: error.stack,
});
```

**Metrics tracking:**
```typescript
import { trackEvent } from '@/lib/analytics';

trackEvent('knowledge_base_document_uploaded', {
  documentType,
  fileSize,
  processingTime,
});
```

---

## 🎓 Références

### Documentation externe

- **Pinecone Filtering:** https://docs.pinecone.io/guides/data/filter-with-metadata
- **OpenAI Batch Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **Claude API:** https://docs.anthropic.com/claude/reference/messages
- **Drizzle Migrations:** https://orm.drizzle.team/docs/migrations

### Code existant à étudier

**Avant de commencer, reviewer:**
1. `src/lib/rfp/pinecone.ts` - Structure Pinecone
2. `src/lib/rag/intelligent-preprocessor.ts` - Analyse IA
3. `src/components/document-upload-wizard.tsx` - Pattern wizard
4. `src/app/api/companies/[slug]/rfps/[id]/questions/[questionId]/generate-response/route.ts` - Retrieval

### Ressources internes

- Architecture doc: `/docs/architecture.md`
- Database schema: `/src/db/schema.ts`
- API conventions: `/docs/api-conventions.md`

---

## ✅ Checklist de démarrage

Avant de commencer Phase 1:

- [ ] Review complet de ce plan
- [ ] Questions/clarifications documentées
- [ ] Environnement de dev configuré
- [ ] Accès à tous les services (Pinecone, OpenAI, Anthropic)
- [ ] Base de données de test avec données de seed
- [ ] Branch `feature/support-docs-rag` créée
- [ ] Kickoff meeting avec stakeholders
- [ ] Accord sur scope et timeline

---

## 📞 Contacts et support

**Questions techniques:**
- Architecture: [Lead Dev]
- Backend: [Backend Dev]
- Frontend: [Frontend Dev]
- DevOps: [DevOps]

**Questions business:**
- Product Owner: [PO]
- Stakeholders: [Liste]

**Escalation:**
- Bugs P0: Slack #incidents
- Décisions architecture: Weekly sync
- Scope changes: Product Owner

---

## 📜 Changelog

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-11-14 | Claude Code | Création initiale du plan |

---

**Prêt à démarrer! 🚀**

Ce plan est conçu pour être **actionnable immédiatement** avec un **ROI rapide** (80% du code réutilisé) et une **adoption utilisateur élevée** (UX optimisée).

Questions? Prêt à attaquer Phase 0! 💪
