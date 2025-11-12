# Guide Rapide - Exécution des Tests

## 🚀 Démarrage Rapide (5 minutes)

### 1. Installer Poetry

```bash
# macOS / Linux
curl -sSL https://install.python-poetry.org | python3 -

# Ou avec Homebrew (macOS)
brew install poetry

# Vérifier l'installation
poetry --version
```

### 2. Installer les Dépendances

```bash
cd backend
poetry install
```

### 3. Lancer les Tests

```bash
# Tous les tests
poetry run pytest

# Avec coverage
poetry run pytest --cov=app --cov-report=term-missing
```

## 📊 Résultats Attendus

```
============================== test session starts ===============================
collected 60 items

tests/test_embedding_service.py ........                                    [ 13%]
tests/test_document_processor.py .............                              [ 35%]
tests/test_rag_engine.py .............                                      [ 57%]
tests/test_api_chat.py ............                                         [ 77%]
tests/test_api_documents.py ..............                                  [100%]

============================== 60 passed in 5.2s =================================
```

## 🎯 Commandes Essentielles

### Tests Basiques

```bash
# Tous les tests (rapide)
poetry run pytest

# Tests unitaires seulement
poetry run pytest -m unit

# Tests d'intégration seulement
poetry run pytest -m integration

# Tests verbeux
poetry run pytest -v
```

### Coverage

```bash
# Coverage avec rapport HTML
poetry run pytest --cov=app --cov-report=html

# Ouvrir le rapport
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

### Tests Spécifiques

```bash
# Un fichier spécifique
poetry run pytest tests/test_rag_engine.py

# Une classe spécifique
poetry run pytest tests/test_rag_engine.py::TestRAGEngine

# Un test spécifique
poetry run pytest tests/test_rag_engine.py::TestRAGEngine::test_query_full_pipeline

# Tests par pattern
poetry run pytest -k "test_embed"
```

### Debugging

```bash
# Avec output print()
poetry run pytest -s

# Arrêter au premier échec
poetry run pytest -x

# Voir locals variables sur échec
poetry run pytest -l

# Mode debug complet
poetry run pytest -vv -s --tb=long
```

## 📋 Vérification Rapide

### Status des Tests

```bash
# Compter les tests
poetry run pytest --collect-only | grep "test_"

# Lister les markers
poetry run pytest --markers

# Lister les fixtures
poetry run pytest --fixtures
```

### Qualité du Code

```bash
# Linting
poetry run ruff check app/

# Format
poetry run black app/ --check

# Type checking
poetry run mypy app/
```

## 🐛 Troubleshooting

### Poetry non trouvé

```bash
# Ajouter au PATH (macOS/Linux)
export PATH="$HOME/.local/bin:$PATH"

# Ou utiliser le chemin complet
~/.local/bin/poetry --version
```

### Dépendances manquantes

```bash
# Réinstaller toutes les dépendances
poetry install --no-root

# Avec groupes dev
poetry install --with dev
```

### Tests qui échouent

```bash
# Vérifier les imports
poetry run python -c "import app; print('OK')"

# Vérifier pytest
poetry run pytest --version

# Mode verbose pour voir les erreurs
poetry run pytest -vv --tb=short
```

### Problèmes avec asyncio

Les tests sont configurés pour `asyncio_mode = auto` dans `pytest.ini`.

Si problèmes:
```bash
# Installer plugin asyncio
poetry add --group dev pytest-asyncio

# Ou forcer le mode
poetry run pytest --asyncio-mode=auto
```

## 🎓 Exemples de Tests

### Lancer Tests par Tag

```bash
# Tests rapides seulement (exclure slow)
poetry run pytest -m "not slow"

# Tests nécessitant API
poetry run pytest -m requires_api

# Combinaison
poetry run pytest -m "unit and not slow"
```

### Tests en Parallèle

```bash
# Installer plugin
poetry add --group dev pytest-xdist

# Lancer en parallèle
poetry run pytest -n auto  # Auto-détecte CPUs
poetry run pytest -n 4     # 4 workers
```

### Watch Mode

```bash
# Installer plugin
poetry add --group dev pytest-watch

# Mode watch
poetry run ptw  # Re-run tests on file change
```

## 📈 Objectifs de Coverage

| Module | Coverage Actuel | Objectif |
|--------|----------------|----------|
| `services/` | À mesurer | > 80% |
| `api/` | À mesurer | > 70% |
| `db/` | À mesurer | > 60% |
| **Total** | **À mesurer** | **> 75%** |

## ✅ Checklist Avant Commit

```bash
# 1. Tous les tests passent
poetry run pytest

# 2. Coverage acceptable
poetry run pytest --cov=app --cov-report=term-missing

# 3. Code formatté
poetry run black app/

# 4. Pas d'erreurs de linting
poetry run ruff check app/

# 5. Types OK
poetry run mypy app/
```

## 🔄 CI/CD

Pour intégrer dans CI/CD:

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Poetry
        run: curl -sSL https://install.python-poetry.org | python3 -
      - name: Install dependencies
        run: poetry install
      - name: Run tests
        run: poetry run pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 📚 Ressources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [Poetry Documentation](https://python-poetry.org/docs/)

---

**Besoin d'aide?** Voir [TEST_RESULTS.md](TEST_RESULTS.md) pour détails complets
