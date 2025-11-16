# 🧪 Scénario de Test - RAG Reranking

Guide complet pour valider l'implémentation du reranking dans le système RAG.

---

## 📋 Pré-requis

- ✅ Branche `feature/rag-reranking` déployée
- ✅ Variable `NEXT_PUBLIC_ENABLE_RERANKING=true` dans `.env.local`
- ✅ Au moins 5 documents uploadés dans la Knowledge Base
- ✅ Accès à l'interface Intelligence/Chat

---

## 🔧 Test 1 : Validation Infrastructure (5 min)

### Objectif
Vérifier que l'API Pinecone Inference fonctionne correctement.

### Commande
```bash
npx tsx scripts/test-pinecone-rerank.ts
```

### Résultat Attendu
```
✅ SUCCESS - API Inference works!
Model: bge-reranker-v2-m3
Rerank Units: 1

Top 3 Results:
1. [Score: 0.9994]
   Text: "Paris is the capital and most populous city of France."

2. [Score: 0.3941]
   Text: "The Eiffel Tower is a famous landmark in Paris."

3. [Score: 0.1348]
   Text: "Lyon is the third-largest city in France."
```

### ✅ Critères de Succès
- [x] Aucune erreur retournée
- [x] Score du top résultat > 0.9
- [x] Rerank Units = 1
- [x] Latence < 2 secondes

---

## 📊 Test 2 : A/B Test Automatisé (10 min)

### Objectif
Comparer les résultats avec et sans reranking sur vos vraies données.

### Commande
```bash
npx tsx scripts/test-ab-reranking.ts
```

### Ce que le script fait
1. Exécute 5 requêtes de test sur vos documents SANIDÉPÔT
2. Compare les résultats SANS reranking vs AVEC reranking
3. Mesure la latence et les scores
4. Affiche une analyse comparative

### Résultat Attendu

Pour chaque requête, vous verrez :

```
📊 Query 1/5: "Qui est le fondateur de SANIDÉPÔT ?"
────────────────────────────────────────────────────────────────────────────

🔵 SANS Reranking (Semantic Search):
  1. [Score: 0.7542] Document-A-propos.pdf
     "SANIDÉPÔT a été fondé par Jean Dupont en 1985..."
  2. [Score: 0.7201] Historique-entreprise.pdf
  3. [Score: 0.6985] Equipe-direction.pdf
  ⏱️  Latency: 245ms

🟢 AVEC Reranking (2-Stage Retrieval):
  1. [Score: 0.9876] Document-A-propos.pdf
     "SANIDÉPÔT a été fondé par Jean Dupont en 1985..."
  2. [Score: 0.8543] Historique-entreprise.pdf
  3. [Score: 0.7821] Equipe-direction.pdf
  ⏱️  Latency: 312ms (+67ms)

📈 Analyse:
  - Top result identique: ✅ Oui
  - Score top résultat: 0.7542 → 0.9876 (+30.9% improvement)
  - Impact latence: +67ms (+27.3%)
```

### ✅ Critères de Succès
- [x] Scores reranked sont **supérieurs** aux scores semantic (généralement +20-50%)
- [x] Latence augmente de **50-150ms** (acceptable)
- [x] Top 3 résultats sont **plus pertinents** à la requête
- [x] Aucune erreur durant le test

### 🔴 Indicateurs de Problème
- ❌ Scores reranked **inférieurs** aux scores semantic
- ❌ Latence > 500ms
- ❌ Erreur "Reranking failed, falling back to semantic search"

---

## 🖥️ Test 3 : Test Manuel Interface Utilisateur (15 min)

### Objectif
Valider que le reranking améliore la qualité des réponses dans l'interface Intelligence/Chat.

### Étape par Étape

#### 3.1 Préparation (2 min)

1. **Ouvrir l'application** : http://localhost:3010 (ou votre URL de prod)
2. **Se connecter** avec votre compte
3. **Naviguer** vers `Intelligence` → `Chat`
4. **Vérifier** que vous avez au moins 5 documents dans Knowledge Base

