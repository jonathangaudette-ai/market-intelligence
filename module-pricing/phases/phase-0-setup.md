# Phase 0: Setup & Foundation

**Durée estimée:** 1-2 heures
**Complexité:** ⭐ Facile
**Pré-requis:** Aucun

---

## 🎯 Objectif

Préparer l'environnement de développement pour le module Pricing:
- Créer la structure de dossiers
- Copier le schéma Drizzle
- Configurer les variables d'environnement
- Valider que tout est prêt pour le développement

**Valeur ajoutée:** Foundation technique solide avant d'écrire du code.

---

## 📋 Pré-requis

**Vérifications avant de commencer:**

```bash
# 1. Node.js version
node --version  # Doit être ≥18.0.0

# 2. npm packages installés
npm list drizzle-orm drizzle-kit  # Doivent être installés

# 3. DATABASE_URL configurée
echo $DATABASE_URL  # Doit afficher la connexion PostgreSQL

# 4. Repository clean
git status  # Vérifier qu'il n'y a pas de changements non commités critiques
```

**Si un pré-requis échoue:** Résoudre avant de continuer.

---

## 📚 Documents à Lire (Contexte)

Lis ces documents dans cet ordre:

1. **`module-pricing/schema-pricing-drizzle.ts`** (5 min)
   - Comprendre les 9 tables à créer
   - Noter les relations entre tables
   - Identifier les indexes

2. **`drizzle.config.ts`** (2 min)
   - Vérifier la configuration Drizzle existante
   - Confirmer le chemin du schéma: `./src/db/schema.ts`

3. **`CLAUDE.md`** (section AI Models) (3 min)
   - Confirmer les models disponibles: GPT-5, Claude Sonnet 4.5, Claude Haiku 4.5
   - Vérifier les API keys nécessaires

**Total lecture:** ~10 minutes

---

## 🛠️ Tâches à Réaliser

### Tâche 1: Créer la Structure de Dossiers

**Action:** Créer tous les dossiers nécessaires pour le module

```bash
# Créer structure pages Next.js
mkdir -p src/app/\(dashboard\)/companies/\[slug\]/pricing/{catalog,competitors,settings}

# Créer structure API routes
mkdir -p src/app/api/companies/\[slug\]/pricing/{stats,products,competitors,scans,matches,history,alerts}

# Créer structure lib/components
mkdir -p src/lib/pricing/{scraper,matcher,analyzer}
mkdir -p src/components/pricing/{dashboard,catalog,competitors}
```

**Validation:**
```bash
# Vérifier que les dossiers existent
ls -la src/app/\(dashboard\)/companies/\[slug\]/pricing
ls -la src/app/api/companies/\[slug\]/pricing
ls -la src/lib/pricing
ls -la src/components/pricing
```

---

### Tâche 2: Copier le Schéma Drizzle

**Action:** Intégrer le schéma pricing dans le schéma principal

**Fichier source:** `module-pricing/schema-pricing-drizzle.ts`
**Fichier cible:** `src/db/schema-pricing.ts` (nouveau fichier séparé)

```bash
# Copier le schéma
cp module-pricing/schema-pricing-drizzle.ts src/db/schema-pricing.ts

echo "✅ Schéma pricing copié"
```

**Puis:** Modifier `src/db/schema.ts` pour l'importer:

```typescript
// Ajouter à la fin de src/db/schema.ts
export * from './schema-pricing';
```

**Validation:**
```bash
# Vérifier que le fichier existe et compile
ls -la src/db/schema-pricing.ts
npx tsc --noEmit  # Ne doit pas avoir d'erreurs
```

---

### Tâche 3: Vérifier les Variables d'Environnement

**Action:** S'assurer que toutes les env vars nécessaires sont présentes

**Fichier:** `.env.local` (ou `.env`)

```bash
# Vérifier les variables critiques
cat .env.local | grep -E "(DATABASE_URL|OPENAI_API_KEY|ANTHROPIC_API_KEY)"
```

**Variables requises:**

```bash
# PostgreSQL (Déjà configuré normalement)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# AI APIs (Pour matching et recommendations)
OPENAI_API_KEY="sk-..."           # Pour GPT-5
ANTHROPIC_API_KEY="sk-ant-..."    # Pour Claude Sonnet 4.5

# Vercel Blob (Pour exports Excel - optionnel Phase 0)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."  # Probablement déjà configuré
```

