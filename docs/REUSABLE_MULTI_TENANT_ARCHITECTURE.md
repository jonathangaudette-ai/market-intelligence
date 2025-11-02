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

## 🔐 Current Company Management

### Core Library (`lib/current-company.ts`)

```typescript
"use server";

import { db } from "@/lib/db";
import { companies, companyMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import type { Company, CompanyMember } from "@/db/schema";
import { cache } from "react";

export interface CompanyContext {
  company: Company;
  membership: CompanyMember;
  isAdmin: boolean;
}

/**
 * Get the current active company for the logged-in user
 *
 * ⚡ OPTIMIZED: Cached with React.cache() to prevent redundant DB queries
 * Cache is scoped to a single request/render cycle
 */
export const getCurrentCompany = cache(async (): Promise<CompanyContext | null> => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get("activeCompanyId")?.value;

  // Super admins: Get company from cookie or first available company
  if (session.user.isSuperAdmin) {
    let company: Company | null = null;

    if (activeCompanyId) {
      [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, activeCompanyId))
        .limit(1);
    }

    if (!company) {
      [company] = await db.select().from(companies).limit(1);
    }

    if (!company) return null;

    return {
      company,
      membership: {
        id: "",
        userId: session.user.id,
        companyId: company.id,
        role: "admin",
        joinedAt: new Date(),
        invitedBy: null,
      } as CompanyMember,
      isAdmin: true,
    };
  }

  // Regular users: Get their company memberships
  const memberships = await db
    .select({
      company: companies,
      membership: companyMembers,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(eq(companyMembers.userId, session.user.id));

  if (memberships.length === 0) return null;

  let selectedMembership = memberships.find(
    (m) => m.company.id === activeCompanyId
  );

  if (!selectedMembership) {
    selectedMembership = memberships[0];
    try {
      cookieStore.set("activeCompanyId", selectedMembership.company.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    } catch (error) {
      console.warn("Failed to set activeCompanyId cookie:", error);
    }
  }

  return {
    company: selectedMembership.company,
    membership: selectedMembership.membership,
    isAdmin: selectedMembership.membership.role === "admin",
  };
});

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

## 🗺️ Routing Architecture

### URL Structure

```
/                              → Public homepage
/login                         → Login page
/companies/new                 → Create new company
/companies/[slug]/*            → Company-scoped routes

Company Routes:
/companies/[slug]/dashboard
/companies/[slug]/settings/*
/companies/[slug]/[feature]/*
```

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

## 🔄 Company Switcher Component

```tsx
// components/common/company-switcher.tsx
"use client";

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getMyCompanies, switchCompany } from "@/app/companies/actions";
import { useRouter } from "next/navigation";

export function CompanySwitcher({ currentCompanyId }: { currentCompanyId?: string }) {
  const router = useRouter();
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

  async function handleSwitch(companyId: string) {
    const result = await switchCompany(companyId);
    if (result.success && result.slug) {
      router.push(`/companies/${result.slug}/dashboard`);
    }
  }

  const currentCompany = companies.find((c) => c.company.id === currentCompanyId);

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
            onClick={() => handleSwitch(company.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{company.name}</span>
              <span className="text-xs text-gray-500 capitalize">
                {membership.role}
              </span>
            </div>
            {company.id === currentCompanyId && (
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

## 📊 Data Access Patterns

### Pattern: Données scopées par entreprise

```typescript
// Toujours filtrer par companyId
export async function getItems() {
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return { error: "No active company" };
  }

  const items = await db
    .select()
    .from(items)
    .where(eq(items.companyId, currentCompany.company.id));

  return { success: true, data: items };
}
```

### Pattern: Vérification des permissions

```typescript
export async function updateItem(itemId: string, data: any) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return { error: "No active company" };
  }

  // Verify item belongs to current company
  const [item] = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.id, itemId),
        eq(items.companyId, currentCompany.company.id)
      )
    )
    .limit(1);

  if (!item) {
    return { error: "Not found or access denied" };
  }

  // Check permissions
  if (!currentCompany.isAdmin && item.createdBy !== session.user.id) {
    return { error: "Unauthorized" };
  }

  // Update item
  await db.update(items).set(data).where(eq(items.id, itemId));

  return { success: true };
}
```

## 🚀 Quick Start Checklist

- [ ] Copier le schema de base de données (users, companies, company_members)
- [ ] Créer `lib/current-company.ts` avec les fonctions helper
- [ ] Implémenter le middleware pour les routes protégées
- [ ] Créer le CompanySwitcher dans le header
- [ ] Utiliser le cookie `activeCompanyId` pour persister l'entreprise active
- [ ] Toujours filtrer les données par `companyId` dans les queries
- [ ] Implémenter les vérifications de permissions (isAdmin, etc.)
- [ ] Gérer les super admins avec accès global

## 📝 Notes Importantes

1. **Performance**: `getCurrentCompany()` est caché avec `React.cache()` pour éviter les requêtes redondantes
2. **Sécurité**: Toujours vérifier `companyId` dans les queries pour isolation des données
3. **Super Admins**: Bypass automatique des vérifications de membership
4. **URL Structure**: Toujours utiliser `/companies/[slug]/*` pour les routes scopées
5. **Cookie**: Le cookie `activeCompanyId` persiste l'entreprise active entre les sessions
