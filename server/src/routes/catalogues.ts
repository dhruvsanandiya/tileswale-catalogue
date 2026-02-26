import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/catalogues?size_id=<uuid>&category_id=<uuid>
// Returns catalogues matching both filters, with size and category included
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { size_id, category_id } = req.query;

    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'Query param size_id is required.' });
      return;
    }

    if (!category_id || typeof category_id !== 'string') {
      res.status(400).json({ message: 'Query param category_id is required.' });
      return;
    }

    const catalogues = await prisma.catalogue.findMany({
      where: {
        sizeId: size_id,
        categoryId: category_id,
      },
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { title: 'asc' },
    });

    res.json(catalogues);
  } catch (err) {
    next(err);
  }
});

// GET /api/catalogues/:id
// Returns a single catalogue by ID, with size and category included
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const catalogue = await prisma.catalogue.findUnique({
      where: { id },
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!catalogue) {
      res.status(404).json({ message: 'Catalogue not found.' });
      return;
    }

    res.json(catalogue);
  } catch (err) {
    next(err);
  }
});

export default router;
