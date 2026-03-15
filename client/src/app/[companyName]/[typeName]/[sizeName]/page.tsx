import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCompanies, getTypes, getSizes, getCategories } from '@/lib/api';
import { nameToSlug } from '@/lib/url';
import { AUTH_COOKIE_NAME, getAuthTokenOrRedirect } from '@/lib/auth-cookie';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SkeletonGrid } from '@/components/SkeletonCard';
import type { Category } from '@/types';

export const dynamic = 'force-dynamic';

async function CategoryList({
  sizeId,
  companyName,
  typeName,
  sizeName,
  token,
}: {
  sizeId: string;
  companyName: string;
  typeName: string;
  sizeName: string;
  token: string;
}) {
  let categories: Category[];
  try {
    categories = await getCategories(sizeId, token);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-lg font-medium">Failed to load categories.</p>
        <p className="text-sm mt-1">Make sure the server is running.</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">🗂️</span>
        <p className="text-lg font-medium">No categories found for this size.</p>
        <Link
          href={`/${nameToSlug(companyName)}/${nameToSlug(typeName)}`}
          className="mt-4 text-sm text-amber-500 hover:underline font-medium"
        >
          ← Choose a different size
        </Link>
      </div>
    );
  }

  const base = `/${nameToSlug(companyName)}/${nameToSlug(typeName)}/${nameToSlug(sizeName)}`;
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {categories.map((cat: Category) => (
        <li key={cat.id}>
          <Link
            href={`${base}/${nameToSlug(cat.name)}`}
            prefetch={true}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl">🗂️</span>
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-center">
              {cat.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface PageProps {
  params: Promise<{ companyName: string; typeName: string; sizeName: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyName, typeName, sizeName } = await params;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { title: 'Categories – Tileswale Flipbook' };
  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    return { title: 'Categories – Tileswale Flipbook' };
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  const types = company ? await getTypes(company.id, token) : [];
  const type = types.find((t) => nameToSlug(t.name) === typeName);
  const sizes = type ? await getSizes(type.id, token) : [];
  const size = sizes.find((s) => nameToSlug(s.name) === sizeName);
  const c = company?.name ?? companyName;
  const t = type?.name ?? typeName;
  const s = size?.name ?? sizeName;
  return {
    title: `${c} – ${t} – ${s} – Categories – Tileswale Flipbook`,
    description: `Browse categories for ${s} at ${c}`,
  };
}

export default async function SizeCategoriesPage({ params }: PageProps) {
  const { companyName, typeName, sizeName } = await params;
  const token = await getAuthTokenOrRedirect();

  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    notFound();
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  if (!company) notFound();

  let types;
  try {
    types = await getTypes(company.id, token);
  } catch {
    notFound();
  }
  const type = types.find((t) => nameToSlug(t.name) === typeName);
  if (!type) notFound();

  let sizes;
  try {
    sizes = await getSizes(type.id, token);
  } catch {
    notFound();
  }
  const size = sizes.find((s) => nameToSlug(s.name) === sizeName);
  if (!size) notFound();

  const breadcrumbs = [
    { label: 'Companies', href: '/' },
    { label: company.name, href: `/${nameToSlug(company.name)}` },
    { label: type.name, href: `/${nameToSlug(company.name)}/${nameToSlug(type.name)}` },
    { label: size.name },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-8" />
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {company.name} – {type.name} – {size.name}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Select a <span className="font-semibold text-amber-500">category</span>
          </p>
        </div>
        <Suspense fallback={<SkeletonGrid count={8} />}>
          <CategoryList
            sizeId={size.id}
            companyName={company.name}
            typeName={type.name}
            sizeName={size.name}
            token={token}
          />
        </Suspense>
      </div>
    </main>
  );
}
