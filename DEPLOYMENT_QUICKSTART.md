# Déploiement Rapide - Checklist 15 Minutes

**Pour:** Déploiement rapide sur Vercel + Neon
**Durée:** 15-20 minutes
**Niveau:** Toutes les étapes essentielles

---

## ⚡ Avant de commencer

Ayez ces comptes prêts:
- [ ] GitHub (code pushé)
- [ ] Vercel
- [ ] Neon
- [ ] Pinecone
- [ ] Anthropic
- [ ] OpenAI

---

## 🚀 Étapes

### 1. Neon Database (3 min)

```bash
# 1. Aller sur https://console.neon.tech
# 2. Create Project → "market-intelligence-prod"
# 3. Copier la connection string
```

**Sauvegarder:** `DATABASE_URL=postgresql://...@ep-xxx.neon.tech/main?sslmode=require`

### 2. Pinecone Vectors (2 min)

```bash
# 1. Aller sur https://app.pinecone.io
# 2. Create Index
#    - Name: market-intelligence-prod
#    - Dimensions: 1536
#    - Metric: cosine
# 3. Copier API key
```

**Sauvegarder:** `PINECONE_API_KEY=pc-...` et `PINECONE_INDEX_NAME=market-intelligence-prod`

### 3. API Keys (2 min)

```bash
# Anthropic: https://console.anthropic.com → API Keys
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI: https://platform.openai.com → API Keys
OPENAI_API_KEY=sk-...
```

### 4. Auth Secret (30 sec)

```bash
# Générer
openssl rand -base64 32

# Sauvegarder
AUTH_SECRET=<le résultat>
```

### 5. Déployer sur Vercel (5 min)

```bash
# 1. Aller sur https://vercel.com/new
# 2. Import repository GitHub: market-intelligence
# 3. Environment Variables - ajouter TOUTES les variables:

DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_TRUST_HOST=true
PINECONE_API_KEY=pc-...
PINECONE_INDEX_NAME=market-intelligence-prod
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# 4. Deploy
# 5. Attendre 2-3 minutes
```

### 6. Appliquer migrations (2 min)

```bash
# Localement avec la DATABASE_URL de Neon
export DATABASE_URL="postgresql://...@ep-xxx.neon.tech/main?sslmode=require"

# Appliquer
npx drizzle-kit push
```

**Vérifier:**
```sql
-- Dans Neon SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Doit afficher: users, companies, company_members, competitors, documents, conversations, messages, signals
```

### 7. Validation (3 min)

```bash
# Configurer toutes les variables localement (.env)
cp .env.example .env
# Éditer .env avec vos vraies valeurs

# Valider
DEPLOYMENT_URL=https://your-app.vercel.app npx tsx scripts/validate-deployment.ts
```

**Attendu:**
```
✅ All checks passed
🎉 DEPLOYMENT VALIDATION SUCCESSFUL!
```

---

## ✅ Test Final

1. Aller sur `https://your-app.vercel.app`
2. Créer un compte
3. Uploader un PDF simple
4. Vérifier les logs Vercel: "Analysis complete. Type: ..."
5. Vérifier en DB:
   ```sql
   SELECT name, document_type, analysis_completed FROM documents ORDER BY created_at DESC LIMIT 1;
   ```

---

## 🐛 Problèmes courants

### "Function timeout after 10 seconds"
→ **Solution:** Upgrade Vercel vers Pro OU modifier `thinking.budget_tokens` à 1500 dans `intelligent-preprocessor.ts`

### "ANTHROPIC_API_KEY is not set"
→ **Solution:** Vérifier variables dans Vercel → Settings → Environment Variables → Redéployer

### "relation documents already exists"
→ **Solution:** Normal, ignorer. Les migrations sont idempotentes.

---

## 📊 Budget mensuel estimé

- Vercel Pro: **$20/mois** (requis pour timeout 60s)
- Neon PostgreSQL: **Gratuit** (Free tier suffisant pour démarrer)
- Pinecone: **Gratuit** (Free tier = 100K vectors)
- Anthropic Claude: **~$10-30/mois** (100-300 documents)
- OpenAI Embeddings: **~$5/mois** (très peu cher)

**Total:** ~$35-55/mois pour 100-300 documents

---

## 📚 Documentation complète

- **Guide détaillé:** `DEPLOYMENT_GUIDE.md` (toutes les étapes avec screenshots)
- **Tests:** `TESTING_GUIDE.md` (comment tester l'analyse intelligente)
- **Système:** `INTELLIGENT_ANALYSIS_SYSTEM.md` (documentation technique)

---

**Temps total:** 15-20 minutes
**Prêt pour production:** ✅
**Mise à jour:** 2025-11-02
