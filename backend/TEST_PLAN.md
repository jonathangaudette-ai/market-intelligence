# Plan de Test - Application RAG Market Intelligence

## Vue d'ensemble

Ce document décrit la stratégie de test complète pour l'application RAG (Retrieval-Augmented Generation) de Market Intelligence.

## 1. Objectifs des Tests

- ✅ Valider le fonctionnement du moteur RAG
- ✅ Vérifier le traitement des documents (PDF, texte)
- ✅ Tester les endpoints API
- ✅ Valider l'intégration avec Pinecone et PostgreSQL
- ✅ Assurer la qualité des embeddings
- ✅ Tester les cas d'erreur et la résilience

## 2. Périmètre des Tests

### 2.1 Tests Unitaires

#### Module: `services/embedding.py`
- [ ] Test de création d'embedding pour un texte simple
- [ ] Test de création d'embeddings par batch
- [ ] Test de comptage de tokens
- [ ] Test de gestion d'erreur API OpenAI
- [ ] Test de rate limiting

#### Module: `services/document_processor.py`
- [ ] Test d'extraction de texte depuis PDF
- [ ] Test de chunking de texte (taille, overlap)
- [ ] Test de préservation des numéros de page
- [ ] Test de génération d'ID de document
- [ ] Test de traitement de fichier texte
- [ ] Test de gestion d'erreur (fichier corrompu)

#### Module: `services/rag_engine.py`
- [ ] Test de retrieval depuis Pinecone
- [ ] Test de synthèse avec Claude
- [ ] Test de pipeline RAG complet (query)
- [ ] Test d'upsert de chunks
- [ ] Test de suppression de document
- [ ] Test de filtrage par metadata
- [ ] Test de gestion d'erreur (pas de résultats)

#### Module: `db/postgres.py`
- [ ] Test de création de tables
- [ ] Test d'insertion de conversation
- [ ] Test d'insertion de message
- [ ] Test de récupération d'historique
- [ ] Test de suppression de conversation

### 2.2 Tests d'Intégration API

#### Endpoint: `POST /api/chat`
- [ ] Chat sans contexte
- [ ] Chat avec conversation_id existant
- [ ] Chat avec filtres metadata
- [ ] Test de validation (message vide)
- [ ] Test avec top_k différent
- [ ] Test de sauvegarde en base de données

#### Endpoint: `GET /api/chat/history/{conversation_id}`
- [ ] Récupération d'historique existant
- [ ] Erreur 404 pour ID inexistant
- [ ] Validation du format de réponse

#### Endpoint: `POST /api/documents/upload`
- [ ] Upload de PDF valide
- [ ] Upload de fichier texte
- [ ] Validation des types de fichier
- [ ] Test de limite de taille
- [ ] Vérification du chunking
- [ ] Vérification de l'indexation Pinecone

#### Endpoint: `GET /api/documents/`
- [ ] Liste de tous les documents
- [ ] Pagination (limit, offset)
- [ ] Filtrage par source_type

#### Endpoint: `DELETE /api/documents/{document_id}`
- [ ] Suppression d'un document
- [ ] Vérification de suppression dans Pinecone
- [ ] Erreur 404 pour ID inexistant

### 2.3 Tests End-to-End

#### Scénario 1: Upload → Chat
1. Upload d'un document PDF
2. Attendre le processing
3. Poser une question sur le contenu
4. Vérifier la réponse avec sources

#### Scénario 2: Conversation Multi-tours
1. Créer une conversation
2. Envoyer plusieurs messages
3. Vérifier la cohérence de l'historique
4. Vérifier la conservation du contexte

#### Scénario 3: Gestion de Multiple Documents
1. Upload de plusieurs documents
2. Questions nécessitant synthèse multi-documents
3. Vérification des sources multiples

### 2.4 Tests de Performance

- [ ] Temps de réponse API < 5s (chat)
- [ ] Temps de processing PDF < 10s (document 50 pages)
- [ ] Temps de retrieval Pinecone < 500ms
- [ ] Gestion de 10 requêtes simultanées

### 2.5 Tests de Sécurité

- [ ] Validation des inputs (injection SQL, XSS)
- [ ] Validation des types de fichier (upload)
- [ ] Test de limite de taille de fichier
- [ ] Test d'accès sans authentification (futur)

## 3. Environnement de Test

### 3.1 Configuration

```env
# Test Environment
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/market_intelligence_test
PINECONE_INDEX_NAME=market-intelligence-test
ANTHROPIC_API_KEY=sk-ant-test...
OPENAI_API_KEY=sk-test...
```

### 3.2 Données de Test

- **PDF Test**: Document de 5 pages (sample.pdf)
- **Texte Test**: Fichier markdown de test
- **Queries Test**: 20 questions prédéfinies

## 4. Métriques de Qualité

### 4.1 Coverage Cible

- **Code Coverage**: > 80%
- **Branches Coverage**: > 70%
- **Critical Paths**: 100%

### 4.2 Critères de Succès

- ✅ Tous les tests unitaires passent
- ✅ Tous les tests d'intégration passent
- ✅ 0 erreurs critiques
- ✅ Performance dans les limites
- ✅ RAG répond avec sources correctes

