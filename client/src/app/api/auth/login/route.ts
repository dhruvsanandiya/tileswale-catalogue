import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUTH_COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
/** Allow Render free-tier cold start (30–60s). Vercel Pro allows 60s; Hobby kills at 10s. */
const BACKEND_FETCH_TIMEOUT_MS = 55_000;

function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  return url.replace(/\/+$/, ''); // strip trailing slash
}

export async function POST(request: NextRequest) {
  try {
    return await handleLogin(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[auth/login] Unhandled error:', message, stack);
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleLogin(request: NextRequest): Promise<NextResponse> {
  const backendUrl = getBackendUrl();
  const isProduction = process.env.NODE_ENV === 'production';

  // Fail fast in production if backend URL is still localhost (env not set or not redeployed)
  if (isProduction && (backendUrl.includes('localhost') || backendUrl.startsWith('http://127.'))) {
    console.error('[auth/login] NEXT_PUBLIC_API_URL not set for production:', backendUrl);
    return NextResponse.json(
      {
        message:
          'Server misconfiguration: backend URL not set. Set NEXT_PUBLIC_API_URL in Vercel to your Render API URL (e.g. https://your-app.onrender.com/api) and redeploy.',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body. Expected JSON.' },
      { status: 400 }
    );
  }

  const { email, password } = (body ?? {}) as { email?: string; password?: string };
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return NextResponse.json(
      { message: 'Email and password are required.' },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    return NextResponse.json(
      { message: 'Email is required.' },
      { status: 400 }
    );
  }

  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS);
    res = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchErr) {
    const msg =
      fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'Login timed out (backend may be waking up). Please try again in a few seconds.'
        : 'Cannot reach login service. Try again in a moment.';
    console.error('[auth/login] Backend unreachable:', fetchErr);
    return NextResponse.json({ message: msg }, { status: 502 });
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data: { message?: string; token?: string; user?: unknown } =
    contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    return NextResponse.json(
      { message: data?.message ?? 'Login failed.' },
      { status: res.status }
    );
  }

  const token = data.token;
  if (!token) {
    console.error('[auth/login] Backend response missing token');
    return NextResponse.json(
      { message: 'Invalid response from server.' },
      { status: 502 }
    );
  }

  const response = NextResponse.json({ user: data.user });

  try {
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
  } catch (cookieErr) {
    console.error('[auth/login] Failed to set cookie:', cookieErr);
    return NextResponse.json(
      { message: 'Login succeeded but session could not be saved. Try again.' },
      { status: 500 }
    );
  }

  return response;
}
