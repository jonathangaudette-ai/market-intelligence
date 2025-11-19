# Plan de Développement Multi-Phases - Module Pricing Intelligence

**Version:** 1.0
**Date:** 19 novembre 2025
**Durée totale estimée:** 35-50 heures de développement actif

---

## ✅ Statut Actuel - Plan Complet Créé

**Toutes les phases sont maintenant documentées et prêtes pour le développement!**

- ✅ **Phase 0** - Setup & Foundation ([phase-0-setup.md](phases/phase-0-setup.md))
- ✅ **Phase 1** - Database Schema & Migrations ([phase-1-database.md](phases/phase-1-database.md))
- ✅ **Phase 2** - Dashboard MVP Mock Data ([phase-2-dashboard.md](phases/phase-2-dashboard.md))
- ✅ **Phase 3** - API Layer & Real Data ([phase-3-api-layer.md](phases/phase-3-api-layer.md))
- ✅ **Phase 4** - Upload Catalogue CSV/Excel ([phase-4-upload-catalogue.md](phases/phase-4-upload-catalogue.md))
- ✅ **Phase 5** - Configuration Concurrents ([phase-5-config-concurrents.md](phases/phase-5-config-concurrents.md))
- ✅ **Phase 6** - Scraping Engine ([phase-6-scraping-engine.md](phases/phase-6-scraping-engine.md))
- ✅ **Phase 7** - Matching AI GPT-5 ([phase-7-matching-ai.md](phases/phase-7-matching-ai.md))
- ✅ **Phase 8** - Historique & Time-Series ([phase-8-historique.md](phases/phase-8-historique.md))
- ✅ **Phase 9** - Alertes & Notifications ([phase-9-alertes.md](phases/phase-9-alertes.md))
- ✅ **Phase 10** - Polish, Tests & Documentation ([phase-10-polish.md](phases/phase-10-polish.md))

**Prochaine étape:** Commencer le développement avec Phase 0!

---

## 📊 Vue d'Ensemble du Plan

Ce plan découpe le développement du module Pricing en **10 phases autonomes**, chacune pouvant être complétée dans une conversation Claude Code distincte.

### Phases de Développement

| Phase | Nom | Durée | Complexité | Validation |
|-------|-----|-------|------------|------------|
| **Phase 0** | Setup & Foundation | 1-2h | ⭐ Facile | Script exécuté avec succès |
| **Phase 1** | Database Schema & Migrations | 2-3h | ⭐⭐ Moyenne | Migrations appliquées, tables créées |
| **Phase 2** | Dashboard MVP (Mock Data) | 4-6h | ⭐⭐ Moyenne | UI complète avec données mock |
| **Phase 3** | API Layer & Data Fetching | 3-4h | ⭐⭐⭐ Complexe | API retourne vraies données DB |
| **Phase 4** | Upload Catalogue Feature | 4-5h | ⭐⭐⭐ Complexe | CSV → DB avec validation |
| **Phase 5** | Configuration Concurrents | 3-4h | ⭐⭐ Moyenne | CRUD concurrents fonctionnel |
| **Phase 6** | Scraping Engine (Basic) | 6-8h | ⭐⭐⭐⭐ Très complexe | 1 site scrapé avec succès |
| **Phase 7** | Matching Engine (AI) | 5-6h | ⭐⭐⭐⭐ Très complexe | Matching GPT-5 fonctionnel |
| **Phase 8** | Historique & Time-Series | 4-5h | ⭐⭐⭐ Complexe | Graphiques historiques OK |
| **Phase 9** | Alertes & Notifications | 4-5h | ⭐⭐⭐ Complexe | Alertes email fonctionnelles |
| **Phase 10** | Polish, Tests & Documentation | 3-4h | ⭐⭐ Moyenne | Tests E2E passent, docs complètes |

**Total estimé:** 35-50 heures de développement actif

---

## 🏗️ Architecture du Plan

### Principes de Découpage

1. **Autonomie**: Chaque phase est indépendante et peut être reprise dans une nouvelle conversation
2. **Validation**: Critères de succès clairs à chaque étape
3. **Incrémental**: Valeur ajoutée dès la phase 2 (dashboard visible)
4. **Contexte**: Documents de handoff pour transférer le contexte entre phases
5. **Rollback**: Possibilité de revenir en arrière si problème

