'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  company?: { id: string; name: string; logoUrl?: string | null } | null;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/login') {
      setLoading(false);
      setUser(null);
      return;
    }
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setUser(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
    router.refresh();
  };

  if (pathname === '/login') return null;

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80" suppressHydrationWarning>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between" suppressHydrationWarning>
        <a href="/" className="text-lg font-semibold text-gray-900 dark:text-white">
          Tileswale Flipbook
        </a>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : user ? (
            <>
              {(user.role === 'super_admin' || user.role === 'company_admin') && (
                <a
                  href={user.role === 'super_admin' ? '/admin/super' : '/admin/company'}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
                >
                  Admin
                </a>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[180px]" title={user.email}>
                {user.email}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {user.role === 'super_admin' ? 'Super Admin' : user.company?.name ?? 'Company Admin'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
