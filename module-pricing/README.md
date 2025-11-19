# Module Pricing - Competitive Pricing Intelligence

> Documentation complète du module de surveillance et analyse des prix concurrentiels pour la plateforme Market Intelligence.

---

## 📋 Vue d'Ensemble

Ce répertoire contient toute la documentation de planification, spécifications, et design du **module Competitive Pricing Intelligence** - une solution intégrée permettant aux entreprises de:

- 🔍 Surveiller automatiquement les prix de 13+ concurrents
- 📊 Analyser les tendances et positionnement concurrentiel
- 🤖 Recevoir des recommandations pricing basées sur l'IA (GPT-5)
- 🔔 Être alerté en temps réel des changements critiques
- 📈 Mesurer l'impact business des décisions pricing

---

## 📂 Structure du Répertoire

```
module-pricing/
├── README.md                          (Ce fichier - Index général)
├── plan-initial-pricing.md            (★ Document principal - Spécifications complètes)
├── revision-architecture-technique.md (✅ Corrections architecture appliquées)
├── design-system-guidelines.md        (🎨 Guidelines UX/UI - Design System officiel)
├── schema-pricing-drizzle.ts          (🗄️ Schéma Drizzle ORM - 9 tables)
└── maquettes/                         (Maquettes visuelles)
    └── prototype-interactive.html     (Prototype HTML/TailwindCSS interactif)
```

---

## 📄 Documents Disponibles

### 🎨 [design-system-guidelines.md](./design-system-guidelines.md) 🆕 IMPORTANT

**Guidelines UX/UI complètes pour le module Pricing** - **À consulter par tous les devs frontend**

Document de référence garantissant la cohérence visuelle avec la plateforme Market Intelligence existante:

- ✅ Palette de couleurs officielle (Teal-600 primaire, **NO EMOJIS**)
- ✅ Composants UI réutilisables (StatCard, PageHeader, Card, Badge, Alert boxes)
- ✅ Patterns de layout standards (grids, spacing, typography)
- ✅ Exemples de code React/TypeScript complets pour chaque vue
- ✅ Configuration Recharts avec couleurs cohérentes
- ✅ Anti-patterns à éviter (emojis dans UI, couleurs custom, etc.)
- ✅ Checklist validation UX/UI avant merge

**Status:** ✅ Approuvé - Référence officielle pour développement
**Usage:** Obligatoire pour tous les développeurs frontend du module Pricing

---

### ✅ [revision-architecture-technique.md](./revision-architecture-technique.md)

**Révision architecture par Architecte Technique** - **Corrections appliquées**

Ce document identifie **7 divergences** entre le plan initial et l'architecture existante:

1. ✅ **Job Queue System** - Pattern polling PostgreSQL (comme RFPs)
2. ✅ **State Management** - React state simple (pas Zustand)
3. ✅ **Type-Safe APIs** - Next.js API Routes + Zod validation
4. ✅ **Database IDs** - CUID2 pattern appliqué partout
5. ✅ **Storage Backend** - Vercel Blob Storage
6. ✅ **Cache Layer** - PostgreSQL cache (MVP)
7. ✅ **Monitoring** - Vercel Analytics

**Impact Budget:** 💰 **Économie de $31.2K/an** ($10.8K vs $42K planifié)
**Impact Timeline:** ⏱️ **Réduction 10-15%** temps développement

**Status:** ✅ Corrections appliquées au plan v1.1

---

### [plan-initial-pricing.md](./plan-initial-pricing.md) ⭐

**Document principal** (✅ **v1.1 - Aligné avec architecture existante**):

1. **Vision & Stratégie**
   - Proposition de valeur
   - User personas (Pricing Manager, Product Manager, CI Director)
   - Positionnement vs concurrents (Prisync, Competera)

2. **Architecture Technique**
   - Intégration dans les 5 layers de la plateforme
   - Flux de données complet
   - Stack technologique (Next.js, PostgreSQL, Playwright, GPT-5)

3. **Maquettes Visuelles (React/TypeScript)**
   - ✅ Dashboard principal avec KPIs (StatCard, LineChart Recharts)
   - ✅ Catalogue de produits (Table, filters, pagination)
   - ✅ Page détail produit avec analyse complète
   - ✅ Analyse concurrentielle (ScatterChart Recharts)

