'use client';

import { useEffect, useState, useCallback } from 'react';
import { resolveUploadUrl } from '@/lib/api';

type Company = { id: string; name: string; logoUrl?: string | null };
type CompanyAdmin = {
  id: string;
  email: string;
  role: string;
  companyId: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
};

const opts = { credentials: 'include' as RequestCredentials };

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [admins, setAdmins] = useState<CompanyAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create company form
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyLogoFile, setNewCompanyLogoFile] = useState<File | null>(null);
  const [creatingCompany, setCreatingCompany] = useState(false);
  // Edit company
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyLogoFile, setEditCompanyLogoFile] = useState<File | null>(null);

  // Create company admin form
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminCompanyId, setNewAdminCompanyId] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Reset password
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [companiesRes, adminsRes] = await Promise.all([
      fetch('/api/companies', opts),
      fetch('/api/admin/users', opts),
    ]);
    if (!companiesRes.ok || !adminsRes.ok) throw new Error('Failed to load data');
    const [companiesData, adminsData] = await Promise.all([
      companiesRes.json(),
      adminsRes.json(),
    ]);
    setCompanies(companiesData);
    setAdmins(adminsData);
    if (companiesData.length && !newAdminCompanyId) setNewAdminCompanyId(companiesData[0].id);
  }, [newAdminCompanyId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          setError('Not authenticated');
          return;
        }
        const user = await res.json();
        if (user.role !== 'super_admin') {
          setError('Access denied');
          return;
        }
        await fetchData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const refresh = async () => {
    try {
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
    }
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCreatingCompany(true);
    try {
      if (newCompanyLogoFile) {
        const formData = new FormData();
        formData.set('name', newCompanyName.trim());
        formData.set('logo', newCompanyLogoFile);
        const res = await fetch('/api/companies', {
          ...opts,
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Failed to create company');
        }
      } else {
        const res = await fetch('/api/companies', {
          ...opts,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCompanyName.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Failed to create company');
        }
      }
      setNewCompanyName('');
      setNewCompanyLogoFile(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreatingCompany(false);
    }
  };

  const updateCompany = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const name = editCompanyName.trim();
    if (!name) return;
    setError(null);
    try {
      if (editCompanyLogoFile) {
        const formData = new FormData();
        formData.set('name', name);
        formData.set('logo', editCompanyLogoFile);
        const res = await fetch(`/api/companies/${id}`, {
          ...opts,
          method: 'PATCH',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Failed to update');
        }
      } else {
        const res = await fetch(`/api/companies/${id}`, {
          ...opts,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Failed to update');
        }
      }
      setEditingCompanyId(null);
      setEditCompanyName('');
      setEditCompanyLogoFile(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const deleteCompany = async (id: string, name: string) => {
    if (!confirm(`Delete company "${name}"? This will remove all related data.`)) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { ...opts, method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Failed to delete');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const createCompanyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminPassword || !newAdminCompanyId) return;
    if (newAdminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setCreatingAdmin(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
          companyId: newAdminCompanyId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Failed to create admin');
      }
      setNewAdminEmail('');
      setNewAdminPassword('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const resetPassword = async (userId: string) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setResettingUserId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Failed to reset password');
      }
      setResetPasswordUserId(null);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setResettingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error && !companies.length && !admins.length) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin</h1>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Companies</h2>
        <form onSubmit={createCompany} className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Company name"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 min-w-[200px]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Logo (optional, image file)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewCompanyLogoFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 max-w-[220px]"
            />
          </div>
          <button
            type="submit"
            disabled={creatingCompany}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2"
          >
            {creatingCompany ? 'Creating…' : 'Create company'}
          </button>
        </form>
        <ul className="space-y-2">
          {companies.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
            >
              {editingCompanyId === c.id ? (
                <form
                  onSubmit={(e) => updateCompany(e, c.id)}
                  className="flex flex-wrap items-end gap-3 flex-1"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm min-w-[160px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">New logo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditCompanyLogoFile(e.target.files?.[0] ?? null)}
                      className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
                    />
                  </div>
                  <button type="submit" className="rounded bg-amber-500 text-white text-sm px-3 py-1.5">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompanyId(null);
                      setEditCompanyName('');
                      setEditCompanyLogoFile(null);
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic upload URL
                      <img
                        src={resolveUploadUrl(c.logoUrl)}
                        alt=""
                        className="h-8 w-8 rounded object-contain bg-gray-100 dark:bg-gray-800"
                      />
                    ) : null}
                    <span className="font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCompanyId(c.id);
                        setEditCompanyName(c.name);
                        setEditCompanyLogoFile(null);
                      }}
                      className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCompany(c.id, c.name)}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {companies.length === 0 && (
            <li className="text-sm text-gray-500 dark:text-gray-400">No companies yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Company Admins
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Passwords are stored hashed. Use &quot;Reset password&quot; to set a new one.
        </p>
        <form onSubmit={createCompanyAdmin} className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@company.com"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password (min 6)
            </label>
            <input
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="••••••••"
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company
            </label>
            <select
              value={newAdminCompanyId}
              onChange={(e) => setNewAdminCompanyId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creatingAdmin || companies.length === 0}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2"
          >
            {creatingAdmin ? 'Creating…' : 'Create company admin'}
          </button>
        </form>
        <ul className="space-y-3">
          {admins.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{a.email}</span>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {a.company?.name ?? '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {resetPasswordUserId === a.id ? (
                  <>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6)"
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => resetPassword(a.id)}
                      disabled={resettingUserId === a.id || newPassword.length < 6}
                      className="text-sm text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordUserId(null);
                        setNewPassword('');
                      }}
                      className="text-sm text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResetPasswordUserId(a.id)}
                    className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Reset password
                  </button>
                )}
              </div>
            </li>
          ))}
          {admins.length === 0 && (
            <li className="text-sm text-gray-500 dark:text-gray-400">No company admins yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
