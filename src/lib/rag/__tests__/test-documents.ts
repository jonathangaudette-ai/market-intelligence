/**
 * Mock document data for testing intelligent analysis
 */

export const MOCK_DOCUMENTS = {
  // ============================================================================
  // 1. Contrat SaaS
  // ============================================================================
  contract_saas: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCLAIMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This document is confidential and proprietary to Acme Corp.
All rights reserved. © 2024 Acme Corp.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLE OF CONTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Agreement Overview .............. 3
2. Pricing and Payment Terms ....... 5
3. Service Level Agreement ......... 7
4. Term and Termination ............ 9

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOFTWARE AS A SERVICE AGREEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This Software as a Service Agreement ("Agreement") is entered into as of
January 1, 2024 ("Effective Date") by and between:

PROVIDER: TechVendor Inc., a Delaware corporation
CUSTOMER: Enterprise Corp, a California corporation

1. SERVICES

Provider shall provide Customer with access to the CloudPlatform SaaS
solution, including all modules and features as described in Exhibit A.

2. PRICING AND PAYMENT TERMS

2.1 Subscription Fee
Customer shall pay Provider a monthly subscription fee of $2,499 per month
("Subscription Fee") for up to 100 users.

2.2 Payment Terms
- Payment due: Net 30 days from invoice date
- Payment method: ACH or wire transfer
- Currency: USD

2.3 Price Increases
Provider may increase the Subscription Fee upon 60 days written notice,
but not more than once per calendar year and not to exceed 5% per increase.

3. SERVICE LEVEL AGREEMENT (SLA)

3.1 Uptime Guarantee
Provider guarantees 99.9% uptime, measured monthly.

3.2 Support
- Business Hours Support: Monday-Friday, 9am-5pm EST
- Response Time: 4 hours for Priority 1 issues
- Support Channel: Email and phone

3.3 Credits for Downtime
If uptime falls below 99.9%, Customer shall receive service credits:
- 99.0% - 99.8%: 10% monthly fee credit
- 95.0% - 98.9%: 25% monthly fee credit
- Below 95.0%: 50% monthly fee credit

4. TERM AND TERMINATION

4.1 Initial Term
This Agreement shall commence on the Effective Date and continue for an
initial term of twelve (12) months ("Initial Term").

4.2 Renewal
Upon expiration of the Initial Term, this Agreement shall automatically
renew for successive twelve (12) month periods unless either party provides
written notice of non-renewal at least thirty (30) days prior to the end
of the then-current term.

4.3 Termination for Cause
Either party may terminate this Agreement for cause upon thirty (30) days
written notice if the other party materially breaches this Agreement and
fails to cure such breach within the notice period.

4.4 Effect of Termination
Upon termination, Customer shall have 30 days to export all data from the
platform. Provider shall delete all Customer data within 90 days of
termination.

5. CONFIDENTIALITY

Both parties agree to maintain the confidentiality of all Confidential
Information disclosed during the term of this Agreement for a period of
three (3) years following termination.

6. DATA SECURITY

Provider shall maintain industry-standard security measures including:
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- SOC 2 Type II compliance
- Annual penetration testing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXHIBIT A: Service Specifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Technical specifications...]
`,

  // ============================================================================
  // 2. Appel d'offres (RFP)
  // ============================================================================
  rfp_government: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUEST FOR PROPOSAL (RFP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RFP Number: GOV-2024-CRM-001
Issue Date: October 1, 2024
Submission Deadline: December 15, 2024, 5:00 PM EST

Issuing Agency: Department of Commerce
Project Name: Enterprise CRM System Modernization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROJECT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Department of Commerce seeks proposals from qualified vendors to
provide a cloud-based Customer Relationship Management (CRM) system to
support 10,000 users across 50 offices nationwide.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. SCOPE OF WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Required Capabilities
The solution must provide:

- Contact and Account Management for 10,000+ concurrent users
- Case Management and Ticketing System
- Reporting and Analytics Dashboard
- Mobile Access (iOS and Android)
- Integration with existing systems (SAP, SharePoint)
- Multi-language support (English, Spanish)
- Advanced Search and Filtering
- Workflow Automation
- Document Management
- Email Integration

2.2 Technical Requirements
- Cloud-native architecture (AWS, Azure, or GCP)
- 99.9% uptime SLA
- SOC 2 Type II compliance
- FedRAMP Moderate authorization
- AES-256 encryption
- Role-based access control (RBAC)
- Single Sign-On (SSO) via SAML 2.0
- API access for integrations

2.3 Implementation Requirements
- Complete implementation within 6 months
- Data migration from legacy system
- User training for 10,000 users
- Documentation (admin, user, technical)
- 12 months of post-launch support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. BUDGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estimated Budget Range: $2,000,000 - $5,000,000 over 5 years

This includes:
- Initial implementation and licensing
- Annual subscription fees
- Support and maintenance
- Training and documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. EVALUATION CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proposals will be evaluated based on the following weighted criteria:

1. Technical Capability (40%)
   - Compliance with functional requirements
   - System architecture and scalability
   - Security and compliance certifications
   - Integration capabilities

2. Cost (30%)
   - Total cost of ownership (TCO)
   - Pricing model transparency
   - Value for money

3. Vendor Experience (20%)
   - Relevant government project experience
   - Customer references
   - Company financial stability
   - Team qualifications

4. Implementation Plan (10%)
   - Project timeline and milestones
   - Risk mitigation strategies
   - Training approach
   - Change management plan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. SUBMISSION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 Proposal Format
All proposals must include:
- Executive Summary (max 2 pages)
- Technical Proposal (max 30 pages)
- Cost Proposal (separate sealed envelope)
- Company Information and References

5.2 Deadline
Proposals must be received by December 15, 2024, 5:00 PM EST.
Late submissions will not be accepted.

5.3 Questions
Questions must be submitted by November 15, 2024 via email to
procurement@commerce.gov

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. SELECTION TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- RFP Issue Date: October 1, 2024
- Questions Deadline: November 15, 2024
- Proposal Deadline: December 15, 2024
- Vendor Presentations: January 15-31, 2025
- Award Notification: February 28, 2025
- Contract Start: April 1, 2025
`,

  // ============================================================================
  // 3. Rapport concurrentiel avec signaux
  // ============================================================================
  competitive_report_q4: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIDENTIAL - INTERNAL USE ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q4 2024 COMPETITIVE INTELLIGENCE REPORT
