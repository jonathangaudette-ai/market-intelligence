# Testing Guide - Module RFP

Ce document décrit les scripts de test disponibles pour valider l'infrastructure du Module RFP.

---

## 🧪 Scripts de test

Tous les scripts de test sont dans le dossier `scripts/` à la racine du projet.

### Test complet (recommandé)

```bash
npx tsx scripts/test-rfp-infrastructure.ts
```

**Ce que ça teste:**
- ✅ Connexion à la base de données Neon
- ✅ Présence des 7 tables RFP
- ✅ API Claude Sonnet 4.5
- ✅ API OpenAI Embeddings
- ✅ Connexion Pinecone avec namespace `rfp-library`

**Output attendu:**
```
🎉 ALL TESTS PASSED!
✅ RFP Module infrastructure is ready
```

---

### Tests individuels

#### 1. Test des APIs AI

```bash
npx tsx scripts/test-rfp-ai.ts
```

Teste:
- Claude Sonnet 4.5 (génération de réponses)
- OpenAI Embeddings (text-embedding-3-small)

#### 2. Test Pinecone

```bash
npx tsx scripts/test-rfp-pinecone.ts
```

Teste:
- Connexion à l'index `market-intelligence-prod`
- Accès au namespace `rfp-library`

#### 3. Lister les index Pinecone

```bash
npx tsx scripts/list-pinecone-indexes.ts
```

Affiche tous les index Pinecone disponibles dans le compte.

---

## 📋 Prérequis

### Variables d'environnement

Assurez-vous que `.env.local` contient:

```bash
# Database
DATABASE_URL="postgresql://..."

# AI APIs
ANTHROPIC_API_KEY="sk-ant-api03-..."
OPENAI_API_KEY="sk-proj-..."

# Vector Database
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX="market-intelligence-prod"

# Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Auth
AUTH_SECRET="..."
AUTH_TRUST_HOST="true"
```

### Récupérer les variables depuis Vercel

Si vous n'avez pas encore le fichier `.env.local`:

```bash
npx vercel link
npx vercel env pull .env.local --yes
```

Puis ajoutez manuellement:
```bash
PINECONE_INDEX="market-intelligence-prod"
```

---

## 🗄️ Base de données

### Tables RFP créées

Les tables suivantes doivent exister dans Neon:

1. **rfps** - RFPs principaux
2. **rfp_questions** - Questions extraites
3. **rfp_responses** - Réponses générées
4. **rfp_sections** - Sections de documents
5. **rfp_comments** - Commentaires de collaboration
6. **rfp_exports** - Historique d'exports
7. **rfp_analytics_events** - Événements d'analytics

### Vérifier les tables manuellement

```bash
DATABASE_URL="..." npx tsx scripts/migrate-rfp-schema.ts
```

---

## 🔗 Pinecone

### Index utilisé

- **Nom:** `market-intelligence-prod`
- **Dimension:** 1536 (text-embedding-3-small)
- **Metric:** cosine
- **Namespace RFP:** `rfp-library`

### Structure des namespaces

```
market-intelligence-prod/
├── rfp-library/              # Documents RFP (company info, past RFPs, etc.)
├── rfp-context-{rfpId}/      # Contexte spécifique par RFP (optionnel)
└── [autres namespaces...]    # Autres modules de la plateforme
```

---

## 🤖 APIs AI

### Claude Sonnet 4.5

**Utilisé pour:**
- Génération de réponses RFP
- Catégorisation de questions
- Positionnement compétitif
- Analyse de contenu

**Modèle:** `claude-sonnet-4-5-20250929`

### OpenAI

**Utilisé pour:**
- Génération d'embeddings (text-embedding-3-small)
- Recherche sémantique dans Pinecone

**Modèle:** `text-embedding-3-small` (1536 dimensions)

---

## 🐛 Troubleshooting

### Erreur: "ANTHROPIC_API_KEY is not set"

**Solution:** Les scripts tsx ne chargent pas automatiquement `.env.local`. Vérifiez que le script contient:

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
```

### Erreur: "PineconeNotFoundError: market-intelligence"

**Solution:** L'index s'appelle `market-intelligence-prod`, pas `market-intelligence`. Vérifiez `PINECONE_INDEX` dans `.env.local`:

```bash
PINECONE_INDEX="market-intelligence-prod"
```

### Erreur: "Client network socket disconnected"

**Solution:** La chaîne de connexion Neon contient `channel_binding=require`. Supprimez-le dans le script:

```typescript
const dbUrl = process.env.DATABASE_URL!.replace('&channel_binding=require', '');
```

### Tables RFP manquantes

**Solution:** Exécutez la migration:

```bash
DATABASE_URL="..." npx tsx scripts/migrate-rfp-schema.ts
```

---

## ✅ Checklist avant développement

Avant de commencer le Sprint 1, vérifiez:

- [ ] Toutes les variables d'environnement sont configurées
- [ ] `npx tsx scripts/test-rfp-infrastructure.ts` passe tous les tests
- [ ] Le serveur dev démarre sans erreur (`npm run dev`)
- [ ] Les 7 tables RFP existent dans Neon
- [ ] Pinecone index `market-intelligence-prod` est accessible
- [ ] Claude API répond correctement
- [ ] OpenAI Embeddings fonctionne

---

## 📚 Documentation

- [SPRINT0_STATUS.md](./SPRINT0_STATUS.md) - État du Sprint 0
- [TODO.md](./TODO.md) - Liste complète des tâches
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Guide de développement
- [architecture.md](./architecture.md) - Architecture technique

---

**Dernière mise à jour:** 2025-11-10
