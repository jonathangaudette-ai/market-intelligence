# Analyse Complète des Fonctionnalités - Section Compétiteurs (Vision 2025+ IA-First)

**Date:** 14 novembre 2025
**Version:** 2.0 - Approche Moderne & IA-Native
**Contexte:** Révolution post-Klue/Crayon avec l'IA générative avancée

---

## 🎯 Vision Stratégique : Au-delà de Klue et Crayon

### Pourquoi réinventer la roue en 2025 ?

**Klue et Crayon = architectures conçues en 2014-2016**, avant :
- GPT-4, Claude 3.5 Sonnet (2023-2025)
- Vision multimodale (GPT-4 Vision, Claude 3.5 Sonnet vision)
- Agents IA autonomes
- RAG avec vecteurs (Pinecone, embeddings avancés)
- Graphes de connaissances intelligents

**Notre approche : Plateforme IA-Native, pas IA-ajoutée**

---

## 📊 État Actuel du Codebase

### ✅ Ce qui existe déjà

**1. Schéma de Base de Données (Complet)**
- Table `competitors` avec tous les champs nécessaires
- Relations avec `documents`, `signals`, `companies`
- Support `metadata` JSONB pour flexibilité
- Champs: `priority`, `industry`, `website`, `linkedinId`, `logo`, `description`

**2. Interface Utilisateur (Mock Data)**
- Page `/companies/[slug]/competitors` avec design complet
- Cartes de compétiteurs avec stats
- Filtres par priorité (high/medium/low)
- Badges et liens vers LinkedIn/websites
- **PROBLÈME:** Données hardcodées (4 compétiteurs fictifs)

**3. Intégrations Existantes**
- Navigation sidebar (lien "Concurrents")
- Dashboard affiche stats compétiteurs
- Documents peuvent être liés à des compétiteurs
- Signals peuvent référencer des compétiteurs

### ❌ Ce qui manque (Critical)

1. **API Routes** - Aucun endpoint `/api/companies/[slug]/competitors`
2. **Formulaires** - Pas de modal "Add Competitor" fonctionnel
3. **Intelligence IA** - Zéro automatisation, tout manuel
4. **Profils enrichis** - Pas de scraping/enrichissement auto
5. **Battlecards** - Pas implémenté (prévu Module 4 specs)
6. **Win/Loss Analysis** - Pas implémenté (prévu Module 6 specs)
7. **Knowledge Graph** - Pas implémenté (prévu Module 3 specs)
8. **Analyse comparative automatique** - Inexistant

---

## 🚀 Architecture Moderne IA-First : 7 Couches Intelligentes

### Vision Globale

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 7: PRÉDICTION & ANTICIPATION (IA Avancée)            │
│  → Prédire les mouvements compétiteurs avant qu'ils arrivent│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 6: AGENTS AUTONOMES (Auto-Research)                   │
│  → Agents qui surveillent et analysent 24/7 sans intervention│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: INTELLIGENCE MULTIMODALE (Vision + Text)           │
│  → Analyse UI/UX, screenshots, vidéos, design compétiteur   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: BATTLECARDS DYNAMIQUES (Auto-Generated)            │
│  → Battlecards générées et mises à jour par IA en temps réel│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: ENRICHISSEMENT AUTO (AI-Powered Scraping)          │
│  → Collecte et enrichissement automatique des profils       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: KNOWLEDGE GRAPH (Relations Intelligentes)          │
│  → Graphe relationnel entre concurrents, personnes, produits│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: CRUD DE BASE (Foundation)                          │
│  → Création, lecture, modification, suppression manuelle    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ LAYER 1 : CRUD de Base (Fondation Essentielle)

### Objectif
Permettre la gestion manuelle basique des compétiteurs (comme Klue/Crayon font déjà).

### Fonctionnalités Détaillées

#### 1.1 Création de Compétiteur

**Formulaire "Add Competitor"**

**Champs Obligatoires:**
```typescript
interface CompetitorFormRequired {
  name: string;              // Nom du compétiteur (ex: "Salesforce")
  website: string;           // URL site web principal
  priority: 'high' | 'medium' | 'low';  // Niveau de priorité
}
```

**Champs Optionnels (enrichis auto si vides):**
```typescript
interface CompetitorFormOptional {
  linkedinId?: string;       // LinkedIn Company ID ou URL
  industry?: string;         // Industrie principale
  description?: string;      // Description courte (1-2 phrases)
  logo?: string;            // URL du logo (auto-fetché si possible)
  headquarters?: string;     // Ville, Pays
  foundedYear?: number;      // Année de fondation
  employeeCount?: string;    // "50-200", "1000-5000", etc.
  fundingTotal?: number;     // Financement total levé (USD)
  isPublic?: boolean;        // Société publique ou privée
}
```

**Métadonnées Étendues (JSONB):**
```typescript
interface CompetitorMetadata {
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    github?: string;
  };
  keyPeople?: {
    ceo?: { name: string; linkedinUrl?: string };
    cto?: { name: string; linkedinUrl?: string };
    cmo?: { name: string; linkedinUrl?: string };
  };
  productCategories?: string[];  // ["CRM", "Sales Automation"]
  targetMarket?: string[];       // ["SMB", "Enterprise"]
  pricingModel?: "Freemium" | "Subscription" | "One-time" | "Usage-based";
  techStack?: string[];          // Technologies utilisées
  certifications?: string[];     // ISO, SOC2, GDPR, etc.
  tags?: string[];              // Tags personnalisés
}
```

**Validations:**
- `name` : unique par company, 2-100 caractères
- `website` : format URL valide, vérification domaine existe
- `linkedinId` : si fourni, validation format LinkedIn
- `logo` : si URL fournie, vérification image accessible

**UX/UI:**
- Modal overlay avec 3 étapes :
  1. **Informations de base** (name, website, priority)
  2. **Détails optionnels** (industry, description, logo)
  3. **Enrichissement auto** : "Voulez-vous enrichir ce profil automatiquement ?" → Layer 3

**API:**
```
POST /api/companies/[slug]/competitors
Body: CompetitorFormRequired & CompetitorFormOptional & { metadata?: CompetitorMetadata }
Response: { id, ...competitor, enrichmentStatus: 'pending' | 'completed' | 'failed' }
```

---

#### 1.2 Liste des Compétiteurs

**Vue Grille (Card View) - Existante**
- ✅ Design déjà implémenté (page.tsx actuelle)
- Carte par compétiteur avec :
  - Logo + Nom
  - Badge de priorité (High=rouge, Medium=orange, Low=vert)
  - Industry tag
  - Icônes : Website, LinkedIn
  - Bouton "View Details"
  - Last updated timestamp

**Vue Tableau (Table View) - À ajouter**
```
| Logo | Nom          | Industry      | Priority | Website   | LinkedIn | Documents | Last Updated | Actions |
|------|--------------|---------------|----------|-----------|----------|-----------|--------------|---------|
| [🏢] | Salesforce   | CRM           | High     | [🔗]      | [👔]     | 12        | 2h ago       | [...] |
| [🏢] | HubSpot      | Marketing     | High     | [🔗]      | [👔]     | 8         | 1d ago       | [...] |
| [🏢] | Pipedrive    | Sales CRM     | Medium   | [🔗]      | [👔]     | 3         | 3d ago       | [...] |
```

**Filtres et Tri:**
- **Filtres:**
  - Par priorité (All, High, Medium, Low)
  - Par industrie (dropdown multi-select)
  - Par statut (Active, Archived)
  - Par présence de battlecard (Has Battlecard, No Battlecard)
  - Par documents liés (0, 1-5, 6-10, 10+)

- **Tri:**
  - Par nom (A-Z, Z-A)
  - Par priorité (High first, Low first)
  - Par dernière mise à jour (Recent first, Oldest first)
  - Par nombre de documents (Most, Least)

**Recherche:**
- Barre de recherche full-text sur `name`, `description`, `industry`
- Support recherche floue (typo tolerance)

**Statistiques (Dashboard Cards):**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total       │ High        │ Documents   │ LinkedIn    │
│ Competitors │ Priority    │ Linked      │ Profiles    │
│             │             │             │             │
│    24       │     8       │    156      │     22      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**API:**
```
GET /api/companies/[slug]/competitors?
  priority=high,medium&
  industry=CRM,Sales&
  search=salesforce&
  sortBy=priority&
  sortOrder=desc&
  page=1&
  limit=20

Response: {
  competitors: Competitor[],
  pagination: { total, page, limit, totalPages },
  stats: { total, highPriority, mediumPriority, lowPriority }
}
```

---

#### 1.3 Profil Détaillé de Compétiteur

**Nouvelle Page:** `/companies/[slug]/competitors/[competitorId]`

**Layout en Onglets:**

