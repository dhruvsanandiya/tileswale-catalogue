'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Catalogue } from '@/types';
import PdfPageRenderer from './PdfPageRenderer';
import ThumbnailPanel from './ThumbnailPanel';
import './flipbook.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.2;
const LAZY_WINDOW = 1; // pages before/after current to actually render

// ─── FlipPage wrapper (required by react-pageflip) ────────────────────────────

interface FlipPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  currentPage: number;
  scale: number;
  pageW: number;
  pageH: number;
}

const FlipPage = memo(
  React.forwardRef<HTMLDivElement, FlipPageProps>(function FlipPage(
    { pdf, pageNumber, currentPage, scale, pageW, pageH },
    ref
  ) {
    const isVisible =
      Math.abs(pageNumber - currentPage) <= LAZY_WINDOW ||
      Math.abs(pageNumber - (currentPage + 1)) <= LAZY_WINDOW;

    return (
      <div
        ref={ref}
        className="flip-page"
        style={{ width: pageW, height: pageH }}
      >
        {isVisible ? (
          <PdfPageRenderer
            pdf={pdf}
            pageNumber={pageNumber}
            scale={scale}
            width={pageW}
            height={pageH}
          />
        ) : (
          <div className="flip-page-placeholder">
            <span style={{ opacity: 0.3, fontSize: 14 }}>{pageNumber}</span>
          </div>
        )}
      </div>
    );
  })
);
FlipPage.displayName = 'FlipPage';

// ─── Main Viewer ──────────────────────────────────────────────────────────────

interface Props {
  catalogue: Catalogue;
}

export default function FlipbookViewer({ catalogue }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.8);
  const [pageW, setPageW] = useState(550);
  const [pageH, setPageH] = useState(780);
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void; turnToPage: (n: number) => void; getCurrentPageIndex: () => number } }>(null);

  // ─── Load pdf.js worker & document ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source — use CDN to avoid webpack/Terser minification failures
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;
        }

        const loadingTask = pdfjsLib.getDocument({
          url: catalogue.pdfUrl,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (cancelled) return;

        // Compute page dimensions from first page
        const firstPage = await doc.getPage(1);
        const vp = firstPage.getViewport({ scale });
        setPageW(Math.round(vp.width));
        setPageH(Math.round(vp.height));
        setNumPages(doc.numPages);
        setPdf(doc);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('PDF load error:', err);
          setLoadError(
            err instanceof Error ? err.message : 'Failed to load PDF'
          );
          setIsLoading(false);
        }
      }
    };

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.pdfUrl]);

  // ─── Recalculate page size when scale changes ────────────────────────────────
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(1).then((page) => {
      if (cancelled) return;
      const vp = page.getViewport({ scale });
      setPageW(Math.round(vp.width));
      setPageH(Math.round(vp.height));
    });
    return () => { cancelled = true; };
  }, [pdf, scale]);

  // ─── Fullscreen listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ─── Flipbook event handlers ─────────────────────────────────────────────────
  const handleFlip = useCallback((e: { data: number }) => {
    // react-pageflip pages are 0-indexed
    setCurrentPage(e.data + 1);
  }, []);

  // ─── Toolbar actions ─────────────────────────────────────────────────────────
  const zoomIn = useCallback(
    () => setScale((s) => Math.min(s + SCALE_STEP, MAX_SCALE)),
    []
  );
  const zoomOut = useCallback(
    () => setScale((s) => Math.max(s - SCALE_STEP, MIN_SCALE)),
    []
  );
  const zoomReset = useCallback(() => setScale(0.8), []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* browser may deny */
    }
  }, []);

  const toggleThumbs = useCallback(() => setShowThumbs((v) => !v), []);

  const jumpToPage = useCallback((page: number) => {
    // react-pageflip uses 0-based index
    bookRef.current?.pageFlip()?.turnToPage(page - 1);
    setCurrentPage(page);
  }, []);

  const flipNext = useCallback(() => {
    bookRef.current?.pageFlip()?.flipNext();
  }, []);

  const flipPrev = useCallback(() => {
    bookRef.current?.pageFlip()?.flipPrev();
  }, []);

  // ─── Pages array (memoized) ──────────────────────────────────────────────────
  const pages = useMemo(
    () => (pdf ? Array.from({ length: pdf.numPages }, (_, i) => i + 1) : []),
    [pdf]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flipbook-root" ref={rootRef}>
      {/* ── Toolbar ── */}
      <header className="flipbook-toolbar">
        <span className="toolbar-title" title={catalogue.title}>
          📖 {catalogue.title}
        </span>

        {/* Back */}
        <div className="toolbar-group">
          <button
            onClick={() => history.back()}
            className="toolbar-btn"
            title="Go back"
            aria-label="Go back"
          >
            ←
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Navigation */}
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            onClick={flipPrev}
            disabled={!pdf}
            title="Previous page"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="page-counter">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '–'}
          </span>
          <button
            className="toolbar-btn"
            onClick={flipNext}
            disabled={!pdf}
            title="Next page"
            aria-label="Next page"
          >
            ›
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zoom */}
        <div className="toolbar-group">
          <button
            className="toolbar-btn"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            className="toolbar-btn"
            onClick={zoomReset}
            title="Reset zoom"
            aria-label="Reset zoom"
            style={{ fontSize: 11, width: 44 }}
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            className="toolbar-btn"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Thumbnails toggle */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${showThumbs ? 'active' : ''}`}
            onClick={toggleThumbs}
            title="Toggle thumbnails"
            aria-label="Toggle thumbnails"
            aria-pressed={showThumbs}
          >
            ☰
          </button>
        </div>

        {/* Fullscreen */}
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flipbook-main">
        {/* Thumbnail panel */}
        {pdf && showThumbs && (
          <ThumbnailPanel
            pdf={pdf}
            pageNumber={currentPage}
            currentPage={currentPage}
            onPageClick={jumpToPage}
          />
        )}

        {/* Flip stage */}
        <div className="flipbook-stage">
          {isLoading && (
            <div className="flipbook-loading">
              <div className="loading-spinner" />
              <p className="loading-text">Loading PDF…</p>
            </div>
          )}

          {loadError && (
            <div className="flipbook-error">
              <span style={{ fontSize: 48 }}>⚠️</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Failed to load PDF
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                {loadError}
              </p>
            </div>
          )}

          {pdf && !loadError && (
            // @ts-expect-error – react-pageflip types are loose
            <HTMLFlipBook
              ref={bookRef}
              width={pageW}
              height={pageH}
              size="fixed"
              minWidth={200}
              maxWidth={1600}
              minHeight={300}
              maxHeight={2200}
              showCover={false}
              flippingTime={700}
              usePortrait={false}
              startPage={0}
              drawShadow
              useMouseEvents
              onFlip={handleFlip}
              className="html-flipbook"
              style={{}}
              startZIndex={0}
              autoSize={false}
              clickEventForward
              swipeDistance={30}
              showPageCorners
              disableFlipByClick={false}
              mobileScrollSupport={false}
            >
              {pages.map((n) => (
                <FlipPage
                  key={n}
                  pdf={pdf}
                  pageNumber={n}
                  currentPage={currentPage}
                  scale={scale}
                  pageW={pageW}
                  pageH={pageH}
                />
              ))}
            </HTMLFlipBook>
          )}
        </div>
      </div>
    </div>
  );
}
