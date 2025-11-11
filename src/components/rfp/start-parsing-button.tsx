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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start parsing');
      }

      // Refresh the page to show progress
      router.refresh();
    } catch (err) {
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
