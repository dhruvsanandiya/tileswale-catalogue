import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  getCompanies,
  getTypes,
  getSizes,
  getCategories,
  getCatalogues,
  resolveUploadUrl,
} from '@/lib/api';
import { nameToSlug } from '@/lib/url';
import { AUTH_COOKIE_NAME, getAuthTokenOrRedirect } from '@/lib/auth-cookie';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SkeletonGrid } from '@/components/SkeletonCard';
import type { Catalogue } from '@/types';

export const dynamic = 'force-dynamic';

async function CatalogueList({
  sizeId,
  categoryId,
  companyName,
  typeName,
  sizeName,
  categoryName,
  token,
}: {
  sizeId: string;
  categoryId: string;
  companyName: string;
  typeName: string;
  sizeName: string;
  categoryName: string;
  token: string;
}) {
  let catalogues: Catalogue[];
  try {
    catalogues = await getCatalogues(sizeId, categoryId, token);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-lg font-medium">Failed to load catalogues.</p>
        <p className="text-sm mt-1">Make sure the server is running.</p>
      </div>
    );
  }

  if (catalogues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">📋</span>
        <p className="text-lg font-medium">No catalogues found.</p>
        <Link
          href={`/${nameToSlug(companyName)}/${nameToSlug(typeName)}/${nameToSlug(sizeName)}`}
          className="mt-4 text-sm text-amber-500 hover:underline font-medium"
        >
          ← Choose a different category
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {catalogues.map((catalogue: Catalogue) => (
        <li key={catalogue.id}>
          <div className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-lg hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200">
            <div className="relative h-40 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-800 dark:to-gray-700">
              {catalogue.coverImage ? (
                <Image
                  src={resolveUploadUrl(catalogue.coverImage)}
                  alt={catalogue.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-5xl opacity-40">🗃️</span>
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {catalogue.title}
              </h2>
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-2.5 py-0.5">
                  📐 {catalogue.size.name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5">
                  🗂️ {catalogue.category.name}
                </span>
              </div>
              <Link
                href={`/${nameToSlug(companyName)}/${nameToSlug(typeName)}/${nameToSlug(sizeName)}/${nameToSlug(categoryName)}/${nameToSlug(catalogue.title)}/flipbook/${catalogue.id}`}
                prefetch={true}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-semibold px-3 py-2 transition-colors shadow-sm"
              >
                📖 View Flipbook →
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface PageProps {
  params: Promise<{
    companyName: string;
    typeName: string;
    sizeName: string;
    categoryName: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyName, typeName, sizeName, categoryName } = await params;
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { title: 'Catalogues – Tileswale Flipbook' };
  let companies;
  try {
    companies = await getCompanies(token);
  } catch {
    return { title: 'Catalogues – Tileswale Flipbook' };
  }
  const company = companies.find((c) => nameToSlug(c.name) === companyName);
  const types = company ? await getTypes(company.id, token) : [];
  const type = types.find((t) => nameToSlug(t.name) === typeName);
  const sizes = type ? await getSizes(type.id, token) : [];
  const size = sizes.find((s) => nameToSlug(s.name) === sizeName);
  const categories = size ? await getCategories(size.id, token) : [];
  const category = categories.find((c) => nameToSlug(c.name) === categoryName);
  const c = company?.name ?? companyName;
  const cat = category?.name ?? categoryName;
  return {
    title: `${c} – ${cat} – Catalogues – Tileswale Flipbook`,
    description: `Browse catalogues for ${cat} at ${c}`,
  };
}

export default async function CategoryCataloguesPage({ params }: PageProps) {
  const { companyName, typeName, sizeName, categoryName } = await params;
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

  let categories;
  try {
    categories = await getCategories(size.id, token);
  } catch {
    notFound();
  }
  const category = categories.find((c) => nameToSlug(c.name) === categoryName);
  if (!category) notFound();

  const breadcrumbs = [
    { label: 'Companies', href: '/' },
    { label: company.name, href: `/${nameToSlug(company.name)}` },
    {
      label: type.name,
      href: `/${nameToSlug(company.name)}/${nameToSlug(type.name)}`,
    },
    {
      label: size.name,
      href: `/${nameToSlug(company.name)}/${nameToSlug(type.name)}/${nameToSlug(size.name)}`,
    },
    { label: category.name },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <Breadcrumbs items={breadcrumbs} className="mb-8" />
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Catalogues
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            {company.name} – {type.name} – {size.name} –{' '}
            <span className="font-semibold text-amber-500">{category.name}</span>
          </p>
        </div>
        <Suspense fallback={<SkeletonGrid count={6} />}>
          <CatalogueList
            sizeId={size.id}
            categoryId={category.id}
            companyName={company.name}
            typeName={type.name}
            sizeName={size.name}
            categoryName={category.name}
            token={token}
          />
        </Suspense>
      </div>
    </main>
  );
}
