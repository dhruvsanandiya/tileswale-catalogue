'use client';

import { useEffect, useState, useCallback } from 'react';

const API = (path: string, q?: Record<string, string>) => {
  const base = '/api/backend/' + path.replace(/^\//, '');
  if (!q || !Object.keys(q).length) return base;
  return base + '?' + new URLSearchParams(q).toString();
};
const opts = { credentials: 'include' as RequestCredentials };

type Company = { id: string; name: string };
type Type = { id: string; name: string; companyId: string };
type Size = { id: string; name: string; typeId: string };
type Category = { id: string; name: string; sizeId: string };
type Catalogue = {
  id: string;
  title: string;
  sizeId: string;
  categoryId: string;
  companyId: string;
  pdfUrl: string;
  coverImage: string;
};
type Product = {
  id: string;
  catalogueId: string;
  pageNumber: number;
  productName: string;
  image: string;
  description: string;
  xCoordinate: number;
  yCoordinate: number;
};

export default function CompanyAdminPage() {
  const [user, setUser] = useState<{
    role: string;
    companyId: string | null;
    company: Company | null;
  } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId = selectedCompanyId ?? user?.companyId ?? null;

  const loadUser = useCallback(async () => {
    const res = await fetch('/api/auth/me', opts);
    if (!res.ok) return null;
    return res.json();
  }, []);

  const loadCompanies = useCallback(async () => {
    const res = await fetch(API('companies'), opts);
    if (!res.ok) throw new Error('Failed to load companies');
    return res.json();
  }, []);

  const loadTypes = useCallback(async () => {
    if (!companyId) return [];
    const res = await fetch(API('types', { company_id: companyId }), opts);
    if (!res.ok) throw new Error('Failed to load types');
    return res.json();
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await loadUser();
        if (cancelled) return;
        setUser(u);
        if (u?.role === 'super_admin') {
          const list = await loadCompanies();
          if (cancelled) return;
          setCompanies(list);
          setSelectedCompanyId(list[0]?.id ?? null);
        } else if (u?.companyId) {
          setSelectedCompanyId(u.companyId);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUser, loadCompanies]);

  useEffect(() => {
    if (!companyId) {
      setTypes([]);
      return;
    }
    let cancelled = false;
    loadTypes().then((data) => {
      if (!cancelled) setTypes(data);
    });
    return () => {
      cancelled = true;
    };
  }, [companyId, loadTypes]);

  const refreshTypes = () => loadTypes().then(setTypes);

  // Card stack: which level we're viewing (null = top level)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(null);
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [selectedSizeName, setSelectedSizeName] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCatalogueTitle, setSelectedCatalogueTitle] = useState<string | null>(null);

  const loadSizes = useCallback(async (typeId: string) => {
    const res = await fetch(API('sizes', { type_id: typeId }), opts);
    if (!res.ok) throw new Error('Failed to load sizes');
    return res.json();
  }, []);

  const loadCategories = useCallback(async (sizeId: string) => {
    const res = await fetch(API('categories', { size_id: sizeId, all: '1' }), opts);
    if (!res.ok) throw new Error('Failed to load categories');
    return res.json();
  }, []);

  const loadCatalogues = useCallback(async (sizeId: string, categoryId: string) => {
    const res = await fetch(
      API('catalogues', { size_id: sizeId, category_id: categoryId }),
      opts
    );
    if (!res.ok) throw new Error('Failed to load catalogues');
    return res.json();
  }, []);

  const loadProducts = useCallback(async (catalogueId: string) => {
    const res = await fetch(API('products', { catalogue_id: catalogueId }), opts);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4">
        No company assigned. Contact super admin.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Admin</h1>

      {user.role === 'super_admin' && companies.length > 0 && (
        <section>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Act as company
          </label>
          <select
            value={selectedCompanyId ?? ''}
            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <CardStack
        companyId={companyId}
        types={types}
        onRefreshTypes={refreshTypes}
        selectedTypeId={selectedTypeId}
        selectedTypeName={selectedTypeName}
        setSelectedTypeId={setSelectedTypeId}
        setSelectedTypeName={setSelectedTypeName}
        selectedSizeId={selectedSizeId}
        selectedSizeName={selectedSizeName}
        setSelectedSizeId={setSelectedSizeId}
        setSelectedSizeName={setSelectedSizeName}
        selectedCategoryId={selectedCategoryId}
        selectedCategoryName={selectedCategoryName}
        setSelectedCategoryId={setSelectedCategoryId}
        setSelectedCategoryName={setSelectedCategoryName}
        selectedCatalogueId={selectedCatalogueId}
        selectedCatalogueTitle={selectedCatalogueTitle}
        setSelectedCatalogueId={setSelectedCatalogueId}
        setSelectedCatalogueTitle={setSelectedCatalogueTitle}
        loadSizes={loadSizes}
        loadCategories={loadCategories}
        loadCatalogues={loadCatalogues}
        loadProducts={loadProducts}
        setError={setError}
      />
    </div>
  );
}

const cardBase =
  'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden';
const cardHeader = 'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-5 py-3';
const cardBody = 'p-5';
const itemCard =
  'rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/40 p-3 flex items-center justify-between gap-3';

function CardStack({
  companyId,
  types,
  onRefreshTypes,
  selectedTypeId,
  selectedTypeName,
  setSelectedTypeId,
  setSelectedTypeName,
  selectedSizeId,
  selectedSizeName,
  setSelectedSizeId,
  setSelectedSizeName,
  selectedCategoryId,
  selectedCategoryName,
  setSelectedCategoryId,
  setSelectedCategoryName,
  selectedCatalogueId,
  selectedCatalogueTitle,
  setSelectedCatalogueId,
  setSelectedCatalogueTitle,
  loadSizes,
  loadCategories,
  loadCatalogues,
  loadProducts,
  setError,
}: {
  companyId: string;
  types: Type[];
  onRefreshTypes: () => void;
  selectedTypeId: string | null;
  selectedTypeName: string | null;
  setSelectedTypeId: (id: string | null) => void;
  setSelectedTypeName: (name: string | null) => void;
  selectedSizeId: string | null;
  selectedSizeName: string | null;
  setSelectedSizeId: (id: string | null) => void;
  setSelectedSizeName: (name: string | null) => void;
  selectedCategoryId: string | null;
  selectedCategoryName: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedCategoryName: (name: string | null) => void;
  selectedCatalogueId: string | null;
  selectedCatalogueTitle: string | null;
  setSelectedCatalogueId: (id: string | null) => void;
  setSelectedCatalogueTitle: (title: string | null) => void;
  loadSizes: (typeId: string) => Promise<Size[]>;
  loadCategories: (sizeId: string) => Promise<Category[]>;
  loadCatalogues: (sizeId: string, categoryId: string) => Promise<Catalogue[]>;
  loadProducts: (catalogueId: string) => Promise<Product[]>;
  setError: (e: string | null) => void;
}) {
  if (selectedCatalogueId) {
    return (
      <ProductsCard
        catalogueId={selectedCatalogueId}
        catalogueTitle={selectedCatalogueTitle}
        onBack={() => {
          setSelectedCatalogueId(null);
          setSelectedCatalogueTitle(null);
        }}
        loadProducts={loadProducts}
        setError={setError}
      />
    );
  }
  if (selectedCategoryId) {
    return (
      <CataloguesCard
        companyId={companyId}
        sizeId={selectedSizeId!}
        categoryId={selectedCategoryId}
        categoryName={selectedCategoryName}
        onBack={() => {
          setSelectedCategoryId(null);
          setSelectedCategoryName(null);
        }}
        loadCatalogues={loadCatalogues}
        loadProducts={loadProducts}
        onSelectCatalogue={(id, title) => {
          setSelectedCatalogueId(id);
          setSelectedCatalogueTitle(title);
        }}
        setError={setError}
      />
    );
  }
  if (selectedSizeId) {
    return (
      <CategoriesCard
        companyId={companyId}
        sizeId={selectedSizeId}
        sizeName={selectedSizeName}
        onBack={() => {
          setSelectedSizeId(null);
          setSelectedSizeName(null);
        }}
        loadCategories={loadCategories}
        loadCatalogues={loadCatalogues}
        loadProducts={loadProducts}
        onSelectCategory={(id, name) => {
          setSelectedCategoryId(id);
          setSelectedCategoryName(name);
        }}
        setError={setError}
      />
    );
  }
  if (selectedTypeId) {
    return (
      <SizesCard
        companyId={companyId}
        typeId={selectedTypeId}
        typeName={selectedTypeName}
        onBack={() => {
          setSelectedTypeId(null);
          setSelectedTypeName(null);
        }}
        loadSizes={loadSizes}
        loadCategories={loadCategories}
        loadCatalogues={loadCatalogues}
        loadProducts={loadProducts}
        onSelectSize={(id, name) => {
          setSelectedSizeId(id);
          setSelectedSizeName(name);
        }}
        setError={setError}
      />
    );
  }
  return (
    <TypesCard
      companyId={companyId}
      types={types}
      onRefresh={onRefreshTypes}
      onSelectType={(id, name) => {
        setSelectedTypeId(id);
        setSelectedTypeName(name);
      }}
      setError={setError}
    />
  );
}

function TypesCard({
  companyId,
  types,
  onRefresh,
  onSelectType,
  setError,
}: {
  companyId: string;
  types: Type[];
  onRefresh: () => void;
  onSelectType: (id: string, name: string) => void;
  setError: (e: string | null) => void;
}) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const createType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API('types'), {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), company_id: companyId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setNewName('');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const updateType = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      const res = await fetch(API(`types/${id}`), {
        ...opts,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const deleteType = async (id: string, name: string) => {
    if (!confirm(`Delete type "${name}" and all its sizes/categories/catalogues?`)) return;
    setError(null);
    try {
      const res = await fetch(API(`types/${id}`), { ...opts, method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <section className={cardBase}>
      <div className={cardHeader}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Types</h2>
      </div>
      <div className={cardBody}>
        <form onSubmit={createType} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New type name"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 flex-1 max-w-xs"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2"
          >
            {creating ? 'Adding…' : 'Add type'}
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <div key={t.id} className={itemCard}>
              {editingId === t.id ? (
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm flex-1 min-w-0"
                    autoFocus
                  />
                  <button type="button" onClick={() => updateType(t.id)} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                    Save
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setEditName(''); }} className="text-sm text-gray-500 hover:underline">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectType(t.id, t.name)}
                    className="font-medium text-gray-900 dark:text-white text-left flex-1 min-w-0 truncate"
                  >
                    {t.name}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="text-sm text-gray-500 hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteType(t.id, t.name)} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {types.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No types. Add one above.</p>
        )}
      </div>
    </section>
  );
}

function SizesCard({
  typeId,
  typeName,
  onBack,
  loadSizes,
  onSelectSize,
  setError,
}: {
  companyId: string;
  typeId: string;
  typeName: string | null;
  onBack: () => void;
  loadSizes: (typeId: string) => Promise<Size[]>;
  loadCategories: (sizeId: string) => Promise<Category[]>;
  loadCatalogues: (sizeId: string, categoryId: string) => Promise<Catalogue[]>;
  loadProducts: (catalogueId: string) => Promise<Product[]>;
  onSelectSize: (id: string, name: string) => void;
  setError: (e: string | null) => void;
}) {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editSizeName, setEditSizeName] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSizes(typeId).then((data) => {
      if (!cancelled) {
        setSizes(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [typeId, loadSizes]);

  const addSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API('sizes'), {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), type_id: typeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setNewName('');
      const data = await loadSizes(typeId);
      setSizes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const updateSize = async (id: string) => {
    if (!editSizeName.trim()) return;
    setError(null);
    try {
      const res = await fetch(API(`sizes/${id}`), {
        ...opts,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSizeName.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setEditingSizeId(null);
      setSizes(await loadSizes(typeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const deleteSize = async (id: string, name: string) => {
    if (!confirm(`Delete size "${name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(API(`sizes/${id}`), { ...opts, method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSizes(await loadSizes(typeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <section className={cardBase}>
        <div className={cardHeader}><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sizes</h2></div>
        <div className={cardBody}><p className="text-sm text-gray-500">Loading sizes…</p></div>
      </section>
    );
  }

  return (
    <section className={cardBase}>
      <div className={cardHeader}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-amber-600 dark:hover:text-amber-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sizes{typeName ? ` · ${typeName}` : ''}
          </h2>
        </div>
      </div>
      <div className={cardBody}>
        <form onSubmit={addSize} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New size"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 flex-1 max-w-[200px]"
          />
          <button type="submit" disabled={creating} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2">
            {creating ? 'Adding…' : 'Add size'}
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sizes.map((s) => (
            <div key={s.id} className={itemCard}>
              {editingSizeId === s.id ? (
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editSizeName}
                    onChange={(e) => setEditSizeName(e.target.value)}
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm flex-1 min-w-0"
                    autoFocus
                  />
                  <button type="button" onClick={() => updateSize(s.id)} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">Save</button>
                  <button type="button" onClick={() => { setEditingSizeId(null); setEditSizeName(''); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => onSelectSize(s.id, s.name)} className="font-medium text-gray-900 dark:text-white text-left flex-1 min-w-0 truncate">
                    {s.name}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditingSizeId(s.id); setEditSizeName(s.name); }} className="text-sm text-gray-500 hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteSize(s.id, s.name)} className="text-sm text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {sizes.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No sizes. Add one above.</p>}
      </div>
    </section>
  );
}

function CategoriesCard({
  sizeId,
  sizeName,
  onBack,
  loadCategories,
  onSelectCategory,
  setError,
}: {
  companyId: string;
  sizeId: string;
  sizeName: string | null;
  onBack: () => void;
  loadCategories: (sizeId: string) => Promise<Category[]>;
  loadCatalogues: (sizeId: string, categoryId: string) => Promise<Catalogue[]>;
  loadProducts: (catalogueId: string) => Promise<Product[]>;
  onSelectCategory: (id: string, name: string) => void;
  setError: (e: string | null) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCategories(sizeId).then((data) => {
      if (!cancelled) {
        setCategories(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [sizeId, loadCategories]);

  const updateCategory = async (id: string) => {
    if (!editCategoryName.trim()) return;
    setError(null);
    try {
      const res = await fetch(API(`categories/${id}`), {
        ...opts,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setEditingCategoryId(null);
      setCategories(await loadCategories(sizeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API('categories'), {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), size_id: sizeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setNewName('');
      setCategories(await loadCategories(sizeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(API(`categories/${id}`), { ...opts, method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setCategories(await loadCategories(sizeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <section className={cardBase}>
        <div className={cardHeader}><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h2></div>
        <div className={cardBody}><p className="text-sm text-gray-500">Loading categories…</p></div>
      </section>
    );
  }

  return (
    <section className={cardBase}>
      <div className={cardHeader}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-amber-600 dark:hover:text-amber-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Categories{sizeName ? ` · ${sizeName}` : ''}
          </h2>
        </div>
      </div>
      <div className={cardBody}>
        <form onSubmit={addCategory} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 flex-1 max-w-[200px]"
          />
          <button type="submit" disabled={creating} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2">
            {creating ? 'Adding…' : 'Add category'}
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className={itemCard}>
              {editingCategoryId === c.id ? (
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm flex-1 min-w-0"
                    autoFocus
                  />
                  <button type="button" onClick={() => updateCategory(c.id)} className="text-sm text-amber-600 dark:text-amber-400 hover:underline">Save</button>
                  <button type="button" onClick={() => { setEditingCategoryId(null); setEditCategoryName(''); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => onSelectCategory(c.id, c.name)} className="font-medium text-gray-900 dark:text-white text-left flex-1 min-w-0 truncate">
                    {c.name}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditingCategoryId(c.id); setEditCategoryName(c.name); }} className="text-sm text-gray-500 hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteCategory(c.id, c.name)} className="text-sm text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {categories.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No categories. Add one above.</p>}
      </div>
    </section>
  );
}

function CataloguesCard({
  companyId,
  sizeId,
  categoryId,
  categoryName,
  onBack,
  loadCatalogues,
  onSelectCatalogue,
  setError,
}: {
  companyId: string;
  sizeId: string;
  categoryId: string;
  categoryName: string | null;
  onBack: () => void;
  loadCatalogues: (sizeId: string, categoryId: string) => Promise<Catalogue[]>;
  loadProducts: (catalogueId: string) => Promise<Product[]>;
  onSelectCatalogue: (id: string, title: string) => void;
  setError: (e: string | null) => void;
}) {
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingCatalogueId, setEditingCatalogueId] = useState<string | null>(null);
  const [editCatalogueTitle, setEditCatalogueTitle] = useState('');
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);

  const refresh = () => loadCatalogues(sizeId, categoryId).then(setCatalogues);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCatalogues(sizeId, categoryId).then((data) => {
      if (!cancelled) {
        setCatalogues(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [sizeId, categoryId, loadCatalogues]);

  const addCatalogue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPdfFile || !newCoverFile) {
      setError('Title, PDF file and cover image file are required.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('title', newTitle.trim());
      formData.set('size_id', sizeId);
      formData.set('category_id', categoryId);
      formData.set('company_id', companyId);
      formData.set('pdf', newPdfFile);
      formData.set('cover_image', newCoverFile);
      const res = await fetch(API('catalogues'), {
        ...opts,
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setNewTitle('');
      setNewPdfFile(null);
      setNewCoverFile(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const updateCatalogue = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editCatalogueTitle.trim()) return;
    setError(null);
    try {
      if (editPdfFile || editCoverFile) {
        const formData = new FormData();
        formData.set('title', editCatalogueTitle.trim());
        if (editPdfFile) formData.set('pdf', editPdfFile);
        if (editCoverFile) formData.set('cover_image', editCoverFile);
        const res = await fetch(API(`catalogues/${id}`), {
          ...opts,
          method: 'PATCH',
          body: formData,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.message ?? 'Failed');
        }
      } else {
        const res = await fetch(API(`catalogues/${id}`), {
          ...opts,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editCatalogueTitle.trim() }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.message ?? 'Failed');
        }
      }
      setEditingCatalogueId(null);
      setEditCatalogueTitle('');
      setEditPdfFile(null);
      setEditCoverFile(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const deleteCatalogue = async (id: string, title: string) => {
    if (!confirm(`Delete catalogue "${title}"?`)) return;
    setError(null);
    try {
      const res = await fetch(API(`catalogues/${id}`), { ...opts, method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <section className={cardBase}>
        <div className={cardHeader}><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Catalogues</h2></div>
        <div className={cardBody}><p className="text-sm text-gray-500">Loading catalogues…</p></div>
      </section>
    );
  }

  return (
    <section className={cardBase}>
      <div className={cardHeader}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-amber-600 dark:hover:text-amber-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Catalogues{categoryName ? ` · ${categoryName}` : ''}
          </h2>
        </div>
      </div>
      <div className={cardBody}>
        <form onSubmit={addCatalogue} className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[180px]"
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            PDF:
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setNewPdfFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            Cover:
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setNewCoverFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              required
            />
          </label>
          <button type="submit" disabled={creating} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2">
            {creating ? 'Adding…' : 'Add catalogue'}
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogues.map((cat) => (
            <div key={cat.id} className={itemCard}>
              {editingCatalogueId === cat.id ? (
                <form onSubmit={(e) => updateCatalogue(e, cat.id)} className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editCatalogueTitle}
                    onChange={(e) => setEditCatalogueTitle(e.target.value)}
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm flex-1 min-w-0"
                    required
                  />
                  <label className="text-xs text-gray-500">PDF: <input type="file" accept=".pdf,application/pdf" onChange={(e) => setEditPdfFile(e.target.files?.[0] ?? null)} className="ml-1 text-xs" /></label>
                  <label className="text-xs text-gray-500">Cover: <input type="file" accept="image/*" onChange={(e) => setEditCoverFile(e.target.files?.[0] ?? null)} className="ml-1 text-xs" /></label>
                  <button type="submit" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">Save</button>
                  <button type="button" onClick={() => { setEditingCatalogueId(null); setEditCatalogueTitle(''); setEditPdfFile(null); setEditCoverFile(null); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
                </form>
              ) : (
                <>
                  <button type="button" onClick={() => onSelectCatalogue(cat.id, cat.title)} className="font-medium text-gray-900 dark:text-white text-left flex-1 min-w-0 truncate">
                    {cat.title}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { setEditingCatalogueId(cat.id); setEditCatalogueTitle(cat.title); setEditPdfFile(null); setEditCoverFile(null); }} className="text-sm text-gray-500 hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteCatalogue(cat.id, cat.title)} className="text-sm text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {catalogues.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No catalogues in this category. Add one above.</p>}
      </div>
    </section>
  );
}

function ProductsCard({
  catalogueId,
  catalogueTitle,
  onBack,
  loadProducts,
  setError,
}: {
  catalogueId: string;
  catalogueTitle: string | null;
  onBack: () => void;
  loadProducts: (catalogueId: string) => Promise<Product[]>;
  setError: (e: string | null) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    page_number: 1,
    product_name: '',
    image: '',
    description: '',
    x_coordinate: 0,
    y_coordinate: 0,
  });

  const refresh = () => loadProducts(catalogueId).then(setProducts);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProducts(catalogueId).then((data) => {
      if (!cancelled) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [catalogueId, loadProducts]);

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.product_name.trim() || !newProduct.image.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API('products'), {
        ...opts,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogue_id: catalogueId,
          page_number: newProduct.page_number,
          product_name: newProduct.product_name.trim(),
          image: newProduct.image.trim(),
          description: newProduct.description,
          x_coordinate: newProduct.x_coordinate,
          y_coordinate: newProduct.y_coordinate,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? 'Failed');
      }
      setNewProduct({
        page_number: newProduct.page_number,
        product_name: '',
        image: '',
        description: '',
        x_coordinate: 0,
        y_coordinate: 0,
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    setError(null);
    try {
      const res = await fetch(API(`products/${id}`), { ...opts, method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <section className={cardBase}>
        <div className={cardHeader}><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Products</h2></div>
        <div className={cardBody}><p className="text-sm text-gray-500">Loading products…</p></div>
      </section>
    );
  }

  return (
    <section className={cardBase}>
      <div className={cardHeader}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-amber-600 dark:hover:text-amber-400">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Products{catalogueTitle ? ` · ${catalogueTitle}` : ''}
          </h2>
        </div>
      </div>
      <div className={cardBody}>
        <form onSubmit={addProduct} className="flex flex-wrap gap-2 mb-5">
          <input
            type="number"
            min={1}
            value={newProduct.page_number}
            onChange={(e) => setNewProduct((p) => ({ ...p, page_number: parseInt(e.target.value, 10) || 1 }))}
            placeholder="Page"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 w-16 text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={newProduct.product_name}
            onChange={(e) => setNewProduct((p) => ({ ...p, product_name: e.target.value }))}
            placeholder="Product name"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[120px] text-gray-900 dark:text-gray-100"
          />
          <input
            type="url"
            value={newProduct.image}
            onChange={(e) => setNewProduct((p) => ({ ...p, image: e.target.value }))}
            placeholder="Image URL"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[120px] text-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            value={newProduct.description}
            onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[100px] text-gray-900 dark:text-gray-100"
          />
          <input
            type="number"
            step="any"
            value={newProduct.x_coordinate}
            onChange={(e) => setNewProduct((p) => ({ ...p, x_coordinate: parseFloat(e.target.value) || 0 }))}
            placeholder="X"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 w-20 text-gray-900 dark:text-gray-100"
          />
          <input
            type="number"
            step="any"
            value={newProduct.y_coordinate}
            onChange={(e) => setNewProduct((p) => ({ ...p, y_coordinate: parseFloat(e.target.value) || 0 }))}
            placeholder="Y"
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 w-20 text-gray-900 dark:text-gray-100"
          />
          <button type="submit" disabled={creating} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium px-4 py-2">
            {creating ? 'Adding…' : 'Add product'}
          </button>
        </form>
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id} className={`${itemCard} py-2`}>
              <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0">{p.productName} (p{p.pageNumber})</span>
              <button type="button" onClick={() => deleteProduct(p.id)} className="text-sm text-red-600 dark:text-red-400 hover:underline shrink-0">
                Delete
              </button>
            </li>
          ))}
        </ul>
        {products.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No products. Add one above.</p>}
      </div>
    </section>
  );
}
