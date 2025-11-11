/**
 * Seed Pinecone with Synthetic Data for RAG Testing
 *
 * This script generates 30-50 synthetic documents covering:
 * - Company information (10 docs)
 * - Product features (15 docs)
 * - Past RFP responses (10 docs)
 * - Competitive intelligence (10 docs)
 * - Industry insights (5 docs)
 *
 * All documents are flagged with synthetic: true for easy cleanup
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const INDEX_NAME = 'market-intelligence';
const NAMESPACE = 'rfp-library';

interface SyntheticDocument {
  id: string;
  text: string;
  category: 'company_info' | 'product_docs' | 'past_response' | 'battlecard' | 'industry_insight';
  title: string;
  metadata?: Record<string, any>;
}

// Synthetic documents for TechVision AI - A fictional B2B SaaS company
const syntheticDocuments: SyntheticDocument[] = [
  // ============ COMPANY INFO (10 docs) ============
  {
    id: 'syn-company-001',
    title: 'TechVision AI - Company Overview',
    category: 'company_info',
    text: `TechVision AI est une entreprise canadienne fondée en 2018, spécialisée dans les solutions d'intelligence artificielle pour les entreprises B2B. Notre mission est de démocratiser l'IA en rendant les technologies avancées accessibles aux entreprises de toutes tailles. Nous servons plus de 350 clients à travers l'Amérique du Nord, principalement dans les secteurs de la finance, de la santé et du commerce de détail. Notre siège social est situé à Montréal, avec des bureaux à Toronto et Vancouver. Nous employons 120 personnes, dont 70% en R&D et ingénierie.`
  },
  {
    id: 'syn-company-002',
    title: 'TechVision AI - Mission et Valeurs',
    category: 'company_info',
    text: `Nos valeurs fondamentales : Innovation Continue - Nous investissons 25% de notre chiffre d'affaires en R&D. Transparence - Notre IA est explicable et auditable. Sécurité d'abord - Certifications SOC 2 Type II, ISO 27001. Diversité & Inclusion - 45% de notre équipe sont des femmes, 60% sont issus de minorités visibles. Excellence du service - NPS de 72, taux de rétention client de 94%. Nous croyons que l'IA doit être éthique, responsable et au service de l'humain.`
  },
  {
    id: 'syn-company-003',
    title: 'TechVision AI - Leadership Team',
    category: 'company_info',
    text: `Marie Tremblay, CEO - Ex-VP Product chez Shopify, MBA HEC Montréal. David Chen, CTO - PhD en Machine Learning McGill, ancien chercheur chez Google Brain. Sophie Lavoie, VP Sales - 15 ans d'expérience en vente enterprise B2B. Jean-Philippe Dubois, VP Engineering - Ancien directeur technique chez Lightspeed. Aisha Rahman, Chief AI Ethics Officer - PhD éthique de l'IA, conseillère pour le gouvernement canadien. Notre équipe de direction combine expertise technique, vision business et engagement éthique.`
  },
  {
    id: 'syn-company-004',
    title: 'TechVision AI - Clients et Cas d\'Usage',
    category: 'company_info',
    text: `Clients majeurs : Banque Nationale (automatisation du traitement des prêts), Pharmavie (découverte de médicaments assistée par IA), Retail Plus (optimisation des stocks et personnalisation). Cas d'usage typiques : Automatisation de processus métier (35%), Analyse prédictive (25%), Chatbots et support client (20%), Vision par ordinateur (15%), Autres (5%). Industries servies : Services financiers (40%), Santé et pharmacie (25%), Retail et e-commerce (20%), Manufacturing (10%), Autres (5%). Notre plateforme traite plus de 50 millions de transactions par mois.`
  },
  {
    id: 'syn-company-005',
    title: 'TechVision AI - Certifications et Conformité',
    category: 'company_info',
    text: `Certifications de sécurité : SOC 2 Type II (renouvelée annuellement depuis 2020), ISO 27001:2013, HIPAA compliant pour le secteur santé, PCI DSS Level 1 pour transactions financières. Conformité réglementaire : RGPD et PIPEDA compliant, AI Act européen ready, Framework canadien sur l'IA responsable. Audits réguliers par des tiers indépendants (Deloitte, PwC). Tests d'intrusion semestriels. Programme de bug bounty actif. Toutes nos données sont hébergées au Canada (AWS Canada Central).`
  },
  {
    id: 'syn-company-006',
    title: 'TechVision AI - Infrastructure et Technologies',
    category: 'company_info',
    text: `Stack technologique : Cloud : AWS (primaire), GCP (backup), multi-région pour haute disponibilité. Modèles IA : GPT-4o, Claude 3.5 Sonnet, Llama 3, modèles propriétaires fine-tunés. Bases de données : PostgreSQL (données structurées), Pinecone (vecteurs), Redis (cache). Backend : Python (FastAPI), TypeScript (Node.js). Frontend : React, Next.js. Infrastructure as Code : Terraform. CI/CD : GitHub Actions, ArgoCD. Monitoring : Datadog, Sentry. Uptime : 99.95% sur les 12 derniers mois.`
  },
  {
    id: 'syn-company-007',
    title: 'TechVision AI - Support et Service Client',
    category: 'company_info',
    text: `Modèles de support disponibles : Standard (9h-17h EST, email + chat, réponse sous 24h), Premium (24/5, priorité haute, réponse sous 4h, account manager dédié), Enterprise (24/7, téléphone + email + chat, réponse sous 1h, équipe dédiée, CSM attitré). Langues supportées : Français et anglais (natif), espagnol (beta). Documentation : Base de connaissances avec 500+ articles, vidéos de formation, API docs complètes, webinaires mensuels. Formation : Onboarding personnalisé, certification TechVision AI disponible. NPS de 72, CSAT de 4.6/5.`
  },
  {
    id: 'syn-company-008',
    title: 'TechVision AI - Tarification et Modèles Commerciaux',
    category: 'company_info',
    text: `Plans disponibles : Starter (2 500$/mois, jusqu'à 10 utilisateurs, 100K requêtes/mois), Professional (7 500$/mois, jusqu'à 50 utilisateurs, 500K requêtes/mois, support premium), Enterprise (sur mesure, utilisateurs illimités, volume personnalisé, support 24/7, SLA garanti 99.9%). Options : Déploiement cloud ou on-premise, modèles fine-tunés sur vos données, développement de features custom. Engagement : Contrats annuels (réduction de 15%), option mensuelle disponible. ROI typique : 300% sur 18 mois, payback période de 6-8 mois.`
  },
  {
    id: 'syn-company-009',
    title: 'TechVision AI - Roadmap Produit 2025',
    category: 'company_info',
    text: `Q1 2025 : Lancement du multimodal AI (texte + image + audio), intégration native avec Salesforce. Q2 2025 : AI Agents autonomes pour automatisation complexe, support de 5 nouvelles langues. Q3 2025 : Edge AI pour traitement local sans cloud, modèles spécialisés par industrie. Q4 2025 : Plateforme no-code/low-code pour créer ses propres workflows IA, marketplace de modèles. Innovation continue : 2 releases majeures par trimestre, 60+ features déployées en 2024, feedback client intégré dans 80% des nouvelles features.`
  },
  {
    id: 'syn-company-010',
    title: 'TechVision AI - Partenariats et Écosystème',
    category: 'company_info',
    text: `Partenaires technologiques : AWS Advanced Partner, OpenAI Partner, Anthropic Partner, Microsoft Azure certified. Partenaires d'intégration : Salesforce (AppExchange listed), HubSpot, SAP, Oracle, Workday. Revendeurs : Réseau de 15 VARs au Canada et USA. Alliances stratégiques : Partenariat R&D avec Université McGill, membre de Mila (Institut québécois d'IA), membre de Vector Institute. Participation active dans les communautés : IVADO, Scale AI, Conseil canadien de l'IA. Présentations régulières à NeurIPS, ICML, et autres conférences IA de premier plan.`
  },

  // ============ PRODUCT FEATURES (15 docs) ============
  {
    id: 'syn-product-001',
    title: 'TechVision AI Platform - Vue d\'ensemble',
    category: 'product_docs',
    text: `La plateforme TechVision AI est une suite complète d'outils d'intelligence artificielle conçue pour les entreprises. Composants principaux : 1) AI Studio - environnement no-code pour créer des modèles IA personnalisés, 2) Automation Engine - orchestration de workflows IA complexes, 3) API Gateway - APIs REST et GraphQL pour intégration, 4) Analytics Dashboard - visualisation en temps réel des performances, 5) Security Hub - gestion centralisée de la sécurité et conformité. Architecture microservices pour scalabilité infinie. Déploiement flexible : cloud, hybrid ou on-premise.`
  },
  {
    id: 'syn-product-002',
    title: 'Natural Language Processing (NLP) Capabilities',
    category: 'product_docs',
    text: `Capacités NLP avancées : Analyse de sentiment (précision 94%), extraction d'entités nommées (98% F1-score), classification de texte multi-label, résumé automatique (extractif et abstractif), traduction neuronale (50+ paires de langues), génération de texte contextuelle. Use cases : Analyse de feedback clients, automatisation de réponses emails, extraction d'informations de documents, chatbots conversationnels. Modèles : GPT-4o pour génération, BERT fine-tuné pour classification, T5 pour résumé. Supporte 25+ langues incluant français, anglais, espagnol, mandarin. Latence moyenne : 200ms pour requêtes simples, 2s pour génération longue.`
  },
  {
    id: 'syn-product-003',
    title: 'Vision AI - Computer Vision Solutions',
    category: 'product_docs',
    text: `Fonctionnalités de vision par ordinateur : Détection d'objets (YOLO v8, mAP 89%), reconnaissance faciale (99.2% précision, respecte la vie privée), OCR multilingue (Tesseract + modèles propriétaires), analyse de documents (factures, contrats, formulaires), détection d'anomalies visuelles pour quality control, segmentation d'images. Applications : Automatisation de l'entrée de données, contrôle qualité manufacturier, analyse de dommages (assurance), reconnaissance de produits (retail). Formats supportés : JPEG, PNG, TIFF, PDF. Traitement batch jusqu'à 10 000 images/heure. API REST avec webhooks pour résultats asynchrones.`
  },
  {
    id: 'syn-product-004',
    title: 'Predictive Analytics Engine',
    category: 'product_docs',
    text: `Moteur d'analyse prédictive alimenté par ML : Prévisions de séries temporelles (ARIMA, Prophet, LSTM), scoring de leads et churn prediction, détection d'anomalies en temps réel, recommandation personnalisée, optimisation de pricing dynamique. Modèles pré-entraînés pour : ventes forecasting (MAPE 8%), prédiction de churn (AUC-ROC 0.91), détection de fraude (precision 96%, recall 89%). AutoML intégré pour créer des modèles custom sans expertise ML. Explainability : SHAP values, LIME pour interpréter les prédictions. Interface drag-and-drop pour créer des pipelines ML. Réentraînement automatique des modèles sur nouvelles données.`
  },
  {
    id: 'syn-product-005',
    title: 'Conversational AI & Chatbots',
    category: 'product_docs',
    text: `Plateforme de chatbots intelligents : Builder visuel no-code avec flows conversationnels, NLU (Natural Language Understanding) pour intent detection (F1-score 92%), gestion du contexte multi-tour, support multilingue (20+ langues), intégrations : Slack, Teams, WhatsApp, Web widget, Facebook Messenger. Features avancées : Handoff vers humains, sentiment analysis en temps réel, personnalisation basée sur historique client, A/B testing de conversations, analytics détaillés (taux de résolution, satisfaction, drop-off). Cas d'usage : Support client (réduction de 60% des tickets), qualification de leads, FAQ automatisées, employee helpdesk.`
  },
  {
    id: 'syn-product-006',
    title: 'Document Intelligence & Processing',
    category: 'product_docs',
    text: `Solution complète de traitement documentaire : OCR intelligent pour documents manuscrits et imprimés, extraction de données structurées (tables, champs clés), classification automatique de documents, validation et vérification de données, anonymisation automatique (RGPD compliant). Types de documents supportés : Factures, contrats, formulaires, rapports médicaux, déclarations douanières, documents d'identité. Précision : 99.5% sur texte imprimé, 94% sur manuscrit. Traitement parallèle de milliers de documents. Output : JSON, CSV, Excel, intégration directe ERP/CRM. Audit trail complet pour conformité réglementaire.`
  },
  {
    id: 'syn-product-007',
    title: 'Workflow Automation & Orchestration',
    category: 'product_docs',
    text: `Moteur d'automatisation de workflows : Designer visuel drag-and-drop pour créer des workflows complexes, 200+ connecteurs pré-construits (Salesforce, SAP, Google Workspace, etc.), triggers basés sur événements, conditions et branches logiques, boucles et itérations, gestion d'erreurs et retry logic, scheduling (cron-style), webhooks entrants/sortants. Workflows types : Onboarding client automatisé, traitement de commandes end-to-end, synchronisation de données entre systèmes, alertes et notifications intelligentes. Monitoring en temps réel avec alertes. Version control des workflows. Environnements dev/staging/prod. Scalabilité : jusqu'à 1M exécutions/mois.`
  },
  {
    id: 'syn-product-008',
    title: 'API & Developer Tools',
    category: 'product_docs',
    text: `Suite complète d'outils pour développeurs : REST API documentée (OpenAPI/Swagger), GraphQL API pour requêtes flexibles, SDKs officiels : Python, JavaScript/TypeScript, Java, C#, webhooks pour événements asynchrones, sandbox environment pour tests, générateur de clés API avec scopes granulaires. Documentation : Guides de démarrage, tutoriels interactifs, exemples de code, Postman collection. Rate limits : 1000 req/min (Starter), 5000 req/min (Pro), illimité (Enterprise). Latence P99 : < 500ms. SLA API : 99.9% uptime. Support : Forum communautaire, Stack Overflow tag, support technique prioritaire. Versioning : v1 stable, v2 beta.`
  },
  {
    id: 'syn-product-009',
    title: 'Analytics & Reporting Dashboard',
    category: 'product_docs',
    text: `Tableau de bord analytics complet : Métriques en temps réel (latence, throughput, erreurs), visualisations interactives (graphiques, tableaux, cartes), rapports personnalisables avec filtres dynamiques, exports (PDF, Excel, CSV), scheduled reports par email, dashboards partagés avec contrôle d'accès. Métriques suivies : Usage API, coût par modèle, performance des modèles (accuracy, latence), satisfaction utilisateurs, ROI. Alertes configurables (seuils, anomalies). Intégration : Google Analytics, Mixpanel, Amplitude. Retention : 13 mois de données historiques (Standard), illimité (Enterprise). GDPR compliant avec anonymisation disponible.`
  },
  {
    id: 'syn-product-010',
    title: 'Security & Compliance Features',
    category: 'product_docs',
    text: `Sécurité enterprise-grade : Encryption at rest (AES-256), encryption in transit (TLS 1.3), SSO avec SAML 2.0 et OAuth 2.0, MFA obligatoire pour comptes admin, RBAC granulaire (50+ permissions), audit logs complets (SIEM-ready), IP whitelisting, VPN et private endpoints. Conformité : SOC 2 Type II, ISO 27001, HIPAA, PCI DSS, RGPD/PIPEDA. Data residency : choix de région (Canada, US, EU), data sovereignty garantie. Penetration testing semestriels. Bug bounty program. DLP (Data Loss Prevention) intégré. Backup automatiques quotidiennes avec retention 30 jours.`
  },
  {
    id: 'syn-product-011',
    title: 'Model Training & Fine-tuning',
    category: 'product_docs',
    text: `Plateforme de training et fine-tuning de modèles : Upload vos données (CSV, JSON, parquet), preprocessing automatique (nettoyage, normalisation), AutoML pour sélection d'architecture optimale, fine-tuning de modèles foundation (GPT, BERT, etc.), hyperparameter tuning automatique, evaluation avec métriques standard, déploiement one-click en production. Training distribué sur GPU clusters (V100, A100), support de frameworks : PyTorch, TensorFlow, Scikit-learn. Monitoring du training (loss curves, métriques), early stopping automatique. Model versioning avec rollback. A/B testing de modèles en production. Coût : 0.50$/heure GPU + storage.`
  },
  {
    id: 'syn-product-012',
    title: 'Collaboration & Team Management',
    category: 'product_docs',
    text: `Fonctionnalités de collaboration d'équipe : Workspaces pour organiser projets, partage de modèles et workflows entre équipes, comments et annotations, version history avec diff viewer, approval workflows pour déploiements production, notifications et @mentions, intégration Slack/Teams pour alertes. Gestion d'équipe : Invitations par email, onboarding guidé, roles et permissions (Admin, Developer, Viewer, Custom), usage tracking par utilisateur, billing par équipe. SSO enterprise pour centraliser authentification. Activity feed pour voir actions récentes. Knowledge base partagée. Templates de projets pour standardiser.`
  },
  {
    id: 'syn-product-013',
    title: 'Multi-language & Localization Support',
    category: 'product_docs',
    text: `Support multilingue complet : Interface disponible en 15 langues (français, anglais, espagnol, allemand, mandarin, japonais, etc.), traduction automatique de contenus, détection automatique de langue, glossaires personnalisés par industrie, gestion de terminologie. Modèles NLP optimisés par langue : Tokenizers adaptés, embeddings contextuels, modèles fine-tunés sur corpus spécialisés. Langues supportées pour NLP : 50+ langues incluant langues à faible ressource. RTL (right-to-left) support pour arabe/hébreu. Localisation des formats : dates, nombres, devises. Cultural adaptation des contenus générés. Translation memory pour consistance.`
  },
  {
    id: 'syn-product-014',
    title: 'Performance & Scalability',
    category: 'product_docs',
    text: `Architecture haute performance : Auto-scaling horizontal (Kubernetes), load balancing intelligent, caching multi-niveaux (Redis, CDN), database read replicas, connection pooling, async processing avec queues (RabbitMQ). Benchmarks : 10 000 requêtes/seconde par instance, latence P50 : 100ms, P95 : 300ms, P99 : 500ms. Scalabilité prouvée : Plus grand client traite 100M transactions/mois. SLA : 99.95% uptime garanti (Enterprise). Disaster recovery : RTO 4h, RPO 15min. Multi-region deployment avec failover automatique. Performance monitoring continu avec alertes. Capacity planning proactif.`
  },
  {
    id: 'syn-product-015',
    title: 'Integration Ecosystem',
    category: 'product_docs',
    text: `Écosystème d'intégrations étendu : CRM : Salesforce, HubSpot, Microsoft Dynamics, Pipedrive. ERP : SAP, Oracle, NetSuite. Communication : Slack, Microsoft Teams, Zoom, Google Meet. Productivity : Google Workspace, Microsoft 365, Notion, Asana. Data : Snowflake, Databricks, BigQuery, Redshift. BI : Tableau, PowerBI, Looker. Plus de 200 intégrations disponibles. Zapier et Make.com support pour no-code integration. Webhooks et API pour intégrations custom. OAuth pour authentification sécurisée. Pre-built connectors avec configuration guidée. Marketplace d'intégrations communautaires.`
  },

  // ============ PAST RFP RESPONSES (10 docs) ============
  {
    id: 'syn-response-001',
    title: 'RFP Response - Data Security & Privacy Measures',
    category: 'past_response',
    text: `Question : Décrivez vos mesures de sécurité et de protection des données. Réponse gagnante : TechVision AI prend la sécurité des données extrêmement au sérieux. Nos mesures incluent : 1) Encryption at rest (AES-256) et in transit (TLS 1.3) pour toutes les données, 2) Certifications SOC 2 Type II et ISO 27001 renouvelées annuellement, 3) Audits de sécurité semestriels par des tiers indépendants (Deloitte), 4) Tests d'intrusion réguliers et programme de bug bounty actif, 5) Data residency garantie au Canada avec choix de région, 6) Accès contrôlé par RBAC granulaire et MFA obligatoire, 7) Audit logs complets exportables vers SIEM, 8) Backups automatiques quotidiennes avec encryption. Conformité RGPD, PIPEDA, HIPAA selon vos besoins. Notre taux d'incidents de sécurité : 0 sur les 5 dernières années.`
  },
  {
    id: 'syn-response-002',
    title: 'RFP Response - Implementation Timeline',
    category: 'past_response',
    text: `Question : Quel est votre timeline typique d'implémentation ? Réponse gagnante : Notre processus d'implémentation structuré en 5 phases garantit un déploiement réussi : Phase 1 - Discovery (2 semaines) : Ateliers de requirements, audit technique, définition des KPIs. Phase 2 - Setup (1 semaine) : Configuration de l'environnement, SSO, intégrations. Phase 3 - Customization (3-6 semaines selon complexité) : Fine-tuning des modèles, workflows personnalisés, tests. Phase 4 - Training (2 semaines) : Formation des administrateurs et utilisateurs finaux, documentation. Phase 5 - Go-Live & Hypercare (2 semaines) : Déploiement progressif, support intensif 24/7. Timeline totale : 10-15 semaines pour implémentation standard. Notre taux de succès : 98% des projets livrés on-time et on-budget. Accompagnement CSM dédié durant tout le processus.`
  },
  {
    id: 'syn-response-003',
    title: 'RFP Response - Pricing & ROI Justification',
    category: 'past_response',
    text: `Question : Justifiez votre proposition de prix et le ROI attendu. Réponse gagnante : Notre tarification Enterprise à 15 000$/mois est structurée pour maximiser votre ROI : Coûts évités : Réduction de 60% du volume de tickets support (économie estimée : 120 000$/an sur 2 FTEs), automatisation de 40 heures/semaine de tâches manuelles (économie : 80 000$/an), réduction de 30% du cycle de vente (revenus accélérés : 200 000$/an). Revenus augmentés : Amélioration de 15% du taux de conversion (impact : 300 000$/an de revenus supplémentaires), upsell intelligent augmentant ARPU de 12%. ROI calculé : Investissement annuel 180 000$, bénéfices totaux 700 000$, ROI net 289%, payback période 5 mois. Cas client similaire : Pharmavie a réalisé 850 000$ d'économies la première année. Garantie : Si ROI < 200% après 18 mois, nous offrons 6 mois gratuits.`
  },
  {
    id: 'syn-response-004',
    title: 'RFP Response - Scalability & Performance',
    category: 'past_response',
    text: `Question : Comment votre solution s'adapte-t-elle à notre croissance anticipée ? Réponse gagnante : L'architecture cloud-native de TechVision AI est conçue pour scaler sans limites : Infrastructure : Auto-scaling horizontal sur Kubernetes, load balancing multi-région, database sharding automatique. Performance garantie : Latence < 500ms maintenue jusqu'à 10 000 req/s, throughput linéaire avec ajout de ressources. Preuve de scalabilité : Client actuel traite 100M transactions/mois (croissance de 5x en 2 ans sans dégradation), support de 5 000 utilisateurs concurrents pour un seul client. Plan de croissance : Capacité actuelle 3x vos besoins projetés, monitoring proactif avec alertes de capacité, revues trimestrielles de performance, upgrades transparents sans downtime. SLA : 99.95% uptime garanti même durant scaling. Coût : Modèle de pricing linéaire, pas de pénalité pour croissance rapide.`
  },
  {
    id: 'syn-response-005',
    title: 'RFP Response - Support & Maintenance',
    category: 'past_response',
    text: `Question : Décrivez votre modèle de support technique. Réponse gagnante : Support Enterprise 24/7/365 inclus : Canaux : Téléphone, email, chat, portail web. SLA : Réponse < 1h pour P1 (critical), < 4h pour P2 (high), < 24h pour P3 (medium). Résolution P1 : 95% sous 4h. Équipe dédiée : Customer Success Manager attitré, équipe technique dédiée de 3 ingénieurs. Support proactif : Monitoring 24/7 avec intervention avant que vous détectiez un problème, revues mensuelles de performance, recommandations d'optimisation. Maintenance : Updates automatiques sans downtime, patches de sécurité sous 48h, upgrades de features planifiées avec vous. Formation continue : Webinaires mensuels, accès à bibliothèque de 200+ vidéos, certification utilisateurs. Satisfaction : NPS 72, CSAT 4.6/5, taux de rétention 94%. Escalation garantie : CTO joignable en < 2h pour incidents P1.`
  },
  {
    id: 'syn-response-006',
    title: 'RFP Response - Customization & Flexibility',
    category: 'past_response',
    text: `Question : Dans quelle mesure peut-on personnaliser votre solution ? Réponse gagnante : Personnalisation extensive sans compromettre la maintenabilité : Configuration no-code : Workflows personnalisés, règles métier, UI/UX branding complet, champs custom et taxonomies. Development : APIs ouvertes pour intégrations custom, webhooks pour événements, SDKs officiels (Python, JS, Java), sandbox pour développement. Fine-tuning : Entraînement de modèles sur vos données propriétaires, adaptation de la terminologie à votre industrie, ajustement des seuils de confiance. Professional services : Équipe de 15 consultants pour développements spécifiques, estimation gratuite pour projets custom, IP partagée ou dédiée selon accord. Exemples réalisés : Client bancaire - modèle de détection de fraude spécialisé (4 semaines), client retail - intégration legacy ERP (2 semaines). Garantie : Customizations maintenus lors des upgrades, pas de lock-in technologique.`
  },
  {
    id: 'syn-response-007',
    title: 'RFP Response - Training & Change Management',
    category: 'past_response',
    text: `Question : Comment assurez-vous l'adoption par nos équipes ? Réponse gagnante : Programme complet de change management et training : Pre-launch : Identification des champions internes, communication plan personnalisé, création de matériel de formation dans votre contexte. Formation structurée : Administrateurs (2 jours sur site), power users (1 jour), end users (4h webinaire + e-learning), certifications disponibles. Matériel fourni : Guides utilisateurs personnalisés, vidéos tutoriels, quick reference cards, sandbox pour pratique illimitée. Adoption tracking : Métriques d'utilisation par département, identification des utilisateurs nécessitant support additionnel, gamification pour encourager usage. Support continu : Office hours hebdomadaires (3 premiers mois), help desk en français, base de connaissances enrichie en continu. Résultats typiques : 85% taux d'adoption à 3 mois, 95% à 6 mois. Cas client : Banque Nationale - 1200 utilisateurs formés, 92% satisfaction formation.`
  },
  {
    id: 'syn-response-008',
    title: 'RFP Response - Disaster Recovery & Business Continuity',
    category: 'past_response',
    text: `Question : Quelle est votre stratégie de disaster recovery ? Réponse gagnante : Plan de continuité robuste testé trimestriellement : Architecture resiliente : Déploiement multi-région (primaire + failover), réplication synchrone des données critiques, détection automatique de pannes avec failover en < 5 minutes. Objectifs garantis : RTO (Recovery Time Objective) : 4 heures maximum, RPO (Recovery Point Objective) : 15 minutes maximum, 99.95% uptime SLA avec crédits si non-respect. Backups : Snapshots automatiques toutes les 6h, backups complets quotidiens, retention 30 jours (configurable jusqu'à 7 ans), stockage géographiquement distribué. Tests réguliers : Disaster recovery drill trimestriel, rapports fournis au client, amélioration continue basée sur résultats. Incidents historiques : 1 incident majeur en 5 ans (panne AWS us-east-1, 2020), failover réussi en 3min, zéro perte de données. Documentation : Runbook complet, plan de communication d'incident, coordination avec votre équipe IT.`
  },
  {
    id: 'syn-response-009',
    title: 'RFP Response - Regulatory Compliance',
    category: 'past_response',
    text: `Question : Comment gérez-vous la conformité réglementaire dans notre industrie (santé) ? Réponse gagnante : Expertise approfondie en conformité healthcare : Certifications santé : HIPAA compliant (audité annuellement), certification Inforoute Santé du Canada, conforme à la Loi sur la protection des renseignements personnels sur la santé (LPRPS). Mesures spécifiques : PHI (Protected Health Information) encryption bout-en-bout, audit logs détaillés de tous les accès aux données sensibles, BAA (Business Associate Agreement) fourni, retention policies configurables selon réglementations, anonymisation automatique pour analytics. Experience : 30+ clients dans secteur santé (hôpitaux, pharma, assureurs), références vérifiables disponibles. Support compliance : Équipe légale spécialisée, documentation de conformité fournie pour vos audits, assistance lors d'audits réglementaires, veille réglementaire avec updates proactives. AI ethics : Comité d'éthique IA interne, biais testing systématique, explicabilité des décisions IA pour contextes médicaux. Garantie : Indemnisation en cas de non-conformité prouvée de notre part.`
  },
  {
    id: 'syn-response-010',
    title: 'RFP Response - Integration with Existing Systems',
    category: 'past_response',
    text: `Question : Comment s'intègre votre solution avec notre stack technique existant (Salesforce, SAP, legacy databases) ? Réponse gagnante : Intégration transparente avec vos systèmes : Salesforce : Connecteur natif certifié, synchronisation bidirectionnelle en temps réel, enrichissement automatique de leads/contacts avec insights IA, embedding dans layouts Salesforce. SAP : Intégration via SAP Gateway (OData), support SAP HANA, extraction de données ERP pour analytics, workflows automatisés (ex: P2P, O2C). Legacy databases : Connecteurs JDBC/ODBC pour tout DB relationnel, support mainframe via MQ Series, API de migration pour modernisation progressive, pas besoin de rip-and-replace. Méthodologie : Assessment technique gratuit (1 semaine), POC d'intégration (2-3 semaines), architecture review avec vos équipes IT, intégration par phases pour minimiser risques. Expérience similaire : Client manufacturier - intégration AS/400 legacy + Salesforce + SAP réussie (8 semaines). Support : Architecte solutions dédié, documentation d'intégration complète.`
  },

  // ============ COMPETITIVE INTELLIGENCE / BATTLECARDS (10 docs) ============
  {
    id: 'syn-battle-001',
    title: 'Competitive Battlecard - vs. DataRobot',
    category: 'battlecard',
    text: `COMPÉTITEUR : DataRobot. FORCES : Plateforme AutoML mature, forte présence en Fortune 500, excellent pour data scientists. FAIBLESSES : Très cher (50K$/mois+ minimum), complexité élevée (courbe d'apprentissage), focus data scientists vs business users, moins fort sur NLP/NLU. NOTRE DIFFÉRENCIATION : 3x moins cher, no-code/low-code accessible aux business users, NLP de pointe avec GPT-4o/Claude, déploiement plus rapide (8 semaines vs 6 mois), support en français. OBJECTION FRÉQUENTE : "DataRobot est le leader Gartner". RÉPONSE : DataRobot excelle pour modèles ML tabulaires classiques, mais nous surpassons sur NLP moderne, chatbots, et document intelligence. Nos clients comme Pharmavie ont switché de DataRobot et gagné 60% en productivité. DEAL RÉCENT : Gagné contre DataRobot chez Retail Plus - critères décisifs : facilité d'utilisation, time-to-value, support français.`
  },
  {
    id: 'syn-battle-002',
    title: 'Competitive Battlecard - vs. H2O.ai',
    category: 'battlecard',
    text: `COMPÉTITEUR : H2O.ai. FORCES : Open source (version gratuite), forte communauté, excellent pour AutoML, pricing agressif. FAIBLESSES : Support limité en version gratuite, features enterprise manquantes (SSO, RBAC), faible sur vision AI et NLP conversationnel, UI moins intuitive. NOTRE DIFFÉRENCIATION : Enterprise-ready dès le départ (SSO, audit logs, SLA), vision AI et NLP de pointe, UI moderne no-code, support 24/7 en français, intégrations natives (Salesforce, SAP). POSITIONNEMENT PRIX : Notre Starter (2500$) vs leur Cloud (3000$), mais plus de valeur. OBJECTION : "On peut utiliser la version open source gratuite". RÉPONSE : Version gratuite OK pour POCs, mais en production vous aurez besoin de : support, sécurité enterprise, scalabilité, intégrations. Coût caché de l'open source : temps DevOps, maintenance, sécurité. DEAL RÉCENT : Gagné contre H2O.ai chez compagnie d'assurance - critères : conformité, support, rapidité de déploiement.`
  },
  {
    id: 'syn-battle-003',
    title: 'Competitive Battlecard - vs. Google Cloud AI Platform',
    category: 'battlecard',
    text: `COMPÉTITEUR : Google Cloud AI Platform (Vertex AI). FORCES : Infrastructure Google, intégration GCP native, AutoML Vision/NLP, pricing pay-as-you-go, modèles Google (PaLM, Gemini). FAIBLESSES : Lock-in GCP, complexité technique (pour data scientists), moins de features business (pas de workflow builder no-code), support standard payant et lent. NOTRE DIFFÉRENCIATION : Multi-cloud (AWS, GCP, Azure, on-premise), no-code accessible aux business users, support humain inclus 24/7, déploiement clé-en-main vs DIY, intégrations business pré-construites. POSITIONNEMENT : Google = infrastructure, TechVision = solution complète business-ready. OBJECTION : "On est déjà sur GCP, c'est plus simple". RÉPONSE : Vertex AI excellent pour équipes ML/DevOps avancées, mais si vous voulez rapidité, no-code, et support business, nous sommes complémentaires. Plusieurs clients utilisent Vertex AI + TechVision. DEAL RÉCENT : Co-selling avec Google chez client bancaire - Google infra, nous applications.`
  },
  {
    id: 'syn-battle-004',
    title: 'Competitive Battlecard - vs. IBM Watson',
    category: 'battlecard',
    text: `COMPÉTITEUR : IBM Watson. FORCES : Marque reconnue, présence Fortune 100, forte en secteur réglementé (santé, finance), solutions verticales. FAIBLESSES : Perception "legacy/lent", technologie parfois datée, très cher, vendor lock-in IBM, implémentations longues (9-12 mois). NOTRE DIFFÉRENCIATION : Technologies modernes (GPT-4o, Claude 3.5), 3x plus rapide à implémenter, 40% moins cher, architecture moderne cloud-native, no-code accessible, agile et innovant. POSITIONNEMENT : IBM = conglomérat, nous = spécialiste IA agile. OBJECTION : "Watson est plus sûr pour entreprise". RÉPONSE : Watson excellent pour très grandes entreprises avec budgets élevés et timelines longues. Pour vous, time-to-market et agilité sont critiques. Nos certifications (SOC2, ISO 27001) équivalentes. 12 clients ont migré de Watson vers nous. DEAL RÉCENT : Gagné contre Watson chez Pharmavie - critères : rapidité (3 mois vs 9), innovation (GPT-4o), prix (60% moins cher), support réactif.`
  },
  {
    id: 'syn-battle-005',
    title: 'Competitive Battlecard - vs. Microsoft Azure AI',
    category: 'battlecard',
    text: `COMPÉTITEUR : Microsoft Azure AI (Cognitive Services). FORCES : Intégration Microsoft 365, Azure, infrastructure globale, OpenAI partnership (GPT models), enterprise reach. FAIBLESSES : Lock-in Azure, complexité technique, moins de features no-code business, support standard lent et coûteux, documentation technique vs business. NOTRE DIFFÉRENCIATION : Multi-cloud + on-premise, no-code pour business users, support premium inclus 24/7, verticalisé par industrie, fine-tuning inclus, CSM dédié, documentation business en français. POSITIONNEMENT : Azure = building blocks, TechVision = solution packagée métier. OBJECTION : "On a déjà Azure, pourquoi ajouter une couche ?". RÉPONSE : Azure excellent pour DevOps avancés, mais si vous voulez time-to-value rapide sans expertise ML, nous accélérons 10x. Pensez à nous comme "Azure pre-configured + support business". Compatible Azure (70% de nos clients sur Azure). DEAL RÉCENT : Gagné chez Banque Nationale - Azure infra + TechVision apps = best of both worlds.`
  },
  {
    id: 'syn-battle-006',
    title: 'Competitive Battlecard - vs. AWS SageMaker',
    category: 'battlecard',
    text: `COMPÉTITEUR : AWS SageMaker. FORCES : Infrastructure AWS dominante, intégration native AWS services, ML Ops mature, pricing flexible, large ecosystem. FAIBLESSES : Complexité technique élevée, courbe d'apprentissage, pour data scientists/ML engineers, pas de solution no-code business, support AWS standard lent. NOTRE DIFFÉRENCIATION : Business-friendly no-code, support humain 24/7, déploiement 5x plus rapide, verticalisé par use case, fine-tuning guidé, CSM dédié. Compatible AWS (80% clients AWS). POSITIONNEMENT : SageMaker = ML platform, TechVision = business AI solution. Complémentaires. OBJECTION : "SageMaker fait la même chose". RÉPONSE : SageMaker puissant pour équipes ML qui veulent construire from scratch. TechVision pour business teams qui veulent solutions ready-to-use. Comparaison : SageMaker 6 mois + 2 ML engineers vs nous 2 mois clé-en-main. DEAL RÉCENT : Client retail - SageMaker pour modèles custom, TechVision pour chatbots/NLP/OCR - cohabitation parfaite.`
  },
  {
    id: 'syn-battle-007',
    title: 'Competitive Battlecard - vs. UiPath (avec AI capabilities)',
    category: 'battlecard',
    text: `COMPÉTITEUR : UiPath (RPA + Document Understanding AI). FORCES : Leader RPA, forte adoption enterprise, excellent pour automatisation de tâches répétitives, marketplace de bots. FAIBLESSES : Focus RPA vs IA générative, AI limité à documents/OCR, coûteux (licensing + bots), complexité pour développeurs RPA. NOTRE DIFFÉRENCIATION : IA générative de pointe (GPT-4o), NLP conversationnel avancé, analytics prédictifs, plus large que documents, no-code vs RPA developers, pricing transparent. POSITIONNEMENT : UiPath = RPA + basic AI, TechVision = AI-first avec automation. OBJECTION : "On a déjà UiPath déployé". RÉPONSE : Excellent ! UiPath parfait pour automatisations process. Nous sommes complémentaires pour : chatbots intelligents, prédictions ML, analyse de sentiment, génération de contenu. Plusieurs clients UiPath + TechVision. Intégration native disponible. DEAL RÉCENT : Co-existe chez client bancaire - UiPath pour back-office RPA, nous pour customer-facing AI + analytics.`
  },
  {
    id: 'syn-battle-008',
    title: 'Competitive Battlecard - vs. Automation Anywhere (avec IQ Bot)',
    category: 'battlecard',
    text: `COMPÉTITEUR : Automation Anywhere (IQ Bot pour document AI). FORCES : RPA établi, IQ Bot pour OCR/documents, cloud-native, bot store. FAIBLESSES : AI limité à extraction documentaire, pas de NLP conversationnel avancé, coûteux, complexité RPA. NOTRE DIFFÉRENCIATION : Scope IA plus large (NLP, vision, prédiction, génération), technologies modernes (GPT-4o, Claude), no-code vs developpeurs RPA, pricing linéaire, support 24/7. POSITIONNEMENT : AA = RPA avec AI add-on, TechVision = AI platform complète. OBJECTION : "IQ Bot gère nos documents". RÉPONSE : IQ Bot bon pour extraction structurée, mais limité pour : conversations intelligentes, analyse de sentiment, génération de contenu, prédictions, vision avancée. Nous couvrons ces gaps. Intégration AA possible. DEAL RÉCENT : Displacement chez compagnie d'assurance - AA trop cher et limité en AI, migration vers TechVision = économies 40% + capacités IA 10x plus larges.`
  },
  {
    id: 'syn-battle-009',
    title: 'Competitive Battlecard - vs. OpenAI API (direct)',
    category: 'battlecard',
    text: `COMPÉTITEUR : OpenAI API (usage direct). FORCES : Meilleurs modèles LLM (GPT-4o), pricing pay-per-token attractif pour petits volumes, flexibilité maximale, innovation rapide. FAIBLESSES : Pas de solution packagée (DIY), pas de UI/UX, pas de workflows, sécurité/compliance à gérer, pas de support business, scalabilité à gérer soi-même. NOTRE DIFFÉRENCIATION : Solution complète (UI + workflows + intégrations + security), multi-modèles (GPT-4o + Claude + Llama), enterprise-ready (SSO, RBAC, audit), support 24/7, no-code, fine-tuning guidé, analytics. POSITIONNEMENT : OpenAI API = composant, TechVision = solution complète business. OBJECTION : "OpenAI direct moins cher". RÉPONSE : Pour POC oui, mais en production vous devez construire : UI, auth, workflows, monitoring, scaling, compliance, support. TechVision = OpenAI + tout ça clé-en-main. TCO 18 mois : direct = 250K$ (dev+ops), nous = 180K$ tout inclus. DEAL RÉCENT : Client passé d'API direct à nous après 6 mois - coût caché dev + ops trop élevé.`
  },
  {
    id: 'syn-battle-010',
    title: 'Competitive Battlecard - vs. Anthropic Claude (direct)',
    category: 'battlecard',
    text: `COMPÉTITEUR : Anthropic Claude API (usage direct). FORCES : Excellent modèle (Claude 3.5 Sonnet), contexte 200K tokens, éthique IA, bon pricing, API propre. FAIBLESSES : API seulement (pas de plateforme), moins de modèles disponibles (1 famille), pas de vision AI, DIY complet, pas de features enterprise packagées. NOTRE DIFFÉRENCIATION : Plateforme complète avec Claude + GPT-4o + autres, vision AI incluse, workflows no-code, enterprise features (SSO, RBAC), support business, fine-tuning guidé, intégrations CRM/ERP. POSITIONNEMENT : Claude API = moteur LLM, TechVision = plateforme IA complète (avec Claude dedans). OBJECTION : "Claude API suffit pour nos besoins". RÉPONSE : Claude excellent comme moteur, mais en production enterprise vous avez besoin de : UI, sécurité, workflows, analytics, intégrations, support. Nous utilisons Claude en backend + couche enterprise. Vous profitez de Claude sans construire tout le reste. DEAL RÉCENT : Client Fortune 500 - évalué Claude direct vs TechVision, choisi nous pour time-to-market (3 mois vs 12) et compliance ready.`
  },

  // ============ INDUSTRY INSIGHTS (5 docs) ============
  {
    id: 'syn-industry-001',
    title: 'AI Market Trends 2025 - Enterprise Adoption',
    category: 'industry_insight',
    text: `Tendances majeures du marché IA enterprise en 2025 : 1) Généralisation des LLMs : 78% des entreprises Fortune 500 ont déployé ou pilotent des LLMs (GPT, Claude), croissance 300% vs 2023. 2) AI Governance montante : 65% des entreprises créent des comités d'éthique IA, budget compliance IA +45% YoY. 3) Multimodal AI : Adoption de vision + texte + audio pour use cases avancés (support, analyse qualité). 4) Edge AI : 40% des déploiements incluent edge computing pour latence et privacy. 5) Consolidation des vendors : Grandes entreprises préfèrent platforms intégrées vs point solutions. Budgets IA : Médiane 2.5M$ pour mid-market, 15M$ pour enterprise. ROI attendu : 250% sur 24 mois. Top use cases : Support client (68%), automatisation processus (62%), analytics prédictif (55%). Barrières : Manque de talents (71%), concerns sécurité (58%), intégration legacy (52%). Source : Gartner, IDC, enquête TechVision 2025.`
  },
  {
    id: 'syn-industry-002',
    title: 'Competitive Intelligence Platforms Market - 2025 Analysis',
    category: 'industry_insight',
    text: `Analyse du marché des plateformes de Competitive Intelligence (CI) en 2025 : Taille du marché : 2.8B$ en 2024, projeté 5.1B$ en 2028 (CAGR 16%). Leaders : Crayon (35% market share), Klue (28%), Kompyte (12%), autres (25%). Tendances : 1) AI-powered intelligence : 85% des plateformes intègrent maintenant du NLP pour automatiser data collection, 2) Win/Loss analysis : Feature #1 demandée (68% buyers), 3) Intégration CRM native : Must-have pour adoption sales, 4) Real-time alerts : Shift de rapports mensuels vers notifications instantanées. Buyers typiques : VP Sales (45%), CI Directors (30%), Product Marketing (15%), C-level (10%). Budget moyen : 45K$/an pour mid-market, 150K$/an pour enterprise. Critères de sélection : Facilité d'utilisation (82%), qualité des insights (78%), intégrations (71%), support (68%), pricing (59%). Churn reasons : Manque d'adoption interne (45%), insights pas actionnables (32%), trop complexe (23%).`
  },
  {
    id: 'syn-industry-003',
    title: 'RFP Automation & AI-Powered Response Generation',
    category: 'industry_insight',
    text: `Tendances en automatisation de RFPs et génération de réponses par IA (2025) : Problématique : Entreprises B2B reçoivent moyenne 45 RFPs/an, chacun requiert 60-120 heures de travail, taux de succès seulement 18% (temps gaspillé). Solution émergente : Plateformes d'automatisation RFP utilisant RAG (Retrieval Augmented Generation) avec LLMs pour générer réponses contextuelles. Adoption : 34% des enterprises B2B pilotent des solutions RFP automation, 12% en production. Bénéfices mesurés : Réduction 65% du temps de réponse, augmentation 28% du taux de soumission (moins d'opportunités ratées), amélioration 15% du win rate (réponses plus consistantes et complètes), ROI moyen 420% sur 18 mois. Vendors : RFPIO (leader legacy), Loopio, Qvidian (acquis par Upland), nouvelles solutions AI-native émergent. Technologies clés : RAG avec embeddings, GPT-4o pour génération, knowledge graphs pour contexte organisationnel. Défis : Quality control des réponses générées, personnalisation par prospect, intégration avec CRM/CPQ.`
  },
  {
    id: 'syn-industry-004',
    title: 'Conversational AI & Chatbot Market Evolution',
    category: 'industry_insight',
    text: `Évolution du marché des chatbots et IA conversationnelle (2024-2025) : Marché : 10.5B$ en 2024, projection 32B$ en 2028 (CAGR 25%). Transition majeure : Shift de chatbots rule-based vers LLM-powered conversational AI (GPT-4o, Claude). Adoption : 87% des entreprises B2C utilisent chatbots, 62% des B2B. Canaux dominants : Site web (78%), WhatsApp Business (45%), Facebook Messenger (38%), Slack/Teams (32% B2B). Use cases #1 : Support client (92% adoption), qualification leads (58%), FAQ (87%), réservations/transactions (34%). Métriques de succès : Taux de résolution automatique médiane 68% (top performers 85%), satisfaction utilisateur 4.2/5, réduction coût par interaction 70% vs humain. Technologies : NLU avancé avec LLMs, sentiment analysis temps réel, multilingue (50+ langues), intégration CRM/ticketing, analytics conversationnel. Défis : Handoff fluide vers humains, personnalisation, gestion des edge cases, hallucinations LLM. Vendors : Intercom, Drift (B2B), ManyChat (B2C), nouvelles solutions GPT-native.`
  },
  {
    id: 'syn-industry-005',
    title: 'Document Intelligence & IDP Market Landscape',
    category: 'industry_insight',
    text: `Marché de l'Intelligent Document Processing (IDP) et Document Intelligence en 2025 : Taille marché : 2.1B$ en 2024, projeté 8.4B$ en 2029 (CAGR 32%). Drivers : Transformation digitale, remote work (besoin de paperless), AI advances (OCR → NLP extraction). Technologies : OCR nouvelle génération (manuscrit + imprimé, 99%+ précision), NLP pour extraction contextuelle (vs règles fixes), computer vision pour layouts complexes, LLMs pour compréhension sémantique. Use cases majeurs : Factures (78% adoption), contrats (62%), formulaires (71%), documents d'identité (54%), rapports médicaux (38%). ROI typique : Réduction 80% du temps de traitement manuel, diminution 90% des erreurs, payback 8-12 mois. Leaders : ABBYY (legacy OCR), Rossum (AI-native), UiPath Document Understanding, Google Document AI, AWS Textract. Tendances : Shift vers end-to-end solutions (extraction + validation + intégration), multi-modal (texte + tables + images), compliance-ready (audit trails). Secteurs adoptants : Finance/banque (82%), assurance (76%), santé (68%), gouvernement (59%), légal (54%).`
  },
];

/**
 * Generate embedding for a text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Upload documents to Pinecone
 */
