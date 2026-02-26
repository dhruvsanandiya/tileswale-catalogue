'use client';

import React, { useEffect, useRef, memo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  width: number;
  height: number;
}

/**
 * Renders a single PDF page onto a <canvas>.
 * Memoized so it only re-renders when its props change.
 */
const PdfPageRenderer = memo(function PdfPageRenderer({
  pdf,
  pageNumber,
  scale,
  width,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<ReturnType<ReturnType<PDFDocumentProxy['getPage']>['then']> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled) return;

        // Handle HiDPI screens
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * devicePixelRatio;
        canvas.height = viewport.height * devicePixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.scale(devicePixelRatio, devicePixelRatio);

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask.promise as unknown as typeof renderTaskRef.current;
        await renderTask.promise;
      } catch (err: unknown) {
        if (!(err instanceof Error && err.message?.includes('cancelled'))) {
          console.warn(`Page ${pageNumber} render error:`, err);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        width,
        height,
      }}
    />
  );
});

export default PdfPageRenderer;