**Si manquant:** Demander à l'utilisateur de les ajouter avant Phase 1.

**Validation:**
```bash
# Test connexion DB
psql $DATABASE_URL -c "SELECT version();"

# Si psql pas installé, alternative:
node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT version()').then(res => {
    console.log('✅ DB connected:', res.rows[0].version);
    pool.end();
  }).catch(err => console.error('❌ DB error:', err));
"
```

---

### Tâche 4: Créer le Fichier de Configuration Scraping

**Action:** Préparer la config pour les sites concurrents

**Fichier:** `src/lib/pricing/scraper/config.ts` (nouveau)

```typescript
/**
 * Configuration des sites concurrents à scraper
 *
 * Cette configuration sera utilisée par le scraping engine (Phase 6)
 */

export interface CompetitorSiteConfig {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  selectors: {
    productCard: string;
    productName: string;
    productPrice: string;
    productSKU?: string;
    productImage?: string;
  };
  pagination?: {
    type: 'infinite-scroll' | 'button-click' | 'url-param';
    selector?: string;
    urlPattern?: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequests: number; // ms
  };
  stealth: {
    useProxy: boolean;
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

// Configuration initiale (sera enrichie en Phase 6)
export const COMPETITOR_SITES: CompetitorSiteConfig[] = [
  {
    id: 'swish',
    name: 'Swish',
    baseUrl: 'https://swish.ca',
    enabled: false, // Désactivé pour l'instant
    selectors: {
      productCard: '.product-item',
      productName: '.product-title',
      productPrice: '.product-price',
    },
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
    },
    stealth: {
      useProxy: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 },
    },
  },
  // Autres sites à ajouter en Phase 6
];
```

**Validation:** Fichier créé et compile sans erreurs.

---

### Tâche 5: Créer les Types TypeScript Partagés

**Action:** Définir les types réutilisables pour tout le module

**Fichier:** `src/types/pricing.ts` (nouveau)

```typescript
/**
 * Types partagés pour le module Pricing Intelligence
 */

// Status d'un scan
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Niveau d'alerte
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

// Type de matching
export type MatchType = 'exact_sku' | 'name_similarity' | 'characteristic_match' | 'manual';

// Statistiques dashboard
export interface PricingStats {
  products: {
    total: number;
    tracked: number;
    matched: number;
    coverage: number; // Pourcentage 0-1
  };
  pricing: {
    avgGap: number; // Pourcentage (peut être négatif)
    competitiveAdvantage: number; // Pourcentage
    trend7d: number; // Variation 7 derniers jours
  };
  competitors: {
    active: number;
    total: number;
  };
  alerts: {
    last7d: number;
    trend: number;
    critical: number;
  };
}

// Point de données historique
export interface PriceHistoryPoint {
  date: string; // ISO 8601
  yourPrice?: number;
  competitorPrices: Record<string, number>; // { 'swish': 3.85, 'grainger': 3.95 }
}

// Configuration d'une règle d'alerte
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    type: 'price_drop' | 'price_increase' | 'gap_threshold' | 'new_competitor';
    threshold?: number;
    competitors?: string[]; // IDs des concurrents
    categories?: string[];
  }[];
  actions: {
    type: 'email' | 'slack' | 'webhook';
    config: Record<string, any>;
  }[];
}

// Résultat de matching produit
export interface ProductMatch {
  productId: string;
  competitorId: string;
  competitorProductName: string;
  competitorPrice: number;
  confidence: number; // 0-1
  matchType: MatchType;
  characteristics?: {
    types?: string[];
    materials?: string[];
    sizes?: string[];
    features?: string[];
  };
}

// Export pour réutilisation
export type { ScanStatus, AlertSeverity, MatchType };
```

**Validation:** Types compilent sans erreurs TypeScript.

---

### Tâche 6: Créer le Script de Setup Automatique

**Action:** Créer un script bash pour setup rapide

**Fichier:** `scripts/setup-pricing-module.sh` (nouveau)

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Pricing Intelligence Module..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js version must be ≥18. Current: $(node --version)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js version OK: $(node --version)${NC}"

