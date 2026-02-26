// ─── Shimmer Skeleton Card ────────────────────────────────────────────────────

export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-sm">
      <div className="h-32 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
