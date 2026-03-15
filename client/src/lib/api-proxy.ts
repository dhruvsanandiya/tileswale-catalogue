import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function proxyToBackend(
  path: string,
  request: NextRequest,
  options: { method?: string; body?: string; formData?: FormData } = {}
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const method = options.method ?? request.method;

  let body: string | FormData | undefined;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  if (options.formData) {
    body = options.formData;
    // Do not set Content-Type; fetch will set multipart boundary
  } else {
    headers['Content-Type'] = 'application/json';
    body = options.body ?? (method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined);
  }

  const res = await fetch(url, { method, headers, body });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
