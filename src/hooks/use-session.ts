import { useState, useEffect } from 'react';

interface User {
  id: string;
  name?: string;
  email?: string;
  isSuperAdmin: boolean;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch session from Next-Auth
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return { user, loading };
}
