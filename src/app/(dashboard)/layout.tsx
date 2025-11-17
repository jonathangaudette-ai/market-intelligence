"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MessageSquare, Users, Settings, LogOut, Menu, X, LayoutDashboard, FileCheck, Database, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyProvider } from "@/components/company-provider";
import { CompanySwitcher } from "@/components/company-switcher";
import { SuperAdminBadge } from "@/components/super-admin-badge";
import { useSession } from "@/hooks/use-session";
import { useSidebarStats } from "@/hooks/use-sidebar-stats";
import { StatCardCompact } from "@/components/ui/stat-card";
import { signOut } from "next-auth/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSession();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const slug = params.slug as string || 'demo-company';
  const { stats, isLoading: statsLoading } = useSidebarStats(slug);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // Note: No longer using cookies for company context
  // All APIs now extract company from slug in URL (via referer header)

  // Navigation items with dynamic company slug
  const navigation = [
    { name: "Dashboard", href: `/companies/${slug}/dashboard`, icon: LayoutDashboard },
    { name: "Intelligence", href: `/companies/${slug}/intelligence`, icon: MessageSquare },
    { name: "RFP Assistant", href: `/companies/${slug}/rfps`, icon: FileCheck },
    { name: "Bibliothèque RFP", href: `/companies/${slug}/rfps/library`, icon: Database },
    { name: "Knowledge Base", href: `/companies/${slug}/knowledge-base`, icon: BookOpen },
    // { name: "Concurrents", href: `/companies/${slug}/competitors`, icon: Users }, // Hidden temporarily
    { name: "Paramètres", href: `/companies/${slug}/settings`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Market Intel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
            aria-label="Fermer la navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Switcher */}
        <CompanySwitcher currentUser={user || undefined} />

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Stats Card */}
        <div className="p-4 mx-4 mt-6 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200">
          <p className="text-xs font-semibold text-teal-900 mb-3">Utilisation ce mois-ci</p>
          <div className="space-y-2">
            <StatCardCompact
              label="Messages"
              value={stats.messages}
              loading={statsLoading}
            />
            <StatCardCompact
              label="Documents"
              value={stats.documents}
              loading={statsLoading}
            />
          </div>
        </div>

        {/* User Menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || ''}
              </p>
              {user?.isSuperAdmin && <SuperAdminBadge />}
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar (Mobile) */}
        <div className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Market Intel</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-screen">
          <CompanyProvider>{children}</CompanyProvider>
        </main>
      </div>
    </div>
  );
}
