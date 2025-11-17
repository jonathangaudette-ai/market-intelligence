# Plan d'Implémentation: Modal de Progression Streaming pour Upload de Documents

**Date:** 2025-11-16
**Experts Consultés:** Architecture Expert + UX Expert
**Effort Estimé:** 9-13 heures (1.5-2 jours)

---

## 📋 Synthèse des Recommandations Expertes

### 🏗️ Architecture (Expert Technique)

**Approche Recommandée:** **Server-Sent Events (SSE)** ✅

**Raisons:**
- ✅ Pattern déjà prouvé dans `bulk-generate/route.ts`
- ✅ Compatible Vercel (natif, pas d'infra supplémentaire)
- ✅ Temps réel (<100ms de latency)
- ✅ Efficace (1 requête SSE vs 300 requêtes polling)
- ✅ Simple à implémenter (copier pattern existant)

**Alternatives Rejetées:**
- ❌ WebSocket: Pas supporté sur Vercel Serverless
- ❌ Polling amélioré: Inefficace, latence 1s, 300+ requêtes
- ❌ Response chunking: Moins standard que SSE

**Effort Estimé:** 8-12 heures (1.5 jours)

---

### 🎨 UX (Expert Expérience Utilisateur)

**Design Recommandé:** Modal avec stepper vertical + détails expandables

**Inspiration Visuelle:**
- 🌟 Linear.app (deployment status)
- 🌟 Vercel (deployment progress)
- 🌟 GitHub Actions (logs streaming)
- 🌟 Supabase (migration logs)

**Principes UX Clés:**
1. **Transparence > Simplicité**: Montrer 5 étapes détaillées au lieu de 2 génériques
2. **Réassurance par les chiffres**: "45 embeddings créés" > "Processing..."
3. **Progressive disclosure**: Détails techniques expandables
4. **Recovery claire**: Erreurs avec 2-3 actions suggérées
5. **Respect du temps**: Possibilité de minimiser

---

## 🎯 Architecture Proposée

### Backend: Streaming SSE

**Route Modifiée:**
```typescript
POST /api/companies/[slug]/knowledge-base/upload
```

**Avant (JSON Response):**
```typescript
return NextResponse.json({
  documentId,
  status: 'pending',
  message: 'Analysis in progress...'
});
```

**Après (SSE Stream):**
```typescript
return new Response(stream.readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
});
```

**Événements Émis:**

```typescript
type UploadEvent =
  | { type: 'upload_complete'; documentId: string; blobUrl: string }
  | {
      type: 'step_start';
      step: 'extracting' | 'analyzing' | 'embedding' | 'indexing';
      details?: string;
      model?: string; // Pour 'analyzing': 'claude-haiku-4-5-20251001'
      chunkCount?: number; // Pour 'embedding'
      vectorCount?: number; // Pour 'indexing'
    }
  | {
      type: 'step_progress';
      step: 'embedding' | 'indexing';
      progress: number; // 0-100
      current?: number;
      total?: number;
    }
  | {
      type: 'step_complete';
      step: 'extracting' | 'analyzing' | 'embedding' | 'indexing';
      result?: {
        textLength?: number;
        pageCount?: number;
        documentType?: string;
        confidence?: number;
        embeddingCount?: number;
      };
    }
  | { type: 'complete'; documentId: string; totalTime: number }
  | {
      type: 'error';
      step?: 'extracting' | 'analyzing' | 'embedding' | 'indexing';
      error: string;
      recoverable?: boolean;
    };
```

**Flux de Traitement:**

```
1. Upload → Vercel Blob
   └─ event: { type: 'upload_complete', documentId, blobUrl }

2. Extraction de texte (PDF parsing)
   ├─ event: { type: 'step_start', step: 'extracting' }
   └─ event: { type: 'step_complete', step: 'extracting',
              result: { textLength: 45234, pageCount: 15 } }

3. Analyse Claude Haiku 4.5
   ├─ event: { type: 'step_start', step: 'analyzing',
              model: 'claude-haiku-4-5-20251001' }
   └─ event: { type: 'step_complete', step: 'analyzing',
              result: { documentType: 'product_doc', confidence: 0.92 } }

4. Génération Embeddings (OpenAI)
   ├─ event: { type: 'step_start', step: 'embedding', chunkCount: 45 }
   ├─ event: { type: 'step_progress', step: 'embedding', progress: 50 }
   └─ event: { type: 'step_complete', step: 'embedding',
              result: { embeddingCount: 45 } }

5. Indexation Pinecone
   ├─ event: { type: 'step_start', step: 'indexing', vectorCount: 45 }
   ├─ event: { type: 'step_progress', step: 'indexing',
              progress: 50, current: 50, total: 100 }
   └─ event: { type: 'step_complete', step: 'indexing' }

6. Complétion
   └─ event: { type: 'complete', documentId, totalTime: 34.7 }
```

---

### Frontend: Modal avec Streaming Reader

**Nouveaux Composants:**

1. **`DocumentUploadProgressModal.tsx`** - Modal principal
   - Dialog (Radix UI)
   - SSE stream reader
   - State management: steps, currentStep, error, isComplete
   - Event handler (switch sur event.type)
   - UI: header, stepper, progress bar, footer

2. **`UploadStepIndicator.tsx`** - Indicateur de step
   - Icons: Circle (pending), Loader2 (in-progress), CheckCircle2 (completed), XCircle (error)
   - Progress bar (pour embedding/indexing)
   - Détails expandables (Collapsible)
   - Duration display (e.g., "2.1s")

**Intégration:**

3. **`support-docs-upload.tsx`** (Modifier)
   - Ajouter state: `showProgressModal`
   - Supprimer: `pollAnalysisStatus` (obsolète)
   - Supprimer: `getStatusDisplay` (obsolète)
   - Modifier: `handleUpload()` → ouvre modal

---

## 📐 Design UX du Modal

### Vue Initiale (Upload en cours)

```
┌─────────────────────────────────────────────────────────────┐
│  Traitement du document en cours                   [X]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 Product-Guide-v2.pdf  •  2.4 MB                     │ │
│  │  Catégorie: Base de Connaissances                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ━━━━░░░░░░░░░░░░░░░░░░░░░░  10%  •  ~45s restantes        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ⏳ 1. Téléversement vers Vercel Blob  En cours...       │ │
│  │ ▼ Détails                                               │ │
│  │   └─ Taille: 2.4 MB                                     │ │
│  │      Vitesse: 1.2 MB/s                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ○ 2. Extraction du texte                En attente         │
│  ○ 3. Analyse IA (Claude Haiku 4.5)      En attente         │
│  ○ 4. Génération des embeddings          En attente         │
│  ○ 5. Indexation Pinecone                En attente         │
│                                                              │
│                                  [Réduire]  [Annuler]       │
└─────────────────────────────────────────────────────────────┘
```

### Vue Mid-Process (Analyse en cours)

```
┌─────────────────────────────────────────────────────────────┐
│  Traitement du document en cours                   [X]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 Product-Guide-v2.pdf  •  2.4 MB                     │ │
│  │  Catégorie: Base de Connaissances                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ████████████████░░░░░░░░  65%  •  ~12s restantes           │
│                                                              │
│  ✓ 1. Téléversement vers Vercel Blob      ▶ 0.8s           │
│                                                              │
│  ✓ 2. Extraction du texte                 ▶ 2.1s           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ⏳ 3. Analyse IA (Claude Haiku 4.5)   ▶ 12.3s...        │ │
│  │ ▼ Détails                                               │ │
│  │   10:23:19  Analyse avec Claude Haiku 4.5...            │ │
│  │   10:23:21  Catégorie détectée: Product Documentation   │ │
│  │   10:23:22  Confiance: 92%                              │ │
│  │   10:23:23  Type: Méthodologie projet                   │ │
│  │   10:23:24  Tags: [methodology, best-practices, agile]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ○ 4. Génération des embeddings          En attente         │
│  ○ 5. Indexation Pinecone                En attente         │
│                                                              │
│                                  [Réduire]  [Annuler]       │
└─────────────────────────────────────────────────────────────┘
```

### Vue Succès

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Document traité avec succès!                    [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 Product-Guide-v2.pdf  •  2.4 MB                     │ │
│  │  ✓ Analysé et indexé avec succès                        │ │
│  │                                                          │ │
│  │  45 segments créés  •  7,891 mots  •  15 pages          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ████████████████████████  100%  •  Terminé en 34.7s        │
│                                                              │
│  ✓ 1. Téléversement vers Vercel Blob     0.8s  [▶ Détails] │
│  ✓ 2. Extraction du texte                2.1s  [▶ Détails] │
│  ✓ 3. Analyse IA (Claude Haiku 4.5)     18.3s  [▶ Détails] │
│  ✓ 4. Génération des embeddings         12.5s  [▶ Détails] │
│  ✓ 5. Indexation Pinecone                1.2s  [▶ Détails] │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 💡 Résumé IA (Claude Haiku 4.5)                         │ │
│  │                                                          │ │
│  │ Ce document décrit une méthodologie agile pour gérer    │ │
│  │ des projets de développement logiciel. Il couvre les    │ │
│  │ sprints, les rétrospectives et les bonnes pratiques.    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│             [Téléverser un autre document]  [Fermer]        │
└─────────────────────────────────────────────────────────────┘
```

### Vue Erreur

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Erreur lors du traitement                      [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📄 Product-Guide-v2.pdf  •  2.4 MB                     │ │
│  │  ✕ Traitement échoué à l'étape 3/5                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ████████████░░░░░░░░░░░░  50%  •  Arrêté après 23.1s       │
│                                                              │
│  ✓ 1. Téléversement vers Vercel Blob     0.8s  [▶ Détails] │
│  ✓ 2. Extraction du texte                2.1s  [▶ Détails] │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✕ 3. Analyse IA (Claude Haiku 4.5)  Échec après 23.1s  │ │
│  │ ▼ Détails de l'erreur                                   │ │
│  │                                                          │ │
│  │   ⚠️ Erreur d'analyse IA                                │ │
│  │                                                          │ │
│  │   Le document contient du texte non extractible.        │ │
│  │   Il se peut que le PDF soit constitué d'images         │ │
│  │   scannées sans couche OCR.                             │ │
│  │                                                          │ │
│  │   💡 Solutions suggérées:                               │ │
│  │   1. Convertir le PDF avec Adobe Acrobat                │ │
│  │   2. Utiliser un outil OCR avant téléversement          │ │
│  │   3. Exporter le document en format .docx               │ │
│  │                                                          │ │
│  │   [▶ Détails techniques]  [📋 Copier les logs]         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ○ 4. Génération des embeddings         Non commencé        │
│  ○ 5. Indexation Pinecone               Non commencé        │
│                                                              │
│           [Réessayer l'analyse]  [Tout recommencer]         │
└─────────────────────────────────────────────────────────────┘
```

### Vue Minimisée (Coin bas-droite)

```
┌──────────────────────────────────────────┐
│ 📄 Product-Guide-v2.pdf  •  65%  •  ~12s │
│ ⏳ Analyse IA (Claude Haiku 4.5)         │
│ Catégorie détectée: Product (92%)        │
│                                          │
│ [Agrandir ↗]  [Annuler ✕]                │
└──────────────────────────────────────────┘
```

---

## 🛠️ Implémentation par Phase

### Phase 1: Backend SSE Streaming (3-4 heures)

**Fichier:** `src/app/api/companies/[slug]/knowledge-base/upload/route.ts`

#### Tâches:

1. **Setup SSE Infrastructure**
   ```typescript
   const encoder = new TextEncoder();
   const stream = new TransformStream();
   const writer = stream.writable.getWriter();

   const sendEvent = async (data: any) => {
     await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
   };
   ```

2. **Créer `processDocumentWithEvents()` function**
   - Remplace `triggerDocumentAnalysis()`
   - Émet des événements à chaque étape
   - Gère les erreurs avec événements `error`

3. **Événements par Étape:**

   **Upload Complete:**
   ```typescript
   await sendEvent({
     type: 'upload_complete',
     documentId,
     blobUrl
   });
   ```

   **Extraction:**
   ```typescript
   await sendEvent({ type: 'step_start', step: 'extracting' });
   const text = await extractText(buffer, filename);
   await sendEvent({
     type: 'step_complete',
     step: 'extracting',
     result: {
       textLength: text.length,
       pageCount: Math.ceil(text.length / 3000)
     }
   });
   ```

   **Analyse:**
   ```typescript
   await sendEvent({
     type: 'step_start',
     step: 'analyzing',
     model: 'claude-haiku-4-5-20251001'
   });
   const analysis = await analyzeDocument(text, filename);
   await sendEvent({
     type: 'step_complete',
     step: 'analyzing',
     result: {
       documentType: analysis.documentType,
       confidence: analysis.confidence
     }
   });
   ```

   **Embeddings:**
   ```typescript
   const chunks = chunkText(text, 1000, 200);
   await sendEvent({
     type: 'step_start',
     step: 'embedding',
     chunkCount: chunks.length
   });

   // Batch processing avec progress
   const batchSize = 10;
   for (let i = 0; i < chunks.length; i += batchSize) {
     const batch = chunks.slice(i, i + batchSize);
     await generateEmbeddings(batch.map(c => c.text));

     const progress = Math.min(
       Math.round(((i + batchSize) / chunks.length) * 100),
       100
     );
     await sendEvent({
       type: 'step_progress',
       step: 'embedding',
       progress
     });
   }

   await sendEvent({
     type: 'step_complete',
     step: 'embedding',
     result: { embeddingCount: chunks.length }
   });
   ```

   **Indexation:**
   ```typescript
   const vectors = prepareVectors(...);
   await sendEvent({
     type: 'step_start',
     step: 'indexing',
     vectorCount: vectors.length
   });

   const batchSize = 100;
   for (let i = 0; i < vectors.length; i += batchSize) {
     const batch = vectors.slice(i, i + batchSize);
     await namespace.upsert(batch);

     const progress = Math.round(((i + batchSize) / vectors.length) * 100);
     await sendEvent({
       type: 'step_progress',
       step: 'indexing',
       progress,
       current: Math.min(i + batchSize, vectors.length),
       total: vectors.length
     });
   }

   await sendEvent({ type: 'step_complete', step: 'indexing' });
   ```

   **Complétion:**
   ```typescript
   const totalTime = Math.round((Date.now() - startTime) / 1000);
   await sendEvent({ type: 'complete', documentId, totalTime });
   await writer.close();
   ```

4. **Return SSE Response**
   ```typescript
   return new Response(stream.readable, {
     headers: {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache, no-transform',
       'Connection': 'keep-alive',
       'X-Accel-Buffering': 'no',
     },
   });
   ```

5. **Supprimer** `triggerDocumentAnalysis()` et `GET` endpoint de polling

---

### Phase 2: Frontend Modal Component (4-5 heures)

#### 2.1 Créer `DocumentUploadProgressModal.tsx`

**Fichier:** `src/components/knowledge-base/document-upload-progress-modal.tsx`

**Structure:**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadStepIndicator } from './upload-step-indicator';

interface DocumentUploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  companySlug: string;
  documentCategory: DocumentCategory;
  contentType?: string;
  tags?: string[];
  onComplete: (documentId: string) => void;
}

