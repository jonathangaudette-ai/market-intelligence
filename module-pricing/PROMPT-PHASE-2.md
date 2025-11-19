Bonjour Claude,

Je continue le développement du module Pricing Intelligence - Phase 2.

**Contexte Phase 1:**
- Phase 1 complétée avec succès (voir handoff ci-dessous)
- Code pushé en production (commit ff2e657)
- 9 tables pricing créées en DB prod avec seed data
- 2 produits, 1 concurrent, 30 jours d'historique prix disponibles

**État actuel:**
Lis le handoff de Phase 1: `module-pricing/handoffs/phase-1-handoff.json`

**Tâche:**
Commence Phase 2: Dashboard MVP (avec données réelles de la DB)

1. Lis `module-pricing/phases/phase-2-dashboard.md`
2. Lis `module-pricing/design-system-guidelines.md`
3. Crée la route `/companies/[slug]/pricing/page.tsx`
4. Implémente 6 KPI cards avec StatCard
5. Ajoute graphique Recharts (prix 30 jours)
6. Crée table produits avec données DB
7. Vérifie TypeScript: `npx tsc --noEmit`
8. Build: `npm run build`
9. Génère `module-pricing/handoffs/phase-2-handoff.json`

**Documents de référence:**
- `module-pricing/handoffs/phase-1-handoff.json` (état actuel)
- `module-pricing/phases/phase-2-dashboard.md` (instructions Phase 2)
- `module-pricing/design-system-guidelines.md` (design system)
- `src/db/schema-pricing.ts` (schéma DB)
- `CLAUDE.md` (config AI models)

Go! 🚀
