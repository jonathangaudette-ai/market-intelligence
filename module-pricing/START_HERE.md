# 🚀 Module Pricing Intelligence - Guide de Démarrage

**Date de création:** 19 novembre 2025
**Status:** ✅ Plan complet - Prêt pour développement

---

## 📋 Ce qui a été Préparé

Vous disposez maintenant d'un **plan de développement complet** pour le module Competitive Pricing Intelligence:

### Documents Créés

```
module-pricing/
├── START_HERE.md                       ← Vous êtes ici
├── DEVELOPMENT_PLAN.md                 ← Plan général (à lire en premier)
├── design-system-guidelines.md         ← Guide UX/UI complet (87 composants)
├── plan-initial-pricing.md             ← Spécifications fonctionnelles v1.1
├── schema-pricing-drizzle.ts           ← Schéma DB (9 tables)
└── phases/                             ← 10 phases détaillées
    ├── phase-0-setup.md                   (1-2h, ⭐ Facile)
    ├── phase-1-database.md                (2-3h, ⭐⭐ Moyenne)
    ├── phase-2-dashboard.md               (4-6h, ⭐⭐ Moyenne) - Quick Win!
    ├── phase-3-api-layer.md               (3-4h, ⭐⭐⭐ Complexe)
    ├── phase-4-upload-catalogue.md        (4-5h, ⭐⭐⭐ Complexe)
    ├── phase-5-config-concurrents.md      (3-4h, ⭐⭐ Moyenne)
    ├── phase-6-scraping-engine.md         (6-8h, ⭐⭐⭐⭐ Très complexe)
    ├── phase-7-matching-ai.md             (5-6h, ⭐⭐⭐⭐ Très complexe)
    ├── phase-8-historique.md              (4-5h, ⭐⭐⭐ Complexe)
    ├── phase-9-alertes.md                 (4-5h, ⭐⭐⭐ Complexe)
    └── phase-10-polish.md                 (3-4h, ⭐⭐ Moyenne)
```

**Total:** 35-50 heures de développement estimées

---

## 🎯 Votre Objectif

Développer un module d'intelligence de prix qui:

1. **Surveille automatiquement** les prix de 13 concurrents (Swish, Grainger, VTO, Uline, etc.)
2. **Matche vos 576 produits** avec les produits concurrents via GPT-5
3. **Alerte en temps réel** sur les variations de prix significatives (>10%)
4. **Visualise l'évolution** des prix sur 30/60/90 jours
5. **Génère des insights** pour optimiser votre pricing

---

## 🚦 Comment Démarrer

### Option 1: Développement Complet (Recommandé)

**Étape 1:** Lire le plan général
```bash
# Ouvrir et lire attentivement
open module-pricing/DEVELOPMENT_PLAN.md
```

**Étape 2:** Commencer Phase 0 (Setup)

**Prompt pour Claude Code:**

```markdown
Bonjour Claude,

Je démarre le développement du module Pricing Intelligence.

**Tâche:**
1. Lis `module-pricing/phases/phase-0-setup.md`
2. Exécute toutes les tâches de cette phase
3. Valide les critères de succès
4. Génère le fichier handoff JSON pour Phase 1

**Documents de référence:**
- `module-pricing/DEVELOPMENT_PLAN.md` (plan général)
- `module-pricing/design-system-guidelines.md` (pour UI)
- `CLAUDE.md` (config AI models GPT-5, Claude Sonnet 4.5)

Commence dès que tu as tout lu.
```

**Étape 3:** Continuer avec Phase 1, 2, etc.

Pour chaque nouvelle phase, utilisez ce prompt:

```markdown
Bonjour Claude,

Je continue le développement du module Pricing - Phase X.

**Contexte:**
- Phases 0 à X-1 complétées avec succès
- État actuel: Lis `module-pricing/handoffs/phase-[X-1]-handoff.json`

**Tâche:**
- Lis `module-pricing/phases/phase-X-[nom].md`
- Exécute toutes les tâches
- Valide les critères de succès
- Génère le handoff pour Phase X+1

Commence dès que prêt.
```

---

### Option 2: Développement Rapide (MVP Minimal)

Si vous voulez un MVP rapidement (10-15h):

**Phases essentielles:**
1. Phase 0 (Setup) - 1h
2. Phase 1 (Database) - 2h
3. Phase 2 (Dashboard Mock) - 4h ← **Quick Win visible**
4. Phase 3 (API Real Data) - 3h
5. Phase 4 (Upload Catalogue) - 4h

