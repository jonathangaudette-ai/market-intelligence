# Spécifications Fonctionnelles - Plateforme de Veille Compétitive et de Marché Propulsée par l'IA

**Version:** 1.0
**Date:** 30 octobre 2025
**Statut:** Document de Spécifications Fonctionnelles

---

## Table des Matières

1. [Vision et Positionnement](#1-vision-et-positionnement)
2. [Architecture Globale](#2-architecture-globale)
3. [Modules Fonctionnels](#3-modules-fonctionnels)
4. [Spécifications Détaillées par Module](#4-spécifications-détaillées-par-module)
5. [Technologies et Stack Technique](#5-technologies-et-stack-technique)
6. [Interfaces Utilisateur](#6-interfaces-utilisateur)
7. [Intégrations et APIs](#7-intégrations-et-apis)
8. [Sécurité et Conformité](#8-sécurité-et-conformité)
9. [Métriques de Succès](#9-métriques-de-succès)
10. [Roadmap d'Implémentation](#10-roadmap-dimplémentation)

---

## 1. Vision et Positionnement

### 1.1 Vision Produit

**Nom de la plateforme:** MarketIQ AI Platform (nom provisoire)

**Énoncé de vision:**
> "Transformer l'intelligence compétitive et de marché d'une fonction réactive et manuelle en un système proactif, automatisé et prédictif qui génère des insights actionnables et augmente directement les revenus grâce à l'IA générative de nouvelle génération."

### 1.2 Positionnement Unique

Notre plateforme se différencie par:

1. **IA Multimodale de Dernière Génération**
   - Utilisation de GPT-4 Vision, Claude 3.5 Sonnet, et Gemini 1.5 Pro
   - Analyse visuelle automatisée des interfaces concurrentes
   - Traitement de texte, images, vidéos et données structurées

2. **Intelligence Prédictive**
   - Forecasting des mouvements concurrents
   - Détection précoce de menaces émergentes
   - Scénarios stratégiques générés par IA

3. **Activation Temps Réel**
   - Distribution intelligente aux bonnes personnes au bon moment
   - Intégration native dans les flux de travail existants
   - Battlecards dynamiques auto-actualisées

4. **Architecture Simplifiée et Scalable**
   - Stack technique optimisée (Neon PostgreSQL + Pinecone)
   - Relations entre concurrents, partenaires, investisseurs, technologies
   - Facilité de déploiement et maintenance réduite

### 1.3 Personas Cibles

**Persona Primaire: Directeur Intelligence Compétitive**
- Responsable de la stratégie CI
- Besoin d'automatiser la collecte et analyse
- Doit démontrer ROI aux executives

**Persona Secondaire: VP Sales / Enablement**
- Active les équipes de vente
- Besoin d'insights actionnables en temps réel
- Focus sur l'impact win rate

**Persona Tertiaire: Product Manager / Product Marketing**
- Définit le positionnement produit
- Analyse les gaps fonctionnels vs compétition
- Suit les tendances de l'industrie

---

## 2. Architecture Globale

### 2.1 Architecture en 5 Couches

```
┌─────────────────────────────────────────────────────────────┐
│              COUCHE 5: MESURE & ANALYTICS                   │
│  Impact tracking, ROI, Win/Loss analytics, Dashboards       │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│            COUCHE 4: ACTIVATION & DISTRIBUTION              │
│  Battlecards, Alertes, Slack/Teams, CRM, Reporting          │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│          COUCHE 3: INTELLIGENCE & SYNTHÈSE (AI)             │
│  LLMs, RAG (Pinecone), Relations, Predictive Models         │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│           COUCHE 2: TRAITEMENT & ENRICHISSEMENT             │
│  NER, Sentiment, Classification, Computer Vision            │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│            COUCHE 1: COLLECTE & INGESTION                   │
│  Web Scraping AI, APIs, Social Media, Internal Sources      │
└─────────────────────────────────────────────────────────────┘

STACK DE DONNÉES: Neon PostgreSQL (données structurées) + Pinecone (vectors)
```

### 2.2 Flux de Données Principal

```
Sources Externes → AI Scraping → Enrichissement NLP → Neon PostgreSQL →
RAG (Pinecone) → LLM Synthesis → Distribution Intelligente →
Activation Utilisateur → Mesure d'Impact → Feedback Loop
```

### 2.3 Stack Technique Simplifiée

**Base de Données:**
- **Neon PostgreSQL** - Données structurées, relations, time-series
- **Pinecone** - Embeddings vectoriels, recherche sémantique, RAG

**Stockage Fichiers (optionnel):**
- **Vercel Blob / Cloudflare R2** - Screenshots, PDFs (si volume important)
- **PostgreSQL BYTEA** - Petits fichiers (<1MB) directement dans Neon

**Avantages:**
- ✅ Architecture simple avec 2 composantes principales
- ✅ Coûts réduits (~$50-100/mois vs $200+ avec stack complète)
- ✅ Facilité de déploiement et maintenance
- ✅ Scalabilité assurée (Neon serverless + Pinecone cloud)

---

## 3. Modules Fonctionnels

### Vue d'ensemble des 10 Modules Principaux

| Module | Description | Priorité |
|--------|-------------|----------|
| **M1. Intelligence Collector** | Collecte automatisée multi-sources | P0 - MVP |
| **M2. AI Analysis Engine** | Moteur d'analyse et synthèse IA | P0 - MVP |
| **M3. Knowledge Graph** | Base de connaissances relationnelle | P1 - Phase 2 |
| **M4. Battle Hub** | Création et gestion battlecards | P0 - MVP |
| **M5. Alert & Distribution System** | Alertes intelligentes et distribution | P0 - MVP |
| **M6. Win/Loss Intelligence** | Analyse gains/pertes intégrée | P1 - Phase 2 |
| **M7. Predictive Analytics** | Forecasting et scénarios | P2 - Phase 3 |
| **M8. Conversational AI Assistant** | Assistant IA type ChatGPT | P1 - Phase 2 |
| **M9. Impact Analytics** | Mesure ROI et engagement | P0 - MVP |
| **M10. Collaboration Workspace** | Espace collaboratif équipes | P1 - Phase 2 |
| **M11. RFP Response Assistant** | Aide IA pour répondre aux appels d'offres | P0 - MVP |

---

## 4. Spécifications Détaillées par Module

---

## MODULE 1: INTELLIGENCE COLLECTOR

### 1.1 Objectif
Automatiser la collecte exhaustive de données compétitives et de marché à partir de sources externes et internes.

### 1.2 Sources de Données (100+ types)

#### A. Sources Web Externes

**1. Sites Web Concurrents**
- Pages d'accueil et landing pages
- Pages de tarification
- Documentation produit
- Blogs d'entreprise
- Pages carrières
- Pages "À propos" et équipe

**Technologies:**
- Firecrawl API pour scraping intelligent
- GPT-4 Vision pour analyse de screenshots
- Change Detection.io pour monitoring modifications
- ScreenshotOne pour captures automatiques

**Fréquence:** Quotidienne + détection de changements en temps réel

---

**2. Actualités et Médias**
- Communiqués de presse
- Articles de presse tech/business
- Mentions dans médias traditionnels
- Publications d'analystes (Gartner, Forrester)

**Technologies:**
- NewsAPI.ai (100K+ sources)
- Google News via SerpAPI
- Aylien News API (NLP-enrichi)
- Custom Brave Search + LLM extraction

**Fréquence:** Temps réel avec alertes instantanées

---

**3. Réseaux Sociaux**

**LinkedIn:**
- Profils d'entreprises concurrentes
- Offres d'emploi et hiring patterns
- Posts et engagement
- Mouvements d'employés
- Données de croissance (followers, employees)

**Technologies:**
- Proxycurl API pour données structurées
- Apify LinkedIn Company Scraper
- Bright Data LinkedIn Dataset

**Fréquence:** Hebdomadaire pour profiles, quotidienne pour posts/jobs

---

**Twitter/X:**
- Tweets de comptes officiels
- Mentions de marques
- Sentiment et engagement
- Trending topics liés à l'industrie

**Technologies:**
- Apify Twitter Scraper
- Twitter API v2 (streaming pour alertes temps réel)

**Fréquence:** Temps réel pour comptes clés, quotidienne sinon

---

**Reddit & Forums:**
- Discussions sur produits/marques
- Pain points exprimés par utilisateurs
- Comparaisons entre concurrents
- Subreddits pertinents à l'industrie

**Technologies:**
- Apify Reddit Scraper
- Pushshift API pour données historiques

**Fréquence:** Quotidienne

---

**4. Review Sites & Customer Feedback**
- G2, Capterra, TrustRadius
- Amazon reviews (si applicable)
- App Store / Google Play (apps mobiles)
- Trustpilot, Yelp (si pertinent)

**Technologies:**
- APIs officielles quand disponibles
- Scraping avec Apify actors spécialisés
- GPT-4o pour sentiment analysis et feature extraction

**Fréquence:** Hebdomadaire

**Données extraites:**
- Ratings (overall, par catégorie)
- Sentiment (positif/négatif/neutre)
- Features mentionnées (pros/cons)
- Patterns de plaintes récurrentes
- Competitive mentions ("switched from X to Y")

---

**5. Patents & Innovation**
- Dépôts de brevets
- Publications techniques
- Recherche académique

**Technologies:**
- Google Patents Public Dataset (BigQuery)
- USPTO Patent API
- GPT-4 pour résumé de brevets techniques

**Fréquence:** Mensuelle

---

**6. Financial & Business Intelligence**
- Rapports financiers (SEC filings pour publiques)
- Annonces de funding/acquisitions
- Données Crunchbase/PitchBook
- Rapports d'analystes financiers

**Technologies:**
- SEC EDGAR API
- Crunchbase API
- Web scraping pour sources publiques

**Fréquence:** Hebdomadaire + alertes temps réel sur events majeurs

---

**7. Job Postings**
- Postes ouverts (volume, départements, geos)
- Technologies mentionnées dans descriptions
- Salaires (si disponibles)
- Vitesse d'expansion d'équipes

**Technologies:**
- LinkedIn via Proxycurl
- Indeed, Glassdoor scrapers
- Wappalyzer pour tech stack detection

**Fréquence:** Hebdomadaire

**Insights générés:**
- Hiring velocity = indicateur de croissance
- Nouvelles geos = expansion géographique
- Nouvelles technologies = pivots techniques
- Nouveaux départements = nouvelles initiatives

---

#### B. Sources Internes (Intelligence from Within)

**8. CRM Data**
- Opportunités win/loss
- Notes de vente mentionnant concurrents
- Raisons de perte de deals
- Taille de deals vs concurrents

**Technologies:**
- Salesforce API
- HubSpot API
- Microsoft Dynamics connector

**Fréquence:** Temps réel via webhooks

---

**9. Sales Call Intelligence**
- Transcriptions d'appels de vente
- Mentions de concurrents
- Objections clients
- Questions posées par prospects

**Technologies:**
- Gong API
- Chorus.ai integration
- Clari integration
- GPT-4 pour extraction d'insights

**Fréquence:** Quotidienne (batch processing nuit)

---

**10. Internal Communications**
- Slack/Teams channels #competitive, #customer-feedback
- Contributions ad-hoc des employés
- Insights terrain des sales reps

**Technologies:**
- Slack API (read messages, detect competitor mentions)
- Microsoft Teams API
- Custom submission forms

**Fréquence:** Temps réel

---

### 1.3 Fonctionnalités du Module Collector

#### Feature 1.1: Multi-Source Orchestration

**Description:** Orchestrateur central qui gère la collecte de toutes les sources de manière coordonnée.

**Spécifications:**
- Configuration des sources à surveiller (par concurrent)
- Scheduling intelligent (priorité, fréquence)
- Rate limiting et gestion de quotas API
- Retry logic avec exponential backoff
- Health monitoring de chaque source
- Alertes si une source échoue pendant >24h

**UI Admin:**
- Dashboard de santé des sources
- Configuration des crawls
- Logs de collecte
- Statistiques de données collectées

---

#### Feature 1.2: Intelligent Change Detection

**Description:** Détection automatique de changements significatifs sur sites web concurrents.

**Spécifications:**
- Capture de screenshots full-page (desktop + mobile)
- Diffing visuel avec ML (détection zones modifiées)
- Analyse de changements de contenu textuel
- Détection de nouvelles pages/sections
- Scoring de "significance" du changement

**Algorithme:**
1. Capture screenshot + HTML
2. Compare avec version précédente (visual diff + text diff)
3. Si changement détecté → GPT-4 Vision analyse l'impact
4. Génère résumé du changement en langage naturel
5. Score de priorité (1-10)
6. Si score > 7 → alerte immédiate

**Exemples de changements détectés:**
- Nouveau pricing tier ajouté
- Homepage redesign
- Nouveau CTA ou messaging
- Section "Customers" mise à jour avec nouveaux logos
- Ajout d'un nouveau produit

---

#### Feature 1.3: Social Media Monitoring Dashboard

**Description:** Vue centralisée de l'activité social media des concurrents.

**Données affichées:**
- Timeline unifiée de posts (LinkedIn, Twitter, etc.)
- Engagement metrics (likes, shares, comments)
- Sentiment analysis par post
- Trending topics
- Comparative engagement vs nos propres posts

**Alertes:**
- Viral post d'un concurrent (engagement >3x moyenne)
- Mention négative virale
- Annonce majeure sur social

---

#### Feature 1.4: Review Aggregation & Sentiment Analysis

**Description:** Agrégation et analyse automatisée de reviews clients.

**Vues disponibles:**

**1. Review Feed**
- Liste de toutes les reviews récentes
- Filter par: platform, rating, sentiment, date
- Highlight des reviews mentionnant notre produit

**2. Sentiment Trends**
- Graphique de sentiment over time par concurrent
- Breakdown par aspect (product, support, pricing, ease of use)

**3. Feature Mentions Extraction**
- Liste des features les plus mentionnées en pros/cons
- "Customers love X's [feature]"
- "Customers complain about Y's [pain point]"

**4. Competitive Switches**
- Identification automatique de reviews mentionnant des switches
- "We switched from Competitor A to Competitor B because..."
- Raisons de churn extraites automatiquement

**Technology:**
- GPT-4o pour aspect-based sentiment analysis
- Few-shot learning pour extraction de raisons de switch
- Vector search (Pinecone) pour clustering de feedback similaires

---

#### Feature 1.5: Internal Intelligence Capture

**Description:** Capture de l'intelligence terrain des équipes internes.

**Mécanismes:**

**A. CRM Integration**
- Scan automatique des opportunités fermées (won/lost)
- Extraction du champ "Competitor" et "Loss Reason"
- Parse des notes de vente pour mentions concurrentes
- Corrélation avec données externes

**B. Call Intelligence (Gong/Chorus)**
- Transcription automatique des appels
- Identification de mentions de concurrents
- Extraction d'objections liées à la compétition
- Clustering d'objections similaires
- Suggested responses basées sur calls gagnés

**C. Slack/Teams Integration**
- Bot qui écoute channels #competitive, #win-loss
- Commandes:
  - `/competitor [name] [update]` → log manuel
  - `/ask-competitor [question]` → requête à l'AI assistant
- Notifications automatiques d'insights pertinents dans channels

**D. Submission Forms**
- Formulaire web simple pour contributions ad-hoc
- "J'ai entendu que Competitor X fait Y"
- Validation/verification par équipe CI avant ajout à knowledge base

---

### 1.4 Data Storage & Schema

**Database:** Neon PostgreSQL (serverless, auto-scaling)

**Stockage Fichiers:**
- **Option 1:** Vercel Blob / Cloudflare R2 (pour volume important de screenshots/PDFs)
- **Option 2:** PostgreSQL BYTEA (pour petits fichiers <1MB)
- **Option 3:** Stocker uniquement les URLs externes

**Core Tables:**

```sql
-- Competitors
competitors (
  id, name, domain, industry, size, headquarters,
  crunchbase_url, linkedin_url, tracking_status, priority
)

-- Data Points (time-series de toutes les données collectées)
data_points (
  id, competitor_id, source_type, source_url,
  collected_at, content_type, raw_data, processed_data,
  change_detected, significance_score
)

-- Web Changes
web_changes (
  id, competitor_id, url, change_type,
  screenshot_before_url, screenshot_after_url,  -- URLs vers stockage externe ou BYTEA
  html_diff, summary, detected_at
)

-- Social Posts
social_posts (
  id, competitor_id, platform, post_url,
  content, engagement_metrics, sentiment,
  published_at, collected_at
)

-- Reviews
reviews (
  id, competitor_id, platform, rating,
  title, content, sentiment, aspects_json,
  reviewer_name, published_at
)

-- Job Postings
job_postings (
  id, competitor_id, title, department, location,
  technologies_mentioned, posted_at, collected_at
)

-- News Articles
news_articles (
  id, competitor_id, title, url, source,
  summary, sentiment, event_type, published_at
)
```

---

### 1.5 APIs Exposées par le Module

```
GET  /api/v1/collect/sources - Liste toutes les sources configurées
POST /api/v1/collect/sources - Ajouter une nouvelle source
GET  /api/v1/collect/data - Récupérer data points avec filters
POST /api/v1/collect/manual - Soumettre intelligence manuellement
GET  /api/v1/collect/health - Health check de toutes les sources
```

---

## MODULE 2: AI ANALYSIS ENGINE

### 2.1 Objectif
Transformer les données brutes collectées en insights actionnables via IA générative et NLP avancé.

### 2.2 Composants de l'Engine

#### Composant 2A: NLP Processing Pipeline

**Étapes:**
1. **Entity Recognition (NER)**
   - Extraction d'entités: companies, products, people, technologies
   - Linking vers knowledge graph

2. **Classification**
   - Type de contenu: product_launch, partnership, funding, pricing_change, etc.
   - Département concerné: sales, marketing, product, etc.
   - Urgence: high, medium, low

3. **Sentiment Analysis**
   - Overall sentiment: positive, negative, neutral
   - Aspect-based sentiment (pour reviews)
   - Emotion detection: excitement, frustration, confusion, etc.

4. **Summarization**
   - Résumé court (1-2 phrases) pour notifications
   - Résumé détaillé pour rapports
   - Key takeaways extraction

**Technologies:**
- SpaCy + custom NER model pour entities
- GPT-4o pour classification et summarization
- Fine-tuned BERT pour sentiment analysis rapide (pour volume)

---

#### Composant 2B: LLM Synthesis Engine

**Rôle:** Utiliser LLMs de pointe pour analyse avancée et génération de contenu.

**Modèles utilisés:**

| Tâche | Modèle | Raison |
|-------|--------|--------|
| Multi-doc synthesis | Claude 3.5 Sonnet | 200K context, excellent reasoning |
| Structured extraction | GPT-4o | Meilleur pour JSON mode |
| Quick analysis | GPT-4o mini | Coût-efficace pour tâches simples |
| Long context analysis | Gemini 1.5 Pro | 2M tokens context |
| Image analysis | GPT-4 Vision | Meilleur pour UI analysis |

**Cas d'usage:**

**1. SWOT Analysis Generation**
```
Input: Toutes les data points d'un concurrent des 90 derniers jours
Process: Claude 3.5 Sonnet avec prompt structuré
Output:
  - Strengths (5-10 bullet points avec citations)
  - Weaknesses (5-10 bullet points)
  - Opportunities (pour nous de les attaquer)
  - Threats (qu'ils posent pour nous)
```

**2. Competitive Positioning Analysis**
```
Input: Marketing content (website, ads, social posts) d'un concurrent
Process: GPT-4o avec prompt d'analyse stratégique
Output:
  - Target personas
  - Value propositions
  - Positioning vs market
  - Differentiation strategy
  - Messaging themes
```

**3. Product Feature Gap Analysis**
```
Input:
  - Nos product docs
  - Competitor product docs + reviews
Process: Claude 3.5 Sonnet comparison
Output:
  - Features we have that they don't
  - Features they have that we don't
  - Features both have (compare implementation)
  - Customer-requested features (from reviews)
```

**4. Battlecard Auto-Generation**
```
Input: Selected data points sur un concurrent
Process: GPT-4o avec template battlecard
Output: Draft battlecard avec sections:
  - Company Overview
  - Target Market
  - Product Overview
  - Strengths / Weaknesses
  - How to Win
  - Objection Handling
  - Proof Points
```

---

#### Composant 2C: Computer Vision Analysis

**Objectif:** Analyser visuellement les interfaces et assets des concurrents.

**Use Cases:**

**1. UI/UX Monitoring**
- Capture screenshots hebdomadaires de produits concurrents
- Détection de redesigns
- Analyse de nouveaux features visuels
- Comparaison de user flows

**Process:**
1. Capture screenshots de key pages (login, dashboard, pricing, etc.)
2. GPT-4 Vision analyse chaque screenshot:
   - "Décris les éléments principaux de cette interface"
   - "Quels sont les CTAs visibles?"
   - "Quel est le message principal?"
3. Compare avec screenshots précédents pour détecter changements
4. Génère rapport de changements UX

**2. Marketing Asset Analysis**
- Analyse d'ads (LinkedIn, Google, Facebook)
- Analyse de landing pages
- Extraction de messaging et visuals

**3. Product Screenshots in Reviews**
- Certaines reviews contiennent des screenshots
- Extraction automatique et analyse

**Technology:**
- GPT-4 Vision API pour analyse
- ScreenshotOne pour capture
- Perceptual hash pour détection de changements visuels

---

#### Composant 2D: Predictive Analytics

**Objectif:** Prévoir les mouvements futurs des concurrents.

**Modèles:**

**1. Hiring Velocity → Growth Forecast**
- Input: Job postings time-series
- Model: Prophet (time-series forecasting)
- Output: Predicted headcount growth

**2. Funding → Market Aggression**
- Input: Funding events
- Logic: Post-funding, competitors become more aggressive (plus de hiring, marketing spend)
- Output: "Expect increased competition from X in next 6 months"

**3. Review Sentiment → Churn Risk**
- Input: Sentiment trends of competitor reviews
- Model: If sentiment declining → their churn is increasing → opportunity for us
- Output: "Competitor Y's customers increasingly unhappy with [issue] - opportunity to target with our strength in [feature]"

**4. Product Launch Prediction**
- Input: Job postings (engineering roles), patents filed, conference speaking slots booked
- Model: Multi-signal ML model
- Output: "High probability Competitor Z launching [product category] in Q2"

**Technology:**
- Prophet / NeuralProphet pour time-series
- Custom sklearn models pour multi-signal
- LLM (Claude) pour strategic scenario generation

---

### 2.3 Fonctionnalités du Module Analysis

#### Feature 2.1: AI Research Assistant ("Sparks")

**Description:** Assistant IA permettant de lancer des analyses ad-hoc sur la base de connaissances.

**Interface:** Chat-style (comme ChatGPT)

**Exemples de prompts:**

```
"Fais une analyse SWOT de Competitor X basée sur les données du dernier trimestre"

"Quels sont les principaux pain points exprimés par les clients de Y dans leurs reviews G2 ce mois-ci?"

"Compare les stratégies de pricing de nos 3 principaux concurrents"

"Résume les mentions de notre produit dans les appels de vente de la semaine dernière où nous avons perdu face à Competitor Z"

"Génère un draft de battlecard pour le nouveau concurrent W qui vient d'entrer sur le marché"
```

**Backend:**
- RAG (Retrieval Augmented Generation) avec Pinecone
- Embed toutes les data points dans vectors
- Pour chaque query:
  1. Embed query
  2. Vector search pour top-K documents pertinents
  3. Feed à Claude 3.5 Sonnet avec retrieved context
  4. Génère réponse avec citations

**Avantages vs search simple:**
- Réponses en langage naturel
- Synthèse de multiples sources
- Peut faire des comparaisons, analyses, recommendations

---

#### Feature 2.2: Automated Intelligence Briefings

**Description:** Génération automatique de briefings quotidiens/hebdomadaires.

**Types de briefings:**

**Daily Brief (Email automatique chaque matin)**
```
Subject: Competitive Intelligence Daily Brief - October 30, 2025

📢 TOP STORIES
• Competitor X announced partnership with BigCo → potential threat to our enterprise segment
• Competitor Y's pricing page changed - added new "Enterprise Plus" tier at $X/month

💬 SOCIAL BUZZ
• Trending discussion on Reddit about Y's recent outage (negative sentiment)
• X's CEO posted on LinkedIn about their "AI-first" strategy pivot

⭐ CUSTOMER VOICE
• 3 new G2 reviews for Competitor Z (avg 4.2 stars)
  - Pros: Ease of use, customer support
  - Cons: Lacking advanced analytics features (our strength!)

📊 MARKET MOVES
• Competitor W posted 15 new job openings in EMEA → expansion signal

---
Generated by MarketIQ AI • View full details in platform
```

**Weekly Executive Brief**
- Plus stratégique
- Focus sur trends, pas daily noise
- Inclut predictive insights
- Format PDF/PowerPoint pour executive reviews

**Technology:**
- Claude 3.5 Sonnet pour génération de contenu
- Template system pour consistent formatting
- Automatic priority scoring pour sélectionner top items

---

#### Feature 2.3: Anomaly Detection & Alerts

**Description:** Détection automatique d'événements inhabituels ou significatifs.

**Types d'anomalies détectées:**

1. **Spike in Social Activity**
   - Si un concurrent a 3x son engagement normal → investigate
   - Possible viral post ou PR crisis

2. **Unusual Hiring Spike**
   - Si 20+ jobs postés en 1 semaine → major expansion or new initiative

3. **Sudden Review Sentiment Shift**
   - Si average sentiment drops de 0.5+ en 1 mois → product issues

4. **Website Major Overhaul**
   - Si >50% de homepage changed → rebrand or repositioning

5. **Pricing Change**
   - Toute modification de pricing → immediate alert

**Alert Format:**
```
🚨 ANOMALY DETECTED

Competitor: Acme Corp
Type: Unusual Hiring Spike
Details: 23 engineering jobs posted in last 7 days (avg: 4/week)
Locations: San Francisco, London, Singapore
Assessment: Likely preparing for major product launch or scaling existing product
Recommended Action: Monitor for product announcements, review our product roadmap for gaps

[View Details] [Mark as Reviewed] [Create Task]
```

**Technology:**
- Statistical anomaly detection (z-score, IQR)
- ML-based anomaly detection pour patterns complexes
- LLM pour génération d'assessment et recommendations

---

#### Feature 2.4: Battlecard Generation Workflow

**Description:** Workflow semi-automatisé pour création de battlecards.

**Steps:**

1. **Auto-Draft Generation**
   - User sélectionne competitor
   - System collecte toutes data récentes
   - GPT-4o génère draft de battlecard (toutes sections)
   - Time: ~30 secondes

2. **Human Review & Edit**
   - CI analyst reviews draft
   - Edit/augmente avec knowledge
   - Peut demander à l'AI de régénérer des sections

3. **Validation & Approval**
   - Submit pour approval (PM, Sales leadership)
   - Comments/feedback loop

4. **Publication**
   - Publié dans Battle Hub
   - Notifié aux équipes de vente
   - Distribué via Slack, CRM, etc.

5. **Auto-Update Monitoring**
   - System monitore nouvelles data sur ce concurrent
   - Si changement significatif → suggère mise à jour
   - "Competitor X's pricing changed - update battlecard?"

---

### 2.4 APIs Exposées par le Module

```
POST /api/v1/analyze/swot - Génère analyse SWOT
POST /api/v1/analyze/positioning - Analyse positioning concurrent
POST /api/v1/analyze/gap - Feature gap analysis
POST /api/v1/analyze/battlecard - Génère draft battlecard
POST /api/v1/analyze/query - AI Research Assistant (RAG query)
GET  /api/v1/analyze/briefing/daily - Récupère daily brief
POST /api/v1/analyze/predict - Predictive analysis
```

---

## MODULE 3: KNOWLEDGE GRAPH

### 3.1 Objectif
Créer une base de connaissances relationnelle pour cartographier l'écosystème compétitif.

**Note:** Ce module est **P1 - Phase 2**. Pour le MVP, les relations basiques seront gérées via PostgreSQL. Neo4j peut être ajouté en Phase 2 si des besoins avancés de graphes émergent.

### 3.2 Architecture Simplifiée (Phase MVP)

**Technology:** Neon PostgreSQL avec tables relationnelles

**Approche:** Utiliser des tables de jonction pour les relations au lieu d'une graph database dédiée.

**Entity Types (tables PostgreSQL):**
- **companies** (competitors, partners, customers)
- **people** (executives, employees)
- **products** (produits et services)
- **technologies** (tech stack, APIs, frameworks)
- **investors** (VCs, private equity)
- **events** (funding, launches, partnerships)
- **locations** (offices, markets)
- **features** (product features)

**Schema SQL pour Relations:**

```sql
-- Table centrale de relations (remplace Neo4j)
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source entity
  entity_from_type VARCHAR(50) NOT NULL,  -- 'company', 'person', 'product', etc.
  entity_from_id UUID NOT NULL,

  -- Relationship type
  relationship_type VARCHAR(50) NOT NULL,  -- 'COMPETES_WITH', 'PARTNERS_WITH', etc.

  -- Target entity
  entity_to_type VARCHAR(50) NOT NULL,
  entity_to_id UUID NOT NULL,

  -- Metadata flexible
  metadata JSONB DEFAULT '{}',
  strength DECIMAL(3,2),  -- 0.0 to 1.0 (intensité de la relation)

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  source_url TEXT,  -- D'où vient cette information

  -- Index pour performance
  CONSTRAINT unique_relationship UNIQUE (entity_from_type, entity_from_id, relationship_type, entity_to_type, entity_to_id)
);

-- Index pour requêtes rapides
CREATE INDEX idx_rel_from ON entity_relationships(entity_from_type, entity_from_id);
CREATE INDEX idx_rel_to ON entity_relationships(entity_to_type, entity_to_id);
CREATE INDEX idx_rel_type ON entity_relationships(relationship_type);
CREATE INDEX idx_rel_metadata ON entity_relationships USING gin(metadata);

-- Table pour entités génériques (si pas de table dédiée)
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Types de Relations Supportés:**
- `COMPETES_WITH` - Relation compétitive
- `PARTNERS_WITH` - Partenariat
- `USES_TECHNOLOGY` - Utilise une technologie
- `FUNDED_BY` - Financé par
- `ACQUIRED` - Acquis par
- `WORKS_AT` - Employé travaille chez
- `FORMERLY_WORKED_AT` - Ancien employé
- `OFFERS` - Entreprise offre produit
- `INTEGRATES_WITH` - Intégration entre produits
- `TARGETS` - Cible un marché
- `HAS_OFFICE_IN` - Bureau dans un lieu

### 3.3 Fonctionnalités

#### Feature 3.1: Ecosystem Mapping Visualization

**Description:** Visualisation interactive du graphe relationnel.

**Vues:**

**1. Competitive Landscape View**
- Centre: Notre entreprise
- Noeuds: Competitors
- Edges: COMPETES_WITH avec "intensity" score
- Couleurs: Par segment de marché
- Taille des noeuds: Par market share ou revenue

**2. Partnership Network**
- Visualise les partnerships entre companies
- Identifie potential partners (connected to competitors)
- Map influence networks

**3. Technology Stack Map**
- Quelles technologies utilisent nos concurrents?
- Clusters de technologies
- Opportunités d'intégration

**4. Investor Network**
- Qui finance nos concurrents?
- Investor overlap
- Follow-on funding predictions

**UI:**
- Force-directed graph layout
- Zoom/pan/filter
- Click sur node → detail panel
- Pathfinding: "Show connections between Company A and Company B"

**Technology:**
- D3.js pour visualization
- SQL queries avec CTEs récursives pour traverser le graphe
- API REST pour récupérer données relationnelles

---

#### Feature 3.2: Entity Relationship Queries

**Description:** Queries puissantes sur les relations via SQL.

**Exemples:**

```sql
-- Qui sont les anciens employés de nos concurrents qui travaillent maintenant chez nous?
SELECT
  p.name,
  p.former_companies
FROM people p
JOIN entity_relationships er_current
  ON er_current.entity_from_id = p.id
  AND er_current.relationship_type = 'WORKS_AT'
  AND er_current.entity_to_type = 'company'
JOIN companies our_company
  ON our_company.id = er_current.entity_to_id
  AND our_company.name = 'OurCompany'
WHERE EXISTS (
  SELECT 1
  FROM entity_relationships er_former
  JOIN entity_relationships er_compete
    ON er_compete.entity_from_id = er_former.entity_to_id
    AND er_compete.relationship_type = 'COMPETES_WITH'
  WHERE er_former.entity_from_id = p.id
    AND er_former.relationship_type = 'FORMERLY_WORKED_AT'
);

-- Quels VCs ont investi dans plusieurs de nos concurrents?
SELECT
  i.name,
  COUNT(DISTINCT c.id) as num_competitors_funded
FROM investors i
JOIN entity_relationships er_funding
  ON er_funding.entity_from_id = i.id
  AND er_funding.relationship_type = 'FUNDED_BY'
  AND er_funding.entity_to_type = 'company'
JOIN companies c ON c.id = er_funding.entity_to_id
WHERE EXISTS (
  SELECT 1
  FROM entity_relationships er_compete
  WHERE er_compete.entity_from_id = c.id
    AND er_compete.relationship_type = 'COMPETES_WITH'
)
GROUP BY i.id, i.name
HAVING COUNT(DISTINCT c.id) >= 2;

-- Quelles technologies sont utilisées par nos concurrents mais pas par nous?
SELECT
  t.name,
  COUNT(DISTINCT c.id) as num_competitors_using
FROM technologies t
JOIN entity_relationships er_tech
  ON er_tech.entity_to_id = t.id
  AND er_tech.relationship_type = 'USES_TECHNOLOGY'
  AND er_tech.entity_from_type = 'company'
JOIN companies c ON c.id = er_tech.entity_from_id
WHERE EXISTS (
  SELECT 1 FROM entity_relationships er_compete
  WHERE er_compete.entity_from_id = c.id
    AND er_compete.relationship_type = 'COMPETES_WITH'
)
AND NOT EXISTS (
  SELECT 1
  FROM entity_relationships er_our_tech
  JOIN companies our_co ON our_co.name = 'OurCompany'
  WHERE er_our_tech.entity_from_id = our_co.id
    AND er_our_tech.entity_to_id = t.id
    AND er_our_tech.relationship_type = 'USES_TECHNOLOGY'
)
GROUP BY t.id, t.name
ORDER BY num_competitors_using DESC;
```

**UI:** Natural language query interface (powered by LLM → SQL generation)

---

#### Feature 3.3: Automatic Graph Construction

**Description:** Population automatique du graph à partir des données collectées.

**Sources:**
- Crunchbase data → Companies, Investors, Funding events
- LinkedIn data → People, employment history
- Website tech stack detection → Technologies
- News articles → Events (partnerships, acquisitions)

**Process:**
1. Entity Extraction from text (NER)
2. Relationship Extraction (using LLM)
3. Entity Resolution (deduplication)
4. Database insertion (PostgreSQL)

**Example:**
```
News: "Acme Corp announced partnership with BigCo to integrate their API"

Extracted:
- Entity: Acme Corp (Company)
- Entity: BigCo (Company)
- Relationship: Acme PARTNERS_WITH BigCo
- Relationship: Acme INTEGRATES_WITH BigCo API

SQL Insert:
-- Insérer ou récupérer les entreprises
INSERT INTO companies (name) VALUES ('Acme Corp') ON CONFLICT (name) DO NOTHING RETURNING id;
INSERT INTO companies (name) VALUES ('BigCo') ON CONFLICT (name) DO NOTHING RETURNING id;

-- Créer la relation
INSERT INTO entity_relationships (
  entity_from_type, entity_from_id,
  relationship_type,
  entity_to_type, entity_to_id,
  metadata, source_url
) VALUES (
  'company', (SELECT id FROM companies WHERE name = 'Acme Corp'),
  'PARTNERS_WITH',
  'company', (SELECT id FROM companies WHERE name = 'BigCo'),
  '{"announced_date": "2025-10-30"}'::jsonb,
  'https://news-article-url.com'
) ON CONFLICT ON CONSTRAINT unique_relationship DO UPDATE
  SET updated_at = NOW();
```

---

### 3.4 APIs Exposées par le Module

```
GET  /api/v1/graph/companies - Liste des companies dans graph
GET  /api/v1/graph/relationships/:type - Relationships d'un type donné
POST /api/v1/graph/query - Exécuter une SQL query (avec sécurité)
POST /api/v1/graph/nlp-query - Natural language query (convertie en SQL via LLM)
GET  /api/v1/graph/visualize - Données pour visualization (noeuds et edges)
POST /api/v1/graph/relationships - Créer une nouvelle relation
DELETE /api/v1/graph/relationships/:id - Supprimer une relation
```

**Note sur l'évolution future:**
Si les besoins en analyses de graphes complexes augmentent (traversée de graphes profonds, algorithmes de graphes avancés), Neo4j pourra être ajouté en Phase 2. PostgreSQL avec CTEs récursives est suffisant pour 80% des cas d'usage relationnel.

---

## MODULE 4: BATTLE HUB

### 4.1 Objectif
Centraliser la création, gestion et distribution de battlecards dynamiques.

### 4.2 Battlecard Structure

**Sections Standard:**

1. **Company Overview**
   - Nom, logo, tagline
   - Founded, headquarters, size
   - Funding, ownership
   - Target market / customers

2. **Product Overview**
   - Produits principaux
   - Pricing tiers
   - Key features
   - Unique selling points

3. **Market Position**
   - Market share / rank
   - G2 rating
   - Customer base size
   - Geographic presence

4. **Strengths**
   - Ce qu'ils font bien
   - Leurs competitive advantages
   - Features où ils sont leaders

5. **Weaknesses**
   - Pain points clients
   - Product gaps
   - Service issues
   - Limitations techniques

6. **How We Win**
   - Notre différenciation vs eux
   - Features où on est meilleurs
   - Proof points (customers won from them)
   - ROI case studies

7. **Objection Handling**
   - Objections communes
   - Responses recommandées (par objection)

8. **Talking Points / Traps**
   - Messages à pousser
   - Traps pour eux (questions qui exposent leurs faiblesses)

9. **Recent Updates**
   - Derniers changements (produit, pricing, leadership)
   - Timeline des mouvements récents

10. **Resources**
    - Competitive analysis docs
    - Demo videos
    - Case studies
    - Sales plays

### 4.3 Fonctionnalités

#### Feature 4.1: Dynamic Battlecards

**Description:** Battlecards qui se mettent à jour automatiquement.

**Auto-Update Logic:**

**Trigger:** Nouvelle donnée collectée sur un concurrent

**Assessment:**
1. LLM évalue: "Cette nouvelle info est-elle pertinente pour la battlecard?"
2. Si oui, LLM suggère: "Section à mettre à jour" + "Contenu proposé"

**Workflow:**
1. System détecte changement (e.g., pricing change)
2. Génère suggestion de mise à jour
3. Notification envoyée au CI analyst responsable
4. Analyst review:
   - Accept → battlecard updated automatiquement
   - Edit → modifie suggestion et publie
   - Reject → ignore suggestion

**Versionning:**
- Toutes les versions archivées
- Diff view entre versions
- "What changed" feed

**Benefits:**
- Battlecards toujours à jour
- Pas de maintenance manuelle lourde
- Sales a toujours latest info

---

#### Feature 4.2: Battlecard Templates

**Description:** Templates customisables pour différents formats de battlecards.

**Template Types:**

1. **Comprehensive** (10 sections, 3-4 pages)
2. **Quick Reference** (1 page, bullet points)
3. **Sales Call Cheat Sheet** (half page, key talking points only)
4. **Executive Brief** (strategic overview, no tactical details)

**Customization:**
- Choix de sections à inclure/exclure
- Ordre des sections
- Branding (logo, colors, fonts)
- Export formats (PDF, PowerPoint, web)

---

#### Feature 4.3: Battlecard Distribution

**Description:** Distribution intelligente aux bonnes personnes au bon moment.

**Distribution Channels:**

**1. In-App Access**
- Library de battlecards dans platform
- Search et filter par concurrent, product, market
- Favoris / most viewed

**2. CRM Integration (Salesforce)**
- Battlecard automatiquement affichée quand concurrent détecté dans opportunity
- Embedded dans Salesforce interface
- "Competitor X detected in this deal - View Battlecard"

**3. Slack / Teams Integration**
- Commande: `/battlecard [competitor]` → renvoie lien ou PDF
- Notifications automatiques quand battlecard updated

**4. Browser Extension**
- Chrome extension
- Lorsque sales rep visite website d'un concurrent → popup avec battlecard
- Quick access pendant research

**5. Email Distribution**
- Nouvelle battlecard publiée → email à sales team
- Weekly digest de battlecards mises à jour

**6. Mobile App**
- iOS/Android app
- Access battlecards offline (pour sales calls)

---

#### Feature 4.4: Battlecard Analytics

**Description:** Mesure de l'utilisation et impact des battlecards.

**Metrics:**

**Engagement:**
- Views (par battlecard, par user, par équipe)
- Time spent reading
- Sections les plus consultées
- Search queries menant aux battlecards

**Effectiveness:**
- Correlation entre "battlecard viewed" et "deal won"
- Win rate sur deals où battlecard consultée vs non consultée
- Feedback de sales reps (thumbs up/down, comments)

**Content Quality:**
- Quelles sections sont skipped?
- Où les users drop off?
- Suggestions de content manquant (via feedback)

**Dashboards:**
- Pour CI team: engagement metrics, update cadence
- Pour Sales leaders: impact on win rate, adoption par reps

---

### 4.4 APIs Exposées par le Module

```
GET  /api/v1/battlecards - Liste des battlecards
GET  /api/v1/battlecards/:id - Détails d'une battlecard
POST /api/v1/battlecards - Créer une nouvelle battlecard
PUT  /api/v1/battlecards/:id - Mettre à jour battlecard
POST /api/v1/battlecards/:id/suggest-update - Suggérer un update
GET  /api/v1/battlecards/:id/versions - Historique des versions
GET  /api/v1/battlecards/:id/analytics - Métriques d'une battlecard
```

---

## MODULE 5: ALERT & DISTRIBUTION SYSTEM

### 5.1 Objectif
Distribuer les insights aux bonnes personnes, au bon moment, dans leur flux de travail.

### 5.2 Types d'Alertes

#### Alerte Type 1: Critical Event Alert

**Trigger:** Événement majeur détecté (funding, acquisition, major product launch, etc.)

**Urgency:** Immediate

**Delivery:**
- Slack/Teams notification immédiate
- Email
- In-app notification
- SMS (optionnel pour VIP users)

**Format:**
```
🚨 CRITICAL ALERT: Competitor Acquisition

Acme Corp has acquired SmallCo for $50M

Impact Assessment:
• Acme gains SmallCo's X technology (gaps our weakness in [area])
• Combined entity will have 15% market share (vs our 12%)
• Expect aggressive upsell campaign to SmallCo's 500 customers

Recommended Actions:
1. Update Acme battlecard with new product capabilities
2. Identify at-risk customers (overlapping ICP with SmallCo)
3. Prepare defensive positioning

[View Full Details] [Update Battlecard] [Create Task]
```

---

#### Alerte Type 2: Daily Intelligence Brief

**Trigger:** Automated daily email (8am recipient timezone)

**Urgency:** Routine

**Delivery:** Email

**Content:**
- Top 5 insights from yesterday
- Prioritized by significance
- Quick summaries (2-3 sentences each)
- Links to full details in platform

---

#### Alerte Type 3: Anomaly Alert

**Trigger:** Statistical anomaly detected

**Urgency:** Medium

**Delivery:** Slack + in-app

**Example:**
```
📊 ANOMALY DETECTED

Competitor: Acme Corp
Metric: Social Media Engagement
Details: LinkedIn post engagement 4.2x above baseline (3,500 likes vs avg 800)
Post Content: "Announcing our Series C funding of $100M led by GreatVC"

Implications: Acme will likely accelerate hiring, product development, and marketing spend

[Investigate] [Dismiss]
```

---

#### Alerte Type 4: Contextual Deal Alert (CRM Integration)

**Trigger:** Sales rep opens opportunity avec concurrent détecté

**Urgency:** Real-time (during sales process)

**Delivery:** In-CRM notification (Salesforce widget)

**Format:**
```
🎯 COMPETITIVE INTEL: Acme Corp detected in this opportunity

Latest Updates:
• Acme raised pricing 15% last month - use as negotiation leverage
• 3 negative G2 reviews this week citing poor support
• We won 2 similar deals vs Acme in past 30 days

Quick Actions:
[View Battlecard] [See Win/Loss Analysis] [Contact Sales Engineer]
```

---

### 5.3 Alert Routing & Personalization

#### Persona-Based Routing

**CI Analysts:**
- Receive: Everything (all alerts)
- Focus: Analysis and content creation

**Sales Reps:**
- Receive: Battlecard updates, deal-specific alerts
- Focus: Tactical intelligence for active deals

**Sales Enablement / Sales Ops:**
- Receive: Battlecard updates, trend reports, win/loss insights
- Focus: Training and process improvement

**Product Managers:**
- Receive: Product launches, feature updates, customer feedback trends
- Focus: Product roadmap and positioning

**Executives:**
- Receive: Strategic briefings (weekly), critical events only
- Focus: High-level trends and strategic moves

---

#### Custom Alert Rules

**User-Defined Rules:**

```
Rule Builder UI:

IF [Competitor] = Acme Corp OR BigCo
AND [Event Type] = Product Launch OR Pricing Change
THEN [Notify Me Via] = Slack + Email
WITH [Urgency] = High
```

**Smart Defaults:**
- System suggests rules based on user role
- Learn from user behavior (which alerts they engage with)
- Auto-tune alert frequency to avoid overload

---

### 5.4 Distribution Channels

#### Channel 1: Slack Integration

**Features:**
- Dedicated #competitive-intel channel (automated posts)
- Personal DMs pour alertes high-priority
- Bot commands:
  - `/competitor [name]` - Get quick summary
  - `/battlecard [name]` - Get battlecard
  - `/ask [question]` - Query AI assistant
- Reactions pour feedback (👍 = useful, 👎 = noise)

**Message Format:**
- Rich formatting (bold, links, emojis)
- Buttons pour actions (View Details, Mark as Read, Create Task)
- Threaded discussions pour comments

---

#### Channel 2: Microsoft Teams Integration

**Features:** (similar to Slack)
- Dedicated Teams channel
- Bot integration
- Adaptive Cards pour rich notifications

---

#### Channel 3: Email

**Features:**
- Daily digest email (customizable schedule)
- Instant alerts pour critical events
- HTML formatted avec branding
- One-click unsubscribe / frequency adjustment

**Template:**
```
Subject: 🎯 Daily Competitive Intelligence - October 30, 2025

Good morning [Name],

Here are your top competitive insights for today:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🚀 PRODUCT LAUNCH: Acme Corp announces "Acme AI"
   A new AI-powered feature competing directly with our Smart Analytics
   » View full analysis | Update battlecard

2. 💰 PRICING CHANGE: BigCo increases prices by 20%
   Opportunity to position our value-for-money advantage
   » See new pricing | View sales play

3. ⭐ CUSTOMER SENTIMENT: XYZ Corp reviews trending negative
   G2 rating dropped from 4.5 to 4.1 (12 reviews citing "poor support")
   » Read reviews | Identify upsell opportunities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Quick Stats:
• 47 new data points collected yesterday
• 3 battlecards updated
• 12 mentions of competitors in your CRM

View full dashboard: [Link]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Powered by MarketIQ AI
Manage preferences | Unsubscribe
```

---

#### Channel 4: CRM Integration (Salesforce)

**Features:**
- Lightning Component in Opportunity page
- Shows competitor info when detected
- Embedded battlecards
- Win/loss insights pour similar deals

**UI Mockup:**
```
┌─ COMPETITIVE INTELLIGENCE ─────────────────────┐
│                                                 │
│ 🎯 Competitor Detected: Acme Corp               │
│                                                 │
│ Latest Updates (last 7 days):                  │
│ • Pricing change: +15% (Oct 28)                │
│ • New case study published (Oct 27)            │
│ • G2 rating: 4.3 ⭐ (down from 4.5)            │
│                                                 │
│ Similar Deals (past 90 days):                  │
│ • Won: 8 | Lost: 3 | Win Rate: 73%             │
│                                                 │
│ [View Full Battlecard] [Get AI Insights]       │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

#### Channel 5: Mobile App

**Features:**
- Push notifications (configurable)
- Offline access to battlecards
- Search and browse
- "On the go" mode (simplified UI for mobile)

---

### 5.5 Feedback Loop

**Objective:** Learn from user engagement to improve alert relevance.

**Mechanisms:**

1. **Explicit Feedback**
   - Thumbs up/down on alerts
   - "This was useful" / "Not relevant"
   - Comment feedback

2. **Implicit Signals**
   - Click-through rate
   - Time spent reading
   - Sharing/forwarding

3. **ML Model**
   - Train relevance model per user
   - Predict which alerts each user will find valuable
   - Auto-tune delivery frequency

**Result:** Alert fatigue ↓, Engagement ↑

---

### 5.6 APIs Exposées par le Module

```
GET  /api/v1/alerts - Récupérer alerts avec filters
POST /api/v1/alerts - Créer une alerte manuelle
PUT  /api/v1/alerts/:id/read - Marquer alerte comme lue
POST /api/v1/alerts/rules - Créer règle d'alerte customisée
GET  /api/v1/alerts/preferences - Préférences utilisateur
PUT  /api/v1/alerts/preferences - Mettre à jour préférences
```

---

## MODULE 6: WIN/LOSS INTELLIGENCE

### 6.1 Objectif
Intégrer l'analyse win/loss dans la plateforme pour boucler la loop competitive intelligence → sales outcomes.

**Inspiration:** Feature différenciatrice de Klue.

### 6.2 Data Sources pour Win/Loss

1. **CRM (Salesforce, HubSpot)**
   - Closed Won / Closed Lost opportunities
   - Competitor field
   - Loss reason field
   - Deal notes

2. **Sales Call Transcripts (Gong, Chorus)**
   - Mentions de concurrents dans calls
   - Objections raised
   - Competitor strengths/weaknesses mentionnées

3. **Post-Deal Interviews**
   - Automated interview request après deal closed
   - Survey forms (won vs lost)
   - Optional: Human-conducted interviews (qualitative)

### 6.3 Fonctionnalités

#### Feature 6.1: Automated Win/Loss Tracking

**Description:** Tracking automatique de toutes les opportunités close-won et close-lost.

**Process:**

1. **CRM Webhook** → Opportunity status changed to "Closed Won" or "Closed Lost"
2. **System captures:**
   - Opportunity details (size, industry, stage duration)
   - Competitor involved (from Competitor field)
   - Loss reason (from dropdown or text field)
   - Sales rep notes
3. **System triggers:**
   - Post-deal survey envoyée automatiquement au sales rep
   - (Optionnel) Survey envoyée au prospect/customer

**Win/Loss Survey Questions (Sales Rep):**

**For Lost Deals:**
```
1. Which competitor did we lose to? [Dropdown: Competitors + Other]
2. Primary reason for loss? [Multiple choice]
   ☐ Price
   ☐ Product features/functionality
   ☐ Integrations
   ☐ Brand/reputation
   ☐ Existing relationship
   ☐ Implementation timeline
   ☐ Other: ______
3. What specific feature(s) were we missing? [Text]
4. What did the competitor do better? [Text]
5. Could this loss have been prevented? [Yes/No/Unsure]
   If yes, how? [Text]
6. Other feedback: [Text]
```

**For Won Deals:**
```
1. Which competitor(s) were we competing against? [Multi-select]
2. Primary reason we won? [Multiple choice]
   ☐ Better product features
   ☐ Better pricing
   ☐ Superior support/service
   ☐ Faster implementation
   ☐ Stronger ROI case
   ☐ Relationship/trust
   ☐ Other: ______
3. What competitor weaknesses did we exploit? [Text]
4. Which battlecard/assets were most useful? [Multi-select]
5. What almost made us lose this deal? [Text]
6. Other feedback: [Text]
```

---

#### Feature 6.2: Win/Loss Analytics Dashboard

**Description:** Dashboard showing patterns et insights des wins/losses.

**Key Metrics:**

**Overall:**
- Overall win rate
- Win rate vs each competitor
- Win rate trends over time
- Average deal size (won vs lost)

**By Segment:**
- Win rate by industry
- Win rate by company size (SMB, Mid-Market, Enterprise)
- Win rate by region
- Win rate by deal size

**Loss Reasons Analysis:**
- Top loss reasons (bar chart)
- Loss reasons by competitor
- Trends: Are product gaps increasing as loss reason?

**Competitive Win Rate Matrix:**
```
┌─────────────────────────────────────────┐
│          vs Acme  vs BigCo  vs XYZ Corp │
│ Q3 2025   67%      45%       82%        │
│ Q4 2025   72%      48%       80%        │
│ Trend     ↑        ↑         ↓          │
└─────────────────────────────────────────┘
```

**Insights Auto-Generated:**
```
💡 Key Insights:
• Win rate vs BigCo increased from 45% → 48% after we launched Feature X
• "Missing integrations" as loss reason decreased 30% after partnership with Integration Platform Y
• Enterprise deals (>$50K) have 20% lower win rate vs Acme - requires investigation
```

---

#### Feature 6.3: Win/Loss Intelligence Feed

**Description:** Feed centralisé de toutes les win/loss avec insights.

**Feed Items:**

```
┌─────────────────────────────────────────────────────┐
│ ❌ LOST to Acme Corp • $50K ARR • Enterprise       │
│ Industry: FinTech • Region: EMEA • Rep: John Smith │
│                                                     │
│ Loss Reason: Product Features                       │
│ Missing Feature: Advanced reporting & custom dashboards │
│                                                     │
│ Rep Notes: "Prospect loved our UX but needed more │
│ granular analytics. Acme had pre-built dashboards  │
│ for their industry."                                │
│                                                     │
│ 🤖 AI Analysis:                                     │
│ This is the 4th loss this quarter citing "advanced │
│ reporting" - suggests prioritizing analytics       │
│ module on roadmap. Acme's dashboards are featured │
│ prominently in their recent case studies.          │
│                                                     │
│ [Update Battlecard] [Flag for Product Team] [View Similar Deals] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ✅ WON vs Acme Corp & BigCo • $120K ARR • Enterprise │
│ Industry: Healthcare • Region: North America       │
│                                                     │
│ Win Reason: Superior Product + Implementation Speed│
│                                                     │
│ Rep Notes: "Prospect was impressed by our faster  │
│ time-to-value (2 weeks vs 3 months for Acme).     │
│ Our healthcare compliance features were key.       │
│ Battlecard for Acme was extremely helpful."        │
│                                                     │
│ 🤖 AI Analysis:                                     │
│ "Fast implementation" is emerging as a key win     │
│ factor vs enterprise competitors. Consider featuring│
│ this more prominently in positioning.              │
│                                                     │
│ [Create Case Study] [Share Win Story] [Update Sales Play] │
└─────────────────────────────────────────────────────┘
```

---

#### Feature 6.4: Competitive Objection Library

**Description:** Base de données d'objections et recommended responses, enrichie par win/loss data.

**Structure:**

```
Objection: "Competitor X has better reporting features"

Frequency: Mentioned in 23 deals (12 lost, 11 won)

When We Lost (12 deals):
• Response was ineffective or missing
• Prospect had very specific custom reporting needs

When We Won (11 deals):
• Emphasized our easier-to-use reporting (vs complex setup of X)
• Showed faster time-to-insight
• Offered custom report building as part of onboarding

Recommended Response:
"While Competitor X has extensive reporting, many customers tell us their
reports are complex to set up and require SQL knowledge. Our reporting is
designed for business users to create custom reports in minutes with our
drag-and-drop builder. Plus, our Customer Success team will build your first
5 custom reports during onboarding at no extra cost."

Supporting Materials:
• Demo video: Custom report builder (2 min)
• Case study: Customer Y reduced reporting time by 60%
• G2 reviews highlighting ease of use
```

**How It's Built:**
- Objections extracted from CRM notes + sales call transcripts
- Win/loss correlation analysis
- LLM generates recommended responses based on winning deals
- Continuous improvement as more data collected

---

#### Feature 6.5: Post-Loss Re-Engagement Campaigns

**Description:** Automated campaigns pour re-engage prospects qui nous ont choisi un concurrent.

**Logic:**

1. **Opportunity Lost** → Added to "Lost to Competitor X" segment in CRM
2. **Wait 60-90 days**
3. **Monitor Competitor X for negative signals:**
   - Negative reviews spike
   - Service outage
   - Price increase
   - Layoffs / bad press
4. **If negative signal detected:**
   - Alert sales rep
   - Suggest re-engagement
   - Provide talking points ("We noticed X recently increased prices 20%...")

**Automation:**
- Auto-generate re-engagement email templates
- Track re-engagement success rate
- Measure "lost deal recovery" as a metric

---

### 6.4 APIs Exposées par le Module

```
GET  /api/v1/winloss/deals - Récupérer deals with filters
GET  /api/v1/winloss/analytics - Métriques agrégées
GET  /api/v1/winloss/insights - AI-generated insights
POST /api/v1/winloss/survey-response - Soumettre réponse survey
GET  /api/v1/winloss/objections - Library d'objections
```

---

## MODULE 7: PREDICTIVE ANALYTICS

### 7.1 Objectif
Aller au-delà de l'intelligence réactive pour prévoir les mouvements concurrents futurs.

### 7.2 Modèles Prédictifs

#### Model 1: Competitor Growth Forecast

**Input:**
- Hiring velocity (job postings time-series)
- Funding events
- Customer review volume trends
- Social media follower growth

**Model:** Prophet (time-series forecasting)

**Output:**
- Predicted headcount growth (next 6-12 months)
- Predicted market share evolution
- Confidence intervals

**Visualization:** Line chart avec forecast + confidence bands

**Actionable Insight:**
```
📈 GROWTH FORECAST: Acme Corp

Prediction: Acme will grow from 200 → 280 employees by Q2 2026 (+40%)

Signals:
• 15 job postings/week (up from 5/week 6 months ago)
• Recent $20M Series B funding
• LinkedIn followers +25% QoQ

Implications:
• Aggressive market expansion expected
• Likely entering new verticals or geographies
• Increased competitive pressure in H1 2026

Recommended Actions:
• Accelerate our own hiring in overlapping markets
• Strengthen customer retention programs
• Monitor for product launches
```

---

#### Model 2: Product Launch Predictor

**Input:**
- Engineering job postings (specific roles: ML engineers, frontend, etc.)
- Patent filings
- Conference speaking slots booked
- Social media teasers
- Beta program mentions

**Model:** Multi-signal ML classifier (Random Forest)

**Output:**
- Probability of product launch in next 3/6/12 months
- Predicted product category (based on job descriptions, patents)

**Example:**
```
🚀 PRODUCT LAUNCH PREDICTION: BigCo

Probability of major product launch in Q1 2026: 78%

Predicted Category: AI-powered analytics module

Supporting Signals:
• 8 "Machine Learning Engineer" jobs posted
• Patent filed: "System and method for predictive data analysis" (May 2025)
• CEO mentioned "exciting AI announcement" in earnings call
• Beta testers discussing "new analytics" on Twitter

Competitive Impact:
• Would directly compete with our Analytics Pro feature
• Potential differentiation: They may focus on predictive vs our descriptive analytics

Recommended Actions:
• Accelerate our AI roadmap
• Prepare defensive positioning
• Monitor beta tester feedback for feature details
```

---

#### Model 3: Churn Risk Indicator (for Competitor Customers)

**Input:**
- Review sentiment trends (for competitor)
- Mentions of competitor issues on social/forums
- Competitor service outages
- Competitor price increases

**Model:** Sentiment time-series + anomaly detection

**Output:**
- "Competitor X's customers are increasingly unhappy" signal
- Specific issues causing dissatisfaction
- High-propensity accounts to target (if data available)

**Example:**
```
⚠️ CHURN RISK ALERT: XYZ Corp Customers

Competitor: XYZ Corp
Signal Strength: High 🔴

Recent Indicators:
• G2 rating dropped from 4.5 → 4.1 in 30 days (15 new negative reviews)
• Reddit thread "Why we're leaving XYZ Corp" (120 upvotes)
• 3 mentions of service outages on Twitter this month
• Price increased 25% with negative response on social

Top Customer Complaints:
1. "Support response times have tripled" (mentioned 8 times)
2. "Frequent outages affecting business" (7 times)
3. "Price increase not justified" (6 times)

Opportunity:
• XYZ Corp has ~500 customers in our ICP
• Estimated 15-20% may be considering alternatives
• Our strength in support quality & uptime is key differentiator

Recommended Campaign:
• "Switch from XYZ Corp" landing page
• Ads targeting XYZ Corp keywords
• Outreach emphasizing support & reliability
• Special "switching" incentive (1 month free, free migration)

[Launch Campaign] [Create Sales Play] [Target Account List]
```

---

#### Model 4: Strategic Move Predictor

**Input:**
- News articles, press releases
- Executive statements
- Partnership announcements
- Investor activity

**Model:** LLM-based analysis (Claude 3.5 Sonnet) pour strategic reasoning

**Output:**
- Predicted strategic moves (expansion, pivot, M&A, etc.)
- Reasoning and supporting evidence
- Potential impact on us

**Example:**
```
🎯 STRATEGIC PREDICTION: Acme Corp

Predicted Move: Acquisition of a European competitor to enter EMEA market

Confidence: Medium-High (70%)

Supporting Evidence:
• Acme CEO mentioned "international expansion" 3 times in recent earnings call
• Acme hired VP of Corporate Development with M&A background (Jan 2025)
• Acme secured $50M credit facility (typically used for acquisitions)
• Only 2% of Acme's revenue from EMEA (vs 30% industry average)
• Two European competitors (SmallCo, StartupXYZ) are rumored to be raising or selling

Likely Targets:
1. SmallCo (€10M revenue, 50 employees, strong EMEA presence)
2. StartupXYZ (€5M revenue, complementary product)

Timeline: Next 6-12 months

Impact on Us:
• If successful, Acme would gain rapid EMEA presence
• Could threaten our EMEA growth plans
• Expect aggressive competition in European markets

Preemptive Actions:
• Accelerate our own EMEA expansion
• Strengthen relationships with key EMEA customers
• Consider defensive partnership with European players
• Prepare competitive positioning for "Acme + SmallCo" entity

[Monitor Closely] [Create Task for Strategy Team] [Update Risk Register]
```

---

### 7.3 Scenario Planning

**Feature:** AI-generated "what-if" scenarios.

**User Input:**
```
"What if Competitor X acquires Competitor Y?"
```

**AI Output (via Claude):**
```
SCENARIO ANALYSIS: Acme Corp acquires BigCo

Combined Entity Profile:
• Revenue: $200M (Acme $120M + BigCo $80M)
• Employees: 900 (Acme 500 + BigCo 400)
• Customers: 3,000 (Acme 1,800 + BigCo 1,200)
• Market Share: 25% (vs our 15%)

Strategic Implications:

1. PRODUCT SYNERGIES
   • Acme gains BigCo's enterprise features (currently our advantage)
   • BigCo gains Acme's SMB-friendly UX
   • Combined product would be formidable competitor across all segments

2. CUSTOMER BASE
   • 30% customer overlap → potential churn from merger
   • 70% new customers for cross-sell opportunity
   • We could target churning customers during integration

3. MARKET POSITIONING
   • Combined entity becomes clear market leader
   • Pricing power increases
   • May reduce competition in mid-market (consolidation)

4. OPERATIONAL CHALLENGES
   • Product integration will take 12-18 months
   • Cultural integration risks (Acme startup vs BigCo corporate)
   • Potential talent attrition during transition

OPPORTUNITIES FOR US:

1. Short-term (0-6 months):
   • Target customers frustrated by merger uncertainty
   • Position as "stable, focused alternative"
   • Recruit top talent leaving merged entity

2. Medium-term (6-18 months):
   • Capitalize on product integration delays
   • Win deals during their internal transition
   • Emphasize our agility vs their bureaucracy

3. Long-term (18+ months):
   • Differentiate against larger, less nimble competitor
   • Focus on underserved niches they may abandon
   • Position as "customer-first" vs "shareholder-first"

THREATS:

1. Combined resources accelerate innovation
2. Pricing pressure if they leverage scale
3. Brand recognition and trust increases
4. Easier to sell full suite vs point solutions

RECOMMENDED STRATEGIC RESPONSE:

1. IMMEDIATE:
   ☐ Prepare defensive positioning for our customers
   ☐ Create "Why not to wait for Acme+BigCo" messaging
   ☐ Ready sales plays for merger-related objections

2. 6 MONTHS:
   ☐ Accelerate our own product roadmap in areas of overlap
   ☐ Pursue partnership to match their combined capabilities
   ☐ Consider acquisition targets to compete on scale

3. 12 MONTHS:
   ☐ Evaluate strategic options (raise funding, seek partnership, M&A)
   ☐ Differentiate on dimensions difficult for large entity (agility, customization, service)

[Save Scenario] [Share with Leadership] [Create Action Plan]
```

---

### 7.4 APIs Exposées par le Module

```
GET  /api/v1/predict/growth/:competitor_id - Growth forecast
GET  /api/v1/predict/product-launch/:competitor_id - Product launch prediction
GET  /api/v1/predict/churn-risk/:competitor_id - Churn risk analysis
POST /api/v1/predict/scenario - AI scenario planning
GET  /api/v1/predict/trends - Market trends predictions
```

---

## MODULE 8: CONVERSATIONAL AI ASSISTANT

### 8.1 Objectif
Fournir un assistant IA conversationnel (type ChatGPT) pour interroger l'intelligence compétitive.

**Inspiration:** "Crayon Answers" - revendiqué comme premier dans l'industrie.

### 8.2 Architecture

**Technology Stack:**
- Frontend: Chat interface (type ChatGPT)
- Backend: RAG (Retrieval Augmented Generation)
  - Vector DB: Pinecone (pour recherche sémantique)
  - LLM: Claude 3.5 Sonnet (meilleur reasoning, 200K context)
  - Embeddings: OpenAI text-embedding-3-large

**How It Works:**

1. User pose une question en langage naturel
2. Question est embedded (vectorisée)
3. Vector search dans Pinecone → Top-K documents pertinents
4. Documents + Question envoyés à Claude
5. Claude génère réponse en s'appuyant sur les documents
6. Réponse inclut citations (liens vers sources)

### 8.3 Exemples d'Interactions

**Example 1: Factual Question**
```
User: What is Acme Corp's pricing for their Enterprise plan?