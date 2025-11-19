# Phase 1: Database Schema & Migrations

**Durée estimée:** 2-3 heures
**Complexité:** ⭐⭐ Moyenne
**Pré-requis:** Phase 0 complétée avec succès

---

## 🎯 Objectif

Créer les migrations Drizzle et appliquer le schéma de 9 tables à la base de données PostgreSQL:

1. `pricing_products` - Catalogue produits utilisateur
2. `pricing_competitors` - Configuration concurrents
3. `pricing_matches` - Correspondances produit-concurrent
4. `pricing_history` - Historique prix (time-series)
5. `pricing_scans` - Tracking scans async
6. `pricing_alert_rules` - Règles d'alertes
7. `pricing_alert_events` - Événements d'alertes
8. `pricing_ai_recommendations` - Cache recommendations IA
9. `pricing_cache` - Cache PostgreSQL

**Valeur ajoutée:** Infrastructure data prête pour stocker toutes les données pricing.

---

## 📋 Pré-requis

**Vérifications avant de commencer:**

```bash
# 1. Phase 0 complétée
test -f module-pricing/handoffs/phase-0-handoff.json || echo "❌ Phase 0 not completed"

# 2. Schema pricing existe
test -f src/db/schema-pricing.ts || echo "❌ Schema pricing not found"

# 3. Drizzle config OK
test -f drizzle.config.ts || echo "❌ Drizzle config missing"

# 4. DATABASE_URL accessible
psql $DATABASE_URL -c "SELECT 1;" || echo "❌ Database not accessible"
```

**Si un pré-requis échoue:** Revenir à Phase 0.

---

## 📚 Documents à Lire (Contexte)

1. **`src/db/schema-pricing.ts`** (10 min)
   - Lire les 9 définitions de tables
   - Comprendre les relations (FK vers companies, users)
   - Noter les indexes créés

2. **`drizzle.config.ts`** (2 min)
   - Vérifier config: schema path, output dir, dialect PostgreSQL

3. **`module-pricing/handoffs/phase-0-handoff.json`** (2 min)
   - État de Phase 0, fichiers créés

**Total lecture:** ~15 minutes

---

## 🛠️ Tâches à Réaliser

### Tâche 1: Générer les Migrations Drizzle

**Action:** Créer les fichiers SQL de migration

```bash
# Générer les migrations
npm run db:generate

# OU si la commande n'existe pas dans package.json:
npx drizzle-kit generate:pg --schema=./src/db/schema.ts --out=./drizzle
```

**Résultat attendu:**
- Nouveau dossier `drizzle/` créé (si pas déjà existant)
- Fichier `drizzle/XXXX_[timestamp]_create_pricing_tables.sql` généré
- Log Drizzle confirme 9 nouvelles tables détectées

**Validation:**
```bash
# Vérifier le fichier de migration
ls -la drizzle/*.sql | tail -1

# Lire le contenu (preview)
cat drizzle/*.sql | head -50
```

**Exemple de contenu attendu:**
```sql
CREATE TABLE IF NOT EXISTS "pricing_products" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "company_id" varchar(255) NOT NULL,
  "sku" varchar(255) NOT NULL,
  "name" varchar(500) NOT NULL,
  ...
);

CREATE INDEX IF NOT EXISTS "pricing_products_company_sku_idx"
  ON "pricing_products" ("company_id","sku");

-- ... autres tables
```

---

### Tâche 2: Review des Migrations (IMPORTANT)

**Action:** Vérifier manuellement que les migrations sont correctes

```bash
# Ouvrir le fichier de migration dans l'éditeur
code drizzle/[latest-migration-file].sql
# OU
cat drizzle/[latest-migration-file].sql
```

**Checklist de review:**

- [ ] 9 tables `CREATE TABLE` présentes:
  - `pricing_products`
  - `pricing_competitors`
  - `pricing_matches`
  - `pricing_history`
  - `pricing_scans`
  - `pricing_alert_rules`
  - `pricing_alert_events`
  - `pricing_ai_recommendations`
  - `pricing_cache`

- [ ] Foreign keys vers `companies` et `users` présentes:
  ```sql
  CONSTRAINT ... FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade
  ```

- [ ] Indexes créés pour performance:
  - `pricing_products_company_sku_idx`
  - `pricing_matches_product_id_idx`
  - `pricing_history_product_date_idx`
  - etc.