#### 3.2 Test SANS Reranking (5 min)

1. **Désactiver le reranking** :
   ```bash
   # Dans .env.local, changer :
   NEXT_PUBLIC_ENABLE_RERANKING=false
   ```

2. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

3. **Poser 3 questions spécifiques** dans le chat :

   **Question 1** : "Qui a fondé l'entreprise ?"
   - 📝 Noter le **top 3 des sources** affichées en bas
   - 📝 Noter la **qualité de la réponse** (1-5 étoiles)
   - 📝 Capturer une **capture d'écran** (optionnel)

   **Question 2** : "Quels sont les services offerts ?"
   - 📝 Noter le **top 3 des sources**
   - 📝 Noter la **qualité de la réponse**

   **Question 3** : "Quelle est l'histoire de l'entreprise ?"
   - 📝 Noter le **top 3 des sources**
   - 📝 Noter la **qualité de la réponse**

#### 3.3 Test AVEC Reranking (5 min)

1. **Activer le reranking** :
   ```bash
   # Dans .env.local, changer :
   NEXT_PUBLIC_ENABLE_RERANKING=true
   ```

2. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

3. **Poser les MÊMES 3 questions** :
   - 📝 Noter les **nouvelles sources** (ordre peut changer)
   - 📝 Noter la **nouvelle qualité** de réponse
   - 📝 Comparer avec les notes précédentes

#### 3.4 Comparaison et Analyse (3 min)

Remplir le tableau :

| Question | Sources SANS Reranking | Sources AVEC Reranking | Qualité SANS | Qualité AVEC | Amélioration ? |
|----------|------------------------|------------------------|--------------|--------------|----------------|
| Fondateur | Doc1, Doc2, Doc3 | Doc1, Doc2, Doc3 | 3/5 | 4/5 | ✅ Oui |
| Services | Doc4, Doc5, Doc6 | Doc5, Doc4, Doc7 | 2/5 | 4/5 | ✅ Oui |
| Histoire | Doc8, Doc9, Doc1 | Doc1, Doc8, Doc9 | 3/5 | 5/5 | ✅ Oui |

### ✅ Critères de Succès

**Objectif : Au moins 2/3 questions montrent une amélioration**

