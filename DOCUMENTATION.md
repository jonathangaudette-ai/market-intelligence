# Documentation Complète - Plateforme Market Intelligence

**Version:** 1.0
**Date:** Novembre 2025
**Statut:** Production-Ready

---

## 📚 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Documentation par rôle](#documentation-par-rôle)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Guides détaillés](#guides-détaillés)
6. [Référence API](#référence-api)
7. [Support et maintenance](#support-et-maintenance)

---

## Vue d'ensemble

**Market Intelligence Platform** est une plateforme SaaS complète d'intelligence concurrentielle alimentée par l'IA, spécialement conçue pour automatiser et optimiser la gestion des RFPs (Requests for Proposal) et fournir des insights stratégiques en temps réel.

### 🎯 Cas d'usage principaux

1. **Gestion intelligente de RFPs**
   - Import et parsing automatique de documents RFP (PDF, DOCX, XLSX)
   - Extraction automatique de questions avec GPT-5
   - Génération de réponses intelligentes avec RAG (Claude Sonnet 4.5)
   - Enrichissement contextuel avec données historiques
   - Export vers Word/Excel pour finalisation

2. **Intelligence Concurrentielle**
   - Chat conversationnel avec votre base de connaissances
   - Analyse automatique de documents concurrents
   - Veille concurrentielle organisée par compétiteur
   - Insights et intelligence briefs automatisés

3. **Knowledge Base Multi-Tenant**
   - Bibliothèque centralisée de documents
   - Recherche vectorielle avec Pinecone
   - Isolation totale des données par organisation
   - Partage sécurisé de connaissances

### 🏆 Différenciateurs clés

- ✅ **Architecture Multi-Tenant Slug-Based** - Isolation robuste sans cookies
- ✅ **IA de Pointe** - GPT-5, Claude Sonnet 4.5, Claude Haiku 4.5
- ✅ **RAG Dual-Engine** - Recherche hybride (vectorielle + filtres métadonnées)
- ✅ **Parsing Intelligent** - Extraction automatique de questions RFP
- ✅ **Génération en Bulk** - Génération massive de réponses en streaming
- ✅ **Intelligence Briefs** - Analyses automatiques et insights stratégiques
- ✅ **Export Professionnel** - Word/Excel avec formatting préservé
- ✅ **Évolutivité** - Architecture serverless-ready

### 📊 Statistiques clés

- **Technologies**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Base de données**: PostgreSQL (Drizzle ORM), Pinecone (vecteurs)
- **IA**: OpenAI GPT-5, Anthropic Claude Sonnet 4.5 / Haiku 4.5
- **Authentification**: NextAuth v5 avec JWT
- **Composants UI**: shadcn/ui (35+ composants)
- **Lignes de code**: ~25,000+ (TypeScript/TSX)
- **Tests**: Vitest avec coverage

---

## Documentation par rôle

### 👥 Pour les utilisateurs finaux

**Objectif**: Utiliser la plateforme pour gérer vos RFPs et accéder à l'intelligence concurrentielle

📖 **[Guide Utilisateur Complet](./docs/communication/GUIDE_UTILISATEUR.md)**

**Sujets couverts:**
- Première connexion et navigation
- Gestion des RFPs (import, enrichissement, export)
- Utilisation du chat intelligent
- Gestion de la knowledge base
- Gestion des concurrents
- Bonnes pratiques

**Temps de lecture**: 30 minutes
**Niveau**: Débutant

---

### 💻 Pour les développeurs

**Objectif**: Comprendre l'architecture, modifier le code, ajouter des fonctionnalités

📖 **[Guide Développeur Complet](./docs/communication/GUIDE_DEVELOPPEUR.md)**

**Sujets couverts:**
- Setup de l'environnement de développement
- Architecture technique détaillée
- Structure du code et conventions
- API interne et services
- Guide de contribution
- Tests et débogage

**Temps de lecture**: 1-2 heures
**Niveau**: Intermédiaire à Avancé

---

### 🏗️ Pour les architectes/DevOps

**Objectif**: Comprendre l'architecture système, déployer et maintenir la plateforme

📖 **[Documentation Architecture](./docs/communication/ARCHITECTURE.md)**

**Sujets couverts:**
- Architecture globale du système
- Architecture multi-tenant
- Architecture RAG dual-engine
- Flux de données
- Sécurité et isolation
- Scalabilité et performance
- Déploiement et infrastructure

**Temps de lecture**: 1 heure
**Niveau**: Avancé

---

### 🔌 Pour les intégrateurs API

**Objectif**: Intégrer la plateforme avec d'autres systèmes via API

📖 **[Référence API](./docs/communication/API_REFERENCE.md)**

**Sujets couverts:**
- Authentification
- Endpoints disponibles
- Schémas de données
- Exemples de requêtes
- Gestion des erreurs
- Rate limiting

**Temps de lecture**: 45 minutes
**Niveau**: Intermédiaire

---

## Architecture

### Stack technologique

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                │
│                                                         │
│  React 19 · TypeScript · Tailwind CSS · shadcn/ui      │
│  TipTap Editor · React Hook Form · Zod                 │
└────────────────────┬────────────────────────────────────┘
                     │ API Routes
┌────────────────────▼────────────────────────────────────┐
│                   BACKEND (Next.js API)                 │
│                                                         │
│  NextAuth v5 · Drizzle ORM · API Routes                │
│  RFP Parser · RAG Engine · AI Services                 │
└─────┬──────────────┬──────────────┬─────────────────────┘
      │              │              │
┌─────▼──────┐ ┌─────▼──────┐ ┌────▼─────────────────────┐
│ PostgreSQL │ │  Pinecone  │ │   AI APIs                │
│ (Supabase) │ │  Vectors   │ │   • GPT-5 (OpenAI)       │
│            │ │            │ │   • Claude Sonnet 4.5    │
│ - Users    │ │ - 1536d    │ │   • Claude Haiku 4.5     │
│ - RFPs     │ │ - Cosine   │ │   • text-embedding-3     │
│ - Docs     │ │            │ │                          │
└────────────┘ └────────────┘ └──────────────────────────┘
```

### Modules principaux

| Module | Description | Technologies |
|--------|-------------|--------------|
| **RFP Management** | Parsing, enrichissement, génération | GPT-5, Claude Sonnet 4.5, DOCX/PDF parsers |
| **RAG Engine** | Recherche vectorielle + synthèse | Pinecone, OpenAI Embeddings, Claude |
| **Multi-Tenant** | Isolation par organisation | Slug-based routing, RLS |
| **Authentication** | Gestion utilisateurs et permissions | NextAuth v5, JWT, bcrypt |
| **Knowledge Base** | Bibliothèque documentaire | PostgreSQL, Pinecone |
| **Intelligence** | Chat et insights | RAG dual-engine, Claude |

Pour plus de détails: [Architecture complète](./docs/communication/ARCHITECTURE.md)

---

## Installation

### ⚡ Installation rapide (10 minutes)

```bash
# 1. Clone et installation
npm install

# 2. Configuration environnement
cp .env.example .env
# Éditer .env avec vos clés API

# 3. Setup base de données
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Lancer l'application
npm run dev
```

**Accès:** http://localhost:3010

**Identifiants par défaut:**
- Email: `admin@example.com`
- Password: `password123`

### 📋 Prérequis

- **Node.js** 18+ et npm
- **Comptes/APIs requis:**
  - PostgreSQL (Supabase recommandé - gratuit)
  - Pinecone (plan gratuit disponible)
  - Anthropic API (Claude)
  - OpenAI API (GPT-5 + embeddings)

### 🔧 Configuration détaillée

Voir le [Guide de démarrage rapide (QUICKSTART.md)](./QUICKSTART.md) pour une configuration pas-à-pas complète.

---

## Guides détaillés

### 📖 Documentation utilisateur

- **[Guide Utilisateur](./docs/communication/GUIDE_UTILISATEUR.md)** - Guide complet d'utilisation de la plateforme
- **[FAQ Utilisateurs](./docs/FAQ_UTILISATEURS.md)** *(à venir)* - Questions fréquentes

### 💻 Documentation technique

- **[Guide Développeur](./docs/communication/GUIDE_DEVELOPPEUR.md)** - Guide technique complet
- **[Architecture](./docs/communication/ARCHITECTURE.md)** - Architecture système détaillée
- **[API Reference](./docs/communication/API_REFERENCE.md)** - Documentation API complète

### 🔧 Documentation opérationnelle

- **[Guide de déploiement](./docs/DEPLOYMENT_GUIDE.md)** *(à venir)* - Déploiement production
- **[Monitoring & Observabilité](./docs/MONITORING.md)** *(à venir)* - Métriques et alertes
- **[Sécurité](./docs/SECURITY.md)** *(à venir)* - Bonnes pratiques de sécurité

### 📚 Documentation existante (référence)

Ces documents techniques sont conservés pour référence:

- **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)** - Structure des fichiers du projet
- **[RAG_README.md](./RAG_README.md)** - Documentation technique RAG
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Guide de tests
- **[CLAUDE.md](./CLAUDE.md)** - Instructions pour Claude Code Assistant

---

## Référence API

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/companies/[slug]/rfps` | Upload et parsing RFP |
| `GET` | `/api/companies/[slug]/rfps` | Liste des RFPs |
| `GET` | `/api/companies/[slug]/rfps/[id]` | Détails d'un RFP |
| `POST` | `/api/companies/[slug]/rfps/[id]/enrich` | Enrichir questions |
| `POST` | `/api/companies/[slug]/rfps/[id]/generate` | Générer réponses |
| `POST` | `/api/companies/[slug]/chat` | Chat RAG |
| `POST` | `/api/companies/[slug]/documents/upload` | Upload document |
| `GET` | `/api/companies/[slug]/competitors` | Liste concurrents |

**Documentation complète:** [API Reference](./docs/communication/API_REFERENCE.md)

---

## Support et maintenance

### 🐛 Résolution de problèmes

**Problèmes courants:**

| Problème | Solution |
|----------|----------|
| Erreur de connexion DB | Vérifier `DATABASE_URL` dans `.env` |
| Erreur Pinecone | Vérifier que l'index existe avec dimensions=1536 |
| Erreur API IA | Vérifier clés API et crédits disponibles |
| Upload PDF échoue | Vérifier taille <10MB et format valide |
| Génération lente | Normal pour bulk generation (streaming actif) |

### 📞 Obtenir de l'aide

1. **Documentation** - Consultez cette documentation
2. **Logs** - Vérifiez les logs serveur et browser console
3. **GitHub Issues** - Ouvrez une issue si nécessaire
4. **Tests** - Lancez `npm test` pour diagnostics

### 🔄 Mises à jour

**Vérifier les updates:**
```bash
git pull origin main
npm install
npm run db:migrate
```

**Notes de version:** Voir [CHANGELOG.md](./CHANGELOG.md) *(à venir)*

---

## Roadmap

### ✅ Phase 1: Core Platform (Complétée)

- [x] Architecture multi-tenant slug-based
- [x] Authentification NextAuth v5
- [x] RFP parsing (PDF, DOCX, XLSX)
- [x] RAG engine avec Claude + Pinecone
- [x] Génération bulk de réponses
- [x] Interface utilisateur complète
- [x] Export Word/Excel

### 🚧 Phase 2: Intelligence Avancée (En cours)

- [ ] Intelligence briefs automatisés
- [ ] Analyses prédictives
- [ ] Recommandations automatiques
- [ ] Détection automatique de changements concurrentiels

### 📅 Phase 3: Intégrations (Planifiée)

- [ ] Intégration CRM (Salesforce, HubSpot)
- [ ] Web scraping automatisé (Firecrawl)
- [ ] Veille médias sociaux
- [ ] API publique documentée

### 🚀 Phase 4: Scale (Future)

- [ ] Déploiement multi-région
- [ ] CDN global
- [ ] Analytics avancés
- [ ] Mobile apps (iOS/Android)

---

## Licence et crédits

**Licence:** Propriétaire - Market Intelligence Platform

**Technologies utilisées:**
- Next.js, React, TypeScript
- Anthropic Claude, OpenAI GPT
- Pinecone, PostgreSQL
- shadcn/ui, Tailwind CSS

**Maintenu par:** Équipe Market Intelligence Platform

---

## Liens rapides

- 🏠 [README Principal](./README.md)
- ⚡ [Quick Start](./QUICKSTART.md)
- 👥 [Guide Utilisateur](./docs/communication/GUIDE_UTILISATEUR.md)
- 💻 [Guide Développeur](./docs/communication/GUIDE_DEVELOPPEUR.md)
- 🏗️ [Architecture](./docs/communication/ARCHITECTURE.md)
- 🔌 [API Reference](./docs/communication/API_REFERENCE.md)

---

**Dernière mise à jour:** Novembre 2025
