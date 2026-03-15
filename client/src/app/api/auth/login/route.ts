import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day
/** Keep under Vercel serverless timeout; Render cold start may need a retry */
const BACKEND_FETCH_TIMEOUT_MS = 8_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

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
      res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      const msg =
        fetchErr instanceof Error && fetchErr.name === 'AbortError'
          ? 'Login request timed out. Try again (backend may be waking up).'
          : 'Cannot reach login service. Try again in a moment.';
      console.error('[auth/login] Backend unreachable:', fetchErr);
      return NextResponse.json({ message: msg }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') ?? '';
    const data =
      contentType.includes('application/json')
        ? await res.json().catch(() => ({}))
        : {};

    if (!res.ok) {
      return NextResponse.json(
        { message: (data as { message?: string })?.message ?? 'Login failed.' },
        { status: res.status }
      );
    }

    const token = (data as { token?: string }).token;
    if (!token) {
      console.error('[auth/login] Backend response missing token');
      return NextResponse.json(
        { message: 'Invalid response from server.' },
        { status: 502 }
      );
    }

    const response = NextResponse.json({
      user: (data as { user?: unknown }).user,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
