import crypto from 'crypto';
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

function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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
 * Compares secrets in constant time using crypto.timingSafeEqual.
 */
export const requireCronAuth = (req: Request, res: Response, next: NextFunction) => {
  const cronSecretHeader = req.headers['x-cron-secret'];
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredSecret = process.env.CRON_SECRET;
  const expectedSecret = configuredSecret || (isProduction ? '' : 'fpm_internal_cron_secret_2026');

  if (isProduction && (!configuredSecret || configuredSecret === 'fpm_internal_cron_secret_2026')) {
    console.error('[CRITICAL SECURITY WARNING] CRON_SECRET must be configured with a cryptographically secure token in production!');
  }

  if (typeof cronSecretHeader === 'string' && expectedSecret && timingSafeEqualStr(cronSecretHeader, expectedSecret)) {
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
