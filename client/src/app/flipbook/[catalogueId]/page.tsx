import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { getCatalogueById } from '@/lib/api';

// Dynamically import the viewer with ssr:false to prevent pdf.js canvas
// errors during server-side rendering.
const FlipbookViewer = dynamic(() => import('./FlipbookViewer'), {
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
});

interface PageProps {
  params: Promise<{ catalogueId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const { catalogueId } = await params;
    const catalogue = await getCatalogueById(catalogueId);
    return {
      title: `${catalogue.title} – Tileswale Flipbook`,
      description: `View the ${catalogue.title} catalogue`,
    };
  } catch {
    return { title: 'Flipbook – Tileswale' };
  }
}

export default async function FlipbookPage({ params }: PageProps) {
  const { catalogueId } = await params;

  let catalogue;
  try {
    catalogue = await getCatalogueById(catalogueId);
  } catch {
    notFound();
  }

  return <FlipbookViewer catalogue={catalogue!} />;
}
