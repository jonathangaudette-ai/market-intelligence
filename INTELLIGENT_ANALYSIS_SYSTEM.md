# Système d'Analyse Intelligente de Documents

**Date:** 2025-11-02
**Version:** 1.0
**Statut:** ✅ Implémenté

---

## 📋 Vue d'ensemble

Le **Système d'Analyse Intelligente** ajoute une couche de pré-traitement avancée entre l'upload de documents et leur vectorisation. Il utilise **Claude Sonnet 4 avec Extended Thinking** pour analyser, classifier, filtrer et enrichir les documents avant de les intégrer à la base vectorielle.

### 🎯 Objectifs

1. **Filtrer le bruit:** Exclure le contenu non pertinent (disclaimers, tables des matières, etc.)
2. **Classifier le contenu:** Identifier le type de document et catégoriser les sections
3. **Extraire des métadonnées:** Récupérer automatiquement prix, clauses, concurrents, dates, etc.
4. **Détecter des signaux:** Identifier automatiquement les événements importants (recrutement, prix, produits)
5. **Enrichir le RAG:** Améliorer la qualité des résultats de recherche avec des métadonnées structurées

---

## 🏗️ Architecture

### Nouveau flux de traitement de documents

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD                                                       │
│    User téléverse document.pdf                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXTRACTION TEXTE                                             │
│    • pdf-parse extrait le texte brut                            │
│    • Résultat: rawText (texte complet du PDF)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ⭐ ANALYSE INTELLIGENTE (NOUVEAU)                            │
│                                                                 │
│    Claude Sonnet 4 + Extended Thinking (3000 tokens)           │
│                                                                 │
│    Input:  rawText + config d'analyse                          │
│    Output: DocumentAnalysis {                                  │
│      documentType: "contract" | "rfp" | "financial_report"..   │
│      sections: [                                               │
│        { type, relevanceScore, shouldIndex, content }          │
│      ],                                                        │
│      metadata: {                                               │
│        competitors, pricing, clauses, hiringData, etc.         │
│      },                                                        │
│      signals: [                                                │
│        { type: "hiring_spike", severity: "high", ... }         │
│      ],                                                        │
│      reasoning: "..." (thinking du modèle)                     │
│    }                                                           │
│                                                                 │
│    ⚙️ Règles configurables:                                     │
│    • Seuil de pertinence (défaut: 7/10)                        │
│    • Patterns d'exclusion (regex + keywords)                   │
│    • Métadonnées à extraire par type de document               │
│    • Règles de détection de signaux                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. FILTRAGE                                                     │
│    • Garde seulement sections.shouldIndex === true             │
│    • Exclut sections avec relevanceScore < 7                   │
│    • Log: sections exclues avec raison                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CHUNKING INTELLIGENT                                         │
│    • Chunk seulement le contenu filtré                         │
│    • Préserve les frontières de sections                       │
│    • Overlap de 200 caractères                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. VECTORISATION ENRICHIE                                       │
│    • OpenAI text-embedding-3-large (1536 dimensions)           │
│    • Métadonnées enrichies par chunk:                          │
│      - document_type, industry, language                       │
│      - competitors[], strategic_themes[]                       │
│      - pricing_model, contract_type, rfp_deadline              │
│      - hiring_companies[], hiring_positions[]                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. STOCKAGE PINECONE                                            │
│    • Vecteurs + métadonnées enrichies                          │
│    • Filtrage multi-tenant via tenant_id                       │
│    • Requêtes filtrées possibles:                              │
│      "Tous les contrats Q4 2024 avec Competitor X"             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. SAUVEGARDE SIGNAUX                                           │
│    • Création d'entrées dans table `signals`                   │
│    • Statut: "new" (à reviewer)                                │
│    • Lien vers document et concurrent                          │
│    • Peut déclencher alertes automatiques                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. MISE À JOUR DOCUMENT                                         │
│    • Sauvegarde de l'analyse complète dans metadata (JSONB)    │
│    • documentType, analysisConfidence, analysisCompleted        │
│    • Statistiques: sectionsAnalyzed, sectionsIndexed            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Fichiers créés/modifiés

