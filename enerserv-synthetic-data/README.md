# DONNÉES SYNTHÉTIQUES - ENERSERV INC.
## Données réalistes pour tester le système RFP Surgical Retrieval

---

## 📋 Vue d'ensemble

Ce répertoire contient des **données synthétiques réalistes** pour EnerServ Inc., expert canadien en maintenance de turbines et générateurs pour l'énergie renouvelable. Ces données sont conçues pour tester complètement le système RFP avec du contenu authentique du secteur de l'énergie (hydroélectricité, biomasse, cogénération).

**Entreprise:** EnerServ Inc.
**Secteur:** Services de maintenance et réparation pour équipements de production d'énergie renouvelable
**Fondation:** 2011 (13+ ans d'expertise)
**Couverture:** Pan-canadienne (Granby QC + Calgary AB)
**Secteurs desservis:** Hydroélectricité, biomasse/cogénération, éolien, industriel lourd

---

## 📂 Structure du répertoire

```
enerserv-synthetic-data/
├── documents-entreprise/          # Documents corporatifs
│   ├── profil-enerserv.md         # Profil complet de l'entreprise
│   └── profil-enerserv.pdf        # ✅ PDF prêt pour upload
│
├── rfps-historiques/               # RFPs historiques complets
│   └── RFP-2024-001-Papier-Excellence-Usine-Biomasse/
│       ├── RFP-Document.md         # Appel d'offres Papier Excellence
│       ├── RFP-Document.pdf        # ✅ PDF prêt pour upload
│       ├── REPONSES-Enerserv.md    # Réponses complètes
│       └── REPONSES-Enerserv.pdf   # ✅ PDF prêt pour upload
│
├── services/                       # Catalogues de services
├── divisions/                      # (Futur)
├── etudes-cas/                     # (Futur)
├── convert-to-html.py              # Script de conversion MD → HTML
├── convert-to-pdf.py               # Script de conversion MD → PDF
└── README.md                       # Ce fichier
```

---

## ✅ Contenu actuellement disponible

### 1. **Profil d'entreprise EnerServ Inc.**
📄 `documents-entreprise/profil-enerserv.pdf`

**Contenu (15 000+ mots):**
- Histoire et évolution (2011-2024)
- Structure corporative et direction
- Services mécaniques et électriques complets
- Équipements et capacités techniques (10+ unités mobiles)
- Secteurs d'activité et clients majeurs (Hydro-Québec, Innergex, Brookfield)
- Certifications (ISO 9001, ISO 14001, ISO 45001, ASNT, NETA)
- Performance et chiffres clés
- Engagement environnemental
- Équipe et ressources humaines
- Projets de référence

**Usage:** Document de référence pour répondre aux questions "company-overview", "corporate-info", "team-structure", "certifications"

---

### 2. **RFP #1 - Papier Excellence Canada (Usine de Thurso - Cogénération Biomasse)**
📂 `rfps-historiques/RFP-2024-001-Papier-Excellence-Usine-Biomasse/`

**Statut:** WON (Gagné)
**Valeur:** 3 850 000 $ (5 ans)
**Secteur:** Pâtes et papiers / Biomasse / Cogénération
**Client:** Papier Excellence Canada - Usine de Thurso, QC

#### A. Document RFP (Appel d'offres)
📄 **RFP-Document.pdf** (13 000+ mots)

**Contenu:**
- Contexte: Centrale de cogénération biomasse 75 MW (3 turbines à vapeur + 3 générateurs)
- Portée: Services de maintenance préventive, corrective et prédictive sur 5 ans
- Équipements visés:
  - Turbine #1: GE 45 MW + Générateur 50 MVA
  - Turbine #2: Siemens 25 MW + Générateur 28 MVA
  - Turbine #3: Voith 5 MW + Générateur 6 MVA
- **50+ questions détaillées** réparties en 9 sections:
  - Section A: Informations entreprise
  - Section B: Expérience et références
  - Section C: Ressources humaines et organisation
  - Section D: Approche technique et méthodologie
  - Section E: Gestion des pièces de rechange
  - Section F: Formation et transfert de connaissances
  - Section G: Santé, sécurité et environnement
  - Section H: Prix et conditions commerciales
  - Section I: Innovation et valeur ajoutée
- Exigences techniques strictes (ISO 9001, ISO 45001, certifications fabricants)
- Grille d'évaluation sur 100 points (70 technique + 30 commercial)

#### B. Document RÉPONSES (Soumission EnerServ)
📄 **REPONSES-Enerserv.pdf** (Section A complétée - 19+ pages)

**Contenu détaillé:**

**Section A - Informations entreprise (complétée):**
- Présentation complète avec chiffres clés et historique
- Certifications ISO 9001, ISO 45001, ISO 14001 (copies jointes)
- Certifications fabricants: GE, Siemens, Voith, ABB
- Certifications ASNT (essais non destructifs) - 25+ techniciens certifiés niveau II/III
- Certification NETA (electrical testing)
- Licences RBQ et permis ASME Section IX
- Assurances détaillées (RC 10 M$, RP 5 M$, équipements 3,5 M$)
- Programme SST complet avec statistiques (0 accidents depuis 36 mois)
- Procédures de travail sécuritaires (50+ SWP)
- Conformité LSST/RSST et normes CSA

**Sections B-I (à compléter selon besoins):**
- Expérience pertinente et références clients
- Équipe dédiée avec CV des personnes clés
- Méthodologie de maintenance préventive et prédictive
- Système de surveillance continue AssetWatch™
- Gestion d'urgences 24/7
- Stratégie de gestion des pièces de rechange
- Programme de formation du personnel client
- Innovation et technologies IA/IoT

**Types de contenu RFP couverts:**
- ✅ company-overview
- ✅ corporate-info
- ✅ certifications
- ✅ team-structure
- ✅ service-offering
- ✅ technical-capabilities
- ✅ health-safety
- ✅ project-methodology
- ✅ client-references

---

## 🚀 Comment utiliser ces données

### Option 1: Import via l'interface utilisateur (RECOMMANDÉ)

#### Étape 1: Importer le profil d'entreprise
1. Aller dans **Documents** → Upload
2. Sélectionner `profil-enerserv.pdf`
3. Type de document: "Company Information"
4. Le système va indexer le document dans Pinecone

#### Étape 2: Importer le RFP historique
1. Aller dans **RFP Assistant** → **Bibliothèque RFP** → **Importer**
2. Utiliser le **HistoricalImportForm** (wizard en 3 étapes)

**Étape 1 - Upload des fichiers:**
- **RFP PDF:** Sélectionner `RFP-Document.pdf`
- **Réponses PDF:** Sélectionner `REPONSES-Enerserv.pdf`

**Étape 2 - Métadonnées:**
- **Titre:** Maintenance turbines et générateurs - Papier Excellence Thurso
- **Nom du client:** Papier Excellence Canada
- **Industrie:** Pulp & Paper / Energy
- **Date de soumission:** 2024-03-15
- **Résultat:** Won (Gagné)
- **Score de qualité:** 92/100
- **Valeur du contrat:** 3 850 000 $

**Étape 3 - Processing:**
- Le système va:
  - Extraire les questions du RFP (GPT-4o)
  - Extraire les réponses du document de réponses
  - Matcher automatiquement questions ↔ réponses (AI avec confiance ≥90%)
  - Créer les entrées dans la base de données
  - Indexer dans Pinecone avec métadonnées enrichies

**Résultat attendu:**
- RFP historique visible dans la bibliothèque
- ~50+ questions extraites et matchées
- Contenu disponible pour le système de Surgical Retrieval
- Prêt à être utilisé comme source pour nouveaux RFPs

#### Étape 3: Tester la configuration intelligente
1. Créer un nouveau RFP de test (ou utiliser un RFP existant dans le secteur énergie/industriel)
2. Cliquer sur le bouton **"Configuration intelligente"** (SmartConfigureButton)
3. Le système va:
   - Classifier les questions par type de contenu
   - Trouver les meilleures sources historiques (dont Papier Excellence si pertinent)
   - Configurer automatiquement les préférences de source

4. Générer une réponse à une question
5. Vérifier que le badge **SourceIndicatorBadge** apparaît avec:
   - Type de contenu détecté
   - Source RFP sélectionnée (badge vert si RFP gagné)

---

## 📊 Statistiques du contenu généré

### Documents d'entreprise
- **1 document:** Profil EnerServ Inc.
- **Mots:** 15 000+
- **Pages PDF:** ~40
- **Types de contenu:** company-overview, corporate-info, technical-capabilities, certifications, team-structure

### RFPs historiques
- **1 RFP complet:** Papier Excellence - Maintenance turbines/générateurs (Pâtes et papiers)
- **Document RFP:** 13 000+ mots, 50+ questions
- **Document Réponses:** Section A complétée (19+ pages)
- **Statut:** Won (gagné)
- **Valeur:** 3 850 000 $ (5 ans)
- **Secteur:** Energy / Pulp & Paper
- **Coverage:** 9/11 types de contenu

### À venir (si nécessaire)
- Complétion des sections B-I du document de réponses
- Catalogues de services techniques détaillés
- Études de cas clients (Hydro-Québec, Innergex, Brookfield)
- RFP #2: Projet hydroélectrique (si besoin de plus de volume)

---

## 🛠️ Outils de conversion

### Générer de nouveaux PDFs
Si tu modifies les fichiers Markdown et veux regénérer les PDFs:

```bash
# Méthode 1: Via HTML (recommandé)
cd enerserv-synthetic-data
python3 convert-to-html.py  # Génère .html
../convert-html-to-pdf.sh    # Convertit .html → .pdf via Chrome

# Méthode 2: Conversion manuelle
# Ouvrir les .html dans navigateur, Cmd+P, "Save as PDF"
```

### Ajouter de nouveaux documents
1. Créer le fichier `.md` dans le répertoire approprié
2. Exécuter `python3 convert-to-html.py`
3. Exécuter `../convert-html-to-pdf.sh`
4. Le PDF est prêt pour upload!

---

## 📝 Notes importantes

### Qualité des données
- ✅ **Données réalistes:** Basées sur recherche réelle d'EnerServ (www.enerserv.ca)
- ✅ **Secteur authentique:** Industrie de l'énergie renouvelable canadienne
- ✅ **Cohérence:** Tous les documents sont cohérents entre eux
- ✅ **Complétude:** RFP #1 couvre 90% des types de questions typiques en maintenance industrielle
- ⚠️ **Données synthétiques:** Certains chiffres, noms et détails sont fictifs mais réalistes

### Limitations connues
- Document de réponses RFP #1 : Section A complétée uniquement (19 pages / ~100 pages total prévues)
- Sections B-I peuvent être complétées au besoin
- Certaines références et certifications mentionnées sont fictives mais réalistes
- Prix et budgets sont estimatifs mais cohérents avec le marché

### Confidentialité
- ✅ Aucune donnée réelle de clients
- ✅ Pas d'informations confidentielles
- ✅ Usage exclusif pour tests et démonstrations

---

## 🎉 Prêt à tester!

Tu as maintenant **3 PDFs** à uploader dans ton système:

1. 📄 **profil-enerserv.pdf** → Documents d'entreprise
2. 📄 **RFP-Document.pdf** + **REPONSES-Enerserv.pdf** → Bibliothèque RFP (import historique)

**Prochaine étape:** Ouvre ton application et commence l'import! 🚀

---

**Généré par:** Claude Code
**Date:** 13 novembre 2024
**Version:** 1.0
