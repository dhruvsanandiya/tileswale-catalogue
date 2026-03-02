import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/categories?size_id=<uuid>
// Returns distinct categories that have at least one catalogue for the given size,
// scoped to the caller's company (unless super_admin).
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { size_id } = req.query;

    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'Query param size_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const categories = await prisma.category.findMany({
      where: {
        sizeId: size_id,
        catalogues: {
          some: isSuperAdmin
            ? {}
            : {
                companyId: companyId!,
              },
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
