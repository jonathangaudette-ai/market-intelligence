# Validation Product Owner - Soumissions Enerserv

**Date:** 2025-11-22
**Validé par:** Product Owner, Spécialiste Création de Soumissions
**Documents analysés:** 3 offres de services Enerserv

---

## Résumé Exécutif

| Critère | Verdict |
|---------|---------|
| **Peut-on créer ce type de document?** | ✅ **OUI** |
| **Avec le module proposé?** | ✅ **OUI, avec ajustements** |
| **Complexité estimée** | ⚠️ **MOYENNE-ÉLEVÉE** |
| **Ajustements requis** | 3 fonctionnalités additionnelles |

---

## 1. Analyse des Documents

### 1.1 Documents analysés

| Document | Langue | Montant | Tableaux | Pages |
|----------|--------|---------|----------|-------|
| SO-25570-GAT.docx | FR | 66 600 $ | 10 | ~15 |
| SO-25583-DOL Rev1.docx | FR | 81 275 $ | 10 | ~15 |
| SO-25610-KAM Rev1.docx | EN | $160 800 | 10 | ~15 |

### 1.2 Structure identifiée (commune aux 3 documents)

```
1. PAGE DE GARDE
   └─ Logo Enerserv
   └─ Numéro de soumission (SO-XXXXX-XXX)
   └─ Contact client (nom, titre, entreprise, email)
   └─ Montant total

2. CORPS DU DOCUMENT
   ├─ Description du mandat
   ├─ Envergure des travaux (tableaux)
   ├─ Travaux potentiellement requis (exclusions)
   ├─ Liste de pièces client (si applicable)
   ├─ Division des responsabilités (tableau)
   ├─ Clarifications
   ├─ Formation SST
   ├─ Ventilation des coûts (tableau)
   ├─ Assurances
   ├─ Conditions de paiement
   └─ Signature / Conclusion

3. ANNEXES
   ├─ Annexe A: Taux 2025
   └─ Annexe B: Termes et Conditions
```

---

## 2. Mapping vers les 3 Stratégies

### 2.1 Sections STATIQUES (Bibliothèque de clauses)

Ces sections sont **identiques ou quasi-identiques** dans les 3 documents:

| Section | Statut | Variables requises |
|---------|--------|-------------------|
| Formation SST / HSE Training | ✅ 100% identique | `{{langue}}` |
| Clarifications | ✅ 95% identique | Aucune |
| Assurances | ✅ 100% identique | `{{langue}}` |
| Conditions de paiement | ✅ 90% identique | `{{netDays}}`, `{{advancePercent}}` |
| Termes et Conditions (Annexe B) | ✅ 100% identique | Aucune |
| Taux 2025 (Annexe A) | ✅ 100% identique | `{{year}}` |

**Verdict STATIC:** ✅ **PARFAITEMENT ADAPTÉ**
- 6 clauses pré-approuvées à créer
- Variables simples (dates, pourcentages)
- Contenu juridique sensible → pas d'IA

### 2.2 Sections RAG (Génération dynamique)

Ces sections varient significativement selon le projet:

| Section | Variabilité | Source RAG |
|---------|-------------|------------|
| Description du mandat | 100% variable | Propositions passées similaires |
| Envergure des travaux | 100% variable | Projets similaires (turbine, alternateur) |
| Travaux potentiellement requis | 70% variable | Liste d'exclusions par type de projet |

**Verdict RAG:** ✅ **ADAPTÉ**
- Réutilisation de contenus de projets similaires
- Classification par type d'équipement (turbine, alternateur, pompe)
- Adaptation au contexte client

### 2.3 Sections HYBRIDES (Template + enrichissement)

Ces sections ont une structure fixe mais un contenu variable:

| Section | Partie fixe | Partie variable |
|---------|-------------|-----------------|
| Division des responsabilités | Headers du tableau | Lignes spécifiques au projet |
| Ventilation des coûts | Structure du tableau | Montants et postes |
| Page de garde | Layout et logo | Infos client et montant |

**Verdict HYBRID:** ⚠️ **PARTIELLEMENT ADAPTÉ**
- Nécessite un éditeur de tableaux
- Templates de tableaux à créer

---

## 3. Analyse des Tableaux

### 3.1 Types de tableaux identifiés

| Type | Exemple | Complexité | Stratégie |
|------|---------|------------|-----------|
| **Info contact** | Coordonnées client | Simple | STATIC template |
| **Montant** | 66 600,00 $ | Simple | Variable `{{amount}}` |
| **Horaire/Équipe** | 12h/jour, équipe 4 pers | Moyenne | HYBRID |
| **Travaux inclus** | Liste avec heures-homme | Moyenne | RAG + édition |
| **Pièces client** | 14 lignes x 6 colonnes | Élevée | RAG + édition |
| **Division responsabilités** | Client/Enerserv/N.A. | Moyenne | HYBRID template |
| **Ventilation coûts** | Postes budgétaires | Moyenne | HYBRID template |

