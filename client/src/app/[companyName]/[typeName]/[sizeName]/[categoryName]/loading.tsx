import { SkeletonGrid } from '@/components/SkeletonCard';

export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 h-5 w-full max-w-md animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mb-10 text-center">
          <div className="mx-auto h-10 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="mx-auto h-5 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <SkeletonGrid count={6} />
      </div>
    </main>
  );
}