### Structure des Documents

```
module-pricing/
├── DEVELOPMENT_PLAN.md              (Ce fichier - Plan général)
├── phases/
│   ├── phase-0-setup.md             (Setup & Foundation)
│   ├── phase-1-database.md          (Database Schema)
│   ├── phase-2-dashboard.md         (Dashboard MVP)
│   ├── phase-3-api.md               (API Layer)
│   ├── phase-4-upload.md            (Upload Catalogue)
│   ├── phase-5-competitors.md       (Config Concurrents)
│   ├── phase-6-scraping.md          (Scraping Engine)
│   ├── phase-7-matching.md          (Matching AI)
│   ├── phase-8-history.md           (Historique & Charts)
│   ├── phase-9-alerts.md            (Alertes & Notifications)
│   └── phase-10-polish.md           (Polish & Tests)
├── handoffs/
│   ├── phase-0-handoff.json         (État après Phase 0)
│   ├── phase-1-handoff.json         (État après Phase 1)
│   └── ...                          (Un handoff par phase)
└── validation/
    ├── checklist-phase-0.md         (Checklist validation Phase 0)
    ├── checklist-phase-1.md         (Checklist validation Phase 1)
    └── ...                          (Une checklist par phase)
```

---

## 📝 Template de Phase (Structure Standard)

Chaque document de phase suit cette structure:

```markdown
# Phase X: [Nom de la Phase]

## 🎯 Objectif
[Description claire de ce qui sera accompli]

## 📋 Pré-requis
- Phase précédente complétée avec succès
- Fichiers existants requis
- Variables d'environnement nécessaires

## 📚 Documents à Lire (Contexte)
1. [Document 1] - [Raison]
2. [Document 2] - [Raison]
3. ...

## 🛠️ Tâches à Réaliser

### Tâche 1: [Nom]
**Fichier:** `chemin/vers/fichier.ts`
**Action:** [Description précise]
**Code attendu:** [Snippet ou référence]

### Tâche 2: [Nom]
...

## ✅ Critères de Succès
- [ ] Critère 1 vérifiable
- [ ] Critère 2 vérifiable
- [ ] Tests passent
- [ ] Fonctionnel en local

## 🧪 Validation
```bash
# Commandes pour valider la phase
npm run test
npm run dev
# Naviguer vers X et vérifier Y
```

## 📦 Livrables
- Fichier 1 créé/modifié
- Fichier 2 créé/modifié
- Screenshots si UI

## ➡️ Handoff pour Phase Suivante
**État à documenter dans `handoffs/phase-X-handoff.json`:**
```json
{
  "phase": X,
  "completed": "2025-11-XX",
  "filesCreated": ["file1.ts", "file2.ts"],
  "filesModified": ["file3.ts"],
  "dbMigrations": ["001_create_tables.sql"],
  "envVarsAdded": ["VAR1", "VAR2"],
  "nextPhaseReady": true,
  "notes": "Tout fonctionne, ready pour Phase X+1"
}
```

## 🚨 Troubleshooting
**Problème possible 1:** [Description]
**Solution:** [Fix]

**Problème possible 2:** [Description]
**Solution:** [Fix]
```

---

## 🚀 Comment Utiliser ce Plan

### Workflow Multi-Conversations

```
┌─────────────────────────────────────────────────────────────────┐
│ CONVERSATION 1: Phase 0 + Phase 1                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. Ouvrir nouvelle conversation Claude Code                    │
│ 2. Prompt: "Lis module-pricing/phases/phase-0-setup.md et      │
│            commence le développement"                           │
│ 3. Claude exécute Phase 0 → valide → Phase 1 → valide          │
│ 4. Claude génère phase-1-handoff.json                          │
│ 5. Tu valides localement (npm run dev, tests)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CONVERSATION 2: Phase 2 (Dashboard MVP)                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Nouvelle conversation                                        │
│ 2. Prompt: "Lis module-pricing/handoffs/phase-1-handoff.json   │
│            puis module-pricing/phases/phase-2-dashboard.md      │
│            et continue le développement"                        │
│ 3. Claude charge contexte → développe Phase 2 → valide         │
│ 4. Claude génère phase-2-handoff.json                          │
│ 5. Tu valides UI dans le browser                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CONVERSATION 3: Phase 3 (API Layer)                            │
│ ... et ainsi de suite jusqu'à Phase 10                         │
└─────────────────────────────────────────────────────────────────┘
```

