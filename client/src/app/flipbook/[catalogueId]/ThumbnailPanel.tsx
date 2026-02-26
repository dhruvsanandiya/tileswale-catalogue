'use client';

import React, { useEffect, useRef, memo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  currentPage: number;
  onPageClick: (page: number) => void;
}

const THUMB_WIDTH = 96;
const THUMB_SCALE = 0.2;

/**
 * Renders thumbnail canvases for all pages.
 * Clicking a thumbnail calls onPageClick to jump the book to that page.
 */
const ThumbnailPanel = memo(function ThumbnailPanel({
  pdf,
  pageNumber,
  currentPage,
  onPageClick,
}: Props) {
  const pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  return (
    <div
      className="thumbnail-panel"
      role="navigation"
      aria-label="Page thumbnails"
    >
      {pages.map((n) => (
        <ThumbnailItem
          key={n}
          pdf={pdf}
          page={n}
          isActive={n === currentPage || n === pageNumber}
          onClick={onPageClick}
        />
      ))}
    </div>
  );
});

/** Individual thumbnail canvas */
const ThumbnailItem = memo(function ThumbnailItem({
  pdf,
  page,
  isActive,
  onClick,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  isActive: boolean;
  onClick: (p: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale: THUMB_SCALE });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        /* ignore */
      }
    };

    render();

    return () => { cancelled = true; };
  }, [pdf, page]);

  return (
    <button
      className={`thumbnail-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(page)}
      aria-label={`Go to page ${page}`}
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <canvas
        ref={canvasRef}
        className="thumbnail-canvas"
        style={{ width: THUMB_WIDTH, display: 'block' }}
      />
      <span className="thumbnail-label">Pg {page}</span>
    </button>
  );
});

export default ThumbnailPanel;
