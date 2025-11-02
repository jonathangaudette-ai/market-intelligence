# Guide de Déploiement - Vercel + Neon

**Système:** Market Intelligence avec Analyse Intelligente
**Infrastructure:** Vercel (hosting) + Neon (PostgreSQL) + Pinecone (vectors)
**Version:** 1.0 - Option A (Minimal mais fonctionnel)
**Date:** 2025-11-02

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

- [ ] Compte GitHub avec le repository pushé
- [ ] Compte Vercel (gratuit ou Pro)
- [ ] Compte Neon (gratuit tier disponible)
- [ ] Compte Pinecone (gratuit tier disponible)
- [ ] Compte Anthropic avec credits disponibles
- [ ] Compte OpenAI avec credits disponibles

---

## 🚀 Déploiement Étape par Étape

### ÉTAPE 1: Configuration de Neon (Database)

#### 1.1 Créer un projet Neon

1. Aller sur [console.neon.tech](https://console.neon.tech)
2. Cliquer "Create Project"
3. Configuration:
   - **Name:** `market-intelligence-prod`
   - **Region:** Choisir proche de vous (ex: US East, EU West)
   - **PostgreSQL Version:** 16 (latest)
   - **Compute:** Shared (gratuit)

4. Cliquer "Create Project"

#### 1.2 Récupérer la connection string

Une fois le projet créé:

1. Dans le dashboard, onglet "Connection Details"
2. Sélectionner "Connection string"
3. Copier l'URL qui ressemble à:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/main?sslmode=require
   ```

4. **IMPORTANT:** Sauvegarder cette URL, elle sera utilisée comme `DATABASE_URL`

#### 1.3 Configuration de la base de données

Neon est prêt à l'emploi! Les migrations seront appliquées automatiquement par Drizzle lors du premier déploiement.

---

### ÉTAPE 2: Configuration de Pinecone (Vectors)

#### 2.1 Créer un index Pinecone

1. Aller sur [app.pinecone.io](https://app.pinecone.io)
2. Cliquer "Create Index"
3. Configuration:
   - **Index Name:** `market-intelligence-prod`
   - **Dimensions:** `1536` (pour OpenAI text-embedding-3-large)
   - **Metric:** `cosine`
   - **Cloud:** `aws` ou `gcp`
   - **Region:** Proche de votre Vercel region

4. Cliquer "Create Index"

#### 2.2 Récupérer l'API Key

1. Dans le dashboard, aller dans "API Keys"
2. Copier la clé (commence par `pc-...`)
3. **Sauvegarder** comme `PINECONE_API_KEY`

---

### ÉTAPE 3: Configuration Anthropic et OpenAI

#### 3.1 Anthropic Claude Sonnet 4

1. Aller sur [console.anthropic.com](https://console.anthropic.com)
2. Onglet "API Keys"
3. Cliquer "Create Key"
4. Copier la clé (commence par `sk-ant-...`)
5. **Sauvegarder** comme `ANTHROPIC_API_KEY`

**Budget recommandé:** $50-100/mois pour 500-1000 documents

#### 3.2 OpenAI Embeddings

1. Aller sur [platform.openai.com](https://platform.openai.com)
2. Onglet "API Keys"
3. Cliquer "Create new secret key"
4. Copier la clé (commence par `sk-...`)
5. **Sauvegarder** comme `OPENAI_API_KEY`

**Budget recommandé:** $10-20/mois pour embeddings (très peu cher)

---

### ÉTAPE 4: Déploiement sur Vercel

#### 4.1 Connecter le repository GitHub

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le repository GitHub:
   - Cliquer "Import Git Repository"
   - Sélectionner `market-intelligence`
   - Cliquer "Import"

#### 4.2 Configuration du projet

Dans la page de configuration:

1. **Project Name:** `market-intelligence` (ou votre choix)
2. **Framework Preset:** Next.js (détecté automatiquement)
3. **Root Directory:** `./` (par défaut)
4. **Build Command:** `npm run build` (par défaut)
5. **Output Directory:** `.next` (par défaut)

#### 4.3 Variables d'environnement

**IMPORTANT:** Cliquer sur "Environment Variables" et ajouter toutes les variables suivantes:

```bash
# Database (Neon)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/main?sslmode=require

# Auth (générer avec: openssl rand -base64 32)
AUTH_SECRET=YOUR_GENERATED_SECRET_HERE
AUTH_TRUST_HOST=true

# Pinecone
PINECONE_API_KEY=pc-xxxxxxxxxxxxx
PINECONE_INDEX_NAME=market-intelligence-prod

# Anthropic (REQUIS pour analyse intelligente)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# OpenAI (REQUIS pour embeddings)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# App URL (sera mise à jour après déploiement)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Pour générer AUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 4.4 Déployer

1. Vérifier que toutes les variables sont configurées
2. Cliquer **"Deploy"**
3. Attendre 2-3 minutes

Vercel va:
- Installer les dépendances
- Builder l'application
- Déployer sur un URL type: `market-intelligence-xxx.vercel.app`

#### 4.5 Configurer le domaine (optionnel)

Si vous avez un domaine custom:

1. Dans le dashboard Vercel, onglet "Domains"
2. Ajouter votre domaine
3. Configurer les DNS selon les instructions

---

### ÉTAPE 5: Appliquer les migrations de base de données

#### 5.1 Installer Drizzle Kit localement

```bash
npm install -g drizzle-kit
```

#### 5.2 Appliquer les migrations

**Option A: Via Drizzle Studio (recommandé)**

```bash
# 1. Configurer DATABASE_URL localement
export DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/main?sslmode=require"

# 2. Appliquer les migrations
npx drizzle-kit push
```

**Option B: Manuellement via Neon Console**

1. Aller dans Neon Console → votre projet
2. Onglet "SQL Editor"
3. Copier le contenu de `drizzle/0000_light_moonstone.sql`
4. Exécuter le SQL

#### 5.3 Vérifier les tables

Dans Neon SQL Editor:

```sql
-- Lister les tables
\dt

-- Devrait afficher:
-- companies
-- company_members
-- competitors
-- conversations
-- documents (avec nouveaux champs: document_type, analysis_completed, analysis_confidence)
-- messages
-- signals (NOUVELLE TABLE)
-- users
```

---

### ÉTAPE 6: Seed de données initiales (optionnel)

#### 6.1 Créer un premier utilisateur

Vous pouvez soit:

**Option A: Via l'interface de login**
- Aller sur `https://your-app.vercel.app/login`
- Créer un compte (si l'inscription est activée)

**Option B: Via SQL direct**

```sql
-- Créer un utilisateur admin
INSERT INTO users (id, email, password_hash, name, is_super_admin, created_at, updated_at)
VALUES (
  'user-admin-001',
  'admin@example.com',
  '$2a$10$...', -- Hash bcrypt du password
  'Admin User',
  true,
  NOW(),
  NOW()
);

-- Créer une compagnie de demo
INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
VALUES (
  'company-demo-001',
  'Demo Company',
  'demo-company',
  true,
  NOW(),
  NOW()
);

-- Associer l'utilisateur à la compagnie
INSERT INTO company_members (id, user_id, company_id, role, created_at, updated_at)
VALUES (
  'member-001',
  'user-admin-001',
  'company-demo-001',
  'admin',
  NOW(),
  NOW()
);
```

---

### ÉTAPE 7: Configuration Vercel avancée

#### 7.1 Timeout des fonctions

L'analyse intelligente peut prendre 30-60 secondes. Sur Vercel:

- **Hobby:** Timeout max 10s (PROBLÈME!)
- **Pro:** Timeout max 60s ✅
- **Enterprise:** Timeout max 300s

**Recommandation:** Upgrader vers Vercel Pro si vous n'y êtes pas déjà.

**Configuration du timeout:**

Créer/modifier `vercel.json`:

```json
{
  "functions": {
    "src/app/api/companies/[slug]/documents/upload/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### 7.2 Variables d'environnement par branche

Pour avoir des environnements séparés:

1. Dans Vercel → Settings → Environment Variables
2. Pour chaque variable, sélectionner l'environment:
   - **Production:** Main branch
   - **Preview:** Pull requests
   - **Development:** Local

Exemple:
- `DATABASE_URL` Production: Neon prod DB
- `DATABASE_URL` Preview: Neon preview DB (ou local)

---

### ÉTAPE 8: Validation du déploiement

#### 8.1 Vérifier que l'app est accessible

1. Aller sur `https://your-app.vercel.app`
2. Vérifier que la page de login s'affiche
3. Se connecter

#### 8.2 Uploader un document de test

1. Aller sur `/companies/demo-company/documents`
2. Uploader un PDF simple (< 5 pages)
3. Vérifier les logs Vercel:
   - Aller dans Vercel Dashboard → Functions
   - Cliquer sur la fonction `/api/documents/upload`
   - Vérifier les logs:
     ```
     [doc-xxx] Starting intelligent analysis...
     [doc-xxx] Analysis complete. Type: contract, Confidence: 0.95
     [doc-xxx] Created 12 chunks
     ```

#### 8.3 Vérifier en base de données

Dans Neon SQL Editor:

```sql
-- Vérifier le document uploadé
SELECT
  id,
  name,
  document_type,
  analysis_completed,
  analysis_confidence,
  status,
  metadata->'pricing'->>'amount' as price
FROM documents
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier les signaux détectés
SELECT
  type,
  severity,
  summary
FROM signals
ORDER BY created_at DESC
LIMIT 5;
```

#### 8.4 Vérifier Pinecone

1. Aller dans Pinecone Console → votre index
2. Onglet "Data"
3. Vérifier qu'il y a des vectors (count > 0)
4. Cliquer "Query" et tester une recherche

---

## 🎯 Post-Déploiement

### Configuration recommandée

#### 1. Monitoring des logs

Configurer des alertes sur Vercel pour:
- Erreurs 500
- Timeouts
- Coûts API élevés

#### 2. Backup de la base de données

Neon propose des backups automatiques:
- **Free tier:** 7 jours de retention
- **Pro tier:** 30 jours de retention

Configuration:
1. Neon Console → Project Settings → Backup
2. Activer "Point-in-time restore"

#### 3. Monitoring des coûts API

**Anthropic:**
- Dashboard → Usage & Billing
- Configurer une alerte à $X/mois

**OpenAI:**
- Platform → Usage
- Configurer des limites mensuelles

**Budget estimé mensuel:**
- 100 documents/mois: ~$15-25
- 500 documents/mois: ~$75-125
- 1000 documents/mois: ~$150-250

---

## 🐛 Troubleshooting

### Problème 1: "Function timeout after 10 seconds"

**Cause:** Vercel Hobby tier a timeout de 10s
**Solution:** Upgrader vers Pro OU réduire le budget thinking:

```typescript
// src/lib/rag/intelligent-preprocessor.ts
thinking: {
  type: "enabled",
  budget_tokens: 1500, // Au lieu de 3000
}
```

### Problème 2: "ANTHROPIC_API_KEY is not set"

**Cause:** Variable d'environnement manquante
**Solution:**
1. Vercel Dashboard → Settings → Environment Variables
2. Ajouter `ANTHROPIC_API_KEY`
3. Redéployer:
   ```bash
   vercel --prod
   ```

### Problème 3: Migration database échoue

**Erreur:** `relation "documents" already exists`
**Cause:** Tables existent déjà (migration déjà appliquée)
**Solution:** Ignorer, c'est normal. Les migrations Drizzle sont idempotentes.

### Problème 4: Pinecone "dimension mismatch"

**Erreur:** `Dimension mismatch: expected 1536, got XXX`
**Cause:** Index Pinecone mal configuré
**Solution:**
1. Supprimer l'index Pinecone
2. Recréer avec dimensions: **1536**
3. Redéployer

### Problème 5: Coûts API trop élevés

**Symptôme:** Facture Anthropic > $100/mois inattendue
**Causes possibles:**
- Trop de re-uploads du même document
- Documents très longs (> 50 pages)
- Pas de cache

**Solutions:**
1. Vérifier la table `documents` pour duplicates:
   ```sql
   SELECT name, COUNT(*) as count
   FROM documents
   GROUP BY name
   HAVING COUNT(*) > 1;
   ```

2. Limiter la taille des documents:
   ```typescript
   // src/app/api/companies/[slug]/documents/upload/route.ts
   const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
   if (file.size > MAX_FILE_SIZE) {
     return NextResponse.json({ error: "File too large" }, { status: 400 });
   }
   ```

---

## ✅ Checklist finale

Avant de considérer le déploiement comme réussi:

### Infrastructure
- [ ] Neon database accessible et migrations appliquées
- [ ] Pinecone index créé avec dimensions 1536
- [ ] Vercel app déployée et accessible
- [ ] Toutes les variables d'environnement configurées

### Fonctionnalités
- [ ] Login fonctionne
- [ ] Upload de document fonctionne (< 60s)
- [ ] Analyse intelligente s'exécute (vérifier logs)
- [ ] Métadonnées extraites (vérifier DB)
- [ ] Signaux détectés (si applicable)
- [ ] Chat RAG retourne des réponses

### Monitoring
- [ ] Logs Vercel accessibles
- [ ] Alertes coûts API configurées
- [ ] Backup Neon activé

---

## 🔄 Workflow de mise à jour

Pour déployer de nouvelles modifications:

```bash
# 1. Développer localement
git checkout -b feature/my-feature

# 2. Tester localement
npm run dev

# 3. Commit et push
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature

# 4. Créer Pull Request sur GitHub

# 5. Vercel déploie automatiquement un preview
# URL: market-intelligence-git-feature-xxx.vercel.app

# 6. Tester le preview

# 7. Merger la PR → Déploiement automatique en production
```

---

## 📊 Métriques de succès

Après 1 semaine de production:

- [ ] Uptime > 99%
- [ ] Temps moyen d'analyse < 45s
- [ ] Taux de succès d'analyse > 95%
- [ ] Coûts API conformes au budget
- [ ] 0 timeout errors (ou upgrade vers Pro)

---

## 🆘 Support

En cas de problème:

1. **Vérifier les logs Vercel:** Dashboard → Functions → Logs
2. **Vérifier la DB Neon:** Console → SQL Editor
3. **Vérifier Pinecone:** Dashboard → Index stats
4. **Consulter la documentation:**
   - `INTELLIGENT_ANALYSIS_SYSTEM.md` - Documentation système
   - `TESTING_GUIDE.md` - Guide de test
   - `README.md` - Documentation générale

---

**Créé le:** 2025-11-02
**Dernière mise à jour:** 2025-11-02
**Version:** 1.0 - Option A (Minimal)
**Auteurs:** Claude Code + Jonathan Gaudette
