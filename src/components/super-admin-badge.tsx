'use client';

import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SuperAdminBadge() {
  return (
    <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 gap-1 mt-1">
      <Shield className="h-3 w-3" />
      Super Admin
    </Badge>
  );
}
