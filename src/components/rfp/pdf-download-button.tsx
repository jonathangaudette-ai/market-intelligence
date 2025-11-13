'use client';

import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { formatFileSize } from '@/lib/utils/formatting';

interface PdfDownloadButtonProps {
  url: string;
  filename: string;
  label: string;
  fileSize?: number;
  className?: string;
}

export function PdfDownloadButton({
  url,
  filename,
  label,
  fileSize,
  className = '',
}: PdfDownloadButtonProps) {
  const handleDownload = async () => {
    try {
      // Fetch the file from Vercel Blob
      const response = await fetch(url);
      const blob = await response.blob();

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ${className}`}>
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-red-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        <p className="text-xs text-gray-500">
          {filename}
          {fileSize && ` • ${formatFileSize(fileSize)}`}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="flex-shrink-0"
      >
        <Download className="h-4 w-4 mr-2" />
        Télécharger
      </Button>
    </div>
  );
}
