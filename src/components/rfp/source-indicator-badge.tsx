'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, Sparkles, FileText } from 'lucide-react';
import type { ContentType } from '@/types/content-types';

interface SourceIndicatorBadgeProps {
  primaryContentType?: ContentType | null;
  selectedSourceRfpId?: string | null;
  detectionConfidence?: number | null;
  slug: string;
  compact?: boolean;
}

interface SourceRfpInfo {
  title: string;
  clientName: string;
  result: 'won' | 'lost' | 'pending';
}

export function SourceIndicatorBadge({
  primaryContentType,
  selectedSourceRfpId,
  detectionConfidence,
  slug,
  compact = false,
}: SourceIndicatorBadgeProps) {
  const [sourceInfo, setSourceInfo] = useState<SourceRfpInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch source RFP info if selected
  useEffect(() => {
    if (!selectedSourceRfpId) {
      setSourceInfo(null);
      return;
    }

    setIsLoading(true);
    fetch(`/api/companies/${slug}/rfps/${selectedSourceRfpId}`)
      .then(res => res.json())
      .then(data => {
        if (data.rfp) {
          setSourceInfo({
            title: data.rfp.title,
            clientName: data.rfp.clientName,
            result: data.rfp.result,
          });
        }
      })
      .catch(err => {
        console.error('[Source Info Error]', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedSourceRfpId, slug]);

  // If no content type and no source, don't show anything
  if (!primaryContentType && !selectedSourceRfpId) {
    return null;
  }

  const contentTypeLabel = primaryContentType
    ? primaryContentType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Content Type Badge */}
      {primaryContentType && (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200"
          title={detectionConfidence ? `Confiance: ${Math.round(detectionConfidence * 100)}%` : undefined}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {compact ? primaryContentType.split('-')[0] : contentTypeLabel}
        </Badge>
      )}

      {/* Source RFP Badge */}
      {selectedSourceRfpId && !isLoading && sourceInfo && (
        <Badge
          variant="outline"
          className={`${
            sourceInfo.result === 'won'
              ? 'bg-green-50 text-green-700 border-green-200'
              : sourceInfo.result === 'lost'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title={`Source: ${sourceInfo.title} (${sourceInfo.clientName})`}
        >
          <Database className="h-3 w-3 mr-1" />
          {compact ? (
            sourceInfo.result === 'won' ? '✓' : sourceInfo.result === 'lost' ? '✗' : '?'
          ) : (
            `Source: ${sourceInfo.result === 'won' ? 'RFP gagné' : sourceInfo.result === 'lost' ? 'RFP perdu' : 'RFP en attente'}`
          )}
        </Badge>
      )}

      {selectedSourceRfpId && isLoading && (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          <Database className="h-3 w-3 mr-1 animate-pulse" />
          Chargement...
        </Badge>
      )}
    </div>
  );
}
