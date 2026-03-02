/**
 * API base configuration for the Tileswale Flipbook client.
 * All API calls should use helpers from this file to ensure
 * the base URL is picked up from the environment.
 */

import type { Size, Category, Catalogue } from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Build a full API endpoint URL.
 * @example apiUrl('/catalogues')  =>  'http://localhost:4000/api/catalogues'
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Default fetch options – attach auth header when a token is present.
 * Extend these per-request as needed.
 */
export function getDefaultHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Default timeout for API requests (helps when backend is waking from sleep). */
const FETCH_TIMEOUT_MS = 60_000;

/**
 * Thin wrapper around fetch with default options.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const signal = options.signal ?? controller.signal;

  const res = await fetch(apiUrl(path), {
    ...options,
    signal,
    headers: {
      ...getDefaultHeaders(token),
      ...options.headers,
    },
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Typed Helpers ────────────────────────────────────────────────────────────

/** Fetch all sizes (server-side friendly – uses Next.js revalidation). */
export async function getSizes(): Promise<Size[]> {
  return apiFetch<Size[]>('/sizes', { next: { revalidate: 60 } } as RequestInit);
}

/** Fetch categories available for a given size. */
export async function getCategories(sizeId: string): Promise<Category[]> {
  return apiFetch<Category[]>(
    `/categories?size_id=${encodeURIComponent(sizeId)}`,
    { next: { revalidate: 60 } } as RequestInit
  );
}

/** Fetch a single catalogue by its ID. */
export async function getCatalogueById(id: string): Promise<Catalogue> {
  return apiFetch<Catalogue>(
    `/catalogues/${encodeURIComponent(id)}`,
    { next: { revalidate: 60 } } as RequestInit
  );
}

export async function getCatalogues(
  sizeId: string,
  categoryId: string
): Promise<Catalogue[]> {
  return apiFetch<Catalogue[]>(
    `/catalogues?size_id=${encodeURIComponent(sizeId)}&category_id=${encodeURIComponent(categoryId)}`,
    { next: { revalidate: 60 } } as RequestInit
  );
}
