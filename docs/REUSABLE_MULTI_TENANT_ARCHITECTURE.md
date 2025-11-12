# Architecture Multi-Tenant - Référence Réutilisable

Guide complet pour implémenter le système multi-tenant avec entreprises, membres et permissions.

## 🏢 Modèle de Données

### Schema de Base de Données (Drizzle ORM)

```typescript
// db/schema.ts

import { pgTable, varchar, timestamp, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// Users Table
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (table) => ({
  // Inline indexes for better performance
  emailIdx: index("idx_users_email").on(table.email),
}));

// ============================================================================
// Companies Table
// ============================================================================

export const companies = pgTable("companies", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("idx_companies_slug").on(table.slug),
}));

// ============================================================================
// Company Members Table (Junction)
// ============================================================================

export const roleEnum = pgEnum("company_role", ["admin", "editor", "viewer"]);

export const companyMembers = pgTable("company_members", {
  id: varchar("id", { length: 255 }).$defaultFn(() => createId()).primaryKey(),
  companyId: varchar("company_id", { length: 255 }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull().default("editor"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  invitedBy: varchar("invited_by", { length: 255 }).references(() => users.id),
}, (table) => ({
  userCompanyIdx: index("idx_company_members_user_company").on(table.userId, table.companyId),
  companyIdx: index("idx_company_members_company").on(table.companyId),
}));

// ============================================================================
// Relations
// ============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyMembers),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, {
    fields: [companyMembers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyMembers.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TypeScript Types
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyMember = typeof companyMembers.$inferSelect;
export type NewCompanyMember = typeof companyMembers.$inferInsert;
```

### Migration SQL

```sql
-- Create users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Create companies table
CREATE TABLE companies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);

-- Create company_members table
CREATE TYPE company_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE company_members (
  id VARCHAR(255) PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  invited_by VARCHAR(255) REFERENCES users(id)
);

CREATE INDEX idx_company_members_user_company ON company_members(user_id, company_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE UNIQUE INDEX idx_company_members_unique ON company_members(user_id, company_id);
```

## 🔐 Company Context Management - SLUG-BASED ARCHITECTURE

### ⚡ Architecture Evolution

Cette plateforme utilise une **architecture slug-based** où le contexte de la compagnie est **extrait de l'URL** plutôt que des cookies. Cela élimine les race conditions et garantit une isolation multi-tenant robuste.

**Pattern principal**: `/companies/[slug]/*` où `[slug]` identifie la compagnie de manière unique.

### Core Library (`lib/rfp/auth.ts`)

```typescript
"use server";

import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

/**
 * Get company by slug and verify user access
 * PRIMARY METHOD for slug-based architecture
 *
 * Returns company data if user has access, null otherwise
 */
export async function getCompanyBySlug(slug: string) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  // Find company by slug
  const [company] = await db
    .select()
    .from(companies)
    .where(and(
      eq(companies.slug, slug),
      eq(companies.isActive, true)
    ))
    .limit(1);

  if (!company) {
    return null;
  }

  // Super admins can access any company
  if (session.user.isSuperAdmin) {
    return {
      company,
      role: 'admin' as const,
      userId: session.user.id,
    };
  }

  // Verify user has access to this company
  const [membership] = await db
    .select({
      role: companyMembers.role,
    })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.companyId, company.id)
      )
    )
    .limit(1);

  if (!membership) {
    return null;
  }

  return {
    company,
    role: membership.role,
    userId: session.user.id,
  };
}

/**
 * Middleware helper with intelligent fallback for backward compatibility
 *
 * 1. Try cookie first (backward compat)
 * 2. Extract slug from Referer header if no cookie
 * 3. Return error if no context found
 */
export async function requireRFPAuth() {
  const session = await auth();

  if (!session?.user) {
    return {
      error: unauthorizedResponse('Authentication required'),
      user: null,
      company: null,
    };
  }

  // Try cookie first (backward compatibility)
  let company = await getCurrentCompany();

  // If no cookie, extract slug from referer header
  if (!company) {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const referer = headersList.get('referer');

    if (referer) {
      // Extract slug from URL like /companies/my-company/rfps/...
      const match = referer.match(/\/companies\/([^\/]+)\//);
      if (match && match[1]) {
        const slug = match[1];

        // Get company by slug and verify access
        const companyContext = await getCompanyBySlug(slug);
        if (companyContext) {
          return {
            error: null,
            user: {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.name || null,
              isSuperAdmin: session.user.isSuperAdmin,
            },
            company: {
              id: companyContext.company.id,
              name: companyContext.company.name,
              role: companyContext.role,
            },
          };
        }
      }
    }
  }

  if (!company) {
    return {
      error: forbiddenResponse('No active company context'),
      user: session.user,
      company: null,
    };
  }

  return {
    error: null,
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name || null,
      isSuperAdmin: session.user.isSuperAdmin,
    },
    company: {
      id: company.company.id,
      name: company.company.name,
      role: company.role,
    },
  };
}

/**
 * Check if current user is a member of the specified company
 */
export async function isCompanyMember(companyId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  // Super admins have access to all companies
  if (session.user.isSuperAdmin) return true;

  const membership = await db
    .select()
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.companyId, companyId)
      )
    )
    .limit(1);

  return membership.length > 0;
}

/**
 * Check if current user is an admin of the specified company
 */
export async function isCompanyAdmin(companyId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  // Super admins are admins of all companies
  if (session.user.isSuperAdmin) return true;

  const membership = await db
    .select()
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.userId, session.user.id),
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.role, "admin")
      )
    )
    .limit(1);

  return membership.length > 0;
}
```

