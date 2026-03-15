'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
  companyId?: string | null;
  company?: { id: string; name: string } | null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          router.replace('/login?from=' + encodeURIComponent(pathname || '/admin'));
          return;
        }
        setUser(data);
        const role = data.role;
        const isSuper = pathname?.startsWith('/admin/super');
        const isCompany = pathname?.startsWith('/admin/company');
        if (isSuper && role !== 'super_admin') {
          router.replace('/');
          return;
        }
        if (isCompany && role !== 'company_admin' && role !== 'super_admin') {
          router.replace('/');
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login?from=' + encodeURIComponent(pathname || '/admin'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  const isSuper = pathname?.startsWith('/admin/super');
  const isCompany = pathname?.startsWith('/admin/company');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
          >
            ← Back to app
          </Link>
          {user.role === 'super_admin' && (
            <>
              <Link
                href="/admin/super"
                className={`text-sm font-medium ${isSuper ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Super Admin
              </Link>
              <Link
                href="/admin/company"
                className={`text-sm font-medium ${isCompany ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Company Admin
              </Link>
            </>
          )}
          {user.role === 'company_admin' && (
            <Link
              href="/admin/company"
              className={`text-sm font-medium ${isCompany ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Company Admin
            </Link>
          )}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
