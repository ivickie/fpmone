import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, IDS } from '../data/mockDb';
import { User, Member, AuthUserSession, RegistrationRequestDto, NotificationItem, EmailVerificationRecord, PasswordResetRecord } from '../types';
import { AuditService } from './auditService';
import { SettingsService } from './settingsService';
import { EmailService } from './emailService';
import { persistUser, persistMember, persistNotification, persistDelete, persistEmailVerification, persistPasswordReset, fetchActiveEmailVerification, fetchActivePasswordReset, fetchActivePasswordResetByEmail } from '../db/sync';
import { checkAccountLoginThrottle, recordFailedLogin, clearLoginAttempts } from '../middleware/rateLimitMiddleware';

const DEFAULT_DEV_JWT = 'fpm_global_super_secret_jwt_key_faith_preachers_ministry_2026';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_JWT)) {
  console.error('[CRITICAL SECURITY WARNING] JWT_SECRET must be explicitly set to a cryptographically secure key in production!');
}

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT;

export class AuthService {
  /**
   * Evaluates if a user account is authorized to log in to the FPM Global Admin Portal.
   * Permitted roles & access levels:
   * - Admin (super_admin, church_admin, branch_admin, isAdmin = true, SUPER_ADMIN)
   * - Branch Admin (BRANCH_ADMIN or branch_admin)
   * - Branch Pastor (BRANCH_PASTOR)
   * - Associate Pastor (ASSOCIATE_PASTOR)
   * - Pastor (PASTOR)
   * - HOD (Head of Department)
   *
   * Regular workers and members without one of the above roles/titles cannot log into the Admin Portal.
   */
  public static isAuthorizedForAdminPortal(sessionUser: AuthUserSession, user?: User): boolean {
    if (!sessionUser) return false;

    // 1. Admin checks (isAdmin flag or adminLevel is not 'none')
    if (sessionUser.isAdmin) return true;
    if (sessionUser.adminLevel && sessionUser.adminLevel !== 'none') return true;
    if (user && (user.isAdmin || (user.adminLevel && user.adminLevel !== 'none'))) return true;

    // 2. Role code checks
    const roleCode = (sessionUser.roleCode || '').toUpperCase();
    const authorizedRoleCodes = [
      'SUPER_ADMIN',
      'BRANCH_ADMIN',
      'BRANCH_PASTOR',
      'ASSOCIATE_PASTOR',
      'PASTOR',
      'HOD'
    ];
    if (authorizedRoleCodes.includes(roleCode)) return true;

    // 3. Role name checks
    const roleName = (sessionUser.roleName || '').toLowerCase();
    if (
      roleName.includes('admin') ||
      roleName.includes('branch pastor') ||
      roleName.includes('associate pastor') ||
      roleName.includes('pastor') ||
      roleName.includes('hod') ||
      roleName.includes('head of department')
    ) {
      return true;
    }

    // 4. Department HOD assignment check in database
    const isDeptHod = db.departments.some(d =>
      d.hodId === sessionUser.userId ||
      Boolean(sessionUser.email && d.hodEmail && d.hodEmail.toLowerCase() === sessionUser.email.toLowerCase())
    );
    if (isDeptHod) return true;

    // 5. Worker position indicating HOD
    const positionName = (sessionUser.workerDetails?.positionName || '').toLowerCase();
    if (positionName.includes('hod') || positionName.includes('head of department')) {
      return true;
    }

    return false;
  }

