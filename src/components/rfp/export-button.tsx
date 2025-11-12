'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  rfpId: string;
  slug: string;
  rfpTitle?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary';
}

export function ExportButton({
  rfpId,
  slug,
  rfpTitle,
  size = 'default',
  variant = 'default',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'docx' | 'pdf') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/companies/${slug}/rfps/${rfpId}/export`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export RFP');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rfpTitle || 'RFP-Response'}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('docx')} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">Document Word (.docx)</span>
            <span className="text-xs text-gray-500">Format éditable recommandé</span>
          </div>
        </DropdownMenuItem>
        {/* PDF export can be added later */}
        {/* <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="font-medium">PDF (.pdf)</span>
            <span className="text-xs text-gray-500">Format final pour soumission</span>
          </div>
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
