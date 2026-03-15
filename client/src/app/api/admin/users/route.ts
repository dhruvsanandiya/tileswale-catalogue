import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const path = companyId ? `/admin/users?company_id=${encodeURIComponent(companyId)}` : '/admin/users';
  return proxyToBackend(path, request);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend('/admin/users', request, { method: 'POST', body });
}