type Step = 'extracting' | 'analyzing' | 'embedding' | 'indexing';

interface UploadStep {
  id: Step;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  details?: string;
  startTime?: number;
  endTime?: number;
  result?: any;
}

const INITIAL_STEPS: UploadStep[] = [
  { id: 'extracting', label: 'Extraction du texte', status: 'pending' },
  { id: 'analyzing', label: 'Analyse avec Claude Haiku 4.5', status: 'pending' },
  { id: 'embedding', label: 'Génération des embeddings', status: 'pending' },
  { id: 'indexing', label: 'Indexation dans Pinecone', status: 'pending' },
];

export function DocumentUploadProgressModal(props: DocumentUploadProgressModalProps) {
  const [steps, setSteps] = useState<UploadStep[]>(INITIAL_STEPS);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!props.isOpen) {
      resetState();
    } else {
      startUpload();
    }
  }, [props.isOpen]);

  const startUpload = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('file', props.file);
      formData.append('documentPurpose', getDocumentPurpose(props.documentCategory));
      formData.append('documentType', getDocumentType(props.documentCategory));
      if (props.contentType) formData.append('contentType', props.contentType);
      if (props.tags && props.tags.length > 0) {
        formData.append('tags', JSON.stringify(props.tags));
      }

      const response = await fetch(
        `/api/companies/${props.companySlug}/knowledge-base/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload échoué');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const event = JSON.parse(line.slice(6));
          handleEvent(event);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Upload annulé');
      } else {
        setError(error.message || 'Erreur lors de l\'upload');
      }
    }
  };

  const handleEvent = (event: any) => {
    switch (event.type) {
      case 'upload_complete':
        setDocumentId(event.documentId);
        break;

      case 'step_start':
        updateStep(event.step, {
          status: 'in_progress',
          startTime: Date.now(),
          details: event.details,
          progress: 0,
        });
        setCurrentStep(event.step);
        break;

      case 'step_progress':
        updateStep(event.step, { progress: event.progress });
        break;

      case 'step_complete':
        updateStep(event.step, {
          status: 'completed',
          endTime: Date.now(),
          progress: 100,
          result: event.result,
        });
        break;

      case 'complete':
        setIsComplete(true);
        setTotalTime(event.totalTime);
        setCurrentStep(null);
        break;

      case 'error':
        setError(event.error);
        if (event.step) {
          updateStep(event.step, { status: 'error' });
        }
        break;
    }
  };

  const updateStep = (stepId: Step, updates: Partial<UploadStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    props.onClose();
  };

  const handleComplete = () => {
    if (documentId) {
      props.onComplete(documentId);
    }
    props.onClose();
  };

  const resetState = () => {
    setSteps(INITIAL_STEPS);
    setCurrentStep(null);
    setDocumentId(null);
    setError(null);
    setIsComplete(false);
    setTotalTime(null);
  };

  const overallProgress = calculateOverallProgress(steps);

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traitement du document</DialogTitle>
          <DialogDescription>{props.file.name}</DialogDescription>
        </DialogHeader>

        {/* Steps Timeline */}
        <div className="space-y-3 py-4">
          {steps.map((step) => (
            <UploadStepIndicator
              key={step.id}
              step={step}
              isActive={currentStep === step.id}
            />
          ))}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progression totale</span>
            <span className="text-gray-500">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {totalTime !== null && (
            <p className="text-xs text-gray-500 text-right">
              Temps total: {totalTime}s
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {isComplete && !error && (
          <Alert>
            <AlertDescription className="text-green-700">
              ✅ Document téléversé et analysé avec succès!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {isComplete || error ? (
            <Button onClick={handleComplete}>
              {isComplete ? 'Terminé' : 'Fermer'}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function calculateOverallProgress(steps: UploadStep[]): number {
  const weights = {
    extracting: 15,
    analyzing: 40,
    embedding: 25,
    indexing: 20,
  };

  let totalProgress = 0;
  steps.forEach((step) => {
    const weight = weights[step.id as Step];
    if (step.status === 'completed') {
      totalProgress += weight;
    } else if (step.status === 'in_progress' && step.progress !== undefined) {
      totalProgress += (weight * step.progress) / 100;
    }
  });

  return Math.round(totalProgress);
}

function getDocumentPurpose(category: DocumentCategory): string {
  // Map from CATEGORY_MAPPING in support-docs-upload.tsx
  const mapping: Record<DocumentCategory, string> = {
    company_info: 'company_info',
    knowledge_base: 'rfp_support',
    rfp_won: 'rfp_response',
    rfp_all: 'rfp_response',
    competitive: 'rfp_support',
    product: 'rfp_support',
  };
  return mapping[category];
}

function getDocumentType(category: DocumentCategory): string {
  // Map from CATEGORY_MAPPING in support-docs-upload.tsx
  const mapping: Record<DocumentCategory, string> = {
    company_info: 'company_info',
    knowledge_base: 'product_doc',
    rfp_won: 'past_rfp',
    rfp_all: 'past_rfp',
    competitive: 'competitive_intel',
    product: 'product_doc',
  };
  return mapping[category];
}
```

#### 2.2 Créer `UploadStepIndicator.tsx`

**Fichier:** `src/components/knowledge-base/upload-step-indicator.tsx`

```typescript
'use client';

import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
  details?: string;
  startTime?: number;
  endTime?: number;
  result?: any;
}

interface UploadStepIndicatorProps {
  step: UploadStep;
  isActive: boolean;
}

export function UploadStepIndicator({ step, isActive }: UploadStepIndicatorProps) {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getDuration = () => {
    if (!step.startTime) return null;
    const end = step.endTime || Date.now();
    const duration = Math.round((end - step.startTime) / 1000);
    return `${duration}s`;
  };

  const getResultSummary = () => {
    if (!step.result) return null;

    switch (step.id) {
      case 'extracting':
        return `${step.result.textLength?.toLocaleString()} caractères, ${step.result.pageCount} pages`;
      case 'analyzing':
        return `Type: ${step.result.documentType} (${Math.round(step.result.confidence * 100)}% confiance)`;
      case 'embedding':
        return `${step.result.embeddingCount} embeddings générés`;
      case 'indexing':
        return 'Indexation complétée';
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-colors',
        isActive && 'bg-teal-50 border-teal-200',
        step.status === 'completed' && 'bg-green-50 border-green-200',
        step.status === 'error' && 'bg-red-50 border-red-200',
        step.status === 'pending' && 'bg-gray-50 border-gray-200'
      )}
    >
      <div className="shrink-0 mt-1">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{step.label}</h4>
          {getDuration() && (
            <span className="text-xs text-gray-500 font-mono">{getDuration()}</span>
          )}
        </div>

        {step.details && (
          <p className="text-sm text-gray-600 mb-2">{step.details}</p>
        )}

        {step.progress !== undefined && step.status === 'in_progress' && (
          <div className="space-y-1">
            <Progress value={step.progress} className="h-1.5" />
            <span className="text-xs text-gray-500">{step.progress}%</span>
          </div>
        )}

        {step.status === 'completed' && getResultSummary() && (
          <p className="text-xs text-gray-600 mt-1">{getResultSummary()}</p>
        )}
      </div>
    </div>
  );
}
```

---

### Phase 3: Intégration (1-2 heures)

**Fichier:** `src/components/knowledge-base/support-docs-upload.tsx`

**Modifications:**

1. **Ajouter imports:**
   ```typescript
   import { DocumentUploadProgressModal } from './document-upload-progress-modal';
   ```

2. **Ajouter state:**
   ```typescript
   const [showProgressModal, setShowProgressModal] = useState(false);
   ```

3. **Modifier `handleUpload()`:**
   ```typescript
   const handleUpload = () => {
     if (!selectedFile) return;
     setShowProgressModal(true); // Ouvre le modal au lieu de setUploading(true)
   };
   ```

4. **Supprimer code obsolète:**
   - Supprimer fonction `pollAnalysisStatus` (lignes 248-274)
   - Supprimer fonction `getStatusDisplay` (lignes 276-309)
   - Supprimer `uploadStatus` state
   - Supprimer affichage inline status (lignes 473-476)

5. **Ajouter modal component:**
   ```typescript
   return (
     <>
       <Card>
         {/* Existing upload form */}
         <Button onClick={handleUpload} disabled={!selectedFile}>
           <Upload className="h-4 w-4 mr-2" />
           Téléverser et analyser
         </Button>
       </Card>

       {/* NEW: Progress Modal */}
       {showProgressModal && selectedFile && (
         <DocumentUploadProgressModal
           isOpen={showProgressModal}
           onClose={() => setShowProgressModal(false)}
           file={selectedFile}
           companySlug={companySlug}
           documentCategory={documentCategory}
           contentType={contentType}
           tags={tags}
           onComplete={(documentId) => {
             setShowProgressModal(false);
             setSelectedFile(null);
             setContentType('');
             setTags([]);
             onUploadComplete();
             toast.success('Document téléversé avec succès!');
           }}
         />
       )}
     </>
   );
   ```

---

### Phase 4: Polish & Tests (1-2 heures)

#### 4.1 Accessibilité

**ARIA Live Regions:**
```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {currentStep && `Étape ${currentStepIndex} sur 4: ${currentStepLabel} en cours`}
</div>
```

**Keyboard Navigation:**
- Escape: Ferme modal (avec confirmation si in-progress)
- Tab: Navigation entre éléments interactifs
- Focus trap dans le modal

**Screen Reader Announcements:**
- Step start: "Étape 3 sur 4: Analyse IA en cours"
- Step complete: "Analyse IA terminée en 18 secondes"
- Progress: Every 20%: "40% terminé, environ 30 secondes restantes"
- Error: "Erreur à l'étape 3: Analyse IA. [error message]"

#### 4.2 Responsive Design

**Desktop (≥768px):** Modal centré, max-w-2xl
**Tablet (640-767px):** Modal légèrement plus étroit
**Mobile (<640px):** Bottom sheet (slide up from bottom)

#### 4.3 Tests

**Unit Tests:**
- [ ] `processDocumentWithEvents` émet les bons événements
- [ ] `updateStep` met à jour le state correctement
- [ ] `calculateOverallProgress` retourne le bon %

**Integration Tests:**
- [ ] Full flow: file → SSE stream → modal → completion
- [ ] Cancel annule le stream
- [ ] Erreurs affichées correctement

**E2E Tests (Playwright):**
- [ ] Upload PDF 1MB
- [ ] Modal affiche les 4 étapes
- [ ] Progress bar se met à jour
- [ ] Success message apparaît
- [ ] Document dans liste après fermeture

**Performance Tests:**
- [ ] 1MB PDF: <30s total
- [ ] 10MB PDF: <120s total
- [ ] 25MB PDF: <300s total

---

## 📊 Détails Techniques Importants

### Calcul de Progression Globale (Weighted)

Les étapes n'ont pas la même durée. On utilise des poids basés sur les durées typiques:

```typescript
const weights = {
  extracting: 15,  // 1-5s    (rapide)
  analyzing: 40,   // 10-120s (le plus lent)
  embedding: 25,   // 5-60s   (lent)
  indexing: 20,    // 1-5s    (rapide)
};
// Total: 100%

// Calculation:
let totalProgress = 0;
steps.forEach((step) => {
  const weight = weights[step.id];
  if (step.status === 'completed') {
    totalProgress += weight;
  } else if (step.status === 'in_progress' && step.progress !== undefined) {
    totalProgress += (weight * step.progress) / 100;
  }
});
```

### Gestion des Erreurs par Étape

**Scénarios:**

1. **Upload Failed (Vercel Blob)**
   - Message: "Le téléversement a échoué. Vérifiez votre connexion internet."
   - Actions: Réessayer, Réduire taille fichier

2. **Extraction Failed (PDF parsing)**
   - Message: "Impossible d'extraire le texte. Le PDF pourrait contenir uniquement des images."
   - Actions: Utiliser OCR, Convertir en texte, Contacter support

3. **Claude API Error**
   - Message: "L'analyse IA a échoué temporairement. Les serveurs Anthropic pourraient être surchargés."
   - Actions: Réessayer dans 1 min, Vérifier status.anthropic.com

4. **Embedding Failed (OpenAI API)**
   - Message: "Erreur lors de la création des embeddings."
   - Actions: Réessayer, Vérifier clé API, Contacter support

5. **Pinecone Failed**
   - Message: "L'indexation dans Pinecone a échoué."
   - Actions: Réessayer, Vérifier connexion Pinecone

### Timeout Handling

Le `maxDuration = 300` est déjà configuré. Pour documents très volumineux (>25MB):

```typescript
// Dans processDocumentWithEvents
const startTime = Date.now();

// Vérifier périodiquement le temps écoulé
const checkTimeout = () => {
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed > 270) { // 270s = 90% de 300s
    await sendEvent({
      type: 'error',
      error: 'Timeout imminent. Document trop volumineux (>25MB). Veuillez réduire la taille ou contacter le support.',
      recoverable: false
    });
    throw new Error('Timeout');
  }
};
```

---

## 📏 Estimation d'Effort Détaillée

| Tâche | Sous-tâches | Heures |
|-------|-------------|--------|
| **Phase 1: Backend** | | **3-4h** |
| Setup SSE | TransformStream, sendEvent | 0.5h |
| processDocumentWithEvents | Structure de base | 1h |
| Events: Upload + Extract | 2 événements | 0.5h |
| Events: Analyze | Claude + fallback | 0.5h |
| Events: Embed | Progress batching | 0.5h |
| Events: Index | Progress batching | 0.5h |
| Error handling | Try/catch, error events | 0.5h |
| Testing backend | Postman/curl tests | 0.5h |
| **Phase 2: Frontend** | | **4-5h** |
| Modal structure | Dialog + layout | 1h |
| SSE reader | ReadableStream parsing | 1h |
| State management | steps[], handlers | 1h |
| StepIndicator component | Icons, progress, details | 1h |
| UI polish | Colors, animations | 0.5h |
| Error UI | Alert, retry button | 0.5h |
| **Phase 3: Intégration** | | **1-2h** |
| Modify upload form | Add modal trigger | 0.5h |
| Remove old code | Polling, inline status | 0.5h |
| Testing integration | End-to-end flow | 1h |
| **Phase 4: Polish** | | **1-2h** |
| Accessibility | ARIA, keyboard nav | 0.5h |
| Responsive design | Mobile bottom sheet | 0.5h |
| Testing | E2E, performance | 1h |
| **TOTAL** | | **9-13h** |

**Estimation réaliste: 1.5-2 jours de travail**

---

## ✅ Checklist d'Implémentation

### Backend

- [ ] Ajouter SSE setup dans `upload/route.ts`
- [ ] Créer fonction `processDocumentWithEvents()`
- [ ] Event: `upload_complete`
- [ ] Event: `step_start` (extracting)
- [ ] Event: `step_complete` (extracting) avec textLength, pageCount
- [ ] Event: `step_start` (analyzing) avec model name
- [ ] Event: `step_complete` (analyzing) avec documentType, confidence
- [ ] Event: `step_start` (embedding) avec chunkCount
- [ ] Event: `step_progress` (embedding) - batching par 10
- [ ] Event: `step_complete` (embedding) avec embeddingCount
- [ ] Event: `step_start` (indexing) avec vectorCount
- [ ] Event: `step_progress` (indexing) - batching par 100
- [ ] Event: `step_complete` (indexing)
- [ ] Event: `complete` avec totalTime
- [ ] Event: `error` avec step, message, recoverable
- [ ] Return SSE Response avec headers
- [ ] Supprimer `triggerDocumentAnalysis()`
- [ ] Supprimer GET polling endpoint

### Frontend

- [ ] Créer `document-upload-progress-modal.tsx`
- [ ] Dialog wrapper (Radix UI)
- [ ] State: steps, currentStep, error, isComplete
- [ ] Function: `startUpload()` avec FormData
- [ ] SSE Reader: ReadableStream + decoder
- [ ] Event handler: switch sur event.type
- [ ] Update helpers: `updateStep()`, `calculateOverallProgress()`
- [ ] Créer `upload-step-indicator.tsx`
- [ ] Icons: Circle, Loader2, CheckCircle2, XCircle
- [ ] Progress bar (pour embedding/indexing)
- [ ] Duration display
- [ ] Result summary
- [ ] Modifier `support-docs-upload.tsx`
- [ ] Add state: `showProgressModal`
- [ ] Remove: `pollAnalysisStatus`
- [ ] Remove: `getStatusDisplay`
- [ ] Remove: `uploadStatus` state
- [ ] Modify: `handleUpload()` → open modal
- [ ] Add: `<DocumentUploadProgressModal>` component

### Polish

- [ ] ARIA live regions
- [ ] Keyboard navigation (Tab, Escape)
- [ ] Focus trap dans modal
- [ ] Screen reader announcements
- [ ] Mobile: bottom sheet
- [ ] Responsive typography
- [ ] Color contrast (WCAG AA)
- [ ] Error messages en français
- [ ] Animations: checkmark bounce, smooth transitions

### Tests

- [ ] Backend: Tester SSE avec curl/Postman
- [ ] Frontend: Upload 1MB PDF
- [ ] Frontend: Upload 10MB PDF
- [ ] Frontend: Upload 25MB PDF
- [ ] Test cancel mid-process
- [ ] Test errors (invalid PDF, Claude timeout)
- [ ] Test success flow
- [ ] Test mobile responsive
- [ ] Test accessibility (keyboard, screen reader)

---

## 🚀 Déploiement

### Pré-déploiement

1. ✅ Code compilé sans erreurs TypeScript
2. ✅ Tests manuels complétés (1MB, 10MB PDFs)
3. ✅ Responsive design testé (mobile, tablet, desktop)
4. ✅ Accessibility vérifié (keyboard, screen reader)

### Déploiement

1. Commit changes:
   ```bash
   git add .
   git commit -m "feat: streaming progress modal for document upload"
   git push origin main
   ```

2. Vercel auto-deploy (watch logs)

3. Post-déploiement:
   - Tester sur production avec 5MB+ PDF
   - Vérifier Vercel logs pour SSE events
   - Monitor Anthropic API usage
   - Monitor OpenAI API usage
   - Monitor Pinecone indexing

### Rollback Plan

Si problème critique:
```bash
git revert <commit-hash>
git push origin main
```

Ou via Vercel Dashboard: Previous Deployment → Promote to Production

---

## 📊 Métriques de Succès

### Quantitatives

| Métrique | Avant (Polling) | Après (SSE) | Target |
|----------|-----------------|-------------|--------|
| **Time to First Feedback** | 1-2s | <500ms | <500ms ✅ |
| **Total API Calls** | ~300 polls | 1 SSE stream | 1 ✅ |
| **User-Perceived Latency** | 1s delay | Real-time (<100ms) | <100ms ✅ |
| **Upload Success Rate** | ~95% | >98% | >98% ✅ |
| **Abandonment Rate** | ~15% | <5% | <5% ✅ |

### Qualitatives

**Feedback Utilisateur Attendu:**
- "Je savais toujours ce qui se passait"
- "Plus confiant dans le processus"
- "Les erreurs sont claires et je sais quoi faire"

**Feedback Support:**
- "Moins de tickets 'upload bloqué'"
- "Copy logs feature facilite le debugging"

---

## 🎯 Prochaines Étapes (Post-V1)

### V2 Features

1. **Minimize/Background Processing**
   - Toast coin bas-droite pendant traitement
   - Re-expand modal sur click
   - Navigation possible pendant upload

2. **Detailed Logs View**
   - Expandable "Voir logs techniques"
   - Timestamps par log entry
   - Export logs JSON

3. **Smart Retry**
   - Resume from failed step (pas de restart complet)
   - Exponential backoff sur retry
   - Preserve user metadata

4. **Time Remaining Estimation**
   - Basé sur taille fichier + historique
   - "~15s restantes" dynamique

### V3 Features

1. **Batch Upload**
   - Upload multiple files simultaneously
   - Progress global + par fichier

2. **Advanced Analytics**
   - Average processing time par taille
   - Most common errors
   - Cost tracking (Anthropic + OpenAI)

---

## 📚 Références

### Code Existant à Copier

1. **SSE Pattern:** `src/app/api/companies/[slug]/rfps/[id]/questions/bulk-generate/route.ts`
   - Lines 134-142: SSE setup
   - Lines 314-321: SSE response headers
   - Lines 200-300: Event loop

2. **Frontend SSE Reader:** `src/components/rfp/inline-bulk-generator.tsx`
   - Lines 138-154: ReadableStream reader
   - Lines 156-200: Event handler switch

3. **Dialog Modal:** `src/components/ui/dialog.tsx`
   - Radix UI Dialog primitive

4. **Progress Bar:** `src/components/ui/progress.tsx`
   - Radix UI Progress component

### Documentation Externe

- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Vercel Streaming](https://vercel.com/docs/functions/streaming)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)

---

## 🎉 Résumé

Ce plan propose d'implémenter un **modal de progression streaming** pour remplacer le polling actuel lors de l'upload de documents dans la Knowledge Base.

**Architecture:** Server-Sent Events (SSE)
**Design:** Modal avec stepper vertical (5 étapes)
**Effort:** 9-13 heures (1.5-2 jours)
**Avantages:** Temps réel, efficace, UX supérieure, prouvé (déjà utilisé dans bulk-generate)

**Prêt à implémenter dès confirmation!** ✅
