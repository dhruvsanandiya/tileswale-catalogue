import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend('/companies', request);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    return proxyToBackend('/companies', request, { method: 'POST', formData });
  }
  const body = await request.text();
  return proxyToBackend('/companies', request, { method: 'POST', body });
}