### Nouveaux fichiers

1. **`src/lib/rag/analysis-config.ts`**
   - Configuration des règles d'analyse
   - Types de documents supportés
   - Règles d'exclusion configurables
   - Définition des métadonnées à extraire
   - Règles de détection de signaux

2. **`src/lib/rag/intelligent-preprocessor.ts`**
   - Module principal d'analyse intelligente
   - Fonction `analyzeDocument()` qui appelle Claude Sonnet 4
   - Construction du prompt avec règles configurées
   - Parsing et validation de la réponse JSON
   - Helpers pour extraction de contenu indexable

### Fichiers modifiés

3. **`src/db/schema.ts`**
   - Ajout de champs dans `documents`:
     - `documentType` (varchar 50)
     - `analysisCompleted` (boolean)
     - `analysisConfidence` (integer 0-100)
   - Nouvelle table `signals`:
     - `type`, `severity`, `summary`, `details`
     - `status` (new, reviewed, archived)
     - Relations vers document, company, competitor

4. **`src/app/api/companies/[slug]/documents/upload/route.ts`**
   - Intégration de l'analyse intelligente dans le flux
   - Appel à `analyzeDocument()` après extraction texte
   - Filtrage des sections non pertinentes
   - Sauvegarde des signaux détectés
   - Métadonnées enrichies dans Pinecone

---

## 🔧 Configuration

### Types de documents supportés

```typescript
type DocumentType =
  | "competitive_report"    // Rapport concurrentiel
  | "financial_report"      // Rapport financier (Q1, Q2, etc.)
  | "market_analysis"       // Analyse de marché
  | "product_spec"          // Spécification produit
  | "press_article"         // Article de presse
  | "contract"              // Contrat client/fournisseur
  | "rfp"                   // Appel d'offres (Request for Proposal)
  | "deep_research"         // Recherche approfondie
  | "other";
```

### Règles d'exclusion par défaut

| Règle | Description | Activée | Patterns |
|-------|-------------|---------|----------|
| `disclaimer` | Disclaimers légaux | ✅ | "disclaimer", "copyright", "confidential" |
| `table_of_contents` | Tables des matières | ✅ | "table of contents", "sommaire", "index" |
| `bibliography` | Bibliographies | ✅ | "bibliography", "références", "works cited" |
| `appendix` | Annexes techniques | ❌ | "appendix", "annexe" |
| `cover_page` | Pages de garde | ✅ | Regex: titres majuscules seuls |

**Configuration:** Modifiable dans `DEFAULT_ANALYSIS_CONFIG` (`analysis-config.ts`)

### Métadonnées extraites par type

#### Contrats (`contract`)
```typescript
{
  contractType: "SaaS" | "Service" | "License",
  parties: ["Company A", "Company B"],
  pricing: {
    model: "subscription" | "usage-based" | "fixed",
    amount: "$99/month",
    currency: "USD"
  },
  terms: {
    duration: "12 months",
    startDate: "2024-01-01",
    endDate: "2024-12-31"
  },
  clauses: [
    { type: "SLA", summary: "99.9% uptime guarantee" },
    { type: "confidentiality", summary: "3-year NDA" }
  ],
  paymentTerms: {
    schedule: "monthly",
    method: "ACH"
  },
  renewalTerms: {
    autoRenewal: true,
    noticePeriod: "30 days"
  }
}
```

#### Appels d'offres (`rfp`)
```typescript
{
  issuer: "Government Agency XYZ",
  deadline: "2024-12-31",
  budget: {
    min: "$500K",
    max: "$2M",
    currency: "USD"
  },
  requirements: [
    "Cloud-native architecture",
    "SOC 2 Type II compliance",
    "Multi-tenant SaaS"
  ],
  evaluationCriteria: [
    "Technical capability (40%)",
    "Price (30%)",
    "Experience (30%)"
  ],
  scope: "Enterprise CRM system for 10,000 users"
}
```