**Tab 1: Overview (Vue d'ensemble)**
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  SALESFORCE                        [Edit] [Archive] │
│          CRM & Sales Platform                                │
│          🌐 salesforce.com  💼 /company/salesforce          │
├─────────────────────────────────────────────────────────────┤
│  📍 San Francisco, CA     👥 73,000+ employees              │
│  📅 Founded 1999          💰 Public (NYSE: CRM)             │
│  🏆 Priority: HIGH        🔖 Tags: Enterprise, Cloud, AI    │
├─────────────────────────────────────────────────────────────┤
│  DESCRIPTION                                                 │
│  Cloud-based CRM platform leader with sales, service,       │
│  marketing automation. Known for extensive ecosystem and    │
│  AI capabilities (Einstein AI).                              │
├─────────────────────────────────────────────────────────────┤
│  KEY PEOPLE                                                  │
│  • Marc Benioff - CEO & Co-Founder                          │
│  • Brian Millham - President & COO                          │
│  • Amy Weaver - CFO                                         │
├─────────────────────────────────────────────────────────────┤
│  QUICK STATS                                                 │
│  📄 Documents: 24    🎯 Battlecards: 2    📊 Signals: 18   │
│  📈 Win Rate vs them: 68%    💼 Deals competed: 45          │
└─────────────────────────────────────────────────────────────┘
```

**Tab 2: Intelligence (Documents & Signals liés)**
- Liste des documents taggés avec ce compétiteur
- Signaux détectés (prix, produit, RH, etc.)
- Timeline des événements récents
- Notes internes (Confluence-style collaborative notes)

**Tab 3: Battlecards (si implémenté Layer 4)**
- Battlecards actives pour ce compétiteur
- Bouton "Generate New Battlecard" (IA)

**Tab 4: Win/Loss Analysis (si implémenté Layer 6)**
- Win rate contre ce compétiteur
- Raisons de victoires/défaites
- Deals récents (won/lost)
- Insights de Gong/Chorus

**Tab 5: Relationships (Knowledge Graph Layer 2)**
- Graphe visuel des relations
- Partenaires, investisseurs, clients communs
- Anciens employés chez nous
- Technologies partagées

**Tab 6: Activity Log**
- Historique de toutes les modifications
- Qui a ajouté/modifié quoi et quand
- Enrichissements automatiques effectués

**API:**
```
GET /api/companies/[slug]/competitors/[id]
Response: {
  competitor: Competitor,
  stats: { documentCount, battlecardCount, signalCount, winRate },
  recentActivity: Activity[],
  relatedDocuments: Document[],
  relatedSignals: Signal[]
}
```

---

#### 1.4 Modification de Compétiteur

**Formulaire d'édition (même structure que création)**
- Tous les champs éditables
- Historique des changements visible (audit trail)
- Option "Re-enrich Profile" pour relancer scraping

**Permissions:**
- `admin` : modification complète
- `editor` : modification sauf suppression
- `viewer` : lecture seule

**API:**
```
PATCH /api/companies/[slug]/competitors/[id]
Body: Partial<Competitor>
Response: { id, ...updatedCompetitor }
```

---

#### 1.5 Suppression de Compétiteur

**Soft Delete vs Hard Delete:**
- **Soft Delete (défaut):** `isActive = false`, données conservées
- **Hard Delete (admin only):** Suppression permanente + cascade sur relations

**Confirmation Modal:**
```
⚠️ Delete Competitor: Salesforce?

This competitor is linked to:
• 24 documents
• 2 battlecards
• 18 signals
• 12 win/loss records

□ Archive instead (recommended - keeps data for analysis)
□ Permanently delete (cannot be undone)

[Cancel] [Archive] [Delete Permanently]
```

**API:**
```
DELETE /api/companies/[slug]/competitors/[id]?mode=soft|hard
Response: { success: true, mode: 'soft' | 'hard' }
```

---

## 🧠 LAYER 2 : Knowledge Graph (Relations Intelligentes)

### Objectif
Mapper l'écosystème compétitif : qui connaît qui, qui a travaillé où, qui investit dans qui, quelles technos sont communes, etc.

**Innovation vs Klue/Crayon:** Graphe de connaissances natif, pas juste des liens basiques.

### Entités du Graphe

**Déjà dans le schéma DB (schema.ts):**
- `companies` (nous)
- `competitors`
- `people` (employés, leaders)
- `investors` (VCs, angels)
- `technologies` (stack technique)

**Relations Types (entity_relationships table):**
```typescript
type RelationType =
  | 'COMPETES_WITH'              // Competitor A vs Competitor B
  | 'PARTNERS_WITH'              // Partenariat stratégique
  | 'ACQUIRED_BY'                // Acquisition
  | 'FUNDED_BY'                  // Investisseur → Company
  | 'WORKS_AT'                   // Personne → Company (actuel)
  | 'FORMERLY_WORKED_AT'         // Personne → Company (passé)
  | 'USES_TECHNOLOGY'            // Company → Tech
  | 'INTEGRATES_WITH'            // Product A ↔ Product B
  | 'CUSTOMER_OF'                // Company A client de B
  | 'SUPPLIER_TO';               // Company A fournit à B
```

### Fonctionnalités du Knowledge Graph

#### 2.1 Visualisation du Graphe

**Graphe Interactif (D3.js ou vis.js)**

**Vue "Competitor Ecosystem":**
```
                    [Investor A]
                         │
                    (FUNDED_BY)
                         │
    [Tech Stack] ────(USES)──── [COMPETITOR X] ────(COMPETES_WITH)──── [Notre Co]
         │                             │
    (USES)                       (PARTNERS_WITH)
         │                             │
    [Concurrent Y]                [Partner B]
         │
    (FORMERLY_WORKED_AT)
         │
    [John Doe - CEO chez nous]
```

**Interactions:**
- Click sur nœud → Affiche détails
- Hover → Tooltip avec infos rapides
- Filter par type de relation
- Zoom in/out, drag nodes
- Export PNG/SVG

**API:**
```
GET /api/companies/[slug]/competitors/[id]/graph?depth=2
Response: {
  nodes: [{ id, type, label, metadata }],
  edges: [{ from, to, type, label }]
}
```

---

#### 2.2 Requêtes Intelligentes sur le Graphe

**Exemples de Questions Automatiques (SQL CTEs ou Graph Query):**

**Q1: "Quels anciens employés de nos concurrents travaillent maintenant chez nous ?"**
```sql
SELECT
  p.name,
  p.current_title,
  c.name as former_company
FROM people p
JOIN entity_relationships er_current
  ON er_current.entity_from_id = p.id
  AND er_current.relationship_type = 'WORKS_AT'
JOIN companies our_co
  ON our_co.id = er_current.entity_to_id
JOIN entity_relationships er_former
  ON er_former.entity_from_id = p.id
  AND er_former.relationship_type = 'FORMERLY_WORKED_AT'
JOIN competitors c
  ON c.id = er_former.entity_to_id
WHERE our_co.id = :currentCompanyId
ORDER BY p.name;
```

**Q2: "Quels VCs ont investi dans plusieurs de nos concurrents ?"**
```sql
SELECT
  i.name as investor_name,
  COUNT(DISTINCT c.id) as num_competitors_funded,
  STRING_AGG(c.name, ', ') as competitors
FROM investors i
JOIN entity_relationships er
  ON er.entity_from_id = i.id
  AND er.relationship_type = 'FUNDED_BY'
JOIN competitors c ON c.id = er.entity_to_id
WHERE c.company_id = :currentCompanyId
  AND c.is_active = true
GROUP BY i.id, i.name
HAVING COUNT(DISTINCT c.id) >= 2
ORDER BY num_competitors_funded DESC;
```

**Q3: "Quelles technologies sont utilisées par nos concurrents mais pas par nous ?"**
```sql
SELECT
  t.name as technology,
  t.category,
  COUNT(DISTINCT c.id) as num_competitors_using,
  STRING_AGG(DISTINCT c.name, ', ') as used_by
FROM technologies t
JOIN entity_relationships er_tech
  ON er_tech.entity_to_id = t.id
  AND er_tech.relationship_type = 'USES_TECHNOLOGY'
JOIN competitors c
  ON c.id = er_tech.entity_from_id
WHERE c.company_id = :currentCompanyId
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM entity_relationships er_our
    WHERE er_our.entity_from_id = :currentCompanyId
      AND er_our.entity_to_id = t.id
      AND er_our.relationship_type = 'USES_TECHNOLOGY'
  )
GROUP BY t.id, t.name, t.category
ORDER BY num_competitors_using DESC;
```

**UI pour ces insights:**
- Dashboard "Competitive Intelligence Insights"
- Cartes cliquables avec les questions pré-définies
- Résultats affichés en tableau + graphe visuel
- Export CSV/Excel

---

#### 2.3 Construction Automatique du Graphe (IA-Powered)

**Sources pour auto-population:**

**1. LinkedIn Data (via Proxycurl API)**
- Scraping profils employés
- Extraction historique emploi
- Identification CEO, CTO, executives

**2. Crunchbase / PitchBook API**
- Données de financement
- Investisseurs
- Acquisitions

**3. BuiltWith / Wappalyzer**
- Détection stack technique concurrent
- Technologies utilisées

**4. News Articles & Press Releases (LLM Extraction)**
- Parsing articles avec Claude 3.5 Sonnet
- Extraction de relations : partnerships, acquisitions, etc.

**Exemple de Prompt pour LLM:**
```
Article: "Acme Corp announced partnership with BigCo to integrate their API"

