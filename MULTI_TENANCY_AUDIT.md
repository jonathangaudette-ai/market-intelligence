# Multi-Company/Multi-Tenant Architecture Audit

## Executive Summary

The Market Intelligence platform has **partially implemented** multi-company/multi-tenant architecture. The foundation is solid with proper database schema and auth middleware, but there are **critical gaps** in authorization checks across RFP module API routes that could expose data between companies.

### Overall Risk Level: MEDIUM-HIGH
- Database schema: ✅ Well-designed
- Authentication: ✅ Properly implemented  
- Company-level authorization: ⚠️ Inconsistently enforced
- Data isolation: ⚠️ Has critical gaps

---

## 1. Database Schema - STRONG

### Current State
The schema correctly implements multi-company isolation:

**Key Tables with Company Scoping:**
- `rfps` → has `companyId` FK (line 334-336)
- `rfp_questions` → FK to `rfps` which has `companyId` 
- `rfp_responses` → FK to `rfp_questions` (indirectly scoped to company)
- `documents` → has `companyId` FK (line 70-72)
- `conversations` → has `companyId` FK (line 104-106)
- `signals` → has `companyId` FK (line 133-135)
- `competitors` → has `companyId` FK (line 51-53)
- `messages` → FK to `conversations` (indirectly company-scoped)

**Company Membership Table:**
- `companyMembers` junction table with role-based access (line 29-46)
- Unique constraint on userId + companyId (line 44)
- Role hierarchy: admin > editor > viewer

**File:** `/Users/jonathangaudette/market-intelligence/src/db/schema.ts`
**Status:** ✅ EXCELLENT - All data properly normalized with company context

---

## 2. Authentication & Authorization

### 2.1 Auth Configuration

**File:** `/Users/jonathangaudette/market-intelligence/src/lib/auth/config.ts`

✅ **Strengths:**
- NextAuth with JWT strategy (line 82)
- User model includes `isSuperAdmin` flag
- Session includes user id and email
- **GAP:** Session does NOT include company context (lines 9-14)

```typescript
interface Session {
  user: {
    id: string;
    isSuperAdmin: boolean;
  } & DefaultSession["user"];
}
```

### 2.2 Auth Helpers

**File:** `/Users/jonathangaudette/market-intelligence/src/lib/auth/helpers.ts`

**getCurrentCompany() function (lines 20-67):**
✅ **Strong implementation:**
- Retrieves activeCompanyId from cookie
- Verifies user is member of company via companyMembers table
- Checks company.isActive flag
- Returns company context with role

```typescript
// Lines 42-56: Verification logic
const [membership] = await db
  .select({ company: companies, role: companyMembers.role })
  .from(companyMembers)
  .innerJoin(companies, eq(companies.id, companyMembers.companyId))
  .where(and(
    eq(companyMembers.userId, session.user.id),
    eq(companyMembers.companyId, activeCompanyId),
    eq(companies.isActive, true)
  ))
```

**hasPermission() function (lines 69-77):**
✅ Implements role hierarchy correctly

### 2.3 Middleware

**File:** `/Users/jonathangaudette/market-intelligence/src/lib/auth/middleware.ts`

**requireAuth() function (lines 23-68):**
✅ **Comprehensive validation:**
1. Verifies authentication
2. Verifies company context
3. Checks role-based permissions
4. Verifies company slug if provided (line 54)

**requireDocumentAccess() function (lines 74-103):**
✅ Verifies document belongs to authenticated company (line 95)

---

## 3. API Routes Analysis

### 3.1 RFP Module Routes - CRITICAL GAPS FOUND

#### ✅ Routes with Proper Authorization

**POST /api/v1/rfp/rfps (Upload)**
- File: `/Users/jonathangaudette/market-intelligence/src/app/api/v1/rfp/rfps/route.ts`
- Line 15: Uses `requireRFPAuth()` 
- Line 100: Sets `companyId: company.id`
- ✅ Status: SECURE

**GET /api/v1/rfp/rfps (List)**
- Lines 149-152: Uses `requireRFPAuth()`
- Line 162: Filters by `eq(rfps.companyId, company.id)`
- ✅ Status: SECURE

**GET /api/v1/rfp/rfps/[id] (Detail)**
- Lines 13-14: Uses `requireRFPAuth()`
- Lines 34-39: Verifies `rfp.companyId !== company.id` → returns 403
- ✅ Status: SECURE

**GET /api/v1/rfp/rfps/[id]/questions**
- Lines 17-18: Uses `requireRFPAuth()`
- Lines 35-36: Verifies `rfp.companyId !== company.id` → returns 403
- ✅ Status: SECURE

