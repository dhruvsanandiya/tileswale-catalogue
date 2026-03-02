import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import sizesRouter from './routes/sizes';
import categoriesRouter from './routes/categories';
import cataloguesRouter from './routes/catalogues';
import authRouter from './routes/auth';

// ─── App ──────────────────────────────────────────────────────────────────────

const app: Application = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// JSON & URL-encoded body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/sizes', sizesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/catalogues', cataloguesRouter);

// TODO: add as built:
//   app.use('/api/products',  productsRouter);
//   app.use('/api/wishlist',  wishlistRouter);

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Tileswale Flipbook API is running 🚀' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

export default app;