Extract entities and relationships in JSON:
{
  "entities": [
    { "name": "Acme Corp", "type": "company" },
    { "name": "BigCo", "type": "company" }
  ],
  "relationships": [
    { "from": "Acme Corp", "to": "BigCo", "type": "PARTNERS_WITH" },
    { "from": "Acme Corp", "to": "BigCo API", "type": "INTEGRATES_WITH" }
  ]
}
```

**Process Automatisé:**
1. Document ou signal créé → Trigger
2. LLM analyse le texte → Extraction entités/relations
3. Entity Resolution (déduplication)
4. Insertion dans `entity_relationships` table
5. Notification : "New relationship discovered: [X] partners with [Y]"

---

## 🔍 LAYER 3 : Enrichissement Automatique (IA-Powered Scraping)

### Objectif
Quand un compétiteur est créé avec juste un nom et website, **enrichir automatiquement** son profil avec des données publiques.

**Innovation vs Klue/Crayon:** Enrichissement multimodal (vision + texte), pas juste scraping basique.

### Sources d'Enrichissement

#### 3.1 Scraping Website Concurrent

**Outil:** Firecrawl API ou Apify Actors

**Données à extraire:**

**Homepage Analysis:**
- Logo (high-res)
- Tagline / Value proposition
- Hero message
- Screenshots de produit (pour analyse visuelle Layer 5)
- Call-to-action principal

**About Page:**
- Description complète de l'entreprise
- Mission, vision
- Année de fondation
- Localisation HQ
- Taille de l'équipe

**Pricing Page:**
- Structure de pricing (Freemium, Tiers, Enterprise)
- Prix publics si disponibles
- Features par plan
- Comparaison plan

**Careers/Jobs Page:**
- Nombre de postes ouverts (indicateur de croissance)
- Départements qui recrutent (Sales ↑ = expansion, Eng ↑ = développement produit)
- Stack technique mentionné dans offres

**Blog/News:**
- Articles récents (3 derniers mois)
- Topics traités (indique focus stratégique)
- Fréquence de publication

**Exemple de Scraping Automation:**
```typescript
async function enrichCompetitorFromWebsite(competitorId: string) {
  const competitor = await db.competitors.findById(competitorId);

  // 1. Scrape homepage
  const homepage = await firecrawl.scrape(competitor.website);

  // 2. Extract with Claude 3.5 Sonnet
  const extracted = await claude.messages.create({
    model: "claude-3-5-sonnet-20250929",
    messages: [{
      role: "user",
      content: `Analyze this homepage and extract:
      - Company tagline
      - Main value proposition (1 sentence)
      - Primary product categories
      - Target customer segments

      HTML: ${homepage.html}

      Return JSON only.`
    }]
  });

  // 3. Update competitor
  await db.competitors.update(competitorId, {
    description: extracted.value_proposition,
    metadata: {
      tagline: extracted.tagline,
      productCategories: extracted.categories,
      targetMarket: extracted.segments
    }
  });

  // 4. Scrape other pages (pricing, about, careers)
  // ...
}
```

---

#### 3.2 LinkedIn Company Data (Proxycurl API)

**Endpoint:** `GET /api/linkedin/company`

**Données extraites:**
```typescript
interface LinkedInCompanyData {
  name: string;
  description: string;
  website: string;
  logo: string;
  industry: string;
  companySize: string;          // "51-200 employees"
  headquarters: string;
  foundedYear: number;
  specialties: string[];
  employeeCount: number;
  followerCount: number;
  tagline: string;

  recentUpdates: {
    title: string;
    date: string;
    content: string;
  }[];

  keyPeople: {
    name: string;
    title: string;
    linkedinUrl: string;
  }[];
}
```

**Utilisation:**
- Valider/compléter données existantes
- Identifier CEO, CTO, CMO
- Suivre croissance (employee count trend)
- Analyser posts récents pour insights stratégiques

---

#### 3.3 G2 / Capterra Reviews (Automated Sentiment Analysis)

**Objectif:** Analyser automatiquement les avis clients pour extraire forces/faiblesses.

**Process:**

**1. Scraping Reviews (Apify Actor: G2 Scraper)**
```typescript
const reviews = await apify.call('g2-scraper', {
  companyUrl: 'https://www.g2.com/products/salesforce-sales-cloud',
  maxReviews: 100,
  sortBy: 'recent'
});
```

**2. Batch Analysis avec Claude 3.5 Sonnet**
```typescript
const analysis = await claude.messages.create({
  model: "claude-3-5-sonnet-20250929",
  messages: [{
    role: "user",
    content: `Analyze these 100 G2 reviews and extract:

    1. Top 5 Strengths (with frequency count)
    2. Top 5 Weaknesses (with frequency count)
    3. Overall sentiment score (1-10)
    4. Common use cases mentioned
    5. Main complaints by category (UI/UX, Support, Features, Pricing, Performance)

    Reviews: ${JSON.stringify(reviews)}

    Return structured JSON.`
  }]
});
```

**3. Stockage dans Metadata**
```typescript
await db.competitors.update(competitorId, {
  metadata: {
    ...existingMetadata,
    g2Analysis: {
      rating: 4.3,
      reviewCount: 1250,
      strengths: [
        { feature: "Ease of use", count: 87 },
        { feature: "Integration ecosystem", count: 65 },
        // ...
      ],
      weaknesses: [
        { feature: "High pricing", count: 92 },
        { feature: "Complex setup", count: 78 },
        // ...
      ],
      sentiment: 7.2,
      lastUpdated: "2025-11-14"
    }
  }
});
```

**4. Display in UI**
```
┌─ G2 CUSTOMER SENTIMENT ────────────────────────────┐
│ ⭐ 4.3 / 5.0  (1,250 reviews)                      │
│                                                     │
│ 💪 TOP STRENGTHS                                    │
│ 1. Ease of use (87 mentions)                       │
│ 2. Integration ecosystem (65 mentions)             │
│ 3. Mobile app quality (54 mentions)                │
│                                                     │
│ ⚠️ TOP WEAKNESSES                                   │
│ 1. High pricing (92 mentions) ← OPPORTUNITY        │
│ 2. Complex setup (78 mentions) ← DIFFERENTIATOR    │
│ 3. Limited customization (61 mentions)             │
│                                                     │
│ [View Full Analysis] [Update Data]                 │
└─────────────────────────────────────────────────────┘
```

---

#### 3.4 Crunchbase Data (Funding, Investors, Acquisitions)

**Crunchbase API ou Scraping**

**Données:**
- Total funding raised
- Last funding round (Series A/B/C, amount, date)
- Investors list
- Acquisitions made
- IPO status

**Utilisation:**
- Indicateur santé financière
- Prédiction mouvements stratégiques
- Identification investisseurs communs (Layer 2)

---

#### 3.5 Automated Tech Stack Detection

**Outils:** BuiltWith API, Wappalyzer

**Détection:**
- CMS (WordPress, Webflow, custom)
- Analytics (Google Analytics, Mixpanel, Amplitude)
- Marketing automation (HubSpot, Marketo, Pardot)
- Hosting (AWS, GCP, Azure, Cloudflare)
- Frontend (React, Vue, Angular)
- Backend frameworks
- Payment processors (Stripe, PayPal)

**Insights:**
- Technologies communes (opportunities pour partenariats)
- Gaps technologiques
- Modernité stack (indicateur innovation)

---

#### 3.6 Enrichment Workflow & Scheduling

**Trigger 1: Manual (On-Demand)**
- Bouton "Enrich Profile" dans UI
- Exécution immédiate

**Trigger 2: Automatic (On Creation)**
- Nouveau compétiteur créé → Auto-enrich dans 5min
- Notification à l'utilisateur quand terminé

**Trigger 3: Scheduled (Weekly Refresh)**
- Cron job : tous les dimanches à 2am
- Refresh données pour compétiteurs "High Priority"
- Détection changements (pricing, team size, reviews)
- Alerte si changement significatif détecté

**Enrichment Status Tracking:**
```typescript
interface EnrichmentStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  sources: {
    website: 'success' | 'failed' | 'pending';
    linkedin: 'success' | 'failed' | 'pending';
    g2: 'success' | 'failed' | 'pending';
    crunchbase: 'success' | 'failed' | 'pending';
    techStack: 'success' | 'failed' | 'pending';
  };
  errors?: string[];
}
```

---

## 🎯 LAYER 4 : Battlecards Dynamiques (Auto-Generated)

### Objectif
Créer des battlecards **automatiquement générées par IA** et **toujours à jour**, pas des PDFs statiques comme Klue/Crayon.

**Innovation 2025:** Battlecards vivantes, conversationnelles, contextuelles.

### Structure de Battlecard Moderne

**Schéma DB:**
```typescript
interface Battlecard {
  id: string;
  competitorId: string;
  companyId: string;

  // Metadata
  title: string;                    // "Salesforce Sales Cloud Battlecard"
  version: number;                  // Auto-incrémenté à chaque regen
  status: 'draft' | 'published' | 'archived';
  lastGeneratedAt: Date;
  lastReviewedByUser?: string;

  // Sections (JSON structure)
  content: {
    overview: BattlecardSection;
    strengths: BattlecardSection;
    weaknesses: BattlecardSection;
    howWeWin: BattlecardSection;
    objectionHandling: BattlecardSection;
    talkingPoints: BattlecardSection;
    pricing: BattlecardSection;
    recentUpdates: BattlecardSection;
  };

  // Sources utilisées pour génération
  sources: {
    documentIds: string[];          // Documents utilisés
    signalIds: string[];            // Signaux utilisés
    externalSources: string[];      // URLs scrapées
  };

  // Analytics
  views: number;
  lastViewedAt?: Date;
  usedInDeals: number;
}

