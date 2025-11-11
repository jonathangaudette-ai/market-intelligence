'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

interface StartParsingButtonProps {
  rfpId: string;
}

export function StartParsingButton({ rfpId }: StartParsingButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartParsing = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/rfp/rfps/${rfpId}/parse`, {
        method: 'POST',
      });

      // Check if response is OK first (status 200-299)
      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = 'Failed to start parsing';

        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } else {
            // Non-JSON error (HTML, text, etc.)
            const errorText = await response.text();
            errorMessage = `Server error (${response.status}): ${errorText.substring(0, 200)}`;
          }
        } catch (parseError) {
          // If parsing error response fails, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Only parse JSON if response is OK (validation)
      try {
        await response.json();
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server');
      }

      // Refresh the page to show progress
      router.refresh();
    } catch (err) {
      console.error('[Start Parsing Error]', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsStarting(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleStartParsing}
        disabled={isStarting}
        size="lg"
      >
        {isStarting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Démarrage...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Démarrer l'analyse
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
