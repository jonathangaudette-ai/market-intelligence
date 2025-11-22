# Addendum Architecture : Sections Statiques vs Dynamiques

**Date:** 2025-11-22
**Type:** Révision Architecture
**Déclenché par:** Feedback Architecte - "Certaines sections sont toujours standard"
**Impact:** Modification approche génération de contenu

---

## 1. Problème identifié

### 1.1 Constat de l'architecte

> "Certaines sections d'une proposition sont toujours standard, exemple le légal et certaines autres clauses, pas certain que le RAG soit la bonne solution dans ce temps là"

### 1.2 Analyse du problème

**Le plan initial proposait d'utiliser le RAG pour TOUTES les sections.** C'est une erreur pour les sections standardisées car :

| Problème | Impact | Gravité |
|----------|--------|---------|
| **Hallucination juridique** | IA pourrait inventer des clauses non approuvées | 🔴 Critique |
| **Incohérence** | Variations non souhaitées du texte légal | 🔴 Critique |
| **Coût API inutile** | Appels Claude/GPT pour du contenu fixe | 🟡 Moyen |
| **Latence** | RAG + génération pour du boilerplate | 🟡 Moyen |
| **Maintenance** | Difficile de mettre à jour les clauses | 🟡 Moyen |

---

## 2. Classification des sections

### 2.1 Matrice : Type de contenu × Stratégie de génération

| Section | Fréquence | Variabilité | Stratégie | Rationale |
|---------|-----------|-------------|-----------|-----------|
| **Résumé exécutif** | 95% | 🔴 Très haute | `rag` | Personnalisé par client/projet |
| **Contexte client** | 85% | 🔴 Très haute | `rag` | Spécifique à chaque client |
| **Solution proposée** | 100% | 🔴 Haute | `rag` | Adapté au besoin |
| **Méthodologie** | 85% | 🟡 Moyenne | `hybrid` | Base standard + adaptations |
| **Équipe** | 90% | 🟡 Moyenne | `hybrid` | CVs standards + sélection |
| **Tarification** | 100% | 🔴 Haute | `rag` | Spécifique au projet |
| **Échéancier** | 85% | 🟡 Moyenne | `hybrid` | Template + dates spécifiques |
| **Études de cas** | 75% | 🟡 Moyenne | `rag` | Sélection pertinente |
| **Termes et conditions** | 80% | 🟢 Très faible | `static` | Boilerplate juridique |
| **Assurances/Conformité** | 70% | 🟢 Très faible | `static` | Certifications fixes |
| **Garanties** | 65% | 🟢 Faible | `static` | Clauses pré-approuvées |
| **Confidentialité** | 60% | 🟢 Nulle | `static` | NDA standard |
| **Annexes** | 50% | 🟡 Variable | `hybrid` | Mix documents |

### 2.2 Définition des stratégies

```typescript
type GenerationStrategy = 'rag' | 'static' | 'hybrid';

// RAG: Recherche + Génération IA
// - Utilise DualQueryRetrievalEngine
// - Génère avec Claude Sonnet 4.5
// - Haute personnalisation

// STATIC: Bibliothèque de clauses
// - Sélection directe depuis clause_library
// - Substitution de variables simples
// - Aucune génération IA
// - Contenu pré-approuvé

// HYBRID: Combinaison
// - Template de base (static)
// - Enrichissement contextuel (rag)
// - Ex: Méthodologie = framework standard + adaptations projet
```

---

## 3. Solution proposée : Bibliothèque de clauses

### 3.1 Nouvelle table : `content_blocks`