**Skip pour MVP v1:**
- Phase 6-7 (Scraping + Matching) - Utiliser données manuelles temporairement
- Phase 8 (Historique) - Ajouter plus tard
- Phase 9 (Alertes) - Ajouter plus tard
- Phase 10 (Polish) - Faire après feedback beta

**Prompt MVP Rapide:**

```markdown
Bonjour Claude,

Je veux développer un MVP minimal du module Pricing (Phases 0-4 uniquement).

**Objectif MVP:**
- Dashboard fonctionnel avec vraies données
- Upload catalogue CSV
- Affichage basique des KPI

**Tâche:**
1. Lis `module-pricing/DEVELOPMENT_PLAN.md` (section MVP Minimal)
2. Exécute Phases 0, 1, 2, 3, 4 séquentiellement
3. Skip phases 6-10 pour l'instant

Documents de référence:
- `module-pricing/design-system-guidelines.md`
- `module-pricing/schema-pricing-drizzle.ts`

Commence par Phase 0.
```

---

## 📊 Milestones & Résultats Attendus

### Après Phase 2 (Dashboard MVP - 7h)
✅ **Vous verrez:**
- Dashboard pricing accessible à `/companies/dissan/pricing`
- 6 KPI cards (produits, prix moyen, concurrents, alertes)
- Chart Recharts avec évolution prix (données mock)
- 3 alertes exemple dans sidebar
- Design system 100% respecté (teal-600, Lucide icons, pas d'emojis)

**Screenshot attendu:**
```
┌─────────────────────────────────────────────────────────┐
│ Centre de Prix Concurrentiels    [Badge: Opérationnel] │
├─────────────────────────────────────────────────────────┤
│ [576 produits] [-12.4% gap] [+8.2% avantage]           │
│ [13 concurrents] [23 alertes] [18.5% couverture]       │
├─────────────────────────────────────────────────────────┤
│ [Chart Recharts 30 jours]      │ [Alertes sidebar]     │
│ Ligne vos prix (teal)           │ ⚠️ Swish -15% (12)   │
│ Ligne Swish (blue)              │ ⚠️ ATL-2024 +23%     │
│ Ligne Grainger (purple)         │ ✅ 45 sans equiv.    │
│ Ligne VTO (orange)              │                       │
└─────────────────────────────────────────────────────────┘
```

---

### Après Phase 4 (Upload + Real Data - 16h)
✅ **Vous pourrez:**
- Uploader votre catalogue CSV (576 produits Dissan)
- Voir vos vraies données dans le dashboard
- Les KPI afficheront les vrais chiffres de la DB
- Template CSV téléchargeable pour faciliter import

---

### Après Phase 7 (Matching AI - 35h)
✅ **Vous aurez:**
- GPT-5 qui matche automatiquement vos produits vs Swish/Grainger
- 47+ matches identifiés avec confiance >= 70%
- Page `/pricing/matches` affichant:
  - Votre produit | Produit concurrent | Écart prix
  - Score confiance GPT-5 (70-100%)
  - Lien vers fiche concurrent

---

### Après Phase 10 (Complet - 50h)
✅ **Module production-ready:**
- Dashboard avec données réelles
- Scraping automatique (cron quotidien)
- Matching AI GPT-5
- Historique 30 jours
- Alertes automatiques (cron 6h)
- Tests unitaires + E2E
- Documentation utilisateur
- Checklist production 95%+ complétée

---

## 🛠️ Pré-requis Techniques

### Variables d'Environnement Requises

```bash
# .env.local
DATABASE_URL="postgresql://..."           # PostgreSQL DB
OPENAI_API_KEY="sk-..."                  # Pour GPT-5 matching
ANTHROPIC_API_KEY="sk-ant-..."           # Pour Claude Sonnet 4.5 (optionnel)
CRON_SECRET="random_secret_string"       # Pour Vercel crons
```

### Dépendances à Installer

Seront installées automatiquement durant les phases:
- Phase 0: Aucune (utilise dépendances existantes)
- Phase 4: `xlsx`, `papaparse` (upload CSV/Excel)
- Phase 6: Dépendances scraping (déjà présentes dans `/Dissan/price-scraper`)
- Phase 10: `vitest`, `@playwright/test` (tests)

---

## ⚠️ Points d'Attention

### 1. Coûts AI à Surveiller

**GPT-5 Matching (Phase 7):**
- ~$0.05 par batch de 10 produits
- Pour 576 produits: ~$2.88 par scan complet
- Recommandation: Limiter à 1 scan/jour en prod

**Mitigation:**
- Cache les matches (table `pricing_matches`)
- Re-match uniquement si nouveau produit détecté
- Utiliser Claude Haiku 4.5 pour pre-filtering (70% moins cher)

### 2. Scraping Légalité

**Phase 6** implique du web scraping. Vérifiez:
- ✅ Robots.txt des concurrents
- ✅ Terms of Service
- ✅ Rate limiting (max 1 req/10s)
- ✅ User-Agent headers

**Alternative si bloqué:**
- Utiliser APIs officielles (si disponibles)
- Utiliser services tiers (Apify, Firecrawl)
- Scraping manuel + upload CSV temporaire

### 3. Performance DB

**Si >10,000 produits:**
- Phase 8 crée des index de performance
- Considérer partitionnement table `pricing_history` par date
- Archiver données >90 jours

---

## 📚 Documentation de Référence

### Design & UI
- [design-system-guidelines.md](design-system-guidelines.md) - **IMPORTANT:** 87 composants documentés, règles strictes (pas d'emojis, Lucide icons, teal-600)

### Spécifications
- [plan-initial-pricing.md](plan-initial-pricing.md) - Specs fonctionnelles v1.1 (alignées architecture)

### AI Models
- [CLAUDE.md](../CLAUDE.md) - Configuration GPT-5, Claude Sonnet 4.5, Claude Haiku 4.5

### Base de Données
- [schema-pricing-drizzle.ts](schema-pricing-drizzle.ts) - Schéma complet 9 tables

---

## 🎯 Checklist Avant de Commencer

Avant de lancer Phase 0, vérifiez:

- [ ] PostgreSQL accessible (DATABASE_URL fonctionne)
- [ ] OpenAI API key valide (test avec `curl`)
- [ ] Node.js >= 18 installé
- [ ] Git repository initialisé
- [ ] `npm install` exécuté sans erreur
- [ ] `npm run dev` démarre le serveur
- [ ] Accès à `/companies/dissan` (page existante)
- [ ] Lu `DEVELOPMENT_PLAN.md` en entier
- [ ] Lu `design-system-guidelines.md` (au moins sections 1-3)

**Commande de validation:**

```bash
# Valider environnement
node --version        # >= 18
npm --version         # >= 9
psql $DATABASE_URL -c "SELECT 1;"  # DB accessible
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq  # API key OK
```

---

## 🚀 Prêt à Démarrer?

### Next Steps Recommandés

1. ✅ **Lire DEVELOPMENT_PLAN.md** (10 min)
2. ✅ **Valider checklist ci-dessus** (5 min)
3. ✅ **Lancer Phase 0** avec le prompt fourni (1h)
4. ✅ **Committer après chaque phase**
   ```bash
   git add .
   git commit -m "feat(pricing): complete Phase X - [nom]"
   ```

### Prompt de Démarrage Final

```markdown
Bonjour Claude,

Je suis prêt à développer le module Pricing Intelligence.

**État actuel:**
- ✅ Environnement validé (DB, API keys, Node.js)
- ✅ Plan complet lu et compris
- ✅ Design system guidelines lu

**Tâche:**
Commence Phase 0 (Setup & Foundation).

1. Lis `module-pricing/phases/phase-0-setup.md`
2. Exécute toutes les tâches
3. Valide avec les commandes de test
4. Génère `module-pricing/handoffs/phase-0-handoff.json`

**Documents de référence:**
- `module-pricing/design-system-guidelines.md`
- `module-pricing/schema-pricing-drizzle.ts`
- `CLAUDE.md`

Go! 🚀
```

---

## 📞 Support

**Questions durant développement:**
- Consulter section "Troubleshooting" dans chaque document de phase
- Relire `design-system-guidelines.md` si problème UI
- Vérifier `plan-initial-pricing.md` si ambiguïté specs

**Entre les phases:**
- Valider handoff JSON généré
- Tester en local (`npm run dev`)
- Committer avant de continuer

**Besoin de clarification:**
- Demander directement à Claude dans la conversation
- Référencer les numéros de ligne des documents

---

**Bonne chance! Le plan est solide, il ne reste qu'à exécuter. 💪**

**Temps estimé total:** 35-50 heures
**Première milestone visible:** 7 heures (Phase 2 Dashboard)
**MVP utilisable:** 16 heures (Phase 4 Upload)
**Module complet:** 50 heures (Phase 10)

**Let's build! 🚀**