4. **Fonctionnalités par Phase**
   - **Phase 1 MVP** (3 mois): Foundation - Upload, Scraping, Dashboard basique
   - **Phase 2 Intelligence** (3 mois): AI Recommendations, Analytics avancés, Alertes
   - **Phase 3 Automation** (6 mois): Dynamic Pricing, Intégrations ERP/CRM, Mobile

5. **Spécifications Techniques**
   - Schéma base de données complet (9 tables)
   - API endpoints (30+ routes)
   - Intégrations (Battle Hub, Win/Loss, Salesforce, Slack)

6. **Design UX/UI**
   - Design system (couleurs, typographie)
   - Composants React (10 composants clés)
   - User flows détaillés (onboarding, alerte critique)

7. **Métriques de Succès**
   - KPIs Produit (adoption, engagement, qualité données)
   - KPIs Business (ARR, efficiency gains, ROI)
   - KPIs UX (NPS, CSAT, churn)

8. **Roadmap & Timeline**
   - Planning 12 mois (Gantt visuel)
   - Dépendances inter-modules
   - Critères Go/No-Go par phase

9. **Ressources & Budget**
   - Équipe requise (7 rôles, scaling par phase)
   - Budget infrastructure ($42K/an)
   - **Budget total Année 1: $917K**
   - Revenus projetés: $350K An 1, $800K An 2, $1.5M An 3

10. **Risques & Mitigation**
    - Risques techniques (scraping bloqué, performance)
    - Risques produit (faible adoption, complexity)
    - Risques business (compétition, revenus)
    - Plans de contingence détaillés

**Taille:** ~25,000 mots | ~150 KB
**Version:** 1.1 (Révisé)
**Dernière mise à jour:** 19 novembre 2025
**✅ Status:** Mis à jour - Aligné avec architecture existante (sections 5, 9, 10 révisées)

---

### [maquettes/prototype-interactive.html](./maquettes/prototype-interactive.html) 🎨

**Prototype HTML/TailwindCSS interactif** avec données réelles Dissan:
- 4 vues complètes (Dashboard, Catalogue, Détail Produit, Analyse Concurrentielle)
- Graphiques interactifs Chart.js (évolution prix, positionnement)
- Navigation par onglets, hover effects, animations
- Données: 576 produits, 94 matches Swish, KPIs réels
- **Utilisation:** Ouvrir directement dans navigateur (aucune compilation requise)

---

## 🎯 Quick Links - Navigation Rapide

