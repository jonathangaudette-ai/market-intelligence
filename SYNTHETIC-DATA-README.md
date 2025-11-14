# Données Synthétiques RFP - Documentation

Ce document décrit les données synthétiques d'appels d'offres (RFP) créées pour tester les systèmes de traitement automatisé de RFP.

## Vue d'ensemble

Ce repository contient deux ensembles complets de données synthétiques représentant des appels d'offres réalistes pour deux entreprises fictives :

1. **Dissan** - Fournisseur de produits d'hygiène et de sanitation
2. **EnerServ** - Entreprise de maintenance d'équipements énergétiques

## Structure des données

### Dissan (Produits d'hygiène et sanitation)

**Répertoire** : `dissan-synthetic-data/`

**Profil entreprise** : Dissan Inc. - Distributeur québécois de produits d'hygiène professionnelle fondé en 2008

**RFPs créés** :

1. **RFP-2024-001-CISSS-Monteregie-Hopital** (91 questions)
   - **Client** : CISSS de la Montérégie-Centre
   - **Secteur** : Santé (hôpital universitaire 450 lits)
   - **Valeur** : 850 000 $ - 1 100 000 $ CAD sur 3 ans
   - **Portée** : Fourniture complète de produits d'hygiène et sanitation
   - **Sections** : A-M (Profil, Expérience, Produits, Conformité, Logistique, Formation, SST, Prix, Innovation)

2. **RFP-2024-002-Groupe-Resto-Express-Chaine** (91 questions)
   - **Client** : Groupe Resto Express (chaîne 47 restaurants)
   - **Secteur** : Restauration commerciale
   - **Valeur** : 420 000 $ - 580 000 $ CAD sur 2 ans
   - **Portée** : Programme complet d'hygiène et sanitation pour chaîne de restaurants
   - **Sections** : A-L (Profil, Produits, Conformité, Livraison, Formation, SST, Prix, Innovation)

3. **RFP-2024-003-Commission-Scolaire-Vallee-Richelieu** (116 questions)
   - **Client** : Commission scolaire de la Vallée-du-Richelieu
   - **Secteur** : Éducation (32 établissements, 18 000 élèves)
   - **Valeur** : 280 000 $ - 350 000 $ CAD sur 3 ans
   - **Portée** : Fourniture produits d'entretien et sanitation pour établissements scolaires
   - **Sections** : A-I (Profil, Produits, Conformité, Livraison, Commandes, Formation, Environnement, Prix, Innovation)

### EnerServ (Maintenance d'équipements énergétiques)

**Répertoire** : `enerserv-synthetic-data/`

**Profil entreprise** : EnerServ Inc. - Entreprise spécialisée en maintenance de turbines et générateurs fondée en 2011

**RFPs créés** :

1. **RFP-2024-001-Papier-Excellence-Usine-Biomasse** (91 questions)
   - **Client** : Papier Excellence Canada - Usine de Thurso
   - **Secteur** : Pâtes et papiers / Cogénération biomasse
   - **Valeur** : 3 500 000 $ - 4 200 000 $ CAD sur 5 ans
   - **Équipements** : 3 turbines à vapeur (75 MW total) + 3 générateurs
   - **Portée** : Maintenance préventive, corrective et prédictive
   - **Sections** : A-M (Entreprise, Expérience, RH, Approche technique, Pièces, Formation, SST, Prix, Innovation, Tests, Technologies, Gestion, Partenariat)

2. **RFP-2024-002-Innergex-Centrale-Hydroelectrique** (97 questions)
   - **Client** : Innergex Énergie Renouvelable - Centrale de L'Assomption
   - **Secteur** : Hydroélectricité
   - **Valeur** : 1 800 000 $ - 2 400 000 $ CAD sur 3 ans
   - **Équipements** : 3 turbines Francis (40.6 MW total) + 3 générateurs
   - **Portée** : Révisions majeures et maintenance préventive
   - **Sections** : A-L (Entreprise, Expérience, Approche technique, RH, SST, Prix, Équipements, Pièces, Formation, Tests, Innovation, Partenariat)

