# 🚀 Déploiement Rapide en Production

**Temps estimé**: 15 minutes

---

## Option 1: Script Automatique (Recommandé) ⚡

### Étape 1: Déployer le Worker Railway

```bash
./scripts/deploy-worker-railway.sh
```

Le script va:
1. ✅ Vérifier que Railway CLI est installé
2. ✅ Vous connecter à Railway
3. ✅ Créer le projet (si nécessaire)
4. ✅ Générer une API key sécurisée
5. ✅ Configurer les variables d'environnement
6. ✅ Déployer le worker
7. ✅ Tester le health check

**À la fin, notez**:
- 🔑 L'API key (pour Vercel)
- 🌐 L'URL du worker

### Étape 2: Configurer Vercel

```bash
# Option A: Via Dashboard (plus simple)
# 1. Allez sur https://vercel.com/dashboard
# 2. Projet "market-intelligence" → Settings → Environment Variables
# 3. Ajoutez:
#    RAILWAY_WORKER_URL = https://[votre-url].railway.app
#    RAILWAY_WORKER_API_KEY = [votre-api-key]

# Option B: Via CLI
vercel env add RAILWAY_WORKER_URL production
# Collez l'URL du worker

vercel env add RAILWAY_WORKER_API_KEY production
# Collez l'API key
```

### Étape 3: Redéployer Next.js

```bash
# Push vers GitHub (recommandé - auto-deploy)
git add .
git commit -m "feat: integrate Railway worker"
git push

# OU via CLI Vercel
vercel --prod
```

### Étape 4: Tester

```bash
# Test worker
curl https://[votre-url].railway.app/health

# Test Next.js
# Allez sur https://market-intelligence-kappa.vercel.app/companies/dissan/pricing
# Cliquez "Lancer scan"
```

---

## Option 2: Déploiement Manuel 🔧

Si le script ne fonctionne pas, suivez le guide complet:

📖 **[DEPLOIEMENT_PRODUCTION.md](DEPLOIEMENT_PRODUCTION.md)**

---

## ✅ Checklist Post-Déploiement

- [ ] Worker Railway répond à `/health`
- [ ] Test scraping avec API key fonctionne
- [ ] Next.js production peut appeler le worker
- [ ] Scan de pricing complète avec succès
- [ ] Logs visibles dans Railway dashboard
- [ ] Variables Vercel configurées

---

## 🆘 Problèmes Courants

### "Railway CLI not found"

```bash
npm install -g @railway/cli
```

### "Unauthorized" dans Next.js

Vérifiez que `RAILWAY_WORKER_API_KEY` dans Vercel correspond EXACTEMENT à `API_KEY` dans Railway.

```bash
# Railway
railway variables get API_KEY

# Vercel
vercel env ls
```

### Worker timeout

Normal pour la première installation (Playwright + Chromium = ~10 minutes).

Surveillez:
```bash
railway logs --follow
```

---

## 📊 Coûts

- **Railway Starter**: $5/mois (inclut tout ce qu'il faut)
- **Vercel Hobby**: Gratuit (déjà utilisé)
- **Total**: **$5/mois**

---

## 🎉 C'est Tout!

Une fois déployé, votre système de pricing intelligence sera 100% opérationnel en production.

**Prochaine étape**: Implémenter les scrapers Playwright réels (Phase 2)

---

**Besoin d'aide?** Consultez [DEPLOIEMENT_PRODUCTION.md](DEPLOIEMENT_PRODUCTION.md) pour le guide détaillé.
