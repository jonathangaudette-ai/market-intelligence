'use client';

import { Shield } from 'lucide-react';

export function SuperAdminBadge() {
  return (
    <div className="flex items-center gap-1 text-xs text-teal-600 mt-1">
      <Shield className="h-3 w-3" />
      <span className="font-medium">Super Admin</span>
    </div>
  );
}
