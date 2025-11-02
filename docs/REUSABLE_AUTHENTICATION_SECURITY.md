# Authentification & Sécurité - Référence Réutilisable

Guide complet pour implémenter NextAuth avec rôles, permissions et super admin.

## 🔐 Stack Technologique

```json
{
  "authentication": "next-auth@5.0.0-beta",
  "passwordHashing": "bcryptjs",
  "sessionStorage": "JWT + Database",
  "authorization": "Role-Based Access Control (RBAC)"
}
```

## 🛠️ Installation

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs

# Generate auth secret
openssl rand -base64 32
```

## ⚙️ Configuration NextAuth

### `auth.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user) return null;

        // Check if user is active
        if (!user.isActive) return null;

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) return null;

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        // Return user info
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to token on login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user info to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
      }
      return session;
    },
  },
});
```

### TypeScript Types (`types/next-auth.d.ts`)

```typescript
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isSuperAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isSuperAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isSuperAdmin: boolean;
  }
}
```

### API Route (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Environment Variables (`.env.local`)

```env
# NextAuth
AUTH_SECRET=your-super-secret-key-from-openssl

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## 🔒 Authorization Helpers

### Server-Side Auth Check (`lib/api-auth.ts`)

```typescript
"use server";

import { auth } from "@/auth";
import { getCurrentCompany } from "@/lib/current-company";

/**
 * Verify authentication only
 */
export async function verifyAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      session: null,
    };
  }

  return { session, error: null };
}

/**
 * Verify super admin access
 */
export async function verifySuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      session: null,
    };
  }

  if (!session.user.isSuperAdmin) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
      session: null,
    };
  }

  return { session, error: null };
}

/**
 * Verify company admin access
 */
export async function verifyCompanyAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Non authentifié", context: null };
  }

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return { error: "Aucune entreprise active", context: null };
  }

  if (!currentCompany.isAdmin && !session.user.isSuperAdmin) {
    return { error: "Accès réservé aux administrateurs", context: null };
  }

  return { context: currentCompany, error: null };
}
```

### Client-Side Auth (`useSession`)

```tsx
"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isSuperAdmin: session?.user?.isSuperAdmin || false,
  };
}
```

## 🛡️ Protection Patterns

### 1. Protected Page (Server Component)

```tsx
// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <div>Protected content for {session.user.name}</div>;
}
```

### 2. Protected API Route

```tsx
// app/api/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/api-auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check authentication
  const { error: authError, session } = await verifyAuth();
  if (!session) return authError!;

  // Business logic...
  return NextResponse.json({ data: "..." });
}
```

### 3. Protected Server Action

```typescript
"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateItem(id: string, data: any) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Non authentifié" };
  }

  // Check permissions
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) {
    return { error: "Aucune entreprise active" };
  }

  // Business logic...
  await db.update(items).set(data).where(eq(items.id, id));

  revalidatePath(`/items/${id}`);
  return { success: true };
}
```

### 4. Client Component with Auth

```tsx
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export function ProtectedComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return <div>Hello {session?.user?.name}</div>;
}
```

## 👑 Super Admin Features

### Conditional UI for Super Admins

```tsx
import { auth } from "@/auth";

export async function AdminPanel() {
  const session = await auth();
  const isSuperAdmin = session?.user?.isSuperAdmin === true;

  if (!isSuperAdmin) return null;

  return (
    <div className="bg-red-100 border border-red-300 p-4 rounded">
      <h3 className="font-bold">Super Admin Panel</h3>
      {/* Admin-only content */}
    </div>
  );
}
```

### Super Admin Routes

```tsx
// app/admin/users/page.tsx
import { verifySuperAdmin } from "@/lib/api-auth";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const { error } = await verifySuperAdmin();
  if (error) {
    redirect("/");
  }

  // Super admin content
  return <div>User Management</div>;
}
```

## 🔑 Password Management

### Hash Password (Registration)

```typescript
import bcrypt from "bcryptjs";

export async function createUser(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      id: createId(),
      email,
      password: hashedPassword,
      name,
      role: "user",
      isSuperAdmin: false,
      isActive: true,
    })
    .returning();

  return user;
}
```

### Reset Password

```typescript
export async function resetPassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return { success: true };
}
```

## 🎫 Session Management

### SessionProvider Setup (`app/layout.tsx`)

```tsx
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="fr">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Sign Out

```tsx
import { signOut } from "next-auth/react";

function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}>
      Se déconnecter
    </button>
  );
}
```

## 🛡️ Security Best Practices

### 1. Rate Limiting (Optional - Upstash Redis)

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
});

// Usage in API route
const { success } = await ratelimit.limit(session.user.id);
if (!success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

### 2. CSRF Protection

NextAuth includes built-in CSRF protection. Ensure you're using the built-in forms or include the CSRF token:

```tsx
import { getCsrfToken } from "next-auth/react";

const csrfToken = await getCsrfToken();
```

### 3. SQL Injection Protection

Always use parameterized queries with Drizzle ORM:

```typescript
// ✅ SAFE
await db.select().from(users).where(eq(users.email, userEmail));

// ❌ NEVER DO THIS
await db.execute(sql`SELECT * FROM users WHERE email = '${userEmail}'`);
```

### 4. XSS Protection

React/Next.js automatically escapes JSX. For raw HTML:

```tsx
import DOMPurify from 'isomorphic-dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

## 📝 Login Page Example

```tsx
// app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Connexion</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

## 🚀 Quick Setup Checklist

- [ ] Install next-auth@beta and bcryptjs
- [ ] Generate AUTH_SECRET with openssl
- [ ] Create auth.ts configuration
- [ ] Create TypeScript types (next-auth.d.ts)
- [ ] Create API route handler
- [ ] Add SessionProvider to root layout
- [ ] Create login page
- [ ] Implement middleware for protected routes
- [ ] Add authorization helpers (verifyAuth, etc.)
- [ ] Set up password hashing for registration
- [ ] Test authentication flow

## 🔒 Security Checklist

- [ ] Strong AUTH_SECRET (min 32 characters)
- [ ] Password hashing with bcrypt (cost factor 10+)
- [ ] HTTPS in production
- [ ] Secure cookies (httpOnly, secure, sameSite)
- [ ] Rate limiting on login endpoint
- [ ] Account lockout after failed attempts
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (escape user input)
- [ ] CSRF protection (built-in NextAuth)
- [ ] Regular security audits

## 📚 Reference Links

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [bcrypt Best Practices](https://github.com/kelektiv/node.bcrypt.js)