SaaS Analytics Market
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prepared by: Competitive Intelligence Team
Date: December 1, 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q4 2024 saw significant competitive activity in the SaaS analytics market,
with three major developments impacting our strategic position:

1. **Competitor X** launched AI-powered predictive analytics platform
   - New pricing: $149/month (down from $199/month, 25% reduction)
   - Heavy investment in AI/ML engineering (8 new hires)
   - Direct threat to our mid-market segment

2. **Competitor Y** secured $50M Series C funding
   - Expanding into enterprise segment
   - Aggressive hiring across sales and engineering (15 positions)
   - Partnership with Microsoft Azure announced

3. **Competitor Z** released major product update
   - Real-time analytics dashboard
   - Free tier launched to compete on acquisition
   - Customer migration concerns in shared accounts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPETITOR X: DETAILED ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Company Overview:
- Founded: 2019
- Headquarters: San Francisco, CA
- Employees: ~200 (up from 150 in Q3)
- Funding: $30M Series B (June 2024)

Product Launch: AI Analytics Pro
Released: November 15, 2024

Key Features:
- Predictive analytics using GPT-4 integration
- Natural language query interface
- Automated insight generation
- Custom ML model training
- Real-time data processing

Pricing Strategy:
PREVIOUS: $199/month for Professional tier
NEW: $149/month for Professional tier (25% price cut)
       $299/month for Enterprise tier (new)

This aggressive pricing move is clearly aimed at our customer base,
particularly in the 50-500 employee SMB segment.

Hiring Activity (Q4 2024):
Analysis of LinkedIn job postings reveals significant expansion:

Engineering:
- 3 Senior Machine Learning Engineers
- 2 AI Research Scientists
- 1 Staff Data Engineer
- 1 Principal Software Architect

Sales & Marketing:
- 1 VP of Enterprise Sales (hired from Salesforce)

Total: 8 new positions in Q4 alone, representing 40% increase in
engineering headcount.

Strategic Assessment:
This combination of aggressive pricing, AI investment, and talent
acquisition suggests Competitor X is preparing for major market push
in Q1 2025. We should expect:
- Increased competitive pressure on renewals
- Feature parity challenges in AI capabilities
- Price pressure across mid-market segment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPETITOR Y: FUNDING AND EXPANSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Series C Announcement: October 2024
Amount: $50M
Lead Investor: Sequoia Capital
Valuation: $400M (post-money)

Use of Funds (per investor deck):
- 40% Product development
- 35% Go-to-market expansion
- 15% Strategic partnerships
- 10% Operations

Hiring Blitz:
15 open positions across:
- Sales (6): Enterprise AEs, SDRs
- Engineering (7): Backend, Frontend, DevOps
- Product (2): Senior PMs

Microsoft Azure Partnership:
Announced: November 1, 2024
- Native Azure Marketplace listing
- Azure consumption credits for customers
- Co-selling agreement with Microsoft
- Integration with Power BI

Impact Assessment:
This funding and partnership significantly strengthen Competitor Y's
position in enterprise segment. Microsoft relationship provides:
- Credibility with enterprise buyers
- Access to existing Azure customer base
- Simplified procurement for large orgs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKET TRENDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Market Growth:
The SaaS analytics market is growing at 28% CAGR, reaching $15B in 2024.

Key Trends:
1. AI/ML Integration (75% of vendors)
2. Real-time Analytics (60% of vendors)
3. Embedded Analytics (45% of vendors)
4. Usage-based Pricing (30% of vendors, up from 15% in 2023)

