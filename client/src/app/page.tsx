import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { getCompanies, resolveUploadUrl } from '@/lib/api';
import type { Company } from '@/types';
import { nameToSlug } from '@/lib/url';
import { getAuthTokenOrRedirect } from '@/lib/auth-cookie';
import { SkeletonGrid } from '@/components/SkeletonCard';

export const metadata: Metadata = {
  title: 'Tileswale Flipbook – Select Company',
  description: 'Browse tile catalogues by company',
};

export const dynamic = 'force-dynamic';

async function CompanyList({ token }: { token: string }) {
  let companies: Company[];
  try {
    companies = await getCompanies(token);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-red-400">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-lg font-medium">Failed to load companies.</p>
        <p className="text-sm mt-1">The API may be starting up. Try again in a moment.</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">🏢</span>
        <p className="text-lg font-medium">No companies available yet.</p>
        <p className="text-sm mt-1">Check back soon or add data via Prisma Studio.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {companies.map((company: Company) => (
        <li key={company.id}>
          <Link
            href={`/${nameToSlug(company.name)}`}
            prefetch={true}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-md hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200"
          >
            {company.logoUrl ? (
              <div className="relative w-16 h-16">
                <Image
                  src={resolveUploadUrl(company.logoUrl)}
                  alt=""
                  fill
                  className="object-contain"
                  sizes="64px"
                  unoptimized
                />
              </div>
            ) : (
              <span className="text-3xl">🏢</span>
            )}
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-center">
              {company.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const token = await getAuthTokenOrRedirect();
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Tileswale Flipbook
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">
            Start by selecting a <span className="font-semibold text-amber-500">company</span>
          </p>
        </div>

        <Suspense fallback={<SkeletonGrid count={8} />}>
          <CompanyList token={token} />
        </Suspense>
      </div>
    </main>
  );
}