#### Rapports concurrentiels (`competitive_report`)
```typescript
{
  competitors: ["Competitor A", "Competitor B"],
  dateRange: "Q4 2024",
  strategicThemes: ["AI adoption", "Market expansion"],
  products: ["Product X v2", "Product Y"],
  marketSegments: ["Enterprise", "SMB"],
  keyMetrics: [
    { name: "Revenue", value: "$100M", change: "+25%" },
    { name: "Customers", value: "5000", change: "+15%" }
  ]
}
```

#### Données d'embauche (extraction universelle)
```typescript
hiringData: {
  companies: ["Competitor A", "Competitor B"],
  positions: [
    { title: "Senior AI Engineer", department: "Engineering", count: 5 },
    { title: "Product Manager", department: "Product", count: 3 }
  ],
  trends: "40% increase in engineering hiring vs last quarter"
}
```

---

## 🚨 Détection de signaux

### Signaux automatiques

Le système détecte automatiquement 5 types de signaux:

| Type | Trigger | Priorité | Action |
|------|---------|----------|--------|
| `competitor_mention` | Concurrent mentionné dans doc | Medium | Alerte |
| `price_change` | Changement de prix détecté | High | Alerte |
| `hiring_spike` | 5+ postes ouverts | High | Alerte |
| `new_product` | Lancement produit concurrent | High | Alerte |
| `contract_win` | Concurrent remporte contrat | High | Alerte |

### Exemple de signal détecté

```json
{
  "type": "hiring_spike",
  "severity": "high",
  "summary": "Competitor A increased engineering hiring by 40%",
  "details": "5 Senior AI Engineer positions posted in the last month, indicating significant R&D expansion",
  "relatedEntities": ["Competitor A", "Engineering Department"]
}
```

**Stockage:** Table `signals` avec statut "new" → peut être reviewed manuellement

---

## 📊 Exemple complet d'analyse

### Input (Document PDF)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCLAIMER: Confidential - Do not distribute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE OF CONTENTS
1. Executive Summary ............. 3
2. Market Analysis ............... 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTIVE SUMMARY

Q4 2024 Competitive Landscape

Competitor X launched new AI-powered analytics platform
with subscription pricing at $149/month (down from $199).

They've opened 8 new engineering positions focused on
machine learning and data science.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKET TRENDS

The competitive intelligence market is growing at 25% CAGR...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Output (DocumentAnalysis)