interface BattlecardSection {
  title: string;
  content: string;                  // Markdown format
  lastUpdated: Date;
  confidence: number;               // 0-1 (confiance IA dans cette section)
  needsReview: boolean;             // Flag si données trop anciennes
}
```

---

### Fonctionnalités Battlecards

#### 4.1 Génération Automatique de Battlecard

**Trigger:**
- Bouton "Generate Battlecard" sur profil compétiteur
- Auto-génération lors de création compétiteur (si enrichissement réussi)

**Process:**

**1. Collecte des Données Sources**
```typescript
async function collectBattlecardSources(competitorId: string) {
  // a) Profil compétiteur enrichi
  const competitor = await db.competitors.findById(competitorId);

  // b) Documents liés (récents 6 mois)
  const documents = await db.documents.findMany({
    where: { competitorId, createdAt: { gte: sixMonthsAgo } }
  });

  // c) Signaux récents (3 mois)
  const signals = await db.signals.findMany({
    where: { competitorId, createdAt: { gte: threeMonthsAgo } }
  });

  // d) G2 reviews analysis
  const g2Analysis = competitor.metadata?.g2Analysis;

  // e) Win/Loss data (si Layer 6 implémenté)
  const winLossStats = await getWinLossStats(competitorId);

  return { competitor, documents, signals, g2Analysis, winLossStats };
}
```

**2. Génération avec Claude 3.5 Sonnet (200K context)**
```typescript
async function generateBattlecard(sources: BattlecardSources) {
  const prompt = `You are a competitive intelligence analyst. Generate a comprehensive battlecard for ${sources.competitor.name}.

Use the following sources:

COMPETITOR PROFILE:
${JSON.stringify(sources.competitor, null, 2)}

RECENT DOCUMENTS (${sources.documents.length} items):
${sources.documents.map(d => `- [${d.type}] ${d.title}: ${d.summary}`).join('\n')}

RECENT SIGNALS (${sources.signals.length} items):
${sources.signals.map(s => `- [${s.type}] ${s.title}: ${s.description}`).join('\n')}

G2 CUSTOMER SENTIMENT:
${JSON.stringify(sources.g2Analysis, null, 2)}

WIN/LOSS DATA:
- Win rate vs them: ${sources.winLossStats.winRate}%
- Top reasons we win: ${sources.winLossStats.topWinReasons.join(', ')}
- Top reasons we lose: ${sources.winLossStats.topLossReasons.join(', ')}

Generate a battlecard with these sections (in JSON format):

1. OVERVIEW (2-3 sentences: what they do, target market, positioning)

2. STRENGTHS (top 5, bullet points, based on G2 + documents)

3. WEAKNESSES (top 5, bullet points, based on G2 negative reviews + signals)

4. HOW WE WIN (specific strategies to beat them, referencing our advantages)

5. OBJECTION HANDLING (top 5 objections salespeople face, with recommended responses)

6. TALKING POINTS & TRAPS (messages to push, questions that expose their weaknesses)

7. PRICING COMPARISON (their pricing vs ours, if data available)

8. RECENT UPDATES (last 3 months: product launches, pricing changes, leadership changes)

For each section, include:
- "content": markdown formatted content
- "confidence": 0-1 score (how confident you are based on data quality)
- "needsReview": boolean (true if critical data is missing or outdated)

Return ONLY valid JSON, no other text.`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20250929",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(response.content[0].text);
}
```

**3. Sauvegarde et Notification**
```typescript
const battlecard = await db.battlecards.create({
  competitorId,
  companyId,
  title: `${competitor.name} Battlecard`,
  version: 1,
  status: 'draft',
  content: generatedContent,
  sources: {
    documentIds: documents.map(d => d.id),
    signalIds: signals.map(s => s.id),
    externalSources: []
  },
  lastGeneratedAt: new Date()
});

// Notification Slack
await slack.postMessage({
  channel: '#competitive-intelligence',
  text: `🎯 New battlecard generated for *${competitor.name}*!`,
  blocks: [
    { type: 'section', text: { type: 'mrkdwn', text: `View: ${appUrl}/battlecards/${battlecard.id}` }},
    { type: 'actions', elements: [
      { type: 'button', text: 'Review & Publish', action_id: 'publish_battlecard' },
      { type: 'button', text: 'Request Changes', action_id: 'request_changes' }
    ]}
  ]
});
```

---

#### 4.2 Battlecard Display (Interactive UI)

**Page:** `/companies/[slug]/battlecards/[battlecardId]`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 SALESFORCE SALES CLOUD BATTLECARD          v3 • Published │
│                                                               │
│ Last updated: 2 hours ago by AI                              │
│ Sources: 24 documents, 18 signals, 100 G2 reviews           │
│                                                               │
│ [📥 Download PDF] [🔄 Regenerate] [✏️ Edit] [📊 Analytics]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📋 SECTIONS (quick jump)                                      │
│ • Overview  • Strengths  • Weaknesses  • How We Win          │
│ • Objection Handling  • Talking Points  • Pricing  • Updates │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 1️⃣ OVERVIEW                                    Confidence: 95%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ Salesforce Sales Cloud is the market-leading CRM platform    │
│ for B2B enterprises, offering sales automation, forecasting, │
│ and Einstein AI. Targets enterprise (1000+ employees) with   │
│ complex sales processes. Known for extensive ecosystem and   │
│ high pricing.                                                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 2️⃣ STRENGTHS                                   Confidence: 92%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ 1. **Extensive AppExchange ecosystem** (5000+ apps)          │
│    - Customers love integration options (87 G2 mentions)     │
│                                                               │
│ 2. **Brand recognition & trust** (market leader since 1999)  │
│    - "Safe choice" for enterprises                           │
│                                                               │
│ 3. **Einstein AI capabilities**                              │
│    - Predictive forecasting, lead scoring                    │
│                                                               │
│ 4. **Comprehensive feature set**                             │
│    - Full sales lifecycle coverage                           │
│                                                               │
│ 5. **Strong reporting & dashboards**                         │
│    - Highly customizable (65 G2 mentions)                    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 3️⃣ WEAKNESSES                             Confidence: 88% ⚠️  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ 1. **HIGH PRICING** ← 🎯 OUR MAIN ADVANTAGE                  │
│    - $150-300/user/mo (92 G2 complaints)                     │
│    - Hidden implementation costs ($50k-500k)                 │
│    - Our pricing: $49/user/mo (3x cheaper!)                  │
│                                                               │
│ 2. **Complex setup & administration**                        │
│    - Requires dedicated Salesforce admin (78 G2 mentions)    │
│    - 3-6 month implementation timeline                       │
│    - Our setup: 2 weeks, no admin needed                     │
│                                                               │
│ 3. **Steep learning curve**                                  │
│    - "Not intuitive" (61 G2 reviews)                         │
│    - Extensive training required                             │
│    - Our UX: Rated 9.2/10 for ease of use                    │
│                                                               │
│ 4. **Over-engineered for SMB/Mid-market**                    │
│    - Feature bloat                                           │
│    - We target this segment specifically                     │
│                                                               │
│ 5. **Poor mobile experience**                                │
│    - App rated 3.2/5 on App Store                            │
│    - Our mobile: 4.7/5 rating                                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 4️⃣ HOW WE WIN                                 Confidence: 90%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ **Strategy 1: Lead with Value-for-Money**                    │
│ • "Salesforce costs $150-300/user. We're $49. That's $1M+   │
│    savings for a 100-person team over 3 years."             │
│ • Share ROI calculator showing 5-year TCO comparison         │
│                                                               │
│ **Strategy 2: Emphasize Simplicity**                         │
│ • "No Salesforce admin needed. Your team can set up and      │
│    manage everything themselves."                            │
│ • Offer live demo showing setup in 15 minutes                │
│                                                               │
│ **Strategy 3: Target Mid-Market Sweet Spot**                 │
│ • "Salesforce is built for 10,000+ employee enterprises.     │
│    You'll pay for features you'll never use."               │
│ • Position as "right-sized" solution                         │
│                                                               │
│ **Strategy 4: Highlight Modern UX**                          │
│ • Side-by-side UI comparison (our clean UI vs their clutter) │
│ • Mobile app demo (4.7★ vs their 3.2★)                      │
│                                                               │
│ **Proof Points:**                                            │
│ • Won 68% of deals vs Salesforce in last 6 months           │
│ • Average switch time: 2 weeks (vs 6 months)                │
│ • Customer testimonial: "We saved $800k by switching"        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 5️⃣ OBJECTION HANDLING                        Confidence: 85%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ **Objection 1: "But Salesforce is the industry standard"**   │
│ ✅ Response:                                                  │
│ "They were. But 'industry standard' in 1999 doesn't mean     │
│ best-in-class in 2025. Modern teams need modern tools.       │
│ G2 ratings show we're now ranked #1 in ease-of-use and       │
│ value-for-money. Salesforce is #1 in... brand recognition."  │
│                                                               │
│ **Objection 2: "We need the AppExchange integrations"**      │
│ ✅ Response:                                                  │
│ "What specific integrations? [Listen]. We integrate natively │
│ with top 50 tools (Slack, HubSpot, Gmail, etc). For long-tail│
│ apps, we have Zapier (5000+ apps). Which apps are critical   │
│ for you? [Usually they need <10 integrations we have]"       │
│                                                               │
│ **Objection 3: "Our team already knows Salesforce"**         │
│ ✅ Response:                                                  │
│ "And they'll love our platform even more. Our avg onboarding │
│ time is 3 days vs 3 months for SFDC. Less training = faster  │
│ ROI. We also offer free migration + training (worth $20k)."  │
│                                                               │
│ **Objection 4: "What if you go out of business?"**           │
│ ✅ Response:                                                  │
│ "Great question. We're Series B funded ($30M), growing 300%  │
│ YoY, profitable, 500+ enterprise customers. We also offer    │
│ data portability—you can export everything anytime. Not      │
│ locked in like Salesforce."                                  │
│                                                               │
│ **Objection 5: "We need more advanced features"**            │
│ ✅ Response:                                                  │
│ "Like what specifically? [Listen]. If it's forecasting, lead │
│ scoring, custom fields, workflows—we have all that. What     │
│ Salesforce calls 'advanced' is often just complexity. Can    │
│ you show me a feature you need that we don't have?"          │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 6️⃣ TALKING POINTS & TRAPS                     Confidence: 87%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ **🎯 TRAPS - Questions to Expose Their Weaknesses**          │
│                                                               │
│ 1. "What's your all-in cost per user, including admin,       │
│    implementation, training, and add-ons?"                   │
│    → Forces them to reveal true cost ($300-500/user)         │
│                                                               │
│ 2. "How long does typical implementation take, and do you    │
│    need to hire a dedicated Salesforce admin?"               │
│    → Highlights complexity                                   │
│                                                               │
│ 3. "What's your mobile app rating on the App Store?"         │
│    → Exposes poor mobile UX (3.2★)                           │
│                                                               │
│ 4. "Do you have any hidden fees or usage limits?"            │
│    → They have many (API limits, storage limits, etc)        │
│                                                               │
│ 5. "What happens to our data if we want to leave?"           │
│    → Complex export process, vendor lock-in                  │
│                                                               │
│ **💬 TALKING POINTS - Messages to Push**                     │
│                                                               │
│ • "We're Salesforce for the 99%, not the 1%"                 │
│ • "Same power, 1/3 the cost, 1/10 the complexity"            │
│ • "Modern CRM built for 2025, not 1999"                      │
│ • "Your team will actually WANT to use it"                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 7️⃣ PRICING COMPARISON                         Confidence: 78%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ ⚠️ Needs Review: Salesforce pricing may have changed recently│
│                                                               │
│ | Plan         | Salesforce    | Us         | Savings      │ │
│ |--------------|---------------|------------|--------------|  │
│ | Starter      | $25/user/mo   | $19/u/mo   | 24%          │ │
│ | Professional | $80/user/mo   | $49/u/mo   | 39%          │ │
│ | Enterprise   | $165/user/mo  | $99/u/mo   | 40%          │ │
│ | Unlimited    | $330/user/mo  | $149/u/mo  | 55%          │ │
│                                                               │
│ **Hidden Costs (Salesforce):**                               │
│ • Implementation: $50k-500k                                  │
│ • Dedicated admin: $80k-120k/year salary                     │
│ • Training: $5k-20k                                          │
│ • Add-ons: CPQ, Pardot, etc (+$50-150/user)                 │
│                                                               │
│ **Our Total Cost of Ownership:**                             │
│ • Implementation: FREE (done in 2 weeks)                     │
│ • Admin: NOT NEEDED                                          │
│ • Training: FREE (3-day onboarding included)                 │
│ • Add-ons: ALL INCLUDED in base price                        │
│                                                               │
│ **3-Year TCO for 100 users:**                                │
│ • Salesforce: ~$850,000                                      │
│ • Us: ~$200,000                                              │
│ • **Savings: $650,000** 💰                                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 8️⃣ RECENT UPDATES (Last 90 Days)              Confidence: 92%│
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                               │
│ 🚀 **Product Launch** (Nov 8, 2025)                          │
│ • "Einstein GPT" - Generative AI for CRM                     │
│ • Auto-generates emails, call summaries                      │
│ • Pricing: +$50/user/mo (expensive add-on!)                  │
│ • Our response: We already include AI features in base plan  │
│                                                               │
│ 💰 **Pricing Change** (Oct 15, 2025)                         │
│ • Professional tier increased from $75 to $80/user (+7%)     │
│ • Enterprise tier increased from $150 to $165/user (+10%)    │
│ • **OPPORTUNITY**: Position our stable pricing               │
│                                                               │
│ 👔 **Leadership Change** (Oct 1, 2025)                       │
│ • New CRO appointed: Sarah Chen (from Oracle)                │
│ • Signals aggressive sales push coming                       │
│ • Expect more competitive deals in Q4                        │
│                                                               │
│ ⭐ **G2 Rating Drop** (Sep 2025)                             │
│ • Dropped from 4.4 to 4.3 stars                              │
│ • 127 new reviews, 68% mentioned "high cost"                 │
│ • 45% mentioned "complexity"                                 │
│ • **OPPORTUNITY**: Use in competitive positioning            │
│                                                               │
│ 📰 **Press Coverage** (Aug 30, 2025)                         │
│ • TechCrunch: "Salesforce customers seek alternatives due    │
│   to pricing fatigue"                                        │
│ • Link: https://...                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘

📊 BATTLECARD ANALYTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Views: 247 (last 30 days)
• Used in deals: 18 active opportunities
• Avg time spent: 8m 32s
• Most viewed section: "How We Win" (89% of readers)
• Least viewed: "Pricing" (34% of readers)

🔄 FRESHNESS STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Overview: Fresh (updated 2h ago)
✅ Strengths: Fresh (updated 2h ago)
✅ Weaknesses: Fresh (updated 2h ago)
✅ How We Win: Fresh (updated 2h ago)
✅ Objections: Fresh (updated 2h ago)
✅ Talking Points: Fresh (updated 2h ago)
⚠️ Pricing: Needs Review (updated 45 days ago) ← ALERT
✅ Recent Updates: Fresh (updated 2h ago)

[🔄 Regenerate All Sections] [⚠️ Regenerate Pricing Only]
```

