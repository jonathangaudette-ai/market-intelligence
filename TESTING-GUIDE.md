# Guide de test - RFP Surgical Retrieval System

Ce guide explique comment exécuter tous les tests du système de récupération chirurgicale RFP.

---

## 🚀 Démarrage rapide

### Prérequis

Assurez-vous d'avoir:
- Node.js 18+ installé
- Base de données PostgreSQL configurée
- Variables d'environnement dans `.env.local`

### Installation

```bash
npm install
```

---

## ✅ Tests automatisés

### Option 1: Test Node.js (Recommandé - Rapide)

**Temps d'exécution:** ~30 secondes

```bash
node test-api.mjs
```

**Ce qu'il teste:**
- ✅ Tous les fichiers requis existent
- ✅ Types TypeScript corrects
- ✅ Routes API correctement exportées
- ✅ Composants React exportés avec 'use client'
- ✅ Services backend exportés
- ✅ Intégration Pinecone complète
- ✅ Schéma de base de données
- ✅ Build Next.js réussi

**Résultat attendu:**
```
✓ All tests passed!
Passed: 46
Failed: 0
```

### Option 2: Test Shell (Complet)

**Temps d'exécution:** ~2 minutes

```bash
./test-surgical-retrieval.sh
```

**Ce qu'il teste en plus:**
- ✅ Migrations de base de données
- ✅ Variables d'environnement
- ✅ Requêtes SQL réelles
- ✅ Endpoints API (si serveur lancé)

**Prérequis supplémentaires:**
- `DATABASE_URL` défini dans `.env.local`
- `psql` installé (PostgreSQL client)

---

## 🧪 Tests manuels

### Test 1: Vérifier le build

```bash
npm run build
```

**Résultat attendu:**
```
✓ Compiled successfully
```

**Si erreurs:**
- Vérifier les imports TypeScript
- Vérifier les types de données
- Lancer `npm install` pour installer les dépendances manquantes

### Test 2: Lancer le serveur de développement

```bash
npm run dev
```

**Ouvrir dans le navigateur:**
```
http://localhost:3000
```

**Pages à tester:**
1. `/companies/[slug]/rfps/import` - Import wizard
2. `/companies/[slug]/rfps/library` - Bibliothèque RFP
3. `/companies/[slug]/rfps/[id]` - Détail RFP
4. `/companies/[slug]/rfps/[id]/questions` - Questions avec badges

### Test 3: Import d'un RFP historique

**Étapes:**

1. **Accéder à l'import wizard**
   ```
   http://localhost:3000/companies/[slug]/rfps/import
   ```

2. **Étape 1: Uploader les fichiers**
   - Fichier RFP: PDF du RFP original (5-10 pages)
   - Fichier réponse: PDF de votre réponse soumise
   - Cliquer "Suivant"

3. **Étape 2: Métadonnées**
   - Titre: "Test RFP - Plateforme SaaS"
   - Client: "Acme Corp"
   - Industrie: "Services financiers"
   - Date de soumission: sélectionner une date passée
   - Résultat: "won"
   - Score de qualité: 85
   - Cliquer "Importer le RFP"

4. **Étape 3: Traitement**
   - Observer la progression (2-5 minutes)
   - Vérifier la redirection automatique

**Vérifications:**
- [ ] Les 2 PDFs sont acceptés
- [ ] Le processing démarre automatiquement
- [ ] La barre de progression s'affiche
- [ ] Redirection vers le RFP après succès
- [ ] Le RFP apparaît dans la bibliothèque

**En cas d'erreur:**
- Vérifier que `OPENAI_API_KEY` est défini
- Vérifier que `ANTHROPIC_API_KEY` est défini
- Vérifier les logs dans la console
- Vérifier que le timeout est suffisant (600 secondes)

### Test 4: Configuration intelligente

**Étapes:**

1. **Créer ou ouvrir un RFP actif**
   - Aller à `/companies/[slug]/rfps/[id]`
   - Le RFP doit avoir `parsingStatus = completed`

2. **Lancer la configuration** (à ajouter au UI)
   - Cliquer sur "Configuration intelligente"
   - Attendre 30-60 secondes

3. **Vérifier les résultats**
   - Dialog modal s'affiche
   - Nombre de questions classifiées
   - Confiance moyenne affichée
   - Répartition par type de contenu

**Vérifications:**
- [ ] Classification de toutes les questions
- [ ] Confiance moyenne >70%
- [ ] Au moins 3 types de contenu différents
- [ ] Sources suggérées présentes

### Test 5: Génération de réponse avec sources

**Étapes:**

1. **Aller aux questions**
   ```
   /companies/[slug]/rfps/[id]/questions
   ```

2. **Vérifier les badges**
   - Badge violet: Type de contenu
   - Badge vert/rouge: Source RFP (si configurée)

3. **Générer une réponse**
   - Cliquer sur une question
   - Cliquer "Générer avec IA"
   - Attendre 10-30 secondes

4. **Vérifier la qualité**
   - La réponse utilise le contexte de la source
   - La réponse est pertinente et cohérente

**Vérifications:**
- [ ] Badges visibles sur les questions
- [ ] Génération réussie
- [ ] Réponse de bonne qualité
- [ ] Temps de génération <60 secondes

### Test 6: Bibliothèque RFP

**Étapes:**

1. **Accéder à la bibliothèque**
   ```
   /companies/[slug]/rfps/library
   ```

2. **Vérifier les statistiques**
   - Total de RFPs historiques
   - Nombre gagnés/perdus
   - Taux de succès
   - Score de qualité moyenne

3. **Vérifier la liste**
   - RFPs triés par date (plus récents en premier)
   - Badges de résultat corrects
   - Compteur d'utilisation (si >0)

