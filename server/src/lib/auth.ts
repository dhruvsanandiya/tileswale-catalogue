import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // In production you should set JWT_SECRET; we throw early to avoid silent misconfiguration.
  // eslint-disable-next-line no-console
  console.warn('[auth] JWT_SECRET is not set. Auth middleware will throw on use.');
}

export interface AuthUser {
  id: string;
  role: Role;
  companyId: string | null;
}

export interface UserTokenPayload {
  userId: string;
  role: Role;
  companyId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signAccessToken(payload: UserTokenPayload, expiresIn: string = '1d'): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  // Cast to any to avoid signature overload friction while still getting runtime safety.
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!JWT_SECRET) {
      res.status(500).json({ message: 'Auth not configured on server (missing JWT_SECRET).' });
      return;
    }

    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization header missing or malformed.' });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload;

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId,
    };

    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auth] Authentication error', err);
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireRole(allowed: Role | Role[]) {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ message: 'Insufficient permissions.' });
      return;
    }

    next();
  };
}

/**
 * Returns company context for the current user.
 * - super_admin: access to everything (isSuperAdmin true, companyId ignored for scoping).
 * - company_admin: only data where company_id matches their companyId (must be set).
 */
export function getCompanyContext(req: Request): { companyId: string | null; isSuperAdmin: boolean } {
  const user = req.user;
  if (!user) {
    return { companyId: null, isSuperAdmin: false };
  }

  return {
    companyId: user.companyId ?? null,
    isSuperAdmin: user.role === 'super_admin',
  };
}