### 3.2 Capacité actuelle vs requise

| Fonctionnalité | Plan actuel | Requis Enerserv | Gap |
|----------------|-------------|-----------------|-----|
| Texte formaté | ✅ Oui | ✅ Oui | - |
| Tableaux simples | ❌ Non prévu | ✅ Requis | ⚠️ **GAP** |
| Tableaux dynamiques | ❌ Non prévu | ✅ Requis | ⚠️ **GAP** |
| Variables dans tableaux | ❌ Non prévu | ✅ Requis | ⚠️ **GAP** |
| Export Word | ✅ Oui | ✅ Oui | - |

---

## 4. Gaps Identifiés et Solutions

### 4.1 GAP #1: Éditeur de Tableaux

**Problème:** Les soumissions Enerserv contiennent ~10 tableaux par document.

**Solution proposée:**
```typescript
// Nouveau composant: TableEditor
interface TableTemplate {
  id: string;
  name: string;
  columns: Array<{
    key: string;
    header: string;
    width: number;
    editable: boolean;
  }>;
  defaultRows: number;
}

// Templates de tableaux pour Enerserv
const ENERSERV_TABLE_TEMPLATES = {
  'division-responsabilites': {
    columns: [
      { key: 'item', header: 'Item', editable: true },
      { key: 'client', header: 'Client', editable: false },
      { key: 'enerserv', header: 'Enerserv', editable: false },
      { key: 'na', header: 'N/A', editable: false },
    ],
    defaultRows: 20,
  },
  'ventilation-couts': {
    columns: [
      { key: 'description', header: 'Description', editable: true },
      { key: 'montant', header: 'Montant', editable: true },
    ],
  },
};
```

**Impact:** +3 jours de développement

### 4.2 GAP #2: Variables dans Templates

**Problème:** Les tableaux contiennent des variables (montants, dates, noms).

**Solution proposée:**
```typescript
// Extension du système Handlebars pour tableaux
const tableContent = `
| Description | Montant |
|-------------|---------|
| Travaux sur site | {{siteWorkAmount}} |
| Frais de déplacement | {{travelAmount}} |
| **TOTAL** | **{{totalAmount}}** |
`;

// Rendu avec variables
const rendered = Handlebars.compile(tableContent)({
  siteWorkAmount: '45 000 $',
  travelAmount: '21 600 $',
  totalAmount: '66 600 $',
});
```

**Impact:** +1 jour (extension Handlebars existant)

### 4.3 GAP #3: Support Bilingue

**Problème:** Document SO-25610-KAM est en anglais, les autres en français.

**Solution proposée:**
```typescript
// Clauses avec versions linguistiques
const clause = await clauseLibrary.getBlock(
  companyId,
  'sst_training',
  { language: 'en' } // ou 'fr'
);
```

**Impact:** Déjà prévu dans le plan (colonne `language`)

---

## 5. ContentTypes Additionnels Requis

Pour supporter les soumissions Enerserv, ajouter ces ContentTypes:

```typescript
// À ajouter à CONTENT_TYPE_CONFIGS
'scope-of-work': {
  type: 'scope-of-work',
  generationStrategy: 'rag',
  description: 'Envergure des travaux, liste des tâches incluses'
},
'exclusions': {
  type: 'exclusions',
  generationStrategy: 'rag',
  description: 'Travaux potentiellement requis, exclusions'
},
'division-responsibilities': {
  type: 'division-responsibilities',
  generationStrategy: 'hybrid',
  defaultBlockKey: 'dor_template',
  description: 'Tableau de division des responsabilités'
},
'cost-breakdown': {
  type: 'cost-breakdown',
  generationStrategy: 'hybrid',
  defaultBlockKey: 'cost_table_template',
  description: 'Ventilation des coûts'
},
'crew-schedule': {
  type: 'crew-schedule',
  generationStrategy: 'hybrid',
  defaultBlockKey: 'schedule_template',
  description: 'Horaire et équipe de travail'
},
```

**Impact:** +5 ContentTypes (vs 7 prévus initialement = 12 total)

---

## 6. Clauses Enerserv à Créer (Seed Data)

### 6.1 Clauses STATIQUES

