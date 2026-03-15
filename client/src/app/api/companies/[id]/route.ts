import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/api-proxy';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      return proxyToBackend(`/companies/${id}`, request, { method: 'PATCH', formData });
    }
    const body = await request.text();
    return proxyToBackend(`/companies/${id}`, request, { method: 'PATCH', body });
  } catch (err) {
    console.error('[api/companies PATCH]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await proxyToBackend(`/companies/${id}`, request, { method: 'DELETE' });
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  return res;
}
