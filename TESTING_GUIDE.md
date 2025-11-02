# Guide de Test - Système d'Analyse Intelligente

**Date:** 2025-11-02
**Version:** 1.0

---

## 📋 Vue d'ensemble

Ce guide explique comment tester le **système d'analyse intelligente de documents** qui utilise Claude Sonnet 4 pour pré-traiter les documents avant leur vectorisation.

### Types de tests disponibles

1. **Tests unitaires** (Vitest) - Validation de chaque composant
2. **Script end-to-end** (tsx) - Validation du flux complet
3. **Tests manuels** (API) - Upload de vrais documents

---

## 🚀 Quick Start

### Prérequis

```bash
# 1. Variables d'environnement
export ANTHROPIC_API_KEY=sk-ant-...  # Requis
export OPENAI_API_KEY=sk-...          # Optionnel (pour tests complets)
export PINECONE_API_KEY=...           # Optionnel (pour tests complets)

# 2. Installer les dépendances
npm install
```

### Test rapide (recommandé pour démarrer)

```bash
# Validation end-to-end (~2 minutes, ~$0.50)
npx tsx scripts/test-intelligent-analysis.ts
```

Cette commande teste automatiquement:
- ✅ Contrat SaaS
- ✅ Appel d'offres gouvernemental
- ✅ Rapport concurrentiel (avec détection de signaux)
- ✅ Rapport financier

---

## 🧪 Option 1: Script End-to-End (Recommandé)

### Avantages
- **Rapide:** ~2 minutes pour 4 documents
- **Autonome:** Pas besoin de DB ou Pinecone
- **Visuel:** Output coloré avec détails
- **Coût:** ~$0.50 total

### Commande

```bash
npx tsx scripts/test-intelligent-analysis.ts
```

### Output attendu

```
╔═══════════════════════════════════════════════════════════════════════════╗
║   INTELLIGENT DOCUMENT ANALYSIS - END-TO-END VALIDATION                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

✅ Environment configured

================================================================================
TEST 1: SaaS Contract Analysis
================================================================================

ℹ️  Analysis completed in 12.3s
✅ Document type: contract
✅ Confidence: 95.2%
✅ Contract type identified as SaaS
✅ Parties extracted: 2
✅ Pricing model: subscription
✅ Pricing amount extracted
✅ Clauses extracted: 5
✅ Non-relevant sections excluded: 3
ℹ️  Indexable sections: 6/9

Extracted Metadata Sample:
{
  "contractType": "SaaS",
  "parties": ["TechVendor Inc.", "Enterprise Corp"],
  "pricing": {
    "model": "subscription",
    "amount": "$2,499",
    "currency": "USD"
  },
  "terms": {
    "duration": "12 months",
    "startDate": "January 1, 2024"
  }
}

[... Tests 2, 3, 4 ...]

================================================================================
TEST SUMMARY
================================================================================

ℹ️  Total tests: 32
✅ Passed: 32
ℹ️  Duration: 125.7s

🎉 ALL TESTS PASSED! 🎉

ℹ️  Estimated API cost: ~$0.48
```

### Interprétation des résultats

#### ✅ Tous les tests passent
Le système fonctionne correctement! Vous pouvez passer aux tests avec de vrais documents.

#### ❌ Certains tests échouent

**Erreur commune 1:** `ANTHROPIC_API_KEY not set`
```bash
# Solution
export ANTHROPIC_API_KEY=sk-ant-...
```

**Erreur commune 2:** Timeout ou erreur API
```bash
# Cause: Rate limiting ou problème réseau
# Solution: Attendre 1 minute et relancer
```

**Erreur commune 3:** Métadonnées manquantes
```bash
# Cause: Le modèle n'a pas détecté certaines infos
# Action: Vérifier le prompt dans intelligent-preprocessor.ts
#         Les règles peuvent nécessiter un ajustement
```

---

## 🧪 Option 2: Tests Unitaires (Vitest)

### Avantages
- **Granulaire:** Teste chaque fonction individuellement
- **CI/CD:** Peut être intégré dans pipeline
- **Rapide:** Skip si pas d'API key

### Setup

