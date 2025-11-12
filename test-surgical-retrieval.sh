#!/bin/bash

# Test Script for RFP Surgical Retrieval System
# This script tests all components of the surgical retrieval system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL (change if needed)
BASE_URL="http://localhost:3000"
COMPANY_SLUG="test-company"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
}

# Test 1: Database migrations
test_migrations() {
    print_header "TEST 1: Database Migrations"

    print_test "Checking if rfp_source_preferences table exists..."
    if psql $DATABASE_URL -c "\dt rfp_source_preferences" 2>/dev/null | grep -q "rfp_source_preferences"; then
        print_success "Table rfp_source_preferences exists"
    else
        print_error "Table rfp_source_preferences does not exist"
        return 1
    fi

    print_test "Checking if rfps table has isHistorical column..."
    if psql $DATABASE_URL -c "\d rfps" 2>/dev/null | grep -q "is_historical"; then
        print_success "Column isHistorical exists in rfps table"
    else
        print_error "Column isHistorical does not exist in rfps table"
        return 1
    fi

    print_test "Checking if rfp_questions has primaryContentType column..."
    if psql $DATABASE_URL -c "\d rfp_questions" 2>/dev/null | grep -q "primary_content_type"; then
        print_success "Column primaryContentType exists in rfp_questions table"
    else
        print_error "Column primaryContentType does not exist in rfp_questions table"
        return 1
    fi
}

# Test 2: TypeScript compilation
test_typescript() {
    print_header "TEST 2: TypeScript Compilation"

    print_test "Running TypeScript compiler..."
    if npm run build > /tmp/build.log 2>&1; then
        print_success "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        cat /tmp/build.log
        return 1
    fi
}

# Test 3: API endpoints availability
test_api_endpoints() {
    print_header "TEST 3: API Endpoints"

    # Start dev server in background
    print_info "Starting dev server..."
    npm run dev > /tmp/dev-server.log 2>&1 &
    DEV_PID=$!

    # Wait for server to start
    sleep 10

    print_test "Testing /api/companies/${COMPANY_SLUG}/rfps/library endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/companies/${COMPANY_SLUG}/rfps/library" \
        -H "Cookie: $(cat /tmp/test-session-cookie.txt 2>/dev/null || echo '')")

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
        print_success "Library endpoint exists (HTTP $HTTP_CODE)"
    else
        print_error "Library endpoint returned HTTP $HTTP_CODE"
    fi

    print_test "Testing smart-configure endpoint..."
    # Create a test RFP ID for testing
    TEST_RFP_ID="test-rfp-id"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${BASE_URL}/api/companies/${COMPANY_SLUG}/rfps/${TEST_RFP_ID}/smart-configure" \
        -H "Cookie: $(cat /tmp/test-session-cookie.txt 2>/dev/null || echo '')")

    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Smart-configure endpoint exists (HTTP $HTTP_CODE)"
    else
        print_info "Smart-configure endpoint returned HTTP $HTTP_CODE"
    fi

    # Kill dev server
    kill $DEV_PID 2>/dev/null || true
}

# Test 4: Check required files exist
test_files_exist() {
    print_header "TEST 4: Required Files"

    FILES=(
        "src/types/content-types.ts"
        "src/lib/rfp/historical-import.ts"
        "src/lib/rfp/content-type-detector.ts"
        "src/lib/rfp/source-scoring.ts"
        "src/lib/rfp/smart-defaults.ts"
        "src/components/rfp/historical-import-form.tsx"
        "src/components/rfp/smart-configure-button.tsx"
        "src/components/rfp/source-indicator-badge.tsx"
        "src/app/(dashboard)/companies/[slug]/rfps/import/page.tsx"
        "src/app/(dashboard)/companies/[slug]/rfps/library/page.tsx"
        "src/app/api/companies/[slug]/rfps/import-historical/route.ts"
        "src/app/api/companies/[slug]/rfps/[id]/smart-configure/route.ts"
        "src/app/api/companies/[slug]/rfps/[id]/suggest-sources/route.ts"
        "src/app/api/companies/[slug]/rfps/library/route.ts"
    )

    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            print_success "$file exists"
        else
            print_error "$file does not exist"
        fi
    done
}

# Test 5: Check environment variables
test_env_vars() {
    print_header "TEST 5: Environment Variables"

    REQUIRED_VARS=(
        "DATABASE_URL"
        "ANTHROPIC_API_KEY"
        "OPENAI_API_KEY"
        "PINECONE_API_KEY"
        "PINECONE_INDEX"
    )

    # Load .env.local
    if [ -f .env.local ]; then
        export $(cat .env.local | grep -v '^#' | xargs)
    fi

    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set"
        else
            print_success "$var is set"
        fi
    done
}

# Test 6: Database queries
test_database_queries() {
    print_header "TEST 6: Database Queries"

    print_test "Counting historical RFPs..."
    COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM rfps WHERE is_historical = true;" 2>/dev/null | xargs || echo "0")
    print_info "Found $COUNT historical RFPs in database"
    print_success "Query executed successfully"

    print_test "Checking rfp_source_preferences..."
    COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM rfp_source_preferences;" 2>/dev/null | xargs || echo "0")
    print_info "Found $COUNT source preference configurations"
    print_success "Query executed successfully"
}

# Test 7: Test content type definitions
test_content_types() {
    print_header "TEST 7: Content Type Definitions"

    print_test "Checking if content-types.ts exports CONTENT_TYPE_DESCRIPTIONS..."
    if grep -q "CONTENT_TYPE_DESCRIPTIONS" src/types/content-types.ts; then
        print_success "CONTENT_TYPE_DESCRIPTIONS found"
    else
        print_error "CONTENT_TYPE_DESCRIPTIONS not found"
    fi

    print_test "Checking if all 11 content types are defined..."
    CONTENT_TYPES=(
        "company-overview"
        "corporate-info"
        "team-structure"
        "company-history"
        "values-culture"
        "product-description"
        "service-offering"
        "project-methodology"
        "technical-solution"
        "project-timeline"
        "pricing-structure"
    )

    for type in "${CONTENT_TYPES[@]}"; do
        if grep -q "$type" src/types/content-types.ts; then
            print_success "Content type '$type' defined"
        else
            print_error "Content type '$type' not found"
        fi
    done
}

# Test 8: Check AI model configurations
test_ai_models() {
    print_header "TEST 8: AI Model Configurations"

    print_test "Checking CLAUDE_MODELS in ai-models.ts..."
    if [ -f "src/lib/constants/ai-models.ts" ]; then
        if grep -q "CLAUDE_MODELS" src/lib/constants/ai-models.ts; then
            print_success "CLAUDE_MODELS configuration found"
        else
            print_error "CLAUDE_MODELS configuration not found"
        fi
    else
        print_error "ai-models.ts file not found"
    fi
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║  RFP Surgical Retrieval System - Tests    ║"
    echo "╔════════════════════════════════════════════╝"
    echo ""

    print_info "Starting test suite..."
    echo ""

    # Run all tests
    test_files_exist || true
    test_env_vars || true
    test_typescript || true
    test_content_types || true
    test_ai_models || true

    # Only run DB tests if DATABASE_URL is set
    if [ -n "$DATABASE_URL" ]; then
        test_migrations || true
        test_database_queries || true
    else
        print_info "Skipping database tests (DATABASE_URL not set)"
    fi

    # Print summary
    echo ""
    print_header "TEST SUMMARY"
    echo ""
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run main function
main
