# Quick Start Guide

Guide de démarrage rapide pour lancer l'application Market Intelligence en 10 minutes.

## Étape 1: Services Externes (5 minutes)

### A. Créer un compte Supabase (PostgreSQL gratuit)

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un compte
3. Créer un nouveau projet
4. Noter la **Database URL** dans Project Settings → Database → Connection String (URI)

### B. Créer un compte Pinecone (gratuit)

1. Aller sur [pinecone.io](https://www.pinecone.io)
2. Créer un compte
3. Créer un index avec ces paramètres:
   - **Name**: `market-intelligence-prod`
   - **Dimensions**: `1536`
   - **Metric**: `cosine`
   - **Cloud**: AWS ou GCP (région la plus proche)
4. Noter l'**API Key** dans API Keys

### C. Obtenir les clés API

**Anthropic (Claude):**
1. Aller sur [console.anthropic.com](https://console.anthropic.com)
2. Créer une clé API
3. Ajouter des crédits ($5 minimum)

**OpenAI (Embeddings):**
1. Aller sur [platform.openai.com](https://platform.openai.com)
2. Créer une clé API
3. Ajouter des crédits ($5 minimum)

## Étape 2: Installation (2 minutes)

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env

# 3. Éditer .env avec vos clés
nano .env  # ou utilisez votre éditeur préféré
```

**Fichier .env à remplir:**
```env
DATABASE_URL="postgresql://..." # ← Supabase connection string
AUTH_SECRET="..." # ← Générer avec: openssl rand -base64 32
PINECONE_API_KEY="..." # ← Votre clé Pinecone
ANTHROPIC_API_KEY="..." # ← Votre clé Anthropic
OPENAI_API_KEY="..." # ← Votre clé OpenAI
```

## Étape 3: Base de Données (2 minutes)

```bash
# 1. Générer les migrations
npm run db:generate

# 2. Appliquer les migrations
npm run db:migrate

# 3. Créer un utilisateur initial
npm run db:seed
```

Vous devriez voir:
```
🌱 Seeding database...
✅ Created super admin user: admin@example.com
✅ Created demo company: Demo Company
✅ Added user to company as admin

🎉 Seeding complete!

📝 Login credentials:
   Email: admin@example.com
   Password: password123
```

## Étape 4: Lancer l'Application (1 minute)

```bash
npm run dev
```

Ouvrir [http://localhost:3010](http://localhost:3010)

## Test de l'API RAG

Une fois l'application lancée, tester l'API avec curl:

```bash
# 1. Se connecter (obtenir le cookie de session)
curl -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}' \
  -c cookies.txt

# 2. Définir la compagnie active (cookie)
echo "localhost:3010	FALSE	/	FALSE	0	activeCompanyId	demo-company" >> cookies.txt

# 3. Uploader un document PDF (exemple)
curl -X POST http://localhost:3010/api/companies/demo-company/documents/upload \
  -b cookies.txt \
  -F "file=@./test.pdf" \
  -F "competitorId="

# 4. Tester le chat
curl -X POST http://localhost:3010/api/companies/demo-company/chat \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"message": "Résume les informations que tu as"}'
```

## Prochaines Étapes

### Option A: Implémenter les composants UI

La structure backend est complète. Vous pouvez maintenant:

1. Créer les composants shadcn/ui de base
2. Implémenter l'interface de chat (voir `docs/RAG_UI_COMPONENTS.md`)
3. Créer la page d'intelligence
4. Ajouter la gestion des concurrents

### Option B: Tester l'API directement

Utiliser Postman, Insomnia ou curl pour tester toutes les fonctionnalités:

- Upload de PDF
- Chat avec RAG
- Création de concurrents
- Gestion des conversations

### Option C: Ajouter des fonctionnalités avancées

- Scraping web avec Firecrawl
- Intégration LinkedIn via Apify
- Alertes par email
- Dashboard analytics

## Vérification que tout fonctionne

### ✅ Checklist

- [ ] `npm run dev` démarre sans erreurs
- [ ] Page login accessible à http://localhost:3010/login
- [ ] Connexion avec admin@example.com / password123 fonctionne
- [ ] Upload PDF via API retourne status 200
- [ ] Chat API retourne une réponse de Claude
- [ ] Base de données contient les tables (vérifier avec `npm run db:studio`)
- [ ] Pinecone contient des vecteurs (vérifier sur console.pinecone.io)

## Résolution de Problèmes

### Erreur: "DATABASE_URL not set"
→ Vérifier que `.env` existe et contient `DATABASE_URL`

### Erreur: "Pinecone index not found"
→ Vérifier que l'index existe sur console.pinecone.io avec le bon nom

### Erreur: "Authentication failed"
→ Vérifier que `AUTH_SECRET` est défini dans `.env`

### Erreur: "Anthropic API key invalid"
→ Vérifier que la clé est valide et que des crédits sont disponibles

### Erreur lors de db:migrate
→ Vérifier que la connexion à Supabase fonctionne (tester avec Drizzle Studio: `npm run db:studio`)

## Architecture Simplifiée

```
User → Next.js API → RAG Engine → Pinecone (vectors)
                  ↓                    ↓
                  PostgreSQL       Claude Sonnet 4.5
                  (metadata)       (synthesis)
```

**Flux d'un message:**
1. User envoie un message via `/api/companies/[slug]/chat`
2. API vérifie l'authentification (NextAuth)
3. API vérifie que l'utilisateur appartient à la compagnie
4. RAG Engine génère l'embedding du message (OpenAI)
5. RAG Engine cherche dans Pinecone (filtre par `tenant_id`)
6. RAG Engine envoie les chunks à Claude avec le contexte
7. Claude génère une réponse avec citations
8. Réponse sauvegardée dans PostgreSQL
9. Réponse retournée à l'utilisateur

## Coûts Estimés

**Phase de développement (testing):**
- Supabase: Gratuit (plan Free)
- Pinecone: Gratuit jusqu'à 100k vecteurs (~100 documents)
- Anthropic: ~$0.03 par message (Claude Sonnet 4.5)
- OpenAI: ~$0.001 par document embeddings

**Total mensuel pour tester: $0-10/mois**

**Production (100 documents, 1000 messages/mois):**
- Supabase: $25/mois (plan Pro)
- Pinecone: $70/mois (Serverless)
- Anthropic: ~$30/mois
- OpenAI: ~$5/mois

**Total mensuel production: ~$130/mois pour un client**

**Échelle (1000 clients):**
- Supabase: $25/mois (même coût, sharding si nécessaire)
- Pinecone: $70-140/mois (coût par DATA pas par client!)
- Anthropic/OpenAI: Scale linéairement avec l'usage

## Support

Questions? Ouvrir une issue sur GitHub ou consulter la documentation complète dans `/docs`.