---

#### 4.3 Battlecard Auto-Update System

**Problème avec Klue/Crayon:** Battlecards deviennent obsolètes rapidement, nécessitent mises à jour manuelles.

**Notre Solution:** Système de détection auto + régénération ciblée.

**Triggers pour Auto-Update:**

**1. Nouveau Document/Signal Critique**
```typescript
// Quand un nouveau signal "pricing_change" est détecté
await eventBus.on('signal.created', async (signal) => {
  if (signal.type === 'pricing_change' && signal.competitorId) {
    const battlecards = await db.battlecards.findMany({
      where: { competitorId: signal.competitorId, status: 'published' }
    });

    for (const bc of battlecards) {
      // Marquer section "Pricing" comme needs review
      await db.battlecards.update(bc.id, {
        'content.pricing.needsReview': true
      });

      // Notification Slack
      await slack.postMessage({
        channel: '#competitive-intel',
        text: `⚠️ Pricing section of *${bc.title}* needs update. New pricing detected for ${signal.competitor.name}.`
      });
    }
  }
});
```

**2. Changement G2 Rating Significatif (>0.2 étoiles)**
```typescript
// Scheduled job: check G2 daily
await cron.schedule('0 2 * * *', async () => {
  const competitors = await db.competitors.findMany({ priority: 'high' });

  for (const comp of competitors) {
    const currentG2 = await fetchG2Rating(comp.g2Url);
    const previousG2 = comp.metadata?.g2Analysis?.rating;

    if (Math.abs(currentG2 - previousG2) > 0.2) {
      // Trigger battlecard section update
      await regenerateBattlecardSection(comp.id, 'strengths');
      await regenerateBattlecardSection(comp.id, 'weaknesses');

      // Alert
      await slack.postMessage({
        text: `📊 ${comp.name} G2 rating changed: ${previousG2} → ${currentG2}`
      });
    }
  }
});
```

**3. Battlecard Trop Ancien (>30 jours sans update)**
```typescript
// Scheduled job: flag stale battlecards
await cron.schedule('0 3 * * 0', async () => { // Every Sunday 3am
  const staleBattlecards = await db.battlecards.findMany({
    where: {
      status: 'published',
      lastGeneratedAt: { lt: thirtyDaysAgo }
    }
  });

  for (const bc of staleBattlecards) {
    await db.battlecards.update(bc.id, {
      'content.overview.needsReview': true,
      // ... all sections
    });

    // Notification avec bouton "Auto-Regenerate"
    await slack.postMessage({
      channel: '#competitive-intel',
      text: `🕐 Battlecard for *${bc.competitor.name}* is 30+ days old.`,
      blocks: [{
        type: 'actions',
        elements: [
          { type: 'button', text: 'Auto-Regenerate Now', action_id: 'regen_battlecard' },
          { type: 'button', text: 'Mark as Reviewed', action_id: 'mark_reviewed' }
        ]
      }]
    });
  }
});
```

---

#### 4.4 Battlecard Distribution & Access

**Intégrations:**

**1. Salesforce (CRM)**
- Lightning component dans Opportunity page
- Affiche battlecard quand concurrent détecté dans "Competitor" field
- Tracking : Log "battlecard viewed" dans Salesforce activity

**2. Slack**
- Commande : `/battlecard Salesforce`
- Retourne résumé + lien vers battlecard complète
- Markdown formatting pour lecture rapide

**3. Mobile App**
- Offline access (PWA avec Service Worker)
- Push notification quand battlecard updated
- Quick search par nom compétiteur

**4. Browser Extension (Chrome/Edge)**
- Détecte quand sales rep visite site concurrent
- Popup : "💡 Battlecard available for [Competitor]"
- Quick view overlay

**5. Export PDF**
- Bouton "Download PDF" génère PDF formaté
- Print-friendly layout
- Branding de l'entreprise (logo, couleurs)
- Include QR code vers version web

---

#### 4.5 Battlecard Analytics

**Métriques:**
- Views (total, unique, par section)
- Time spent (avg)
- Used in deals (count, win rate)
- Search queries leading to battlecard
- Sections most/least viewed
- Export/share count

**Insights:**
- "Objection Handling section viewed in 89% of won deals vs 34% of lost deals" → **Corrélation découverte!**
- "Battlecard for Salesforce viewed 3x more than HubSpot" → Adjust prioritization

---

## 👁️ LAYER 5 : Intelligence Multimodale (Vision + Text)

### Objectif
Analyser non seulement le TEXTE des compétiteurs, mais aussi leur DESIGN, UI/UX, vidéos, screenshots.

**Innovation 2025:** Claude 3.5 Sonnet + GPT-4 Vision permettent ça maintenant. Klue/Crayon ne font pas ça.

### Use Cases Multimodaux

#### 5.1 Analyse UI/UX Concurrent

**Process:**

**1. Capture Screenshots Automatique**
```typescript
import { chromium } from 'playwright';

async function captureCompetitorUI(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // Screenshot homepage
  const homepage = await page.screenshot({ fullPage: true });

  // Navigate to pricing page
  await page.click('a[href*="pricing"]');
  await page.waitForLoadState('networkidle');
  const pricingPage = await page.screenshot({ fullPage: true });

  // Navigate to dashboard (if demo available)
  // ...

  await browser.close();

  return { homepage, pricingPage };
}
```

**2. Analyse avec Claude 3.5 Sonnet Vision**
```typescript
const analysis = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20250929",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: homepageScreenshot.toString('base64')
        }
      },
      {
        type: "text",
        text: `Analyze this competitor's homepage UI/UX and provide:

1. **Visual Design Assessment** (modern/outdated, clean/cluttered)
2. **Color Scheme** (primary colors, branding consistency)
3. **Layout Structure** (hero section, CTA placement, navigation)
4. **Content Hierarchy** (headline, subheadline, value props)
5. **Call-to-Action Analysis** (what actions are emphasized?)
6. **Mobile Responsiveness** (if detectable from screenshot)
7. **Accessibility Concerns** (contrast, font size)
8. **Compared to Best Practices** (what's good, what's bad)

Return structured JSON.`
      }
    ]
  }]
});
```

