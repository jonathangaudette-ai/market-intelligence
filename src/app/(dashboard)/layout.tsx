"use client";

import { useState } from "react";
import { Building2, MessageSquare, FileText, Users, Settings, ChevronDown, LogOut, Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/companies/demo-company/dashboard", icon: LayoutDashboard, current: false },
  { name: "Intelligence", href: "/companies/demo-company/intelligence", icon: MessageSquare, current: true },
  { name: "Concurrents", href: "/companies/demo-company/competitors", icon: Users, current: false },
  { name: "Documents", href: "/companies/demo-company/documents", icon: FileText, current: false },
  { name: "Paramètres", href: "/companies/demo-company/settings", icon: Settings, current: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
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
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Selector */}
        <div className="p-4 border-b border-gray-200">
          <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded flex items-center justify-center">
                <Building2 className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Demo Company</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${item.current
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* Stats Card */}
        <div className="p-4 mx-4 mt-6 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200">
          <p className="text-xs font-semibold text-teal-900 mb-3">Utilisation ce mois-ci</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-teal-700">Messages</span>
              <Badge variant="default" className="text-xs">247</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-teal-700">Documents</span>
              <Badge variant="default" className="text-xs">18</Badge>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@example.com</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar (Mobile) */}
        <div className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
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
          {children}
        </main>
      </div>
    </div>
  );
}
