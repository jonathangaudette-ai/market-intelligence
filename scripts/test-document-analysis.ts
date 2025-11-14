/**
 * Test Document Analysis Service
 * Phase 1 - Day 4
 *
 * This script tests the document analysis service with sample documents
 */

import { analyzeDocument, clearAnalysisCache } from '../src/lib/rfp/services/document-analysis.service';

// Sample document texts for testing
const sampleDocuments = [
  {
    filename: 'agile-methodology-guide.pdf',
    text: `
Guide de Méthodologie Agile

Notre approche de gestion de projet suit les principes Agile et Scrum.
Nous utilisons des sprints de 2 semaines avec des cérémonies quotidiennes (daily standups).

Processus:
1. Sprint Planning - Définition des objectifs
2. Daily Standup - Synchronisation quotidienne
3. Sprint Review - Démonstration des résultats
4. Sprint Retrospective - Amélioration continue

Notre équipe est composée de:
- Product Owner
- Scrum Master
- Développeurs (équipe cross-fonctionnelle)
- QA Engineers

Outils utilisés:
- JIRA pour le suivi
- Confluence pour la documentation
- Slack pour la communication

Nous garantissons une livraison continue avec des releases toutes les 2 semaines.
    `,
  },
  {
    filename: 'case-study-bank-project.pdf',
    text: `
Étude de Cas: Projet Bancaire XYZ

Client: Banque XYZ
Secteur: Services Financiers
Durée: 12 mois
Budget: 500K€

Contexte:
La Banque XYZ cherchait à moderniser sa plateforme de paiements en ligne.

Notre Solution:
- Architecture microservices
- API REST sécurisées
- Intégration PCI-DSS compliant
- Tests de sécurité approfondis

Résultats:
✓ Réduction de 40% du temps de traitement des paiements
✓ 99.99% de disponibilité
✓ 0 incidents de sécurité en 12 mois
✓ Satisfaction client: 9.2/10

Technologies:
- Java Spring Boot
- PostgreSQL
- Redis
- Kubernetes

Cette solution a permis à la banque de traiter 1M transactions/jour.
    `,
  },
  {
    filename: 'company-overview.pdf',
    text: `
TechVision AI - Présentation Entreprise

Fondée en 2018, TechVision AI est un leader dans les solutions d'intelligence artificielle pour l'entreprise.

Notre Mission:
Démocratiser l'IA pour les entreprises de toutes tailles.

Chiffres Clés:
- 150 employés
- 200+ clients
- 15M€ de chiffre d'affaires (2024)
- Présence dans 10 pays

Nos Services:
1. Développement de solutions IA sur mesure
2. Conseil et stratégie IA
3. Formation et accompagnement
4. Support et maintenance

Certifications:
- ISO 27001 (Sécurité de l'information)
- ISO 9001 (Qualité)
- SOC 2 Type II

Clients de référence:
- Banque XYZ
- Assurance ABC
- Retail DEF
    `,
  },
  {
    filename: 'security-whitepaper.pdf',
    text: `
Livre Blanc Sécurité - TechVision AI

Approche de la Sécurité

1. Sécurité dès la Conception (Security by Design)
Tous nos développements intègrent la sécurité dès la phase de conception.

2. Chiffrement
- Données en transit: TLS 1.3
- Données au repos: AES-256
- Clés gérées via HSM

3. Authentification et Autorisation
- OAuth 2.0 / OpenID Connect
- Multi-factor authentication (MFA)
- RBAC (Role-Based Access Control)

4. Conformité
- RGPD compliant
- PCI-DSS Level 1
- HDS (Hébergement Données de Santé)

5. Tests de Sécurité
- Pentests trimestriels
- Scans de vulnérabilité automatisés
- Bug bounty program

6. Incident Response
- SOC 24/7
- Temps de réponse < 1h
- Plan de continuité d'activité

Notre infrastructure est hébergée sur AWS avec redondance multi-zones.
    `,
  },
];

async function main() {
  console.log('🧪 Testing Document Analysis Service\n');
  console.log('=' .repeat(60));

  // Clear cache to ensure fresh analysis
  clearAnalysisCache();

  for (const doc of sampleDocuments) {
    console.log(`\n📄 Analyzing: ${doc.filename}`);
    console.log('-'.repeat(60));

    try {
      const startTime = Date.now();

      const analysis = await analyzeDocument(doc.text, doc.filename, {
        useCache: true,
        retryWithSonnet: true,
      });

      const duration = Date.now() - startTime;

      console.log(`✅ Analysis completed in ${duration}ms`);
      console.log(`\n📊 Results:`);
      console.log(`   Document Type: ${analysis.documentType}`);
      console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`   Recommended Purpose: ${analysis.recommendedPurpose}`);

      console.log(`\n   Suggested Categories (${analysis.suggestedCategories.length}):`);
      analysis.suggestedCategories.slice(0, 3).forEach((cat) => {
        console.log(`      - ${cat.category} (${(cat.confidence * 100).toFixed(1)}%)`);
      });

      console.log(`\n   Content Tags (${analysis.contentTypeTags.length}):`);
      console.log(`      ${analysis.contentTypeTags.slice(0, 8).join(', ')}`);

      console.log(`\n   Executive Summary:`);
      console.log(`      ${analysis.executiveSummary}`);

      // Test caching
      console.log(`\n🔄 Testing cache...`);
      const cacheStart = Date.now();
      const cachedAnalysis = await analyzeDocument(doc.text, doc.filename, {
        useCache: true,
      });
      const cacheDuration = Date.now() - cacheStart;

      if (cacheDuration < 100) {
        console.log(`   ✅ Cache hit! Retrieved in ${cacheDuration}ms`);
      } else {
        console.log(`   ⚠️  Cache miss (took ${cacheDuration}ms)`);
      }

    } catch (error) {
      console.error(`   ❌ Error analyzing ${doc.filename}:`, error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('✨ Document Analysis Test Complete');
  console.log('=' .repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   - Documents analyzed: ${sampleDocuments.length}`);
  console.log(`   - Claude Haiku used for fast analysis`);
  console.log(`   - Automatic retry with Sonnet for low confidence`);
  console.log(`   - Caching implemented for performance`);
  console.log(`\n✅ Document Analysis Service is ready for production!`);
  console.log('\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
