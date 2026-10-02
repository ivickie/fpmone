import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import apiRoutes from './routes/api';
import { AttendanceService } from './services/attendanceService';
import { DiscoveryService } from './services/discoveryService';
import { StorageService } from './services/storageService';
import { db } from './data/mockDb';
import { checkConnection } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Vercel, Nginx) for protocol, host, and client IP
app.set('trust proxy', 1);

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', "default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:;");
  next();
});

// In-Memory Rate Limiting for Sensitive Endpoints
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}_${ip}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    }

    entry.count++;
    next();
  };
};

// Rate limit sensitive endpoints
app.use('/api/auth/login', createRateLimiter(15, 60 * 1000));
app.use('/api/auth/register', createRateLimiter(10, 60 * 1000));
app.use('/api/attendance/clock-in', createRateLimiter(30, 60 * 1000));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://192.168.1.234:3000',
      'http://192.168.1.234:5000',
      'http://192.168.1.234:5173',
      'http://10.164.108.241:3000',
      'http://10.164.108.241:5000',
      'http://10.164.108.241:5173'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser agents (mobile app, postman, curl) without origin header
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    try {
      const hostname = new URL(origin).hostname;
      // Allow configured origins, Vercel deployments, and local LAN addresses
      if (
        allowedOrigins.includes(origin) ||
        hostname.endsWith('.vercel.app') ||
        /^localhost$|^127\.0\.0\.1$|^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.\d+\.\d+\.\d+$/.test(hostname)
      ) {
        return callback(null, true);
      }
    } catch (_) {}
    callback(new Error('Blocked by CORS policy'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret']
}));

app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    app: 'FPM Global Backend API',
    ministry: "Faith Preachers Ministries Int'l",
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  const dbStatus = await checkConnection();
  res.json({
    status: dbStatus.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      provider: 'supabase_postgresql',
      connected: dbStatus.connected,
      version: dbStatus.version,
      timestamp: dbStatus.timestamp,
      error: dbStatus.error
    }
  });
});

// Static assets (logos, church media)
app.use('/assets', express.static(path.join(__dirname, '../public')));

// Static uploads (local development media fallback; production uses Supabase Storage)
if (!process.env.VERCEL) {
  const uploadsDir = StorageService.getUploadsDir({ ensureExists: true });
  if (uploadsDir && fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }
} else {
  // On Vercel, persistent media is served by Supabase Storage. Handle legacy /uploads requests gracefully
  app.use('/uploads', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Local filesystem storage is not available in production. All media assets are stored in Supabase Storage.'
    });
  });
}

// Mount modular API router
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GLOBAL ERROR HANDLER]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Unknown error')
  });
});

// Automatic 4-hour clock-out cron worker (runs in persistent standalone server environment)
if (!process.env.VERCEL) {
  setInterval(() => {
    try {
      const expiredCount = AttendanceService.autoClockOutExpiredSessions();
      if (expiredCount > 0) {
        console.log(`[BACKGROUND CRON] Automatically clocked out ${expiredCount} expired session(s).`);
      }
    } catch (err) {
      console.error('[BACKGROUND CRON ERROR]', err);
    }
  }, 10 * 60 * 1000);
}

// Ensure DB state is hydrated from Supabase PostgreSQL (handles serverless cold starts & standalone boots)
let dbHydrationPromise: Promise<boolean> | null = null;
export const ensureDbHydrated = (): Promise<boolean> => {
  if (!dbHydrationPromise) {
    dbHydrationPromise = db.initFromPostgres().catch((err: any) => {
      console.warn('[SERVER] Supabase PostgreSQL hydration warning:', err.message);
      return false;
    });
  }
  return dbHydrationPromise;
};

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await ensureDbHydrated();
  next();
});

export let server: any;
if (!process.env.VERCEL) {
  server = app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`=======================================================`);
    console.log(`  FAITH PREACHERS MINISTRIES INT'L - FPM GLOBAL API SERVER`);
    console.log(`  Running on: http://0.0.0.0:${PORT}`);
    console.log(`  LAN URL:    http://10.164.108.241:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
    DiscoveryService.start(5001, Number(PORT));
    await ensureDbHydrated();
  });
}

export default app;