**3. Stockage et Display**
```typescript
await db.competitors.update(competitorId, {
  metadata: {
    ...existing,
    uiAnalysis: {
      screenshots: {
        homepage: s3Url,
        pricing: s3Url,
        dashboard: s3Url
      },
      analysis: {
        designRating: 7.5,
        modernityScore: 8.0,
        clutterScore: 3.2,
        ctaEffectiveness: 9.0,
        colorScheme: ["#0066CC", "#FF6600"],
        strengths: [
          "Clear value proposition above the fold",
          "Strong CTA button contrast"
        ],
        weaknesses: [
          "Too many navigation items (analysis paralysis)",
          "Pricing not visible without 3 clicks"
        ],
        vsUs: "Our UI is cleaner (clutter score 1.8 vs 3.2), faster (LCP 1.2s vs 2.8s)"
      },
      lastAnalyzed: new Date()
    }
  }
});
```

**4. UI dans Profil Compétiteur**
```
┌─ UI/UX ANALYSIS ───────────────────────────────────────────┐
│                                                             │
│ 📸 SCREENSHOTS                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│ │ [Home]  │ │ [Price] │ │ [Dash]  │                       │
│ └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│ 🎨 DESIGN RATING: 7.5/10                                   │
│ • Modernity: 8.0/10                                        │
│ • Clutter: 3.2/10 (lower is better)                       │
│ • CTA Effectiveness: 9.0/10                                │
│                                                             │
│ ✅ STRENGTHS                                                │
│ • Clear value proposition above fold                       │
│ • Strong CTA button contrast                               │
│                                                             │
│ ⚠️ WEAKNESSES                                               │
│ • Too many navigation items (12 vs our 6)                  │
│ • Pricing requires 3 clicks to find                        │
│ • Slow page load (2.8s vs our 1.2s)                       │
│                                                             │
│ 🆚 VS US                                                    │
│ Our UI is cleaner, faster, more modern                     │
│                                                             │
│ [View Full Analysis] [Re-analyze UI]                       │
└─────────────────────────────────────────────────────────────┘
```

---

#### 5.2 Analyse de Vidéos Marketing

**Process:**

**1. Extraction de Frames Clés**
```typescript
import ffmpeg from 'fluent-ffmpeg';

async function extractKeyFrames(videoUrl: string) {
  // Download video
  const videoPath = await downloadVideo(videoUrl);

  // Extract frame every 10 seconds
  const frames: Buffer[] = [];
  await new Promise((resolve) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 10,
        folder: '/tmp/frames',
        filename: 'frame-%i.png'
      })
      .on('end', resolve);
  });

  return frames;
}
```

**2. Analyse Multi-Frame**
```typescript
const videoAnalysis = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20250929",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Analyze this competitor's product demo video (10 key frames). Extract:" },
      { type: "text", text: "1. Main features showcased\n2. Value propositions mentioned\n3. Target audience implied\n4. Differentiators claimed\n5. Pricing mentioned?\n6. Competitive comparisons made?\n7. Overall messaging strategy" },
      ...frames.map(f => ({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: f.toString('base64') }
      }))
    ]
  }]
});
```

**Use Case:**
- Concurrent publie vidéo démo sur YouTube
- Signal détecté → Auto-download → Analyse
- Extraction insights → Update battlecard
- Notification équipe : "Competitor highlighted new feature X in demo"

---

#### 5.3 Analyse de Documents PDF (Pitchdecks, Whitepapers)

**Process:**

**1. PDF → Images (par page)**
```typescript
import pdf2pic from 'pdf2pic';

const images = await pdf2pic.convert('competitor-whitepaper.pdf');
```

**2. Analyse avec Vision LLM**
```typescript
const pdfAnalysis = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20250929",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Analyze this competitor whitepaper and extract: ROI claims, case study results, feature highlights, competitive comparisons, pricing hints." },
      ...images.map(img => ({ type: "image", source: { ... } }))
    ]
  }]
});
```

**Use Case:**
- Concurrent publie whitepaper "5 Reasons to Switch from [Us]"
- Auto-detected → Analyzed → Extracted objections
- Update battlecard "Objection Handling" section
- Alert sales team

---

#### 5.4 Monitoring Visual Brand Changes

**Process:**

**1. Scheduled Screenshots (Weekly)**
```typescript
await cron.schedule('0 4 * * 0', async () => {
  const competitors = await db.competitors.findMany({ priority: 'high' });

  for (const comp of competitors) {
    const newScreenshot = await captureScreenshot(comp.website);
    const previousScreenshot = await s3.get(comp.metadata.lastScreenshot);

    // Image diff
    const diffPercentage = await compareImages(previousScreenshot, newScreenshot);

    if (diffPercentage > 20) {
      // Significant change detected
      await slack.postMessage({
        text: `🎨 ${comp.name} website design changed significantly (${diffPercentage}% diff)`,
        attachments: [
          { image_url: previousScreenshot, title: 'Before' },
          { image_url: newScreenshot, title: 'After' }
        ]
      });

      // Analyze change with vision model
      const changeAnalysis = await analyzeDesignChange(previousScreenshot, newScreenshot);

      // Create signal
      await db.signals.create({
        type: 'design_change',
        competitorId: comp.id,
        title: `Website redesign detected`,
        description: changeAnalysis,
        metadata: { diffPercentage, screenshots: [before, after] }
      });
    }
  }
});
```

---

## 🤖 LAYER 6 : Agents Autonomes (Auto-Research)

### Objectif
Agents IA qui **travaillent 24/7** pour surveiller, analyser, et alerter sans intervention humaine.

**Innovation 2025:** Agents autonomes avec Claude 3.5 Sonnet + outils. Klue/Crayon = surveillance basique.

### Types d'Agents

#### 6.1 Agent "Pricing Hunter"

**Mission:** Détecter TOUS les changements de prix compétiteurs.

**Process:**

**1. Scheduled Scan (Daily)**
```typescript
const pricingAgent = {
  name: "Pricing Hunter",
  schedule: "0 */6 * * *", // Every 6 hours

  async run() {
    const competitors = await db.competitors.findMany({ isActive: true });

    for (const comp of competitors) {
      // Scrape pricing page
      const pricingHtml = await firecrawl.scrape(`${comp.website}/pricing`);

      // Extract with LLM
      const extracted = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20250929",
        messages: [{
          role: "user",
          content: `Extract pricing from this HTML:

          ${pricingHtml}

          Return JSON:
          {
            "plans": [
              { "name": "Starter", "price": 29, "currency": "USD", "billingPeriod": "month", "features": [...] }
            ]
          }`
        }]
      });

      // Compare with previous
      const previousPricing = comp.metadata?.pricing;
      const newPricing = JSON.parse(extracted.content[0].text);

      const changes = detectPricingChanges(previousPricing, newPricing);

      if (changes.length > 0) {
        // Create signal
        await db.signals.create({
          type: 'pricing_change',
          competitorId: comp.id,
          title: `Pricing changed: ${changes.map(c => c.plan).join(', ')}`,
          description: formatPricingChanges(changes),
          metadata: { changes, previousPricing, newPricing }
        });

        // Alert Slack
        await slack.postMessage({
          channel: '#competitive-intel',
          text: `💰 PRICING ALERT: ${comp.name} changed pricing!`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: formatChangesMarkdown(changes) }
            },
            {
              type: 'actions',
              elements: [
                { type: 'button', text: 'Update Battlecard', action_id: 'update_bc' },
                { type: 'button', text: 'View Details', url: signalUrl }
              ]
            }
          ]
        });

        // Auto-update competitor metadata
        await db.competitors.update(comp.id, {
          metadata: { ...comp.metadata, pricing: newPricing, lastPricingUpdate: new Date() }
        });

        // Trigger battlecard section update
        await regenerateBattlecardSection(comp.id, 'pricing');
      }
    }
  }
};
```

---

#### 6.2 Agent "Feature Tracker"

**Mission:** Surveiller lancements de fonctionnalités / produits compétiteurs.

**Process:**

**1. Monitor Sources:**
- Blog posts (RSS feeds)
- Product release notes
- Twitter announcements
- Product Hunt launches