### Prompt Type pour Démarrer une Phase

```markdown
# Reprise Développement Module Pricing - Phase X

Bonjour Claude, je continue le développement du module Pricing Intelligence.

**Contexte:**
- Phases 0 à X-1 complétées avec succès
- État actuel: Lis `module-pricing/handoffs/phase-[X-1]-handoff.json`

**Tâche:**
- Lis `module-pricing/phases/phase-X-[nom].md`
- Exécute toutes les tâches de cette phase
- Valide les critères de succès
- Génère le handoff pour Phase X+1

**Documents de référence** (si nécessaire):
- `module-pricing/design-system-guidelines.md` (pour UI)
- `module-pricing/plan-initial-pricing.md` (specs)
- `CLAUDE.md` (config AI models)

Commence dès que tu as lu le handoff et le document de phase.
```

---

## 📈 Progression & Tracking

### Dashboard de Progression

| Phase | Status | Date Début | Date Fin | Notes |
|-------|--------|------------|----------|-------|
| 0. Setup | ⬜ TODO | — | — | Pas commencé |
| 1. Database | ⬜ TODO | — | — | Attend Phase 0 |
| 2. Dashboard MVP | ⬜ TODO | — | — | Attend Phase 1 |
| 3. API Layer | ⬜ TODO | — | — | Attend Phase 2 |
| 4. Upload Catalogue | ⬜ TODO | — | — | Attend Phase 3 |
| 5. Config Concurrents | ⬜ TODO | — | — | Attend Phase 4 |
| 6. Scraping Engine | ⬜ TODO | — | — | Attend Phase 5 |
| 7. Matching AI | ⬜ TODO | — | — | Attend Phase 6 |
| 8. Historique & Charts | ⬜ TODO | — | — | Attend Phase 7 |
| 9. Alertes | ⬜ TODO | — | — | Attend Phase 8 |
| 10. Polish & Tests | ⬜ TODO | — | — | Attend Phase 9 |

**Légende Status:**
- ⬜ TODO - Pas commencé
- 🔄 IN PROGRESS - En cours
- ✅ DONE - Complété et validé
- ⚠️ BLOCKED - Bloqué (problème à résoudre)
- ⏸️ PAUSED - Mis en pause

### Mise à Jour de Progression

Après chaque phase complétée, mettre à jour ce tableau:

```bash
# Exemple après Phase 1 complétée
| 1. Database | ✅ DONE | 2025-11-19 14:00 | 2025-11-19 16:30 | Migrations OK, 9 tables créées |
```

---

## 🎯 Milestones Clés

### Milestone 1: Dashboard Visible (Fin Phase 2)
- **Date cible:** Fin Semaine 1
- **Valeur:** Dashboard pricing accessible avec données mock
- **Demo:** Montrable aux stakeholders pour feedback

### Milestone 2: Données Réelles (Fin Phase 4)
- **Date cible:** Fin Semaine 2
- **Valeur:** Upload CSV fonctionnel, données réelles dans DB
- **Demo:** Import catalogue Dissan (576 produits)

### Milestone 3: Premier Scan Concurrent (Fin Phase 6)
- **Date cible:** Fin Semaine 4
- **Valeur:** Scraping d'un site concurrent (Swish)
- **Demo:** Voir prix concurrents dans le dashboard

### Milestone 4: Matching AI Opérationnel (Fin Phase 7)
- **Date cible:** Fin Semaine 6
- **Valeur:** GPT-5 matche produits automatiquement
- **Demo:** 94 produits Swish matchés avec Dissan

### Milestone 5: MVP Complet (Fin Phase 10)
- **Date cible:** Fin Semaine 10-12
- **Valeur:** Module pricing fonctionnel end-to-end
- **Demo:** Beta users peuvent l'utiliser

