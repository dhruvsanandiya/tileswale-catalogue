'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <span className="text-6xl mb-6 block">⚠️</span>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {error.message === 'Internal server error'
            ? 'The server is unavailable or the database is not connected. Make sure the backend is running.'
            : error.message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
