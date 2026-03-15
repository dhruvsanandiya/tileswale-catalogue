import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCompanies, getTypes, getSizes } from '@/lib/api';
import { nameToSlug } from '@/lib/url';
import { AUTH_COOKIE_NAME, getAuthTokenOrRedirect } from '@/lib/auth-cookie';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SkeletonGrid } from '@/components/SkeletonCard';
import type { Size } from '@/types';

export const dynamic = 'force-dynamic';

async function SizeList({
  typeId,
  companyName,
  typeName,
  token,
}: {
  typeId: string;
  companyName: string;
  typeName: string;
  token: string;
}) {
  let sizes: Size[];
  try {
    sizes = await getSizes(typeId, token);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-lg font-medium">Failed to load sizes.</p>
        <p className="text-sm mt-1">Make sure the server is running.</p>
      </div>
    );
  }

  if (sizes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">📐</span>
        <p className="text-lg font-medium">No sizes found for this type.</p>
        <Link
          href={`/${nameToSlug(companyName)}`}
          className="mt-4 text-sm text-amber-500 hover:underline font-medium"
        >
          ← Choose a different type
        </Link>
      </div>
    );
  }

  const base = `/${nameToSlug(companyName)}/${nameToSlug(typeName)}`;
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {sizes.map((size: Size) => (
        <li key={size.id}>
          <Link
            href={`${base}/${nameToSlug(size.name)}`}
            prefetch={true}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="text-3xl">📐</span>
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-center">
              {size.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface PageProps {
  params: Promise<{ companyName: string; typeName: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyName, typeName } = await params;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { title: 'Sizes – Tileswale Flipbook' };
  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    return { title: 'Sizes – Tileswale Flipbook' };
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  const types = company ? await getTypes(company.id, token) : [];
  const type = types.find((t) => nameToSlug(t.name) === typeName);
  const c = company?.name ?? companyName;
  const t = type?.name ?? typeName;
  return {
    title: `${c} – ${t} – Sizes – Tileswale Flipbook`,
    description: `Browse sizes for ${t} at ${c}`,
  };
}

export default async function TypeSizesPage({ params }: PageProps) {
  const { companyName, typeName } = await params;
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

  const breadcrumbs = [
    { label: 'Companies', href: '/' },
    { label: company.name, href: `/${nameToSlug(company.name)}` },
    { label: type.name },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-8" />
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            {company.name} – {type.name}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Select a <span className="font-semibold text-amber-500">size</span>
          </p>
        </div>
        <Suspense fallback={<SkeletonGrid count={8} />}>
          <SizeList
            typeId={type.id}
            companyName={company.name}
            typeName={type.name}
            token={token}
          />
        </Suspense>
      </div>
    </main>
  );
}