## 🗺️ Routing Architecture - SLUG-BASED

### URL Structure

**PRINCIPE CLÉ**: Le slug de la compagnie est **toujours présent dans l'URL**, éliminant le besoin de cookies.

```
/                                           → Public homepage
/login                                      → Login page
/companies/[slug]/*                         → ALL company-scoped routes

Company Routes:
/companies/[slug]/dashboard                 → Dashboard principal
/companies/[slug]/rfps                      → Liste des RFPs
/companies/[slug]/rfps/new                  → Nouveau RFP
/companies/[slug]/rfps/[id]                 → Détails RFP
/companies/[slug]/rfps/[id]/questions       → Questions RFP
/companies/[slug]/intelligence              → RAG chat
/companies/[slug]/competitors               → Gestion concurrents
/companies/[slug]/settings/*                → Paramètres

API Routes (Slug-based):
/api/companies/[slug]/rfps                  → Upload & List RFPs
/api/companies/[slug]/rfps/[id]             → RFP operations
/api/companies/[slug]/documents             → Documents
/api/companies/[slug]/chat                  → RAG chat
```

### Avantages de l'Architecture Slug-Based

✅ **Aucune race condition** - Le contexte est immédiatement disponible dans l'URL
✅ **URLs partageables** - Chaque ressource a une URL unique et explicite
✅ **Sécurité renforcée** - Le slug est validé à chaque requête
✅ **Débogage simplifié** - Le contexte de la compagnie est visible dans l'URL
✅ **Cache-friendly** - URLs statiques pour CDN et cache
✅ **Pas de cookies requis** - Fonctionne sans état côté serveur

### Middleware (`middleware.ts`)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
```

## 🔄 Company Switcher Component - SLUG-BASED

Dans une architecture slug-based, le "company switcher" est simplifié car **il suffit de naviguer vers une nouvelle URL** avec un slug différent. Plus besoin de cookies!

```tsx
// components/common/company-switcher.tsx
"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getMyCompanies } from "@/app/companies/actions";
import { useRouter, useParams } from "next/navigation";

