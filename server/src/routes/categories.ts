import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { requireAuth, getCompanyContext } from '../lib/auth';

const router = Router();

// GET /api/categories?size_id=<uuid>&all=1 (optional; all=1 returns all categories for size for admin)
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { size_id, all } = req.query;

    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'Query param size_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);

    if (!isSuperAdmin && !companyId) {
      res.status(403).json({ message: 'Company context required.' });
      return;
    }

    const useAll = all === '1' || all === 'true';
    const where: Prisma.CategoryWhereInput = { sizeId: size_id };
    if (!useAll) {
      where.catalogues = {
        some: isSuperAdmin ? {} : { companyId: companyId! },
      };
    } else if (!isSuperAdmin && companyId) {
      where.size = { type: { companyId } };
    }

    const categories = await prisma.category.findMany({
      where,
      select: { id: true, name: true, sizeId: true },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories – create category (size_id in body; size's type must belong to user's company unless super_admin)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, size_id } = req.body as { name?: string; size_id?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }
    if (!size_id || typeof size_id !== 'string') {
      res.status(400).json({ message: 'size_id is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const sizeRow = await prisma.size.findUnique({
      where: { id: size_id },
      include: { type: true },
    });
    if (!sizeRow) {
      res.status(404).json({ message: 'Size not found.' });
      return;
    }
    if (!isSuperAdmin && sizeRow.type.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to add category for this size.' });
      return;
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), sizeId: size_id },
      select: { id: true, name: true, sizeId: true },
    });
    res.status(201).json(category);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A category with this name already exists for this size.' });
      return;
    }
    next(err);
  }
});

// PATCH /api/categories/:id
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'Name is required.' });
      return;
    }

    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { size: { include: { type: true } } },
    });
    if (!existing) {
      res.status(404).json({ message: 'Category not found.' });
      return;
    }
    if (!isSuperAdmin && existing.size.type.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to update this category.' });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true, sizeId: true },
    });
    res.json(category);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ message: 'A category with this name already exists for this size.' });
      return;
    }
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { companyId, isSuperAdmin } = getCompanyContext(req);
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { size: { include: { type: true } } },
    });
    if (!existing) {
      res.status(404).json({ message: 'Category not found.' });
      return;
    }
    if (!isSuperAdmin && existing.size.type.companyId !== companyId) {
      res.status(403).json({ message: 'Not allowed to delete this category.' });
      return;
    }
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
