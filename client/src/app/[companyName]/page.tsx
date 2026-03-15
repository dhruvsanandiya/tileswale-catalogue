import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCompanies, getTypes } from '@/lib/api';
import { nameToSlug } from '@/lib/url';
import { AUTH_COOKIE_NAME, getAuthTokenOrRedirect } from '@/lib/auth-cookie';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SkeletonGrid } from '@/components/SkeletonCard';
import type { Type } from '@/types';

export const dynamic = 'force-dynamic';

async function TypeList({
  companyId,
  companyName,
  token,
}: {
  companyId: string;
  companyName: string;
  token: string;
}) {
  let types: Type[];
  try {
    types = await getTypes(companyId, token);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-lg font-medium">Failed to load tile types.</p>
        <p className="text-sm mt-1">Make sure the server is running.</p>
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">📐</span>
        <p className="text-lg font-medium">No types found for this company.</p>
        <Link
          href="/"
          className="mt-4 text-sm text-amber-500 hover:underline font-medium"
        >
          ← Choose a different company
        </Link>
      </div>
    );
  }

  const base = `/${nameToSlug(companyName)}`;
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {types.map((t: Type) => (
        <li key={t.id}>
          <Link
            href={`${base}/${nameToSlug(t.name)}`}
            prefetch={true}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl">📐</span>
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-center">
              {t.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface PageProps {
  params: Promise<{ companyName: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyName } = await params;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { title: 'Tile types – Tileswale Flipbook' };
  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    return { title: 'Tile types – Tileswale Flipbook' };
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  const name = company?.name ?? companyName;
  return {
    title: `${name} – Tile types – Tileswale Flipbook`,
    description: `Browse tile types for ${name}`,
  };
}

export default async function CompanyTypesPage({ params }: PageProps) {
  const { companyName } = await params;
  const token = await getAuthTokenOrRedirect();

  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    notFound();
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  if (!company) notFound();

  const breadcrumbs = [
    { label: 'Companies', href: '/' },
    { label: company.name },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-8" />
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {company.name}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Select a tile <span className="font-semibold text-amber-500">type</span> (e.g. wall, floor)
          </p>
        </div>
        <Suspense fallback={<SkeletonGrid count={8} />}>
          <TypeList companyId={company.id} companyName={company.name} token={token} />
        </Suspense>
      </div>
    </main>
  );
}