Installer Vitest (si pas déjà fait):
```bash
npm install -D vitest @vitest/ui
```

Ajouter script dans `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:intelligent": "vitest intelligent-preprocessor.test.ts"
  }
}
```

### Commandes

```bash
# Tous les tests
npm test

# Tests d'analyse intelligente uniquement
npm run test:intelligent

# Mode interactif avec UI
npm run test:ui
```

### Structure des tests

```typescript
// src/lib/rag/__tests__/intelligent-preprocessor.test.ts

describe("Contract Document Analysis", () => {
  it("should correctly identify and analyze a SaaS contract", async () => {
    const analysis = await analyzeDocument(MOCK_DOCUMENTS.contract_saas, ...);

    expect(analysis.documentType).toBe("contract");
    expect(analysis.confidence).toBeGreaterThanOrEqual(0.9);
    expect(analysis.metadata.pricing?.model).toBe("subscription");
    // ...
  });
});
```

### Données de test

Tous les documents mockés sont dans:
```
src/lib/rag/__tests__/test-documents.ts
```

Vous pouvez ajouter vos propres documents de test:
```typescript
export const MOCK_DOCUMENTS = {
  // Existants
  contract_saas: `...`,
  rfp_government: `...`,

  // Ajoutez vos propres tests
  my_custom_doc: `
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    MY CUSTOM DOCUMENT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Content here...
  `,
};
```

---

## 🧪 Option 3: Tests Manuels avec API

### Prérequis complets

```bash
# Toutes les variables d'environnement
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export PINECONE_API_KEY=...
export DATABASE_URL=postgresql://...
```

### 1. Démarrer le serveur

```bash
npm run dev
# Serveur sur http://localhost:3010
```

### 2. Upload un document de test

#### Via UI (Browser)

1. Ouvrir http://localhost:3010/companies/demo-company/documents
2. Cliquer "Upload Document"
3. Sélectionner un PDF
4. Attendre le traitement (~30-60s)
5. Vérifier les résultats dans la console serveur

#### Via cURL

```bash
# Créer un PDF de test
cat > /tmp/test-contract.txt << 'EOF'
SOFTWARE AS A SERVICE AGREEMENT

This Agreement is between Provider Inc. and Customer Corp.

PRICING
Monthly subscription: $999/month for up to 50 users.

TERM
Initial term of 12 months, auto-renewal.

SLA
99.9% uptime guarantee.
EOF

# Convertir en PDF (nécessite wkhtmltopdf ou similar)
# Sinon utilisez un vrai PDF

# Upload via API
curl -X POST http://localhost:3010/api/companies/demo-company/documents/upload \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -F "file=@/tmp/test-contract.pdf"
```

### 3. Vérifier les résultats

#### Console serveur

```bash
[doc-abc123] Starting intelligent analysis...
[doc-abc123] Analysis complete. Type: contract, Confidence: 0.95
[doc-abc123] Indexable sections: 4/6
[doc-abc123] Created 12 chunks from filtered content
[doc-abc123] Saving 0 detected signals...
```

#### Database (PostgreSQL)

```sql
-- Vérifier le document
SELECT
  id,
  name,
  document_type,
  analysis_completed,
  analysis_confidence,
  metadata->'contractType' as contract_type,
  metadata->'pricing'->>'amount' as price
FROM documents
WHERE id = 'doc-abc123';

-- Vérifier les signaux détectés
SELECT
  type,
  severity,
  summary,
  details
FROM signals
WHERE document_id = 'doc-abc123';
```

#### Pinecone (Vector DB)

```bash
# Via Pinecone Console
# Rechercher vectors avec metadata.document_id = 'doc-abc123'
# Vérifier que metadata contient:
#   - document_type
#   - contract_type (si contrat)
#   - pricing_model, pricing_amount
#   - etc.
```

---

## 📊 Checklist de Validation

### ✅ Contrat SaaS

