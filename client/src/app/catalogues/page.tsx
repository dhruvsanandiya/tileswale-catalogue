import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCatalogues } from '@/lib/api';
import type { Catalogue } from '@/types';
import { SkeletonGrid } from '@/components/SkeletonCard';

export const metadata: Metadata = {
  title: 'Tileswale Flipbook – Catalogues',
  description: 'Browse tile catalogues',
};

export const dynamic = 'force-dynamic';

// ─── Data Component (RSC) ─────────────────────────────────────────────────────

async function CatalogueList({
  sizeId,
  categoryId,
}: {
  sizeId: string;
  categoryId: string;
}) {
  let catalogues: Catalogue[];
  try {
    catalogues = await getCatalogues(sizeId, categoryId);
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
          href={`/category?size_id=${sizeId}`}
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
            {/* Cover image */}
            <div className="relative h-40 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-800 dark:to-gray-700">
              {catalogue.coverImage ? (
                <Image
                  src={catalogue.coverImage}
                  alt={catalogue.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-5xl opacity-40">🗃️</span>
                </div>
              )}
            </div>

            {/* Card body */}
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

              {/* Flipbook button */}
              <Link
                href={`/flipbook/${catalogue.id}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ size_id?: string; category_id?: string }>;
}

export default async function CataloguesPage({ searchParams }: PageProps) {
  const { size_id, category_id } = await searchParams;

  if (!size_id || !category_id) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-amber-500 transition-colors font-medium">
            Sizes
          </Link>
          <span>/</span>
          <Link
            href={`/category?size_id=${size_id}`}
            className="hover:text-amber-500 transition-colors font-medium"
          >
            Categories
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200 font-semibold">Catalogues</span>
        </nav>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Catalogues
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Browse and open a <span className="font-semibold text-amber-500">catalogue</span>
          </p>
        </div>

        <Suspense fallback={<SkeletonGrid count={6} />}>
          <CatalogueList sizeId={size_id} categoryId={category_id} />
        </Suspense>
      </div>
    </main>
  );
}
