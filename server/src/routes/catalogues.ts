import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/catalogues?size_id=<uuid>&category_id=<uuid>
// Returns catalogues matching both filters, with size and category included
// and scoped by company where applicable.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const where: Prisma.CatalogueWhereInput = {
      sizeId: size_id,
      categoryId: category_id,
    };

    if (!isSuperAdmin) {
      where.companyId = companyId!;
    }

    const catalogues = await prisma.catalogue.findMany({
      where,
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
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
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const where: Prisma.CatalogueWhereInput = { id };
    if (!isSuperAdmin) {
      where.companyId = companyId!;
    }

    const catalogue = await prisma.catalogue.findFirst({
      where,
      include: {
        size: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, logoUrl: true } },
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