- [ ] `documentType === "contract"`
- [ ] `confidence >= 0.9`
- [ ] `metadata.contractType` extrait (ex: "SaaS")
- [ ] `metadata.parties` contient 2+ parties
- [ ] `metadata.pricing.model === "subscription"`
- [ ] `metadata.pricing.amount` contient le montant correct
- [ ] `metadata.terms.duration` extrait (ex: "12 months")
- [ ] `metadata.clauses` contient 3+ clauses
- [ ] Clauses SLA détectée avec "99.9%"
- [ ] Disclaimer exclu (`excludedSections`)
- [ ] Table of contents exclue
- [ ] 5+ sections indexables

### ✅ Appel d'offres (RFP)

- [ ] `documentType === "rfp"`
- [ ] `confidence >= 0.9`
- [ ] `metadata.issuer` identifié
- [ ] `metadata.deadline` extrait avec date correcte
- [ ] `metadata.budget.min` et `.max` extraits
- [ ] `metadata.requirements` contient 5+ exigences
- [ ] `metadata.evaluationCriteria` contient critères
- [ ] `metadata.scope` décrit le projet
- [ ] 3+ sections indexables

### ✅ Rapport concurrentiel

- [ ] `documentType === "competitive_report"`
- [ ] `confidence >= 0.85`
- [ ] `metadata.competitors` contient 3+ concurrents
- [ ] `metadata.dateRange` identifiée (ex: "Q4 2024")
- [ ] `metadata.strategicThemes` contient 2+ thèmes
- [ ] `metadata.hiringData.companies` contient 2+ entreprises
- [ ] `metadata.hiringData.positions` contient 3+ postes
- [ ] **SIGNAUX:** 3+ signaux détectés
- [ ] Signal "price_change" avec severity="high"
- [ ] Signal "hiring_spike" avec severity="high"
- [ ] Signal "new_product" détecté
- [ ] Disclaimer exclu
- [ ] Executive Summary indexé avec score >= 8

### ✅ Rapport financier

- [ ] `documentType === "financial_report"`
- [ ] `confidence >= 0.9`
- [ ] `metadata.fiscalPeriod` identifiée (ex: "Q3 2024")
- [ ] `metadata.revenue.current` extrait
- [ ] `metadata.growthMetrics` contient 3+ métriques
- [ ] Métriques incluent "Revenue" ou "ARR"
- [ ] 4+ sections indexables

---

## 🐛 Debugging

### Problème: Analyse prend trop de temps (>60s)

**Causes possibles:**
- Document très long (>50 pages)
- Rate limiting API Anthropic

**Solutions:**
```typescript
// Réduire le budget de thinking (intelligent-preprocessor.ts)
thinking: {
  type: "enabled",
  budget_tokens: 1500, // Au lieu de 3000
}

// Ou limiter la longueur du texte analysé
const rawText = fullText.substring(0, 50000); // Premier 50k chars
```

### Problème: Métadonnées manquantes

**Cause:** Le prompt n'est pas assez clair ou le document est ambigu

**Solution:** Ajuster le prompt dans `buildAnalysisPrompt()`:
```typescript
// Ajouter des exemples dans le prompt
EXEMPLE DE PRICING À EXTRAIRE:
- "Monthly fee: $999" → { model: "subscription", amount: "$999", currency: "USD" }
- "Per user per month: £50" → { model: "per_user", amount: "£50", currency: "GBP" }
```

### Problème: Mauvais type de document détecté

**Cause:** Document hybride ou titre trompeur

**Solution 1:** Ajuster le prompt avec plus de contexte
```typescript
// Ajouter fileName comme hint
const prompt = `
Nom du fichier: ${options?.fileName}
Indice: Si le nom contient "contract", c'est probablement un contrat.
...
`;
```

**Solution 2:** Post-processing manuel
```typescript
// Dans upload/route.ts
if (analysis.documentType === "other" && file.name.includes("contract")) {
  analysis.documentType = "contract";
}
```

### Problème: Signaux non détectés

**Vérifier que:**
1. Le document contient bien l'info (prix, recrutement, etc.)
2. Les règles de détection sont activées (`analysis-config.ts`)
3. Le threshold est approprié (ex: 5+ postes pour hiring_spike)

**Ajuster le seuil:**
```typescript
// analysis-config.ts
{
  id: "hiring_spike",
  triggers: [{ type: "hiring_spike", threshold: 3 }], // Au lieu de 5
}
```

---

## 💰 Coûts estimés

