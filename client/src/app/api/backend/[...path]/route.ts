import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, params, 'DELETE');
}

async function proxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { path } = await params;
  const pathStr = path.join('/');
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const url = `${BACKEND_URL}/${pathStr}${query ? `?${query}` : ''}`;

  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  const contentType = request.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let body: string | FormData | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (isMultipart) {
      body = await request.formData();
      // Do not set Content-Type; fetch sets boundary
    } else {
      headers['Content-Type'] = 'application/json';
      try {
        body = await request.text();
      } catch {
        body = undefined;
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined && (typeof body === 'string' ? body.length > 0 : true) ? body : undefined,
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
