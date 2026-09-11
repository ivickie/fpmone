import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthUserSession } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserSession;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please provide a Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  const session = AuthService.getSessionByToken(token);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid token. Please log in again.' });
  }

  req.user = session;
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Administrative privileges required.' });
  }
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.adminLevel !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super Administrator privileges required.' });
  }
  next();
};

export const scopeToBranch = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
  // If user is not super admin, restrict queries to user's branch
  if (req.user.adminLevel !== 'super_admin') {
    req.query.branchId = req.user.branchId;
  }
  next();
};

/**
 * Middleware for internal/cron tasks: accepts either an authorized admin session OR a matching CRON_SECRET header
 */
export const requireCronAuth = (req: Request, res: Response, next: NextFunction) => {
  const cronSecretHeader = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET || 'fpm_internal_cron_secret_2026';

  if (cronSecretHeader && cronSecretHeader === expectedSecret) {
    return next();
  }

  // Fallback to Bearer token with admin privileges
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = AuthService.getSessionByToken(token);
    if (session && session.isAdmin) {
      req.user = session;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized. Valid Cron Secret or Administrator credentials required.'
  });
};
