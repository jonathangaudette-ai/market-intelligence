# 🚀 Guide de Déploiement Production 2025

**Date de mise à jour**: 2025-01-19
**Statut**: ✅ Production Opérationnel
**Version**: 2.0

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Architecture](#architecture)
4. [Déploiement Railway Worker](#déploiement-railway-worker)
5. [Déploiement Vercel Next.js](#déploiement-vercel-nextjs)
6. [Configuration Base de Données](#configuration-base-de-données)
7. [Variables d'Environnement](#variables-denvironnement)
8. [Vérification et Tests](#vérification-et-tests)
9. [Module Pricing - Guide Complet](#module-pricing---guide-complet)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'Ensemble

### Stack Technologique

**Frontend & Backend:**
- **Next.js 15.0.3** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **shadcn/ui** - Composants UI

**Base de Données:**
- **PostgreSQL** (Neon) - Base de données principale
- **Drizzle ORM** - ORM TypeScript

**Worker de Scraping:**
- **Node.js 22** + **TypeScript**
- **Playwright** - Browser automation
- **Express** - API REST
- **Railway** - Hébergement worker

**Services Externes:**
- **Vercel** - Hébergement Next.js
- **Railway** - Hébergement worker de scraping
- **OpenAI API** - GPT-5, GPT-4o
- **Anthropic API** - Claude Sonnet 4.5, Claude Haiku 4.5

### URLs Production

- **Application**: https://market-intelligence-kappa.vercel.app
- **Railway Worker**: https://pricing-worker-production.up.railway.app
- **Base de Données**: Neon PostgreSQL (voir env vars)

---

## 📋 Prérequis

### Comptes Requis

- ✅ **Vercel Account** (https://vercel.com)
- ✅ **Railway Account** (https://railway.app)
- ✅ **Neon Account** (https://neon.tech) - PostgreSQL
- ✅ **OpenAI API Key** (https://platform.openai.com)
- ✅ **Anthropic API Key** (https://console.anthropic.com)

### Outils CLI

```bash
# Vercel CLI
npm install -g vercel

# Railway CLI
npm install -g @railway/cli

# Node.js 20+
node --version  # v20.x.x ou supérieur
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Vercel     │         │   Railway    │                │
│  │   Next.js    │◄───────►│   Worker     │                │
│  │              │   API   │  (Playwright)│                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌──────────────────────────────────┐                     │
│  │    Neon PostgreSQL              │                     │
│  │    (pricing_products,           │                     │
│  │     pricing_competitors,        │                     │
│  │     pricing_matches)            │                     │
│  └──────────────────────────────────┘                     │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                     │
│  │  OpenAI API  │    │ Anthropic API│                     │
│  │  GPT-5       │    │ Claude 4.5   │                     │
│  └──────────────┘    └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚂 Déploiement Railway Worker

### Étape 1: Connexion Railway

```bash
railway login
```

Votre navigateur va s'ouvrir pour l'authentification.

### Étape 2: Créer le Projet

```bash
cd worker
railway init
```

Sélectionnez:
- ✅ "Create a new project"
- ✅ Nom: `pricing-worker-production`

### Étape 3: Générer l'API Key

```bash
export WORKER_API_KEY=$(openssl rand -base64 32)
echo "🔑 API Key: $WORKER_API_KEY"
```

**⚠️ IMPORTANT**: Sauvegardez cette clé dans un gestionnaire de mots de passe!

### Étape 4: Configurer les Variables

```bash
railway variables set API_KEY=$WORKER_API_KEY
railway variables set NODE_ENV=production
railway variables set PLAYWRIGHT_HEADLESS=true
railway variables set LOG_LEVEL=info
```

Vérifier:
```bash
railway variables
```

### Étape 5: Déployer

```bash
railway up
```

**Durée**: ~5-10 minutes (première installation de Playwright + Chromium)

Surveiller les logs:
```bash
railway logs
```

### Étape 6: Obtenir l'URL

```bash
railway domain
```

**URL**: `https://pricing-worker-production.up.railway.app`

### Étape 7: Tester le Worker

```bash
curl https://pricing-worker-production.up.railway.app/health
```

**Réponse attendue**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "uptime": 123.45,
  "environment": "production"
}
```

---

## ☁️ Déploiement Vercel Next.js

### Étape 1: Lier le Projet

```bash
vercel link
```

Sélectionnez votre projet `market-intelligence`.

### Étape 2: Configurer les Variables d'Environnement

**Via Dashboard Vercel** (Recommandé):
1. https://vercel.com/dashboard
2. Projet: `market-intelligence`
3. Settings → Environment Variables

**Variables Requises**:

```env
# Railway Worker
RAILWAY_WORKER_URL=https://pricing-worker-production.up.railway.app
RAILWAY_WORKER_API_KEY=[votre clé générée à l'étape Railway 3]

# Base de Données
DATABASE_URL=postgresql://neondb_owner:xxx@xxx.neon.tech/neondb?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Pinecone (RAG)
PINECONE_API_KEY=pcsk_xxx
PINECONE_INDEX=market-intelligence-prod

# Auth
AUTH_SECRET=[générer avec: openssl rand -base64 32]
AUTH_TRUST_HOST=true

# Next.js
NEXT_PUBLIC_APP=https://market-intelligence-kappa.vercel.app/
NEXT_PUBLIC_ENABLE_RERANKING=true

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx

# Cron Jobs
CRON_SECRET=[générer avec: openssl rand -base64 32]
```

**Via CLI Vercel** (Alternative):
```bash
vercel env add RAILWAY_WORKER_URL production
# Entrez: https://pricing-worker-production.up.railway.app

vercel env add RAILWAY_WORKER_API_KEY production
# Entrez: [votre clé API]
```

### Étape 3: Déployer

**Option A - Git Push** (Recommandé):
```bash
git add .
git commit -m "deploy: production update"
git push
```

Vercel déploiera automatiquement (~3-5 minutes).

**Option B - CLI**:
```bash
vercel --prod
```

### Étape 4: Vérifier le Déploiement

```bash
vercel ls | head -5
```

Cherchez le déploiement avec `● Ready` et `Production`.

---

## 🗄️ Configuration Base de Données

### Migrations

```bash
# Générer les migrations
npm run db:generate

# Appliquer les migrations
npm run db:migrate
```

### Schema Pricing (Principal)

**Tables**:
- `pricing_products` - Catalogue de produits
- `pricing_competitors` - Concurrents surveillés
- `pricing_matches` - Correspondances produits/concurrents
- `pricing_scans` - Historique des scans
- `pricing_catalog_imports` - Imports de catalogues

**Vérification**:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pricing_products;"
```

---

## 🔐 Variables d'Environnement

### Fichiers `.env`

**`.env.local`** (Développement):
```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
RAILWAY_WORKER_URL=http://localhost:3001
RAILWAY_WORKER_API_KEY=dev-key-123
```

**Production** (Vercel Dashboard):
- Toutes les variables listées dans [Étape 2 Vercel](#étape-2-configurer-les-variables-denvironnement)

### Worker `.env`

**`worker/.env`** (Développement uniquement):
```env
API_KEY=dev-key-123
NODE_ENV=development
PLAYWRIGHT_HEADLESS=false
LOG_LEVEL=debug
PORT=3001
```

**⚠️ Production**: Variables gérées par Railway CLI (pas de fichier `.env`)

---

## ✅ Vérification et Tests

### 1. Health Checks

**Railway Worker**:
```bash
curl https://pricing-worker-production.up.railway.app/health
```

**Next.js API**:
```bash
curl https://market-intelligence-kappa.vercel.app/api/companies/dissan/pricing/stats
```

### 2. Test End-to-End

**a) Ajouter un concurrent**:
```bash
curl -X POST https://market-intelligence-kappa.vercel.app/api/companies/dissan/pricing/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Swish",
    "websiteUrl": "https://swish.ca",
    "isActive": true,
    "scanFrequency": "weekly"
  }'
```

**b) Importer des produits**:
- Via UI: `/companies/dissan/pricing/catalog`
- Upload: `Dissan/products-catalog-import.xlsx`

**c) Lancer un scan**:
```bash
curl -X POST https://market-intelligence-kappa.vercel.app/api/companies/dissan/pricing/scans \
  -H "Content-Type: application/json" \
  -d '{}'
```

**d) Vérifier les résultats**:
```bash
curl https://market-intelligence-kappa.vercel.app/api/companies/dissan/pricing/matches
```

### 3. Surveiller les Logs

**Railway**:
```bash
cd worker
railway logs
```

**Vercel**:
```bash
vercel logs --follow
```

Ou via Dashboard: https://vercel.com/dashboard → Logs

---

## 💰 Module Pricing - Guide Complet

### Architecture du Module

```
/pricing
├── Dashboard Principal         → Stats, KPIs, graphiques
├── /products                   → Gestion des produits
│   ├── Liste des produits
│   ├── /[id] - Détail produit
│   └── Import/Export
├── /competitors                → Gestion des concurrents
│   ├── Liste des concurrents
│   ├── /new - Ajouter concurrent
│   └── /[id] - Éditer concurrent
├── /matches                    → Comparaisons de prix
├── /catalog                    → Import de catalogues
└── /settings                   → Paramètres & Actions dangereuses
```

### Fonctionnalités Clés

#### 1. **Gestion des Produits**

**Importer un catalogue**:
- Format: CSV ou XLSX
- Colonnes requises: `sku`, `name`, `price`
- Colonnes optionnelles: `brand`, `category`, `url`
- Endpoint: `POST /api/companies/[slug]/pricing/catalog/preview`

**Supprimer tous les produits**:
- UI: `/pricing/settings` → Zone Dangereuse
- Confirmation: Taper "DELETE ALL"
- Soft delete (non destructif)

#### 2. **Gestion des Concurrents**

**Ajouter un concurrent**:
```typescript
{
  name: "Swish",
  websiteUrl: "https://swish.ca",
  isActive: true,
  scanFrequency: "weekly" | "daily" | "hourly"
}
```

**Fréquences de scan**:
- `hourly` - Toutes les heures
- `daily` - Quotidien (recommandé)
- `weekly` - Hebdomadaire

#### 3. **Scraping de Prix**

**Workflow**:
1. Produits configurés dans `/products`
2. Concurrents configurés dans `/competitors`
3. Lancer scan: Bouton "Lancer scan" ou API
4. Railway worker scrape les URLs
5. Résultats sauvegardés dans `pricing_matches`

**API de Scan**:
```bash
# Scanner tous les concurrents
POST /api/companies/[slug]/pricing/scans
Body: {}

# Scanner un concurrent spécifique
POST /api/companies/[slug]/pricing/scans
Body: { "competitorId": "xxx" }
```

**Railway Worker API**:
```bash
POST https://pricing-worker-production.up.railway.app/api/scrape
Headers:
  X-API-Key: [RAILWAY_WORKER_API_KEY]
  Content-Type: application/json
Body:
{
  "companyId": "xxx",
  "companySlug": "dissan",
  "competitorId": "yyy",
  "competitorName": "Swish",
  "competitorUrl": "https://swish.ca",
  "products": [
    {
      "id": "1",
      "sku": "ATL-21801",
      "name": "FLEXI-DUSTER",
      "brand": "ATL",
      "category": "Accessories"
    }
  ]
}
```

#### 4. **Cartes Cliquables du Dashboard**

| Carte | Destination | Description |
|-------|-------------|-------------|
| **Produits Surveillés** | `/pricing/products` | Liste tous les produits |
| **Écart Prix Moyen** | `/pricing/matches` | Comparaisons détaillées |
| **Avantage Compétitif** | `/pricing/matches` | Comparaisons détaillées |
| **Concurrents Actifs** | `/pricing/competitors` | Gestion des concurrents |
| **Alertes (7 jours)** | - | Statistique seule |
| **Couverture Marché** | - | Statistique seule |

#### 5. **Import de Catalogue**

**Format Fichier Excel/CSV**:
```csv
sku,name,brand,category,price
ATL-21801,FLEXI-DUSTER Flexible frame,ATL,Accessories,0.00
ATL-36780,KWIK Handle aluminium 60'',ATL,Accessories,0.00
```

**Processus d'Import**:
1. Upload fichier → Preview auto
2. Mapping colonnes (auto-détecté)
3. Validation
4. Import par batch de 50
5. Logs en temps réel

**Fichier de Test**:
- `Dissan/products-catalog-import.xlsx` - 54 produits Swish

---

## 🐛 Troubleshooting

### Problème: Worker retourne 503

**Cause**: Playwright non installé

**Solution**:
```bash
# Vérifier .nixpacks.toml
cat worker/.nixpacks.toml

# Redéployer
railway up
```

### Problème: "Unauthorized" dans Next.js

**Cause**: API key mismatch

**Solution**:
```bash
# Vérifier Railway
railway variables get API_KEY

# Vérifier Vercel
vercel env ls | grep RAILWAY_WORKER_API_KEY

# Doivent correspondre!
```

### Problème: TypeScript Build Errors

**Erreur commune**: Worker files inclus dans Next.js build

**Solution**: Vérifier `tsconfig.json`:
```json
{
  "exclude": [
    "node_modules",
    "worker"  // ← Important!
  ]
}
```

### Problème: Memory Overflow Railway

**Cause**: Trop de pages Playwright ouvertes

**Solutions**:
1. Vérifier que le browser se ferme après chaque scrape
2. Réduire `BATCH_SIZE` dans worker
3. Upgrade Railway plan (plus de RAM)

### Problème: Database Connection Errors

**Solution**:
```bash
# Tester la connexion
psql $DATABASE_URL -c "SELECT 1;"

# Vérifier les migrations
npm run db:migrate

# Régénérer le client Drizzle
npm run db:generate
```

---

## 💰 Coûts Estimés

### Railway (Worker)

**Starter Plan**: $5/mois
- 512 MB RAM
- 1 vCPU
- Suffisant pour MVP

**Usage estimé** (576 produits × 4 scans/mois):
- Compute: ~6.24 heures/mois
- **Coût**: ~$0.69/mois

### Vercel (Next.js)

**Hobby Plan**: Gratuit
- Déjà utilisé
- Pas de coût additionnel pour le module pricing

### Neon (PostgreSQL)

**Free Tier**: $0/mois
- 0.5 GB storage
- Suffisant pour démarrage

**Total Production**: **~$5/mois** (Railway uniquement)

---

## 📚 Ressources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Playwright Docs](https://playwright.dev)
- [Drizzle ORM](https://orm.drizzle.team)

### Support Interne

- `README.md` - Vue d'ensemble du projet
- `DEPLOIEMENT_PRODUCTION.md` - Guide original (FR)
- `worker/README.md` - Documentation worker
- `module-pricing/README.md` - Documentation module pricing

### URLs Utiles

- **Railway Dashboard**: https://railway.app/project/[project-id]
- **Vercel Dashboard**: https://vercel.com/jonathan-gaudettes-projects/market-intelligence
- **Neon Dashboard**: https://console.neon.tech

---

## 🎉 Checklist Finale de Déploiement

- [ ] ✅ Railway worker répond à `/health`
- [ ] ✅ Railway worker accepte requêtes avec API key
- [ ] ✅ Railway worker refuse requêtes sans API key (401)
- [ ] ✅ Next.js production accessible
- [ ] ✅ Variables d'environnement Vercel configurées
- [ ] ✅ Base de données accessible
- [ ] ✅ Migrations appliquées
- [ ] ✅ Concurrent ajouté (Swish)
- [ ] ✅ Produits importés
- [ ] ✅ Scan de pricing complété avec succès
- [ ] ✅ Matches sauvegardés dans `pricing_matches`
- [ ] ✅ Logs visibles dans Railway/Vercel dashboards

---

**Dernière mise à jour**: 2025-01-19
**Auteur**: Market Intelligence Team
**Version**: 2.0 - Production Ready 🚀