**POST /api/v1/rfp/rfps/[id]/parse**
- Lines 50-51: Uses `requireRFPAuth()`
- Lines 68-69: Verifies `rfp.companyId !== company.id` → returns 403
- ✅ Status: SECURE

#### ⚠️ Routes with MISSING Company Verification

**POST /api/v1/rfp/questions/[id]/response (Save Response)**
- **File:** `/Users/jonathangaudette/market-intelligence/src/app/api/v1/rfp/questions/[id]/response/route.ts`
- **Lines:** 26-28: Only verifies user authentication
- **Lines:** 60-68: Gets RFP but does NOT verify company membership
- **Line 70:** TODO comment: `// TODO: Verify user is member of company (for now, skip this check)`
- ❌ **VULNERABILITY:** Any authenticated user can save responses to ANY RFP

```typescript
// Line 26: Only checks session
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Lines 60-68: Gets RFP but no company check
const [rfp] = await db.select({ id: rfps.id, companyId: rfps.companyId })
  .from(rfps)
  .where(eq(rfps.id, question.rfpId))
  .limit(1);

// Missing: Verify rfp.companyId matches user's company
```

**GET /api/v1/rfp/questions/[id]/response (Get Response)**
- **Lines:** 161-164: Only verifies user authentication
- ❌ **VULNERABILITY:** Any authenticated user can read ANY RFP response

**POST /api/v1/rfp/questions/[id]/generate-response (AI Generation)**
- **File:** `/Users/jonathangaudette/market-intelligence/src/app/api/v1/rfp/questions/[id]/generate-response/route.ts`
- **Lines:** 44-46: Only verifies user authentication
- **Line 101:** TODO comment: `// TODO: Verify user is member of company (for now, skip this check)`
- ❌ **CRITICAL VULNERABILITY:** Any authenticated user can generate AI responses for ANY RFP
- This route also calls Pinecone RAG engine - potential cross-company data leakage from knowledge bases

**POST /api/v1/rfp/rfps/[id]/enrichment (Manual Enrichment)**
- **File:** `/Users/jonathangaudette/market-intelligence/src/app/api/v1/rfp/rfps/[id]/enrichment/route.ts`
- **Lines:** 28-31: Only verifies user authentication
- **Line 57:** TODO comment: `// TODO: Verify user is member of company (for now, skip this check)`
- ❌ **VULNERABILITY:** Any authenticated user can modify RFP enrichment data across companies

**GET /api/v1/rfp/rfps/[id]/enrichment (Get Enrichment)**
- **Lines:** 101-104: Only verifies user authentication
- ❌ **VULNERABILITY:** Any authenticated user can read enrichment data from ANY RFP

**POST /api/v1/rfp/rfps/[id]/enrich-linkedin (LinkedIn Enrichment)**
- **File:** `/Users/jonathangaudette/market-intelligence/src/app/api/v1/rfp/rfps/[id]/enrich-linkedin/route.ts`
- **Lines:** 19-22: Only verifies user authentication
- **Line 39:** TODO comment: `// TODO: Verify user is member of company`
- ❌ **VULNERABILITY:** Any authenticated user can trigger LinkedIn API calls for ANY RFP

#### ✅ Properly Secured Routes (Non-RFP)

**POST /api/companies/[slug]/documents (Upload)**
- Uses `requireAuth("viewer", slug)` (line 20)
- Verifies company slug matches (line 20 parameter)
- ✅ Status: SECURE

**DELETE /api/companies/[slug]/documents/[documentId]**
- Line 2: Uses `requireAuth` helper
- Lines 31-32: Verifies company slug matches
- Lines 47-48: Verifies document belongs to company
- ✅ Status: SECURE

**POST /api/companies/[slug]/chat (Chat/RAG)**
- Line 12: Uses `requireAuth("viewer", slug)`
- Line 85: Passes company ID to RAG engine for isolation
- ✅ Status: SECURE with tenant isolation

---

## 4. Frontend/UI - MOSTLY COMPLETE

### Company Selection

**File:** `/Users/jonathangaudette/market-intelligence/src/app/(dashboard)/layout.tsx`
- **Line 64:** Shows hardcoded "Demo Company" - NOT dynamic
- Company switcher UI exists (lines 57-70) but doesn't load user's actual companies
- ⚠️ Status: PARTIAL - Skeleton exists but not fully implemented

### Company Context Provider

**File:** `/Users/jonathangaudette/market-intelligence/src/components/company-provider.tsx`
- Lines 14-21: Sets `activeCompanyId` cookie from URL slug
- Uses `/api/companies/{slug}/set-active` endpoint
- ✅ Status: WORKING - Properly sets company context

