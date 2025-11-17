# Plan d'Implémentation: Génération Bulk RFP avec Streaming Temps Réel

**Date:** 2025-11-16
**Version:** 1.0
**Status:** Plan validé, prêt pour implémentation

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Spécifications validées](#spécifications-validées)
3. [Architecture technique](#architecture-technique)
4. [Composants à implémenter](#composants-à-implémenter)
5. [Plan d'implémentation](#plan-dimplémentation)
6. [Sécurité et performance](#sécurité-et-performance)
7. [Métriques de succès](#métriques-de-succès)

---

## 🎯 Vue d'ensemble

### Objectif
Permettre aux utilisateurs de générer automatiquement les réponses à plusieurs questions RFP simultanément, avec un affichage en temps réel du processus de génération.

### Problème résolu
- **Avant:** User doit générer 50+ réponses manuellement, une par une (2-4 heures)
- **Après:** User sélectionne 10 questions → génération automatique avec streaming visible (3-5 minutes)
- **ROI:** Réduction de 80-90% du temps de création du premier draft

### Valeur ajoutée
- ✅ Contrôle total utilisateur (déclenchement manuel)
- ✅ Feedback immédiat (streaming mot-par-mot)
- ✅ Performance maîtrisée (max 10 questions/batch)
- ✅ Transparence (voir exactement ce qui se génère)
- ✅ Résilience (sauvegarde temps réel, recovery après crash)

---

## ✅ Spécifications Validées

### 1. UX Flow & Point d'Entrée

**Où:** Page détail RFP, après catégorisation des questions
**Sélection:**
- Checkboxes individuelles par question
- Sélection rapide par catégorie complète
- Hard limit: maximum 10 questions par batch

**Questions déjà répondues:**
- Masquées/grisées (non sélectionnables)
- Évite la confusion et la duplication

---

### 2. Interface de Streaming

**Affichage:** Inline dans la page (pas de modal fullscreen)
**Contenu affiché:**
- Question EN COURS uniquement
- Streaming temps réel de la réponse (typing effect)
- Progress bar globale

**Navigation:**
- Bloqué dans l'interface pendant génération
- Possibilité d'annuler à tout moment

---

### 3. Limite de 10 Questions

**Si 50 questions à générer:**
- User fait 5 batches manuels de 10
- Sélectionne 10 → Génère → Sélectionne 10 autres → Répète

**Enforcement:**
- Hard limit: checkbox désactivée après 10 sélections
- Message: "Maximum 10 questions à la fois"

---

### 4. Séquence de Génération

**Ordre:** Strictement séquentiel
- Question 1 complète → Question 2 → Question 3...
- Pas de parallélisation (pour affichage propre)

**Si erreur sur 1 question:**
- Continuer avec les autres questions
- Notifier l'échec à la fin
- Afficher liste des erreurs avec raisons

---

### 5. Contrôles Utilisateur

**Annulation:**
- ✅ Bouton "Annuler" visible en permanence
- Arrête immédiatement la génération
- Garde toutes les réponses déjà générées

**Pause/Resume:**
- ✅ Bouton "Pause" / "Reprendre"
- Freeze le streaming
- Reprend exactement où on était

---

### 6. Persistance & États

**Sauvegarde:** Temps réel
- Chaque réponse sauvegardée dès qu'elle est complétée
- Pas d'attente de fin de batch
- Perte maximale: 1 question en cours si crash

**Status:** Toutes en "draft"
- Nécessite review utilisateur
- Permet modifications avant approbation

**Versioning:** Historique complet
- v1, v2, v3... pour chaque réponse
- Possibilité de restaurer version antérieure
- UI pour voir toutes les versions

---

### 7. Edge Cases

**Si user ferme le navigateur:**
- ✅ Reprend où il était grâce au save temps réel
- State sauvegardé dans localStorage
- Notification au retour: "Voulez-vous reprendre la génération?"

**Si données RAG insuffisantes:**
- ✅ Skip la question automatiquement
- Notification: "Question ignorée - Données insuffisantes"
- Continue avec les questions suivantes
- Liste finale des questions skipped avec raisons

---

## 🏗️ Architecture Technique

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│ UI: Page RFP Detail                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Questions List (grouped by category)                    │ │
│ │  ├─ Category A (5 questions) [Select All]              │ │
│ │  │   ├─ ☑ Question 1                                   │ │
│ │  │   ├─ ☑ Question 2                                   │ │
│ │  │   └─ ☐ Question 3 (has response - grayed out)      │ │
│ │  └─ Category B (8 questions)                           │ │
│ │      └─ ...                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Sticky Toolbar: "10 selected" | Cancel | Generate (10) ✨] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ InlineBulkGenerator Component                          │ │
│ │  ├─ Progress: [████░░░░░░] 4/10                        │ │
│ │  ├─ Current: "Question 4: Méthodologie projet..."      │ │
│ │  ├─ Streaming: "Notre méthodologie agile..."▊          │ │
│ │  └─ Controls: [Pause] [Annuler]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   [SSE Streaming]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ API: /bulk-generate (POST)                                  │
│                                                             │
│ FOR each question (sequential):                            │
│   1. Check RAG data availability                           │
│   2. Generate embedding                                    │
│   3. Dual Query Retrieval (support + historical + pinned) │
│   4. Stream response from Claude Sonnet 4.5               │
│   5. Save to DB (real-time, with versioning)              │
│   6. Send SSE events:                                     │
│      - question_start                                      │
│      - response_chunk (continuous)                         │
│      - question_completed / question_skipped / error       │
│                                                             │
│ Handle: Pause/Resume/Cancel via state management           │
└─────────────────────────────────────────────────────────────┘
                            ↓
                   [Database Layer]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (rfpResponses)                                   │
│  - responseText, responseHtml                              │
│  - version (NEW: v1, v2, v3...)                            │
│  - status: 'draft'                                         │
│  - wasAiGenerated: true                                    │
│  - sourcesUsed (JSON with RAG sources)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Composants à Implémenter

### 1. API Route avec SSE Streaming

**Fichier:** `src/app/api/companies/[slug]/rfps/[id]/questions/bulk-generate/route.ts`

**Responsabilités:**
- Valider les questionIds (max 10, appartiennent au RFP, companyId correct)
- Setup Server-Sent Events (SSE) streaming
- Boucle séquentielle sur chaque question
- Gestion pause/resume/cancel via state management
- Error handling gracieux (continue si 1 question échoue)
- Envoyer events SSE: `question_start`, `response_chunk`, `question_completed`, etc.

**Events SSE:**
```typescript
{
  type: 'question_start',
  index: 1,
  total: 10,
  questionId: 'uuid',
  questionText: 'Décrivez...',
  category: 'methodology'
}

{
  type: 'response_chunk',
  questionId: 'uuid',
  chunk: 'Notre méthodologie ',
  accumulated: 'Notre méthodologie '
}

{
  type: 'question_completed',
  questionId: 'uuid',
  responseId: 'uuid',
  responseText: '...',
  wordCount: 250,
  version: 1
}

{
  type: 'question_skipped',
  questionId: 'uuid',
  reason: 'Données insuffisantes dans la knowledge base'
}

{
  type: 'question_error',
  questionId: 'uuid',
  error: 'API timeout'
}

{
  type: 'batch_completed',
  totalProcessed: 10
}

{
  type: 'batch_cancelled',
  completedCount: 4
}
```

**Code clé:**
```typescript
// Setup SSE
const encoder = new TextEncoder();
const stream = new TransformStream();
const writer = stream.writable.getWriter();

// Sequential processing
for (let i = 0; i < questionIds.length; i++) {
  // Check for cancellation/pause
  if (shouldCancel) break;
  while (isPaused) await sleep(500);

  // Generate with streaming
  const responseStream = await generateResponseStreaming(...);

  // Stream chunks to client
  for await (const chunk of responseStream) {
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'response_chunk', chunk })}\n\n`
    ));
  }

  // Save to DB (real-time)
  const nextVersion = (existingResponses[0]?.version || 0) + 1;
  await db.insert(rfpResponses).values({ ..., version: nextVersion });
}

return new Response(stream.readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

---

### 2. Streaming Generator Service

**Fichier:** `src/lib/rfp/streaming-generator.ts`

**Responsabilités:**
- Générer embedding pour la question
- Dual Query Retrieval (3 sources: pinned + support + historical)
- Vérifier disponibilité données RAG (threshold: 3 chunks avec score >0.6)
- Build context complet (RFP metadata + RAG chunks)
- Stream réponse depuis Claude Sonnet 4.5
- Yield chunks en temps réel

**Code clé:**
```typescript
export async function* generateResponseStreaming(params): AsyncGenerator<string> {
  // 1. RAG Retrieval
  const queryEmbedding = await generateEmbedding(question.questionText);
  const retrievalResults = await dualEngine.retrieve(queryEmbedding, ...);

  // 2. Build context
  const fullContext = buildContextFromRetrievalResults(retrievalResults, rfp);

  // 3. Stream from Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    temperature: 0.3,
    system: buildSystemPrompt(question.category),
    messages: [{ role: 'user', content: buildUserPrompt(question, fullContext) }]
  });

  // 4. Yield chunks as they arrive
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text; // Stream to client
    }
  }
}

// Helper: Check if enough RAG data
export async function checkRAGDataAvailability(
  questionText: string,
  category: string,
  companyId: string
): Promise<boolean> {
  const results = await dualEngine.retrieve(...);
  const relevantChunks = results.chunks.filter(c => c.compositeScore > 0.6);
  return relevantChunks.length >= 3; // Threshold
}
```

---

### 3. UI Component - Inline Bulk Generator

**Fichier:** `src/components/rfp/InlineBulkGenerator.tsx`

**Responsabilités:**
- Afficher la question EN COURS avec streaming typing effect
- Progress bar globale (X/10 complétées)
- Boutons Pause/Resume/Annuler
- Liste des questions complétées/skipped/errors
- Gestion state via useState + EventSource
- Persistance state dans localStorage (recovery après crash)

**État React:**
```typescript
interface GenerationState {
  isGenerating: boolean;
  isPaused: boolean;
  currentIndex: number;
  currentQuestion: { id: string; text: string; category: string } | null;
  streamingText: string;
  completed: Set<string>;
  errors: Map<string, string>;
  skipped: Map<string, string>;
}
```

**EventSource handling:**
```typescript
const startGeneration = async () => {
  const response = await fetch('/api/.../bulk-generate', {
    method: 'POST',
    body: JSON.stringify({ questionIds })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));

      switch (data.type) {
        case 'question_start':
          setState({ currentQuestion: data, streamingText: '' });
          break;
        case 'response_chunk':
          setState({ streamingText: data.accumulated });
          break;
        case 'question_completed':
          setState({ completed: new Set(completed).add(data.questionId) });
          break;
        // ...
      }
    }
  }
};
```

**UI Structure:**
```tsx
<div className="border rounded-lg p-6 bg-muted/30">
  {/* Header with controls */}
  <div className="flex justify-between">
    <h3>Génération en cours ({completed.size}/{total})</h3>
    <div className="flex gap-2">
      <Button onClick={handlePauseResume}>
        {isPaused ? <Play /> : <Pause />}
      </Button>
      <Button onClick={handleCancel} variant="destructive">
        <Square /> Annuler
      </Button>
    </div>
  </div>

  {/* Progress bar */}
  <Progress value={(completed.size / total) * 100} />

  {/* Current question streaming */}
  <div className="border rounded-lg p-4 bg-background">
    <p className="font-medium">{currentQuestion.text}</p>
    <div className="bg-muted/50 rounded p-4 min-h-[120px]">
      <p className="whitespace-pre-wrap">
        {streamingText}
        {isGenerating && !isPaused && <span className="animate-pulse">▊</span>}
      </p>
    </div>
    <span className="text-xs">{countWords(streamingText)} mots</span>
  </div>

  {/* Summary */}
  <div className="grid grid-cols-3 gap-4">
    <div><CheckCircle2 /> {completed.size} complétées</div>
    <div><AlertTriangle /> {skipped.size} ignorées</div>
    <div><XCircle /> {errors.size} erreurs</div>
  </div>
</div>
```

---

### 4. Questions List avec Sélection

**Fichier:** Modifier `src/app/(app)/companies/[slug]/rfps/[id]/page.tsx`

**Ajouts:**
- État `selectedQuestions: string[]` (max 10)
- Groupement des questions par catégorie
- Checkboxes individuelles + checkbox de catégorie
- Hard limit enforcement (disable checkbox après 10)
- Griser les questions ayant déjà une réponse
- Sticky toolbar avec actions bulk
- Affichage conditionnel de `<InlineBulkGenerator />`

**Code clé:**
```typescript
// Group by category
const questionsByCategory = questions.reduce((acc, q) => {
  const cat = q.category || 'Autre';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(q);
  return acc;
}, {} as Record<string, typeof questions>);

// Select question (with limit)
const handleSelectQuestion = (questionId: string, hasResponse: boolean) => {
  if (hasResponse) return; // Grayed out

  setSelectedQuestions(prev => {
    if (prev.includes(questionId)) {
      return prev.filter(id => id !== questionId);
    }

    if (prev.length >= 10) {
      toast.error('Maximum 10 questions à la fois');
      return prev;
    }

    return [...prev, questionId];
  });
};

// Select entire category
const handleSelectCategory = (categoryQuestions) => {
  const selectableQuestions = categoryQuestions.filter(q => !q.hasResponse);
  const questionIds = selectableQuestions.map(q => q.id);

  const allSelected = questionIds.every(id => selectedQuestions.includes(id));

  if (allSelected) {
    // Deselect all
    setSelectedQuestions(prev => prev.filter(id => !questionIds.includes(id)));
  } else {
    // Select all (respecting 10 limit)
    const remaining = 10 - selectedQuestions.length;
    const toSelect = questionIds.slice(0, remaining);
    setSelectedQuestions(prev => [...new Set([...prev, ...toSelect])]);

    if (toSelect.length < questionIds.length) {
      toast.warning(`Limite atteinte - ${toSelect.length}/${questionIds.length} sélectionnées`);
    }
  }
};
```

**UI Structure:**
```tsx
{/* Sticky toolbar */}
{selectedQuestions.length > 0 && (
  <div className="sticky top-0 z-10 bg-background border-b p-4">
    <span>{selectedQuestions.length} sélectionnée(s)</span>
    {selectedQuestions.length === 10 && <Badge>Maximum (10/10)</Badge>}
    <Button onClick={() => setShowBulkGenerate(true)}>
      <Sparkles /> Générer ({selectedQuestions.length})
    </Button>
  </div>
)}

{/* Bulk generator (inline) */}
{showBulkGenerate && (
  <InlineBulkGenerator
    selectedQuestions={questions.filter(q => selectedQuestions.includes(q.id))}
    onComplete={() => {
      setShowBulkGenerate(false);
      setSelectedQuestions([]);
      mutate(); // Refresh questions list
    }}
  />
)}

{/* Questions grouped by category */}
{Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
  <div key={category}>
    {/* Category header with bulk checkbox */}
    <div className="flex items-center gap-3">
      <Checkbox
        checked={selectedInCategory === selectableCount}
        onCheckedChange={() => handleSelectCategory(categoryQuestions)}
      />
      <h3>{category}</h3>
    </div>

    {/* Questions */}
    {categoryQuestions.map(question => (
      <div className={cn(
        "flex items-start gap-3 p-4 border rounded-lg",
        question.hasResponse && "bg-muted/30 opacity-60"
      )}>
        <Checkbox
          checked={selectedQuestions.includes(question.id)}
          onCheckedChange={() => handleSelectQuestion(question.id, question.hasResponse)}
          disabled={
            question.hasResponse ||
            (!selectedQuestions.includes(question.id) && selectedQuestions.length >= 10)
          }
        />
        <div className="flex-1">
          <p>{question.questionText}</p>
          {question.hasResponse && (
            <Badge><CheckCircle2 /> Réponse disponible</Badge>
          )}
        </div>
      </div>
    ))}
  </div>
))}
```

---

## 📋 Plan d'Implémentation

### Phase 1: Backend Streaming (4 jours)

**Jour 1-2: API Route SSE**
- [ ] Créer `/bulk-generate/route.ts` avec setup SSE
- [ ] Implémenter boucle séquentielle sur questions
- [ ] Gestion des events SSE (question_start, chunk, completed, error, skipped)
- [ ] Tests avec curl/Postman pour valider streaming

**Jour 3: Service Streaming**
- [ ] Créer `streaming-generator.ts`
- [ ] Implémenter `generateResponseStreaming()` avec Claude streaming
- [ ] Implémenter `checkRAGDataAvailability()` (threshold 3 chunks >0.6)

**Jour 4: Persistance & Versioning**
- [ ] Migration DB: ajouter colonne `version` à `rfpResponses`
- [ ] Logic de versioning automatique (v1, v2, v3...)
- [ ] Save temps réel après chaque question complétée
- [ ] Tests d'intégration backend complet

---

### Phase 2: UI Inline Generator (3 jours)

**Jour 5-6: Component React**
- [ ] Créer `InlineBulkGenerator.tsx`
- [ ] State management (useState + EventSource)
- [ ] Parsing des events SSE
- [ ] Affichage streaming avec typing effect animation
- [ ] Progress bar + word count en temps réel

**Jour 7: Contrôles & Recovery**
- [ ] Boutons Pause/Resume/Annuler
- [ ] State persistence dans localStorage
- [ ] Recovery logic si fermeture navigateur
- [ ] Tests UI avec vraies données

---

### Phase 3: Questions Selection UI (2 jours)

**Jour 8: Sélection Questions**
- [ ] Modifier page RFP detail
- [ ] Groupement par catégorie
- [ ] Checkboxes individuelles + category-level
- [ ] Hard limit 10 (disable checkboxes)
- [ ] Griser questions avec réponses

**Jour 9: Toolbar & Integration**
- [ ] Sticky toolbar avec actions bulk
- [ ] Intégration `<InlineBulkGenerator />` dans page
- [ ] Refresh questions list après completion
- [ ] Tests de sélection (edge cases)

---

### Phase 4: Versioning UI (2 jours)

**Jour 10: Historique Versions**
- [ ] Component `ResponseVersionHistory.tsx`
- [ ] Afficher liste versions (v1, v2, v3...)
- [ ] Diff viewer entre versions
- [ ] Bouton "Restaurer version X"

**Jour 11: Intégration**
- [ ] Ajouter version history dans question detail
- [ ] UI pour voir quelle version est active
- [ ] Tests de versioning complet

---

### Phase 5: Testing & Polish (2 jours)

**Jour 12: Tests E2E**
- [ ] Tests avec 10 questions réelles
- [ ] Tests pause/resume/cancel
- [ ] Tests recovery après crash
- [ ] Tests données insuffisantes (skip)
- [ ] Tests erreurs API

**Jour 13: Polish & Deploy**
- [ ] Responsive design
- [ ] Animations polies
- [ ] Loading states élégants
- [ ] Documentation utilisateur
- [ ] Deploy en production

---

**Total: 13 jours de développement**

---

## 🔒 Sécurité et Performance

### Sécurité

**Multi-Tenant Isolation:**
- ✅ Validation `companyId` dans API route
- ✅ Vérification que questionIds appartiennent au RFP
- ✅ Vérification que RFP appartient au company
- ✅ RAG queries filtrées par `tenant_id` (Pinecone)

**Rate Limiting:**
- Max 1 batch actif par user à la fois
- Cooldown de 30 secondes entre batches
- Server-side validation stricte

**CSRF Protection:**
- Next.js built-in CSRF protection
- Auth middleware pour toutes les routes

---

### Performance

**Latence attendue:**
- 1 question: ~20-30 secondes (RAG retrieval + Claude streaming)
- 10 questions séquentielles: ~3-5 minutes total
- Perception utilisateur: Rapide grâce au streaming visible

**Coûts:**
- 1 question: ~$0.02 (Claude Sonnet 4.5)
- 1 batch de 10: ~$0.20
- 100 RFPs/mois × 10 questions: ~$200/mois
- Acceptable pour le ROI (économie de 2-4h/RFP)

**Optimisations:**
- Embedding généré 1 seule fois par question (cached)
- RAG retrieval optimisé avec reranking (+48% qualité)
- Claude streaming (user voit progrès immédiat)
- Save temps réel (pas de transaction lourde à la fin)

---

### Monitoring

**Métriques à tracker:**
```typescript
{
  event: 'bulk_generate_started',
  rfpId: 'uuid',
  questionCount: 10,
  timestamp: Date.now()
}

{
  event: 'bulk_generate_completed',
  rfpId: 'uuid',
  successCount: 9,
  skippedCount: 1,
  errorCount: 0,
  totalLatency: 180000, // ms
  avgLatencyPerQuestion: 20000 // ms
}

{
  event: 'question_generated',
  questionId: 'uuid',
  wordCount: 250,
  ragChunksUsed: 8,
  avgRetrievalScore: 0.85,
  latency: 22000 // ms
}
```

**Alertes:**
- Latency > 60s par question
- Error rate > 20%
- Skip rate > 30%
- Coûts quotidiens > $50

---

## 📊 Métriques de Succès

### KPIs Primaires

**1. Taux d'adoption**
- **Métrique:** % RFPs utilisant bulk generate
- **Cible:** 60% dans les 3 premiers mois
- **Mesure:** `COUNT(DISTINCT rfpId WHERE bulk_generate_used) / COUNT(DISTINCT rfpId)`

**2. Questions par batch**
- **Métrique:** Moyenne de questions sélectionnées
- **Cible:** 8-10 questions/batch
- **Mesure:** `AVG(questionCount) WHERE event = 'bulk_generate_started'`

**3. Taux de complétion**
- **Métrique:** % batches terminés sans annulation
- **Cible:** 85%+
- **Mesure:** `COUNT(completed) / COUNT(started)`

**4. Time to first draft**
- **Métrique:** Temps moyen pour générer 10 réponses
- **Cible:** <5 minutes
- **Mesure:** `AVG(totalLatency) WHERE questionCount = 10`

---

### KPIs Secondaires

**5. Taux de skip**
- **Métrique:** % questions ignorées (données insuffisantes)
- **Cible:** <10%
- **Attention si:** >20% (problème de knowledge base)

**6. Taux d'erreur**
- **Métrique:** % questions échouées (erreur API)
- **Cible:** <5%
- **Attention si:** >10%

**7. Taux d'édition**
- **Métrique:** % réponses auto-générées éditées par user
- **Cible:** 40-60% (normal - draft nécessite review)
- **Attention si:** >80% (qualité insuffisante)

**8. User satisfaction**
- **Métrique:** NPS après utilisation feature
- **Cible:** >8/10
- **Mesure:** Survey in-app après première utilisation

---

### Tableau de Bord

```
┌─────────────────────────────────────────────────────────────┐
│ BULK GENERATE - DASHBOARD                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Adoption (30 jours)                 [████████░░]  68%      │
│ Questions/batch (avg)               [████████░░]  8.2      │
│ Taux complétion                     [█████████░]  87%      │
│ Time to draft (10Q)                 [████████░░]  4m 23s   │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ Taux skip (données insuffisantes)  [██░░░░░░░░]  12%  ⚠️   │
│ Taux erreur (API)                   [█░░░░░░░░░]  3%   ✓   │
│ Taux édition                        [█████░░░░░]  52%  ✓   │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ Coûts (30 jours)                    $142 / $200 budget     │
│ NPS moyen                           8.4 / 10     ✓         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Flow Utilisateur Final

### Scénario Complet

**1. User arrive sur page RFP détail**
```
RFP: Appel d'offres Ville de Montréal
Status: Questions extraites (50 questions)

┌──────────────────────────────────────────────────┐
│ Méthodologie (12 questions)      [Tout sélectionner] │
│  ☐ 1. Décrivez votre méthodologie projet            │
│  ☐ 2. Quelles sont vos méthodes de gestion risques  │
│  ...                                                │
│                                                     │
│ Équipe & Expertise (8 questions)  [Tout sélectionner] │
│  ☐ 10. Présentez votre équipe                       │
│  ☑ 11. Quelles certifications possédez-vous         │
│     └─ 📄 Réponse disponible (grisé)                │
│  ...                                                │
└──────────────────────────────────────────────────┘
```

**2. User sélectionne questions**
```
User clique "Tout sélectionner" sur catégorie Méthodologie
→ 10 questions sélectionnées

Sticky Toolbar apparaît:
┌──────────────────────────────────────────────────┐
│ ✓ 10 questions sélectionnées  [Annuler] [Générer ✨] │
└──────────────────────────────────────────────────┘
```

**3. User clique "Générer"**
```
InlineBulkGenerator s'affiche inline:

┌──────────────────────────────────────────────────┐
│ Génération en cours (1/10)      [Pause] [Annuler] │
│                                                     │
│ Progress: [██░░░░░░░░] 10%                        │
│                                                     │
│ Question 1/10 - Méthodologie                  🔵    │
│ "Décrivez votre méthodologie projet"               │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Notre méthodologie projet s'appuie sur un   │   │
│ │ cadre agile éprouvé combinant Scrum et      │   │
│ │ Kanban. Nous structurons chaque projet en   │   │
│ │ 4 phases distinctes:                         │   │
│ │                                              │   │
│ │ 1. Découverte et planification (2-4 sem)    │   │
│ │ Durant cette phase, nous organisons des     │   │
│ │ ateliers collaboratifs avec vos équipes▊    │   │
│ └─────────────────────────────────────────────┘   │
│ 📝 98 mots                                         │
└──────────────────────────────────────────────────┘
```

**4. Streaming continue...**
```
Question 1 complétée ✓
→ Passe à Question 2
→ Progress: [████░░░░░░] 20%

Question 2: "Quelles sont vos méthodes de gestion risques"
→ Streaming: "Nous appliquons une approche proactive..."▊
```

**5. User met en pause**
```
User clique [Pause]
→ Streaming freeze
→ Bouton devient [Reprendre ▶]
→ Badge "⏸ En pause" apparaît

User peut prendre du café ☕
→ Revient 2 minutes plus tard
→ Clique [Reprendre]
→ Streaming reprend exactement où il était
```

**6. Question 5 skipped**
```
Question 5/10                                   ⚠️
"Décrivez vos processus de conformité RGPD"

❌ Question ignorée - Données insuffisantes dans la knowledge base

→ Passe automatiquement à Question 6
```

**7. Batch complété**
```
┌──────────────────────────────────────────────────┐
│ ✓ Génération terminée                            │
│                                                  │
│ Progress: [██████████] 100%                      │
│                                                  │
│ ✅ 9 complétées                                  │
│ ⚠️  1 ignorée (données insuffisantes)           │
│ ❌ 0 erreur                                      │
│                                                  │
│ [Fermer]                                         │
└──────────────────────────────────────────────────┘

Questions list refresh:
→ 9 questions ont maintenant badge "📄 Réponse disponible"
→ 1 question reste vide (celle skipped)
```

**8. User review les drafts**
```
User clique sur question 1:
→ Voit la réponse générée (status: DRAFT)
→ Badge "🤖 Auto-généré - Review requis"
→ Edit + améliore
→ Click "Approuver"
```

**9. User génère 10 autres questions**
```
User sélectionne 10 nouvelles questions
→ Répète le processus
→ Après 5 batches: 50 réponses générées en ~25 minutes
→ Au lieu de 2-4 heures manuelles
→ ROI: 80-90% de temps économisé ✨
```

---

## 📁 Structure des Fichiers

### Nouveaux Fichiers à Créer

```
src/
├─ app/
│  └─ api/
│     └─ companies/
│        └─ [slug]/
│           └─ rfps/
│              └─ [id]/
│                 └─ questions/
│                    └─ bulk-generate/
│                       └─ route.ts           ← NEW (API SSE)
│
├─ lib/
│  └─ rfp/
│     └─ streaming-generator.ts             ← NEW (Service)
│
└─ components/
   └─ rfp/
      ├─ InlineBulkGenerator.tsx            ← NEW (UI Component)
      └─ ResponseVersionHistory.tsx         ← NEW (Versioning UI)
```

### Fichiers à Modifier

```
src/
├─ app/
│  └─ (app)/
│     └─ companies/
│        └─ [slug]/
│           └─ rfps/
│              └─ [id]/
│                 └─ page.tsx               ← MODIFIER (Questions list + selection)
│
└─ db/
   ├─ schema.ts                             ← MODIFIER (version column)
   └─ migrations/
      └─ add_response_versioning.sql       ← NEW (Migration)
```

---

## 🎯 Critères de Validation

### Avant de Merger en Production

- [ ] ✅ Tests E2E réussis avec 10 questions réelles
- [ ] ✅ Streaming fonctionne parfaitement (pas de freeze)
- [ ] ✅ Pause/Resume/Annuler fonctionnels
- [ ] ✅ Recovery après fermeture navigateur testé
- [ ] ✅ Skip automatique si données insuffisantes
- [ ] ✅ Versioning fonctionne (v1, v2, v3...)
- [ ] ✅ Hard limit 10 questions enforced
- [ ] ✅ Questions avec réponses grisées correctement
- [ ] ✅ Save temps réel confirmé (pas de perte de données)
- [ ] ✅ Multi-tenant security validé
- [ ] ✅ Performance acceptable (<5min pour 10 questions)
- [ ] ✅ Coûts sous contrôle (<$0.25 par batch)
- [ ] ✅ Documentation utilisateur complète
- [ ] ✅ Code review approuvé
- [ ] ✅ Tests de régression passés

---

## 📞 Support & Questions

**En cas de problème:**
1. Vérifier les logs serveur (SSE events)
2. Vérifier la console browser (EventSource errors)
3. Vérifier localStorage state (recovery)
4. Tester avec une seule question d'abord
5. Documenter le problème avec captures d'écran

**Rollback plan:**
- Feature flag pour désactiver rapidement si nécessaire
- Branche `main` stable identifiée pour revenir en arrière
- Migration DB est additive (ajoute seulement `version` column)

---

**Document créé le:** 2025-11-16
**Prêt pour implémentation:** ✅
**Estimation totale:** 13 jours de développement
**ROI attendu:** Réduction de 80-90% du temps de création de draft RFP
