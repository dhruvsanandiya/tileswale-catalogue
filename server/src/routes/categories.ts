import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/categories?size_id=<uuid>
// Returns distinct categories that have at least one catalogue for the given size
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { size_id } = req.query;

    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'Query param size_id is required.' });
      return;
    }

    // Find all categories linked to catalogues with the given sizeId
    const categories = await prisma.category.findMany({
      where: {
        catalogues: {
          some: { sizeId: size_id },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

export default router;