**Set Active Company Endpoint:**
**File:** `/Users/jonathangaudette/market-intelligence/src/app/api/companies/[slug]/set-active/route.ts`
- Lines 33-42: Verifies user is member of company before setting cookie
- ✅ Status: SECURE - Validates membership

---

## 5. Critical Data Isolation Gaps

### Most Vulnerable Routes

| Route | Method | Risk | Impact |
|-------|--------|------|--------|
| `/api/v1/rfp/questions/[id]/response` | POST | High | Any user can save responses to any RFP |
| `/api/v1/rfp/questions/[id]/response` | GET | High | Any user can read any RFP response |
| `/api/v1/rfp/questions/[id]/generate-response` | POST | CRITICAL | Any user can generate AI responses + RAG data leakage |
| `/api/v1/rfp/rfps/[id]/enrichment` | POST | High | Any user can modify any RFP enrichment |
| `/api/v1/rfp/rfps/[id]/enrichment` | GET | High | Any user can read any RFP enrichment |
| `/api/v1/rfp/rfps/[id]/enrich-linkedin` | POST | High | Any user can trigger API calls for any RFP |

### Cross-Company Data Leakage Scenarios

1. **User A (Company X)** → Authenticates
2. **User A** → Calls `/api/v1/rfp/questions/{question_from_company_y}/response`
3. **Result:** Can read/write Company Y's data

4. **User B (Company X)** → Calls `/api/v1/rfp/questions/{question_id}/generate-response`
5. **RAG Engine** → Returns knowledge from ALL companies (no tenant filtering)
6. **Result:** AI responses may contain Company Y's confidential information

---

## 6. Session & Cookie Security

**File:** `/Users/jonathangaudette/market-intelligence/src/app/api/companies/[slug]/set-active/route.ts`

✅ Cookie configuration (lines 50-54):
```typescript
cookieStore.set("activeCompanyId", company.id, {
  httpOnly: true,  // ✅ Not accessible via JavaScript
  secure: process.env.NODE_ENV === "production",  // ✅ HTTPS only in prod
  sameSite: "lax",  // ✅ CSRF protection
  maxAge: 60 * 60 * 24 * 30,  // ✅ 30 day expiry
});
```

---

## 7. Summary of Issues

### What's Working Well ✅
1. Database schema with proper company FK constraints
2. `getCurrentCompany()` helper validates company membership
3. `requireAuth()` middleware provides comprehensive checks
4. Company-scoped document routes properly verify ownership
5. Cookie-based company context with secure settings
6. Role-based access control (admin/editor/viewer)

### Critical Missing Implementations ❌
1. **4 RFP question/response routes** lack company verification
2. **No company filtering** in RAG/knowledge base queries
3. **Hardcoded "Demo Company"** in dashboard layout
4. **Missing TODOs** in 3+ routes (acknowledged but not implemented)

### Risk Assessment by Route Group

| Module | Status | Risk |
|--------|--------|------|
| Auth & Session | ✅ Secure | Low |
| Documents API | ✅ Secure | Low |
| Chat/RAG | ✅ Secure (with isolation) | Low |
| RFP Module | ⚠️ Partial | **CRITICAL** |
| UI/Frontend | ⚠️ Incomplete | Medium |

---

## 8. Detailed Gap Examples

### Example 1: Response Endpoint Vulnerability
**File:** `src/app/api/v1/rfp/questions/[id]/response/route.ts:18-72`

```typescript
export async function POST(request: NextRequest, { params }: ...) {
  // ❌ MISSING: requireRFPAuth() - would provide company context
  const session = await auth();  // ⚠️ Only checks if user exists
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get question (no company check)
  const [question] = await db.select().from(rfpQuestions)
    .where(eq(rfpQuestions.id, questionId));

  // Get RFP (stores companyId but never verifies it)
  const [rfp] = await db.select({ id: rfps.id, companyId: rfps.companyId })
    .from(rfps)
    .where(eq(rfps.id, question.rfpId));
  
  // ❌ MISSING: if (rfp.companyId !== current_company_id) return 403;
  
  // Proceeds to save response
  await db.insert(rfpResponses).values({ questionId, ... });
}
```

### Example 2: Generate Response Vulnerability
**File:** `src/app/api/v1/rfp/questions/[id]/generate-response/route.ts:36-102`