# 2. Check dependencies
echo ""
echo "2️⃣  Checking dependencies..."
if ! npm list drizzle-orm > /dev/null 2>&1; then
  echo -e "${RED}❌ drizzle-orm not installed${NC}"
  exit 1
fi
if ! npm list drizzle-kit > /dev/null 2>&1; then
  echo -e "${RED}❌ drizzle-kit not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies OK${NC}"

# 3. Check DATABASE_URL
echo ""
echo "3️⃣  Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set in environment${NC}"
  echo "   Please add DATABASE_URL to .env.local"
  exit 1
fi
echo -e "${GREEN}✅ DATABASE_URL configured${NC}"

# 4. Create directories
echo ""
echo "4️⃣  Creating directory structure..."
mkdir -p src/app/\(dashboard\)/companies/\[slug\]/pricing/{catalog,competitors,settings}
mkdir -p src/app/api/companies/\[slug\]/pricing/{stats,products,competitors,scans,matches,history,alerts}
mkdir -p src/lib/pricing/{scraper,matcher,analyzer}
mkdir -p src/components/pricing/{dashboard,catalog,competitors}
echo -e "${GREEN}✅ Directories created${NC}"

# 5. Copy schema
echo ""
echo "5️⃣  Copying Drizzle schema..."
if [ -f "module-pricing/schema-pricing-drizzle.ts" ]; then
  cp module-pricing/schema-pricing-drizzle.ts src/db/schema-pricing.ts
  echo -e "${GREEN}✅ Schema copied to src/db/schema-pricing.ts${NC}"
else
  echo -e "${RED}❌ Source schema not found: module-pricing/schema-pricing-drizzle.ts${NC}"
  exit 1
fi

# 6. Update main schema
echo ""
echo "6️⃣  Updating main schema..."
if ! grep -q "schema-pricing" src/db/schema.ts 2>/dev/null; then
  echo "export * from './schema-pricing';" >> src/db/schema.ts
  echo -e "${GREEN}✅ Main schema updated${NC}"
else
  echo -e "${YELLOW}⚠️  Schema-pricing already exported${NC}"
fi

# 7. Verify TypeScript compilation
echo ""
echo "7️⃣  Verifying TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
  echo -e "${GREEN}✅ TypeScript compilation OK${NC}"
else
  echo -e "${YELLOW}⚠️  TypeScript errors found (may be pre-existing)${NC}"
fi

# 8. Test DB connection
echo ""
echo "8️⃣  Testing database connection..."
node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1 as test')
    .then(() => {
      console.log('\x1b[32m✅ Database connection OK\x1b[0m');
      pool.end();
      process.exit(0);
    })
    .catch(err => {
      console.error('\x1b[31m❌ Database connection failed:\x1b[0m', err.message);
      pool.end();
      process.exit(1);
    });
" || exit 1

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: npm run db:generate  (generate migrations)"
echo "  2. Review migrations in drizzle/ folder"
echo "  3. Run: npm run db:migrate  (apply migrations)"
echo "  4. Start Phase 1: Database Schema & Migrations"
```

**Rendre exécutable:**
```bash
chmod +x scripts/setup-pricing-module.sh
```

---

## ✅ Critères de Succès

Valide que tous ces critères sont remplis:

- [ ] Tous les dossiers créés (vérifier avec `ls`)
- [ ] Schéma Drizzle copié dans `src/db/schema-pricing.ts`
- [ ] Export ajouté dans `src/db/schema.ts`
- [ ] Types TypeScript dans `src/types/pricing.ts` compilent
- [ ] Config scraper dans `src/lib/pricing/scraper/config.ts` créée
- [ ] Script setup exécutable: `chmod +x scripts/setup-pricing-module.sh`
- [ ] DATABASE_URL configurée et testée
- [ ] OPENAI_API_KEY présente (pour Phase 7)
- [ ] ANTHROPIC_API_KEY présente (pour Phase 8-9)
- [ ] `npx tsc --noEmit` passe sans erreurs nouvelles

---

## 🧪 Validation

Exécute ces commandes pour valider Phase 0:

```bash
# 1. Exécuter le script de setup
./scripts/setup-pricing-module.sh

# 2. Vérifier la structure
tree src/app/\(dashboard\)/companies/\[slug\]/pricing  # Si tree installé
# OU
ls -R src/app/\(dashboard\)/companies/\[slug\]/pricing

