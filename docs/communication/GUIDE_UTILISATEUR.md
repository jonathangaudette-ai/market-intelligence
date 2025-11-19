# Guide Utilisateur - Plateforme Market Intelligence

**Version:** 1.0
**Public:** Utilisateurs finaux (gestionnaires RFP, équipes ventes, intelligence concurrentielle)
**Temps de lecture:** 30 minutes
**Niveau:** Débutant

---

## 📚 Table des matières

1. [Introduction](#introduction)
2. [Premiers pas](#premiers-pas)
3. [Gestion des RFPs](#gestion-des-rfps)
4. [Chat intelligent (Intelligence)](#chat-intelligent)
5. [Knowledge Base](#knowledge-base)
6. [Gestion des concurrents](#gestion-des-concurrents)
7. [Bonnes pratiques](#bonnes-pratiques)
8. [FAQ](#faq)

---

## Introduction

### Qu'est-ce que Market Intelligence Platform ?

Market Intelligence Platform est votre assistant intelligent pour gérer les **RFPs (Requests for Proposal)** et accéder rapidement à votre **intelligence concurrentielle**.

La plateforme vous permet de :
- ✅ **Importer** des RFPs en quelques secondes (PDF, Word, Excel)
- ✅ **Extraire automatiquement** toutes les questions du RFP
- ✅ **Générer des réponses** intelligentes basées sur votre historique
- ✅ **Enrichir** vos réponses avec des données contextuelles
- ✅ **Exporter** vers Word ou Excel pour finalisation
- ✅ **Discuter** avec votre base de connaissances via chat
- ✅ **Organiser** vos documents par concurrent

### À qui s'adresse cette plateforme ?

- **Gestionnaires de RFP** - Automatisez la génération de réponses
- **Équipes commerciales** - Accédez rapidement aux informations concurrentielles
- **Product Marketing** - Consultez l'historique des features/pricing
- **Analystes CI** - Organisez et analysez vos données concurrentielles

---

## Premiers pas

### Connexion

1. Accédez à la plateforme : `https://votre-domaine.com`
2. Entrez vos identifiants :
   - **Email** : votre adresse email professionnelle
   - **Mot de passe** : fourni par votre administrateur
3. Cliquez sur **Se connecter**

![Écran de connexion]

> 💡 **Première connexion ?** Votre administrateur vous aura envoyé vos identifiants par email.

### Navigation principale

Une fois connecté, vous verrez le menu principal :

```
┌─────────────────────────────────────────────┐
│  Market Intelligence     [Votre Nom] ▼      │
├─────────────────────────────────────────────┤
│  📊 Dashboard          ← Vue d'ensemble     │
│  📄 RFPs               ← Gestion des RFPs   │
│  💬 Intelligence       ← Chat intelligent   │
│  📚 Knowledge Base     ← Documents          │
│  🎯 Concurrents        ← Veille concurrent. │
│  ⚙️  Paramètres        ← Configuration      │
└─────────────────────────────────────────────┘
```

### Sélection de votre organisation

Si vous appartenez à plusieurs organisations :

1. Cliquez sur le **sélecteur d'organisation** (en haut)
2. Choisissez l'organisation active
3. L'URL change : `/companies/[votre-org]/...`

> 🔒 **Sécurité** : Toutes vos données sont isolées par organisation. Vous ne verrez que les données de l'organisation sélectionnée.

---

## Gestion des RFPs

### Vue d'ensemble

La section **RFPs** est le cœur de la plateforme. Elle vous permet de :
- Importer des documents RFP
- Extraire automatiquement les questions
- Générer des réponses intelligentes
- Exporter le tout vers Word/Excel

### Workflow complet d'un RFP

```
1. IMPORT           2. EXTRACTION      3. ENRICHISSEMENT   4. GÉNÉRATION      5. EXPORT
   │                    │                   │                  │                 │
   ▼                    ▼                   ▼                  ▼                 ▼
┌──────┐          ┌──────────┐       ┌──────────┐       ┌──────────┐     ┌──────────┐
│ PDF  │  ──────► │Questions │ ────► │ Contexte │ ────► │Réponses  │ ──► │Word/Excel│
│DOCX  │          │extraites │       │   IA     │       │générées  │     │          │
│XLSX  │          │          │       │          │       │          │     │          │
└──────┘          └──────────┘       └──────────┘       └──────────┘     └──────────┘
  Auto               GPT-5          Claude Haiku 4.5    Claude Sonnet 4.5   Auto
```

---

### 1. Import d'un RFP

#### Méthode 1 : Upload simple

1. Allez dans **RFPs** → Cliquez **Nouveau RFP**
2. Remplissez les informations :
   - **Nom du RFP** : ex. "RFP - Ville de Montréal 2025"
   - **Description** : contexte optionnel
   - **Deadline** : date limite de soumission
3. **Glissez-déposez** votre fichier RFP (ou cliquez pour parcourir)
   - Formats acceptés : `.pdf`, `.docx`, `.xlsx`
   - Taille max : 10 MB
4. Cliquez **Démarrer l'import**

#### Méthode 2 : Import de données historiques

Si vous avez des **RFPs + réponses passées** :

1. Allez dans **RFPs** → **Importer historique**
2. Téléversez **2 fichiers** :
   - Document RFP original (PDF/DOCX)
   - Vos réponses passées (DOCX/XLSX)
3. La plateforme va :
   - Extraire les questions du RFP
   - Extraire vos réponses du document de réponse
   - Les associer automatiquement (matching intelligent)
   - Les stocker dans la knowledge base pour usage futur

> 💡 **Astuce** : Importez vos 5-10 derniers RFPs pour alimenter la base de connaissances. Plus vous importez, meilleures seront les réponses futures.

#### Statut d'import

Pendant l'import, vous verrez :

```
⏳ Import en cours...
  ├─ ✅ Fichier téléchargé
  ├─ ✅ Parsing du document
  ├─ ⏳ Extraction des questions (GPT-5)...
  └─ ⏸  En attente
```

Temps d'import typique : **30 secondes à 2 minutes**

---

### 2. Extraction des questions

Une fois l'import terminé :

1. Vous verrez la liste des **questions extraites**
2. Chaque question affiche :
   - 📝 **Texte de la question**
   - 📄 **Page source** (numéro de page dans le PDF)
   - 🏷️ **Catégorie** (auto-détectée : technique, prix, expérience...)
   - ⚙️ **Actions** (éditer, supprimer, enrichir)

#### Vérification et édition

Vous pouvez :
- ✏️ **Modifier** une question si l'extraction n'est pas parfaite
- ➕ **Ajouter** des questions manquantes manuellement
- 🗑️ **Supprimer** des questions non pertinentes
- 🔀 **Réorganiser** l'ordre des questions (drag & drop)

> 💡 **Astuce** : L'extraction est ~95% précise. Vérifiez rapidement et corrigez si nécessaire.

---

### 3. Enrichissement des questions

**L'enrichissement** ajoute du contexte intelligent à chaque question pour améliorer les réponses générées.

#### Enrichir automatiquement

1. Cliquez **Enrichir tout** (bouton en haut)
2. La plateforme va :
   - Rechercher dans vos documents similaires (RAG)
   - Extraire le contexte pertinent
   - Analyser vos réponses historiques
   - Ajouter des métadonnées (catégorie, priorité, sources)

#### Enrichir manuellement

Pour une question spécifique :

1. Cliquez sur la question → **Détails**
2. Section **Enrichissement** :
   - **Sources suggérées** : documents pertinents trouvés
   - **Réponses historiques** : réponses similaires passées
   - **Contexte additionnel** : ajoutez du texte libre
3. Cliquez **Sauvegarder**

#### Ce que l'enrichissement apporte

| Sans enrichissement | Avec enrichissement |
|---------------------|---------------------|
| Réponse générique | Réponse personnalisée avec vos données |
| Pas de sources | Citations de vos documents |
| Répétition possible | Cohérence avec historique |
| Temps : rapide | Temps : +10 sec/question |

> 🎯 **Recommandation** : Enrichissez toujours pour les RFPs importants. Pour les RFPs urgents, enrichissez seulement les questions clés.

---

### 4. Génération des réponses

C'est ici que la **magie opère** ! La plateforme génère des réponses complètes et contextuelles.

#### Génération en bulk (toutes les questions)

1. Cliquez **Générer toutes les réponses**
2. Configurez les paramètres :
   - **Longueur** : Courte (50 mots) / Moyenne (150) / Longue (300)
   - **Ton** : Professionnel / Technique / Commercial
   - **Instructions** : ajoutez des directives spécifiques
3. Cliquez **Démarrer la génération**

#### Génération sélective

Pour générer seulement certaines questions :

1. ✅ **Cochez** les questions désirées
2. Cliquez **Générer sélection** (barre d'actions en bas)
3. Configurez et lancez

#### Suivi en temps réel

Pendant la génération, vous verrez :

```
🤖 Génération en cours... (15/47 questions)

Question 12: ✅ Généré (2.3s)
  "Décrivez votre expérience en gestion de projets complexes..."
  ↳ Réponse générée (245 mots) avec 3 sources citées

Question 13: ⏳ En cours...
  "Quelles sont vos certifications ISO..."

Question 14: ⏸ En attente...
```

Temps typique : **5-10 secondes par question** (streaming en temps réel)

#### Révision des réponses

Après génération :

1. Cliquez sur une question → **Voir réponse**
2. Vous verrez :
   - 📝 **Réponse générée** (éditable)
   - 📚 **Sources utilisées** (cliquables)
   - ⚡ **Confiance** : score de qualité (0-100%)
   - 🔄 **Régénérer** : générer une nouvelle version
3. **Éditez** la réponse si nécessaire (éditeur riche)
4. Cliquez **Approuver** ou **Modifier**

> 💡 **Astuce** : Les réponses sont des **drafts intelligents**. Vous devez toujours les réviser avant soumission finale.

---

### 5. Export vers Word/Excel

Une fois vos réponses finalisées :

#### Export Word (.docx)

1. Cliquez **Exporter** → **Word**
2. Choisissez le format :
   - **Question-Réponse** : format Q&A classique
   - **Tableau** : format tabulaire
   - **Sections** : organisé par catégorie
3. Téléchargez le fichier `.docx`

Le document Word inclut :
- ✅ Formatage professionnel
- ✅ Table des matières automatique
- ✅ Numérotation des questions
- ✅ Citations de sources en note de bas de page
- ✅ Métadonnées (date, version, RFP name)

#### Export Excel (.xlsx)

1. Cliquez **Exporter** → **Excel**
2. Le fichier contient 3 onglets :
   - **Questions** : liste de toutes les questions
   - **Réponses** : question + réponse + métadonnées
   - **Sources** : liste des documents sources utilisés

> 💾 **Format** : Compatible avec Microsoft Office, Google Docs, LibreOffice

---

### Intelligence Brief

Pour chaque RFP, la plateforme génère un **Intelligence Brief** automatique :

**Contenu du brief :**
- 📊 **Statistiques** : nb de questions, catégories, sources utilisées
- 🎯 **Insights clés** : thèmes principaux, exigences critiques
- ⚠️ **Alertes** : questions complexes, manques de données
- 📈 **Scoring** : évaluation de complétude (0-100%)
- ⏱️ **Timeline** : événements et deadlines

**Accès :**
- Cliquez sur un RFP → Onglet **Intelligence**

---

## Chat intelligent

### Qu'est-ce que le chat intelligent ?

Le module **Intelligence** est un **assistant conversationnel** qui répond à vos questions en se basant sur **tous vos documents** (RFPs, réponses, knowledge base).

**Technologie** : RAG (Retrieval-Augmented Generation) avec Claude Sonnet 4.5

### Comment ça fonctionne ?

```
Votre question
     ↓
Recherche dans Pinecone (vecteurs)
     ↓
Top 5-10 chunks pertinents
     ↓
Envoi à Claude avec contexte
     ↓
Réponse + sources citées
```

---

### Utilisation basique

1. Allez dans **Intelligence**
2. Tapez votre question dans la boîte de texte
3. Appuyez sur **Entrée** ou cliquez **Envoyer**
4. Attendez la réponse (streaming en temps réel)

#### Exemples de questions

**Questions factuelles :**
```
"Quelle est notre expérience avec les hôpitaux ?"
"Quelles certifications avons-nous ?"
"Quel est notre temps de réponse typique ?"
```

**Questions comparatives :**
```
"Compare notre offre avec celle de [Concurrent X]"
"Quelles sont nos différences avec [Produit Y] ?"
```

**Questions analytiques :**
```
"Résume nos principales forces en cybersécurité"
"Quels sont les thèmes récurrents dans nos RFPs ?"
"Analyse nos prix par secteur"
```

**Questions de recherche :**
```
"Trouve toutes les mentions de 'ISO 27001'"
"Liste nos projets avec le gouvernement du Québec"
```

---

### Fonctionnalités avancées

#### 1. Sources citées

Chaque réponse inclut les **sources** :

```
🤖 Assistant:
Nous avons complété 12 projets hospitaliers depuis 2020, incluant...

📚 Sources utilisées:
  [1] RFP - CISSS Montérégie 2024 (page 3)
  [2] Réponses - Hôpital Maisonneuve 2023 (section 2.4)
  [3] Document - Portfolio Healthcare.pdf (page 15)
```

**Cliquez sur une source** pour voir :
- 📄 Le document original
- 📍 Le passage exact utilisé (surligné)
- 🔗 Lien pour télécharger le document

#### 2. Historique de conversation

Toutes vos conversations sont **sauvegardées** :

1. Sidebar gauche → **Historique**
2. Cliquez sur une conversation passée pour la reprendre
3. Renommez : clic droit → **Renommer**
4. Supprimez : clic droit → **Supprimer**

#### 3. Filtres contextuels

Avant de poser votre question, filtrez par :

- **Concurrent** : restreindre aux docs d'un concurrent spécifique
- **Période** : documents d'une période donnée
- **Type de doc** : RFP, réponses, documentation, etc.

Exemple :
```
Filtre: Concurrent = "Acme Corp" | Période = "2024"
Question: "Quels sont leurs nouveaux produits ?"
```

#### 4. Mode Expert

Activez le **Mode Expert** (toggle en haut) pour :
- ⚙️ Voir les **paramètres de recherche** (top-k, seuil de similarité)
- 📊 Afficher les **scores de pertinence** des sources
- 🧪 Tester différentes **stratégies de recherche**

---

### Bonnes pratiques pour le chat

✅ **À faire :**
- Soyez précis dans vos questions
- Utilisez des filtres pour affiner le contexte
- Vérifiez toujours les sources citées
- Reformulez si la réponse est floue

❌ **À éviter :**
- Questions trop vagues ("Dis-moi tout sur X")
- Questions en dehors de votre domaine de données
- Attendre des réponses en temps réel sur des données non uploadées

---

## Knowledge Base

### Vue d'ensemble

La **Knowledge Base** est votre bibliothèque centralisée de documents. Tous les documents uploadés ici sont :
- 🔍 **Indexés** pour la recherche vectorielle (RAG)
- 🏷️ **Catégorisés** par type et concurrent
- 🔒 **Sécurisés** dans votre tenant isolé
- 📊 **Analysés** pour insights automatiques

---

### Types de documents

| Type | Description | Formats acceptés |
|------|-------------|------------------|
| **RFP** | Documents de demande de propositions | PDF, DOCX, XLSX |
| **Réponses** | Vos réponses à des RFPs passés | DOCX, XLSX, PDF |
| **Documentation** | Docs produits, whitepapers, présentations | PDF, DOCX, PPTX |
| **Concurrentiel** | Infos sur vos concurrents | PDF, DOCX, TXT, MD |
| **Veille** | Articles, rapports de marché | PDF, TXT, MD |

---

### Upload de documents

#### Upload simple

1. Allez dans **Knowledge Base** → **Nouveau document**
2. Remplissez :
   - **Titre** : nom descriptif
   - **Type** : sélectionnez le type
   - **Concurrent** (optionnel) : associez à un concurrent
   - **Tags** (optionnel) : mots-clés séparés par virgules
3. Glissez-déposez votre fichier
4. Cliquez **Upload**

Le document sera :
- ✅ Parsé et extrait (texte)
- ✅ Découpé en chunks intelligents
- ✅ Embeddings générés (OpenAI)
- ✅ Indexé dans Pinecone
- ✅ Disponible pour le chat et génération

Temps de traitement : **10-30 secondes** (selon taille)

#### Upload en batch

Pour uploader plusieurs documents :

1. **Knowledge Base** → **Upload en batch**
2. Sélectionnez jusqu'à **20 fichiers** simultanément
3. Les fichiers seront traités en parallèle

> 💡 **Limite** : 10 MB par fichier, 20 fichiers max par batch

---

### Organisation des documents

#### Recherche

Barre de recherche en haut :
- Recherche dans **titre**, **tags**, **contenu**
- Résultats en temps réel (debounced)

#### Filtres

Sidebar gauche :
- **Type de document** : filtrer par type
- **Concurrent** : voir docs d'un concurrent spécifique
- **Date d'upload** : par période
- **Status** : traité / en cours / erreur

#### Tri

Options de tri :
- 📅 **Plus récent** (par défaut)
- 🔤 **Alphabétique** (A-Z)
- 📊 **Plus utilisé** (nb de citations dans réponses)
- ⭐ **Favori** (documents marqués comme favoris)

---

### Actions sur les documents

Pour chaque document :

| Action | Description |
|--------|-------------|
| 👁️ **Voir** | Prévisualiser le contenu |
| ⬇️ **Télécharger** | Télécharger le fichier original |
| ✏️ **Éditer** | Modifier titre/tags/concurrent |
| ⭐ **Favori** | Marquer comme favori |
| 🗑️ **Supprimer** | Supprimer (+ suppression Pinecone) |

#### Suppression

⚠️ **Attention** : Supprimer un document :
- Supprime les métadonnées de la DB
- Supprime les vecteurs de Pinecone
- **Irréversible** (pas de corbeille)

---

### Statistiques de la Knowledge Base

Tableau de bord (en haut) :

```
📊 Knowledge Base Stats
┌─────────────────────────────────────────────────────┐
│  📄 Documents: 147      📦 Stockage: 2.3 GB         │
│  🎯 Concurrents: 8      📅 Dernier upload: 2h       │
│  🔍 Recherches: 1,234   💬 Citations: 3,456         │
└─────────────────────────────────────────────────────┘
```

---

## Gestion des concurrents

### Pourquoi gérer les concurrents ?

La section **Concurrents** vous permet de :
- 📋 **Organiser** vos documents par concurrent
- 🔍 **Filtrer** les recherches par concurrent
- 📊 **Analyser** les données concurrentielles
- 🎯 **Suivre** l'évolution de chaque concurrent

---

### Ajouter un concurrent

1. Allez dans **Concurrents** → **Nouveau concurrent**
2. Remplissez :
   - **Nom** : ex. "Acme Corp"
   - **URL** : site web du concurrent
   - **Description** : notes contextuelles
   - **Logo** (optionnel) : upload image
3. Cliquez **Créer**

---

### Associer des documents

**Méthode 1 : Lors de l'upload**
- Lors de l'upload d'un document, sélectionnez le concurrent dans le menu déroulant

**Méthode 2 : Après upload**
1. Allez dans **Knowledge Base**
2. Cliquez sur un document → **Éditer**
3. Sélectionnez le concurrent → **Sauvegarder**

---

### Fiche concurrent

Cliquez sur un concurrent pour voir :

**Onglet Vue d'ensemble :**
- 📊 Statistiques (nb docs, dernière mise à jour)
- 📝 Description et notes
- 🔗 Liens utiles

**Onglet Documents :**
- Liste de tous les documents associés
- Actions rapides (voir, télécharger, supprimer)

**Onglet Intelligence :**
- 💡 **Insights générés par IA** :
  - Forces et faiblesses
  - Évolution produits
  - Positionnement prix
  - Thèmes récurrents
- 📈 Timeline d'activité

**Onglet Battlecard :**
- 🎯 Comparaison directe avec votre offre
- ✅ Nos avantages
- ⚠️ Leurs avantages
- 💡 Recommandations stratégiques

> 🤖 **Auto-généré** : Les insights et battlecards sont générés automatiquement par Claude basé sur vos documents.

---

## Bonnes pratiques

### 🎯 Maximiser la qualité des réponses générées

1. **Alimentez la knowledge base**
   - Importez vos 10+ derniers RFPs avec réponses
   - Ajoutez vos documents produits
   - Mettez à jour régulièrement

2. **Enrichissez toujours les questions importantes**
   - L'enrichissement améliore la pertinence de 40%
   - Priorisez les questions techniques complexes

3. **Révisez avant export**
   - Les réponses IA sont des drafts de qualité
   - Validation humaine obligatoire
   - Personnalisez selon le client

### 📚 Organiser efficacement votre knowledge base

1. **Nommage cohérent**
   ```
   ✅ Bon : "RFP - Ville de Québec - Infrastructure IT - 2025-01"
   ❌ Mauvais : "document final v3.pdf"
   ```

2. **Tags pertinents**
   - Utilisez des tags descriptifs : "cybersécurité", "cloud", "healthcare"
   - Maximum 5-7 tags par document
   - Standardisez vos tags (créez une liste)

3. **Association aux concurrents**
   - Associez systématiquement les docs concurrentiels
   - Permet des analyses ciblées

### ⚡ Optimiser la performance

1. **Documents**
   - Préférez PDF avec texte extractible (pas scans d'images)
   - Taille optimale : < 5 MB par fichier
   - Pour gros docs : divisez en sections logiques

2. **Génération**
   - Pour RFPs urgents : générez seulement questions clés
   - Utilisez le mode batch pour > 20 questions
   - Réutilisez les réponses existantes quand possible

3. **Chat**
   - Questions courtes et précises = réponses rapides
   - Utilisez les filtres pour limiter le scope
   - Consultez l'historique avant de re-poser une question

### 🔒 Sécurité et confidentialité

1. **Gestion des accès**
   - Vérifiez que seules les personnes autorisées ont accès
   - Logs d'audit disponibles (admins)

2. **Données sensibles**
   - Ne uploadez PAS de données personnelles identifiables
   - Anonymisez les données clients si nécessaire
   - Respectez les politiques de confidentialité de votre organisation

3. **Export et partage**
   - Les exports Word/Excel ne sont PAS chiffrés
   - Traitez-les comme documents confidentiels
   - Ne partagez pas publiquement

---

## FAQ

### Général

**Q : Puis-je utiliser la plateforme hors ligne ?**
R : Non, la plateforme nécessite une connexion Internet (APIs cloud).

**Q : Mes données sont-elles partagées avec d'autres organisations ?**
R : Non, isolation totale par tenant. Aucun partage de données entre organisations.

**Q : Combien de documents puis-je uploader ?**
R : Pas de limite stricte. Plan de base : 500 documents. Contact admin pour plus.

### RFPs

**Q : Quels formats RFP sont supportés ?**
R : PDF, DOCX, XLSX. Les PDF doivent contenir du texte extractible (pas images scannées).

**Q : L'extraction de questions est-elle 100% précise ?**
R : ~95% précise. Vérifiez toujours et éditez si nécessaire.

**Q : Puis-je générer des réponses sans enrichir ?**
R : Oui, mais les réponses seront génériques. L'enrichissement améliore la qualité de 40%.

**Q : Combien de temps prend la génération ?**
R : 5-10 secondes par question. Pour 50 questions : ~5-8 minutes.

### Chat / Intelligence

**Q : Le chat a-t-il accès à Internet ?**
R : Non, seulement à vos documents uploadés dans la knowledge base.

**Q : Puis-je supprimer une conversation ?**
R : Oui, clic droit sur la conversation → Supprimer.

**Q : Pourquoi la réponse dit "Je n'ai pas trouvé d'informations" ?**
R : Le chat n'a trouvé aucun document pertinent. Uploadez plus de documents ou reformulez.

### Knowledge Base

**Q : Puis-je uploader des images ?**
R : Non, uniquement documents texte (PDF, DOCX, etc.). Les images dans PDFs sont ignorées.

**Q : Que se passe-t-il si j'uploade un doublon ?**
R : Le système ne détecte pas les doublons. Évitez manuellement.

**Q : Puis-je modifier le contenu d'un document après upload ?**
R : Non, supprimez et re-uploadez la version corrigée.

### Export

**Q : Le formatage Word est-il personnalisable ?**
R : Partiellement. Template de base fourni. Contact admin pour template custom.

**Q : Puis-je exporter seulement certaines questions ?**
R : Oui, cochez les questions désirées avant export.

### Technique

**Q : Pourquoi l'upload échoue-t-il ?**
R : Vérifiez :
- Taille < 10 MB
- Format supporté (PDF/DOCX/XLSX)
- Connexion Internet stable
- PDF avec texte extractible (pas scan image)

**Q : La génération semble bloquée, que faire ?**
R : Rafraîchissez la page. Si le problème persiste, contactez le support.

---

## Support

### Obtenir de l'aide

1. **Documentation** : Consultez cette documentation
2. **Chat support** : Cliquez sur l'icône 💬 en bas à droite (si disponible)
3. **Email** : support@votre-domaine.com
4. **Admin** : Contactez votre administrateur interne

### Rapporter un bug

Si vous rencontrez un problème :

1. Notez :
   - Page où le problème survient
   - Action effectuée
   - Message d'erreur (screenshot)
   - Heure et date
2. Envoyez à support@votre-domaine.com

### Demande de fonctionnalité

Suggestions d'améliorations ? Contactez votre admin ou support.

---

## Glossaire

| Terme | Définition |
|-------|------------|
| **RFP** | Request for Proposal - Document de demande de soumission |
| **RAG** | Retrieval-Augmented Generation - Génération augmentée par recherche |
| **Enrichissement** | Ajout de contexte IA pour améliorer les réponses |
| **Chunk** | Segment de texte (1000-2000 caractères) pour indexation |
| **Embedding** | Représentation vectorielle d'un texte pour recherche sémantique |
| **Tenant** | Organisation isolée dans le système multi-tenant |
| **Intelligence Brief** | Rapport d'analyse automatique d'un RFP |
| **Battlecard** | Fiche comparative concurrent vs nous |

---

**Besoin d'aide ?** Consultez le [Guide Développeur](./GUIDE_DEVELOPPEUR.md) pour des détails techniques ou contactez votre administrateur.

---

**Dernière mise à jour :** Novembre 2025
**Version :** 1.0