export function CompanySwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentSlug = params.slug as string;

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    const result = await getMyCompanies();
    if (result.success && result.companies) {
      setCompanies(result.companies);
    }
    setLoading(false);
  }

  // ✅ SLUG-BASED: Just navigate to new URL - no cookie needed!
  function handleSwitch(slug: string) {
    router.push(`/companies/${slug}/dashboard`);
  }

  const currentCompany = companies.find((c) => c.company.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <span className="truncate">
              {currentCompany?.company.name || "Sélectionner"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Mes Entreprises</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map(({ company, membership }) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => handleSwitch(company.slug)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-gray-500 capitalize">
                {membership.role}
              </span>
            </div>
            {company.slug === currentSlug && (
              <Check className="w-4 h-4 text-teal-600" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/companies/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle entreprise
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 📊 Data Access Patterns - SLUG-BASED

### Pattern 1: API Routes with Slug Parameter

```typescript
// /api/companies/[slug]/rfps/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Authenticate user
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get company by slug and verify access
  const companyContext = await getCompanyBySlug(slug);
  if (!companyContext) {
    return NextResponse.json(
      { error: 'Company not found or access denied' },
      { status: 403 }
    );
  }

  // 3. Query data scoped to company
  const items = await db
    .select()
    .from(items)
    .where(eq(items.companyId, companyContext.company.id));

  return NextResponse.json({ items });
}
```

### Pattern 2: Backward-Compatible with Referer Fallback

```typescript
// /api/v1/rfp/rfps/[id]/route.ts
export async function GET(request: NextRequest, { params }: ...) {
  // Use helper that extracts slug from referer if no cookie
  const authResult = await requireRFPAuth();
  if (authResult.error) return authResult.error;

  const { company } = authResult;

  // Verify item belongs to company
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item || item.companyId !== company.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ item });
}
```

### Pattern 3: Client Component with Slug

```typescript
// components/item-list.tsx
'use client';

import { useParams } from 'next/navigation';

export function ItemList() {
  const params = useParams();
  const slug = params.slug as string;

  async function handleCreate(data: ItemData) {
    // ✅ Slug is in the URL - no cookie needed
    const response = await fetch(`/api/companies/${slug}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Handle response...
  }

  // Rest of component...
}
```

## 🚀 Quick Start Checklist - SLUG-BASED

- [ ] Copier le schema de base de données (users, companies, company_members)
- [ ] Créer `lib/rfp/auth.ts` avec `getCompanyBySlug()` et `requireRFPAuth()`
- [ ] Implémenter le middleware pour les routes protégées
- [ ] Créer le CompanySwitcher dans le header (navigation uniquement)
- [ ] **IMPORTANT**: Utiliser le slug dans l'URL (`/companies/[slug]/*`) - PAS de cookies
- [ ] Toujours filtrer les données par `companyId` dans les queries
- [ ] Implémenter les vérifications de permissions (isAdmin, etc.)
- [ ] Gérer les super admins avec accès global
- [ ] Créer endpoints API sous `/api/companies/[slug]/*`
- [ ] Utiliser `useParams()` dans les composants clients pour extraire le slug

## 📝 Notes Importantes - ARCHITECTURE SLUG-BASED

### ✅ Avantages

1. **Pas de cookies requis**: Le slug est dans l'URL, disponible immédiatement
2. **Aucune race condition**: Le contexte existe avant toute requête
3. **Sécurité renforcée**: `getCompanyBySlug()` vérifie l'accès à chaque requête
4. **URLs explicites**: `/companies/acme-corp/rfps` est auto-documenté
5. **Cache-friendly**: URLs statiques parfaites pour CDN

### 🔄 Backward Compatibility

Pour les anciens endpoints qui ne peuvent pas être migrés immédiatement:
- `requireRFPAuth()` extrait le slug du header `Referer` comme fallback
- Pattern: Cookie → Referer → Error
- Permet une migration progressive sans casser l'existant

### 🏗️ Structure des Routes

**Routes modernes (slug-based)**:
```
/api/companies/[slug]/rfps           ✅ NOUVEAU
/api/companies/[slug]/rfps/[id]      ✅ NOUVEAU
```

**Routes legacy (avec fallback referer)**:
```
/api/v1/rfp/rfps/[id]                ⚠️ LEGACY (mais fonctionne)
/api/v1/rfp/questions/[id]/response  ⚠️ LEGACY (mais fonctionne)
```

### 🎯 Migration Strategy

1. **Phase 1**: ✅ Architecture slug-based fonctionnelle
2. **Phase 2**: Nettoyage des logs debug et code inutilisé
3. **Phase 3**: Migration complète des endpoints vers `/api/companies/[slug]/*`
4. **Phase 4**: Suppression des anciens endpoints `/api/v1/rfp/*`
5. **Phase 5**: Documentation et tests

### ⚡ Performance

- Pas de requête DB supplémentaire pour les cookies
- `getCompanyBySlug()` peut être optimisé avec cache si nécessaire
- Une seule vérification d'accès par requête API
