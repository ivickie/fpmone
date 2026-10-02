# FPM Global — Production Security Hardening Audit Report

**Date:** October 2, 2026  
**Audited System:** FPM Global (Faith Preachers Ministries Int'l)  
**Audited Ecosystem:**
* Express/TypeScript REST API (`backend`)
* React/Vite Admin Portal (`admin-portal`)
* Native Android Client (`android`)
* PostgreSQL / Supabase Database & Supabase Storage
* Vercel Serverless Hosting Configuration

---

## 1. Executive Summary

This comprehensive security audit assesses the production readiness, multi-tenant isolation, authentication integrity, resource protection, and attack surface of FPM Global.

FPM Global is a church management ecosystem handling sensitive spiritual, administrative, personal, and financial data across multiple church branches (Faith Cathedral HQ, Lekki Grace Sanctuary, Port Harcourt Dominion, etc.).

The audit identified **11 specific findings** across varying severity levels:
- **Critical / High:** 3 findings (In-memory serverless rate limiter vulnerability, token non-revocation on account suspension, and timing attack / hardcoded default in cron authentication).
- **Medium:** 4 findings (Wildcard CORS over-trusting arbitrary `.vercel.app` domains, overly permissive CSP and missing security headers, mass assignment vulnerability in branch/settings configuration, and unauthenticated database diagnostic leakage).
- **Low / Informational:** 4 findings (Unauthenticated media upload route lacking magic-byte inspection, Android debug logging exposing HTTP request payloads, Android cleartext & backup manifest exposure, and Admin Portal token storage in localStorage).

All findings have been reviewed against actual user workflows to ensure that hardened protections introduce **zero user friction** (no unwanted CAPTCHAs, no aggressive lockouts of shared church WiFi IP addresses, and no breaking changes to API contracts).

---

## 2. Methodology & Scope

The audit examined:
1. **Infrastructure & Hosting:** `vercel.json`, `package.json`, environment variable handling, and serverless runtime constraints.
2. **HTTP & API Gateway:** Express middleware pipeline, Helmet/security headers, CORS origin resolution, error handling, and correlation IDs.
3. **Authentication & Session:** JWT signing/verification, algorithm pinning, password hashing parameters, account status lifecycles, and immediate token invalidation on disciplinary suspension.
4. **Authorization & Branch Isolation:** Role-Based Access Control (RBAC) across 7 ministry tiers, ID manipulation, BOLA (Broken Object Level Authorization), and mass assignment prevention.
5. **Database & Storage:** Supabase PostgreSQL RLS policies, SQL parameterization, privileged service-role key containment, and Supabase Storage upload validation.
6. **Mobile (Android):** `AndroidManifest.xml`, network security configuration, `EncryptedSharedPreferences`, and OkHttp logging interceptors.
7. **Automated Testing:** Existing 294-test regression suite and gap analysis for security tests.

---

## 3. Vulnerability Findings Matrix

| ID | Title | Severity | Status | Affected Component |
|---|---|---|---|---|
| **SEC-01** | Ephemeral In-Memory Rate Limiting in Serverless Environment | **High** | Confirmed Vulnerability | `backend/src/server.ts` |
| **SEC-02** | Token Validity Maintained Post-Account Suspension / Revocation | **High** | Confirmed Vulnerability | `backend/src/services/authService.ts` |
| **SEC-03** | Insecure Fallback Cron Secret & String-Timing Attack Vulnerability | **High** | Confirmed Vulnerability | `backend/src/middleware/authMiddleware.ts` |
| **SEC-04** | Broad CORS Origin Matching for Any Third-Party `*.vercel.app` Domain | **Medium** | Confirmed Vulnerability | `backend/src/server.ts` |
| **SEC-05** | Overly Permissive CSP & Missing Security Headers (`Referrer-Policy`, `Permissions-Policy`) | **Medium** | Confirmed Gap | `backend/src/server.ts` |
| **SEC-06** | Mass Assignment in Branch Update and System Settings Controllers | **Medium** | Confirmed Vulnerability | `backend/src/controllers/apiControllers.ts` |
| **SEC-07** | Information Disclosure on Public `/health` and `/api/db/status` Endpoints | **Medium** | Confirmed Vulnerability | `backend/src/server.ts`, `apiControllers.ts` |
| **SEC-08** | Unauthenticated Avatar Upload Lacking Magic-Byte File Header Validation | **Low** | Confirmed Vulnerability | `backend/src/controllers/apiControllers.ts` |
| **SEC-09** | Android Full Body HTTP Logging Exposing Credentials in Logcat | **Low** | Confirmed Gap | `android/app/src/main/java/.../ApiClient.kt` |
| **SEC-10** | Android Cleartext Traffic & ADB Backup Permitted in Manifest | **Low** | Confirmed Gap | `android/app/src/main/AndroidManifest.xml` |
| **SEC-11** | Admin Portal JWT Token Storage in Browser `localStorage` | **Informational** | Architectural Consideration | `admin-portal/src/services/api.ts` |

---

## 4. In-Depth Vulnerability Details

### SEC-01: Ephemeral In-Memory Rate Limiting in Serverless Environment
- **Affected Component:** `backend/src/server.ts:31-65`
- **Severity:** **High**
- **Classification:** Confirmed Vulnerability (CWE-770 / OWASP API4:2023 Unrestricted Resource Consumption)
- **Evidence:**
  ```typescript
  const rateLimitMap = new Map<string, RateLimitEntry>();
  export const createRateLimiter = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${req.path}_${ip}`;
      // In-memory counter on map...
  ```
- **Exploit Scenario & Impact:**
  On Vercel, requests are distributed across multiple serverless lambda instances. A brute-force attacker sending automated requests will hit different function instances, resetting or dodging the counter. Furthermore, the limiter increments on every request (even successful logins), lacks the standard `Retry-After` HTTP header, and relies exclusively on IP address—which could unfairly penalize legitimate church members sharing the same church campus WiFi.
- **Recommended Mitigation:**
  1. Build a specialized rate limiter middleware supporting serverless execution, progressive delays, and keying on normalized identifier hashes (for login) combined with IP buckets.
  2. Implement a fail-safe fallback store so that store downtime does not crash the server nor disable rate limiting.
  3. Emit standard `Retry-After` and `X-RateLimit-*` headers on HTTP 429.
  4. Ensure successful logins reset the failed-attempt counter.
- **Legitimate User Impact:** Zero. Church members with correct credentials will not be blocked; users on shared WiFi will not have their whole subnet locked out by another user's mistyped password.
- **Required Tests:**
  - Repeated invalid credentials trigger 429 with `Retry-After`.
  - Valid credentials log in cleanly and reset the counter.
  - Multi-instance simulation verifies threshold enforcement.

---

### SEC-02: Token Validity Maintained Post-Account Suspension / Revocation
- **Affected Component:** `backend/src/services/authService.ts:196-202`
- **Severity:** **High**
- **Classification:** Confirmed Vulnerability (CWE-613 / OWASP API2:2023 Broken Authentication)
- **Evidence:**
  ```typescript
  public static getSessionByToken(token: string): AuthUserSession | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthUserSession;
    } catch {
      return null;
    }
  }
  ```
- **Exploit Scenario & Impact:**
  When a pastoral leader or super administrator suspends an account (e.g., due to disciplinary action or compromised credentials), `user.accountStatus` becomes `'suspended'`. However, `jwt.verify` only checks the cryptographic signature and the 7-day expiration date against the static secret. A suspended user holding an existing JWT can continue executing authorized API requests for up to 7 days after suspension. Furthermore, `jwt.verify` does not specify `algorithms: ['HS256']`, leaving the endpoint open to potential algorithm confusion attacks.
- **Recommended Mitigation:**
  1. Pin the algorithm explicitly: `algorithms: ['HS256']`.
  2. Verify user active status server-side during session retrieval: if the account in `db.users` is `suspended`, `rejected`, or deleted, return `null` immediately.
- **Legitimate User Impact:** None. Active church members and workers operate normally.
- **Required Tests:**
  - Token verification immediately fails for an account transitioning to `suspended`.
  - Re-activating the account restores token validation or allows fresh login.

---

### SEC-03: Insecure Fallback Cron Secret & String-Timing Attack Vulnerability
- **Affected Component:** `backend/src/middleware/authMiddleware.ts:58-62`
- **Severity:** **High**
- **Classification:** Confirmed Vulnerability (CWE-208 / CWE-798 / OWASP API8:2023 Security Misconfiguration)
- **Evidence:**
  ```typescript
  export const requireCronAuth = (req: Request, res: Response, next: NextFunction) => {
    const cronSecretHeader = req.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'fpm_internal_cron_secret_2026';

    if (cronSecretHeader && cronSecretHeader === expectedSecret) {
      return next();
    }
  ```
- **Exploit Scenario & Impact:**
  1. If `CRON_SECRET` is omitted from production Vercel environment variables, the system falls back to the hardcoded public secret `'fpm_internal_cron_secret_2026'`. Any unauthorized actor knowing this repository code can trigger `/api/attendance/auto-clock-out` arbitrarily.
  2. The string equality operator `===` short-circuits on the first mismatched byte, allowing timing side-channel attacks to deduce the secret.
- **Recommended Mitigation:**
  1. In production (`NODE_ENV === 'production'`), refuse authorization if `CRON_SECRET` is not set or matches the insecure fallback.
  2. Use constant-time comparison via Node.js `crypto.timingSafeEqual` with matched buffer lengths.
- **Legitimate User Impact:** None. Scheduled tasks configured with the matching header will continue to run reliably.
- **Required Tests:**
  - Invalid cron secret is rejected with 401.
  - Correct cron secret is accepted in constant time.
  - Production mode without configured secret fails closed.

---

### SEC-04: Broad CORS Origin Matching for Any Third-Party `*.vercel.app` Domain
- **Affected Component:** `backend/src/server.ts:89-95`
- **Severity:** **Medium**
- **Classification:** Confirmed Vulnerability (CWE-346 / OWASP API8:2023 Security Misconfiguration)
- **Evidence:**
  ```typescript
  const hostname = new URL(origin).hostname;
  if (
    allowedOrigins.includes(origin) ||
    hostname.endsWith('.vercel.app') ||
    // ...
  ) {
    return callback(null, true);
  }
  ```
- **Exploit Scenario & Impact:**
  Because `hostname.endsWith('.vercel.app')` matches *any* subdomain on Vercel, an external third party can deploy `malicious-church-phish.vercel.app` and execute authenticated cross-origin fetch requests using a logged-in administrator's credentials if bearer tokens or cookies are accessible.
- **Recommended Mitigation:**
  Replace broad `.vercel.app` wildcarding with a strict pattern matching only authorized FPM projects (e.g. `fpmglobal*.vercel.app`, `fpmone*.vercel.app`, `ivickies-projects*.vercel.app`), alongside explicitly configured domains in `ALLOWED_ORIGINS`.
- **Legitimate User Impact:** None. Legitimate FPM preview and production deployments are permitted.
- **Required Tests:**
  - Request from `https://fpmglobal.vercel.app` is allowed.
  - Request from `https://evil-attacker.vercel.app` is blocked.

---

### SEC-05: Overly Permissive CSP & Missing Security Headers
- **Affected Component:** `backend/src/server.ts:22-29`
- **Severity:** **Medium**
- **Classification:** Confirmed Gap (CWE-1021 / CWE-693)
- **Evidence:**
  ```typescript
  res.setHeader('Content-Security-Policy', "default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:;");
  ```
- **Exploit Scenario & Impact:**
  The `default-src *` wildcard effectively disables CSP protection against Cross-Site Scripting (XSS) and data exfiltration. Additionally, `Referrer-Policy` and `Permissions-Policy` are absent, and Express `x-powered-by` is exposed.
- **Recommended Mitigation:**
  1. Define a strict CSP whitelisting only essential sources: `fonts.googleapis.com`, `fonts.gstatic.com`, `images.unsplash.com`, `*.supabase.co`, `*.supabase.in`, and `*.vercel.app`.
  2. Add `Referrer-Policy: strict-origin-when-cross-origin`.
  3. Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  4. Call `app.disable('x-powered-by')`.
- **Legitimate User Impact:** None. All Admin Portal fonts, icons, media uploads, and Unsplash placeholders function as expected.
- **Required Tests:**
  - Verify presence and correctness of all security headers on HTTP responses.

---

### SEC-06: Mass Assignment in Branch Update and System Settings Controllers
- **Affected Component:** `backend/src/controllers/apiControllers.ts:146, 2158`
- **Severity:** **Medium**
- **Classification:** Confirmed Vulnerability (CWE-915 / OWASP API6:2023 Server-Side Request Forgery & Mass Assignment)
- **Evidence:**
  ```typescript
  // updateBranchHandler:
  Object.assign(branch, req.body, { updatedAt: new Date().toISOString() });

  // updateSettingsHandler:
  Object.assign(db.attendanceSettings, req.body, { updatedAt: new Date().toISOString() });
  ```
- **Exploit Scenario & Impact:**
  In `updateBranchHandler`, a branch administrator could send `{ "isHeadquarters": true, "id": "other-id" }`, overwriting headquarters designation or corrupting entity primary keys. In `updateSettingsHandler`, arbitrary fields can be assigned to the system configuration object.
- **Recommended Mitigation:**
  Explicitly destructure and whitelist allowable mutable fields. Enforce type checks on numeric and boolean configuration settings. Prevent modification of immutable primary keys (`id`, `createdAt`) and restrict `isHeadquarters` assignment to Super Admins.
- **Legitimate User Impact:** None. Legitimate UI edits for branch details and attendance settings proceed seamlessly.
- **Required Tests:**
  - Attempting to pass `isHeadquarters: true` as a non-super-admin is ignored or rejected.
  - Immutable fields (`id`, `createdAt`) remain unchanged.

---

### SEC-07: Information Disclosure on Public `/health` and `/api/db/status` Endpoints
- **Affected Component:** `backend/src/server.ts:124-137`, `backend/src/controllers/apiControllers.ts:2267-2292`
- **Severity:** **Medium**
- **Classification:** Confirmed Vulnerability (CWE-200 / Information Disclosure)
- **Evidence:**
  `/health` and `/api/db/status` return internal database driver versions, connection timestamps, raw database error strings, and table record counts without authentication.
- **Exploit Scenario & Impact:**
  If a database connection error occurs, raw connection strings or internal database topology could be disclosed to unauthenticated internet scanners.
- **Recommended Mitigation:**
  In production (`NODE_ENV === 'production'`), sanitize public health check responses to return simple status codes (`{ "status": "healthy" | "degraded", "timestamp": "..." }`) and suppress raw error objects and database version strings.
- **Legitimate User Impact:** None. Uptime monitors and Vercel health probes continue to receive expected status responses.
- **Required Tests:**
  - Health check returns 200 without exposing database version or error messages in production.

---

### SEC-08: Unauthenticated Avatar Upload Lacking Magic-Byte File Header Validation
- **Affected Component:** `backend/src/controllers/apiControllers.ts:2204-2245`
- **Severity:** **Low**
- **Classification:** Confirmed Vulnerability (CWE-434 / Unrestricted Upload of File with Dangerous Type)
- **Evidence:**
  The endpoint `/api/media/upload-avatar` is unauthenticated (used by prospective members registering) and only checks `file.mimetype.startsWith('image/')`, which is an untrusted client-supplied header.
- **Exploit Scenario & Impact:**
  An attacker can upload arbitrary non-image files (e.g. HTML, SVG with embedded JavaScript, or binary payloads) with a spoofed `image/jpeg` MIME header, or spam storage without rate limiting.
- **Recommended Mitigation:**
  1. Inspect the binary buffer's magic bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WEBP: `52 49 46 46`).
  2. Apply rate limiting to `/api/media/upload-avatar`.
- **Legitimate User Impact:** None. Valid member JPEG, PNG, and WebP profile photos upload without issue.
- **Required Tests:**
  - Spoofed MIME type with non-image buffer is rejected with HTTP 400.
  - Valid image buffers are accepted.

---

### SEC-09: Android Full Body HTTP Logging Exposing Credentials in Logcat
- **Affected Component:** `android/app/src/main/java/org/fpm/one/core/network/ApiClient.kt:39-41, 56`
- **Severity:** **Low**
- **Classification:** Confirmed Gap (CWE-532 / Insertion of Sensitive Information into Log File)
- **Evidence:**
  ```kotlin
  val logging = HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY
  }
  // Added unconditionally:
  .addInterceptor(logging)
  ```
- **Exploit Scenario & Impact:**
  `Level.BODY` prints HTTP headers (including `Authorization: Bearer <token>`) and request bodies (including plaintext passwords during login and registration) to the Android device log buffer.
- **Recommended Mitigation:**
  Gate HTTP body logging to debug builds only (`if (BuildConfig.DEBUG)`), or omit sensitive auth headers and payloads from logging.

---

### SEC-10: Android Cleartext Traffic & ADB Backup Permitted in Manifest
- **Affected Component:** `android/app/src/main/AndroidManifest.xml:19, 25`
- **Severity:** **Low**
- **Classification:** Confirmed Gap (CWE-319 / CWE-200)
- **Evidence:**
  `android:allowBackup="true"` and `android:usesCleartextTraffic="true"`.
- **Exploit Scenario & Impact:**
  `allowBackup="true"` permits extracting application data using ADB on unlocked devices. Global `usesCleartextTraffic="true"` allows unencrypted HTTP traffic across any domain.
- **Recommended Mitigation:**
  Set `android:allowBackup="false"` to prevent local ADB data extraction. For network security, scope cleartext permissions strictly to local development LAN subnets while enforcing TLS for production domains.

---

### SEC-11: Admin Portal JWT Token Storage in Browser `localStorage`
- **Affected Component:** `admin-portal/src/services/api.ts:17-19`
- **Severity:** **Informational**
- **Classification:** Architectural Consideration (OWASP Top 10 A07:2021 Identification and Authentication Failures)
- **Evidence:**
  The Admin Portal stores its authentication token in browser `localStorage`.
- **Analysis & Recommendation:**
  While standard for modern SPAs, storing tokens in `localStorage` makes them accessible to any successful XSS injection. Because the mobile Android client relies on Bearer tokens, a forced migration to HttpOnly cookies would break cross-client parity if done carelessly.
  **Recommendation:** Maintain Bearer tokens for API consistency while hardening CSP to prevent XSS. For future releases, support optional dual-mode authentication (`HttpOnly` cookies for web admin, `Authorization: Bearer` for mobile).

---

## 5. Summary of Audit Recommendations

1. **Stage B / C Implementation:**
   - Deploy `rateLimitMiddleware.ts` with serverless resilience, identifier hashing, progressive delays, and fail-safe fallback.
   - Enforce active account status checks in `authService.ts` and pin `HS256` algorithms.
   - Secure `requireCronAuth` with `crypto.timingSafeEqual` and disable insecure defaults in production.
   - Restrict CORS Vercel preview domain wildcarding to legitimate FPM subdomains.
   - Tighten CSP, add `Referrer-Policy`, and add `Permissions-Policy`.
   - Eliminate mass assignment in `updateBranchHandler` and `updateSettingsHandler`.
   - Sanitize `/health` and `/api/db/status` responses.
   - Add magic-byte file validation to avatar uploads.
2. **Verification & Tests:**
   - Expand `backend/src/test.ts` to test all remediated vulnerabilities.
3. **Deployment Readiness:**
   - Document required Vercel and Supabase configuration variables.
