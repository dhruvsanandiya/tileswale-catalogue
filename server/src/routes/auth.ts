import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { signAccessToken } from '../lib/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const token = signAccessToken({
      userId: user.id,
      role: user.role,
      companyId: user.companyId ?? null,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
              logoUrl: user.company.logoUrl,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