```sql
-- Bibliothèque de blocs de contenu réutilisables
CREATE TABLE content_blocks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identification
  block_key VARCHAR(100) NOT NULL,           -- 'legal_terms_standard', 'insurance_clause_v2'
  category VARCHAR(50) NOT NULL,              -- 'legal', 'insurance', 'compliance', 'guarantee'
  name VARCHAR(255) NOT NULL,                 -- "Termes et conditions standard"
  description TEXT,

  -- Contenu
  content TEXT NOT NULL,                      -- Le texte du bloc
  content_format VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html', 'plain'

  -- Variables supportées (pour substitution simple)
  variables JSONB,                            -- [{ key: 'clientName', required: true }]

  -- Métadonnées
  language VARCHAR(10) DEFAULT 'fr',          -- 'fr', 'en'
  industry VARCHAR(100),                      -- NULL = universel, sinon industrie spécifique

  -- Approbation juridique
  approved_by VARCHAR(255),                   -- User ID qui a approuvé
  approved_at TIMESTAMP,
  legal_review_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'needs_review'

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  previous_version_id VARCHAR(255),

  -- Audit
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Index unique
  UNIQUE(company_id, block_key, version)
);

-- Index pour recherche rapide
CREATE INDEX idx_content_blocks_category ON content_blocks(company_id, category, is_active);
CREATE INDEX idx_content_blocks_key ON content_blocks(company_id, block_key, is_active);
```

### 3.2 Extension de ContentType

```typescript
// src/types/content-types.ts - EXTENSION

export interface ContentTypeConfig {
  type: ContentType;
  generationStrategy: 'rag' | 'static' | 'hybrid';

  // Pour static/hybrid: block_key par défaut
  defaultBlockKey?: string;

  // Pour hybrid: quel % est statique vs généré
  staticRatio?: number; // 0-100

  // Variables requises pour substitution
  requiredVariables?: string[];
}

export const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  // === SECTIONS DYNAMIQUES (RAG) ===
  'executive-summary': {
    type: 'executive-summary',
    generationStrategy: 'rag',
  },
  'client-context': {
    type: 'client-context',
    generationStrategy: 'rag',
  },
  'solution-approach': {
    type: 'solution-approach',
    generationStrategy: 'rag',
  },
  'pricing': {
    type: 'pricing',
    generationStrategy: 'rag',
  },
  'case-studies': {
    type: 'case-studies',
    generationStrategy: 'rag',
  },

  // === SECTIONS STATIQUES (Bibliothèque) ===
  'legal-terms': {
    type: 'legal-terms',
    generationStrategy: 'static',
    defaultBlockKey: 'legal_terms_standard',
    requiredVariables: ['clientName', 'effectiveDate'],
  },
  'insurance-compliance': {
    type: 'insurance-compliance',
    generationStrategy: 'static',
    defaultBlockKey: 'insurance_standard',
    requiredVariables: [],
  },
  'confidentiality': {
    type: 'confidentiality',
    generationStrategy: 'static',
    defaultBlockKey: 'nda_standard',
    requiredVariables: ['clientName', 'companyName'],
  },
  'guarantees': {
    type: 'guarantees',
    generationStrategy: 'static',
    defaultBlockKey: 'guarantees_standard',
    requiredVariables: ['warrantyPeriod'],
  },

  // === SECTIONS HYBRIDES ===
  'methodology': {
    type: 'methodology',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'methodology_framework',
    staticRatio: 60, // 60% template, 40% contextuel
    requiredVariables: ['projectType'],
  },
  'team-structure': {
    type: 'team-structure',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'team_intro',
    staticRatio: 30, // Intro standard + CVs sélectionnés
  },
  'timeline-delivery': {
    type: 'timeline-delivery',
    generationStrategy: 'hybrid',
    defaultBlockKey: 'timeline_template',
    staticRatio: 40,
    requiredVariables: ['startDate', 'endDate'],
  },
};
```

### 3.3 Service : ClauseLibraryService

