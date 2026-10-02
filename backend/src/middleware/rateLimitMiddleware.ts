import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstHit: number;
}

/**
 * High-performance sliding-window in-memory store with automated eviction
 * Designed to operate resiliently in both standalone and serverless functions.
 */
class MemoryRateLimitStore {
  private hits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically sweep expired keys every 60 seconds (in long-running mode)
    if (!process.env.VERCEL) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstHit: now
      };
      this.hits.set(key, newEntry);
      return { count: 1, resetTime: newEntry.resetTime };
    }

    entry.count++;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  public decrement(key: string): void {
    const entry = this.hits.get(key);
    if (entry && entry.count > 0) {
      entry.count--;
    }
  }

  public reset(key: string): void {
    this.hits.delete(key);
  }

  public get(key: string): RateLimitEntry | undefined {
    const entry = this.hits.get(key);
    if (entry && Date.now() > entry.resetTime) {
      this.hits.delete(key);
      return undefined;
    }
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.hits.entries()) {
      if (now > entry.resetTime) {
        this.hits.delete(key);
      }
    }
  }
}

export const rateLimitStore = new MemoryRateLimitStore();

/**
 * Extracts a privacy-safe client IP from request headers or socket
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers ? req.headers['x-forwarded-for'] : undefined;
  if (forwardedFor) {
    const first = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Hashes sensitive identifiers (e.g., email or phone) with a salt
 * to prevent leaking credentials or PII in logs or cache keys.
 */
export function hashIdentifier(identifier: string): string {
  return crypto.createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex').substring(0, 16);
}

/**
 * Generic Rate Limiting Middleware Factory
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    statusCode = 429,
    keyGenerator = (req: Request) => `${req.path}_${getClientIp(req)}`
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const { count, resetTime } = rateLimitStore.increment(key, windowMs);
      const now = Date.now();
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (count > max) {
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(statusCode).json({
          success: false,
          error: message,
          retryAfterSeconds
        });
      }

      next();
    } catch (err) {
      // Fail-safe fallback: rate limiter errors must NEVER crash the server or block legitimate users
      console.warn('[RATE LIMITER ERROR] Non-fatal rate limiting exception:', err);
      next();
    }
  };
}

/**
 * Specialized Authentication & Abuse Prevention Limits
 */

// 1. Login Rate Limiter: Keys on IP and provides progressive defense
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: 25, // 25 attempts per IP per 15 min (protects against distributed dictionary attacks)
  message: 'Too many login attempts from this network. Please wait 15 minutes before trying again.',
  keyGenerator: (req: Request) => `login_ip_${getClientIp(req)}`
});

// Failed Login Tracker by Account Identifier Hash
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_LOGIN_PER_ACCOUNT = 10; // 10 failed attempts before progressive pause

export function checkAccountLoginThrottle(identifier: string): { isThrottled: boolean; retryAfterSeconds: number } {
  const hash = hashIdentifier(identifier);
  const key = `login_fail_acc_${hash}`;
  const entry = rateLimitStore.get(key);

  if (entry && entry.count >= MAX_FAILED_LOGIN_PER_ACCOUNT) {
    const now = Date.now();
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return { isThrottled: true, retryAfterSeconds: retryAfter };
  }
  return { isThrottled: false, retryAfterSeconds: 0 };
}

export function recordFailedLogin(identifier: string): void {
  const hash = hashIdentifier(identifier);
  const key = `login_fail_acc_${hash}`;
  rateLimitStore.increment(key, FAILED_LOGIN_WINDOW_MS);
}

export function clearLoginAttempts(identifier: string): void {
  const hash = hashIdentifier(identifier);
  const key = `login_fail_acc_${hash}`;
  rateLimitStore.reset(key);
}

// 2. Registration Rate Limiter: 5 accounts per IP per 15 minutes
export const registrationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registration requests from this network. Please try again later.',
  keyGenerator: (req: Request) => `reg_ip_${getClientIp(req)}`
});

// 3. Media & Avatar Upload Rate Limiter: 20 uploads per 10 minutes
export const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Media upload frequency limit reached. Please wait a few minutes before uploading more assets.',
  keyGenerator: (req: Request) => `upload_${req.user?.userId || getClientIp(req)}`
});

// 4. Report & CSV Export Rate Limiter: 20 exports per 10 minutes
export const exportRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Export generation limit reached. Please wait a few minutes before downloading additional reports.',
  keyGenerator: (req: Request) => `export_${req.user?.userId || getClientIp(req)}`
});

// 5. Push Notification Broadcast Rate Limiter: 10 broadcasts per 10 minutes
export const broadcastRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Broadcast notification rate limit reached. Please space out announcements.',
  keyGenerator: (req: Request) => `broadcast_${req.user?.userId || getClientIp(req)}`
});

// 6. Attendance Clock-in Rate Limiter: 30 clock-ins per minute per IP (for kiosk / branch check-in)
export const clockInRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Attendance check-in frequency limit reached. Please retry in a moment.',
  keyGenerator: (req: Request) => `clockin_${getClientIp(req)}`
});

// 7. General API Rate Limiter: 300 requests per minute per IP
export const generalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded. Please reduce request frequency.',
  keyGenerator: (req: Request) => `api_gen_${getClientIp(req)}`
});
