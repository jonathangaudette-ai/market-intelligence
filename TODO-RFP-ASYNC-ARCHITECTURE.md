# TODO: Architecture Asynchrone pour Parsing RFP

## Contexte

Actuellement, le parsing RFP est **synchrone** : l'API route attend la fin du traitement complet avant de répondre. Cela fonctionne avec `maxDuration = 300` sur Vercel Pro, mais présente des limitations :

- ⏱️ Timeout de 5 minutes max (limite Vercel Pro)
- 🔄 Pas de possibilité de retry en cas d'échec partiel
- 📊 Updates de progression dépendent du polling frontend
- 💰 Coût: chaque requête garde une fonction serverless active pendant ~3 minutes

## Option 2: Architecture Asynchrone (Recommandé pour Production)

### Architecture Proposée

```
┌─────────────┐     POST /parse      ┌──────────────────┐
│   Frontend  │ ─────────────────────>│  API Route       │
│             │<─────────────────────│  (accepte & ret.) │
└─────────────┘     202 Accepted     └──────────────────┘
       │                                       │
       │ Polling /progress                    │ Enqueue job
       │                                       ▼
       │                              ┌──────────────────┐
       │                              │  Queue/Worker    │
       │                              │  (Inngest/QStash)│
       │                              └──────────────────┘
       │                                       │
       │                                       │ Process RFP
       │                                       ▼
       │                              ┌──────────────────┐
       │                              │  Background Job  │
       │                              │  - Parse PDF     │
       │                              │  - Extract (GPT) │
       │                              │  - Categorize    │
       │                              │  - Save to DB    │
       │                              └──────────────────┘
       │                                       │
       └──────────────────────────────────────┘
                Updates DB progress
```

### Solutions Possibles

#### 1. **Vercel Cron + Vercel KV** (Simple, Gratuit)
- Cron job vérifie les RFPs "pending" toutes les minutes
- KV stocke le state de progression
- ✅ Gratuit sur Hobby plan
- ✅ Facile à implémenter
- ❌ Moins scalable

#### 2. **Upstash QStash** (Recommandé)
- Queue management avec retry automatique
- Webhooks pour notifier le frontend
- ✅ Retry automatique en cas d'échec
- ✅ Excellent pour production
- 💰 ~$10/mois

#### 3. **Inngest** (Premium)
- Workflow orchestration avec visual monitoring
- Steps isolés (parse → extract → categorize)
- ✅ Monitoring excellent
- ✅ Retry granulaire par step
- 💰 ~$20/mois (after free tier)

### Implémentation Suggérée (QStash)

#### Étape 1: Installer QStash

```bash
npm install @upstash/qstash
```

#### Étape 2: Modifier l'API Route

```typescript
// src/app/api/v1/rfp/rfps/[id]/parse/route.ts
export async function POST(request: NextRequest, { params }) {
  // ... auth & validation ...
  
  // Set to processing immediately
  await db.update(rfps)
    .set({ parsingStatus: 'processing', parsingStage: 'queued' })
    .where(eq(rfps.id, id));
  
  // Enqueue background job
  await qstashClient.publishJSON({
    url: `${process.env.NEXT_PUBLIC_URL}/api/v1/rfp/jobs/parse`,
    body: { rfpId: id, companyId: company.id },
  });
  
  // Return immediately
  return NextResponse.json({ 
    message: 'RFP parsing queued',
    rfpId: id,
    status: 'processing' 
  }, { status: 202 });
}
```

#### Étape 3: Créer le Worker

```typescript
// src/app/api/v1/rfp/jobs/parse/route.ts
export async function POST(request: NextRequest) {
  const { rfpId, companyId } = await request.json();
  
  try {
    // Parse document
    await db.update(rfps).set({ parsingStage: 'parsing' });
    const doc = await parseDocument(...);
    
    // Extract questions
    await db.update(rfps).set({ parsingStage: 'extracting' });
    const questions = await extractQuestionsInBatches(doc.text, {
      onProgress: async (current, total, found) => {
        await db.update(rfps).set({
          parsingProgressCurrent: current,
          parsingProgressTotal: total,
          questionsExtracted: found,
        });
      }
    });
    
    // Categorize
    await db.update(rfps).set({ parsingStage: 'categorizing' });
    // ... rest of logic ...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    await db.update(rfps).set({ 
      parsingStatus: 'failed',
      parsingError: error.message 
    });
    throw error; // QStash will retry
  }
}
```

### Avantages Architecture Asynchrone

✅ **Scalabilité**: Pas de timeout, peut traiter des RFPs de 1000+ pages  
✅ **Retry**: Reprise automatique en cas d'échec temporaire (rate limit OpenAI)  
✅ **Coût**: Workers s'exécutent uniquement quand nécessaire  
✅ **UX**: Réponse instantanée au frontend (202 Accepted)  
✅ **Monitoring**: Logs centralisés dans le dashboard QStash/Inngest  
✅ **Parallélisation**: Peut traiter plusieurs RFPs en même temps  

### Timeline Suggérée

- **Phase 1** (Actuel): Architecture synchrone avec `maxDuration = 300` ✅
- **Phase 2** (Avant production): Implémenter QStash pour background processing
- **Phase 3** (Optimisation): Paralléliser extraction + catégorisation

### Ressources

- [QStash Documentation](https://upstash.com/docs/qstash)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

**Priorité**: Medium (après MVP stable)  
**Effort**: 2-3 jours de développement  
**ROI**: Haute (meilleure UX, plus scalable, moins de timeouts)
