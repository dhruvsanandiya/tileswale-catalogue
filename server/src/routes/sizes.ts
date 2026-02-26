import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/sizes
// Returns all sizes sorted alphabetically
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sizes = await prisma.size.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(sizes);
  } catch (err) {
    next(err);
  }
});

export default router;