Pricing Pressure:
Average price per user decreased 12% year-over-year as competition
intensifies and vendors compete on acquisition.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGIC RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Accelerate AI Feature Development
   Timeline: Q1 2025
   Priority: HIGH

2. Review Pricing Strategy
   Consider competitive response to Competitor X pricing
   Timeline: December 2024
   Priority: HIGH

3. Strengthen Enterprise Positioning
   Counter Competitor Y's Microsoft partnership
   Timeline: Q1 2025
   Priority: MEDIUM

4. Monitor Hiring Patterns
   Track competitor talent acquisition as leading indicator
   Timeline: Ongoing
   Priority: MEDIUM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APPENDIX A: Competitive Feature Matrix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Feature comparison table...]
`,

  // ============================================================================
  // 4. Rapport financier
  // ============================================================================
  financial_report_q3: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHCORP INC.
Q3 2024 FINANCIAL RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For the Quarter Ended September 30, 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCIAL HIGHLIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revenue:
- Q3 2024: $125.5M
- Q3 2023: $98.2M
- Growth: +27.8% YoY

Gross Profit:
- Q3 2024: $100.4M
- Gross Margin: 80%
- Q3 2023: 78%

Operating Income:
- Q3 2024: $25.1M
- Operating Margin: 20%
- Q3 2023: 15%

Net Income:
- Q3 2024: $18.7M
- Net Margin: 15%
- Q3 2023: $8.5M
- Growth: +120% YoY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Annual Recurring Revenue (ARR):
- Q3 2024: $485M
- Q3 2023: $380M
- Growth: +27.6% YoY

Customer Count:
- Q3 2024: 8,500 customers
- Q3 2023: 6,200 customers
- Growth: +37% YoY

Net Revenue Retention (NRR):
- Q3 2024: 125%
- Q3 2023: 118%

Customer Acquisition Cost (CAC):
- Q3 2024: $12,500
- Q3 2023: $15,200
- Improvement: -18%

LTV/CAC Ratio:
- Q3 2024: 4.2x
- Q3 2023: 3.5x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVENUE BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By Customer Segment:
- Enterprise (>1000 employees): $75.3M (60%)
- Mid-Market (100-999): $37.7M (30%)
- SMB (<100): $12.5M (10%)

By Product Line:
- Core Platform: $87.9M (70%)
- AI Add-ons: $25.1M (20%)
- Professional Services: $12.5M (10%)

Geographic Distribution:
- North America: $87.9M (70%)
- Europe: $25.1M (20%)
- Asia-Pacific: $12.5M (10%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORWARD GUIDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q4 2024 Guidance:
- Revenue: $135M - $140M (30% YoY growth)
- Operating Margin: 22% - 24%
- Net New ARR: $30M - $35M

Full Year 2024 Guidance:
- Revenue: $480M - $485M
- Operating Margin: 20% - 22%
- Free Cash Flow: $75M - $80M
`,
};

// ============================================================================
// Expected analysis results for validation
// ============================================================================

export const EXPECTED_RESULTS = {
  contract_saas: {
    documentType: "contract",
    confidence_min: 0.9,
    metadata: {
      contractType: "SaaS",
      parties: ["TechVendor Inc.", "Enterprise Corp"],
      pricing: {
        model: "subscription",
        amount: "$2,499",
        currency: "USD",
      },
      terms: {
        duration: "12 months",
      },
      clauses_count_min: 3, // SLA, confidentiality, etc.
    },
    sections_excluded_min: 2, // Disclaimer, TOC
    signals_min: 0,
  },

  rfp_government: {
    documentType: "rfp",
    confidence_min: 0.9,
    metadata: {
      issuer: "Department of Commerce",
      deadline: "December 15, 2024",
      budget: {
        min: "$2,000,000",
        max: "$5,000,000",
      },
      requirements_count_min: 5,
    },
    sections_excluded_min: 0,
    signals_min: 0,
  },

  competitive_report_q4: {
    documentType: "competitive_report",
    confidence_min: 0.85,
    metadata: {
      dateRange: "Q4 2024",
      competitors: ["Competitor X", "Competitor Y", "Competitor Z"],
      competitors_count_min: 3,
      strategicThemes_count_min: 2,
      hiringData: {
        companies_count_min: 2,
        positions_count_min: 3,
      },
    },
    sections_excluded_min: 1, // Confidential disclaimer
    signals_min: 3, // Price change, hiring spike, new product
    signals_expected: [
      { type: "price_change", severity: "high" },
      { type: "hiring_spike", severity: "high" },
      { type: "new_product", severity: "high" },
    ],
  },

  financial_report_q3: {
    documentType: "financial_report",
    confidence_min: 0.9,
    metadata: {
      fiscalPeriod: "Q3 2024",
      revenue: {
        current: "$125.5M",
      },
      growthMetrics_count_min: 3,
    },
    sections_excluded_min: 0,
    signals_min: 0,
  },
};