- [ ] JSONB columns pour données flexibles:
  - `pricing_products.characteristics` (JSONB)
  - `pricing_matches.confidence_factors` (JSONB)
  - `pricing_ai_recommendations.recommendation_data` (JSONB)

- [ ] Timestamps avec defaults:
  - `created_at timestamp DEFAULT now() NOT NULL`
  - `updated_at timestamp DEFAULT now() NOT NULL`

**Si problème détecté:**
- Corriger `src/db/schema-pricing.ts`
- Supprimer le fichier de migration problématique
- Re-générer avec `npm run db:generate`

---

### Tâche 3: Appliquer les Migrations

**Action:** Exécuter les migrations sur la base de données dev

**⚠️ BACKUP RECOMMANDÉ (si DB contient données importantes):**
```bash
# Backup database (optionnel mais recommandé)
pg_dump $DATABASE_URL > backup-before-pricing-$(date +%Y%m%d-%H%M).sql
echo "Backup saved: backup-before-pricing-$(date +%Y%m%d-%H%M).sql"
```

**Appliquer migrations:**
```bash
# Exécuter les migrations
npm run db:migrate

# OU si commande n'existe pas:
npx drizzle-kit push:pg --schema=./src/db/schema.ts
```

**Résultat attendu:**
```
✓ Applying migration 0001_create_pricing_tables.sql
✓ Migration applied successfully
```

**Validation:**
```bash
# Vérifier que les tables existent
psql $DATABASE_URL -c "\dt pricing_*"

# Résultat attendu:
# pricing_products
# pricing_competitors
# pricing_matches
# pricing_history
# pricing_scans
# pricing_alert_rules
# pricing_alert_events
# pricing_ai_recommendations
# pricing_cache
```

---

### Tâche 4: Vérifier la Structure des Tables

**Action:** Confirmer que les tables ont été créées correctement

```bash
# Décrire la structure de chaque table clé
psql $DATABASE_URL -c "\d pricing_products"
psql $DATABASE_URL -c "\d pricing_matches"
psql $DATABASE_URL -c "\d pricing_history"
```

**Validation manuelle:**

Pour `pricing_products`:
- [ ] Colonne `id` (varchar PRIMARY KEY)
- [ ] Colonne `company_id` (varchar NOT NULL avec FK)
- [ ] Colonnes `sku`, `name`, `current_price`
- [ ] Colonne `characteristics` (jsonb)
- [ ] Timestamps `created_at`, `updated_at`
- [ ] Index sur `company_id + sku`

Pour `pricing_matches`:
- [ ] Colonnes `product_id`, `competitor_id` (FKs)
- [ ] Colonne `confidence` (decimal 0-1)
- [ ] Colonne `match_type` (varchar)
- [ ] Index sur `product_id`

Pour `pricing_history`:
- [ ] Colonnes `product_id`, `price`, `scraped_at`
- [ ] Index sur `product_id + scraped_at` (pour queries time-series)

---

### Tâche 5: Seed Initial Data (Optionnel mais Recommandé)

**Action:** Créer quelques données de test pour Phase 2

**Fichier:** `scripts/seed-pricing-dev.sql` (nouveau)

