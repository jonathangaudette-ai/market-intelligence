# 🚀 Guide de Déploiement en Production

**Date**: 2025-01-19
**Durée estimée**: 45 minutes

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

- ✅ Compte Railway: https://railway.app (gratuit)
- ✅ Compte Vercel: https://vercel.com (déjà configuré)
- ✅ Railway CLI installé: `npm install -g @railway/cli`
- ✅ Vercel CLI installé: `npm install -g vercel`
- ✅ Base de données PostgreSQL (Neon/Vercel Postgres)

---

## 🎯 Étape 1: Déployer le Worker sur Railway (20 min)

### 1.1 Connexion à Railway

```bash
railway login
```

Votre navigateur va s'ouvrir pour l'authentification.

### 1.2 Créer le Projet Railway

```bash
cd worker
railway init
```

Sélectionnez:
- ✅ "Create a new project"
- ✅ Nom: `pricing-worker-production`

### 1.3 Générer une Clé API Sécurisée

```bash
# Générer une clé API forte
export WORKER_API_KEY=$(openssl rand -base64 32)
echo "🔑 API Key générée: $WORKER_API_KEY"
echo "⚠️  SAUVEGARDEZ cette clé - vous en aurez besoin pour Vercel!"
```

**IMPORTANT**: Copiez cette clé dans un fichier sécurisé (1Password, etc.)

### 1.4 Configurer les Variables d'Environnement

```bash
# Définir les variables d'environnement
railway variables set API_KEY=$WORKER_API_KEY
railway variables set NODE_ENV=production
railway variables set PLAYWRIGHT_HEADLESS=true
railway variables set LOG_LEVEL=info

# Optionnel: Sentry (pour error tracking)
# railway variables set SENTRY_DSN=votre-sentry-dsn
```

Vérifier:
```bash
railway variables
```

### 1.5 Déployer le Worker

```bash
# Depuis le dossier worker/
railway up
```

**Attendez ~5-10 minutes** (première installation de Playwright + Chromium)

Logs de déploiement:
```bash
railway logs --follow
```

### 1.6 Obtenir l'URL du Worker

```bash
railway open
```

Copiez l'URL (ex: `https://pricing-worker-production.up.railway.app`)

### 1.7 Tester le Worker

```bash
# Remplacez par votre URL Railway
export RAILWAY_URL="https://pricing-worker-production.up.railway.app"

# Test health check
curl $RAILWAY_URL/health

# Devrait retourner:
# {"status":"healthy","timestamp":"...","uptime":...}
```

✅ **Worker déployé avec succès!**

---

## 🌐 Étape 2: Configurer Vercel (Next.js) (10 min)

### 2.1 Ajouter les Variables d'Environnement

**Option A: Via le Dashboard Vercel (Recommandé)**

1. Allez sur: https://vercel.com/dashboard
2. Sélectionnez votre projet `market-intelligence`
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez:

```
RAILWAY_WORKER_URL = https://pricing-worker-production.up.railway.app
RAILWAY_WORKER_API_KEY = [collez la clé générée à l'étape 1.3]
```

**Important**: Sélectionnez **Production, Preview, Development**

**Option B: Via CLI Vercel**

```bash
cd /Users/jonathangaudette/market-intelligence

# Ajouter les variables
vercel env add RAILWAY_WORKER_URL production
# Entrez: https://pricing-worker-production.up.railway.app

vercel env add RAILWAY_WORKER_API_KEY production
# Entrez: [votre clé API]

# Aussi pour Preview (optionnel)
vercel env add RAILWAY_WORKER_URL preview
vercel env add RAILWAY_WORKER_API_KEY preview
```

### 2.2 Redéployer Next.js

```bash
# Option A: Via Git Push (recommandé)
git add .
git commit -m "feat: integrate Railway worker for pricing scraping"
git push

# Option B: Via CLI Vercel
vercel --prod
```

Vercel va automatiquement redéployer (~3-5 minutes).

---

## ✅ Étape 3: Vérification End-to-End (15 min)

### 3.1 Vérifier le Worker Railway

```bash
# Health check
curl https://pricing-worker-production.up.railway.app/health

# Test scraping (avec votre API key)
curl -X POST https://pricing-worker-production.up.railway.app/api/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $WORKER_API_KEY" \
  -d '{
    "companyId": "test",
    "companySlug": "dissan",
    "competitorId": "comp1",
    "competitorName": "Test",
    "competitorUrl": "https://example.com",
    "products": [{"id":"1","sku":"ABC","name":"Test","brand":null,"category":null}]
  }'

# Devrait retourner du JSON avec scrapedProducts
```

### 3.2 Vérifier Next.js Production

1. **Allez sur votre site production**: `https://market-intelligence-kappa.vercel.app`

2. **Naviguez vers**: `/companies/dissan/pricing`

3. **Vérifiez**:
   - ✅ Page charge correctement
   - ✅ Liste des produits visible
   - ✅ Liste des concurrents visible

4. **Testez un scan**:
   - Cliquez sur "Lancer scan"
   - Observez les logs de progression
   - Vérifiez que le scan complète avec succès

### 3.3 Vérifier les Logs

**Railway Worker**:
```bash
railway logs --follow
```

Vous devriez voir:
```
{"level":30,"msg":"Incoming request","method":"POST","path":"/api/scrape"}
{"level":30,"msg":"Scrape request validated","companySlug":"dissan"}
{"level":30,"msg":"Scraping completed successfully","productsScraped":...}
```

