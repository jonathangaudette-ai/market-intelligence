# ✅ Vérification Production - RAG Reranking

## 🎉 Statut du Déploiement

**Date:** 2025-11-16
**Branche:** `main` (commits 90a5552, 36377a9)
**URL Production:** https://market-intelligence-kappa.vercel.app
**Variable Vercel:** `NEXT_PUBLIC_ENABLE_RERANKING=true` ✅ CONFIGURÉE

---

## 📊 Ce qui a été déployé

### Code Fusionné dans Main
1. **[src/lib/rag/reranker.ts](src/lib/rag/reranker.ts)** - Nouveau module de reranking Pinecone
2. **[src/lib/rag/engine.ts](src/lib/rag/engine.ts#L180-L274)** - Intégration reranking dans RAG engine
3. **package.json** - Upgrade Pinecone SDK v3.0.3 → v6.1.3
4. **Scripts de test:**
   - `scripts/test-pinecone-rerank.ts` - Validation API Inference
   - `scripts/test-ab-reranking.ts` - Comparaison A/B semantic vs reranked
   - `scripts/test-production-reranking.mjs` - Test endpoint production
5. **[TESTING_RERANKING.md](TESTING_RERANKING.md)** - Guide de test complet

### Configuration Vercel
- ✅ Variable `NEXT_PUBLIC_ENABLE_RERANKING=true` ajoutée au Dashboard
- ✅ Déploiement automatique complété (site live)
- ✅ API répond (401 Unauthorized = authentification requise, normal)

---

## 🧪 Comment Vérifier que le Reranking Fonctionne

### Option 1: Vérification via l'Interface (RECOMMANDÉ)

1. **Se connecter** à https://market-intelligence-kappa.vercel.app

2. **Ouvrir DevTools** (F12 ou Cmd+Option+I sur Mac)

3. **Aller dans Console tab**

4. **Naviguer vers Intelligence → Chat**

5. **Poser une question** dans le chat (ex: "Qui a fondé SANIDÉPÔT ?")

6. **Chercher dans la console** le log suivant:
   ```
   [RAG] Rerank metrics: {
     query: 'Qui a fondé SANIDÉPÔT ?',
     candidatesCount: 20,
     finalCount: 5,
     latencyMs: 87,
     rerankUnits: 1,
     model: 'bge-reranker-v2-m3'
   }
   ```

7. **Analyser les résultats:**
   - ✅ Si vous voyez `[RAG] Rerank metrics` → **RERANKING ACTIF**
   - ❌ Si vous ne voyez que `[RAG] Query:` → Reranking désactivé
   - ⚠️  Si vous voyez `[RAG] Reranking failed, falling back to semantic search` → Erreur API

### Option 2: Vérification des Logs Vercel

1. **Aller sur Vercel Dashboard**
2. **Sélectionner le projet** `market-intelligence`
3. **Cliquer sur "Logs"** (tab)
4. **Filtrer par** "Function Logs" ou "All Logs"
5. **Poser une question** dans Intelligence Chat
6. **Chercher** les logs `[RAG] Rerank metrics` ou `[Reranker]` dans les logs

### Option 3: Vérification de la Variable d'Environnement

1. **Aller sur Vercel Dashboard**
2. **Settings** → **Environment Variables**
3. **Vérifier** que `NEXT_PUBLIC_ENABLE_RERANKING` = `true` pour **Production**
4. **Si la variable n'existe pas** ou est `false`, l'ajouter et redéployer

---

## 🎯 Indicateurs de Succès

### Reranking ACTIF (✅)
- Log `[RAG] Rerank metrics` apparaît dans la console/logs
- Scores de relevance entre **0.8 - 1.0** (vs 0.6-0.8 sans reranking)
- Latence augmente de **50-150ms** (acceptable)
- Sources affichées sont **plus pertinentes** à la question

### Reranking INACTIF (❌)
- Pas de log `[RAG] Rerank metrics`
- Scores de relevance entre **0.6 - 0.8** (semantic search seulement)
- Latence normale (~200ms)

### Erreur (⚠️)
- Log `[RAG] Reranking failed, falling back to semantic search`
- Vérifier PINECONE_API_KEY sur Vercel
- Vérifier que Pinecone Inference API est disponible

---

## 📈 Tests Automatisés Disponibles

### Test 1: Validation Pinecone Inference API
```bash
npx tsx scripts/test-pinecone-rerank.ts
```
**Résultat attendu:** Score top résultat > 0.99

### Test 2: A/B Test Semantic vs Reranked
```bash
npx tsx scripts/test-ab-reranking.ts
```
**Résultat attendu:** Amélioration +20-50% des scores avec reranking

### Test 3: Test Production API (requiert auth)
```bash
node scripts/test-production-reranking.mjs
```
**Résultat attendu:** 401 Unauthorized (endpoint protégé, normal)

---

## 🔧 Troubleshooting

### Problème: Pas de log `[RAG] Rerank metrics`

**Causes possibles:**
1. Variable `NEXT_PUBLIC_ENABLE_RERANKING` pas configurée sur Vercel
2. Variable configurée mais déploiement pas redéployé
3. Cache Next.js (redémarrer avec Ctrl+C puis `npm run dev`)

**Solution:**
```bash
# Vérifier localement
grep NEXT_PUBLIC_ENABLE_RERANKING .env.local
# Devrait afficher: NEXT_PUBLIC_ENABLE_RERANKING=true

# Redémarrer le serveur local
npm run dev

# Tester dans Intelligence Chat
# Vérifier la console DevTools
```

### Problème: `Reranking failed, falling back to semantic search`

**Causes possibles:**
1. `PINECONE_API_KEY` invalide ou expirée
2. Pinecone Inference API indisponible
3. Quota Pinecone dépassé

**Solution:**
1. Vérifier `PINECONE_API_KEY` sur Vercel Dashboard
2. Tester l'API: `npx tsx scripts/test-pinecone-rerank.ts`
3. Contacter support Pinecone si erreur persiste

### Problème: Latence > 1 seconde

**Causes possibles:**
1. Trop de candidats fetchés (4x multiplier)
2. Problème réseau Pinecone

**Solution:**
Réduire `RERANK_MULTIPLIER` dans [src/lib/rag/engine.ts](src/lib/rag/engine.ts#L185):
```typescript
const RERANK_MULTIPLIER = 2; // Au lieu de 4
```

---

## 💰 Monitoring des Coûts

### Pinecone Console
1. **Se connecter** à https://app.pinecone.io/
2. **Sélectionner** l'index `market-intelligence-prod`
3. **Aller dans** Usage / Metrics
4. **Vérifier** le nombre de "Inference Units" consommés

### Calcul Attendu
```
Queries par jour : 100
Coût par query : 1 rerank unit × $0.002
Coût journalier : 100 × $0.002 = $0.20/jour
Coût mensuel : $0.20 × 30 = $6/mois
```

### Alerte
Si consommation > 1000 units/jour (>$60/mois), vérifier:
- Pas de boucle infinie dans le code
- Pas d'attaque DDoS
- Usage normal des utilisateurs

---

## 🚀 Rollback si Nécessaire

Si le reranking cause des problèmes en production:

### Option 1: Désactiver via Vercel Dashboard (RAPIDE)
1. Vercel Dashboard → Settings → Environment Variables
2. Modifier `NEXT_PUBLIC_ENABLE_RERANKING` → `false`
3. Redéployer (ou attendre le prochain déploiement automatique)

### Option 2: Rollback de Code
```bash
git revert 90a5552  # Revert reranking implementation
git push origin main
```

---

## ✅ Checklist Finale

- [x] Code fusionné dans `main` (commits 90a5552, 36377a9)
- [x] Code pushé vers GitHub
- [x] Erreur TypeScript corrigée (constructor fix)
- [x] Variable `NEXT_PUBLIC_ENABLE_RERANKING=true` configurée sur Vercel
- [x] Déploiement Vercel complété (site live)
- [ ] **RESTE À FAIRE:** Vérifier logs `[RAG] Rerank metrics` dans l'interface

---

## 📞 Prochaine Étape

**Pour confirmer que le reranking est 100% fonctionnel:**

1. ✅ Se connecter à https://market-intelligence-kappa.vercel.app
2. ✅ Ouvrir DevTools → Console
3. ✅ Aller dans Intelligence → Chat
4. ✅ Poser une question (ex: "Qui est le fondateur ?")
5. ✅ Vérifier que `[RAG] Rerank metrics` apparaît dans la console

**Si tout fonctionne:**
- 🎉 Le reranking est actif en production
- 📈 Qualité des réponses devrait être améliorée de +20-50%
- ⏱️  Latence +50-150ms (acceptable)

**Si problème:**
- Consulter la section Troubleshooting ci-dessus
- Vérifier les logs Vercel
- Tester les scripts de validation
