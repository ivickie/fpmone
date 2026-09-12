import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, IDS } from '../data/mockDb';
import { User, Member, AuthUserSession, RegistrationRequestDto, NotificationItem } from '../types';
import { AuditService } from './auditService';
import { persistUser, persistMember, persistNotification } from '../db/sync';

const DEFAULT_DEV_JWT = 'fpm_one_super_secret_jwt_key_faith_preachers_ministry_2026';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_JWT)) {
  console.error('[CRITICAL SECURITY WARNING] JWT_SECRET must be explicitly set to a cryptographically secure key in production!');
}

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT;

export class AuthService {
  public static async login(emailOrPhone: string, password: string): Promise<{ token?: string; user?: AuthUserSession; error?: string; status?: string }> {
    const cleanIdentifier = emailOrPhone.trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanIdentifier || u.phone === cleanIdentifier);

    if (!user) {
      return { error: 'Invalid email/phone or password.' };
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { error: 'Invalid email/phone or password.' };
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
      } : undefined
    };

    const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: '7d' });

    user.lastLoginAt = new Date().toISOString();
    persistUser(user).catch(() => {});
    AuditService.log(sessionUser.fullName, sessionUser.roleName, 'USER_LOGIN', 'user', user.id, user.id);

    return { token, user: sessionUser, status: 'active' };
  }

  public static async register(data: RegistrationRequestDto): Promise<{ success: boolean; message: string; userId?: string }> {
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

    // Prevent privilege escalation: Super Admin can NEVER be self-assigned during registration
    let assignedRoleId = data.ministryRoleId;
    const requestedRole = db.ministryRoles.find(r => r.id === data.ministryRoleId);
    if (!requestedRole || requestedRole.code === 'SUPER_ADMIN') {
      // Reassign to standard WORKER or MEMBER role
      assignedRoleId = data.isWorker ? IDS.ROLE_WORKER : IDS.ROLE_MEMBER;
    }

    // 3. Create user in pending state
    const newUser: User = {
      id: userId,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      accountStatus: 'pending',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);
    persistUser(newUser).catch(() => {});

    // 4. Create member profile
    const newMember: Member = {
      id: memberId,
      userId: userId,
      primaryBranchId: data.branchId,
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
    persistMember(newMember).catch(() => {});

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
      message: 'Your registration has been submitted and is awaiting approval.',
      userId
    };
  }

  public static getSessionByToken(token: string): AuthUserSession | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthUserSession;
    } catch {
      return null;
    }
  }
}