**2. NLP Detection**
```typescript
const featureAgent = {
  name: "Feature Tracker",
  schedule: "0 */3 * * *", // Every 3 hours

  async run() {
    for (const comp of competitors) {
      // Fetch blog RSS
      const posts = await fetchRSS(comp.blogRssUrl);

      // Fetch Twitter
      const tweets = await twitter.search(`from:${comp.twitterHandle} (launch OR new OR announce OR feature)`);

      // Combine all content
      const content = [...posts, ...tweets];

      // Analyze with LLM
      for (const item of content) {
        const analysis = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20250929",
          messages: [{
            role: "user",
            content: `Analyze this content and determine if it announces a new feature/product:

            Title: ${item.title}
            Content: ${item.content}

            Return JSON:
            {
              "isProductAnnouncement": boolean,
              "featureName": string | null,
              "category": "major_product" | "minor_feature" | "integration" | "improvement" | "not_product",
              "summary": string,
              "competitiveThreat": "high" | "medium" | "low" | "none",
              "reasoning": string
            }`
          }]
        });

        const result = JSON.parse(analysis.content[0].text);

        if (result.isProductAnnouncement && result.competitiveThreat !== 'none') {
          // Create high-priority signal
          await db.signals.create({
            type: 'product_launch',
            competitorId: comp.id,
            priority: result.competitiveThreat,
            title: `New ${result.category}: ${result.featureName}`,
            description: result.summary,
            sourceUrl: item.url,
            metadata: result
          });

          // Alert with threat level
          await slack.postMessage({
            channel: '#competitive-intel',
            text: `🚀 ${result.competitiveThreat.toUpperCase()} THREAT: ${comp.name} launched ${result.featureName}!`,
            blocks: [
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Feature:* ${result.featureName}` },
                  { type: 'mrkdwn', text: `*Threat:* ${result.competitiveThreat}` },
                  { type: 'mrkdwn', text: `*Summary:* ${result.summary}` },
                  { type: 'mrkdwn', text: `*Reasoning:* ${result.reasoning}` }
                ]
              },
              {
                type: 'actions',
                elements: [
                  { type: 'button', text: 'Analyze Impact', action_id: 'analyze_impact' },
                  { type: 'button', text: 'View Source', url: item.url }
                ]
              }
            ]
          });

          // If high threat, auto-trigger deep analysis
          if (result.competitiveThreat === 'high') {
            await triggerDeepFeatureAnalysis(comp.id, result.featureName, item.url);
          }
        }
      }
    }
  }
};
```

---

#### 6.3 Agent "People Tracker"

**Mission:** Suivre les mouvements RH (hiring, départs, promotions) chez compétiteurs.

**Why it matters:**
- Hiring spike en Sales = expansion géographique imminente
- Nouveau VP Engineering = refonte produit coming
- CEO departure = instabilité

**Process:**

**1. LinkedIn Scraping (Proxycurl)**
```typescript
const peopleAgent = {
  name: "People Tracker",
  schedule: "0 2 * * *", // Daily at 2am

  async run() {
    for (const comp of competitors) {
      // Get current employees via LinkedIn
      const employees = await proxycurl.companyEmployees(comp.linkedinId);

      // Get cached previous snapshot
      const previousSnapshot = await redis.get(`employees:${comp.id}`);

      // Detect changes
      const newHires = employees.filter(e => !previousSnapshot.includes(e.id));
      const departures = previousSnapshot.filter(e => !employees.includes(e.id));

      // Analyze new hires
      for (const hire of newHires) {
        const title = hire.title.toLowerCase();

        let signalType = 'team_growth';
        let priority = 'low';

        if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) {
          signalType = 'executive_hire';
          priority = 'high';
        } else if (title.includes('vp') || title.includes('director')) {
          signalType = 'leadership_hire';
          priority = 'medium';
        } else if (title.includes('sales')) {
          signalType = 'sales_expansion';
          priority = 'medium';
        }

        await db.signals.create({
          type: signalType,
          competitorId: comp.id,
          priority,
          title: `New hire: ${hire.name} as ${hire.title}`,
          metadata: { person: hire }
        });
      }

      // Count hiring by department
      const salesHires = newHires.filter(h => h.title.toLowerCase().includes('sales')).length;
      const engHires = newHires.filter(h => h.title.toLowerCase().includes('engineer')).length;

      if (salesHires > 5) {
        await slack.postMessage({
          text: `📈 ${comp.name} hired ${salesHires} sales reps this month → Likely expanding!`
        });
      }

      if (engHires > 10) {
        await slack.postMessage({
          text: `👨‍💻 ${comp.name} hired ${engHires} engineers this month → Product development ramping up!`
        });
      }

      // Cache new snapshot
      await redis.set(`employees:${comp.id}`, JSON.stringify(employees));
    }
  }
};
```

---

#### 6.4 Agent "Review Monitor"

**Mission:** Surveiller nouveaux avis G2/Capterra et extraire insights.

**Process:**

**1. Daily G2 Scrape**
```typescript
const reviewAgent = {
  name: "Review Monitor",
  schedule: "0 3 * * *", // Daily at 3am

  async run() {
    for (const comp of competitors) {
      // Fetch latest reviews (last 7 days)
      const newReviews = await apify.call('g2-scraper', {
        companyUrl: comp.g2Url,
        dateFrom: sevenDaysAgo,
        sortBy: 'recent'
      });

      if (newReviews.length === 0) continue;

      // Batch analyze with LLM
      const analysis = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20250929",
        messages: [{
          role: "user",
          content: `Analyze these ${newReviews.length} recent G2 reviews for ${comp.name}.

          Extract:
          1. Emerging themes (positive and negative)
          2. New complaints not seen before
          3. Feature requests mentioned
          4. Competitor comparisons mentioned
          5. Alert-worthy insights (red flags, opportunities for us)

          Reviews: ${JSON.stringify(newReviews)}

          Return JSON.`
        }]
      });

      const insights = JSON.parse(analysis.content[0].text);

      // Create signals for actionable insights
      if (insights.alertWorthy && insights.alertWorthy.length > 0) {
        for (const alert of insights.alertWorthy) {
          await db.signals.create({
            type: 'customer_sentiment',
            competitorId: comp.id,
            priority: alert.priority,
            title: alert.title,
            description: alert.description,
            metadata: { reviews: newReviews, analysis: insights }
          });

          await slack.postMessage({
            channel: '#competitive-intel',
            text: `📝 ${comp.name} Review Insight: ${alert.title}\n${alert.description}`
          });
        }
      }

      // Update G2 rating in competitor metadata
      const avgRating = newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length;
      await db.competitors.update(comp.id, {
        metadata: {
          ...comp.metadata,
          g2Analysis: {
            ...comp.metadata.g2Analysis,
            latestReviews: newReviews,
            currentRating: avgRating,
            lastChecked: new Date()
          }
        }
      });
    }
  }
};
```

---

#### 6.5 Agent Orchestrator

**Gestion centralisée des agents:**

```typescript
const agentOrchestrator = {
  agents: [
    pricingAgent,
    featureAgent,
    peopleAgent,
    reviewAgent,
    // ... plus d'agents
  ],

  async start() {
    for (const agent of this.agents) {
      // Register cron job
      cron.schedule(agent.schedule, async () => {
        console.log(`[${new Date().toISOString()}] Running agent: ${agent.name}`);

        try {
          await agent.run();
          await db.agentRuns.create({
            agentName: agent.name,
            status: 'success',
            runAt: new Date()
          });
        } catch (error) {
          console.error(`Agent ${agent.name} failed:`, error);
          await db.agentRuns.create({
            agentName: agent.name,
            status: 'failed',
            error: error.message,
            runAt: new Date()
          });

          // Alert on failure
          await slack.postMessage({
            channel: '#alerts',
            text: `⚠️ Agent "${agent.name}" failed: ${error.message}`
          });
        }
      });
    }
  },

  // Dashboard pour monitoring
  async getAgentStats() {
    return await db.agentRuns.groupBy({
      by: ['agentName'],
      _count: { status: true },
      _max: { runAt: true }
    });
  }
};

// Start all agents on app init
await agentOrchestrator.start();
```

**Agent Dashboard UI:**
```
┌─ AUTONOMOUS AGENTS STATUS ─────────────────────────────────┐
│                                                             │
│ Agent Name        Last Run      Status    Signals Created  │
│ ──────────────────────────────────────────────────────────  │
│ Pricing Hunter    2 hours ago   ✅ OK     3               │
│ Feature Tracker   45 mins ago   ✅ OK     1               │
│ People Tracker    6 hours ago   ✅ OK     8               │
│ Review Monitor    3 hours ago   ✅ OK     5               │
│ Tech Stack Scout  1 day ago     ⚠️ Warn   0               │
│ Social Listener   1 hour ago    ✅ OK     2               │
│                                                             │
│ [View Logs] [Pause All] [Configure]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔮 LAYER 7 : Prédiction & Anticipation (IA Avancée)

### Objectif
Ne pas juste **réagir** aux mouvements compétiteurs, mais les **prédire** avant qu'ils arrivent.

**Innovation 2025:** Machine learning + pattern recognition pour anticiper.

### Modèles Prédictifs

#### 7.1 Prédiction de Changement de Prix

**Données d'entraînement:**
- Historique changements prix compétiteur
- Patterns saisonniers (Q4 pricing changes)
- Événements déclencheurs (funding rounds, nouveaux produits)
- Pricing compétiteurs similaires

**Signaux prédictifs:**
- Funding round récent (→ probable price increase dans 3-6 mois)
- Nouveau CRO/CFO (→ restructuration pricing dans 2-4 mois)
- Concurrent direct a augmenté prix (→ suivront dans 1-2 mois)

**Modèle:**
```typescript
async function predictPricingChange(competitorId: string) {
  const competitor = await db.competitors.findById(competitorId);

  // Collect features
  const features = {
    daysSinceLastPriceChange: calculateDays(competitor.metadata.lastPricingUpdate),
    fundingRoundsLast6Months: competitor.metadata.fundingRounds?.filter(r => r.date > sixMonthsAgo).length || 0,
    newExecutives Last3Months: await countNewExecutives(competitor.id, threeMonthsAgo),
    competitorPriceIncreases: await countCompetitorPriceChanges('increase', threeMonthsAgo),
    employeeGrowthRate: calculateGrowthRate(competitor.metadata.employeeHistory),
    // ... more features
  };

  // Call ML model (trained offline)
  const prediction = await mlModel.predict(features);

  return {
    probability: prediction.probability,  // 0-1
    timeframe: prediction.timeframe,      // "1-2 months"
    confidence: prediction.confidence,     // "medium"
    reasoning: prediction.reasoning
  };
}
```

**Action si probabilité > 70%:**
```typescript
if (prediction.probability > 0.7) {
  await db.signals.create({
    type: 'prediction_pricing_change',
    competitorId,
    priority: 'medium',
    title: `Likely pricing change in ${prediction.timeframe}`,
    description: `Our model predicts ${Math.round(prediction.probability * 100)}% chance of pricing change. ${prediction.reasoning}`,
    metadata: { prediction }
  });

  await slack.postMessage({
    text: `🔮 PREDICTION: ${competitor.name} likely to change pricing in ${prediction.timeframe} (${Math.round(prediction.probability * 100)}% confidence)`
  });
}
```

---

#### 7.2 Prédiction de Lancement Produit

**Signaux:**
- Spike in engineering hires
- Job postings mentioning "new product"
- Increased marketing spend (ad campaigns)
- Trademark filings
- Domain registrations
- Conference booth bookings

**Pattern:**
```
Concurrent X hired 15 engineers 4 months before last product launch
Concurrent X hired 18 engineers recently
→ Probable launch dans 3-4 mois
```

---

#### 7.3 Prédiction de Levée de Fonds

**Signaux:**
- Hiring spike (all departments)
- New CFO hire
- Increased PR activity
- Regulatory filings

**Impact:**
- Post-funding: aggressive sales expansion
- Prepare for increased competition in market