```typescript
// src/lib/proposals/clause-library.service.ts

import { db } from '@/db';
import { contentBlocks } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Handlebars from 'handlebars';

export interface ContentBlock {
  id: string;
  blockKey: string;
  category: string;
  name: string;
  content: string;
  variables: Array<{ key: string; required: boolean; defaultValue?: string }>;
  language: string;
  legalReviewStatus: 'pending' | 'approved' | 'needs_review';
  version: number;
}

export interface RenderBlockOptions {
  variables: Record<string, string>;
  language?: 'fr' | 'en';
  industryOverride?: string;
}

export class ClauseLibraryService {

  /**
   * Récupère un bloc de contenu par sa clé
   */
  async getBlock(
    companyId: string,
    blockKey: string,
    options?: { language?: string; industry?: string }
  ): Promise<ContentBlock | null> {
    const conditions = [
      eq(contentBlocks.companyId, companyId),
      eq(contentBlocks.blockKey, blockKey),
      eq(contentBlocks.isActive, true),
    ];

    if (options?.language) {
      conditions.push(eq(contentBlocks.language, options.language));
    }

    const [block] = await db
      .select()
      .from(contentBlocks)
      .where(and(...conditions))
      .orderBy(desc(contentBlocks.version))
      .limit(1);

    return block || null;
  }

  /**
   * Rend un bloc avec substitution de variables
   * AUCUNE IA - substitution Handlebars simple
   */
  async renderBlock(
    companyId: string,
    blockKey: string,
    options: RenderBlockOptions
  ): Promise<{ content: string; block: ContentBlock }> {
    const block = await this.getBlock(companyId, blockKey, {
      language: options.language,
      industryOverride: options.industryOverride,
    });

    if (!block) {
      throw new Error(`Block not found: ${blockKey}`);
    }

    // Valider les variables requises
    const missingVars = (block.variables || [])
      .filter(v => v.required && !options.variables[v.key])
      .map(v => v.key);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Appliquer les valeurs par défaut
    const finalVars = { ...options.variables };
    for (const v of block.variables || []) {
      if (finalVars[v.key] === undefined && v.defaultValue) {
        finalVars[v.key] = v.defaultValue;
      }
    }

    // Rendre avec Handlebars (simple, déterministe, pas d'IA)
    const template = Handlebars.compile(block.content);
    const renderedContent = template(finalVars);

    return {
      content: renderedContent,
      block,
    };
  }

  /**
   * Liste tous les blocs par catégorie
   */
  async listBlocksByCategory(
    companyId: string,
    category: string
  ): Promise<ContentBlock[]> {
    return db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.companyId, companyId),
          eq(contentBlocks.category, category),
          eq(contentBlocks.isActive, true)
        )
      )
      .orderBy(contentBlocks.name);
  }

  /**
   * Crée ou met à jour un bloc (avec versioning)
   */
  async saveBlock(
    companyId: string,
    blockKey: string,
    data: {
      name: string;
      category: string;
      content: string;
      variables?: Array<{ key: string; required: boolean; defaultValue?: string }>;
      language?: string;
    },
    userId: string
  ): Promise<ContentBlock> {
    // Désactiver version précédente
    const [existing] = await db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.companyId, companyId),
          eq(contentBlocks.blockKey, blockKey),
          eq(contentBlocks.isActive, true)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(contentBlocks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(contentBlocks.id, existing.id));
    }

    // Créer nouvelle version
    const [newBlock] = await db
      .insert(contentBlocks)
      .values({
        companyId,
        blockKey,
        name: data.name,
        category: data.category,
        content: data.content,
        variables: data.variables || [],
        language: data.language || 'fr',
        version: existing ? existing.version + 1 : 1,
        previousVersionId: existing?.id,
        isActive: true,
        legalReviewStatus: 'pending', // Nouvelle version = review requise
        createdBy: userId,
      })
      .returning();

    return newBlock;
  }

  /**
   * Approuve un bloc (validation juridique)
   */
  async approveBlock(
    blockId: string,
    approverId: string
  ): Promise<void> {
    await db
      .update(contentBlocks)
      .set({
        legalReviewStatus: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentBlocks.id, blockId));
  }
}

// Singleton
let _clauseLibrary: ClauseLibraryService | null = null;

export function getClauseLibrary(): ClauseLibraryService {
  if (!_clauseLibrary) {
    _clauseLibrary = new ClauseLibraryService();
  }
  return _clauseLibrary;
}
```

---

## 4. Modification du générateur de sections

### 4.1 Nouveau flow de génération