- [x] Qualité des réponses **augmente** (même légèrement)
- [x] Sources affichées sont **plus pertinentes** à la question
- [x] Réponse **plus précise** (contient exactement l'info demandée)
- [x] Pas de dégradation visible de performance (< 1 seconde de latence)

### 🔴 Indicateurs de Problème

- ❌ Qualité **diminue** pour 2+ questions
- ❌ Sources **moins pertinentes** qu'avant
- ❌ Latence > 2 secondes
- ❌ Erreurs dans la console (ouvrir DevTools F12)

---

## 🔍 Test 4 : Vérification Logs & Métriques (5 min)

### Objectif
Vérifier que les métriques de reranking sont correctement loggées.

### Commande

1. **Ouvrir la console serveur** (terminal où tourne `npm run dev`)
2. **Poser une question** dans le chat Intelligence
3. **Chercher les logs** du type :

```
[RAG] Rerank metrics: {
  query: 'Qui est le fondateur de SANIDÉPÔT ?',
  candidatesCount: 20,
  finalCount: 5,
  latencyMs: 87,
  rerankUnits: 1,
  model: 'bge-reranker-v2-m3'
}
```

### ✅ Critères de Succès

- [x] Log `[RAG] Rerank metrics` apparaît après chaque requête
- [x] `candidatesCount` = 20 (4x multiplier)
- [x] `finalCount` = 5 (topK)
- [x] `latencyMs` entre 50-200ms
- [x] `rerankUnits` = 1
- [x] `model` = 'bge-reranker-v2-m3'

### 🔴 Indicateurs de Problème

- ❌ Aucun log `[RAG] Rerank metrics` (reranking ne fonctionne pas)
- ❌ Log `[RAG] Reranking failed, falling back to semantic search` (erreur API)
- ❌ `latencyMs` > 500ms (problème performance)

---

## 📈 Test 5 : Monitoring Coûts (Optionnel, 5 min)

### Objectif
Vérifier que les coûts Pinecone sont dans les limites attendues.

### Étapes

1. **Se connecter** à [Pinecone Console](https://app.pinecone.io/)
2. **Naviguer** vers votre index `market-intelligence-prod`
3. **Aller dans** Usage / Metrics
4. **Vérifier** le nombre de "Inference Units" consommés

### Calcul Attendu

```
Queries par jour : 100
Coût par query : 1 rerank unit × $0.002
Coût journalier : 100 × $0.002 = $0.20/jour
Coût mensuel : $0.20 × 30 = $6/mois
```

### ✅ Critères de Succès

- [x] Consommation **alignée** avec le nombre de requêtes
- [x] Pas de consommation anormale (ex: 1000 units en 1h)
- [x] Coût mensuel projeté < $10

---

## ✅ Checklist Finale - Validation Complète

Cochez tous les items avant de merger en production :

### Infrastructure
- [ ] ✅ Test Pinecone Inference API réussi
- [ ] ✅ Build Next.js passe sans erreur
- [ ] ✅ Aucune erreur TypeScript

### Fonctionnalité
- [ ] ✅ A/B test montre amélioration des scores (+20-50%)
- [ ] ✅ Test manuel : 2/3 questions ont une meilleure qualité
- [ ] ✅ Logs de métriques apparaissent correctement
- [ ] ✅ Latence acceptable (< 500ms P95)

### Production Ready
- [ ] ✅ Feature flag fonctionne (on/off testé)
- [ ] ✅ Fallback gracieux testé (désactiver Pinecone API temporairement)
- [ ] ✅ Monitoring coûts configuré (Pinecone Console)
- [ ] ✅ Documentation mise à jour

### Rollback Plan
- [ ] ✅ Procédure rollback testée (`NEXT_PUBLIC_ENABLE_RERANKING=false`)
- [ ] ✅ Branche `main` stable identifiée pour revenir en arrière

---

## 🚀 Déploiement en Production

Une fois tous les tests validés :

```bash
# 1. Merger la branche
git checkout main
git merge feature/rag-reranking

# 2. Déployer sur Vercel
vercel --prod

# 3. Ajouter la variable d'environnement sur Vercel
# Dashboard Vercel → Settings → Environment Variables
# NEXT_PUBLIC_ENABLE_RERANKING = true

# 4. Redéployer
vercel --prod
```

### Monitoring Post-Déploiement (48h)

- **Jour 1** : Vérifier logs, pas d'erreurs
- **Jour 2** : Vérifier coûts Pinecone, feedback utilisateurs
- **Semaine 1** : Analyser métriques de qualité (si disponibles)

---

## 🆘 Troubleshooting

### Problème : "Reranking failed, falling back to semantic search"

**Cause possible** : API Pinecone Inference non disponible ou API key invalide

**Solution** :
1. Vérifier `PINECONE_API_KEY` dans `.env.local`
2. Tester avec `npx tsx scripts/test-pinecone-rerank.ts`
3. Contacter support Pinecone si nécessaire

---

### Problème : Latence > 1 seconde

**Cause possible** : Trop de candidats fetchés ou problème réseau

**Solution** :
1. Réduire `RERANK_MULTIPLIER` de 4 à 2 dans `engine.ts`
2. Vérifier la connexion Pinecone (région, network latency)

---

### Problème : Scores reranked plus bas que semantic

**Cause possible** : Modèle de reranking non adapté au contenu

**Solution** :
1. Tester avec un autre modèle : `pinecone-rerank-v0` au lieu de `bge-reranker-v2-m3`
2. Vérifier la qualité des documents (texte bien extrait ?)

---

## 📞 Support

En cas de problème :
1. Vérifier les logs serveur et browser console
2. Exécuter les 3 scripts de test automatiques
3. Documenter le problème avec captures d'écran
4. Rollback si bloquant : `NEXT_PUBLIC_ENABLE_RERANKING=false`

---

**Bon testing ! 🚀**