## 5. Outils de Test

- **Framework**: pytest
- **Async**: pytest-asyncio
- **Mocking**: pytest-mock, unittest.mock
- **Coverage**: pytest-cov
- **API Testing**: httpx
- **Load Testing**: locust (optionnel)

## 6. Cas de Test Détaillés

### 6.1 Test: Upload et Retrieval de PDF

**Objectif**: Vérifier le pipeline complet PDF → Chunks → Embeddings → Retrieval

**Étapes**:
1. Upload `test_competitor_report.pdf`
2. Vérifier status = "completed"
3. Vérifier chunk_count > 0
4. Query: "What are the main features?"
5. Vérifier réponse contient du contenu
6. Vérifier sources contiennent le PDF
7. Vérifier page numbers présents

**Résultat attendu**:
- Status code: 200
- Réponse en < 5 secondes
- Sources valides avec pages
- Relevance score > 0.7

### 6.2 Test: Gestion d'Erreur - Document Inexistant

**Objectif**: Vérifier que le système gère correctement l'absence de documents

**Étapes**:
1. Nouvelle base vide
2. Query: "Tell me about Acme Corp"
3. Vérifier réponse appropriée

**Résultat attendu**:
- Status code: 200
- Message: "I don't have enough information..."
- sources: []
- retrieved_doc_count: 0

### 6.3 Test: Chunking avec Overlap

**Objectif**: Vérifier que le chunking préserve le contexte

**Étapes**:
1. Texte test avec phrase coupée au milieu
2. Chunk size = 100, overlap = 20
3. Vérifier que les chunks se chevauchent
4. Vérifier que le contexte est préservé

**Résultat attendu**:
- Overlap présent entre chunks adjacents
- Pas de perte d'information
- Token count correct

### 6.4 Test: Conversation Multi-tours

**Objectif**: Vérifier la mémoire de conversation

**Étapes**:
1. Message 1: "What is Acme Corp's main product?"
2. Récupérer conversation_id
3. Message 2: "What are its key features?" (avec conversation_id)
4. Vérifier que le contexte est maintenu

**Résultat attendu**:
- Réponse 2 comprend le contexte de Réponse 1
- Historique sauvegardé correctement
- Messages ordonnés par timestamp

### 6.5 Test: Filtrage par Metadata

**Objectif**: Tester le filtrage de documents

**Étapes**:
1. Upload document avec metadata: {"type": "competitor"}
2. Upload document avec metadata: {"type": "internal"}
3. Query avec filter: {"type": "competitor"}
4. Vérifier que seul le doc competitor est retourné

**Résultat attendu**:
- Sources contiennent uniquement documents filtrés
- Filtrage fonctionne correctement

## 7. Mock Strategy

### 7.1 Mocks Nécessaires

- **Anthropic API**: Mock pour éviter coûts et rate limits
- **OpenAI Embeddings**: Mock pour tests rapides
- **Pinecone**: Mock pour tests unitaires (vrai pour intégration)
- **PostgreSQL**: Base de test réelle

### 7.2 Fixtures pytest

```python
@pytest.fixture
def sample_pdf():
    return Path("tests/fixtures/sample.pdf")

@pytest.fixture
def mock_embedding():
    return [0.1] * 3072  # Mock embedding vector

@pytest.fixture
async def test_db():
    # Setup test database
    yield
    # Teardown
```

## 8. Exécution des Tests

### 8.1 Commandes

```bash
# Tous les tests
pytest

# Avec coverage
pytest --cov=app --cov-report=html

# Tests spécifiques
pytest tests/test_rag_engine.py

# Tests d'intégration seulement
pytest tests/integration/

# Tests parallèles
pytest -n auto
```

### 8.2 CI/CD Integration

- Tests automatiques sur chaque PR
- Coverage report obligatoire
- Tests d'intégration sur staging

## 9. Documentation des Résultats

### 9.1 Format de Rapport

```markdown
## Test Results - Date

### Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W
- Coverage: XX%

### Failed Tests
1. test_name - Reason
2. ...

### Performance Metrics
- Average API Response Time: Xms
- P95 Response Time: Xms
```

## 10. Maintenance des Tests

### 10.1 Révision Régulière

- ✅ Hebdomadaire: Vérifier tests qui échouent
- ✅ Mensuel: Mettre à jour fixtures
- ✅ Trimestriel: Réviser plan de test

### 10.2 Ajout de Nouveaux Tests

Pour chaque nouvelle fonctionnalité:
1. Écrire tests avant code (TDD)
2. Tests unitaires minimum
3. Au moins 1 test d'intégration
4. Documenter dans ce plan

## 11. Checklist Pré-Release

Avant chaque release:

- [ ] Tous les tests passent
- [ ] Coverage > 80%
- [ ] Tests de performance OK
- [ ] Tests end-to-end validés
- [ ] Documentation à jour
- [ ] Pas de TODO dans les tests
- [ ] Logs de test propres

## 12. Contact et Support

Pour questions sur les tests:
- Slack: #testing
- Documentation: voir README.md
- Issues: GitHub Issues

---

**Version**: 1.0
**Dernière mise à jour**: 2025-01-12
**Maintenu par**: Équipe Market Intelligence