# 3. Vérifier le schéma
cat src/db/schema-pricing.ts | head -20

# 4. Test TypeScript
npx tsc --noEmit

# 5. Test connexion DB
psql $DATABASE_URL -c "SELECT 1;"
```

**Résultat attendu:** Tous les tests passent ✅

---

## 📦 Livrables Phase 0

Fichiers créés/modifiés:

**Créés:**
- `src/db/schema-pricing.ts` (copie du schéma Drizzle)
- `src/types/pricing.ts` (types partagés)
- `src/lib/pricing/scraper/config.ts` (config sites concurrents)
- `scripts/setup-pricing-module.sh` (script setup automatique)
- Tous les dossiers de structure

**Modifiés:**
- `src/db/schema.ts` (ajout export schema-pricing)

**Validation visuelle:**
```bash
git status  # Voir tous les fichiers créés/modifiés
```

---

## ➡️ Handoff pour Phase 1

**Fichier à créer:** `module-pricing/handoffs/phase-0-handoff.json`

```json
{
  "phase": 0,
  "name": "Setup & Foundation",
  "completed": "2025-11-19T16:00:00Z",
  "duration": "1.5h",
  "status": "completed",
  "filesCreated": [
    "src/db/schema-pricing.ts",
    "src/types/pricing.ts",
    "src/lib/pricing/scraper/config.ts",
    "scripts/setup-pricing-module.sh"
  ],
  "filesModified": [
    "src/db/schema.ts"
  ],
  "dirsCreated": [
    "src/app/(dashboard)/companies/[slug]/pricing",
    "src/app/api/companies/[slug]/pricing",
    "src/lib/pricing",
    "src/components/pricing"
  ],
  "envVarsVerified": [
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY"
  ],
  "dbConnected": true,
  "typeScriptCompiles": true,
  "nextPhaseReady": true,
  "blockers": [],
  "notes": "Foundation setup complete. Ready for Phase 1: Database migrations."
}
```

---

## 🚨 Troubleshooting

### Problème 1: DATABASE_URL non définie

**Symptôme:**
```bash
❌ DATABASE_URL not set in environment
```

**Solution:**
```bash
# Ajouter à .env.local
echo 'DATABASE_URL="postgresql://user:pass@host:5432/dbname"' >> .env.local

# Recharger l'environnement
source .env.local  # Ou redémarrer le terminal
```

---

### Problème 2: Erreurs TypeScript lors de la copie du schéma

**Symptôme:**
```
error TS2307: Cannot find module './schema' or its corresponding type declarations.
```

**Solution:**
Le schéma-pricing.ts importe `companies` et `users` de `./schema`. Vérifier que:
```typescript
// Dans schema-pricing.ts, ligne ~6
import { companies, users } from "./schema"; // ✅ Bon chemin

// Si erreur, vérifier que src/db/schema.ts exporte bien:
export const companies = pgTable("companies", { ... });
export const users = pgTable("users", { ... });
```

---

### Problème 3: Permissions script setup

**Symptôme:**
```bash
-bash: ./scripts/setup-pricing-module.sh: Permission denied
```

**Solution:**
```bash
chmod +x scripts/setup-pricing-module.sh
./scripts/setup-pricing-module.sh
```

---

### Problème 4: Drizzle packages manquants

**Symptôme:**
```bash
❌ drizzle-orm not installed
```

**Solution:**
```bash
# Installer les dépendances Drizzle
npm install drizzle-orm drizzle-kit postgres

# Vérifier
npm list drizzle-orm drizzle-kit
```

---

## 🎯 Prochaine Phase

Une fois Phase 0 complétée et validée:

**Phase 1: Database Schema & Migrations**
- Générer les migrations Drizzle
- Appliquer les migrations en dev
- Vérifier les 9 tables créées
- Seed initial data (optionnel)

**Document:** `module-pricing/phases/phase-1-database.md`

**Prompt pour démarrer Phase 1:**
```markdown
Phase 0 complétée avec succès!

Lis maintenant:
1. module-pricing/handoffs/phase-0-handoff.json
2. module-pricing/phases/phase-1-database.md

Et commence Phase 1: Database Schema & Migrations.
```

---

**Status Phase 0:** ⬜ TODO → Ready to start!
