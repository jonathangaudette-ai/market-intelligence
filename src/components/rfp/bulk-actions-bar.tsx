'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

interface BulkActionsBarProps {
  selectedQuestionIds: string[];
  rfpId: string;
  slug: string;
  onClearSelection: () => void;
  onActionComplete?: () => void;
}

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export function BulkActionsBar({
  selectedQuestionIds,
  rfpId,
  slug,
  onClearSelection,
  onActionComplete,
}: BulkActionsBarProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (selectedQuestionIds.length > 0) {
      fetchMembers();
    }
  }, [selectedQuestionIds.length]);

  const fetchMembers = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(`/api/companies/${slug}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleBulkAssign = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/bulk-assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionIds: selectedQuestionIds,
            userId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign questions');
      }

      router.refresh();
      onClearSelection();
      onActionComplete?.();
    } catch (error) {
      console.error('Bulk assignment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedQuestionIds.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-2xl">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
            {selectedQuestionIds.length}
          </div>
          <span className="text-sm font-medium text-gray-700">
            {selectedQuestionIds.length === 1
              ? '1 question sélectionnée'
              : `${selectedQuestionIds.length} questions sélectionnées`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assignment...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assigner à
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Assigner toutes à</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isFetching ? (
                <DropdownMenuItem disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </DropdownMenuItem>
              ) : members.length === 0 ? (
                <DropdownMenuItem disabled>
                  Aucun membre disponible
                </DropdownMenuItem>
              ) : (
                members.map((member) => (
                  <DropdownMenuItem
                    key={member.userId}
                    onClick={() => handleBulkAssign(member.userId)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-gray-500">{member.email}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </div>
    </Card>
  );
}
