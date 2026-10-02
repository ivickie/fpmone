# FPM Global — Production Security & Deployment Checklist

**Target:** FPM Global (Faith Preachers Ministries Int'l)  
**Deployment Platform:** Vercel Services (Express Backend + Vite Admin Portal)  
**Database & Storage:** Supabase PostgreSQL + Supabase Storage (`fpm-media`)  
**Date:** October 2, 2026  

---

## 1. Environment Variable Configuration

Configure the following environment variables in the **Vercel Project Settings** under **Environment Variables** (scoped to **Production**):

| Variable Name | Environment | Required | Description & Security Guidelines |
|---|---|---|---|
| `NODE_ENV` | Production | **YES** | Set strictly to `production`. Enables header hardening, log sanitization, and suppression of diagnostic errors. |
| `DATABASE_URL` | Production | **YES** | Supabase connection string (`postgresql://postgres.[REF]:[PASS]@[HOST]:5432/postgres`). Use connection pooler port 6543 for serverless where available. |
| `JWT_SECRET` | Production | **YES** | Cryptographically random string (min 64 chars, e.g. `openssl rand -hex 32`). Must NEVER match development fallback. |
| `CRON_SECRET` | Production | **YES** | Cryptographically random token (e.g. `openssl rand -hex 24`). Transmitted via `x-cron-secret` header in Vercel Cron. |
| `SUPABASE_URL` | Production | **YES** | Supabase project URL (`https://[PROJECT_REF].supabase.co`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **YES** | Privileged backend key for database sync and media storage. **NEVER expose to frontend or Android client.** |
| `SUPABASE_ANON_KEY` | Production | **YES** | Public anon key for client-side queries. |
| `ALLOWED_ORIGINS` | Production | Optional | Comma-separated list of custom production domains (e.g. `https://fpmchurch.org,https://portal.fpmchurch.org`). |
| `BASE_URL` | Production | Optional | Unified production domain URL (e.g. `https://fpmglobal.vercel.app`). |
| `AUTO_CLOCK_OUT_HOURS` | Production | Optional | Attendance auto clock-out window in hours (default: `4.0`). |
| `DEFAULT_GRACE_PERIOD_MINUTES` | Production | Optional | Service attendance grace period in minutes (default: `15`). |

> [!CAUTION]
> Never set `VITE_SUPABASE_SERVICE_ROLE_KEY` or commit `.env` files into source control. All `.env*` files are ignored in `.gitignore`.

---

## 2. Supabase Database & Storage Verification

1. **Row Level Security (RLS) Verification:**
   Ensure RLS is enabled on all tables exposed to PostgREST in the public schema:
   - `finance_transactions` (RLS enabled, managed via service-role API)
   - `finance_opening_balances` (RLS enabled, managed via service-role API)
   - `attendance_settings` (RLS enabled, public read, managed via service-role API)
   - `department_reports` (RLS enabled, public read, managed via service-role API)
   - `user_ministry_roles` (RLS enabled, public read, managed via service-role API)
   - `notification_reads` (RLS enabled, insert/update/delete scoped to `auth.uid() = user_id`)
   - `saved_posts` (RLS enabled, insert/delete scoped to `auth.uid() = user_id`)
2. **Supabase Storage Configuration:**
   - Bucket: `fpm-media`
   - Privacy: Public bucket for read/download access (`public = true`).
   - Listing Security: Directory listing policies on `storage.objects` are dropped to prevent broad enumeration.
   - Max file size ceiling: 10 MB per file.
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`.

---

## 3. Rate-Limit Storage Options & Cost Implications

FPM Global currently utilizes an in-memory sliding window cache per serverless function instance with automated eviction, identifier hashing, progressive delays, and fail-safe fallback.

If centralized atomic rate limiting across all concurrent Vercel serverless functions is desired as traffic scales:

| Strategy | Technology | Infrastructure Cost | Latency Impact | Recommendation |
|---|---|---|---|---|
| **Option A (Current)** | Serverless Memory Cache + Account DB Throttle | **$0 / month** (Zero added cost) | < 1 ms (Instant) | **Recommended for current stage.** Provides reliable protection against automated bursts without extra overhead. |
| **Option B** | Upstash Redis REST API (`@upstash/ratelimit`) | Free tier (10,000 req/day), then $0.20 / 100k req | ~15-30 ms per request | Suitable if distributed botnets target multiple serverless nodes simultaneously. |
| **Option C** | Vercel KV (powered by Upstash) | Free tier included with Pro plan | ~15-25 ms per request | Seamless one-click Vercel integration if upgraded to Pro. |

---

## 4. Production Smoke-Test Instructions

Perform these verification steps immediately after a deployment to confirm stability:

### Step 1: Health Probe
```bash
curl -i https://your-domain.vercel.app/health
```
- **Expected:** HTTP 200 OK
- **Payload:** `{"status":"healthy","timestamp":"..."}`
- **Security Check:** Confirm `database.version` and `database.error` are NOT present in the response.

### Step 2: Rate Limiting Verification
Run a rapid burst of login requests with invalid credentials:
```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://your-domain.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"emailOrPhone":"test@example.com","password":"invalid"}'
done
```
- **Expected:** Responses transition to HTTP 429 after 10 failed attempts with header `Retry-After: ...`.

### Step 3: Security Headers Verification
```bash
curl -I https://your-domain.vercel.app/
```
Verify the following headers are present:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`
- Verify `X-Powered-By` is **absent**.

### Step 4: Admin Portal Login & Session
1. Log in to the Admin Portal using Super Admin credentials.
2. Verify dashboard loads with KPI statistics, multi-branch summary, and attendance charts.
3. Verify image upload functions correctly and serves media from Supabase Storage.
4. Verify financial transactions and CSV reports export as expected.

---

## 5. Incident Response & Credential Rotation Procedure

### If a Token or User Session is Compromised
1. In the Admin Portal under **Members Management**, select the user and set their status to **Suspended**.
2. **Immediate Effect:** Because FPM Global checks active status on every request during token verification (`AuthService.getSessionByToken`), the user's token is revoked immediately.

### If `JWT_SECRET` is Compromised
1. Generate a new secret: `openssl rand -hex 32`.
2. Update `JWT_SECRET` in Vercel Environment Variables.
3. Trigger a redeployment.
4. **Impact:** All active sessions across Web and Mobile will be required to log in again.

### If `CRON_SECRET` is Compromised
1. Generate a new token: `openssl rand -hex 24`.
2. Update `CRON_SECRET` in Vercel Environment Variables.
3. Update the matching secret header in Vercel Cron configuration (`vercel.json` or Vercel dashboard).

### If Supabase Database or Service Role Key is Compromised
1. In the Supabase Dashboard under **Project Settings > API**, click **Generate new secret key**.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel Environment Variables.
3. Redeploy the Vercel backend.

---

## 6. Remaining Risks & Deferred Items

1. **Admin Portal Token Storage (Informational):**
   - The Admin Portal currently stores its JWT token in browser `localStorage`. While standard for SPAs, it is susceptible to token extraction if an XSS vulnerability exists.
   - **Mitigation in place:** Content Security Policy was hardened and sanitized.
   - **Deferred item:** Future consideration for `HttpOnly` dual-mode cookies for web while retaining Bearer tokens for mobile.
2. **Cleartext Traffic on Local LAN for Android (Low):**
   - For physical device testing over local WiFi (`192.168.1.159`), Android cleartext traffic is permitted in `network_security_config.xml`.
   - **Production build requirement:** When building signed release APKs/AABs for Google Play, remove LAN cleartext rules or enforce HTTPS via production domains.