---

#### 7.4 Prédiction d'Acquisition

**Signaux:**
- Declining hiring
- Executive departures
- Stagnant product development
- M&A advisor spotted (LinkedIn)

**Action:**
- If acquired by bigger player → threat level ↑
- If acquired by non-competitor → opportunity (confusion, churn)

---

## 📈 Implémentation Progressive : Roadmap

### Phase 1 : Foundation (Semaines 1-4)
✅ **LAYER 1: CRUD de Base**
- API routes (create, read, update, delete)
- Formulaires (add/edit competitor)
- Liste + filtres
- Profil détaillé
- Tests unitaires

**Livrables:**
- `/api/companies/[slug]/competitors` fonctionnel
- UI connectée (plus de mock data)
- Permissions (admin/editor/viewer)

---

### Phase 2 : Intelligence de Base (Semaines 5-8)
✅ **LAYER 3: Enrichissement Automatique (Partiel)**
- Website scraping (Firecrawl)
- LinkedIn data (Proxycurl)
- G2 reviews scraping (Apify)
- Auto-enrichment on create

✅ **LAYER 2: Knowledge Graph (Basique)**
- Visualisation graphe simple
- Requêtes pré-définies (ex: anciens employés)
- Population manuelle + semi-auto

**Livrables:**
- Bouton "Enrich Profile" fonctionnel
- Profils compétiteurs 80% auto-complétés
- Graphe visualisable

---

### Phase 3 : Battlecards IA (Semaines 9-12)
✅ **LAYER 4: Battlecards Dynamiques**
- Génération auto avec Claude 3.5
- Structure 8 sections
- Système de versioning
- Export PDF
- Intégration Salesforce (basique)

**Livrables:**
- Battlecard générée en 30 secondes
- 90% précision (reviewée humain)
- Partageable Slack/email

---

### Phase 4 : Automatisation Avancée (Semaines 13-16)
✅ **LAYER 5: Intelligence Multimodale**
- Screenshots automatiques
- Analyse UI/UX avec vision models
- PDF analysis
- Video frame extraction

✅ **LAYER 6: Agents Autonomes (3 agents initiaux)**
- Pricing Hunter
- Feature Tracker
- Review Monitor

**Livrables:**
- 3 agents running 24/7
- Détection automatique changements critiques
- Alertes Slack temps réel

---

### Phase 5 : Prédiction (Semaines 17-20)
✅ **LAYER 7: Prédiction & Anticipation**
- Modèle ML pricing prediction
- Pattern recognition product launches
- Early warning system

**Livrables:**
- Prédictions 70%+ accuracy
- Dashboard prédictif
- Proactive alerts

---

## 🎯 Différenciation vs Klue/Crayon : Tableau Récapitulatif

| Fonctionnalité | Klue (2014) | Crayon (2016) | **Notre Approche (2025)** |
|----------------|-------------|---------------|---------------------------|
| **CRUD Compétiteurs** | ✅ Basique | ✅ Basique | ✅ Basique + Metadata JSONB flexible |
| **Enrichissement Auto** | ⚠️ Limité | ⚠️ Limité | ✅✅ Multimodal (texte + vision) |
| **Battlecards** | ✅ Manuelles + templates | ✅ IA-assistée (Sparks) | ✅✅✅ 100% auto-générées, toujours à jour |
| **Knowledge Graph** | ❌ Basique relations | ❌ Pas de graphe | ✅✅ Graphe natif avec requêtes SQL complexes |
| **Analyse UI/UX Concurrent** | ❌ Non | ❌ Non | ✅✅✅ Vision AI (screenshots, vidéos, PDFs) |
| **Agents Autonomes** | ⚠️ Alertes basiques | ⚠️ Alertes basiques | ✅✅✅ 6+ agents surveillant 24/7 |
| **Prédictions** | ❌ Non | ❌ Non | ✅✅✅ ML models pour anticiper mouvements |
| **Win/Loss Natif** | ✅✅✅ Oui (différenciateur Klue) | ⚠️ Via CRM seulement | ✅✅ Intégré (Module 6) |
| **G2 Review Analysis** | ✅ Basique | ✅ Basique | ✅✅ Deep NLP + sentiment + trend detection |
| **Pricing Monitoring** | ⚠️ Manuel/semi-auto | ⚠️ Manuel/semi-auto | ✅✅✅ Auto détection + prédiction changements |
| **People Tracking** | ⚠️ Manuel (LinkedIn) | ⚠️ Manuel | ✅✅ Auto scraping + hiring pattern analysis |
| **Battlecard Freshness** | ⚠️ Notifications update manuelle | ⚠️ Suggestions update | ✅✅✅ Auto-update sections périmées |
| **Multimodalité** | ❌ Texte seulement | ❌ Texte seulement | ✅✅✅ Texte + Images + Vidéos + PDFs |
| **Context Window** | ⚠️ Limité (GPT-3.5 era) | ⚠️ Limité | ✅✅ 200K tokens (Claude 3.5) |
| **Tech Stack Detection** | ❌ Non | ❌ Non | ✅✅ Auto via BuiltWith/Wappalyzer |
| **Pricing** | 💰 Per user | 💰💰 Per competitor | 💰 Flexible (À définir) |

**Score Global:**
- Klue (2014): 12/17 ⭐⭐⭐
- Crayon (2016): 11/17 ⭐⭐⭐
- **Notre Approche (2025): 17/17** ⭐⭐⭐⭐⭐

---

## 🚀 Quick Wins pour MVP

**Si on doit livrer vite, prioriser:**

### MVP Minimal (2 semaines)
1. ✅ LAYER 1 (CRUD) - Essentiel
2. ✅ Enrichissement auto basique (website + LinkedIn)
3. ✅ Liste + profil détaillé fonctionnels

### MVP+ (1 mois)
4. ✅ 1 Agent autonome (Pricing Hunter)
5. ✅ Battlecard génération basique (sans auto-update)
6. ✅ G2 review scraping + analysis

### MVP++ (2 mois)
7. ✅ Knowledge Graph visualisation
8. ✅ 3 Agents (Pricing, Features, Reviews)
9. ✅ Battlecard auto-update
10. ✅ UI/UX analysis (vision AI)

---

## 📊 Métriques de Succès

**KPIs à mesurer:**

**Adoption:**
- % compétiteurs avec profil enrichi (Target: 90%+)
- Battlecards générées vs manuelles (Target: 80% auto)
- Agent detection accuracy (Target: 95%+)

**Efficacité:**
- Temps moyen création compétiteur : <5 min (vs 30min Klue)
- Temps génération battlecard : <30s (vs 2-4h Klue)
- Freshness battlecards : <7 jours avg (vs 30+ jours Klue)

**Impact Business:**
- Win rate amélioration (mesurer avant/après)
- Sales team engagement (views, shares)
- Time saved (heures/semaine d'équipe CI)

---

## 🔐 Considérations Techniques

### Stack Technologique

**Backend:**
- Next.js 15 API Routes
- PostgreSQL (Supabase) pour data structurée
- Redis pour caching (agent runs, enrichment queues)
- BullMQ pour job queues (enrichment, agent tasks)

**IA/ML:**
- Claude 3.5 Sonnet (Anthropic) - Génération battlecards, analyse multimodale
- GPT-4 Vision (OpenAI) - Analyse UI/UX (fallback)
- Pinecone - Vector DB pour RAG (documents contexte)
- Custom ML models (scikit-learn/TensorFlow) pour prédictions

**Scraping & Data:**
- Firecrawl API - Website scraping
- Proxycurl - LinkedIn data
- Apify Actors - G2/Capterra reviews
- BuiltWith API - Tech stack detection
- Playwright - Screenshots automation

**Infrastructure:**
- Vercel (Next.js hosting)
- Supabase (PostgreSQL + Storage)
- Upstash Redis
- AWS S3 (screenshots, PDFs)
- Cron jobs (Vercel Cron ou Railway)

### Coûts Estimés (par mois)

**APIs externes:**
- Anthropic Claude API: ~$200-500/mois (selon volume)
- Firecrawl: ~$100/mois
- Proxycurl: ~$300/mois (500 credits)
- Apify: ~$50/mois
- BuiltWith: ~$300/mois

**Infra:**
- Vercel Pro: $20/mois
- Supabase Pro: $25/mois
- Upstash Redis: $50/mois
- S3 Storage: ~$20/mois

**Total: ~$1,065-1,365/mois** (pour 50-100 compétiteurs actifs)

### Sécurité & Compliance

**Data Privacy:**
- Données compétiteurs = publiques (OK scraping)
- Respecter robots.txt
- Rate limiting pour éviter bans
- Pas de données personnelles non-publiques

**GDPR/Compliance:**
- LinkedIn data via API officielle (Proxycurl compliant)
- Données anonymisées pour ML training
- Retention policies (delete old screenshots après 1 an)

---

## 📝 Conclusion

Cette analyse propose une vision **IA-first, moderne et automatisée** pour la section Compétiteurs, allant bien au-delà de ce que Klue et Crayon offrent.

**Avantages clés:**
1. ✅ **Automatisation poussée** - 90% des tâches manuelles éliminées
2. ✅ **Intelligence multimodale** - Texte + Vision (UI, vidéos, PDFs)
3. ✅ **Agents autonomes** - Surveillance 24/7 sans intervention
4. ✅ **Prédictions** - Anticiper au lieu de réagir
5. ✅ **Battlecards vivantes** - Toujours à jour, auto-générées
6. ✅ **Knowledge Graph** - Relations complexes mappées
7. ✅ **Coût contrôlé** - ~$1,300/mois all-in vs $34k-80k/an Crayon

**Prochaine étape recommandée:**
Commencer par **Phase 1 (LAYER 1 CRUD)** pour remplacer les mock data actuelles par des vraies fonctionnalités, puis itérer progressivement sur les layers IA.

---

**Questions? Clarifications? Prêt à commencer l'implémentation?** 🚀