| block_key | Nom | Langue |
|-----------|-----|--------|
| `sst_training_fr` | Formation SST | FR |
| `sst_training_en` | HSE Training | EN |
| `clarifications_fr` | Clarifications | FR |
| `clarifications_en` | Clarifications | EN |
| `insurance_fr` | Nos Assurances | FR |
| `insurance_en` | Our Insurance | EN |
| `payment_terms_fr` | Conditions de paiement | FR |
| `payment_terms_en` | Terms of Payment | EN |
| `terms_conditions_fr` | Termes et Conditions | FR |
| `terms_conditions_en` | Terms & Conditions | EN |
| `rates_2025` | Taux 2025 / Rates 2025 | FR/EN |

### 6.2 Templates HYBRID

| block_key | Nom | Colonnes |
|-----------|-----|----------|
| `dor_template` | Division des responsabilités | 4 (Item, Client, Enerserv, N/A) |
| `cost_table_template` | Ventilation des coûts | 2-3 (Description, Montant) |
| `schedule_template` | Horaire de travail | 3 (Type, Valeur, Notes) |
| `crew_template` | Équipe | 2 (Qty, Role) |

---

## 7. Workflow Proposé pour Enerserv

```
┌─────────────────────────────────────────────────────────────┐
│  1. CRÉATION NOUVELLE SOUMISSION                            │
├─────────────────────────────────────────────────────────────┤
│  • Sélectionner template "Offre de services Enerserv"       │
│  • Remplir infos de base (client, projet, langue)           │
│  • Sections pré-chargées avec stratégies assignées          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. SECTIONS STATIQUES (Auto-chargées)                      │
├─────────────────────────────────────────────────────────────┤
│  📋 Formation SST      → Clause pré-approuvée              │
│  📋 Clarifications     → Clause pré-approuvée              │
│  📋 Assurances         → Clause pré-approuvée              │
│  📋 Paiement           → Clause + variables {{netDays}}    │
│  📋 Annexe B           → Clause pré-approuvée              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. SECTIONS RAG (Génération assistée)                      │
├─────────────────────────────────────────────────────────────┤
│  🤖 Description mandat → RAG sur projets similaires         │
│  🤖 Envergure travaux  → RAG + édition manuelle tableaux   │
│  🤖 Exclusions         → RAG sur exclusions type projet    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  4. SECTIONS HYBRID (Template + édition)                    │
├─────────────────────────────────────────────────────────────┤
│  🔀 Division resp.     → Template tableau + édition lignes │
│  🔀 Ventilation coûts  → Template + saisie montants        │
│  🔀 Horaire/Équipe     → Template + customisation          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  5. EXPORT                                                  │
├─────────────────────────────────────────────────────────────┤
│  • Génération Word avec formatage Enerserv                  │
│  • Insertion logo                                           │
│  • Tableaux formatés                                        │
│  • Annexes attachées                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Verdict Final

### 8.1 Réponse à la question

> **"Va-t-on être capable de créer ce genre de document avec notre module?"**

### ✅ **OUI, avec les ajustements suivants:**

| Ajustement | Effort | Priorité |
|------------|--------|----------|
| Éditeur de tableaux simple | +3 jours | P1 - Critique |
| 5 ContentTypes additionnels | +1 jour | P1 - Critique |
| 11 clauses Enerserv seed | +2 jours | P1 - Critique |
| Templates Word Enerserv | +2 jours | P2 - Important |
| **TOTAL** | **+8 jours** | - |

### 8.2 Impact sur le timeline

| Phase | Durée initiale | Ajustement | Nouvelle durée |
|-------|----------------|------------|----------------|
| Phase 1 (DB + Types) | 5 jours | +1 jour (ContentTypes) | 6 jours |
| Phase 5 (UI Editor) | 5 jours | +3 jours (TableEditor) | 8 jours |
| Phase 6 (Export + Seed) | 5 jours | +4 jours (Enerserv) | 9 jours |
| **TOTAL PROJET** | **38 jours** | **+8 jours** | **46 jours** |

### 8.3 Recommandation

1. **Valider l'ajout de l'éditeur de tableaux** avant de commencer Phase 1
2. **Créer un template Word Enerserv** comme référence pour l'export
3. **Prioriser les clauses SST et Assurances** car 100% réutilisables
4. **Tester avec SO-25570-GAT** comme premier cas d'usage

---

## 9. Prochaines Étapes

- [ ] Valider les +8 jours avec le client
- [ ] Ajouter "TableEditor" au plan Phase 5
- [ ] Créer les 11 clauses Enerserv dans le seed data
- [ ] Obtenir le template Word officiel Enerserv (avec logo, styles)

---

**Signature:**
Product Owner, Spécialiste Création de Soumissions
2025-11-22
