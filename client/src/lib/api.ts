/**
 * API base configuration for the Tileswale Flipbook client.
 * All API calls should use helpers from this file to ensure
 * the base URL is picked up from the environment.
 */

import type { Company, Type, Size, Category, Catalogue } from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Backend origin (no /api) – use for static uploads (logos, catalogue PDFs, covers).
 * Stored paths in DB are relative e.g. /uploads/companies/xxx/logo.png and are served by the backend.
 */
export function getUploadBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  return base.replace(/\/api\/?$/, '') || 'http://localhost:4000';
}

/**
 * Resolve an upload URL (relative path or full URL). Relative paths are prefixed with backend origin.
 */
export function resolveUploadUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = getUploadBaseUrl();
  return pathOrUrl.startsWith('/') ? `${base}${pathOrUrl}` : `${base}/${pathOrUrl}`;
}

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

const revalidate = { next: { revalidate: 60 } } as RequestInit;

/** Fetch all companies (for home and company context). Token required for auth. */
export async function getCompanies(token: string): Promise<Company[]> {
  return apiFetch<Company[]>('/companies', revalidate, token);
}

/** Fetch types for a company. */
export async function getTypes(companyId: string, token: string): Promise<Type[]> {
  return apiFetch<Type[]>(
    `/types?company_id=${encodeURIComponent(companyId)}`,
    revalidate,
    token
  );
}

/** Fetch sizes, optionally scoped by type. */
export async function getSizes(typeId: string | undefined, token: string): Promise<Size[]> {
  const path = typeId
    ? `/sizes?type_id=${encodeURIComponent(typeId)}`
    : '/sizes';
  return apiFetch<Size[]>(path, revalidate, token);
}

/** Fetch categories available for a given size. */
export async function getCategories(sizeId: string, token: string): Promise<Category[]> {
  return apiFetch<Category[]>(
    `/categories?size_id=${encodeURIComponent(sizeId)}`,
    { next: { revalidate: 60 } } as RequestInit,
    token
  );
}

/** Fetch a single catalogue by its ID. */
export async function getCatalogueById(id: string, token: string): Promise<Catalogue> {
  return apiFetch<Catalogue>(
    `/catalogues/${encodeURIComponent(id)}`,
    { next: { revalidate: 60 } } as RequestInit,
    token
  );
}

export async function getCatalogues(
  sizeId: string,
  categoryId: string,
  token: string
): Promise<Catalogue[]> {
  return apiFetch<Catalogue[]>(
    `/catalogues?size_id=${encodeURIComponent(sizeId)}&category_id=${encodeURIComponent(categoryId)}`,
    { next: { revalidate: 60 } } as RequestInit,
    token
  );
}
