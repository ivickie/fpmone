# FPM ONE — Production Readiness & Deployment Checklist

**Platform:** Faith Preachers Ministry (FPM ONE)  
**Version:** 1.0.0 (Production Hardened)  
**Lead:** Principal Software Architect & QA Lead  
**Target Environments:** Cloud API (Docker / ECS / Kubernetes / Supabase) & Google Play Store  

---

## 1. Environment Configuration & Secrets Management

In production mode (`NODE_ENV=production`), all placeholder keys and dev secrets **must be replaced with cryptographically secure, high-entropy values**.

| Variable | Required in Prod | Production Guidance / Format | Default Fallback Allowed in Prod? |
| :--- | :---: | :--- | :---: |
| `NODE_ENV` | **YES** | Set strictly to `production` | **NO** |
| `PORT` | Optional | Internal container port (default: `5000`) | YES (5000) |
| `JWT_SECRET` | **YES** | High-entropy string (>= 64 chars, base64 / hex generated via `openssl rand -base64 48`). Server logs critical warning if missing or default. | **NO (Fatal)** |
| `CRON_SECRET` | **YES** | Pre-shared token used by cloud scheduler (e.g. AWS EventBridge / Cloud Tasks) to invoke `/api/attendance/auto-clock-out`. | **NO** |
| `ALLOWED_ORIGINS` | **YES** | Comma-separated list of allowed web origins, e.g.: `https://admin.faithpreachers.org,https://portal.faithpreachers.org` | **NO (Blocks Wildcard)** |
| `DATABASE_URL` | **YES** | Production PostgreSQL connection URI with SSL mode enabled (`sslmode=require`). | **NO** |

---

## 2. Database Deployment & Schema Verification

### Migration Steps:
1. **Apply Extensions:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```
2. **Execute Primary Schema (`backend/database/schema.sql`):**
   - Creates organizations, branches, ministry_roles, departments, members, workers, attendance tables, events, feed, notifications, audit_logs.
   - Enforces unique constraints: `UNIQUE (worker_id_code)`, `UNIQUE (branch_code)`, `UNIQUE (email)`.
3. **Execute Stored Procedures (`backend/database/functions.sql`):**
   - Creates `generate_next_worker_id()`, `record_worker_clock_in()`, `record_worker_clock_out()`, `auto_clock_out_expired_sessions()`, `mark_service_absences()`, `approve_member_registration()`.
4. **Row Level Security (RLS) Verification:**
   - Verify `ALTER TABLE members ENABLE ROW LEVEL SECURITY;`
   - Verify `ALTER TABLE workers ENABLE ROW LEVEL SECURITY;`
   - Verify `ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;`
5. **Initial Seed Execution (`backend/database/seed.sql`):**
   - Applies initial ministry branches, system ministry roles, departments, service schedules, and the initial Super Administrator account.

---

## 3. Backend API Gateway Production Verification

- [x] **Rate Limiting:** Sliding-window rate limiters active on `/api/auth/login` (15/min), `/api/auth/register` (10/min), and `/api/attendance/clock-in` (30/min).
- [x] **Security Headers:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-XSS-Protection: 0`
  - `Content-Security-Policy: default-src 'self'`
- [x] **BOLA Authorization:** Verified that `/api/attendance/clock-out` requires ownership or branch administration privileges.
- [x] **Branch Isolation:** Verified that branch pastors cannot approve, modify, reassign, or alter members and attendance outside their branch.
- [x] **Privilege Escalation Protection:** Self-registration role requests for Super Admin / Branch Pastor are intercepted and downgraded.
- [x] **Self-Approval Guard:** Administrators cannot approve their own registration requests.
- [x] **Automated Test Suite:** 40/40 tests passing (100%).
- [x] **Health Check Endpoint:** `GET /health` responding with `{ status: "healthy", timestamp: ... }`.

---

## 4. Android Client Production Checklist

- [x] **Secure Token Storage:** Replaced unencrypted preferences with `androidx.security.crypto.EncryptedSharedPreferences` using hardware-backed `MasterKey` (AES256-GCM / AES256-SIV).
- [x] **Biometrics:** `BiometricPrompt` implementation does not transmit biometric payloads over the network; biometric events authenticate locally to unlock signed attendance requests.
- [x] **ProGuard / R8 Rules:** Ensure data classes used by Kotlinx Serialization (`UserSession`, `AttendanceRecord`, etc.) are preserved in `proguard-rules.pro`.
- [x] **Release Keystore:** Generate upload key via Android Studio / Keytool for Google Play App Signing:
  ```bash
  keytool -genkey -v -keystore fpm-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fpm-release
  ```
- [x] **Compilation Verification:** `gradlew compileDebugKotlin` and `assembleDebug` executed successfully.

---

## 5. Web Admin Portal Production Checklist

- [x] **Production Bundle:** Generated via `npm run build` (`tsc && vite build`).
- [x] **Bundle Size Optimization:** CSS ~29.7 kB gzip: 5.82 kB; JS ~302.98 kB gzip: 75.41 kB.
- [x] **Environment Variable Injection:**
  - `VITE_API_URL`: Set to production API URL (e.g. `https://api.faithpreachers.org/api`).
- [x] **Static Asset Hosting:** Configured for hosting on Cloudflare Pages, AWS S3 + CloudFront, or Vercel with single-page-app rewrite rules (`/*` -> `/index.html`).

---

## 6. Operations, Monitoring & Incident Response

### 6.1 Scheduled Cron Operations
The attendance engine requires a periodic task to auto-terminate expired sessions:
- **Frequency:** Every 10 minutes.
- **Trigger:** Cloud Scheduler / Cron calling `POST https://api.faithpreachers.org/api/attendance/auto-clock-out` with header `x-cron-secret: <CRON_SECRET>` or internal node process `setInterval`.

### 6.2 Monitoring & Log Aggregation
- **Health Checks:** Uptime monitor pinging `GET /health` every 30 seconds.
- **Audit Logs:** Export `/api/audit-logs` to CloudWatch / Datadog / Elasticsearch for 365-day retention.
- **Error Tracking:** Integrate Sentry in frontend and backend to capture runtime unhandled exceptions without leaking PII.

### 6.3 Incident Response Runbook
1. **Suspected Compromised Admin Account:**
   - Invoke `MemberService.updateAccountStatus(userId, 'suspended', superAdminId)`.
   - Invalidate active JWT tokens by rotating user token salt or incrementing session version.
2. **Attendance Dispute:**
   - Consult immutable audit log: `SELECT * FROM audit_logs WHERE target_id = <attendance_id> ORDER BY created_at ASC;`
   - Review excuse records: `SELECT excused_by, excuse_reason, excused_at FROM attendance_records WHERE id = <attendance_id>;`
