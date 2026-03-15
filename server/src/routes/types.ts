import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/types?company_id=<uuid>
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_id } = req.query;
    if (!company_id || typeof company_id !== 'string') {
      res.status(400).json({ message: 'Query param company_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    if (!isSuperAdmin && companyId !== company_id) {
      res.status(403).json({ message: 'Company context does not match.' });
      return;
    }

    const types = await prisma.type.findMany({
      where: { companyId: company_id },
      select: { id: true, name: true, companyId: true },
      orderBy: { name: 'asc' },
    });

    res.json(types);
  } catch (err) {
    next(err);
  }
});

// POST /api/types – create type (company_id in body; must match context unless super_admin)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, company_id } = req.body as { name?: string; company_id?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const targetCompanyId = company_id && typeof company_id === 'string' ? company_id : companyId;
    if (!targetCompanyId) {
      res.status(400).json({ message: 'Company is required.' });
      return;
    }
    if (!isSuperAdmin && companyId !== targetCompanyId) {
      res.status(403).json({ message: 'Company context does not match.' });
      return;
    }

    const type = await prisma.type.create({
      data: { name: name.trim(), companyId: targetCompanyId },
      select: { id: true, name: true, companyId: true },
    });
    res.status(201).json(type);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A type with this name already exists for this company.' });
      return;
    }
    next(err);
  }
});

// PATCH /api/types/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.type.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Type not found.' });
      return;
    }
    if (!isSuperAdmin && existing.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to update this type.' });
      return;
    }

    const type = await prisma.type.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, companyId: true },
    });
    res.json(type);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A type with this name already exists for this company.' });
      return;
    }
    next(err);
  }
});

// DELETE /api/types/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.type.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Type not found.' });
      return;
    }
    if (!isSuperAdmin && existing.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to delete this type.' });
      return;
    }
    await prisma.type.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
