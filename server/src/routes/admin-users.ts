import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../lib/auth';

const router = Router();
const SALT_ROUNDS = 10;

// All routes require super_admin
router.use(requireAuth, requireRole('super_admin'));

// GET /api/admin/users – list company admins (optionally by company_id)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_id } = req.query;

    const where: { role: 'company_admin'; companyId?: string } = { role: 'company_admin' };
    if (company_id && typeof company_id === 'string') {
      where.companyId = company_id;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { email: 'asc' }],
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users – create company_admin
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, companyId } = req.body as {
      email?: string;
      password?: string;
      companyId?: string;
    };

    const trimmedEmail = email?.trim()?.toLowerCase();
    if (!trimmedEmail) {
      res.status(400).json({ message: 'Email is required.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }
    if (!companyId || typeof companyId !== 'string') {
      res.status(400).json({ message: 'Company ID is required.' });
      return;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(400).json({ message: 'Company not found.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      res.status(409).json({ message: 'A user with this email already exists.' });
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        password: hashed,
        role: 'company_admin',
        companyId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/reset-password – set new password (super_admin only)
router.post(
  '/:id/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body as { newPassword?: string };

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ message: 'New password must be at least 6 characters.' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true },
      });
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      if (user.role !== 'company_admin') {
        res.status(403).json({ message: 'Can only reset password for company admins.' });
        return;
      }

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await prisma.user.update({
        where: { id },
        data: { password: hashed },
      });

      res.json({ message: 'Password reset successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
