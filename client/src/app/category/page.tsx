import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCategories } from '@/lib/api';
import type { Category } from '@/types';
import { SkeletonGrid } from '@/components/SkeletonCard';

export const metadata: Metadata = {
  title: 'Tileswale Flipbook – Select Category',
  description: 'Browse tile catalogues by category',
};

export const dynamic = 'force-dynamic';

// ─── Data Component (RSC) ─────────────────────────────────────────────────────

async function CategoryList({ sizeId }: { sizeId: string }) {
  let categories: Category[];
  try {
    categories = await getCategories(sizeId);
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
        <span className="text-5xl mb-4">📂</span>
        <p className="text-lg font-medium">No categories found for this size.</p>
        <Link
          href="/"
          className="mt-4 text-sm text-amber-500 hover:underline font-medium"
        >
          ← Choose a different size
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {categories.map((cat: Category) => (
        <li key={cat.id}>
          <Link
            href={`/catalogues?size_id=${sizeId}&category_id=${cat.id}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ size_id?: string }>;
}

export default async function CategoryPage({ searchParams }: PageProps) {
  const { size_id } = await searchParams;

  if (!size_id) {
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
          <span className="text-gray-700 dark:text-gray-200 font-semibold">Categories</span>
        </nav>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Select a Category
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Choose a <span className="font-semibold text-amber-500">category</span> to browse catalogues
          </p>
        </div>

        <Suspense fallback={<SkeletonGrid count={8} />}>
          <CategoryList sizeId={size_id} />
        </Suspense>
      </div>
    </main>
  );
}
