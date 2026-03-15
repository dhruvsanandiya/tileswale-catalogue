import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Auth cookie name. Must match the value set in api/auth/login.
 * Use with cookies().get(AUTH_COOKIE_NAME)?.value in RSC or request.cookies in middleware.
 */
export const AUTH_COOKIE_NAME = 'auth_token';

/**
 * Get auth token in RSC. Redirects to /login if not present.
 */
export async function getAuthTokenOrRedirect(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) redirect('/login');
  return token;
}