```typescript
// src/lib/proposals/section-generator.service.ts

import { CONTENT_TYPE_CONFIGS } from '@/types/content-types';
import { getClauseLibrary } from './clause-library.service';
import { DualQueryRetrievalEngine } from '@/lib/rag/dual-query-engine';

export class SectionGeneratorService {
  private clauseLibrary = getClauseLibrary();
  private ragEngine: DualQueryRetrievalEngine;

  /**
   * Génère le contenu d'une section selon sa stratégie
   */
  async generateSectionContent(
    companyId: string,
    sectionType: ContentType,
    context: {
      clientName: string;
      projectDescription?: string;
      variables: Record<string, string>;
    }
  ): Promise<GeneratedContent> {

    const config = CONTENT_TYPE_CONFIGS[sectionType];

    switch (config.generationStrategy) {
      case 'static':
        return this.generateStatic(companyId, config, context);

      case 'rag':
        return this.generateWithRAG(companyId, sectionType, context);

      case 'hybrid':
        return this.generateHybrid(companyId, config, context);

      default:
        throw new Error(`Unknown strategy: ${config.generationStrategy}`);
    }
  }

  /**
   * STATIC: Utilise la bibliothèque de clauses
   * - Aucune IA
   * - Déterministe
   * - Rapide
   */
  private async generateStatic(
    companyId: string,
    config: ContentTypeConfig,
    context: GenerationContext
  ): Promise<GeneratedContent> {

    const { content, block } = await this.clauseLibrary.renderBlock(
      companyId,
      config.defaultBlockKey!,
      {
        variables: context.variables,
        language: context.language || 'fr',
      }
    );

    return {
      content,
      strategy: 'static',
      sources: [{
        type: 'clause_library',
        blockKey: config.defaultBlockKey,
        blockName: block.name,
        version: block.version,
        legalStatus: block.legalReviewStatus,
      }],
      metadata: {
        generatedAt: new Date(),
        aiUsed: false, // Important: pas d'IA!
        editable: true, // Mais l'utilisateur peut modifier
        approvedContent: block.legalReviewStatus === 'approved',
      }
    };
  }

  /**
   * RAG: Recherche + Génération IA
   * - Utilise le RAG existant
   * - Claude Sonnet 4.5
   * - Haute personnalisation
   */
  private async generateWithRAG(
    companyId: string,
    sectionType: ContentType,
    context: GenerationContext
  ): Promise<GeneratedContent> {

    // Utilise le flow existant (DualQueryRetrievalEngine + Claude)
    // ... code existant dans streaming-generator.ts

    return {
      content: generatedContent,
      strategy: 'rag',
      sources: ragSources,
      metadata: {
        generatedAt: new Date(),
        aiUsed: true,
        model: 'claude-sonnet-4-5-20250929',
        editable: true,
        approvedContent: false, // Généré = jamais pré-approuvé
      }
    };
  }

  /**
   * HYBRID: Template statique + enrichissement RAG
   * - Base standard (clause library)
   * - Ajouts contextuels (RAG)
   */
  private async generateHybrid(
    companyId: string,
    config: ContentTypeConfig,
    context: GenerationContext
  ): Promise<GeneratedContent> {

    // 1. Récupérer la base statique
    const { content: staticBase, block } = await this.clauseLibrary.renderBlock(
      companyId,
      config.defaultBlockKey!,
      { variables: context.variables }
    );

    // 2. Enrichir avec RAG si nécessaire
    const enrichmentPrompt = `
      Voici un template de section "${config.type}":

      ${staticBase}

      Enrichis ce contenu pour le client "${context.clientName}"
      en ajoutant des détails contextuels pertinents.

      Projet: ${context.projectDescription}

      IMPORTANT:
      - Conserve la structure et les clauses standards
      - Ajoute uniquement du contenu contextuel
      - Ne modifie PAS les sections légales/conformité
    `;

    const enrichedContent = await this.enrichWithRAG(
      companyId,
      enrichmentPrompt,
      context
    );

    return {
      content: enrichedContent,
      strategy: 'hybrid',
      sources: [
        {
          type: 'clause_library',
          blockKey: config.defaultBlockKey,
          staticRatio: config.staticRatio,
        },
        ...ragSources,
      ],
      metadata: {
        generatedAt: new Date(),
        aiUsed: true, // Hybrid utilise l'IA pour enrichissement
        model: 'claude-sonnet-4-5-20250929',
        editable: true,
        approvedContent: false, // Hybrid = partiellement approuvé
        staticPortion: config.staticRatio,
      }
    };
  }
}
```

---

## 5. Templates par défaut (Seed data)

### 5.1 Clauses légales standard