```typescript
export async function POST(request: NextRequest, { params }: ...) {
  const session = await auth();  // ⚠️ Only user auth
  
  // ... fetch question and RFP ...
  
  // Line 101: TODO comment reveals awareness
  // TODO: Verify user is member of company (for now, skip this check)
  
  // Then queries Pinecone with NO tenant filtering
  const relevantDocs = await retrieveRelevantDocs(
    queryEmbedding,
    question.category,
    depth
  );
  // ❌ This searches entire Pinecone namespace, not company-specific
  
  // AI generates response with cross-company data
  const responseText = await generateResponseWithClaude(
    question.questionText,
    contextText,  // ⚠️ May contain other company's data
    ...
  );
}
```

---

## 9. Recommendations

### Immediate Fixes (P0 - Do Before Production)

1. **Add company verification to all RFP question/response routes:**
   ```typescript
   const authResult = await requireRFPAuth();
   if (authResult.error) return authResult.error;
   const { company } = authResult;
   
   // Then verify: if (rfp.companyId !== company.id) return 403;
   ```

2. **Update `requireRFPAuth()` to accept company verification:**
   - Currently defined in `src/lib/rfp/auth.ts`
   - Could be enhanced to auto-verify company scoping

3. **Implement tenant-aware RAG queries:**
   - Filter Pinecone searches by company
   - Add company metadata to vector embeddings
   - Verify document ownership before retrieving

4. **Secure the RFP routes:**
   - `/api/v1/rfp/questions/[id]/response` (POST & GET)
   - `/api/v1/rfp/questions/[id]/generate-response` (POST)
   - `/api/v1/rfp/rfps/[id]/enrichment` (POST & GET)
   - `/api/v1/rfp/rfps/[id]/enrich-linkedin` (POST)

### Medium-term Fixes (P1)

5. **Implement dynamic company selector UI:**
   - Replace hardcoded "Demo Company" in layout
   - Load user's actual companies from database
   - Allow switching between companies

6. **Add audit logging:**
   - Log all cross-company access attempts
   - Monitor for suspicious patterns

7. **Add request-level company validation:**
   - Create middleware to validate all RFP requests
   - Fail-closed approach

### Testing Recommendations

8. **Add integration tests:**
   ```typescript
   // User from Company A tries to access Company B's RFP
   test('should deny cross-company RFP access', async () => {
     const userA = await createUser('company-a');
     const rfpB = await createRFP('company-b');
     
     const response = await POST(
       `/api/v1/rfp/questions/${rfpB.questions[0].id}/response`,
       { responseText: 'attempt' },
       { auth: userA }
     );
     
     expect(response.status).toBe(403);
   });
   ```

9. **Load testing with multiple companies**
10. **Penetration testing of RFP endpoints**

---

## File Reference Summary

### Schema & Database
- ✅ `/src/db/schema.ts` - Well-designed multi-company schema

### Auth & Middleware  
- ✅ `/src/lib/auth/config.ts` - NextAuth setup
- ✅ `/src/lib/auth/helpers.ts` - Company context helper
- ✅ `/src/lib/auth/middleware.ts` - requireAuth middleware
- ✅ `/src/lib/rfp/auth.ts` - RFP-specific auth helpers

### Vulnerable Routes (4 critical)
- ❌ `/src/app/api/v1/rfp/questions/[id]/response/route.ts` - Save/Get responses
- ❌ `/src/app/api/v1/rfp/questions/[id]/generate-response/route.ts` - AI generation
- ❌ `/src/app/api/v1/rfp/rfps/[id]/enrichment/route.ts` - Manual enrichment
- ❌ `/src/app/api/v1/rfp/rfps/[id]/enrich-linkedin/route.ts` - LinkedIn enrichment

### Secure Routes (Examples)
- ✅ `/src/app/api/v1/rfp/rfps/route.ts` - List & upload
- ✅ `/src/app/api/v1/rfp/rfps/[id]/route.ts` - Get detail
- ✅ `/src/app/api/companies/[slug]/documents/route.ts` - Document list
- ✅ `/src/app/api/companies/[slug]/chat/route.ts` - Chat with isolation

### Set Active Company
- ✅ `/src/app/api/companies/[slug]/set-active/route.ts` - Validates membership

### UI Components
- ⚠️ `/src/app/(dashboard)/layout.tsx` - Hardcoded company
- ✅ `/src/components/company-provider.tsx` - Sets company context

---

## Conclusion

The application has a **solid foundation for multi-tenancy** with proper database design and authentication infrastructure. However, **4 critical RFP API routes lack company-level authorization checks**, creating a **high-risk data exposure vulnerability**. These must be fixed before production deployment.

The vulnerabilities are **easily exploitable** - any authenticated user from one company can access/modify RFP data from another company. The awareness of these gaps is evident from multiple TODO comments in the code, indicating they were known but deferred during implementation.

**Estimated effort to fix:** 4-6 hours
**Priority:** CRITICAL (P0 - Blockers for production)