async function uploadToPinecone() {
  console.log('🚀 Starting synthetic data generation for Pinecone...\n');

  // Get Pinecone index
  const index = pinecone.index(INDEX_NAME);

  // Process documents in batches of 10
  const BATCH_SIZE = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < syntheticDocuments.length; i += BATCH_SIZE) {
    const batch = syntheticDocuments.slice(i, i + BATCH_SIZE);

    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(syntheticDocuments.length / BATCH_SIZE)}...`);

    try {
      // Generate embeddings for batch
      const vectors = await Promise.all(
        batch.map(async (doc) => {
          console.log(`  - Generating embedding for: ${doc.title}`);
          const embedding = await generateEmbedding(doc.text);

          return {
            id: doc.id,
            values: embedding,
            metadata: {
              title: doc.title,
              category: doc.category,
              text: doc.text.substring(0, 40000), // Pinecone metadata limit
              synthetic: true, // Flag for easy cleanup
              created_at: new Date().toISOString(),
              ...doc.metadata,
            },
          };
        })
      );

      // Upload to Pinecone
      await index.namespace(NAMESPACE).upsert(vectors);

      successCount += vectors.length;
      console.log(`  ✅ Uploaded ${vectors.length} documents to Pinecone`);

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < syntheticDocuments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      errorCount += batch.length;
      console.error(`  ❌ Error processing batch:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully uploaded: ${successCount} documents`);
  console.log(`❌ Failed: ${errorCount} documents`);
  console.log(`📂 Index: ${INDEX_NAME}`);
  console.log(`📁 Namespace: ${NAMESPACE}`);
  console.log('='.repeat(60));

  // Category breakdown
  console.log('\n📈 Documents by category:');
  const categoryCounts = syntheticDocuments.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`  - ${category}: ${count} documents`);
  });
}

/**
 * Test RAG retrieval with a sample query
 */
async function testRetrieval() {
  console.log('\n🔍 Testing RAG retrieval...\n');

  const testQuery = "Quelles sont les certifications de sécurité de TechVision AI ?";
  console.log(`Query: "${testQuery}"\n`);

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(testQuery);

    // Search Pinecone
    const index = pinecone.index(INDEX_NAME);
    const results = await index.namespace(NAMESPACE).query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
      filter: { synthetic: { $eq: true } }, // Only synthetic docs
    });

    console.log(`Found ${results.matches.length} relevant documents:\n`);

    results.matches.forEach((match, idx) => {
      console.log(`${idx + 1}. [Score: ${match.score?.toFixed(4)}] ${match.metadata?.title}`);
      console.log(`   Category: ${match.metadata?.category}`);
      console.log(`   Preview: ${(match.metadata?.text as string)?.substring(0, 150)}...`);
      console.log('');
    });

    console.log('✅ RAG retrieval test successful!\n');
  } catch (error) {
    console.error('❌ Error testing retrieval:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment');
    }

    console.log('🔧 Configuration:');
    console.log(`  - OpenAI Model: text-embedding-3-small`);
    console.log(`  - Pinecone Index: ${INDEX_NAME}`);
    console.log(`  - Namespace: ${NAMESPACE}`);
    console.log(`  - Total documents: ${syntheticDocuments.length}`);
    console.log('');

    // Upload documents
    await uploadToPinecone();

    // Test retrieval
    await testRetrieval();

    console.log('🎉 Synthetic data seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Verify data in Pinecone console');
    console.log('  2. Implement RAG generation API endpoint');
    console.log('  3. Test with real RFP questions');
    console.log('\n🧹 To cleanup synthetic data later, filter by: { synthetic: true }');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { syntheticDocuments, generateEmbedding, uploadToPinecone, testRetrieval };
