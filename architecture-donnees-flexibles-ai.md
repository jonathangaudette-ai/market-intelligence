# Architecture de Données Flexibles pour Analyse AI
## Comment stocker et exploiter l'intelligence LinkedIn avec Claude Sonnet 4.5

**Date:** 1er novembre 2025
**Contexte:** Données LinkedIn (entreprise, employés, recrutements, contrats) → Analyse de scénarios par AI

---

## Table des Matières

1. [Le Problème de la Rigidité](#1-le-problème-de-la-rigidité)
2. [Architecture Hybride Recommandée](#2-architecture-hybride-recommandée)
3. [Couche 1: Raw Storage (Immutable)](#3-couche-1-raw-storage-immutable)
4. [Couche 2: Structured Flexible (JSONB)](#4-couche-2-structured-flexible-jsonb)
5. [Couche 3: Graph Relations (Neo4j)](#5-couche-3-graph-relations-neo4j)
6. [Couche 4: Vector Semantic (Pinecone)](#6-couche-4-vector-semantic-pinecone)
7. [Patterns de Consommation par Claude](#7-patterns-de-consommation-par-claude)
8. [Workflow Complet: LinkedIn → Analyse](#8-workflow-complet-linkedin--analyse)
9. [Code Examples Pratiques](#9-code-examples-pratiques)

---

## 1. Le Problème de la Rigidité

### 1.1 Approche Traditionnelle (Trop Rigide)

```sql
-- ❌ PROBLÈME: Schema rigide, difficile à évoluer
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    title VARCHAR(255),
    company_id INT,
    start_date DATE,
    -- Mais si LinkedIn ajoute de nouvelles données?
    -- Mais si on veut stocker "skills" (array)?
    -- Mais si "title" change de format?
    -- → Migrations SQL constantes, breaking changes
);
```

**Problèmes:**
- ❌ Migrations fréquentes quand schema change
- ❌ Perte de données si nouveau champ non prévu
- ❌ Rigidité pour données semi-structurées (skills, expériences)
- ❌ Difficile d'ajouter nouvelles sources (Crunchbase, G2, etc.)

### 1.2 Approche "Tout en JSON" (Trop Flexible)

```python
# ❌ PROBLÈME: Tout en JSON dans S3, aucune structure
s3.put_object(
    Bucket='data',
    Key=f'linkedin/company_{company_id}.json',
    Body=json.dumps(raw_data)
)

# Impossible de query:
# - "Trouve toutes les entreprises qui ont embauché +10 personnes ce mois"
# - "Liste les employés qui ont changé de titre récemment"
# - "Graph des mouvements d'employés entre concurrents"
```

**Problèmes:**
- ❌ Pas de queries structurées
- ❌ Pas de relations entre entités
- ❌ Performances catastrophiques pour analytics
- ❌ LLM doit charger tout le JSON (context window gaspillé)

---

## 2. Architecture Hybride Recommandée

### 2.1 Vue d'Ensemble: 4 Couches Complémentaires

```
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 4: VECTOR SEMANTIC SEARCH (Pinecone)                │
│  • Embeddings de descriptions, posts, skills                │
│  • Semantic search: "compétences en AI"                     │
│  • Similarité entre profils, entreprises                    │
│  → Pour: RAG, recherche sémantique                          │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 3: GRAPH RELATIONS (Neo4j)                          │
│  • Entités: Company, Person, Job, Contract                  │
│  • Relations: WORKS_AT, HIRED, WON_CONTRACT                 │
│  • Graph queries: "Chemins entre concurrents"               │
│  → Pour: Analyse de réseaux, mouvements employés            │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 2: STRUCTURED FLEXIBLE (PostgreSQL JSONB)           │
│  • Schema minimal + JSONB pour flexibilité                  │
│  • Indexes sur champs critiques                             │
│  • Time-series pour évolution                               │
│  → Pour: Queries analytiques, time-series                   │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 1: RAW IMMUTABLE STORAGE (S3)                       │
│  • JSON brut de l'API LinkedIn (immutable)                  │
│  • Versioning, historique complet                           │
│  • Source of truth                                          │
│  → Pour: Audit, reprocessing, debug                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Pourquoi 4 Couches?

| Couche | Rôle | Quand Utiliser |
|--------|------|----------------|
| **Raw (S3)** | Archive, source of truth | Audit, reprocess si bug, compliance |
| **Structured (PG)** | Analytics, time-series | Queries: "Combien d'embauches ce mois?" |
| **Graph (Neo4j)** | Relations, réseaux | "Employés passés de Acme à BigCo?" |
| **Vector (Pinecone)** | Semantic search | RAG pour Claude: "Skills similaires à..." |

**Principe:** Chaque couche a un usage spécifique, pas de duplication inutile

---

## 3. Couche 1: Raw Storage (Immutable)

### 3.1 Philosophie: Event Sourcing

**Concept:** Stocker les données brutes exactement comme reçues, jamais modifier

```python
# Structure S3
s3://intelligence-data/
  └── raw/
      └── linkedin/
          └── companies/
              └── acme-corp/
                  ├── 2025-11-01T10:00:00Z.json  # Snapshot du 1er nov
                  ├── 2025-11-02T10:00:00Z.json  # Snapshot du 2 nov
                  └── 2025-11-03T10:00:00Z.json  # Snapshot du 3 nov
          └── employees/
              └── acme-corp/
                  ├── 2025-11-01T10:00:00Z.json
                  └── 2025-11-02T10:00:00Z.json
          └── jobs/
              └── acme-corp/
                  └── 2025-11-01T10:00:00Z.json
          └── contracts/  # Si disponible via API ou scraping
              └── acme-corp/
                  └── 2025-11-01T10:00:00Z.json
```

### 3.2 Format des Données Brutes

```json
// s3://raw/linkedin/companies/acme-corp/2025-11-01T10:00:00Z.json
{
  "source": "linkedin_api",
  "collected_at": "2025-11-01T10:00:00Z",
  "company_id": "acme-corp",
  "api_version": "v2",

  "raw_data": {
    // JSON EXACT de l'API LinkedIn (Proxycurl, Apify, etc.)
    "name": "Acme Corp",
    "universal_name": "acme-corp",
    "staff_count": 250,
    "follower_count": 12500,
    "tagline": "Building the future of X",
    "description": "Long description...",
    "specialties": ["AI", "SaaS", "B2B"],
    "founded_year": 2018,
    "locations": [
      {"country": "US", "city": "San Francisco"},
      {"country": "UK", "city": "London"}
    ],
    "funding_data": {
      "last_funding_round": "Series B",
      "amount_raised": "$45M"
    },
    // ... tout le reste du JSON API
  },

  "metadata": {
    "collection_method": "proxycurl_api",
    "cost": 0.02,  # USD per call
    "response_time_ms": 1234
  }
}
```

### 3.3 Avantages Raw Storage

```python
# ✅ AVANTAGES

# 1. Reprocessing si on découvre un bug
for snapshot in s3.list_objects('raw/linkedin/companies/acme-corp/'):
    data = json.loads(s3.get_object(snapshot.key))
    reprocess_with_new_logic(data)  # Fix bug retroactivement

# 2. Compliance & Audit
# Si question: "D'où vient cette donnée?"
# → Réponse: Exact JSON de l'API à timestamp X

# 3. Schema changes
# API LinkedIn ajoute nouveau champ "employee_growth_rate"?
# → Déjà stocké dans raw! Juste extraire rétroactivement

# 4. Time travel
# "Comment était Acme Corp il y a 3 mois?"
snapshot_3_months_ago = get_closest_snapshot('2025-08-01')
```

---

## 4. Couche 2: Structured Flexible (JSONB)

### 4.1 Schema Hybride: Minimal Structure + JSONB Flexibility

```sql
-- PostgreSQL avec JSONB (meilleur des deux mondes)

-- ========================================
-- TABLE: companies
-- ========================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- STRUCTURED (fields qu'on query souvent)
    linkedin_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    universal_name VARCHAR(255),
    employee_count INT,
    follower_count INT,
    founded_year INT,

    -- TIME-SERIES
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- FLEXIBLE (tout le reste en JSONB)
    data JSONB NOT NULL,

    -- Metadata
    source VARCHAR(100) DEFAULT 'linkedin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes pour performance
    CONSTRAINT positive_employee_count CHECK (employee_count >= 0)
);

-- Indexes critiques
CREATE INDEX idx_companies_linkedin_id ON companies(linkedin_id);
CREATE INDEX idx_companies_collected_at ON companies(collected_at DESC);
CREATE INDEX idx_companies_employee_count ON companies(employee_count)
    WHERE employee_count IS NOT NULL;

-- GIN index pour JSONB (permet queries sur nested JSON)
CREATE INDEX idx_companies_data_gin ON companies USING GIN (data);

-- Index sur JSONB specific fields (si query fréquent)
CREATE INDEX idx_companies_specialties ON companies
    USING GIN ((data->'specialties'));
```

### 4.2 Exemple de Données Stockées

```sql
INSERT INTO companies (linkedin_id, name, employee_count, data) VALUES (
    'acme-corp',
    'Acme Corp',
    250,
    '{
        "tagline": "Building the future of X",
        "description": "Long description...",
        "specialties": ["AI", "SaaS", "B2B"],
        "locations": [
            {"country": "US", "city": "San Francisco", "is_hq": true},
            {"country": "UK", "city": "London", "is_hq": false}
        ],
        "funding": {
            "total_raised": "$45M",
            "last_round": "Series B",
            "last_round_date": "2025-08-15",
            "investors": ["GreatVC", "AwesomeFund"]
        },
        "website": "https://acme.com",
        "industry": "Computer Software",
        "company_size_range": "201-500"
    }'::jsonb
);
```

### 4.3 Queries Puissantes avec JSONB

```sql
-- Query 1: Toutes les entreprises avec "AI" dans specialties
SELECT name, data->'specialties' as specialties
FROM companies
WHERE data->'specialties' ? 'AI';

-- Query 2: Entreprises avec HQ à San Francisco
SELECT name, employee_count
FROM companies
WHERE data->'locations' @> '[{"city": "San Francisco", "is_hq": true}]'::jsonb;

-- Query 3: Entreprises funded par "GreatVC"
SELECT name, data->'funding'->'total_raised' as funding
FROM companies
WHERE data->'funding'->'investors' ? 'GreatVC';

-- Query 4: Time-series - évolution employee count
SELECT
    date_trunc('month', collected_at) as month,
    AVG(employee_count) as avg_employees,
    MAX(employee_count) as max_employees
FROM companies
WHERE linkedin_id = 'acme-corp'
GROUP BY month
ORDER BY month DESC;
```

### 4.4 Schema Employees (Similar Pattern)

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- STRUCTURED
    linkedin_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(500) NOT NULL,
    current_title VARCHAR(500),
    company_id UUID REFERENCES companies(id),

    -- TIME-SERIES
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- FLEXIBLE
    data JSONB NOT NULL,
    -- data contains: profile_url, headline, summary, skills[],
    --                experiences[], education[], languages[], etc.

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_collected_at ON employees(collected_at DESC);
CREATE INDEX idx_employees_data_gin ON employees USING GIN (data);

-- Index sur skills (query fréquent)
CREATE INDEX idx_employees_skills ON employees
    USING GIN ((data->'skills'));
```

### 4.5 Schema Jobs (Hiring Activity)

```sql
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- STRUCTURED
    company_id UUID REFERENCES companies(id),
    title VARCHAR(500) NOT NULL,
    location VARCHAR(255),
    posted_date DATE,

    -- Detection de changement
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,

    -- FLEXIBLE
    data JSONB NOT NULL,
    -- data contains: description, seniority_level, employment_type,
    --                job_functions[], industries[], skills_required[]

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_company_id ON job_postings(company_id);
CREATE INDEX idx_jobs_posted_date ON job_postings(posted_date DESC);
CREATE INDEX idx_jobs_is_active ON job_postings(is_active) WHERE is_active = true;
CREATE INDEX idx_jobs_data_gin ON job_postings USING GIN (data);
```

### 4.6 Schema Contracts/Wins (Si Disponible)

```sql
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- STRUCTURED
    company_id UUID REFERENCES companies(id),
    contract_type VARCHAR(100), -- 'customer_win', 'partnership', 'integration'
    announced_date DATE,

    -- FLEXIBLE
    data JSONB NOT NULL,
    -- data contains: customer_name, contract_value, source_url,
    --                announcement_text, strategic_importance

    source VARCHAR(100), -- 'press_release', 'linkedin_post', 'news_article'
    source_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_announced_date ON contracts(announced_date DESC);
```

---

## 5. Couche 3: Graph Relations (Neo4j)

### 5.1 Pourquoi un Graph Database?

**Use cases parfaits pour graph:**

```cypher
// Question: "Quels employés sont passés de Acme à nos concurrents?"
MATCH (p:Person)-[w1:WORKED_AT]->(acme:Company {name: "Acme Corp"})
WHERE w1.end_date IS NOT NULL
MATCH (p)-[w2:WORKS_AT]->(competitor:Company)
WHERE (competitor)-[:COMPETES_WITH]->(:Company {name: "Our Company"})
RETURN p.name, w1.end_date, competitor.name
ORDER BY w1.end_date DESC

// Question: "Network effect - qui connaît qui entre concurrents?"
MATCH path = (acme:Company {name: "Acme Corp"})-[:EMPLOYS]->
             (p:Person)-[:WORKED_AT]->
             (bigco:Company {name: "BigCo"})
RETURN path
LIMIT 10
```

### 5.2 Schema Neo4j

```cypher
// ========================================
// NODES (Entités)
// ========================================

// Company Node
CREATE (c:Company {
    id: "uuid",
    linkedin_id: "acme-corp",
    name: "Acme Corp",
    employee_count: 250,
    founded_year: 2018,
    last_updated: datetime()
})

// Person Node
CREATE (p:Person {
    id: "uuid",
    linkedin_id: "john-doe-123",
    name: "John Doe",
    current_title: "VP Engineering",
    last_updated: datetime()
})

// Job Posting Node
CREATE (j:JobPosting {
    id: "uuid",
    title: "Senior ML Engineer",
    location: "San Francisco",
    posted_date: date("2025-11-01"),
    is_active: true
})

// Contract/Win Node
CREATE (contract:Contract {
    id: "uuid",
    customer_name: "BigCustomer Inc",
    announced_date: date("2025-10-15"),
    type: "customer_win"
})

// Technology Node
CREATE (t:Technology {
    name: "Python",
    category: "Programming Language"
})

// ========================================
// RELATIONSHIPS (Relations)
// ========================================

// Person → Company (current)
CREATE (person)-[:WORKS_AT {
    title: "VP Engineering",
    started_date: date("2023-01-15")
}]->(company)

// Person → Company (past)
CREATE (person)-[:WORKED_AT {
    title: "Senior Engineer",
    started_date: date("2020-06-01"),
    end_date: date("2022-12-31"),
    duration_months: 30
}]->(previous_company)

// Company → Job Posting
CREATE (company)-[:HAS_OPEN_POSITION {
    posted_date: date("2025-11-01")
}]->(job)

// Company → Contract
CREATE (company)-[:WON_CONTRACT {
    announced_date: date("2025-10-15"),
    source: "press_release"
}]->(contract)

// Company → Company (competition)
CREATE (company1)-[:COMPETES_WITH {
    intensity: "high",  // high, medium, low
    segments_overlap: ["enterprise", "mid-market"]
}]->(company2)

// Company → Company (partnership)
CREATE (company1)-[:PARTNERS_WITH {
    partnership_type: "integration",
    announced_date: date("2025-09-01")
}]->(company2)

// Company → Technology (uses)
CREATE (company)-[:USES_TECHNOLOGY {
    detected_from: "job_postings",
    confidence: 0.9
}]->(tech)

// Person → Technology (skilled in)
CREATE (person)-[:SKILLED_IN {
    proficiency_level: "expert",  // beginner, intermediate, expert
    years_experience: 5
}]->(tech)
```

### 5.3 Queries Graph Puissantes

```cypher
// ========================================
// QUERY 1: Talent Flow Between Competitors
// ========================================
// "D'où viennent les nouveaux employés de Acme?"
MATCH (p:Person)-[w:WORKED_AT]->(prev:Company)
WHERE w.end_date >= date("2025-01-01")
MATCH (p)-[:WORKS_AT]->(acme:Company {name: "Acme Corp"})
RETURN prev.name as previous_company,
       count(p) as num_hires,
       collect(p.name) as employees
ORDER BY num_hires DESC

// ========================================
// QUERY 2: Hiring Velocity by Department
// ========================================
// "Combien d'employés Engineering vs Sales embauchés?"
MATCH (acme:Company {name: "Acme Corp"})-[:HAS_OPEN_POSITION]->(j:JobPosting)
WHERE j.is_active = true
WITH j.data.job_function as department, count(j) as num_positions
RETURN department, num_positions
ORDER BY num_positions DESC

// ========================================
// QUERY 3: Technology Stack Intelligence
// ========================================
// "Quelles technos utilisent nos concurrents mais pas nous?"
MATCH (competitor:Company)-[:COMPETES_WITH]->(:Company {name: "Us"})
MATCH (competitor)-[:USES_TECHNOLOGY]->(tech:Technology)
WHERE NOT EXISTS((:Company {name: "Us"})-[:USES_TECHNOLOGY]->(tech))
RETURN tech.name, count(competitor) as num_competitors_using
ORDER BY num_competitors_using DESC

// ========================================
// QUERY 4: Network Connections (2nd degree)
// ========================================
// "Qui chez nous connaît quelqu'un chez Acme?"
MATCH (us:Company {name: "Us"})-[:EMPLOYS]->(our_person:Person)
MATCH (our_person)-[:WORKED_AT]->(shared_company:Company)<-[:WORKED_AT]-(their_person:Person)
MATCH (their_person)-[:WORKS_AT]->(acme:Company {name: "Acme Corp"})
WHERE our_person <> their_person
RETURN our_person.name as our_employee,
       their_person.name as acme_employee,
       shared_company.name as connection_point
LIMIT 20

// ========================================
// QUERY 5: Strategic Move Detection
// ========================================
// "Acme a-t-il embauché dans de nouvelles geos récemment?"
MATCH (acme:Company {name: "Acme Corp"})-[rel:HAS_OPEN_POSITION]->(j:JobPosting)
WHERE j.posted_date >= date("2025-10-01")
WITH DISTINCT j.location as new_location
MATCH (acme)-[:HAS_OFFICE_IN]->(existing_location:Location)
WHERE NOT new_location IN collect(existing_location.city)
RETURN new_location as expansion_location
```

---

## 6. Couche 4: Vector Semantic (Pinecone)

### 6.1 Pourquoi Vector Search?

**Use case:** Recherche sémantique, pas keyword matching

```python
# Keyword search (limité):
query = "machine learning engineer"
# → Trouve uniquement jobs avec exact terms

# Semantic search (puissant):
query_embedding = embed("looking for AI/ML talent")
# → Trouve:
#    - "Machine Learning Engineer"
#    - "Data Scientist - Deep Learning"
#    - "AI Research Scientist"
#    - "Applied ML Engineer"
#    → Comprend le sens, pas juste les mots
```

### 6.2 Ce Qu'on Vectorise

```python
# 1. Job Descriptions (pour semantic search)
job_text = f"""
Title: {job.title}
Location: {job.location}
Description: {job.description}
Required Skills: {', '.join(job.skills)}
"""
embedding = openai.embeddings.create(
    model="text-embedding-3-large",
    input=job_text
)

pinecone.upsert(
    vectors=[{
        "id": job.id,
        "values": embedding.data[0].embedding,
        "metadata": {
            "type": "job_posting",
            "company_id": job.company_id,
            "company_name": "Acme Corp",
            "title": job.title,
            "posted_date": "2025-11-01",
            "is_active": True
        }
    }]
)

# 2. Employee Profiles (pour similarité)
employee_text = f"""
Name: {employee.name}
Title: {employee.title}
Summary: {employee.summary}
Skills: {', '.join(employee.skills)}
Experience: {employee.experience_summary}
"""
embedding = embed(employee_text)

# 3. Company Descriptions
company_text = f"""
Company: {company.name}
Tagline: {company.tagline}
Description: {company.description}
Specialties: {', '.join(company.specialties)}
"""
embedding = embed(company_text)

# 4. Contract/Win Announcements
contract_text = f"""
{company.name} won contract with {contract.customer_name}
Announcement: {contract.announcement_text}
Strategic importance: {contract.strategic_notes}
"""
embedding = embed(contract_text)
```

### 6.3 Queries Sémantiques

```python
# Query 1: "Quels concurrents embauchent pour de l'IA?"
query = "hiring AI engineers, machine learning, deep learning positions"
results = pinecone.query(
    vector=embed(query),
    filter={
        "type": {"$eq": "job_posting"},
        "is_active": {"$eq": True}
    },
    top_k=20,
    include_metadata=True
)

# → Retourne jobs similaires sémantiquement
for match in results.matches:
    print(f"{match.metadata['company_name']}: {match.metadata['title']}")
    print(f"  Similarity: {match.score}")

# Query 2: "Trouve des profils similaires à ce VP Engineering"
target_profile = get_employee("john-doe-vp-eng")
similar_profiles = pinecone.query(
    vector=embed(target_profile.summary),
    filter={"type": {"$eq": "employee"}},
    top_k=10
)

# Query 3: "Concurrents avec positioning similaire au nôtre"
our_positioning = "We help B2B companies automate marketing with AI"
similar_companies = pinecone.query(
    vector=embed(our_positioning),
    filter={"type": {"$eq": "company"}},
    top_k=5
)
```

---

## 7. Patterns de Consommation par Claude

### 7.1 Principe: RAG Optimisé

**Architecture:**
```
User Query
   ↓
Orchestrator (Claude) decides what data needed
   ↓
Retrieval Strategy (multi-layer):
   ├─ Vector Search (semantic) - Pinecone
   ├─ Graph Query (relationships) - Neo4j
   ├─ Structured Query (analytics) - PostgreSQL
   └─ Time-series (trends) - PostgreSQL
   ↓
Aggregate Results (max 150K tokens for context)
   ↓
Claude Sonnet 4.5 Analysis (200K context window)
   ↓
Synthesized Response
```

### 7.2 Example: "Analyse Acme Corp pour sales call"

```python
async def analyze_competitor_for_sales_call(competitor_name: str, deal_context: dict):
    """
    Claude orchestrates multi-source retrieval for comprehensive analysis
    """

    # ========================================
    # STEP 1: Structured Data Retrieval (PostgreSQL)
    # ========================================
    company_basics = db.query("""
        SELECT
            name,
            employee_count,
            follower_count,
            founded_year,
            data->'specialties' as specialties,
            data->'funding' as funding,
            data->'locations' as locations
        FROM companies
        WHERE name = %s
        ORDER BY collected_at DESC
        LIMIT 1
    """, [competitor_name])

    # Recent hiring activity (time-series)
    hiring_trend = db.query("""
        SELECT
            date_trunc('month', posted_date) as month,
            count(*) as num_jobs,
            json_agg(DISTINCT data->>'job_function') as departments
        FROM job_postings
        WHERE company_id = %s
          AND posted_date >= NOW() - INTERVAL '6 months'
          AND is_active = true
        GROUP BY month
        ORDER BY month DESC
    """, [company_basics.id])

    # Recent contracts/wins
    recent_wins = db.query("""
        SELECT
            contract_type,
            announced_date,
            data->>'customer_name' as customer,
            data->>'announcement_text' as announcement
        FROM contracts
        WHERE company_id = %s
          AND announced_date >= NOW() - INTERVAL '90 days'
        ORDER BY announced_date DESC
    """, [company_basics.id])

    # ========================================
    # STEP 2: Graph Queries (Neo4j)
    # ========================================

    # Employee movements
    talent_flow = neo4j.run("""
        MATCH (p:Person)-[w:WORKED_AT]->(prev:Company)
        WHERE w.end_date >= date("2025-08-01")
        MATCH (p)-[:WORKS_AT]->(target:Company {name: $competitor})
        RETURN prev.name as source_company,
               count(p) as num_hires,
               collect({name: p.name, title: p.current_title}) as hires
        ORDER BY num_hires DESC
        LIMIT 5
    """, competitor=competitor_name)

    # Technology stack
    tech_stack = neo4j.run("""
        MATCH (c:Company {name: $competitor})-[:USES_TECHNOLOGY]->(t:Technology)
        RETURN t.name as technology, t.category as category
    """, competitor=competitor_name)

    # ========================================
    # STEP 3: Semantic Search (Pinecone)
    # ========================================

    # Find similar job postings (understand hiring focus)
    job_focus_query = f"What kind of talent is {competitor_name} hiring?"
    similar_jobs = pinecone.query(
        vector=embed(job_focus_query),
        filter={
            "company_name": {"$eq": competitor_name},
            "is_active": {"$eq": True}
        },
        top_k=10,
        include_metadata=True
    )

    # Find recent announcements/wins similar to our target deal
    deal_similarity_query = f"{deal_context['industry']} {deal_context['company_size']}"
    similar_wins = pinecone.query(
        vector=embed(deal_similarity_query),
        filter={
            "type": {"$eq": "contract"},
            "company_name": {"$eq": competitor_name}
        },
        top_k=5
    )

    # ========================================
    # STEP 4: Aggregate Context for Claude
    # ========================================

    context = {
        "company_basics": company_basics,
        "hiring_trend": hiring_trend,
        "recent_wins": recent_wins,
        "talent_flow": talent_flow,
        "tech_stack": tech_stack,
        "job_focus": similar_jobs,
        "similar_wins": similar_wins
    }

    # Estimate token count (don't exceed 150K for context)
    context_json = json.dumps(context, indent=2)
    estimated_tokens = len(context_json) // 4  # Rough estimate

    if estimated_tokens > 150000:
        # Prune less important data
        context = prune_context(context, max_tokens=150000)

    # ========================================
    # STEP 5: Claude Analysis (Sonnet 4.5)
    # ========================================

    prompt = f"""
You are analyzing {competitor_name} to prepare for a sales call.

<deal_context>
Industry: {deal_context['industry']}
Company Size: {deal_context['company_size']}
Deal Size: {deal_context['deal_size']}
Our Product: {deal_context['our_product']}
</deal_context>

<competitor_intelligence>
{context_json}
</competitor_intelligence>

Provide a comprehensive sales brief including:

1. **30-Second Summary**
   - Key points to know about this competitor

2. **Our Advantages**
   - Where we beat them (based on data)
   - Proof points and evidence

3. **Their Advantages**
   - Where they're strong
   - How to counter each

4. **Recent Activity (Last 90 Days)**
   - Hiring trends and implications
   - Customer wins and patterns
   - Strategic signals

5. **Recommended Talking Points**
   - What to emphasize in the call
   - Traps to set (questions that expose their weaknesses)

6. **Objection Handling**
   - Likely objections based on their strengths
   - How to respond

Format as a clean, scannable brief a sales rep can read in 3 minutes.
Use bullet points, be concise, cite specific data points.
"""

    response = await claude.messages.create(
        model="claude-sonnet-4.5-20250514",
        max_tokens=16000,
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )

    return response.content[0].text
```

### 7.3 Pattern: Incremental Context Loading

**Problème:** Parfois on a trop de données (> 200K tokens)

**Solution:** Claude décide dynamiquement quoi charger

```python
async def smart_context_loading(query: str, competitor: str):
    """
    Claude décide lui-même quelles données charger based on query
    """

    # PHASE 1: Claude planning (avec extended thinking)
    planning_prompt = f"""
User query: "{query}"
Competitor: {competitor}

Available data sources:
1. Company basics (size, funding, locations) - ~2K tokens
2. Hiring activity (6 months) - ~5K tokens
3. Employee profiles (top 20) - ~15K tokens
4. Job postings (active 50+) - ~20K tokens
5. Recent wins/contracts (90 days) - ~8K tokens
6. Technology stack - ~3K tokens
7. Social media posts (30 days) - ~10K tokens
8. G2 reviews (recent 100) - ~30K tokens
9. News mentions (90 days) - ~12K tokens
10. Financial data (if public) - ~5K tokens

Given the user query, which data sources are MOST relevant?
Rank them by importance and estimate if we can fit in 150K token budget.

Think step by step:
1. What is the user really asking?
2. Which data sources directly answer that?
3. Which provide supporting context?
4. What can we skip without losing quality?

Output format:
<reasoning>Your thinking process</reasoning>
<data_sources>
  <source priority="high" estimated_tokens="2000">company_basics</source>
  <source priority="high" estimated_tokens="5000">hiring_activity</source>
  ...
</data_sources>
"""

    planning_response = await claude.messages.create(
        model="claude-sonnet-4.5-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": planning_prompt}]
    )

    # Parse Claude's plan
    selected_sources = parse_data_source_plan(planning_response.content)

    # PHASE 2: Load only selected data
    context = {}
    total_tokens = 0

    for source in selected_sources:
        if total_tokens + source.estimated_tokens > 150000:
            break  # Budget exceeded

        data = await load_data_source(source.name, competitor)
        context[source.name] = data
        total_tokens += source.estimated_tokens

    # PHASE 3: Final analysis with loaded context
    analysis_response = await claude.messages.create(
        model="claude-sonnet-4.5-20250514",
        max_tokens=16000,
        messages=[{
            "role": "user",
            "content": f"{query}\n\n<context>{json.dumps(context)}</context>"
        }]
    )

    return analysis_response.content[0].text
```

---

## 8. Workflow Complet: LinkedIn → Analyse

### 8.1 Pipeline de Bout en Bout

```python
# ========================================
# WORKFLOW: Collecter → Stocker → Analyser
# ========================================

async def full_competitor_intelligence_pipeline(competitor_linkedin_id: str):
    """
    Pipeline complet: API LinkedIn → Multi-layer storage → AI analysis
    """

    # ────────────────────────────────────
    # PHASE 1: COLLECTION (LinkedIn APIs)
    # ────────────────────────────────────

    print(f"📥 Collecting data for {competitor_linkedin_id}...")

    # 1.1 Company Data (via Proxycurl or Apify)
    company_data = await proxycurl.get_company(competitor_linkedin_id)

    # 1.2 Employee List
    employees_data = await proxycurl.get_company_employees(
        competitor_linkedin_id,
        limit=500  # Top 500 employees
    )

    # 1.3 Job Postings
    jobs_data = await apify.run_actor(
        "apify/linkedin-jobs-scraper",
        {
            "company": competitor_linkedin_id,
            "limit": 100
        }
    )

    # 1.4 Recent Posts (for contracts/wins mentions)
    posts_data = await apify.run_actor(
        "apify/linkedin-company-posts-scraper",
        {
            "company": competitor_linkedin_id,
            "count": 50
        }
    )

    # ────────────────────────────────────
    # PHASE 2: RAW STORAGE (S3)
    # ────────────────────────────────────

    print("💾 Storing raw data...")

    timestamp = datetime.utcnow().isoformat()

    await s3.put_object(
        Bucket="intelligence-data",
        Key=f"raw/linkedin/companies/{competitor_linkedin_id}/{timestamp}.json",
        Body=json.dumps({
            "collected_at": timestamp,
            "company": company_data,
            "employees": employees_data,
            "jobs": jobs_data,
            "posts": posts_data
        })
    )

    # ────────────────────────────────────
    # PHASE 3: STRUCTURED STORAGE (PostgreSQL)
    # ────────────────────────────────────

    print("🗄️  Storing structured data...")

    # 3.1 Upsert company
    company_id = await db.execute("""
        INSERT INTO companies (
            linkedin_id, name, employee_count, follower_count,
            founded_year, collected_at, data
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (linkedin_id)
        DO UPDATE SET
            employee_count = EXCLUDED.employee_count,
            follower_count = EXCLUDED.follower_count,
            collected_at = EXCLUDED.collected_at,
            data = EXCLUDED.data,
            updated_at = NOW()
        RETURNING id
    """,
        competitor_linkedin_id,
        company_data['name'],
        company_data['staff_count'],
        company_data['follower_count'],
        company_data.get('founded_year'),
        timestamp,
        json.dumps({
            "tagline": company_data.get('tagline'),
            "description": company_data.get('description'),
            "specialties": company_data.get('specialties', []),
            "locations": company_data.get('locations', []),
            "funding": company_data.get('funding_data', {}),
            "website": company_data.get('website')
        })
    )

    # 3.2 Insert employees
    for emp in employees_data:
        await db.execute("""
            INSERT INTO employees (
                linkedin_id, full_name, current_title,
                company_id, collected_at, data
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (linkedin_id)
            DO UPDATE SET
                current_title = EXCLUDED.current_title,
                collected_at = EXCLUDED.collected_at,
                data = EXCLUDED.data,
                updated_at = NOW()
        """,
            emp['linkedin_id'],
            emp['full_name'],
            emp['title'],
            company_id,
            timestamp,
            json.dumps({
                "profile_url": emp['profile_url'],
                "headline": emp.get('headline'),
                "location": emp.get('location'),
                "skills": emp.get('skills', []),
                "experience": emp.get('experience', [])
            })
        )

    # 3.3 Insert job postings
    for job in jobs_data:
        await db.execute("""
            INSERT INTO job_postings (
                company_id, title, location, posted_date,
                first_seen_at, last_seen_at, is_active, data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (company_id, title, location)
            DO UPDATE SET
                last_seen_at = EXCLUDED.last_seen_at,
                is_active = true
        """,
            company_id,
            job['title'],
            job['location'],
            job['posted_date'],
            timestamp,
            timestamp,
            True,
            json.dumps({
                "description": job.get('description'),
                "seniority_level": job.get('seniority_level'),
                "job_function": job.get('job_function'),
                "employment_type": job.get('employment_type'),
                "industries": job.get('industries', [])
            })
        )

    # 3.4 Extract contracts from posts (using LLM)
    for post in posts_data:
        # Use Claude to detect if post announces a customer win
        is_win, extracted_data = await extract_contract_from_post(post)

        if is_win:
            await db.execute("""
                INSERT INTO contracts (
                    company_id, contract_type, announced_date,
                    source, source_url, data
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """,
                company_id,
                "customer_win",
                post['date'],
                "linkedin_post",
                post['url'],
                json.dumps(extracted_data)
            )

    # ────────────────────────────────────
    # PHASE 4: GRAPH STORAGE (Neo4j)
    # ────────────────────────────────────

    print("🕸️  Building knowledge graph...")

    # 4.1 Create/update company node
    await neo4j.run("""
        MERGE (c:Company {linkedin_id: $linkedin_id})
        SET c.name = $name,
            c.employee_count = $employee_count,
            c.founded_year = $founded_year,
            c.last_updated = datetime()
    """,
        linkedin_id=competitor_linkedin_id,
        name=company_data['name'],
        employee_count=company_data['staff_count'],
        founded_year=company_data.get('founded_year')
    )

    # 4.2 Create employee nodes and relationships
    for emp in employees_data:
        await neo4j.run("""
            MERGE (p:Person {linkedin_id: $linkedin_id})
            SET p.name = $name,
                p.current_title = $title

            MERGE (c:Company {linkedin_id: $company_linkedin_id})

            MERGE (p)-[r:WORKS_AT]->(c)
            SET r.title = $title,
                r.started_date = date($started_date)
        """,
            linkedin_id=emp['linkedin_id'],
            name=emp['full_name'],
            title=emp['title'],
            company_linkedin_id=competitor_linkedin_id,
            started_date=emp.get('started_date', '2024-01-01')  # Estimate if not available
        )

        # Add past experiences (if available)
        for exp in emp.get('experience', []):
            if exp.get('end_date'):  # Past job
                await neo4j.run("""
                    MATCH (p:Person {linkedin_id: $person_linkedin_id})
                    MERGE (prev:Company {name: $prev_company})
                    MERGE (p)-[r:WORKED_AT]->(prev)
                    SET r.title = $title,
                        r.started_date = date($start_date),
                        r.end_date = date($end_date)
                """,
                    person_linkedin_id=emp['linkedin_id'],
                    prev_company=exp['company_name'],
                    title=exp['title'],
                    start_date=exp['start_date'],
                    end_date=exp['end_date']
                )

    # 4.3 Create job posting nodes and relationships
    for job in jobs_data:
        await neo4j.run("""
            MATCH (c:Company {linkedin_id: $company_linkedin_id})
            CREATE (j:JobPosting {
                id: $job_id,
                title: $title,
                location: $location,
                posted_date: date($posted_date),
                is_active: true
            })
            CREATE (c)-[:HAS_OPEN_POSITION {posted_date: date($posted_date)}]->(j)
        """,
            company_linkedin_id=competitor_linkedin_id,
            job_id=str(uuid.uuid4()),
            title=job['title'],
            location=job['location'],
            posted_date=job['posted_date']
        )

    # ────────────────────────────────────
    # PHASE 5: VECTOR STORAGE (Pinecone)
    # ────────────────────────────────────

    print("🔢 Creating embeddings...")

    # 5.1 Embed company description
    company_text = f"""
    {company_data['name']}
    {company_data.get('tagline', '')}
    {company_data.get('description', '')}
    Specialties: {', '.join(company_data.get('specialties', []))}
    """

    company_embedding = await embed(company_text)

    await pinecone.upsert(
        namespace="companies",
        vectors=[{
            "id": f"company_{competitor_linkedin_id}",
            "values": company_embedding,
            "metadata": {
                "type": "company",
                "company_id": str(company_id),
                "name": company_data['name'],
                "employee_count": company_data['staff_count']
            }
        }]
    )

    # 5.2 Embed job postings
    job_vectors = []
    for job in jobs_data:
        job_text = f"""
        {job['title']}
        Location: {job['location']}
        {job.get('description', '')}
        """

        job_embedding = await embed(job_text)

        job_vectors.append({
            "id": f"job_{uuid.uuid4()}",
            "values": job_embedding,
            "metadata": {
                "type": "job_posting",
                "company_id": str(company_id),
                "company_name": company_data['name'],
                "title": job['title'],
                "location": job['location'],
                "posted_date": job['posted_date'],
                "is_active": True
            }
        })

    await pinecone.upsert(namespace="jobs", vectors=job_vectors)

    # 5.3 Embed employee profiles (top 50 for now)
    employee_vectors = []
    for emp in employees_data[:50]:
        emp_text = f"""
        {emp['full_name']}
        {emp['title']}
        {emp.get('headline', '')}
        Skills: {', '.join(emp.get('skills', []))}
        """

        emp_embedding = await embed(emp_text)

        employee_vectors.append({
            "id": f"employee_{emp['linkedin_id']}",
            "values": emp_embedding,
            "metadata": {
                "type": "employee",
                "name": emp['full_name'],
                "title": emp['title'],
                "company_name": company_data['name']
            }
        })

    await pinecone.upsert(namespace="employees", vectors=employee_vectors)

    # ────────────────────────────────────
    # PHASE 6: AI ANALYSIS (Claude)
    # ────────────────────────────────────

    print("🤖 Running AI analysis...")

    analysis = await analyze_competitor_intelligence(
        competitor_linkedin_id,
        {
            "company_data": company_data,
            "hiring_velocity": len(jobs_data),
            "employee_count": len(employees_data),
            "recent_activity": posts_data
        }
    )

    print("✅ Pipeline complete!")

    return {
        "company_id": company_id,
        "data_collected": {
            "employees": len(employees_data),
            "jobs": len(jobs_data),
            "posts": len(posts_data)
        },
        "analysis": analysis
    }


async def extract_contract_from_post(post: dict) -> tuple[bool, dict]:
    """
    Use Claude to detect if LinkedIn post announces a customer win
    """
    prompt = f"""
Analyze this LinkedIn post and determine if it announces a customer win, partnership, or significant contract.

<post>
Date: {post['date']}
Content: {post['text']}
</post>

If this is a customer win announcement, extract:
1. Customer name
2. Type of deal (customer_win, partnership, integration, etc.)
3. Any mentioned contract value or significance
4. Strategic importance (why is this notable?)

Respond in JSON:
{{
    "is_win": true/false,
    "customer_name": "...",
    "contract_type": "...",
    "strategic_importance": "...",
    "confidence": 0.0-1.0
}}
"""

    response = await claude.messages.create(
        model="claude-sonnet-4.5-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    result = json.loads(response.content[0].text)
    return result['is_win'], result if result['is_win'] else {}


async def embed(text: str) -> list[float]:
    """Create embedding using OpenAI"""
    response = await openai.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    return response.data[0].embedding
```

---

## 9. Code Examples Pratiques

### 9.1 Setup Initial

```python
# requirements.txt
anthropic>=0.28.0
openai>=1.0.0
psycopg[binary]>=3.1.0
neo4j>=5.0.0
pinecone-client>=3.0.0
boto3>=1.28.0
httpx>=0.25.0

# config.py
import os
from dataclasses import dataclass

@dataclass
class Config:
    # Database
    POSTGRES_URL = os.getenv("DATABASE_URL")
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

    # Vector DB
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_INDEX = os.getenv("PINECONE_INDEX", "intelligence")

    # S3
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    S3_BUCKET = os.getenv("S3_BUCKET", "intelligence-data")

    # LLMs
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # LinkedIn APIs
    PROXYCURL_API_KEY = os.getenv("PROXYCURL_API_KEY")
    APIFY_API_KEY = os.getenv("APIFY_API_KEY")

config = Config()
```

### 9.2 Database Clients

```python
# db.py
import asyncpg
from neo4j import AsyncGraphDatabase
import pinecone
import boto3

class DatabaseClients:
    def __init__(self):
        self.pg = None
        self.neo4j = None
        self.pinecone = None
        self.s3 = None

    async def connect(self):
        # PostgreSQL
        self.pg = await asyncpg.create_pool(config.POSTGRES_URL)

        # Neo4j
        self.neo4j = AsyncGraphDatabase.driver(
            config.NEO4J_URI,
            auth=(config.NEO4J_USER, config.NEO4J_PASSWORD)
        )

        # Pinecone
        pinecone.init(api_key=config.PINECONE_API_KEY)
        self.pinecone = pinecone.Index(config.PINECONE_INDEX)

        # S3
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=config.AWS_ACCESS_KEY,
            aws_secret_access_key=config.AWS_SECRET_KEY
        )

    async def close(self):
        if self.pg:
            await self.pg.close()
        if self.neo4j:
            await self.neo4j.close()

db_clients = DatabaseClients()
```

### 9.3 Usage Example

```python
# main.py
import asyncio
from anthropic import AsyncAnthropic

async def main():
    # Initialize
    await db_clients.connect()
    claude = AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)

    # Run pipeline for a competitor
    result = await full_competitor_intelligence_pipeline(
        competitor_linkedin_id="acme-corp"
    )

    print(f"Collected data on {result['data_collected']['employees']} employees")
    print(f"Found {result['data_collected']['jobs']} open positions")
    print(f"\nAI Analysis:\n{result['analysis']}")

    # Cleanup
    await db_clients.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Conclusion

Cette architecture hybride vous donne:

✅ **Flexibilité** - JSONB + schema évolutif, pas de migrations constantes
✅ **Performance** - Indexes sur queries fréquents, graph pour relations
✅ **Scalabilité** - Chaque couche scale indépendamment
✅ **AI-Ready** - RAG optimisé, context window respecté
✅ **Audit Trail** - Raw data immutable dans S3
✅ **Évolutivité** - Ajouter nouvelles sources sans casser l'existant

**Best of both worlds:** Structure quand nécessaire, flexibilité partout ailleurs.
