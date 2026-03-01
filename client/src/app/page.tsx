import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getSizes } from '@/lib/api';
import type { Size } from '@/types';
import { SkeletonGrid } from '@/components/SkeletonCard';

export const metadata: Metadata = {
  title: 'Tileswale Flipbook – Select Size',
  description: 'Browse tile catalogues by size',
};

export const dynamic = 'force-dynamic';

// ─── Data Component (RSC) ─────────────────────────────────────────────────────

async function SizeList() {
  const sizes = await getSizes();

  if (sizes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">📦</span>
        <p className="text-lg font-medium">No sizes available yet.</p>
        <p className="text-sm mt-1">Check back soon or add data via Prisma Studio.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {sizes.map((size: Size) => (
        <li key={size.id}>
          <Link
            href={`/category?size_id=${size.id}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SizePage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Tileswale Flipbook
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Start by selecting a tile <span className="font-semibold text-amber-500">size</span>
          </p>
        </div>

        <Suspense fallback={<SkeletonGrid count={8} />}>
          <SizeList />
        </Suspense>
      </div>
    </main>
  );
}
