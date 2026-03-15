import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/sizes?type_id=<uuid>&company_id=<uuid> (optional; company_id for super_admin scoping)
// Returns sizes: by type_id when given, else scoped by company.
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const { type_id, company_id } = req.query;

    const findArgs: Parameters<typeof prisma.size.findMany>[0] = {};

    if (type_id && typeof type_id === 'string') {
      findArgs.where = { typeId: type_id };
      if (!isSuperAdmin && companyId) {
        findArgs.where = { typeId: type_id, type: { companyId } };
      }
    } else if (isSuperAdmin) {
      if (company_id && typeof company_id === 'string') {
        findArgs.where = { type: { companyId: company_id } };
      }
    } else {
      if (!companyId) {
        res.status(403).json({ message: 'Company context required.' });
        return;
      }
      findArgs.where = { type: { companyId } };
    }

    const sizes = await prisma.size.findMany({
      ...findArgs,
      select: { id: true, name: true, typeId: true },
      orderBy: { name: 'asc' },
    });
    res.json(sizes);
  } catch (err) {
    next(err);
  }
});

// POST /api/sizes – create size (type_id in body; type must belong to user's company unless super_admin)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type_id } = req.body as { name?: string; type_id?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }
    if (!type_id || typeof type_id !== 'string') {
      res.status(400).json({ message: 'type_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const typeRow = await prisma.type.findUnique({ where: { id: type_id } });
    if (!typeRow) {
      res.status(404).json({ message: 'Type not found.' });
      return;
    }
    if (!isSuperAdmin && typeRow.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to add size for this type.' });
      return;
    }

    const size = await prisma.size.create({
      data: { name: name.trim(), typeId: type_id },
      select: { id: true, name: true, typeId: true },
    });
    res.status(201).json(size);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A size with this name already exists for this type.' });
      return;
    }
    next(err);
  }
});

// PATCH /api/sizes/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.size.findUnique({
      where: { id },
      include: { type: true },
    });
    if (!existing) {
      res.status(404).json({ message: 'Size not found.' });
      return;
    }
    if (!isSuperAdmin && existing.type.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to update this size.' });
      return;
    }

    const size = await prisma.size.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, typeId: true },
    });
    res.json(size);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A size with this name already exists for this type.' });
      return;
    }
    next(err);
  }
});

// DELETE /api/sizes/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.size.findUnique({
      where: { id },
      include: { type: true },
    });
    if (!existing) {
      res.status(404).json({ message: 'Size not found.' });
      return;
    }
    if (!isSuperAdmin && existing.type.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to delete this size.' });
      return;
    }
    await prisma.size.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
