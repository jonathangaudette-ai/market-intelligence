'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Calendar, TrendingUp, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import Link from 'next/link';

interface RFP {
  id: string;
  title: string;
  clientName: string;
  clientIndustry: string | null;
  result: 'won' | 'lost' | 'pending' | null;
  qualityScore: number | null;
  submittedAt: Date | null;
  usageCount: number | null;
}

interface RFPLibraryClientProps {
  rfps: RFP[];
  slug: string;
}

export function RFPLibraryClient({ rfps, slug }: RFPLibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Format date helper
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'won':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Gagné
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Perdu
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filter and sort RFPs
  const filteredAndSortedRfps = useMemo(() => {
    let filtered = [...rfps];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rfp) =>
          rfp.title.toLowerCase().includes(query) ||
          rfp.clientName.toLowerCase().includes(query) ||
          rfp.clientIndustry?.toLowerCase().includes(query)
      );
    }

    // Apply result filter
    if (filterResult !== 'all') {
      filtered = filtered.filter((rfp) => rfp.result === filterResult);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0);
        case 'date-asc':
          return (a.submittedAt?.getTime() || 0) - (b.submittedAt?.getTime() || 0);
        case 'quality-desc':
          return (b.qualityScore || 0) - (a.qualityScore || 0);
        case 'quality-asc':
          return (a.qualityScore || 0) - (b.qualityScore || 0);
        case 'usage-desc':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [rfps, searchQuery, filterResult, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, client ou industrie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter by result */}
            <Select value={filterResult} onValueChange={setFilterResult}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par résultat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les résultats</SelectItem>
                <SelectItem value="won">Gagnés</SelectItem>
                <SelectItem value="lost">Perdus</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort by */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (plus récent)</SelectItem>
                <SelectItem value="date-asc">Date (plus ancien)</SelectItem>
                <SelectItem value="quality-desc">Qualité (élevée)</SelectItem>
                <SelectItem value="quality-asc">Qualité (faible)</SelectItem>
                <SelectItem value="usage-desc">Plus utilisé</SelectItem>
                <SelectItem value="title-asc">Titre (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {(searchQuery || filterResult !== 'all') && (
            <div className="mt-3 text-sm text-gray-600">
              {filteredAndSortedRfps.length} résultat{filteredAndSortedRfps.length > 1 ? 's' : ''} trouvé{filteredAndSortedRfps.length > 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RFPs List */}
      {filteredAndSortedRfps.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Aucun RFP trouvé avec ces filtres</p>
              <p className="text-sm text-gray-400 mt-2">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedRfps.map((rfp) => (
            <Link key={rfp.id} href={`/companies/${slug}/rfps/${rfp.id}`}>
              <Card className="hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left side - RFP info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {rfp.title}
                        </h3>
                        {getResultBadge(rfp.result)}
                        {rfp.qualityScore && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Qualité: {rfp.qualityScore}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{rfp.clientName}</span>
                        {rfp.clientIndustry && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{rfp.clientIndustry}</span>
                          </>
                        )}
                        {rfp.submittedAt && (
                          <>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Soumis le {formatDate(rfp.submittedAt)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {rfp.usageCount && rfp.usageCount > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Utilisé {rfp.usageCount} fois
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Right side - Quality indicator */}
                    <div className="text-right">
                      {rfp.qualityScore && (
                        <div
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                            rfp.qualityScore >= 80
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : rfp.qualityScore >= 60
                              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          <span className="text-sm font-bold">{rfp.qualityScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