  /**
   * Universal User Resolver:
   * Resolves a user account by:
   * 1. Exact email match (case-insensitive) or phone number
   * 2. Normalized local/international phone digits (e.g. 08000000010 <-> +2348000000010)
   * 3. Cross-domain alias: @fpmchurch.org <-> @faithpreachers.org
   * 4. Username prefix alias: 'pastor.abuja' matches 'pastor.abuja@faithpreachers.org', 'admin' matches Super Admin
   */
  public static resolveUser(identifier: string): User | undefined {
    if (!identifier) return undefined;
    const cleanIdentifier = identifier.trim().toLowerCase();

    // 1. Direct match on email or phone
    let user = db.users.find(u => u.email.toLowerCase() === cleanIdentifier || u.phone === cleanIdentifier);
    if (user) return user;

    // 2. Phone normalization (8+ digits)
    let digitsOnly = cleanIdentifier.replace(/\D/g, '');
    if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      digitsOnly = digitsOnly.slice(1);
    }
    if (digitsOnly.length >= 8) {
      user = db.users.find(u => {
        if (!u.phone) return false;
        const uDigits = u.phone.replace(/\D/g, '');
        return uDigits === digitsOnly || uDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uDigits);
      });
      if (user) return user;
    }

    // 3. Cross-domain alias fallback (@fpmchurch.org <-> @faithpreachers.org)
    if (cleanIdentifier.includes('@')) {
      const [localPart, domainPart] = cleanIdentifier.split('@');
      if (domainPart === 'fpmchurch.org') {
        const altEmail = `${localPart}@faithpreachers.org`;
        user = db.users.find(u => u.email.toLowerCase() === altEmail);
      } else if (domainPart === 'faithpreachers.org') {
        const altEmail = `${localPart}@fpmchurch.org`;
        user = db.users.find(u => u.email.toLowerCase() === altEmail);
      }
      if (user) return user;
    }

    // 4. Username / prefix alias fallback (e.g. 'admin', 'pastor.abuja', 'admin.lagos')
    if (!cleanIdentifier.includes('@')) {
      if (cleanIdentifier === 'admin' || cleanIdentifier === 'superadmin' || cleanIdentifier === 'super_admin') {
        user = db.users.find(u => u.adminLevel === 'super_admin' || u.email.toLowerCase() === 'admin@fpmchurch.org');
      } else {
        user = db.users.find(u => {
          const userPrefix = u.email.toLowerCase().split('@')[0];
          return userPrefix === cleanIdentifier;
        });
      }
    }

    return user;
  }

  /**
   * Dual Password Verifier:
   * Supports:
   * 1. The account's bcrypt hash (including custom generated spreadsheet passwords, e.g. Fpm*...)
   * 2. Whitespace / line break trimming tolerance for copy-pasting
   * 3. Universal default password 'Password123!' (and case/punctuation variants) as authorized fallback
   */
  public static async verifyPassword(inputPassword: string, user: User): Promise<boolean> {
    if (!inputPassword || !user || !user.passwordHash) return false;

    const rawPass = inputPassword;
    const trimmedPass = rawPass.trim();

    // 1. Direct bcrypt comparison against user's stored hash
    let isValid = await bcrypt.compare(rawPass, user.passwordHash);
    if (!isValid && trimmedPass !== rawPass) {
      isValid = await bcrypt.compare(trimmedPass, user.passwordHash);
    }
    return isValid;
  }

  public static async login(
    emailOrPhone: string,
    password: string,
    portal?: string
  ): Promise<{ token?: string; user?: AuthUserSession; error?: string; status?: string }> {
    const cleanIdentifier = emailOrPhone.trim().toLowerCase();

    // Check account-level throttle (progressive delay after failed attempts)
    const throttle = checkAccountLoginThrottle(cleanIdentifier);
    if (throttle.isThrottled) {
      return {
        error: `Too many failed login attempts. Please wait ${throttle.retryAfterSeconds} seconds before trying again.`
      };
    }

    // Find user using universal resolver
    const user = this.resolveUser(emailOrPhone);

    if (!user) {
      recordFailedLogin(cleanIdentifier);
      return { error: 'Invalid email/phone or password.' };
    }

    // Password verification with dual password support
    const isValidPassword = await this.verifyPassword(password, user);

    if (!isValidPassword) {
      recordFailedLogin(cleanIdentifier);
      return { error: 'Invalid email/phone or password.' };
    }

    // Check email verification status
    if (user.emailVerified === false) {
      return {
        status: 'unverified_email',
        error: 'Your email address has not been verified. Please enter the 6-digit verification code sent to your email.'
      };
    }

    // Check account status
    if (user.accountStatus === 'pending') {
      return {
        status: 'pending',
        error: 'Your registration has been submitted and is awaiting administrative approval.'
      };
    }

    if (user.accountStatus === 'suspended') {
      return {
        status: 'suspended',
        error: 'Your account is currently suspended. Please contact your branch administrator.'
      };
    }

    if (user.accountStatus === 'rejected') {
      return {
        status: 'rejected',
        error: `Your registration was not approved: ${user.rejectionReason || 'Please contact administration.'}`
      };
    }

    const member = db.members.find(m => m.userId === user.id);
    if (!member) {
      return { error: 'Member profile not found for this account.' };
    }

    const branch = db.branches.find(b => b.id === member.primaryBranchId);
    const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
    const worker = member.isWorker ? db.workers.find(w => w.memberId === member.id) : undefined;
    const department = worker ? db.departments.find(d => d.id === worker.departmentId) : undefined;

    const sessionUser: AuthUserSession = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      accountStatus: user.accountStatus,
      isAdmin: user.isAdmin,
      adminLevel: user.adminLevel,
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: `${member.firstName} ${member.lastName}`,
      branchId: member.primaryBranchId,
      branchName: branch ? branch.name : 'Faith Cathedral HQ',
      roleId: member.primaryRoleId,
      roleName: role ? role.name : 'Member',
      roleCode: role ? role.code : 'MEMBER',
      isWorker: member.isWorker,
      workerDetails: worker && department ? {
        workerId: worker.id,
        workerCode: worker.workerIdCode,
        departmentId: department.id,
        departmentName: department.name,
        positionName: worker.positionName,
        qrCodeToken: worker.qrCodeToken
      } : undefined,
      profilePictureUrl: member.profilePictureUrl
    };

    // Enforce Admin Portal authorization when logging in to the admin portal
    if (portal === 'admin' || portal === 'admin_portal') {
      if (!this.isAuthorizedForAdminPortal(sessionUser, user)) {
        return {
          status: 'unauthorized',
          error: "You're not authorized here."
        };
      }
    }

    const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: '7d' });

    user.lastLoginAt = new Date().toISOString();
    clearLoginAttempts(cleanIdentifier);
    persistUser(user).catch(() => {});
    AuditService.log(sessionUser.fullName, sessionUser.roleName, 'USER_LOGIN', 'user', user.id, user.id);

    return { token, user: sessionUser, status: 'active' };
  }

  public static async register(data: RegistrationRequestDto): Promise<{ success: boolean; message: string; userId?: string }> {
    // 0. Enforce Registration Settings
    const regSettings = SettingsService.getSettings().registration;
    if (!regSettings.allowRegistrations) {
      throw new Error(regSettings.registrationPausedMessage || 'New member registration is temporarily paused. Please contact church administration.');
    }

    // 1. Validate duplicates
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();

    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email address already exists.');
    }
    if (db.users.some(u => u.phone === cleanPhone)) {
      throw new Error('An account with this phone number already exists.');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = uuidv4();
    const memberId = uuidv4();
    const now = new Date().toISOString();

    // Prevent privilege escalation: Privileged roles (Pastors, Admins, HODs, Super Admins)
    // can NEVER be self-assigned during public registration.
    let assignedRoleId = data.ministryRoleId;
    const requestedRole = db.ministryRoles.find(r => r.id === data.ministryRoleId);
    const privilegedRoleCodes = [
      'SUPER_ADMIN',
      'BRANCH_ADMIN',
      'BRANCH_PASTOR',
      'ASSOCIATE_PASTOR',
      'PASTOR',
      'HOD'
    ];
    if (
      !requestedRole ||
      privilegedRoleCodes.includes(requestedRole.code.toUpperCase()) ||
      requestedRole.name.toLowerCase().includes('pastor') ||
      requestedRole.name.toLowerCase().includes('admin') ||
      requestedRole.name.toLowerCase().includes('hod') ||
      (requestedRole.hierarchyLevel !== undefined && requestedRole.hierarchyLevel < 6)
    ) {
      // Reassign to standard WORKER or MEMBER role
      assignedRoleId = data.isWorker ? IDS.ROLE_WORKER : IDS.ROLE_MEMBER;
    }

    // 3. Create user in pending state (or active if requireApproval is false)
    const newUser: User = {
      id: userId,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      accountStatus: regSettings.requireApproval ? 'pending' : 'active',
      emailVerified: false,
      isAdmin: false,
      adminLevel: 'none',
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);

    // 4. Create member profile
    const branchExists = data.branchId && db.branches.some(b => b.id === data.branchId);
    const effectiveBranchId = branchExists ? data.branchId : IDS.BRANCH_HQ;

    const newMember: Member = {
      id: memberId,
      userId: userId,
      primaryBranchId: effectiveBranchId,
      firstName: data.firstName.trim(),
      middleName: data.middleName ? data.middleName.trim() : undefined,
      lastName: data.lastName.trim(),
      primaryRoleId: assignedRoleId,
      isWorker: !!data.isWorker,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      residentialAddress: data.residentialAddress,
      profilePictureUrl: data.profilePictureUrl,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      createdAt: now,
      updatedAt: now
    };
    db.members.push(newMember);

    // Sequentially persist user and member to avoid foreign key violations
    try {
      await persistUser(newUser);
      await persistMember(newMember);
    } catch (e: any) {
      console.warn('[AUTH REGISTER DB PERSISTENCE ERROR]', e.message);
    }

    // 5. Generate and store 6-digit Email Verification OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Invalidate previous pending OTPs for this email in-memory
    db.emailVerifications = db.emailVerifications.filter(v => v.email.toLowerCase() !== cleanEmail);

    const verificationRecord: EmailVerificationRecord = {
      id: uuidv4(),
      userId,
      email: cleanEmail,
      otpHash,
      attemptsCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: now
    };
    db.emailVerifications.push(verificationRecord);
    persistEmailVerification(verificationRecord).catch(() => {});

    // 6. Send Verification Email via Brevo
    let emailDeliverySuccess = false;
    let emailDeliveryError: string | undefined;

    if (EmailService.isConfigured()) {
      const emailRes = await EmailService.sendVerificationOtp({
        toEmail: cleanEmail,
        recipientName: data.firstName.trim(),
        otp,
        expiresInMinutes: 10
      });
      emailDeliverySuccess = emailRes.success;
      emailDeliveryError = emailRes.error;
    } else {
      console.warn('[BREVO SERVICE UNCONFIGURED] Verification code generated but Brevo API credentials not set.');
    }

    // Log audit
    AuditService.log(
      `${data.firstName} ${data.lastName}`,
      'applicant',
      'MEMBER_REGISTERED',
      'user',
      userId,
      userId,
      null,
      { email: cleanEmail, branchId: data.branchId, isWorker: data.isWorker }
    );

    // Notify administrators
    const adminNotif: NotificationItem = {
      id: uuidv4(),
      title: 'New Member Registration Awaiting Approval',
      body: `${data.firstName} ${data.lastName} registered for ${data.isWorker ? 'Worker' : 'Member'} status.`,
      notificationType: 'announcement',
      targetScope: 'entire_church',
      createdAt: now
    };
    db.notifications.unshift(adminNotif);
    persistNotification(adminNotif).catch(() => {});

    return {
      success: true,
      message: 'Your registration has been submitted. Please check your email for a 6-digit verification code.',
      userId,
      requiresEmailVerification: true,
      email: cleanEmail,
      emailDelivery: {
        sent: emailDeliverySuccess,
        error: emailDeliveryError
      }
    } as any;
  }

  /**
   * Validates member-entered OTP against active verification record.
   */
  public static async verifyEmailOtp(params: {
    email: string;
    otp: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
    accountStatus?: string;
    requiresApproval?: boolean;
    remainingAttempts?: number;
  }> {
    const { email, otp, ipAddress } = params;
    if (!email || !otp) {
      return { success: false, message: '', error: 'Email address and verification code are required.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    let record = db.emailVerifications.find(
      v => v.email.toLowerCase() === cleanEmail && !v.verifiedAt && new Date(v.expiresAt).getTime() > Date.now()
    );

    if (!record) {
      const dbRecord = await fetchActiveEmailVerification(cleanEmail);
      if (dbRecord) {
        db.emailVerifications.push(dbRecord);
        record = dbRecord;
      }
    }

    if (!record) {
      return {
        success: false,
        message: '',
        error: 'The verification code has expired or is invalid. Please request a new code.'
      };
    }

    if (record.attemptsCount >= record.maxAttempts) {
      return {
        success: false,
        message: '',
        error: 'Maximum verification attempts exceeded. Please request a fresh code.'
      };
    }

    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (inputHash !== record.otpHash) {
      record.attemptsCount += 1;
      persistEmailVerification(record).catch(() => {});
      const remaining = Math.max(0, record.maxAttempts - record.attemptsCount);
      return {
        success: false,
        message: '',
        error: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
        remainingAttempts: remaining
      };
    }

    // OTP Match: Mark verified
    const now = new Date().toISOString();
    record.verifiedAt = now;
    persistEmailVerification(record).catch(() => {});

    // Update user record
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail || u.id === record!.userId);
    if (user) {
      user.emailVerified = true;
      user.emailVerifiedAt = now;
      user.updatedAt = now;
      await persistUser(user).catch(() => {});
      AuditService.log(user.email, user.adminLevel || 'member', 'EMAIL_VERIFIED', 'user', user.id, user.id);
    }

    return {
      success: true,
      message: 'Your email address has been verified successfully.',
      accountStatus: user ? user.accountStatus : 'pending',
      requiresApproval: user ? user.accountStatus === 'pending' : true
    };
  }

  /**
   * Resends verification OTP with 60s cooldown and Brevo email dispatch.
   */
  public static async resendVerificationOtp(params: {
    email: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
    cooldownSeconds?: number;
  }> {
    const { email, ipAddress } = params;
    if (!email) {
      return { success: false, message: '', error: 'Email address is required.' };
    }
    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (user && user.emailVerified === true) {
      return {
        success: true,
        message: 'This email address is already verified. You can log in with your credentials.'
      };
    }

    // Check 60-second cooldown from last creation
    const existing = db.emailVerifications
      .filter(v => v.email.toLowerCase() === cleanEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (existing.length > 0) {
      const latest = existing[0];
      const elapsedMs = Date.now() - new Date(latest.createdAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return {
          success: false,
          message: '',
          error: `Please wait ${waitSec} second(s) before requesting another code.`,
          cooldownSeconds: waitSec
        };
      }
    }

    // Invalidate existing active OTPs for this email
    db.emailVerifications.forEach(v => {
      if (v.email.toLowerCase() === cleanEmail && !v.verifiedAt) {
        v.expiresAt = new Date().toISOString();
        persistEmailVerification(v).catch(() => {});
      }
    });

    // Generate fresh OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const now = new Date().toISOString();
    const userId = user ? user.id : uuidv4();

    const record: EmailVerificationRecord = {
      id: uuidv4(),
      userId,
      email: cleanEmail,
      otpHash,
      attemptsCount: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      ipAddress,
      createdAt: now
    };
    db.emailVerifications.push(record);
    persistEmailVerification(record).catch(() => {});

    const member = user ? db.members.find(m => m.userId === user.id) : undefined;
    const recipientName = member ? `${member.firstName} ${member.lastName}` : cleanEmail.split('@')[0];

    if (EmailService.isConfigured()) {
      await EmailService.sendVerificationOtp({
        toEmail: cleanEmail,
        recipientName,
        otp,
        expiresInMinutes: 10
      });
    }

    return {
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.'
    };
  }

  /**
   * Generates single-use 6-digit password reset OTP (valid for 10 minutes) and dispatches email via Brevo.
   * Employs anti-enumeration to protect user privacy.
   */
  public static async requestPasswordReset(params: {
    email: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    const { email, ipAddress } = params;
    if (!email || !email.includes('@')) {
      return { success: false, message: '', error: 'Please enter a valid email address.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      // Invalidate existing unused reset records for this user
      const now = new Date().toISOString();
      db.passwordResets.forEach(pr => {
        if (pr.userId === user.id && !pr.usedAt) {
          pr.usedAt = now;
          persistPasswordReset(pr).catch(() => {});
        }
      });

      // Generate cryptographically secure 6-digit numeric OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

      const record: PasswordResetRecord = {
        id: uuidv4(),
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Exactly 10 minutes
        attemptsCount: 0,
        maxAttempts: 5,
        ipAddress,
        createdAt: now
      };
      db.passwordResets.push(record);
      persistPasswordReset(record).catch(() => {});

      const member = db.members.find(m => m.userId === user.id);
      const recipientName = member ? `${member.firstName} ${member.lastName}` : user.email.split('@')[0];

      if (EmailService.isConfigured()) {
        await EmailService.sendPasswordResetOtp({
          toEmail: user.email,
          recipientName,
          otp,
          expiresInMinutes: 10
        });
      }

      AuditService.log(user.email, user.adminLevel || 'member', 'PASSWORD_RESET_REQUESTED', 'user', user.id, user.id);
    }

    // Always return generic confirmation (prevents email enumeration attacks)
    return {
      success: true,
      message: 'If an account associated with that email exists, password reset instructions have been sent.'
    };
  }

  /**
   * Verifies a 6-digit password reset OTP.
   * On success, issues a single-use reset authorization token.
   */
  public static async verifyResetOtp(params: {
    email: string;
    otp: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    valid: boolean;
    resetAuthToken?: string;
    email?: string;
    message?: string;
    error?: string;
    remainingAttempts?: number;
  }> {
    const { email, otp, ipAddress } = params;
    if (!email || !otp) {
      return { success: false, valid: false, error: 'Email and verification code are required.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return { success: false, valid: false, error: 'Verification code must be 6 digits.' };
    }

    const now = Date.now();
    let record = db.passwordResets.find(
      pr => pr.email.toLowerCase() === cleanEmail && !pr.usedAt && new Date(pr.expiresAt).getTime() > now
    );

    if (!record) {
      const dbRecord = await fetchActivePasswordResetByEmail(cleanEmail);
      if (dbRecord) {
        db.passwordResets.push(dbRecord);
        record = dbRecord;
      }
    }

    if (!record) {
      return {
        success: false,
        valid: false,
        error: 'This verification code is invalid or has expired. Please request a new code.'
      };
    }

    const maxAttempts = record.maxAttempts || 5;
    if ((record.attemptsCount || 0) >= maxAttempts) {
      return {
        success: false,
        valid: false,
        error: 'Maximum verification attempts exceeded. Please request a new reset code.'
      };
    }

    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (inputHash !== record.tokenHash) {
      record.attemptsCount = (record.attemptsCount || 0) + 1;
      persistPasswordReset(record).catch(() => {});
      const remaining = Math.max(0, maxAttempts - record.attemptsCount);
      return {
        success: false,
        valid: false,
        error: 'Incorrect verification code. Please check your email and try again.',
        remainingAttempts: remaining
      };
    }

    // OTP verified successfully. Issue single-use reset authorization token.
    const resetAuthToken = crypto.randomBytes(32).toString('hex');
    const resetAuthTokenHash = crypto.createHash('sha256').update(resetAuthToken).digest('hex');
    record.verifiedAt = new Date().toISOString();
    record.resetAuthTokenHash = resetAuthTokenHash;
    // Set 15-minute validity window for resetAuthToken
    record.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    persistPasswordReset(record).catch(() => {});

    return {
      success: true,
      valid: true,
      resetAuthToken,
      email: record.email,
      message: 'Verification code confirmed. You may now set your new password.'
    };
  }

  /**
   * Resends a 6-digit password reset OTP with rate-limiting cooldown.
   */
  public static async resendPasswordResetOtp(params: {
    email: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
    cooldownSeconds?: number;
  }> {
    const { email, ipAddress } = params;
    if (!email || !email.includes('@')) {
      return { success: false, message: '', error: 'Please enter a valid email address.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Preserve anti-enumeration
      return {
        success: true,
        message: 'A fresh 6-digit password reset code has been dispatched to your email.'
      };
    }

    // Check active record for cooldown
    const active = db.passwordResets.find(
      pr => pr.userId === user.id && !pr.usedAt && new Date(pr.expiresAt).getTime() > Date.now()
    );

    if (active) {
      const createdTime = new Date(active.createdAt).getTime();
      const elapsed = Math.floor((Date.now() - createdTime) / 1000);
      const COOLDOWN_PERIOD = 60;
      if (elapsed < COOLDOWN_PERIOD) {
        const remaining = COOLDOWN_PERIOD - elapsed;
        return {
          success: false,
          error: `Please wait ${remaining} seconds before requesting a new reset code.`,
          message: '',
          cooldownSeconds: remaining
        };
      }
      // Invalidate previous OTP
      active.usedAt = new Date().toISOString();
      persistPasswordReset(active).catch(() => {});
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const nowIso = new Date().toISOString();

    const record: PasswordResetRecord = {
      id: uuidv4(),
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attemptsCount: 0,
      maxAttempts: 5,
      ipAddress,
      createdAt: nowIso
    };
    db.passwordResets.push(record);
    persistPasswordReset(record).catch(() => {});

    const member = db.members.find(m => m.userId === user.id);
    const recipientName = member ? `${member.firstName} ${member.lastName}` : user.email.split('@')[0];

    if (EmailService.isConfigured()) {
      await EmailService.sendPasswordResetOtp({
        toEmail: user.email,
        recipientName,
        otp,
        expiresInMinutes: 10
      });
    }

    return {
      success: true,
      message: 'A fresh 6-digit password reset code has been dispatched to your email.'
    };
  }

  /**
   * Validates a password reset token without consuming it.
   * Supports both legacy reset tokens and OTP-generated resetAuthTokens.
   */
  public static async verifyPasswordResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    error?: string;
  }> {
    if (!token || token.trim().length === 0) {
      return { valid: false, error: 'Password reset token is missing.' };
    }
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const now = Date.now();

    let record = db.passwordResets.find(
      pr => (pr.tokenHash === tokenHash || pr.resetAuthTokenHash === tokenHash) &&
            !pr.usedAt &&
            new Date(pr.expiresAt).getTime() > now
    );

    if (!record) {
      const dbRecord = await fetchActivePasswordReset(tokenHash);
      if (dbRecord) {
        db.passwordResets.push(dbRecord);
        record = dbRecord;
      }
    }

    if (!record) {
      return {
        valid: false,
        error: 'This password reset link or code is invalid, expired, or has already been used. Please request a new code.'
      };
    }

    return {
      valid: true,
      email: record.email
    };
  }

  /**
   * Completes the password reset by setting new password and invalidating token.
   * Supports resetAuthToken, token, and sends confirmation email.
   */
  public static async completePasswordReset(params: {
    token?: string;
    resetAuthToken?: string;
    email?: string;
    newPassword: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    const { token, resetAuthToken, email, newPassword, ipAddress } = params;
    const effectiveToken = (resetAuthToken || token || '').trim();

    if (!effectiveToken) {
      return { success: false, message: '', error: 'Password reset authorization token is required.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: '', error: 'New password must be at least 6 characters long.' };
    }

    const verification = await this.verifyPasswordResetToken(effectiveToken);
    if (!verification.valid) {
      return { success: false, message: '', error: verification.error || 'Invalid reset token.' };
    }

    const tokenHash = crypto.createHash('sha256').update(effectiveToken).digest('hex');
    const now = Date.now();

    let record = db.passwordResets.find(
      pr => (pr.tokenHash === tokenHash || pr.resetAuthTokenHash === tokenHash) &&
            !pr.usedAt &&
            new Date(pr.expiresAt).getTime() > now
    );
    if (!record) {
      const dbRecord = await fetchActivePasswordReset(tokenHash);
      if (dbRecord) {
        db.passwordResets.push(dbRecord);
        record = dbRecord;
      }
    }

    if (!record || record.usedAt || new Date(record.expiresAt).getTime() <= now) {
      return {
        success: false,
        message: '',
        error: 'Password reset authorization has expired or has already been used. Please request a new code.'
      };
    }

    const user = db.users.find(u => u.id === record!.userId || u.email.toLowerCase() === record!.email.toLowerCase());
    if (!user) {
      return { success: false, message: '', error: 'Associated user account could not be found.' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const nowIso = new Date().toISOString();

    user.passwordHash = newHash;
    user.hasChangedDefaultPassword = true;
    user.updatedAt = nowIso;

    // Mark token used
    record.usedAt = nowIso;
    persistPasswordReset(record).catch(() => {});

    // Invalidate any other active reset records for this user
    db.passwordResets.forEach(pr => {
      if (pr.userId === user.id && !pr.usedAt) {
        pr.usedAt = nowIso;
        persistPasswordReset(pr).catch(() => {});
      }
    });

    await persistUser(user);

    // Send confirmation email (never emailing new password)
    const member = db.members.find(m => m.userId === user.id);
    const recipientName = member ? `${member.firstName} ${member.lastName}` : user.email.split('@')[0];
    if (EmailService.isConfigured()) {
      EmailService.sendPasswordResetConfirmation({
        toEmail: user.email,
        recipientName
      }).catch(() => {});
    }

    AuditService.log(user.email, user.adminLevel || 'member', 'PASSWORD_RESET_COMPLETED', 'user', user.id, user.id);

    return {
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.'
    };
  }

  public static getSessionByToken(token: string): AuthUserSession | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUserSession;
      if (!decoded || !decoded.userId) return null;

      // Immediate server-side revocation on account suspension, rejection, or deletion
      const user = db.users.find(u => u.id === decoded.userId);
      if (user && user.accountStatus !== 'active') {
        return null;
      }

      return decoded;
    } catch {
      return null;
    }
  }

  public static async changePassword(params: {
    emailOrPhone?: string;
    currentPassword?: string;
    newPassword: string;
    userId?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    const { emailOrPhone, currentPassword, newPassword, userId } = params;

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.', message: '' };
    }

    let user: User | undefined;
    if (userId) {
      user = db.users.find(u => u.id === userId);
    } else if (emailOrPhone) {
      user = this.resolveUser(emailOrPhone);
    }

    if (!user) {
      return { success: false, error: 'User account not found.', message: '' };
    }

    if (!currentPassword) {
      return { success: false, error: 'Current password is required.', message: '' };
    }

    const isMatch = await this.verifyPassword(currentPassword, user);
    if (!isMatch) {
      return { success: false, error: 'Current password does not match.', message: '' };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: 'New password must be different from current password.', message: '' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    user.hasChangedDefaultPassword = true;
    user.updatedAt = new Date().toISOString();

    try {
      await persistUser(user);
    } catch (e: any) {
      console.warn('[AUTH PASSWORD CHANGE DB PERSISTENCE ERROR]', e.message);
    }

    AuditService.log(
      user.email,
      user.adminLevel || 'member',
      'PASSWORD_CHANGED',
      'user',
      user.id,
      user.id,
      null,
      { email: user.email }
    );

    return {
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.'
    };
  }

  public static async lookupMemberProfile(params: {
    emailOrPhone?: string;
    password?: string;
    userId?: string;
  }): Promise<{ success: boolean; user?: any; member?: any; error?: string }> {
    const { emailOrPhone, password, userId } = params;

    let user: User | undefined;
    if (userId) {
      user = db.users.find(u => u.id === userId);
    } else if (emailOrPhone) {
      user = this.resolveUser(emailOrPhone);
    }

    if (!user) {
      return { success: false, error: 'Account not found for the provided email or phone.' };
    }

    if (!userId) {
      if (!password) {
        return { success: false, error: 'Password is required to verify identity.' };
      }
      const isMatch = await this.verifyPassword(password, user);
      if (!isMatch) {
        return { success: false, error: 'Invalid password. Verification failed.' };
      }
    }

    const member = db.members.find(m => m.userId === user?.id);
    if (!member) {
      return { success: false, error: 'Member record not found for this account.' };
    }

    const branch = db.branches.find(b => b.id === member.primaryBranchId);
    const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
    const worker = member.isWorker ? db.workers.find(w => w.memberId === member.id) : undefined;
    const department = worker ? db.departments.find(d => d.id === worker.departmentId) : undefined;

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        accountStatus: user.accountStatus,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        createdAt: user.createdAt
      },
      member: {
        id: member.id,
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
        fullName: `${member.firstName} ${member.lastName}`,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
        residentialAddress: member.residentialAddress,
        profilePictureUrl: member.profilePictureUrl,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        branchId: member.primaryBranchId,
        branchName: branch ? branch.name : 'Faith Cathedral HQ',
        roleId: member.primaryRoleId,
        roleName: role ? role.name : 'Member',
        roleCode: role ? role.code : 'MEMBER',
        isWorker: member.isWorker,
        workerDetails: worker ? {
          workerId: worker.id,
          workerCode: worker.workerIdCode,
          departmentId: department?.id,
          departmentName: department?.name || 'Department Member',
          positionName: worker.positionName,
          dateStartedServing: worker.dateStartedServing,
          workerStatus: worker.workerStatus,
          biometricEnabled: worker.biometricEnabled
        } : undefined
      }
    };
  }

  public static async requestAccountDeletion(params: {
    emailOrPhone?: string;
    password?: string;
    reason?: string;
    userId?: string;
  }): Promise<{ success: boolean; deletedImmediately?: boolean; message: string; error?: string }> {
    const { emailOrPhone, password, reason, userId } = params;

    let user: User | undefined;
    if (userId) {
      user = db.users.find(u => u.id === userId);
    } else if (emailOrPhone) {
      user = this.resolveUser(emailOrPhone);
    }

    if (!user) {
      // Return neutral confirmation to prevent account enumeration
      return {
        success: true,
        deletedImmediately: false,
        message: 'Your account deletion request has been registered. If an account is associated with this email or phone number, all records will be permanently purged within 24 to 48 hours.'
      };
    }

    if (user.adminLevel === 'super_admin') {
      return {
        success: false,
        message: 'Super Administrator accounts cannot be self-deleted via automated web request. Please contact executive church leadership.',
        error: 'Super Administrator accounts cannot be self-deleted via automated web request.'
      };
    }

    // If password provided or authenticated user, verify and delete immediately
    let verified = !!userId;
    if (!verified && password && user) {
      verified = await this.verifyPassword(password, user);
    }

    if (verified) {
      const member = db.members.find(m => m.userId === user?.id);

      // Delete associated worker record
      if (member) {
        const workerIdx = db.workers.findIndex(w => w.memberId === member.id);
        if (workerIdx !== -1) {
          const worker = db.workers[workerIdx];
          db.workers.splice(workerIdx, 1);
          persistDelete('workers', worker.id).catch(() => {});
        }

        // Delete member record
        const memberIdx = db.members.findIndex(m => m.id === member.id);
        if (memberIdx !== -1) {
          db.members.splice(memberIdx, 1);
          persistDelete('members', member.id).catch(() => {});
        }
      }

      // Delete user record
      const userIdx = db.users.findIndex(u => u.id === user.id);
      if (userIdx !== -1) {
        db.users.splice(userIdx, 1);
        persistDelete('users', user.id).catch(() => {});
      }

      AuditService.log(
        user.email,
        'member',
        'DELETE_ACCOUNT_IMMEDIATE',
        'user',
        user.id,
        user.id,
        undefined,
        { reason: reason || 'Self requested' }
      );

      return {
        success: true,
        deletedImmediately: true,
        message: 'Your FPM Global account, profile, and all associated church data have been permanently deleted.'
      };
    }

    // Unverified request: log for administrative review & deletion
    AuditService.log(
      user.email,
      'member',
      'DELETE_ACCOUNT_REQUEST',
      'user',
      user.id,
      user.id,
      undefined,
      { reason: reason || 'Not specified' }
    );

    return {
      success: true,
      deletedImmediately: false,
      message: 'Your account deletion request has been logged. Our administrative team will verify and permanently purge your records within 24 to 48 hours.'
    };
  }
}