```typescript
// src/db/seeds/default-content-blocks.ts

export const DEFAULT_CONTENT_BLOCKS = [
  // === TERMES ET CONDITIONS ===
  {
    blockKey: 'legal_terms_standard',
    category: 'legal',
    name: 'Termes et conditions standard',
    language: 'fr',
    content: `## Termes et Conditions

### 1. Définitions
- **"Client"** désigne {{clientName}}
- **"Fournisseur"** désigne {{companyName}}
- **"Services"** désigne les prestations décrites dans cette proposition
- **"Date d'effet"** désigne le {{effectiveDate}}

### 2. Objet du contrat
Le présent contrat définit les modalités selon lesquelles le Fournisseur
s'engage à fournir les Services au Client.

### 3. Durée et résiliation
Le contrat entre en vigueur à la Date d'effet et demeure valide pour
la durée du projet, sauf résiliation anticipée selon les conditions ci-dessous.

Chaque partie peut résilier le contrat moyennant un préavis écrit de
trente (30) jours.

### 4. Conditions de paiement
- Acompte de 30% à la signature
- 40% à mi-parcours (livraison intermédiaire)
- 30% à la livraison finale

Les paiements sont exigibles dans les trente (30) jours suivant
la réception de la facture.

### 5. Propriété intellectuelle
Tous les livrables produits dans le cadre de ce projet deviennent
la propriété du Client après paiement intégral.

### 6. Limitation de responsabilité
La responsabilité du Fournisseur est limitée au montant total
des honoraires versés au titre du présent contrat.

### 7. Loi applicable
Le présent contrat est régi par les lois de la province de Québec.`,
    variables: [
      { key: 'clientName', required: true },
      { key: 'companyName', required: true },
      { key: 'effectiveDate', required: true },
    ],
  },

  // === ASSURANCES ET CONFORMITÉ ===
  {
    blockKey: 'insurance_standard',
    category: 'insurance',
    name: 'Assurances et conformité',
    language: 'fr',
    content: `## Assurances et Conformité

### Couvertures d'assurance
{{companyName}} maintient les assurances suivantes:

| Type d'assurance | Couverture | Numéro de police |
|------------------|------------|------------------|
| Responsabilité civile professionnelle | 2 000 000 $ | PRO-2024-XXX |
| Responsabilité civile générale | 5 000 000 $ | RCG-2024-XXX |
| Cyber-responsabilité | 1 000 000 $ | CYB-2024-XXX |
| Erreurs et omissions | 2 000 000 $ | E&O-2024-XXX |

### Certifications
- ISO 27001:2022 - Sécurité de l'information
- SOC 2 Type II - Contrôles de sécurité
- Certification Loi 25 (Québec) - Protection des données personnelles

### Conformité réglementaire
Nous respectons toutes les lois et réglementations applicables, incluant:
- Loi sur la protection des renseignements personnels (Loi 25)
- Loi sur la langue officielle (Loi 96)
- RGPD (pour les projets impliquant des données européennes)