---

## 🔄 Stratégie de Rollback

Si une phase échoue ou bloque:

### Option 1: Rollback Git
```bash
# Identifier le commit avant la phase problématique
git log --oneline | grep "Phase X"

# Rollback
git revert <commit-hash>

# Ou reset hard (ATTENTION: perte de travail)
git reset --hard <commit-avant-phase-X>
```

### Option 2: Skip & Pivot
- Marquer phase comme ⚠️ BLOCKED
- Documenter le problème dans `handoffs/phase-X-handoff.json`
- Passer à phase suivante si possible (certaines phases sont indépendantes)
- Revenir au problème plus tard

### Option 3: Simplification
- Réduire le scope de la phase problématique
- Créer une Phase X.1 (version simplifiée)
- Ajouter Phase X.2 (version complète) pour plus tard

---

## 📊 Métriques de Suivi

### Vélocité de Développement
- **Heures estimées:** 35-50h total
- **Heures réelles:** [À remplir au fur et à mesure]
- **Vélocité:** [Heures réelles / Heures estimées]

### Qualité & Dette Technique
- **Tests Coverage:** Target >80% (mesurer après Phase 10)
- **Type Safety:** 0 `any` dans le code
- **Design System Compliance:** 100% (checklist validation)
- **Performance:** Lighthouse score >90

### Blockers & Risques
- **Blockers actifs:** [Liste des problèmes bloquants]
- **Risques identifiés:** [Risques potentiels]
- **Mitigations:** [Actions prises]

---

## 🛠️ Outils & Helpers

### Scripts Utiles

```bash
# Vérifier progression
npm run test

# Lancer dev server
npm run dev

# Vérifier types
npx tsc --noEmit

# Linter
npm run lint

# Format code
npm run format

# Générer migrations Drizzle
npm run db:generate

# Appliquer migrations
npm run db:migrate

# Reset DB (ATTENTION: efface données)
npm run db:reset
```

### Validation Rapide Entre Phases

```bash
#!/bin/bash
# scripts/validate-phase.sh

PHASE=$1

echo "🔍 Validating Phase $PHASE..."

# Check files exist
if [ ! -f "module-pricing/handoffs/phase-$PHASE-handoff.json" ]; then
  echo "❌ Handoff file missing for Phase $PHASE"
  exit 1
fi

# Run tests
npm run test || { echo "❌ Tests failing"; exit 1; }

# Check types
npx tsc --noEmit || { echo "❌ Type errors"; exit 1; }

echo "✅ Phase $PHASE validated successfully!"
```

---

## 📞 Support & Questions

### Pendant le Développement

Si tu rencontres un problème:

1. **Check Troubleshooting** dans le document de phase
2. **Consulter design-system-guidelines.md** si problème UI
3. **Lire plan-initial-pricing.md** si ambiguïté dans specs
4. **Demander à Claude** de clarifier dans la conversation en cours

### Entre les Phases

Si tu dois arrêter et reprendre plus tard:

1. **Vérifier le handoff JSON** de la dernière phase complétée
2. **Lire le document de la phase suivante** avant de démarrer
3. **Valider l'état actuel** en local (`npm run dev`, tests)
4. **Démarrer nouvelle conversation** avec prompt standard

---

## 🎉 Completion Criteria

Le module Pricing sera considéré **complété** quand:

- ✅ Toutes les phases 0-10 sont marquées ✅ DONE
- ✅ Dashboard fonctionnel avec données réelles
- ✅ Upload CSV produits opérationnel
- ✅ Scraping 1+ site concurrent OK
- ✅ Matching AI avec GPT-5 fonctionnel
- ✅ Historique prix avec graphiques Recharts
- ✅ Tests E2E passent (>80% coverage)
- ✅ Design system 100% respecté
- ✅ Documentation complète

**Puis:** Ready pour beta users ! 🚀

---

## 📝 Changelog Plan

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-11-19 | Plan initial - 10 phases définies |

---

**Next Step:** Créer les documents détaillés pour chaque phase (phases/phase-0-setup.md, etc.)
