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
import { UserPlus, UserMinus, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AssignmentButtonProps {
  questionId: string;
  rfpId: string;
  slug: string;
  currentAssignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  onAssigned?: () => void;
}

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export function AssignmentButton({
  questionId,
  rfpId,
  slug,
  currentAssignee,
  size = 'sm',
  variant = 'outline',
  onAssigned,
}: AssignmentButtonProps) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [slug]);

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

  const handleAssign = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign question');
      }

      router.refresh();
      onAssigned?.();
    } catch (error) {
      console.error('Assignment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${slug}/rfps/${rfpId}/questions/${questionId}/assign`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unassign question');
      }

      router.refresh();
      onAssigned?.();
    } catch (error) {
      console.error('Unassignment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button size={size} variant={variant} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant}>
          {currentAssignee ? (
            <>
              <User className="h-4 w-4 mr-2" />
              {currentAssignee.name}
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Assigner
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {currentAssignee ? 'Réassigner à' : 'Assigner à'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isFetching ? (
          <DropdownMenuItem disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement...
          </DropdownMenuItem>
        ) : members.length === 0 ? (
          <DropdownMenuItem disabled>Aucun membre disponible</DropdownMenuItem>
        ) : (
          members.map((member) => (
            <DropdownMenuItem
              key={member.userId}
              onClick={() => handleAssign(member.userId)}
              disabled={currentAssignee?.id === member.userId}
            >
              <div className="flex flex-col">
                <span className="font-medium">{member.name}</span>
                <span className="text-xs text-gray-500">{member.email}</span>
              </div>
            </DropdownMenuItem>
          ))
        )}
        {currentAssignee && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleUnassign} className="text-red-600">
              <UserMinus className="h-4 w-4 mr-2" />
              Désassigner
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