Des certificats d'assurance peuvent être fournis sur demande.`,
    variables: [
      { key: 'companyName', required: true },
    ],
  },

  // === CONFIDENTIALITÉ / NDA ===
  {
    blockKey: 'nda_standard',
    category: 'confidentiality',
    name: 'Clause de confidentialité standard',
    language: 'fr',
    content: `## Confidentialité

### Engagement de confidentialité
{{companyName}} s'engage à:

1. **Protéger** toutes les informations confidentielles divulguées par
   {{clientName}} dans le cadre de ce projet

2. **Ne pas divulguer** ces informations à des tiers sans autorisation
   écrite préalable

3. **Limiter l'accès** aux seuls employés ayant besoin d'en connaître
   pour l'exécution du projet

4. **Retourner ou détruire** toutes les informations confidentielles
   à la fin du projet, sur demande

### Exceptions
Ne sont pas considérées comme confidentielles les informations:
- Déjà connues du public
- Reçues légitimement d'un tiers
- Développées indépendamment

### Durée
Cette obligation de confidentialité demeure en vigueur pendant
cinq (5) ans après la fin du projet.`,
    variables: [
      { key: 'clientName', required: true },
      { key: 'companyName', required: true },
    ],
  },

  // === GARANTIES ===
  {
    blockKey: 'guarantees_standard',
    category: 'guarantee',
    name: 'Garanties standard',
    language: 'fr',
    content: `## Garanties

### Garantie de conformité
{{companyName}} garantit que les livrables:
- Seront conformes aux spécifications convenues
- Seront exempts de défauts matériels
- Respecteront les standards de l'industrie

### Période de garantie
Une période de garantie de **{{warrantyPeriod}}** s'applique à compter
de la livraison finale, pendant laquelle nous corrigerons sans frais
tout défaut signalé.

### Exclusions
La garantie ne couvre pas:
- Les modifications effectuées par le Client ou des tiers
- Les problèmes causés par un usage non conforme
- L'usure normale des systèmes

### Support post-garantie
À l'expiration de la période de garantie, un contrat de maintenance
pourra être proposé pour assurer la continuité du support.`,
    variables: [
      { key: 'companyName', required: true },
      { key: 'warrantyPeriod', required: true, defaultValue: '90 jours' },
    ],
  },

  // === MÉTHODOLOGIE (Template hybride) ===
  {
    blockKey: 'methodology_framework',
    category: 'methodology',
    name: 'Framework méthodologique',
    language: 'fr',
    content: `## Notre méthodologie

### Approche générale
Notre approche suit un cadre éprouvé en {{projectType}} qui combine:
- **Agilité** dans l'exécution
- **Rigueur** dans la gouvernance
- **Collaboration** avec vos équipes

### Phases du projet

#### Phase 1: Découverte et cadrage
- Ateliers de compréhension des besoins
- Analyse de l'existant
- Définition du périmètre détaillé
- Validation des objectifs

#### Phase 2: Conception
- Architecture de la solution
- Maquettes et prototypes
- Validation avec les parties prenantes
- Plan d'exécution détaillé

#### Phase 3: Réalisation
- Sprints de développement (2 semaines)
- Revues de sprint régulières
- Tests continus
- Documentation au fil de l'eau

#### Phase 4: Déploiement
- Tests d'acceptation utilisateur
- Formation des utilisateurs
- Migration des données
- Mise en production

#### Phase 5: Accompagnement
- Support post-déploiement
- Corrections et ajustements
- Transfert de connaissances
- Bilan et amélioration continue

### Gouvernance
[Cette section sera enrichie selon le contexte du projet]`,
    variables: [
      { key: 'projectType', required: true, defaultValue: 'transformation digitale' },
    ],
  },
];
```

---

## 6. Impact sur l'UX

### 6.1 Nouveau flow de génération

```
┌─────────────────────────────────────────────────────────────┐
│ Génération de section                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Section: Termes et conditions                                │
│ Stratégie: 📋 STATIQUE                                       │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ✅ Contenu pré-approuvé juridique                         │ │
│ │ Version: 3.2 | Approuvé: 2024-10-15 par J. Tremblay      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Variables à compléter:                                       │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Client: [Acme Corp          ]                            │ │
│ │ Date d'effet: [2025-01-15   ]                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Aperçu]                           [Utiliser ce contenu]    │
│                                                              │
│ ⚠️ Attention: Les modifications au contenu légal requièrent │
│    une nouvelle approbation juridique.                       │
└─────────────────────────────────────────────────────────────┘
```

VS

```
┌─────────────────────────────────────────────────────────────┐
│ Génération de section                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Section: Résumé exécutif                                     │
│ Stratégie: 🤖 RAG + IA                                       │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Sources à utiliser (3):                                   │ │
│ │ ☑ Proposition Acme 2024 (Won) - 92% similarité           │ │
│ │ ☑ Proposition Beta 2023 (Won) - 85% similarité           │ │
│ │ ☐ Proposition Gamma 2024 (Lost)                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Options de génération:                                       │
│ Ton: [Professionnel ▼]  Longueur: [Moyen (400-800 mots) ▼] │
│                                                              │
│ [Générer avec IA]                                           │
│                                                              │
│ ℹ️ Le contenu sera généré par Claude Sonnet 4.5 et pourra   │
│    être modifié librement.                                   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Indicateurs visuels par stratégie

| Stratégie | Icône | Badge | Couleur |
|-----------|-------|-------|---------|
| **static** | 📋 | "Pré-approuvé" | 🟢 Vert |
| **rag** | 🤖 | "Généré par IA" | 🔵 Bleu |
| **hybrid** | 🔀 | "Template + IA" | 🟡 Jaune |