```json
{
  "documentType": "competitive_report",
  "industry": "SaaS",
  "language": "en",
  "confidence": 0.95,

  "sections": [
    {
      "id": "section-1",
      "title": "Disclaimer",
      "content": "DISCLAIMER: Confidential - Do not distribute",
      "type": "non_relevant",
      "relevanceScore": 0,
      "shouldIndex": false,
      "tags": [],
      "reasoning": "Legal disclaimer - no business intelligence value"
    },
    {
      "id": "section-2",
      "title": "Table of Contents",
      "type": "non_relevant",
      "relevanceScore": 0,
      "shouldIndex": false,
      "tags": [],
      "reasoning": "Navigation only"
    },
    {
      "id": "section-3",
      "title": "Executive Summary",
      "content": "Q4 2024 Competitive Landscape\n\nCompetitor X launched...",
      "type": "competitive_analysis",
      "relevanceScore": 10,
      "shouldIndex": true,
      "tags": ["Competitor X", "Q4 2024", "pricing", "hiring", "AI platform"],
      "reasoning": "Critical competitive intelligence with pricing and hiring signals"
    },
    {
      "id": "section-4",
      "title": "Market Trends",
      "content": "The competitive intelligence market is growing...",
      "type": "market_trends",
      "relevanceScore": 9,
      "shouldIndex": true,
      "tags": ["market growth", "CAGR"],
      "reasoning": "Valuable market context for strategic planning"
    }
  ],

  "metadata": {
    "dateRange": "Q4 2024",
    "competitors": ["Competitor X"],
    "strategicThemes": ["AI adoption", "Pricing pressure"],
    "products": ["AI-powered analytics platform"],

    "hiringData": {
      "companies": ["Competitor X"],
      "positions": [
        {
          "title": "Machine Learning Engineer",
          "department": "Engineering",
          "count": 8
        }
      ],
      "trends": "Significant R&D expansion in AI/ML"
    }
  },

  "signals": [
    {
      "type": "price_change",
      "severity": "high",
      "summary": "Competitor X reduced pricing by 25%",
      "details": "Subscription price dropped from $199/month to $149/month for AI analytics platform",
      "relatedEntities": ["Competitor X", "AI-powered analytics platform"]
    },
    {
      "type": "hiring_spike",
      "severity": "high",
      "summary": "Competitor X hiring 8 ML engineers",
      "details": "8 new positions in machine learning and data science indicate major R&D investment",
      "relatedEntities": ["Competitor X"]
    },
    {
      "type": "new_product",
      "severity": "high",
      "summary": "Competitor X launched AI-powered analytics",
      "details": "New platform competes directly with our analytics offering",
      "relatedEntities": ["Competitor X", "AI-powered analytics platform"]
    }
  ],

  "excludedSections": [
    {
      "title": "Disclaimer",
      "reason": "Legal disclaimer matched exclusion rule 'disclaimer'",
      "preview": "DISCLAIMER: Confidential - Do not distribute"
    },
    {
      "title": "Table of Contents",
      "reason": "Navigation content matched exclusion rule 'table_of_contents'",
      "preview": "TABLE OF CONTENTS\n1. Executive Summary ......."
    }
  ],

  "reasoning": "[Extended thinking from Claude Sonnet 4]\n\nThis document is clearly a competitive intelligence report focusing on Q4 2024. The key signals are:\n\n1. Pricing change: The $50/month reduction (25%) is significant and suggests competitive pressure...\n2. Hiring spike: 8 ML positions indicates serious R&D investment...\n3. Product launch: Direct competitive threat to our analytics offering...\n\nI should exclude the disclaimer and TOC but keep all substantive sections..."
}
```

### Résultat final

**Indexé dans Pinecone:**
- ✅ Section 3 (Executive Summary) → 3 chunks
- ✅ Section 4 (Market Trends) → 2 chunks
- ❌ Section 1 (Disclaimer) → Exclu
- ❌ Section 2 (TOC) → Exclu

**Métadonnées vectorielles:**
```typescript
{
  tenant_id: "company-abc",
  document_id: "doc-123",
  document_type: "competitive_report",
  industry: "SaaS",
  language: "en",
  competitors: ["Competitor X"],
  strategic_themes: ["AI adoption", "Pricing pressure"],
  hiring_companies: ["Competitor X"],
  date_range: "Q4 2024"
}
```

**Signaux créés (table `signals`):**
- 🔴 High: Price change -25%
- 🔴 High: Hiring spike (8 positions)
- 🔴 High: New product launch

---

## 🎯 Avantages du système

### 1. Qualité du RAG améliorée
- **Moins de bruit:** Seulement le contenu pertinent est indexé
- **Résultats plus précis:** Métadonnées enrichies permettent un filtrage fin
- **Contexte préservé:** Sections logiques maintenues pendant le chunking

### 2. Recherche avancée possible

