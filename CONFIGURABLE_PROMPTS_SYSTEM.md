# Système de Gestion de Prompts Configurables

**Status**: ✅ **PRODUCTION READY** (Activé pour Dissan en test)

Ce document décrit le système complet de gestion de prompts configurables implémenté dans l'application Market Intelligence.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Composants](#composants)
4. [Utilisation](#utilisation)
5. [Migration Progressive](#migration-progressive)
6. [Administration](#administration)
7. [Tests](#tests)
8. [Prochaines Étapes](#prochaines-étapes)

---

## Vue d'ensemble

### Problème Résolu

Auparavant, tous les prompts AI étaient **hardcodés** dans le code, ce qui rendait:
- ❌ Impossible de personnaliser les prompts par compagnie
- ❌ Difficile d'itérer et d'améliorer les prompts
- ❌ Pas de versioning ou rollback
- ❌ Pas de A/B testing

### Solution

Un système complet de **gestion de prompts configurables** avec:
- ✅ Prompts stockés en base de données (PostgreSQL)
- ✅ Personnalisation par compagnie
- ✅ Versioning automatique avec historique
- ✅ Feature flags pour rollout progressif
- ✅ Cache LRU en mémoire (500 prompts, 1h TTL)
- ✅ Fallback automatique aux prompts par défaut
- ✅ Template engine Mustache-like (variables, conditions, boucles)
- ✅ Validation à l'exécution (Zod) et à la compilation (TypeScript)

---

## Architecture

### Schéma de la Base de Données

**Table**: `prompt_templates`

```sql
CREATE TABLE prompt_templates (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id),
  prompt_key VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  
  -- Prompt content
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  
  -- AI parameters
  model_id VARCHAR(100),
  temperature NUMERIC(3, 2),
  max_tokens INTEGER,
  
  -- Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  variables JSONB,
  
  -- Versioning
  version INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Audit
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_company_prompt UNIQUE (company_id, prompt_key)
);
```

### Flux de Données

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Feature Flag       │ ◄── Contrôle du rollout
│  shouldUseDatabase()│     (0% → 10% → 50% → 100%)
└──────┬──────────────┘
       │
       ├─────► ❌ Disabled → Legacy hardcoded prompt
       │
       └─────► ✅ Enabled
                 │
                 ▼
           ┌──────────────┐
           │ PromptService│
           └──────┬───────┘
                  │
                  ├─────► 1. Check LRU Cache
                  │         └─► Hit? Return cached
                  │
                  ├─────► 2. Query Database
                  │         └─► Found? Cache & Return
                  │
                  └─────► 3. Fallback to Default
                            └─► Cache & Return
```

---

## Composants

### 1. Types et Schémas (`src/types/prompts.ts`)

**PROMPT_KEYS** - Constantes pour identifier les prompts:
```typescript
export const PROMPT_KEYS = {
  RFP_RESPONSE_MAIN: 'rfp_response_main',
  QUESTION_EXTRACT: 'question_extract',
  QUESTION_CATEGORIZE_SINGLE: 'question_categorize_single',
  // ... 14 prompts au total
} as const;
```

**PROMPT_CATEGORIES** - Catégories de prompts:
```typescript
export const PROMPT_CATEGORIES = {
  RFP_GENERATION: 'rfp_generation',
  QUESTION_ANALYSIS: 'question_analysis',
  DOCUMENT_ANALYSIS: 'document_analysis',
  INTELLIGENCE: 'intelligence',
  CHAT: 'chat',
  ENRICHMENT: 'enrichment',
} as const;
```

**PROMPT_VARIABLE_SCHEMAS** - Validation Zod par prompt:
```typescript
export const PROMPT_VARIABLE_SCHEMAS = {
  [PROMPT_KEYS.RFP_RESPONSE_MAIN]: z.object({
    question: z.string(),
    context: z.string(),
    clientName: z.string().optional(),
    clientIndustry: z.string().optional(),
    additionalInstructions: z.string().optional(),
  }),
  // ...
};
```

### 2. Prompts par Défaut (`src/lib/prompts/defaults.ts`)

**8 prompts configurés** (prêts à l'emploi):

| Priorité | Prompt Key | Modèle | Catégorie | Description |
|----------|-----------|--------|-----------|-------------|
| **P0** | `RFP_RESPONSE_MAIN` | Claude Sonnet 4.5 | RFP Generation | Génération de réponses RFP principales |
| **P0** | `QUESTION_EXTRACT` | GPT-5 | Document Analysis | Extraction de questions des RFPs |
| **P1** | `QUESTION_CATEGORIZE_SINGLE` | Claude Sonnet 4.5 | Question Analysis | Catégorisation de questions |
| **P1** | `QUESTION_CATEGORIZE_BATCH` | Claude Sonnet 4.5 | Question Analysis | Catégorisation en batch |
| **P1** | `HISTORICAL_MATCH_QA` | GPT-5 | Document Analysis | Matching questions-réponses |
| **P1** | `AI_ENRICHMENT` | Claude Haiku 4.5 | Enrichment | Enrichissement contextuel IA |
| **P2** | `COMPETITIVE_POSITIONING` | Claude Sonnet 4.5 | Intelligence | Analyse compétitive |
| **P2** | `HISTORICAL_PARSE_RESPONSE` | GPT-5 | Document Analysis | Parsing de réponses historiques |

### 3. PromptService (`src/lib/prompts/service.ts`)

**API principale** pour récupérer et gérer les prompts:

```typescript
const promptService = getPromptService();

// Récupérer un prompt (avec cache + fallback automatique)
const template = await promptService.getPrompt(companyId, promptKey);

// Rendre avec variables
const rendered = promptService.renderPromptWithVariables(template, {
  question: '...',
  context: '...',
});

// Sauvegarder une nouvelle version
await promptService.savePrompt(companyId, promptKey, data, userId);

// Voir l'historique
const versions = await promptService.getVersions(companyId, promptKey);

// Rollback vers une version
await promptService.restoreVersion(companyId, promptKey, versionId, userId);

// Reset aux defaults
await promptService.resetToDefault(companyId, promptKey);
```

### 4. Template Renderer (`src/lib/prompts/renderer.ts`)

**Syntaxe Mustache-like**:

```typescript
// Variables simples
{{variableName}}

// Conditions
{{#if condition}}
  Texte si vrai
{{/if}}

// Boucles
{{#each array}}
  Item: {{this.property}}
{{/each}}
```

**Exemple**:
```typescript
const template = `
Hello {{clientName}}!

{{#if clientIndustry}}
Industry: {{clientIndustry}}
{{/if}}

Questions:
{{#each questions}}
  {{@index}}. {{this.text}}
{{/each}}
`;

const rendered = renderTemplate(template, {
  clientName: 'Acme Corp',
  clientIndustry: 'Technology',
  questions: [
    { text: 'Question 1' },
    { text: 'Question 2' },
  ],
});
```

### 5. Cache LRU (`src/lib/prompts/cache.ts`)

**Configuration**:
- **Taille max**: 500 prompts
- **TTL**: 1 heure
- **Stratégie**: Least Recently Used (LRU) eviction

**Clé de cache**: `${companyId}:${promptKey}`

### 6. Feature Flags (`src/lib/prompts/feature-flags.ts`)

**Configuration actuelle**:

```typescript
// RFP_RESPONSE_MAIN - ✅ ACTIVÉ pour Dissan
{
  enabled: true,
  useDatabase: true,
  rolloutPercentage: 0,  // 0% général, mais...
  enabledForCompanies: ['frsdw7gue8zoq0znguttl1un'],  // Allowlist Dissan
}
```

**API**:
```typescript
// Vérifier si une compagnie doit utiliser la DB
const useDB = shouldUseDatabase(companyId, promptKey);

// Activer pour une compagnie spécifique
addToAllowlist(PROMPT_KEYS.RFP_RESPONSE_MAIN, companyId);

// Rollout progressif
setRolloutPercentage(PROMPT_KEYS.RFP_RESPONSE_MAIN, 10);  // 10%
setRolloutPercentage(PROMPT_KEYS.RFP_RESPONSE_MAIN, 50);  // 50%
setRolloutPercentage(PROMPT_KEYS.RFP_RESPONSE_MAIN, 100); // 100%

// Rollback global
disablePromptGlobally(PROMPT_KEYS.RFP_RESPONSE_MAIN);
```

### 7. Validation (`src/lib/prompts/validation.ts`)

**Validation complète** avant sauvegarde:

```typescript
const validation = await validatePrompt(template, {
  testData: { ... },
  testWithAI: false,  // Expensive!
});

// Results:
validation.isValid          // true/false
validation.syntaxErrors     // Erreurs de syntaxe
validation.missingVariables // Variables manquantes
validation.qualityScore     // 0-100
validation.suggestions      // Améliorations suggérées
```

---

## Utilisation

### Pour les Développeurs

#### Utiliser un prompt dans le code

**Avant** (hardcodé):
```typescript
const systemPrompt = `You are an expert RFP writer...`;
const userPrompt = `Question: ${question}\nContext: ${context}`;

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});
```

**Après** (configurable):
```typescript
import { getPromptService } from '@/lib/prompts/service';
import { shouldUseDatabase } from '@/lib/prompts/feature-flags';
import { PROMPT_KEYS } from '@/types/prompts';

const useConfigurable = shouldUseDatabase(companyId, PROMPT_KEYS.RFP_RESPONSE_MAIN);

if (useConfigurable) {
  // Nouveau système
  const promptService = getPromptService();
  const template = await promptService.getPrompt(companyId, PROMPT_KEYS.RFP_RESPONSE_MAIN);
  
  const rendered = promptService.renderPromptWithVariables(template, {
    question,
    context,
    clientName,
    clientIndustry,
  });
  
  const response = await anthropic.messages.create({
    model: rendered.model,
    temperature: rendered.temperature,
    max_tokens: rendered.maxTokens,
    system: rendered.system,
    messages: [{ role: 'user', content: rendered.user }],
  });
} else {
  // Ancien système (legacy fallback)
  // ...
}
```

### Pour les Scripts

#### Seeder les prompts pour une compagnie

```bash
npx tsx scripts/seed-prompt-defaults.ts <company-slug>

# Exemples:
npx tsx scripts/seed-prompt-defaults.ts dissan
npx tsx scripts/seed-prompt-defaults.ts acme-corp
```

#### Tester tous les prompts

```bash
npx tsx scripts/test-all-prompts.ts
npx tsx scripts/test-configurable-prompts-e2e.ts
```

---

## Migration Progressive

### Phase 1: Infrastructure ✅ **COMPLÉTÉ**

- ✅ Types TypeScript + Zod validation
- ✅ Database schema (migration 0008)
- ✅ PromptService avec cache
- ✅ Template renderer
- ✅ Feature flags
- ✅ Validation system

### Phase 2: Extraction des Prompts ✅ **COMPLÉTÉ**

- ✅ 8 prompts extraits vers `defaults.ts`
- ✅ Seedés pour 5 compagnies (40 prompts totaux)
- ✅ Tests E2E passent à 100%

### Phase 3: Migration du Code ✅ **EN COURS**

- ✅ **RFP_RESPONSE_MAIN** migré (route.ts:312-334)
- ✅ Feature flag activé pour Dissan (test)
- ⏳ Autres prompts à migrer: 7 restants

### Phase 4: Rollout Progressif ⏳ **PRÊT**

**Stratégie recommandée**:

1. **Semaine 1**: Allowlist seulement (Dissan)
   ```typescript
   enabledForCompanies: ['frsdw7gue8zoq0znguttl1un']
   rolloutPercentage: 0
   ```

2. **Semaine 2**: 10% rollout
   ```typescript
   rolloutPercentage: 10
   ```

3. **Semaine 3**: 50% rollout
   ```typescript
   rolloutPercentage: 50
   ```

4. **Semaine 4**: 100% rollout
   ```typescript
   rolloutPercentage: 100
   ```

5. **Semaine 5**: Retirer le code legacy

---

## Administration

### Modifier un prompt pour une compagnie

**Via Script** (temporaire):
```typescript
import { getPromptService } from './src/lib/prompts/service';
import { PROMPT_KEYS } from './src/types/prompts';

const promptService = getPromptService();

await promptService.savePrompt(
  'frsdw7gue8zoq0znguttl1un',  // companyId
  PROMPT_KEYS.RFP_RESPONSE_MAIN,
  {
    systemPrompt: 'Custom system prompt...',
    userPromptTemplate: 'Custom template with {{variables}}',
    temperature: 0.8,
    maxTokens: 5000,
  },
  'admin-user-id'
);
```

**Via UI** (Phase 4 - À implémenter):
- Settings → Prompts
- Monaco editor avec syntax highlighting
- Preview/Test sandbox
- Version history viewer

### Rollback d'un prompt

```typescript
// Voir les versions
const versions = await promptService.getVersions(companyId, promptKey);

// Restaurer une version précédente
await promptService.restoreVersion(companyId, promptKey, versionId, userId);

// Ou reset complet aux defaults
await promptService.resetToDefault(companyId, promptKey);
```

---

## Tests

### Test E2E complet

```bash
npx tsx scripts/test-configurable-prompts-e2e.ts
```

**Couvre**:
- ✅ Feature flags (allowlist + percentage)
- ✅ Récupération de tous les 8 prompts
- ✅ Template rendering avec variables
- ✅ Performance du cache
- ✅ Isolation multi-tenant

**Résultats actuels**: **100% de réussite** (13/13 tests)

### Test d'un prompt spécifique

```typescript
import { getPromptService } from './src/lib/prompts/service';
import { PROMPT_KEYS } from './src/types/prompts';

const service = getPromptService();
const prompt = await service.getPrompt('companyId', PROMPT_KEYS.RFP_RESPONSE_MAIN);

const rendered = service.renderPromptWithVariables(prompt, {
  question: 'Test question',
  context: 'Test context',
});

console.log('Rendered user prompt:', rendered.user);
```

---

## Prochaines Étapes

### Court terme (1-2 semaines)

1. **Tester en production avec Dissan**
   - Générer 10-20 réponses RFP
   - Valider la qualité vs ancien système
   - Monitorer les métriques (latence, cache hits)

2. **Activer rollout 10%**
   - Monitorer logs et erreurs
   - Comparer A/B les résultats

3. **Migrer les 7 autres prompts**
   - QUESTION_EXTRACT
   - QUESTION_CATEGORIZE_BATCH
   - Etc.

### Moyen terme (1-2 mois)

4. **UI de gestion des prompts**
   - Page Settings → Prompts
   - Liste des prompts avec preview
   - Monaco editor pour édition
   - Test sandbox

5. **Métriques et Monitoring**
   - Dashboard de performance
   - A/B testing metrics
   - Quality scoring

6. **Documentation utilisateur**
   - Guide pour modifier les prompts
   - Best practices
   - Examples templates

### Long terme (2-6 mois)

7. **Features avancées**
   - Prompt suggestions par IA
   - Auto-optimization basée sur feedback
   - Prompt marketplace (templates partagés)

---

## Ressources

### Fichiers Clés

| Fichier | Description |
|---------|-------------|
| `src/types/prompts.ts` | Types, schémas Zod, constantes |
| `src/lib/prompts/defaults.ts` | Prompts par défaut (8 configurés) |
| `src/lib/prompts/service.ts` | Service principal (get, save, render) |
| `src/lib/prompts/cache.ts` | Cache LRU en mémoire |
| `src/lib/prompts/renderer.ts` | Template engine Mustache-like |
| `src/lib/prompts/feature-flags.ts` | Feature flags pour rollout |
| `src/lib/prompts/validation.ts` | Validation des prompts |
| `drizzle/0008_add_prompt_templates.sql` | Migration DB |
| `scripts/seed-prompt-defaults.ts` | Script de seeding |
| `scripts/test-configurable-prompts-e2e.ts` | Tests E2E |

### Commandes Utiles

```bash
# Seeder une compagnie
npx tsx scripts/seed-prompt-defaults.ts <company-slug>

# Tests
npx tsx scripts/test-all-prompts.ts
npx tsx scripts/test-configurable-prompts-e2e.ts

# Migration DB
npm run db:generate
npm run db:migrate

# Compilation
npx tsc --noEmit
```

---

## Support

Pour toute question ou problème:
1. Consulter ce document
2. Vérifier les logs: `[PromptService]` et `[FeatureFlag]`
3. Exécuter les tests E2E
4. Contacter l'équipe engineering

---

**Dernière mise à jour**: 2025-11-17 09:03:57
**Version**: 1.0.0
**Status**: ✅ Production Ready (Test avec Dissan)
