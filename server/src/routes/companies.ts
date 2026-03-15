import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext, requireRole } from '../lib/auth';
import { uploadCompanyLogo } from '../lib/multer';
import { saveCompanyLogo } from '../lib/upload';

const router = Router();

// GET /api/companies
// Returns companies: all for super_admin, otherwise only the user's company.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, isSuperAdmin } = getCompanyContext(req);

    const where = isSuperAdmin ? {} : { id: companyId! };

    const companies = await prisma.company.findMany({
      where,
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });

    res.json(companies);
  } catch (err) {
    next(err);
  }
});

// POST /api/companies – create company (super_admin only). Accepts JSON or multipart (name + optional logo file).
router.post(
  '/',
  requireAuth,
  requireRole('super_admin'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      return uploadCompanyLogo(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = req.body?.name;
      const logoUrlFromBody = req.body?.logoUrl;
      const logoFile = (req as any).file;

      const nameStr = typeof name === 'string' ? name.trim() : '';
      if (!nameStr) {
        res.status(400).json({ message: 'Company name is required.' });
        return;
      }

      const company = await prisma.company.create({
        data: {
          name: nameStr,
          logoUrl: typeof logoUrlFromBody === 'string' ? logoUrlFromBody.trim() || null : null,
        },
        select: { id: true, name: true, logoUrl: true },
      });

      if (logoFile) {
        try {
          const relativePath = saveCompanyLogo(company.id, logoFile);
          const updated = await prisma.company.update({
            where: { id: company.id },
            data: { logoUrl: relativePath },
            select: { id: true, name: true, logoUrl: true },
          });
          return res.status(201).json(updated);
        } catch (uploadErr) {
          await prisma.company.delete({ where: { id: company.id } });
          throw uploadErr;
        }
      }

      res.status(201).json(company);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/companies/:id – update company (super_admin only). Accepts JSON or multipart (name, optional logo file).
router.patch(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      return uploadCompanyLogo(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const name = req.body?.name;
      const logoFile = (req as any).file;

      const existing = await prisma.company.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ message: 'Company not found.' });
        return;
      }

      const data: { name?: string; logoUrl?: string | null } = {};
      if (typeof name === 'string' && name.trim()) {
        data.name = name.trim();
      }
      if (logoFile && (logoFile.buffer || (logoFile as any).path)) {
        try {
          data.logoUrl = saveCompanyLogo(id, logoFile);
        } catch (uploadErr: any) {
          if (uploadErr.message?.includes('Invalid image') || uploadErr.message?.includes('No file data')) {
            res.status(400).json({ message: uploadErr.message });
            return;
          }
          throw uploadErr;
        }
      } else if (req.body?.logoUrl !== undefined) {
        data.logoUrl = typeof req.body.logoUrl === 'string' ? req.body.logoUrl.trim() || null : null;
      }

      if (Object.keys(data).length === 0) {
        return res.json(existing);
      }

      const company = await prisma.company.update({
        where: { id },
        data,
        select: { id: true, name: true, logoUrl: true },
      });
      res.json(company);
    } catch (err: any) {
      if (err?.message?.includes('Invalid image') || err?.message?.includes('No file data')) {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/companies/:id – delete company (super_admin only)
router.delete(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await prisma.company.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (err: any) {
      if (err?.code === 'P2025') {
        res.status(404).json({ message: 'Company not found.' });
        return;
      }
      next(err);
    }
  }
);

export default router;
