import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import apiRoutes from './routes/api';
import { AttendanceService } from './services/attendanceService';
import { DiscoveryService } from './services/discoveryService';
import { StorageService } from './services/storageService';
import { db } from './data/mockDb';
import { checkConnection } from './db';
import { generalApiRateLimiter } from './middleware/rateLimitMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Disable server fingerprinting header
app.disable('x-powered-by');

// Trust reverse proxy (Vercel, Nginx) for protocol, host, and client IP
app.set('trust proxy', 1);

// Correlation / Request ID Tracking Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-Id', reqId);
  (req as any).id = reqId;
  next();
});

// Production Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.supabase.in; connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.vercel.app https://fpmglobal.online https://*.fpmglobal.online; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
  next();
});

// Production & Custom Allowed Domains
export const isAllowedCustomDomain = (hostname: string): boolean => {
  return hostname === 'fpmglobal.online' || hostname === 'www.fpmglobal.online';
};

// Vercel Preview & Production Deployment Subdomains
export const isAllowedVercelDomain = (hostname: string): boolean => {
  // Restrict preview origins strictly to verified FPM deployment subdomains
  return /^(fpmglobal|fpmone|ivickies-projects)[\w-]*\.vercel\.app$/.test(hostname);
};

// Local Development Hostnames & Private Network IPs
export const isAllowedDevHost = (hostname: string): boolean => {
  return /^localhost$|^127\.0\.0\.1$|^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);
};

export const getExplicitAllowedOrigins = (): string[] => {
  const baseAllowedOrigins = [
    'https://fpmglobal.online',
    'https://www.fpmglobal.online',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://192.168.1.234:3000',
    'http://192.168.1.234:5000',
    'http://192.168.1.234:5173',
    'http://10.164.108.241:3000',
    'http://10.164.108.241:5000',
    'http://10.164.108.241:5173'
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
    : [];

  return Array.from(new Set([...baseAllowedOrigins, ...envOrigins]));
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Non-browser clients (mobile app, CLI, internal jobs) send no Origin header
  if (!origin) {
    return true;
  }

  try {
    const normalized = origin.trim().replace(/\/$/, '');
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    // 1. Explicit allowlist check
    const allowed = getExplicitAllowedOrigins();
    if (allowed.includes(normalized)) {
      return true;
    }

    // 2. Production Custom Domains (fpmglobal.online / www.fpmglobal.online)
    if (isAllowedCustomDomain(hostname)) {
      return true;
    }

    // 3. Verified Vercel Preview / Production Subdomains
    if (isAllowedVercelDomain(hostname)) {
      return true;
    }

    // 4. Local Development Hostnames & Private Network IPs
    if (isAllowedDevHost(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-cron-secret',
    'x-request-id',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Apply General API Rate Limiting across all API routes (300 req/min allowance)
app.use('/api', generalApiRateLimiter);

// Express JSON body parser with 10MB limit
app.use(express.json({ limit: '10mb' }));

// Request logging in development (Correlation ID tagged)
app.use((req, res, next) => {
  const reqId = (req as any).id || '-';
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl}`);
  }
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
  await ensureDbHydrated().catch(() => {});
  const dbStatus = await checkConnection();
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, avoid leaking internal database engine versions or raw connection errors
  if (isProduction) {
    return res.json({
      status: dbStatus.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    });
  }

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

// Lazy database hydration middleware for all /api requests (cold starts and periodic refresh)
app.use('/api', async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await ensureDbHydrated();
  } catch (err: any) {
    console.warn('[SERVER] DB hydration error in middleware:', err?.message || err);
  }
  next();
});

// Mount modular API router
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.message === 'Blocked by CORS policy') {
    // 403 Forbidden for CORS origin rejections - do not report as 500 Internal Server Error
    return res.status(403).json({
      success: false,
      error: 'Blocked by CORS policy'
    });
  }
  console.error('[GLOBAL ERROR HANDLER]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Unknown error')
  });
});

// Automatic 4-hour clock-out cron worker (runs in persistent standalone server environment)
if (!process.env.VERCEL && require.main === module) {
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

// Database hydration from Supabase PostgreSQL
let dbHydrationPromise: Promise<boolean> | null = null;
let lastHydratedAt = 0;

export const ensureDbHydrated = (force: boolean = false): Promise<boolean> => {
  if (process.env.HYDRATE_DB === 'false' || !process.env.DATABASE_URL) {
    return Promise.resolve(false);
  }

  const now = Date.now();
  // If already hydrated within the last 60 seconds, return existing promise
  if (dbHydrationPromise && !force && (now - lastHydratedAt < 60_000)) {
    return dbHydrationPromise;
  }

  dbHydrationPromise = db.initFromPostgres().then((res: boolean) => {
    lastHydratedAt = Date.now();
    return res;
  }).catch((err: any) => {
    console.warn('[SERVER] Supabase PostgreSQL hydration warning:', err.message);
    return false;
  });

  return dbHydrationPromise;
};

export let server: any;
if (!process.env.VERCEL && require.main === module) {
  server = app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`=======================================================`);
    console.log(`  FAITH PREACHERS MINISTRIES INT'L - FPM GLOBAL API SERVER`);
    console.log(`  Running on: http://0.0.0.0:${PORT}`);
    console.log(`  LAN URL:    http://10.164.108.241:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
    DiscoveryService.start(5001, Number(PORT));
    if (process.env.HYDRATE_DB !== 'false' && process.env.DATABASE_URL) {
      await ensureDbHydrated();
    }
  });
}

export default app;
