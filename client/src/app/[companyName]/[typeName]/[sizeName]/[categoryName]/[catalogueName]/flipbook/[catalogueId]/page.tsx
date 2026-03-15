import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCatalogueById } from '@/lib/api';
import { AUTH_COOKIE_NAME, getAuthTokenOrRedirect } from '@/lib/auth-cookie';

export const dynamic = 'force-dynamic';

const FlipbookViewer = nextDynamic(
  () => import('@/app/flipbook/[catalogueId]/FlipbookViewer'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          background: '#111827',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          gap: 16,
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid #374151',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p>Loading viewer…</p>
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ catalogueName: string; catalogueId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { title: 'Flipbook – Tileswale' };
  try {
    const { catalogueId } = await params;
    const catalogue = await getCatalogueById(catalogueId, token);
    return {
      title: `${catalogue.title} – Tileswale Flipbook`,
      description: `View the ${catalogue.title} catalogue`,
    };
  } catch {
    return { title: 'Flipbook – Tileswale' };
  }
}

export default async function NestedFlipbookPage({ params }: PageProps) {
  const { catalogueId } = await params;
  const token = await getAuthTokenOrRedirect();

  let catalogue;
  try {
    catalogue = await getCatalogueById(catalogueId, token);
  } catch {
    notFound();
  }

  return <FlipbookViewer catalogue={catalogue!} />;
}