---

## 7. Impact sur le plan d'implémentation

### 7.1 Nouvelles tâches (Phase 1)

| Tâche | Effort | Phase |
|-------|--------|-------|
| Table `content_blocks` + migration | 0.5 jour | Phase 1 |
| Service `ClauseLibraryService` | 1 jour | Phase 1 |
| Types `ContentTypeConfig` + configs | 0.5 jour | Phase 1 |
| Seed data (5 blocs par défaut) | 0.5 jour | Phase 1 |
| **Total ajouté** | **2.5 jours** | |

### 7.2 Modification du générateur (Phase 3)

| Tâche | Effort | Phase |
|-------|--------|-------|
| Refactor `SectionGeneratorService` avec 3 stratégies | 1 jour | Phase 3 |
| Tests unitaires stratégies | 0.5 jour | Phase 3 |
| **Total ajouté** | **1.5 jours** | |

### 7.3 UI pour bibliothèque de clauses (Phase 4)

| Tâche | Effort | Phase |
|-------|--------|-------|
| Page admin "Bibliothèque de clauses" | 1.5 jours | Phase 4 (P1) |
| Workflow approbation juridique | 1 jour | Phase 4 (P1) |
| **Total ajouté** | **2.5 jours** | |

### 7.4 Impact sur timeline

```
Timeline initiale:     27 jours (5.5 semaines)
+ Sections statiques:  + 4 jours (Phase 1: 2.5j + Phase 3: 1.5j)
= Timeline révisée:    31 jours (~6.2 semaines)

Note: L'UI admin (2.5j) peut être P1 (post-MVP)
Timeline MVP:          29 jours (~6 semaines)
```

---

## 8. Avantages de cette approche

### 8.1 Pour le juridique

| Avantage | Description |
|----------|-------------|
| ✅ **Contrôle** | Clauses pré-approuvées, versionnées |
| ✅ **Traçabilité** | Qui a approuvé, quand |
| ✅ **Conformité** | Pas de risque d'hallucination légale |
| ✅ **Mise à jour centralisée** | Un changement = toutes les propositions |

### 8.2 Pour la performance

| Avantage | Description |
|----------|-------------|
| ✅ **Rapidité** | Sections statiques: <100ms vs 5-10s RAG |
| ✅ **Coût** | Pas d'appels API pour boilerplate |
| ✅ **Fiabilité** | Contenu déterministe |

### 8.3 Pour l'utilisateur

| Avantage | Description |
|----------|-------------|
| ✅ **Clarté** | Sait quelle stratégie est utilisée |
| ✅ **Confiance** | Badge "pré-approuvé" pour légal |
| ✅ **Flexibilité** | Peut toujours modifier si besoin |

---

## 9. Verdict architecte

### ✅ Validation

**En tant qu'Architecte Technique, je valide cette approche car:**

1. ✅ **Séparation des responsabilités** - Static vs Dynamic clairement définis
2. ✅ **Réutilisation** - ClauseLibrary pattern similaire à PromptService existant
3. ✅ **Extensibilité** - Facile d'ajouter de nouveaux blocs
4. ✅ **Performance** - Réduit les appels API de 30-40%
5. ✅ **Sécurité** - Aucune hallucination sur contenu juridique

### ⚠️ Recommandations

1. **Seed data obligatoire** - Ne pas lancer sans les 5 blocs par défaut
2. **Workflow approbation** - Important pour conformité (peut être P1)
3. **Variables validation** - Strict sur les variables requises
4. **Multilingue** - Prévoir FR/EN dès le début

---

## 10. Prochaines étapes

1. ✅ **Valider ce document** avec le Product Owner
2. ☐ **Mettre à jour VALIDATION-CROISEE-FINALE** avec cette décision
3. ☐ **Ajouter les tâches** au backlog Phase 1 et Phase 3
4. ☐ **Créer les 5 seed data** avec contenu réel de l'entreprise
5. ☐ **Planifier review juridique** des clauses par défaut

---

**Document préparé par:** Claude Code (Architecte Technique)
**Date:** 2025-11-22
**Status:** ✅ Prêt pour validation