3. **RFP-2024-003-Rio-Tinto-Aluminerie** (92 questions)
   - **Client** : Rio Tinto Alcan - Aluminerie de Saguenay
   - **Secteur** : Production d'aluminium (industrie lourde)
   - **Valeur** : 2 200 000 $ - 2 800 000 $ CAD sur 4 ans
   - **Équipements** : 4 turbogénérateurs vapeur (85 MW total)
   - **Portée** : Maintenance préventive et corrective avec surveillance continue
   - **Sections** : A-K (Entreprise, Expérience, Approche technique, RH, SST, Prix, Pièces, Équipements, Tests, Formation, Innovation)

## Statistiques globales

### Nombre de questions par RFP

| Entreprise | RFP #1 | RFP #2 | RFP #3 | Total |
|------------|--------|--------|--------|-------|
| **Dissan** | 91 | 91 | 116 | **298** |
| **EnerServ** | 91 | 97 | 92 | **280** |
| **TOTAL** | 182 | 188 | 208 | **578** |

### Contenu créé

- **6 RFPs complets** avec questions détaillées
- **2 profils d'entreprise** détaillés (15 000+ mots chacun)
- **3 catalogues de produits** pour Dissan
- **6 documents de réponses** (REPONSES-*.md)
- **Valeur totale des contrats** : ~13 M$ CAD
- **Fichiers HTML** : Tous les documents RFP convertis en HTML

## Secteurs industriels couverts

### Dissan (Hygiène/Sanitation)
- Santé (hôpitaux)
- Restauration commerciale
- Éducation (écoles)

### EnerServ (Maintenance énergétique)
- Pâtes et papiers / Biomasse
- Hydroélectricité
- Aluminium / Industrie lourde

## Types de questions couvertes

Chaque RFP contient des questions approfondies sur :

1. **Profil et expérience de l'entreprise**
   - Historique, structure, certifications
   - Projets similaires et références clients
   - Statistiques de performance

2. **Approche technique**
   - Méthodologie de travail
   - Technologies et innovations
   - Contrôle qualité et normes

3. **Ressources humaines**
   - Équipes dédiées au projet
   - Qualifications et certifications
   - Formation et développement

4. **Gestion opérationnelle**
   - Planification et échéanciers
   - Communication et rapports
   - Gestion des risques

5. **Santé, sécurité et environnement**
   - Programmes SST
   - Statistiques d'incidents
   - Pratiques environnementales

6. **Aspects commerciaux**
   - Structures de prix détaillées
   - Conditions de paiement
   - Garanties offertes

7. **Innovation et partenariat**
   - Technologies innovantes
   - Approche partenariale
   - Valeur ajoutée

## Utilisation des données

Ces données synthétiques peuvent être utilisées pour :

1. **Tester des systèmes de traitement automatisé de RFP**
   - Extraction d'informations
   - Analyse de questions
   - Génération de réponses

2. **Entraîner des modèles d'IA**
   - Classification de questions
   - Génération de contenu
   - Analyse de conformité

3. **Développer des outils de matching RFP-entreprise**
   - Score de compatibilité
   - Recommandations
   - Analyse de gaps

4. **Benchmarking et comparaison**
   - Complexité des RFPs par secteur
   - Types de questions standards
   - Critères d'évaluation

## Format des fichiers

- **RFP-Document.md** : Document d'appel d'offres complet en Markdown
- **RFP-Document.html** : Version HTML du document RFP
- **REPONSES-*.md** : Réponses synthétiques de l'entreprise
- **profil-*.md** : Profil détaillé de l'entreprise
- **catalogue-*.md** : Catalogues de produits (Dissan)

## Réalisme des données

Les données synthétiques ont été créées pour être aussi réalistes que possible :

- **Valeurs de contrats** basées sur des ordres de grandeur réels
- **Certifications et normes** authentiques (ISO, CSA, ASME, IEEE, etc.)
- **Terminologie technique** précise et sectorielle
- **Structure de questions** conforme aux pratiques de l'industrie
- **Critères d'évaluation** standards du secteur public québécois

## Langue

Tous les documents sont en **français québécois**, reflétant la réalité du marché public québécois.

## Date de création

Données créées en novembre 2025.

## Version

Version 1.0 - Données complètes et validées

---

**Note** : Ces données sont entièrement synthétiques et créées à des fins de test et développement. Toutes les entreprises, personnes, et situations décrites sont fictives.