```sql
-- Seed data pour développement module Pricing
-- À exécuter: psql $DATABASE_URL -f scripts/seed-pricing-dev.sql

BEGIN;

-- 1. Trouver une company_id existante (remplacer par une vraie)
-- SELECT id FROM companies LIMIT 1;  -- Exécuter d'abord pour obtenir un ID

-- Utiliser la companyId de test (adapter selon votre DB)
DO $$
DECLARE
  test_company_id VARCHAR(255);
  test_user_id VARCHAR(255);
  product1_id VARCHAR(255);
  product2_id VARCHAR(255);
  comp1_id VARCHAR(255);
BEGIN
  -- Récupérer une company et un user existants
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  SELECT id INTO test_user_id FROM users LIMIT 1;

  IF test_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found in database';
  END IF;

  -- Générer IDs (simuler CUID2)
  product1_id := 'test_prod_' || substring(md5(random()::text) from 1 for 16);
  product2_id := 'test_prod_' || substring(md5(random()::text) from 1 for 16);
  comp1_id := 'test_comp_' || substring(md5(random()::text) from 1 for 16);

  -- Insérer 2 produits test
  INSERT INTO pricing_products (
    id, company_id, sku, name, name_cleaned, current_price, currency,
    characteristics, created_at, updated_at
  ) VALUES
    (
      product1_id,
      test_company_id,
      'ATL-2024',
      'Brosse à cuvette polypropylene',
      'brosse cuvette polypropylene',
      4.99,
      'CAD',
      '{"types": ["bowl brush"], "materials": ["polypropylene"], "features": ["turks head"]}'::jsonb,
      now(),
      now()
    ),
    (
      product2_id,
      test_company_id,
      'MOP-3341',
      'Vadrouille microfibre 18 pouces',
      'vadrouille microfibre 18 pouces',
      12.50,
      'CAD',
      '{"types": ["mop"], "materials": ["microfiber"], "sizes": ["18 inch"]}'::jsonb,
      now(),
      now()
    );

  -- Insérer 1 concurrent test (Swish)
  INSERT INTO pricing_competitors (
    id, company_id, name, website, config, enabled, created_at, updated_at
  ) VALUES
    (
      comp1_id,
      test_company_id,
      'Swish',
      'https://swish.ca',
      '{
        "selectors": {
          "productCard": ".product-item",
          "productName": ".product-title",
          "productPrice": ".product-price"
        },
        "rateLimit": {
          "requestsPerMinute": 30
        }
      }'::jsonb,
      false,
      now(),
      now()
    );

  -- Insérer historique prix (30 derniers jours)
  INSERT INTO pricing_history (
    id, product_id, price, currency, source, scraped_at, created_at
  )
  SELECT
    'hist_' || substring(md5(random()::text) from 1 for 16),
    product1_id,
    4.99 + (random() - 0.5) * 0.50,  -- Prix varie de 4.74 à 5.24
    'CAD',
    'manual',
    now() - (interval '1 day' * n),
    now() - (interval '1 day' * n)
  FROM generate_series(0, 29) as n;

  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE '  - 2 products created';
  RAISE NOTICE '  - 1 competitor created (Swish)';
  RAISE NOTICE '  - 30 price history points for product 1';
END $$;

COMMIT;
```

**Exécuter le seed:**
```bash
psql $DATABASE_URL -f scripts/seed-pricing-dev.sql
```

**Validation:**
```bash
# Vérifier les données insérées
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pricing_products;"
psql $DATABASE_URL -c "SELECT sku, name, current_price FROM pricing_products LIMIT 5;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pricing_history;"
```

---

## ✅ Critères de Succès

- [ ] Migrations générées sans erreurs
- [ ] Fichier `.sql` dans `drizzle/` contient 9 tables
- [ ] Review manuelle des migrations OK (FKs, indexes, types)
- [ ] Migrations appliquées à la DB avec succès
- [ ] Commande `psql $DATABASE_URL -c "\dt pricing_*"` liste 9 tables
- [ ] Structure des tables validée (describe tables)
- [ ] Seed data exécuté avec succès (2 produits, 1 concurrent, 30 points historique)
- [ ] Queries test passent:
  ```sql
  SELECT * FROM pricing_products LIMIT 5;
  SELECT * FROM pricing_competitors LIMIT 5;
  SELECT * FROM pricing_history ORDER BY scraped_at DESC LIMIT 10;
  ```

---

## 🧪 Validation

Script de validation automatique:

```bash
#!/bin/bash
# scripts/validate-phase-1.sh

echo "🔍 Validating Phase 1: Database Schema..."

# 1. Check migrations generated
if [ ! -d "drizzle" ] || [ -z "$(ls -A drizzle/*.sql 2>/dev/null)" ]; then
  echo "❌ No migrations found in drizzle/"
  exit 1
fi
echo "✅ Migrations generated"

# 2. Check tables exist
TABLES=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM information_schema.tables WHERE table_name LIKE 'pricing_%';")
if [ "$TABLES" -ne 9 ]; then
  echo "❌ Expected 9 tables, found $TABLES"
  exit 1
fi
echo "✅ 9 tables created"

# 3. Check seed data
PRODUCTS=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM pricing_products;")
if [ "$PRODUCTS" -lt 1 ]; then
  echo "⚠️  No seed products (optional, but recommended)"
else
  echo "✅ $PRODUCTS products seeded"
fi

# 4. Check indexes
INDEXES=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM pg_indexes WHERE tablename LIKE 'pricing_%';")
echo "✅ $INDEXES indexes created"

echo ""
echo "🎉 Phase 1 validation passed!"
```

**Rendre exécutable et exécuter:**
```bash
chmod +x scripts/validate-phase-1.sh
./scripts/validate-phase-1.sh
```

---

## 📦 Livrables Phase 1

