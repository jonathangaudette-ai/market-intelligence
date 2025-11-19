#!/bin/bash
set -e

echo "🚀 Setting up Pricing Intelligence Module..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}❌ Node.js version must be ≥18. Current: $(node --version)${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js version OK: $(node --version)${NC}"

# 2. Check dependencies
echo ""
echo "2️⃣  Checking dependencies..."
if ! npm list drizzle-orm > /dev/null 2>&1; then
  echo -e "${RED}❌ drizzle-orm not installed${NC}"
  exit 1
fi
if ! npm list drizzle-kit > /dev/null 2>&1; then
  echo -e "${RED}❌ drizzle-kit not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies OK${NC}"

# 3. Check DATABASE_URL
echo ""
echo "3️⃣  Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set in environment${NC}"
  echo "   Please add DATABASE_URL to .env.local"
  exit 1
fi
echo -e "${GREEN}✅ DATABASE_URL configured${NC}"

# 4. Create directories
echo ""
echo "4️⃣  Creating directory structure..."
mkdir -p src/app/\(dashboard\)/companies/\[slug\]/pricing/{catalog,competitors,settings}
mkdir -p src/app/api/companies/\[slug\]/pricing/{stats,products,competitors,scans,matches,history,alerts}
mkdir -p src/lib/pricing/{scraper,matcher,analyzer}
mkdir -p src/components/pricing/{dashboard,catalog,competitors}
echo -e "${GREEN}✅ Directories created${NC}"

# 5. Copy schema
echo ""
echo "5️⃣  Copying Drizzle schema..."
if [ -f "module-pricing/schema-pricing-drizzle.ts" ]; then
  cp module-pricing/schema-pricing-drizzle.ts src/db/schema-pricing.ts
  echo -e "${GREEN}✅ Schema copied to src/db/schema-pricing.ts${NC}"
else
  echo -e "${RED}❌ Source schema not found: module-pricing/schema-pricing-drizzle.ts${NC}"
  exit 1
fi

# 6. Update main schema
echo ""
echo "6️⃣  Updating main schema..."
if ! grep -q "schema-pricing" src/db/schema.ts 2>/dev/null; then
  echo "export * from './schema-pricing';" >> src/db/schema.ts
  echo -e "${GREEN}✅ Main schema updated${NC}"
else
  echo -e "${YELLOW}⚠️  Schema-pricing already exported${NC}"
fi

# 7. Verify TypeScript compilation
echo ""
echo "7️⃣  Verifying TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
  echo -e "${GREEN}✅ TypeScript compilation OK${NC}"
else
  echo -e "${YELLOW}⚠️  TypeScript errors found (may be pre-existing)${NC}"
fi

# 8. Test DB connection
echo ""
echo "8️⃣  Testing database connection..."
node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1 as test')
    .then(() => {
      console.log('\x1b[32m✅ Database connection OK\x1b[0m');
      pool.end();
      process.exit(0);
    })
    .catch(err => {
      console.error('\x1b[31m❌ Database connection failed:\x1b[0m', err.message);
      pool.end();
      process.exit(1);
    });
" || exit 1

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: npm run db:generate  (generate migrations)"
echo "  2. Review migrations in drizzle/ folder"
echo "  3. Run: npm run db:migrate  (apply migrations)"
echo "  4. Start Phase 1: Database Schema & Migrations"
