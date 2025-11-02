# Design System - Référence Réutilisable

Ce document détaille le design system complet de Business Case Manager pour réutilisation dans d'autres applications.

## 🎨 Palette de Couleurs

### Couleur Principale: Teal
```css
/* Tailwind classes utilisées */
- text-teal-600 (primary text/icons)
- bg-teal-600 (primary backgrounds)
- hover:text-teal-600 (hover states)
- border-teal-600 (borders)
- bg-teal-100 dark:bg-teal-900 (light backgrounds)
```

### Couleurs Système
```css
/* Backgrounds */
- bg-white (main background)
- bg-gray-50 (secondary background)
- bg-card (card backgrounds)
- bg-muted (muted areas)
- bg-background (theme-aware background)

/* Text */
- text-gray-900 (primary text)
- text-gray-700 (secondary text)
- text-muted-foreground (muted text)

/* Borders */
- border-gray-200 (default borders)
- border (theme-aware borders)

/* States */
- hover:bg-gray-50 (hover backgrounds)
- focus-visible:ring-teal-600 (focus rings)
```

### Status Colors
```tsx
const statusConfig = {
  success: { color: "text-green-600", bg: "bg-green-100" },
  warning: { color: "text-yellow-600", bg: "bg-yellow-100" },
  error: { color: "text-red-600", bg: "bg-red-100" },
  info: { color: "text-blue-600", bg: "bg-blue-100" },
};
```

## 📦 Composants UI (shadcn/ui)

### Composants Installés
```bash
# Core components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add avatar
```

### Configuration Tailwind
```js
// tailwind.config.ts
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... autres couleurs shadcn
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## 🎯 Patterns UI Réutilisables

### 1. Header avec Navigation
```tsx
// components/common/header.tsx
<header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
  <div className="container mx-auto px-4">
    <div className="flex items-center justify-between h-16">
      {/* Logo + Titre */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Icon className="w-6 h-6 text-teal-600" />
          <span className="font-bold text-xl text-gray-900">App Name</span>
        </Link>
        <CompanySwitcher currentCompanyId={currentCompany.company.id} />
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-teal-600 transition">
          <Icon className="w-4 h-4" />
          Menu Item
        </Link>
        <UserMenu />
      </nav>
    </div>
  </div>
</header>
```

### 2. Cards avec Stats
```tsx
<div className="bg-card border rounded-lg p-6">
  <div className="flex items-center gap-3">
    <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-lg">
      <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">Label</p>
      <p className="text-2xl font-bold">123</p>
    </div>
  </div>
</div>
```

### 3. Tables avec Actions
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Colonne</TableHead>
      <TableHead className="w-[50px]"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>
        <Link href={`/item/${id}`} className="font-medium hover:underline">
          Titre
        </Link>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Actions */}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 4. Forms
```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="field">Label</Label>
    <Input
      id="field"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Placeholder"
    />
  </div>
  <Button type="submit" disabled={isLoading}>
    {isLoading ? "Chargement..." : "Enregistrer"}
  </Button>
</form>
```

### 5. Empty States
```tsx
<div className="border rounded-lg bg-card">
  <div className="flex flex-col items-center justify-center py-12">
    <div className="bg-muted rounded-full p-6 mb-4">
      <Icon className="h-10 w-10 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Titre</h3>
    <p className="text-muted-foreground text-center max-w-md mb-6">
      Description
    </p>
    <Button>
      <Icon className="h-4 w-4 mr-2" />
      Action
    </Button>
  </div>
</div>
```

## 🔔 Notifications (Sonner)

### Installation
```bash
npm install sonner
```

### Setup
```tsx
// app/layout.tsx
import { Toaster } from "sonner";

<Toaster position="top-right" richColors />
```

### Usage
```tsx
import { toast } from "sonner";

toast.success("Opération réussie");
toast.error("Une erreur s'est produite");
toast.warning("Attention");
toast.info("Information");
```

## 📱 Responsive Design

### Breakpoints
```css
/* Tailwind breakpoints utilisés */
sm: 640px   /* mobile landscape */
md: 768px   /* tablet */
lg: 1024px  /* desktop */
xl: 1280px  /* large desktop */
2xl: 1536px /* extra large */
```

### Patterns Responsive
```tsx
{/* Grid responsive */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

{/* Hide on mobile */}
<div className="hidden md:block">

{/* Stack on mobile */}
<div className="flex flex-col md:flex-row gap-4">
```

## 🎭 Animations

### Transitions CSS
```css
/* Classes utilisées pour smooth transitions */
.transition
.transition-all
.duration-200
.ease-in-out

/* Hover effects */
.hover:scale-105
.hover:opacity-80
```

### Framer Motion (si nécessaire)
```bash
npm install framer-motion
```

## 📐 Spacing & Layout

### Container
```tsx
<div className="container mx-auto px-4 py-8">
  {/* Content */}
</div>
```

### Spacing Scale
```css
/* Gap entre éléments */
gap-2  /* 0.5rem / 8px */
gap-4  /* 1rem / 16px */
gap-6  /* 1.5rem / 24px */
gap-8  /* 2rem / 32px */

/* Padding/Margin */
p-4, m-4   /* 1rem */
p-6, m-6   /* 1.5rem */
p-8, m-8   /* 2rem */
```

## 🖼️ Icônes (Lucide React)

### Installation
```bash
npm install lucide-react
```

### Usage
```tsx
import { Home, Settings, User, MoreVertical } from "lucide-react";

<Icon className="h-4 w-4" /> {/* Small icons in buttons */}
<Icon className="h-5 w-5" /> {/* Medium icons */}
<Icon className="h-6 w-6" /> {/* Large icons in headers */}
```

### Icônes Courantes
- Navigation: Home, Settings, Users, BarChart3, FileText
- Actions: Plus, Edit, Trash2, Copy, Archive
- Status: Check, X, AlertCircle, Info
- UI: ChevronDown, MoreVertical, ArrowLeft, ArrowRight

## 📝 Typography

### Font
```tsx
// next.config.js - Using system fonts
const nextConfig = {
  // Default Next.js uses Inter font
}
```

### Text Styles
```css
/* Headings */
.text-3xl.font-bold.tracking-tight    /* Page titles */
.text-2xl.font-bold                   /* Section titles */
.text-lg.font-semibold                /* Card titles */

/* Body */
.text-sm.font-medium                  /* Labels */
.text-sm.text-muted-foreground        /* Helper text */
.text-xs.text-gray-500                /* Meta text */
```

## 🎨 Design Tokens

### Shadows
```css
.shadow-sm    /* Subtle shadow for cards */
.shadow-md    /* Medium shadow for dropdowns */
.shadow-lg    /* Large shadow for modals */
```

### Borders
```css
.rounded-lg   /* Default border radius */
.rounded-md   /* Small border radius */
.rounded-full /* Circular */
.border       /* 1px solid border */
```

## 📦 Package Dependencies

```json
{
  "dependencies": {
    "next": "15.5.6",
    "react": "^19",
    "react-dom": "^19",
    "tailwindcss": "^3.4.1",
    "lucide-react": "latest",
    "sonner": "latest",
    "@radix-ui/react-*": "latest", // shadcn/ui components
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

## 🚀 Quick Start Template

```tsx
// components/layout/page-layout.tsx
export function PageLayout({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {action}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
```
