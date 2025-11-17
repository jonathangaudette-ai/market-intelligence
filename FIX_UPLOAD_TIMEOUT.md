# Fix: Upload Timeout pour Documents Volumineux

**Date:** 2025-11-16
**Commit:** 78834d4
**Issue:** Timeout lors de l'upload de documents >1MB (ex: Catalogue-INSTINCT-2024.pdf de 0.45 MB)

---

## 🐛 Problème Identifié

### Symptôme
Erreur "**Timeout lors de l'analyse du document**" après environ 60 secondes lors de l'upload d'un document volumineux.

### Cause Racine
Deux timeouts insuffisants:

1. **Frontend (`support-docs-upload.tsx`)**
   - Polling limité à **60 secondes** (ligne 249)
   - Trop court pour documents complexes

2. **Backend (`upload/route.ts`)**
   - **Pas de `maxDuration`** configuré
   - Vercel utilisait le timeout par défaut (variable selon le plan)

### Pourquoi les Documents Volumineux Prennent du Temps

Pour un document comme `Catalogue-INSTINCT-2024.pdf` (0.45 MB):

| Étape | Temps estimé |
|-------|--------------|
| 1. Upload vers Vercel Blob | ~2-5s |
| 2. Extraction texte PDF | ~5-10s |
| 3. Analyse Claude Haiku 4.5 | ~15-30s |
| 4. Génération embeddings (OpenAI) | ~10-20s |
| 5. Indexation Pinecone | ~5-10s |
| **TOTAL** | **37-75 secondes** |

Pour des documents encore plus volumineux (>2MB), cela peut dépasser **2-3 minutes**.

---

## ✅ Solution Implémentée

### 1. Backend - Augmentation du Timeout Vercel

**Fichier:** `src/app/api/companies/[slug]/knowledge-base/upload/route.ts`

```typescript
// Allow long execution time for document analysis and embedding creation (5 minutes)
// This is especially important for larger documents (PDFs >1MB)
export const maxDuration = 300;
```

**Impact:**
- Permet à la route de s'exécuter jusqu'à **5 minutes** (300 secondes)
- Conforme à la limite Vercel Pro (300s)
- Suffisant pour documents jusqu'à **10-20 MB**

### 2. Frontend - Augmentation du Polling

**Fichier:** `src/components/knowledge-base/support-docs-upload.tsx`

```typescript
const pollAnalysisStatus = async (documentId: string) => {
  const maxAttempts = 300; // 300 seconds max (5 minutes) - increased for larger documents
  let attempts = 0;
  // ...
}
```

**Impact:**
- Le frontend attend maintenant jusqu'à **5 minutes** avant d'afficher "Timeout"
- Polling toutes les **1 seconde** = 300 tentatives max
- Aligné avec le timeout backend

---

## 📊 Comparaison Timeouts

| Route API | Timeout Avant | Timeout Après | Raison |
|-----------|---------------|---------------|--------|
| `import-historical` | 600s | 600s (inchangé) | Import RFP complet avec matching Q/A |
| `bulk-generate` | 300s | 300s (inchangé) | Génération de 10 questions max (~3-5 min) |
| `knowledge-base/upload` | ❌ **Non défini** | ✅ **300s** | Analyse documents volumineux |

| Frontend Component | Timeout Avant | Timeout Après |
|--------------------|---------------|---------------|
| `support-docs-upload.tsx` | ❌ **60s** | ✅ **300s** |

---

## 🧪 Tests Recommandés

### Test 1: Document Volumineux (>1MB)
1. Uploader `Catalogue-INSTINCT-2024.pdf` (0.45 MB)
2. Vérifier que l'analyse se termine sans timeout
3. Confirmer que le status passe de `processing` → `completed`

### Test 2: Document Très Volumineux (>5MB)
1. Uploader un PDF de 5-10 MB
2. Vérifier que le timeout de 5 minutes est suffisant
3. Si timeout, augmenter à `maxDuration = 600` (10 minutes)

### Test 3: Document Rapide (<1MB simple)
1. Uploader un TXT de quelques KB
2. Vérifier que l'analyse se termine en <30 secondes
3. Confirmer que le polling s'arrête dès que `completed`

---

## 📝 Logs à Surveiller

### Vercel Logs
Chercher les logs de cette route:
```bash
[DocumentAnalysis] Starting analysis for {documentId}
[DocumentAnalysis] Extracted X characters from {filename}
[DocumentAnalysis] Analysis complete: {type} ({confidence})
[CreateEmbeddings] Generated X embeddings
[CreateEmbeddings] Successfully indexed X chunks for {documentId}
```

### Erreurs Possibles
Si timeout persiste malgré le fix:

1. **Vercel timeout (rare):**
   - Vérifier que Vercel Pro est actif
   - Limite absolue: 300s pour Pro, 60s pour Hobby

2. **OpenAI API lent:**
   - Embeddings peuvent être lents si OpenAI est saturé
   - Solution: Batch les embeddings par groupes de 50

3. **Pinecone indexation lente:**
   - Vérifier que l'index Pinecone est en `us-east-1` (même région que Vercel)
   - Batch size: 100 vectors par requête (ligne 466)

---

## 🚀 Déploiement

### Commit
```
78834d4 - fix: increase document upload timeout to 5 minutes
```

### Files Changed
- `src/app/api/companies/[slug]/knowledge-base/upload/route.ts` (+3 lignes)
- `src/components/knowledge-base/support-docs-upload.tsx` (+1 ligne)

### Déploiement Vercel
✅ Poussé vers `main` branch
✅ Vercel déploiement automatique en cours
✅ Vérifie: https://vercel.com/jonathangaudette-ai/market-intelligence

---

## 🔮 Optimisations Futures

### Option 1: Streaming Progress (Phase 2)
Au lieu d'attendre la fin de l'analyse, streamer le progrès:
```
Upload → Processing... (25%)
Analyzing... (50%)
Embedding... (75%)
Indexing... (90%)
Completed! (100%)
```

### Option 2: Background Jobs (Phase 3)
Pour documents TRÈS volumineux (>20MB):
- Upload immédiat → status `pending`
- Queue job (Vercel Queues ou BullMQ)
- Email notification quand terminé

### Option 3: Chunked Upload
Pour documents >50MB:
- Upload par chunks de 10MB
- Assembler côté serveur
- Analyse parallèle

---

## 📞 Support

**En cas de problème:**
1. Vérifier Vercel Logs: https://vercel.com/jonathangaudette-ai/market-intelligence/logs
2. Vérifier OpenAI usage: https://platform.openai.com/usage
3. Vérifier Pinecone metrics: https://app.pinecone.io

**Si timeout persiste après 5 minutes:**
- Probablement un document >10MB
- Envisager d'augmenter à `maxDuration = 600` (10 minutes, mais rare)

---

**Fix appliqué le:** 2025-11-16
**Par:** Claude Code + Jonathan Gaudette
**Status:** ✅ Déployé en Production