4. **Cliquer sur un RFP**
   - Navigation vers `/companies/[slug]/rfps/[id]`
   - Page de détail s'affiche

**Vérifications:**
- [ ] Stats correctes
- [ ] Liste affichée correctement
- [ ] Tri par date fonctionne
- [ ] Navigation fonctionne

---

## 🔍 Vérification de la base de données

### Requêtes SQL utiles

**Compter les RFPs historiques:**
```sql
SELECT COUNT(*) FROM rfps WHERE is_historical = true;
```

**Vérifier les configurations:**
```sql
SELECT * FROM rfp_source_preferences;
```

**Questions avec classification:**
```sql
SELECT
  id,
  question_text,
  primary_content_type,
  detection_confidence,
  selected_source_rfp_id
FROM rfp_questions
WHERE primary_content_type IS NOT NULL
LIMIT 10;
```

**RFPs les plus utilisés comme sources:**
```sql
SELECT
  id,
  title,
  client_name,
  usage_count,
  result,
  quality_score
FROM rfps
WHERE is_historical = true
ORDER BY usage_count DESC NULLS LAST
LIMIT 10;
```

---

## 📊 Tests de performance

### Test de charge

**Importer plusieurs RFPs en parallèle:**

```bash
# Terminal 1
curl -X POST http://localhost:3000/api/companies/[slug]/rfps/import-historical \
  -F "rfpPdf=@test1-rfp.pdf" \
  -F "responsePdf=@test1-response.pdf" \
  -F "title=Test 1" \
  -F "clientName=Client 1" \
  -F "result=won"

# Terminal 2
curl -X POST http://localhost:3000/api/companies/[slug]/rfps/import-historical \
  -F "rfpPdf=@test2-rfp.pdf" \
  -F "responsePdf=@test2-response.pdf" \
  -F "title=Test 2" \
  -F "clientName=Client 2" \
  -F "result=won"
```

**Mesurer le temps:**
- Import simple: devrait prendre 2-5 minutes
- Configuration intelligente: devrait prendre 30-60 secondes
- Génération de réponse: devrait prendre 10-30 secondes

---

## 🐛 Debugging

### Logs importants

**Backend logs:**
```bash
# Voir tous les logs
npm run dev

# Filtrer par module
npm run dev | grep "\[Smart Configure\]"
npm run dev | grep "\[Historical Import\]"
npm run dev | grep "\[Pinecone\]"
```

**Browser console:**
- Ouvrir DevTools (F12)
- Aller dans l'onglet Console
- Chercher les erreurs (rouge)
- Vérifier les network requests (onglet Network)

### Erreurs communes

**1. "OPENAI_API_KEY is not set"**
- Vérifier `.env.local`
- Vérifier que la clé est valide
- Redémarrer le serveur dev

**2. "PINECONE_API_KEY is not set"**
- Vérifier `.env.local`
- Vérifier que l'index existe
- Vérifier le nom de l'index (`PINECONE_INDEX`)

**3. "Failed to parse PDF"**
- Vérifier que le PDF n'est pas corrompu
- Vérifier la taille (<50MB)
- Vérifier le format (PDF valide)

**4. "Database connection failed"**
- Vérifier `DATABASE_URL`
- Vérifier que PostgreSQL est lancé
- Vérifier les migrations: `npm run db:push`

**5. "Timeout after 600 seconds"**
- Le PDF est peut-être trop gros
- Trop de questions (>200)
- Augmenter le timeout dans la route API

---

## 📝 Checklist finale

Avant de considérer les tests terminés:

### Tests automatisés
- [ ] `node test-api.mjs` passe (46/46 tests)
- [ ] `npm run build` réussi sans erreurs
- [ ] Aucune erreur TypeScript

### Tests manuels
- [ ] Import d'un RFP historique réussi
- [ ] Configuration intelligente fonctionne
- [ ] Badges de source visibles
- [ ] Génération avec sources fonctionne
- [ ] Bibliothèque RFP affichée correctement

### Base de données
- [ ] Migrations appliquées
- [ ] Table `rfp_source_preferences` existe
- [ ] Colonnes `isHistorical`, `primaryContentType`, etc. existent
- [ ] Données importées correctement

### Performance
- [ ] Import <10 minutes
- [ ] Configuration <2 minutes
- [ ] Génération <60 secondes
- [ ] Chargement pages <3 secondes

### Sécurité
- [ ] Authentication sur toutes les routes
- [ ] Isolation multi-tenant (companyId)
- [ ] Validation des inputs
- [ ] Gestion d'erreurs appropriée

---

## 🎯 Prochaines étapes

Une fois tous les tests passés:

1. **Déployer en staging**
   - Appliquer les migrations
   - Configurer les variables d'environnement
   - Tester avec des utilisateurs internes

2. **Optimisations**
   - Ajouter caching Redis
   - Implémenter background jobs
   - Optimiser les requêtes SQL

3. **Monitoring**
   - Configurer Sentry
   - Ajouter des métriques
   - Configurer des alertes

4. **Documentation utilisateur**
   - Guide d'import de RFPs
   - Guide de configuration
   - FAQ

---

## 📞 Support

En cas de problème:

1. **Vérifier les logs**
   - Console du navigateur
   - Logs du serveur dev
   - Logs de base de données

2. **Vérifier la documentation**
   - `IMPLEMENTATION-COMPLETE.md` - Vue d'ensemble
   - `TEST-RESULTS.md` - Résultats des tests
   - Ce fichier - Guide de test

3. **Créer un issue**
   - Décrire le problème
   - Inclure les logs d'erreur
   - Inclure les étapes pour reproduire

Bonne chance avec les tests! 🚀