| Section | Lien Direct | Description |
|---------|-------------|-------------|
| Vision Stratégique | [Section 1](./plan-initial-pricing.md#1-vision--stratégie) | Pourquoi ce module? Qui sont les users? |
| Architecture | [Section 2](./plan-initial-pricing.md#2-architecture) | Comment ça s'intègre techniquement? |
| Maquettes UI | [Section 3](./plan-initial-pricing.md#3-maquettes-visuelles) | À quoi ça ressemble visuellement? |
| Features MVP | [Section 4.1](./plan-initial-pricing.md#41-phase-1-mvp-mois-1-3---foundation) | Quoi construire d'abord (3 mois)? |
| Database Schema | [Section 5.2](./plan-initial-pricing.md#52-schéma-base-de-données) | Structure données complète |
| Budget Complet | [Section 9](./plan-initial-pricing.md#9-ressources--budget) | Combien ça coûte? ($917K An 1) |
| Roadmap Visuel | [Section 8.1](./plan-initial-pricing.md#81-timeline-visuel-gantt-style) | Timeline 12 mois (Gantt) |

---

## 🚀 Prochaines Étapes

### ⚠️ URGENT - Révision Architecture (Tous)
1. 🔴 **LIRE EN PRIORITÉ:** [revision-architecture-technique.md](./revision-architecture-technique.md)
2. ✅ Valider corrections proposées (Product Lead + Engineering Lead + DevOps)
3. 📝 Mettre à jour `plan-initial-pricing.md` sections 5, 9, 10
4. 💰 Budget révisé: $10.8K/an infrastructure (vs $42K initial)

### Pour Product Managers:
1. ⚠️ **D'ABORD:** Réviser budget selon nouvelle architecture ($10.8K infra vs $42K)
2. ✅ Lire le plan complet ([plan-initial-pricing.md](./plan-initial-pricing.md))
3. 🎨 Review prototype interactif ([maquettes/prototype-interactive.html](./maquettes/prototype-interactive.html))
4. 📝 Créer backlog Phase 1 dans Linear (user stories P0)
5. 💰 Valider budget révisé avec Finance ($802.8K Année 1 vs $917K)

### Pour Engineering:
1. ⚠️ **CRITIQUE:** Lire [revision-architecture-technique.md](./revision-architecture-technique.md)
2. ✅ Valider pattern polling (vs BullMQ) comme module RFPs
3. ✅ Confirmer CUID2 pattern pour IDs (cohérence DB)
4. 🔍 Spike: Tester Playwright stealth mode (1-2 jours)
5. 🗄️ Setup environnement dev (PostgreSQL seulement, PAS Redis/BullMQ dans MVP)
6. 📊 Créer `src/db/schema-pricing.ts` selon template révisé

### Pour UX/UI Design:
1. ✅ Convertir maquettes ASCII en wireframes Figma
2. 🎨 Définir design system complet (couleurs, composants)
3. 👤 Valider user flows avec 3-5 beta users potentiels
4. 🧪 Créer prototypes interactifs (dashboard, détail produit)

### Pour Sales/Marketing:
1. ✅ Préparer pitch deck module pricing (valeur, ROI, compétition)
2. 📞 Identifier 10-15 beta users potentiels (early adopters)
3. 💵 Définir pricing tiers (Starter, Pro, Enterprise)
4. 📈 Créer sales enablement material (1-pagers, démos)

---

## 📊 Statut Projet

| Phase | Statut | Timeline | Budget | Notes |
|-------|--------|----------|--------|-------|
| **Planning Initial** | ✅ Complété | 19 nov 2025 | — | Plan initial créé |
| **Révision Architecture** | ✅ **COMPLÉTÉ** | 19 nov 2025 | — | Plan mis à jour (v1.1) |
| **Phase 1: MVP** | ⏸️ Attente approbation budget | Mois 1-3 | $108K | Budget révisé: $883K total (vs $917K) |
| **Phase 2: Intelligence** | ⏳ Planifié | Mois 4-6 | $120K | Dépend MVP success |
| **Phase 3: Automation** | ⏳ Planifié | Mois 7-12 | $564K | Enterprise-ready |

**Prochain Milestone:** ✅ Révision architecture complétée
**Puis:** Approbation budget C-level révisé (**$883K** vs $917K initial) (Target: Semaine 1 déc 2025)
**Économies réalisées:** 💰 **-$34.3K (-3.7%)** grâce à réutilisation infrastructure

---

## 🤝 Contributeurs & Ownership

| Rôle | Nom | Responsabilité |
|------|-----|----------------|
| **Product Owner** | À définir | Vision produit, roadmap, priorisation |
| **Tech Lead** | À définir | Architecture, tech decisions, code reviews |
| **UX Lead** | À définir | Design system, user research, wireframes |
| **PM Sponsor** | À définir | Budget approval, stakeholder management |

---

## 📞 Contact & Feedback

**Pour questions sur ce plan:**
- 📧 Email: product@market-intelligence.com
- 💬 Slack: #pricing-module (channel à créer)
- 📅 Meeting: Weekly sync mardis 10:00 AM (à partir de Kickoff)

**Pour contribuer à ce document:**
1. Fork/Branch du repo
2. Éditer [plan-initial-pricing.md](./plan-initial-pricing.md)
3. Pull Request avec description changements
4. Review par Product Owner

---

## 📚 Ressources Additionnelles

### Références Externes
- [Playwright Documentation](https://playwright.dev/docs/intro) - Pour scraping engine
- [BullMQ Guide](https://docs.bullmq.io/) - Pour job queue système
- [Recharts Examples](https://recharts.org/en-US/examples) - Pour data visualizations

### Documents Liés (Plateforme Market Intelligence)
- `specifications-fonctionnelles-plateforme-ci.md` - Specs globales plateforme
- `analyse-fonctionnelle-leaders-marche.md` - Analyse Crayon vs Klue
- `CLAUDE.md` - Configuration projet (models IA, stack tech)

### Inspirations Compétitives
- **Prisync** (https://prisync.com) - E-commerce pricing, simple
- **Competera** (https://competera.net) - Enterprise ML-driven pricing
- **Crayon.co** - CI platform avec pricing insights

---

## 🔄 Changelog

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2025-11-19 | Product Team | Création initiale - Plan complet 25K mots |

---

**Status:** 📝 Draft Initial - Attente Review & Approbation
**Next Review:** Semaine 1 décembre 2025
**Version:** 1.0

---

*Ce document est vivant et sera mis à jour régulièrement au fil du développement du module.*
