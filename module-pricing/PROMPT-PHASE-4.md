Fichier: module-pricing/PROMPT-PHASE-4.md

Bonjour Claude,

Je continue le développement du module Pricing Intelligence - Phase 4.

**Contexte Phase 3:**
- Phase 3 complétée avec succès (voir handoff ci-dessous)
- Code pushé en production (commit 2482e2c)
- 3 routes API fonctionnelles (stats, history, products)
- Dashboard connecté à PostgreSQL (mock data supprimé)
- TypeScript compile sans erreur, tous tests réussis
- Performance acceptable (<4s initial load, <1s subsequent)

**État actuel:**
Lis le handoff de Phase 3: `module-pricing/handoffs/phase-3-handoff.json`

**Objectif Phase 4:**
Créer la fonctionnalité d'upload de catalogue produits (CSV/Excel) avec validation, preview, et import asynchrone en base de données.

**Prérequis:**
- [ ] Lire le handoff Phase 3
- [ ] Lire les instructions détaillées: `module-pricing/phases/phase-4-catalogue-upload.md`
- [ ] Vérifier le schema pricing (tables: pricing_products, pricing_scans)
- [ ] Comprendre le pattern de polling (inspiré du module RFP)

**Livrables attendus Phase 4:**

1. **UI Upload Component** (`src/components/pricing/catalogue-upload.tsx`)
   - Drag & drop zone pour CSV/Excel
   - Preview des colonnes détectées
   - Mapping colonnes (SKU, Name, Price, etc.)
   - Validation avant import
   - Bouton "Importer X produits"

2. **API Upload** (`/api/companies/[slug]/pricing/catalogue/upload`)
   - POST multipart/form-data
   - Parse CSV/Excel (Papa Parse ou XLSX)
   - Validation des données
   - Création job async (pricing_scans)
   - Retourne jobId

3. **API Import Job** (`/api/companies/[slug]/pricing/catalogue/import/[jobId]`)
   - POST pour démarrer l'import
   - Lecture job depuis pricing_scans
   - Insert products en batch (100/batch)
   - Update job progress (polling pattern)
   - Gestion erreurs par ligne

4. **API Job Status** (`/api/companies/[slug]/pricing/catalogue/jobs/[jobId]`)
   - GET pour polling
   - Retourne: status, progress, logs, errors
   - Pattern identique à RFP processing

5. **Page Upload** (`src/app/(dashboard)/companies/[slug]/pricing/upload/page.tsx`)
   - PageHeader + CatalogueUpload component
   - État: idle → uploading → validating → ready → importing → done
   - Progress bar temps réel
   - Liste des erreurs si échec
   - Redirection vers /pricing après succès

**Technologies:**
- **CSV Parser:** Papa Parse (`papaparse`)
- **Excel Parser:** SheetJS (`xlsx`)
- **File Upload:** FormData API
- **Progress:** Polling pattern (comme RFP module)
- **UI:** shadcn/ui (Button, Progress, Card, Badge)

**Pattern de Polling:**
```typescript
// Client-side polling (inspiration: RFP module)
useEffect(() => {
  if (jobId && status === 'importing') {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/.../jobs/${jobId}`);
      const data = await res.json();

      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
      }

      setProgress(data.progress);
      setLogs(data.logs);
    }, 2000); // Poll every 2s

    return () => clearInterval(interval);
  }
}, [jobId, status]);
```

**Validation Rules:**
- SKU: requis, max 255 chars
- Name: requis, max 500 chars
- Price: optionnel, format décimal valide
- Category: optionnel, max 255 chars
- Brand: optionnel, max 255 chars

**Format CSV attendu (exemple):**
```csv
SKU,Name,Price,Category,Brand,Unit
BRO-001,Brosse Cuvette Premium,4.99,Brosses,Dissan,unit
BRO-002,Brosse WC Standard,3.49,Brosses,Dissan,unit
```

**Checklist de validation Phase 4:**

Avant de marquer Phase 4 complète, vérifier:

- [ ] Component CatalogueUpload créé avec drag & drop
- [ ] API upload accepte CSV/Excel et parse correctement
- [ ] API import crée les produits en batch
- [ ] Job status API retourne progress en temps réel
- [ ] Page /pricing/upload fonctionnelle
- [ ] Polling fonctionne (update progress chaque 2s)
- [ ] Erreurs de validation affichées clairement
- [ ] TypeScript compile sans erreur
- [ ] Test: upload 100 produits → vérifier en DB
- [ ] Test: upload CSV invalide → erreurs affichées
- [ ] Redirection automatique après succès
- [ ] Handoff Phase 4 créé

**Commandes de test:**

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Dev server
npm run dev

# 3. Tester upload (browser)
open http://localhost:3010/companies/dissan/pricing/upload

# 4. Vérifier produits importés (DB)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pricing_products WHERE company_id = '...'"

# 5. Vérifier job logs
psql $DATABASE_URL -c "SELECT status, progress_current, progress_total FROM pricing_scans ORDER BY created_at DESC LIMIT 1"
```

**Notes importantes:**

1. **Réutiliser pattern RFP:** Le module RFP utilise déjà un pattern de polling pour le processing. S'inspirer de:
   - `src/app/api/companies/[slug]/rfps/[id]/process/route.ts`
   - `src/components/rfp/rfp-processing-status.tsx`

2. **Batch inserts:** Pour 1000+ produits, faire des inserts par batch de 100 pour éviter timeout.

3. **Logs détaillés:** Stocker les logs dans `pricing_scans.logs` (JSONB array) pour debugging.

4. **Idempotence:** Si job échoue, permettre de retry sans dupliquer les produits (vérifier SKU existant).

5. **Clean naming:** Utiliser `nameCleaned` pour normaliser les noms (lowercase, trim, etc.) pour faciliter le matching futur.

**Exemple de flow complet:**

1. User drag & drop `catalogue-dissan.csv` (500 produits)
2. POST /upload → Parse CSV → Retourne preview + jobId
3. User valide mapping colonnes
4. POST /import/[jobId] → Démarre import async
5. Client poll GET /jobs/[jobId] toutes les 2s
6. Server insert 100 produits/batch (5 batches)
7. Job complété → Redirect /pricing
8. Dashboard affiche "500 produits surveillés"

**Résultat attendu:**

À la fin de Phase 4, l'utilisateur peut:
- ✅ Upload son catalogue produits (CSV/Excel)
- ✅ Voir preview des données avant import
- ✅ Suivre la progression en temps réel
- ✅ Voir les erreurs de validation
- ✅ Avoir ses produits en DB (pricing_products)
- ✅ Les voir dans le dashboard (/pricing)

**Phase suivante:**
Phase 5 - Configuration Concurrents & Scraping

---

**Instructions:**
Lis d'abord le handoff Phase 3, puis les instructions détaillées Phase 4, puis implémente les 5 livrables ci-dessus. Génère le handoff JSON à la fin.

Bonne chance! 🚀