**Fichiers créés:**
- `drizzle/XXXX_create_pricing_tables.sql` (migrations)
- `scripts/seed-pricing-dev.sql` (seed data)
- `scripts/validate-phase-1.sh` (validation script)

**Base de données:**
- 9 tables `pricing_*` créées
- Indexes optimisés pour queries
- FK constraints vers `companies`, `users`
- (Optionnel) 2+ produits seed, 1 concurrent seed

**Validation:**
```bash
git status  # Voir nouveaux fichiers
psql $DATABASE_URL -c "\dt pricing_*"  # Lister tables
```

---

## ➡️ Handoff pour Phase 2

**Fichier à créer:** `module-pricing/handoffs/phase-1-handoff.json`

```json
{
  "phase": 1,
  "name": "Database Schema & Migrations",
  "completed": "2025-11-19T18:30:00Z",
  "duration": "2.5h",
  "status": "completed",
  "filesCreated": [
    "drizzle/0001_create_pricing_tables.sql",
    "scripts/seed-pricing-dev.sql",
    "scripts/validate-phase-1.sh"
  ],
  "dbMigrations": [
    "0001_create_pricing_tables"
  ],
  "tablesCreated": [
    "pricing_products",
    "pricing_competitors",
    "pricing_matches",
    "pricing_history",
    "pricing_scans",
    "pricing_alert_rules",
    "pricing_alert_events",
    "pricing_ai_recommendations",
    "pricing_cache"
  ],
  "seedData": {
    "products": 2,
    "competitors": 1,
    "historyPoints": 30
  },
  "indexesCreated": 12,
  "dbConnected": true,
  "migrationApplied": true,
  "nextPhaseReady": true,
  "blockers": [],
  "notes": "Database schema fully functional. 9 tables with proper indexes and FKs. Seed data available for testing. Ready for Phase 2: Dashboard MVP."
}
```

---

## 🚨 Troubleshooting

### Problème 1: Migration génération échoue

**Symptôme:**
```
Error: Unable to connect to database
```

**Solution:**
```bash
# Vérifier DATABASE_URL
echo $DATABASE_URL

# Tester connexion
psql $DATABASE_URL -c "SELECT 1;"

# Si connexion échoue, vérifier .env.local
cat .env.local | grep DATABASE_URL
```

---

### Problème 2: Erreur FK constraint lors de la migration

**Symptôme:**
```sql
ERROR: relation "companies" does not exist
```

**Solution:**
Les tables `companies` et `users` doivent exister avant. Vérifier:
```bash
psql $DATABASE_URL -c "\dt companies"
psql $DATABASE_URL -c "\dt users"
```

Si manquantes, exécuter d'abord les migrations principales du projet:
```bash
npm run db:migrate  # Migrations principales du projet
```

---

### Problème 3: Seed data échoue (company_id not found)

**Symptôme:**
```
ERROR: No company found in database
```

**Solution:**
Créer une company de test d'abord:
```sql
-- Exécuter manuellement
INSERT INTO companies (id, name, slug, created_at, updated_at)
VALUES (
  'test_company_123',
  'Test Company',
  'test-company',
  now(),
  now()
);
```

Puis relancer le seed.

---

### Problème 4: Migrations dupliquées

**Symptôme:**
```
Error: Duplicate migration found
```

**Solution:**
```bash
# Supprimer les migrations dupliquées
rm drizzle/XXXX_[duplicate].sql

# Vérifier qu'il ne reste qu'une seule migration pricing
ls -la drizzle/*.sql | grep pricing
```

---

## 🎯 Prochaine Phase

Une fois Phase 1 complétée et validée:

**Phase 2: Dashboard MVP (Mock Data)**
- Créer la page `/companies/[slug]/pricing`
- Implémenter les 6 KPI cards avec StatCard
- Ajouter le graphique Recharts
- Utiliser données mock pour l'instant
- 100% conforme design-system-guidelines.md

**Document:** `module-pricing/phases/phase-2-dashboard.md`

**Prompt pour démarrer Phase 2:**
```markdown
Phase 1 complétée avec succès! 9 tables créées.

Lis maintenant:
1. module-pricing/handoffs/phase-1-handoff.json
2. module-pricing/phases/phase-2-dashboard.md
3. module-pricing/design-system-guidelines.md (refresh)
4. module-pricing/plan-initial-pricing.md section 3.1 (maquettes)

Et commence Phase 2: Dashboard MVP.
```

---

**Status Phase 1:** ⬜ TODO → Ready to start after Phase 0!
