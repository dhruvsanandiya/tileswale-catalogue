import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/sizes
// Returns all sizes sorted alphabetically, scoped by company where applicable
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, isSuperAdmin } = getCompanyContext(req);

    const findArgs: Parameters<typeof prisma.size.findMany>[0] = {};

    if (isSuperAdmin) {
      const { company_id } = req.query;
      if (company_id && typeof company_id === 'string') {
        findArgs.where = { type: { companyId: company_id } };
      }
      // If no company_id for super admin, return sizes across all companies
    } else {
      if (!companyId) {
        res.status(403).json({ message: 'Company context required.' });
        return;
      }
      findArgs.where = { type: { companyId } };
    }

    const sizes = await prisma.size.findMany({
      ...findArgs,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(sizes);
  } catch (err) {
    next(err);
  }
});

export default router;