**Vercel (Next.js)**:
```bash
vercel logs --follow
```

Ou dans le dashboard Vercel → Functions → Runtime Logs

### 3.4 Vérifier la Base de Données

```bash
# Vérifier que les matches ont été créés
node scripts/verify-pricing-schema.mjs

# Ou directement en SQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pricing_matches WHERE created_at > NOW() - INTERVAL '1 hour';"
```

---

## 🔐 Étape 4: Sécurité Post-Déploiement (10 min)

### 4.1 Vérifier Rate Limiting

```bash
# Essayer de dépasser 100 requêtes en 15 min
for i in {1..105}; do
  curl -X POST $RAILWAY_URL/api/scrape \
    -H "X-API-Key: $WORKER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"companyId":"test",...}'
done

# La 101e requête devrait retourner 429 (Too Many Requests)
```

### 4.2 Vérifier Authentification

```bash
# Sans API key → devrait retourner 401
curl -X POST $RAILWAY_URL/api/scrape \
  -H "Content-Type: application/json" \
  -d '{...}'

# Avec mauvaise API key → devrait retourner 401
curl -X POST $RAILWAY_URL/api/scrape \
  -H "X-API-Key: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 4.3 Configurer Sentry (Optionnel mais Recommandé)

1. Créez un compte Sentry: https://sentry.io
2. Créez un nouveau projet "pricing-worker"
3. Copiez le DSN
4. Ajoutez à Railway:

```bash
railway variables set SENTRY_DSN=https://...@sentry.io/123456
```

5. Redéployez:

```bash
railway up
```

---

## 📊 Étape 5: Monitoring (5 min)

### 5.1 Dashboard Railway

1. Allez sur: https://railway.app/project/your-project
2. Onglet **Metrics**:
   - CPU usage
   - Memory usage (Playwright utilise ~500MB)
   - Network traffic

### 5.2 Configure Alerts

Dans Railway dashboard:
- Settings → Notifications
- Activer: "Deployment Failed", "High Memory Usage"

### 5.3 Sentry Dashboard (si configuré)

1. Allez sur: https://sentry.io/projects/pricing-worker
2. Configurez alerts pour:
   - Erreurs avec status 500
   - Timeouts
   - Memory leaks

---

## 🎉 Déploiement Terminé!

### Checklist Finale

- [ ] ✅ Worker Railway répond à `/health`
- [ ] ✅ Worker Railway accepte requêtes avec API key
- [ ] ✅ Worker Railway refuse requêtes sans API key (401)
- [ ] ✅ Rate limiting fonctionne (429 après 100 req)
- [ ] ✅ Next.js production peut appeler le worker
- [ ] ✅ Scan de pricing complète avec succès
- [ ] ✅ Matches sauvegardés dans `pricing_matches`
- [ ] ✅ Logs visibles dans Railway dashboard
- [ ] ✅ Variables d'environnement configurées dans Vercel
- [ ] ✅ Sentry configuré (optionnel)

---

## 🔧 Dépannage

### Problème: Worker retourne 503 (Service Unavailable)

**Cause**: Playwright pas installé correctement

**Solution**:
```bash
# Vérifier les logs Railway
railway logs

# Chercher: "Error: Could not find browser"
# Solution: Vérifier .nixpacks.toml
```

### Problème: Timeout après 10 minutes

**Cause**: Railway timeout par défaut

**Solution**:
```bash
# Vérifier railway.json
cat worker/railway.json | grep healthcheckTimeout
# Devrait être 300 (5 min)
```

### Problème: "Unauthorized" dans Next.js

**Cause**: API key mismatch

**Solution**:
```bash
# Vérifier Railway
railway variables get API_KEY

# Vérifier Vercel
vercel env ls

# Doivent correspondre exactement
```

### Problème: Memory overflow dans Railway

**Cause**: Trop de pages Playwright ouvertes

**Solution**:
1. Vérifier que le browser se ferme après chaque scrape
2. Réduire BATCH_SIZE dans worker-client.ts
3. Upgrade Railway plan (plus de RAM)

---

## 💰 Coûts Estimés

### Railway (Worker)

**Starter Plan** ($5/mois):
- 512 MB RAM
- 1 vCPU
- Suffisant pour MVP

**Usage estimé** (576 produits × 4 scans/mois):
- Compute: ~6.24 heures/mois
- Coût: **$0.69/mois** (bien en dessous de $5 inclus)

### Vercel (Next.js)

**Hobby Plan** (gratuit):
- Déjà utilisé
- Pas de coût additionnel

**Total estimé**: **$5/mois** (Railway Starter)

---

## 📚 Prochaines Étapes

1. **Phase 2**: Implémenter DissanScraper (Playwright réel)
2. **Phase 3**: Ajouter circuit breaker
3. **Phase 4**: Checkpointing pour recovery
4. **Phase 5**: JWT tokens + IP whitelist

---

## 📞 Support

**Problèmes?**
- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- Sentry docs: https://docs.sentry.io

**Architecture**:
- [NewphaseRailway-v2.md](module-pricing/AgentComparePricing/NewphaseRailway-v2.md)
- [IMPLEMENTATION_SUMMARY.md](module-pricing/AgentComparePricing/IMPLEMENTATION_SUMMARY.md)

---

**Bon déploiement! 🚀**
