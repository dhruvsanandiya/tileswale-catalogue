'use client';

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={`flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}
      aria-label="Breadcrumb"
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-400 dark:text-gray-500">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="font-medium text-amber-600 dark:text-amber-400 hover:underline transition-colors"
              prefetch={true}
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