### Claude Sonnet 4 (Thinking)

| Document | Input tokens | Thinking | Output | Coût |
|----------|--------------|----------|--------|------|
| Contrat (5 pages) | ~3,000 | ~2,000 | ~2,500 | ~$0.10 |
| RFP (15 pages) | ~8,000 | ~2,500 | ~3,000 | ~$0.15 |
| Rapport (20 pages) | ~10,000 | ~3,000 | ~3,500 | ~$0.18 |
| Rapport financier | ~6,000 | ~2,000 | ~2,000 | ~$0.12 |

**Pricing Claude Sonnet 4:**
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

### Tests complets

```bash
# Script end-to-end (4 documents)
~$0.50

# Tests unitaires Vitest (4 documents)
~$0.50

# Upload manuel (1 document)
~$0.10-0.20
```

---

## 📝 Ajouter vos propres tests

### 1. Créer un nouveau document de test

```typescript
// src/lib/rag/__tests__/test-documents.ts

export const MOCK_DOCUMENTS = {
  // ... existants

  my_industry_report: `
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    INDUSTRIE PHARMACEUTIQUE - Q4 2024
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Le marché pharmaceutique mondial a atteint $1.5T en 2024,
    avec une croissance de 6.5% YoY.

    Principaux acteurs:
    - Pfizer: $50B revenue (+8%)
    - Roche: $45B revenue (+5%)
    - Novartis: $42B revenue (+7%)

    Tendances:
    - Médecine personnalisée
    - Thérapies géniques
    - IA dans découverte de médicaments
  `,
};

export const EXPECTED_RESULTS = {
  // ... existants

  my_industry_report: {
    documentType: "market_analysis",
    confidence_min: 0.85,
    metadata: {
      industry: "Pharmaceutical",
      competitors_count_min: 3,
      strategicThemes_count_min: 2,
    },
  },
};
```

### 2. Ajouter un test unitaire

```typescript
// src/lib/rag/__tests__/intelligent-preprocessor.test.ts

describe("Industry Report Analysis", () => {
  it("should analyze pharmaceutical industry report", async () => {
    const analysis = await analyzeDocument(
      MOCK_DOCUMENTS.my_industry_report,
      TEST_COMPANY_ID
    );

    const expected = EXPECTED_RESULTS.my_industry_report;

    expect(analysis.documentType).toBe(expected.documentType);
    expect(analysis.metadata.competitors?.length).toBeGreaterThanOrEqual(3);
  });
});
```

### 3. Ajouter au script end-to-end

```typescript
// scripts/test-intelligent-analysis.ts

async function testIndustryReport() {
  logSection("TEST 5: Industry Report");

  const analysis = await analyzeDocument(
    MOCK_DOCUMENTS.my_industry_report,
    "test-company"
  );

  assert(analysis.documentType === "market_analysis", "Type correct");
  // ... autres assertions
}

// Dans main()
async function main() {
  await testContract();
  await testRFP();
  await testCompetitiveReport();
  await testFinancialReport();
  await testIndustryReport(); // ← NOUVEAU
}
```

---

## 🎯 Résumé

| Méthode | Temps | Coût | Complexité | Recommandé pour |
|---------|-------|------|------------|-----------------|
| **Script end-to-end** | 2 min | $0.50 | ⭐ | Validation rapide |
| **Tests unitaires** | 3 min | $0.50 | ⭐⭐ | Développement |
| **Upload manuel** | 5 min | $0.10-0.20 | ⭐⭐⭐ | Tests réalistes |

### Workflow recommandé

1. **Développement:**
   ```bash
   # Lancer les tests unitaires en watch mode
   npm run test:intelligent -- --watch
   ```

2. **Validation avant commit:**
   ```bash
   # Script end-to-end complet
   npx tsx scripts/test-intelligent-analysis.ts
   ```

3. **Production:**
   ```bash
   # Upload de vrais documents via UI
   # Monitoring des logs serveur
   ```

---

**Dernière mise à jour:** 2025-11-02
**Auteurs:** Claude Code + Jonathan Gaudette
**Support:** Voir `INTELLIGENT_ANALYSIS_SYSTEM.md` pour documentation complète
