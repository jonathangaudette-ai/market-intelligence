'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
}

interface CompanySwitcherProps {
  currentUser?: {
    isSuperAdmin: boolean;
  };
}

export function CompanySwitcher({ currentUser }: CompanySwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const currentSlug = params.slug as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load companies
  useEffect(() => {
    loadCompanies();
  }, []);

  // Update current company when slug changes
  useEffect(() => {
    if (currentSlug && companies.length > 0) {
      const company = companies.find((c) => c.slug === currentSlug);
      if (company) {
        setCurrentCompany(company);
      }
    }
  }, [currentSlug, companies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.company-switcher-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies/me');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const switchCompany = async (slug: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${slug}/set-active`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsOpen(false);

        // Keep the same sub-path when switching companies
        // e.g., /companies/old-company/rfps -> /companies/new-company/rfps
        const newPath = pathname.replace(`/companies/${currentSlug}`, `/companies/${slug}`);

        // Navigate to the new path
        router.push(newPath);

        // Force a refresh to ensure everything is updated
        router.refresh();
      } else {
        const error = await response.json();
        console.error('Error switching company:', error);
        alert(`Erreur: ${error.error || 'Impossible de changer d\'entreprise'}`);
      }
    } catch (error) {
      console.error('Error switching company:', error);
      alert('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async () => {
    if (!newCompanyName || !newCompanySlug) {
      setCreateError('Veuillez remplir tous les champs requis');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/admin/companies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompanyName,
          slug: newCompanySlug,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsCreateOpen(false);
        setNewCompanyName('');
        setNewCompanySlug('');
        setCreateError(null);
        await loadCompanies();
        switchCompany(data.company.slug);
      } else {
        const error = await response.json();
        setCreateError(error.error || 'Échec de la création de la compagnie');
      }
    } catch (error) {
      console.error('Error creating company:', error);
      setCreateError('Échec de la création de la compagnie');
    } finally {
      setCreateLoading(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setNewCompanyName(name);
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setNewCompanySlug(slug);
  };

  return (
    <>
      {/* Company Selector Button */}
      <div className="company-switcher-container p-4 border-b border-gray-200 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded flex items-center justify-center">
              {currentCompany?.logo ? (
                <img
                  src={currentCompany.logo}
                  alt=""
                  className="w-full h-full rounded object-cover"
                />
              ) : (
                <Building2 className="h-4 w-4 text-teal-600" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                {currentCompany?.name || 'Sélectionner une compagnie'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {currentCompany?.role || 'Aucun rôle'}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => switchCompany(company.slug)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt=""
                          className="w-full h-full rounded object-cover"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{company.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{company.role}</p>
                    </div>
                  </div>
                  {currentCompany?.id === company.id && (
                    <Check className="h-4 w-4 text-teal-600" />
                  )}
                </button>
              ))}

              {/* Create Company Button (Super Admin Only) */}
              {currentUser?.isSuperAdmin && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-teal-50 text-teal-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Créer une nouvelle compagnie</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle compagnie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nom de la compagnie *</Label>
              <Input
                id="name"
                value={newCompanyName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug URL *</Label>
              <Input
                id="slug"
                value={newCompanySlug}
                onChange={(e) => setNewCompanySlug(e.target.value)}
                placeholder="acme-corporation"
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisé dans les URLs: /companies/{newCompanySlug || 'slug'}/dashboard
              </p>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">❌ {createError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={createCompany} disabled={createLoading}>
              {createLoading ? 'Création...' : 'Créer la compagnie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