Exemples de requêtes filtrées:
```typescript
// Tous les contrats SaaS avec Competitor X
filter: {
  document_type: "contract",
  contract_type: "SaaS",
  competitors: { $in: ["Competitor X"] }
}

// Rapports Q4 mentionnant des changements de prix
filter: {
  document_type: { $in: ["competitive_report", "market_analysis"] },
  date_range: "Q4 2024",
  strategic_themes: { $in: ["pricing"] }
}

// Documents avec recrutement en IA/ML
filter: {
  hiring_positions: { $in: ["Machine Learning Engineer", "AI Engineer"] }
}
```

### 3. Détection automatique de signaux
- Les événements importants sont flaggés automatiquement
- Permet de créer des alertes en temps réel
- Alimente le dashboard avec des insights actionnables

### 4. Métadonnées structurées
- Prix, clauses, dates extraits automatiquement
- Peut alimenter d'autres modules (pricing tracker, contract management)
- Base pour analytics avancés

---

## 🔮 Extensions futures

### Phase 1: Interface de configuration (Settings)
- [ ] Page "Analyse Rules" dans Settings
- [ ] Toggle pour activer/désactiver les règles d'exclusion
- [ ] Édition des seuils de pertinence
- [ ] Gestion des patterns d'exclusion custom

### Phase 2: Revue des signaux
- [ ] Page "Signaux détectés" dans le dashboard
- [ ] Workflow de review (approve/dismiss)
- [ ] Création d'alertes manuelles depuis signaux
- [ ] Historique des signaux par concurrent

### Phase 3: Analytics d'analyse
- [ ] Dashboard: "Documents analysés par type"
- [ ] Graphique: "Confiance moyenne par type de doc"
- [ ] Rapport: "Signaux détectés ce mois-ci"
- [ ] Tendances: "Thèmes stratégiques émergents"

### Phase 4: Analyse multimodale
- [ ] Support des images (diagrammes, screenshots)
- [ ] Extraction de tableaux (pricing grids)
- [ ] Analyse de slides (PowerPoint, PDF)

---

## 📝 Notes techniques

### Performance
- **Temps d'analyse:** ~10-30 secondes par document (dépend de la longueur)
- **Coût:** ~$0.05-0.15 par document (Claude Sonnet 4 + thinking)
- **Tokens thinking:** Budget de 3000 tokens pour raisonnement approfondi

### Recommandations production
1. **File d'attente:** Utiliser BullMQ ou Inngest pour processing async
2. **Retry logic:** 3 tentatives avec backoff exponentiel
3. **Monitoring:** Track temps d'analyse et coûts par type de document
4. **Cache:** Sauvegarder l'analyse complète pour éviter re-processing

### Variables d'environnement requises
```bash
ANTHROPIC_API_KEY=sk-ant-...    # Claude Sonnet 4
OPENAI_API_KEY=sk-...           # Embeddings
PINECONE_API_KEY=...            # Vector DB
```

---

## ✅ Checklist de test

Pour tester le système:

1. **Upload un contrat PDF**
   - ✅ Vérifie que `documentType === "contract"`
   - ✅ Vérifie que `metadata.pricing` est extrait
   - ✅ Vérifie que `metadata.clauses` contient les clauses importantes

2. **Upload un rapport concurrentiel**
   - ✅ Vérifie que les concurrents sont détectés
   - ✅ Vérifie qu'au moins 1 signal est créé
   - ✅ Vérifie que la table `signals` contient l'entrée

3. **Upload un document avec disclaimer**
   - ✅ Vérifie que le disclaimer est dans `excludedSections`
   - ✅ Vérifie que `sectionsIndexed < sectionsAnalyzed`

4. **Upload un appel d'offres**
   - ✅ Vérifie que `metadata.deadline` est extrait
   - ✅ Vérifie que `metadata.budget` est structuré
   - ✅ Vérifie que `metadata.requirements` est une liste

---

**Créé le:** 2025-11-02
**Dernière mise à jour:** 2025-11-02
**Version:** 1.0
**Auteur:** Claude Code + Jonathan Gaudette
**Statut:** ✅ Production-ready (nécessite configuration des variables d'environnement)
