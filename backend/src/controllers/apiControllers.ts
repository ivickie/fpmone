import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, IDS } from '../data/mockDb';
import { AuthService } from '../services/authService';
import { MemberService } from '../services/memberService';
import { AttendanceService } from '../services/attendanceService';
import { AuditService } from '../services/auditService';
import { StorageService } from '../services/storageService';
import { FinanceService } from '../services/financeService';
import { SettingsService } from '../services/settingsService';
import {
  Branch, Department, DepartmentPosition, EventItem, PostItem,
  ServiceSchedule, TestimonyItem, NotificationItem, MinistryRole, MediaItem,
  DepartmentReport, SundayMoment
} from '../types';
import {
  persistService, persistDepartmentReport, persistDelete, persistDepartment,
  persistWorker, persistBranch, persistDepartmentPosition, persistRole,
  persistMember, persistUser, persistEvent, persistPost,
  persistServiceHighlight, persistTestimony, persistNotification,
  persistSundayMoment, deleteSundayMomentFromDb, sanitizeMediaUrl
} from '../db/sync';

// =============================================================================
// AUTH CONTROLLER
// =============================================================================
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password, portal } = req.body;
    const portalHeader = (req.headers['x-portal'] || req.headers['x-client-app']) as string | undefined;
    const requestedPortal = portal || portalHeader;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Email/Phone and Password are required.' });
    }
    const result = await AuthService.login(emailOrPhone, password, requestedPortal);
    if (result.error) {
      const statusCode = (result.status === 'pending' || result.status === 'unauthorized') ? 403 : 401;
      return res.status(statusCode).json({
        error: result.error,
        status: result.status
      });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
};

export const registerHandler = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
};

export const getProfileHandler = (req: Request, res: Response) => {
  const portalHeader = (req.headers['x-portal'] || req.headers['x-client-app']) as string | undefined;
  if ((portalHeader === 'admin' || portalHeader === 'admin_portal') && req.user) {
    if (!AuthService.isAuthorizedForAdminPortal(req.user)) {
      return res.status(403).json({ error: "You're not authorized here." });
    }
  }
  return res.json(req.user);
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    const { phone, residentialAddress, emergencyContactName, emergencyContactPhone, profilePictureUrl } = req.body;
    const member = db.members.find(m => m.id === req.user?.memberId || m.userId === req.user?.userId);
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    if (phone) {
      const user = db.users.find(u => u.id === req.user?.userId);
      if (user) {
        user.phone = phone;
        user.updatedAt = new Date().toISOString();
        await persistUser(user).catch(err => console.warn('[PERSIST USER ERROR]', err.message));
      }
    }
    if (residentialAddress !== undefined) member.residentialAddress = residentialAddress;
    if (emergencyContactName !== undefined) member.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) member.emergencyContactPhone = emergencyContactPhone;
    if (profilePictureUrl !== undefined) member.profilePictureUrl = profilePictureUrl;
    member.updatedAt = new Date().toISOString();
    await persistMember(member).catch(err => console.warn('[PERSIST MEMBER ERROR]', err.message));

    return res.json({ success: true, member });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const changePasswordHandler = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (!userId && !emailOrPhone) {
      return res.status(400).json({ error: 'Email or phone number is required.' });
    }

    const result = await AuthService.changePassword({
      emailOrPhone,
      currentPassword,
      newPassword,
      userId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update password.' });
  }
};

export const lookupMemberProfileHandler = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    const userId = req.user?.userId;

    if (!userId && !emailOrPhone) {
      return res.status(400).json({ error: 'Email or phone number is required.' });
    }

    const result = await AuthService.lookupMemberProfile({
      emailOrPhone,
      password,
      userId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve profile.' });
  }
};

export const deleteAccountRequestHandler = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password, reason } = req.body;
    const userId = req.user?.userId;

    if (!userId && !emailOrPhone?.trim()) {
      return res.status(400).json({ success: false, error: 'Registered email or phone number is required.' });
    }

    const result = await AuthService.requestAccountDeletion({
      emailOrPhone: emailOrPhone?.trim(),
      password,
      reason,
      userId
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json(result);
  } catch (err: any) {
    console.error('deleteAccountRequestHandler error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process account deletion request. Please contact contact@fpmglobal.online directly.'
    });
  }
};

// =============================================================================
// BRANCHES CONTROLLER
// =============================================================================
export const getBranchesHandler = (req: Request, res: Response) => {
  const branches = (db.branches || []).map(b => ({
    ...b,
    logoUrl: sanitizeMediaUrl(b.logoUrl) || b.logoUrl,
    coverImageUrl: sanitizeMediaUrl(b.coverImageUrl || b.imageUrl),
    imageUrl: sanitizeMediaUrl(b.imageUrl || b.coverImageUrl)
  }));
  return res.json(branches);
};

export const createBranchHandler = async (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super Administrator privileges required to create branches.' });
    }
    const { name, branchCode, address, city, state, country, phone, email, branchPastorName, logoUrl, coverImageUrl, imageUrl } = req.body;
    if (!name || !branchCode || !address || !city) {
      return res.status(400).json({ success: false, error: 'Name, branch code, address, and city are required.' });
    }
    const sanitizedCover = sanitizeMediaUrl(coverImageUrl || imageUrl);
    const sanitizedLogo = sanitizeMediaUrl(logoUrl) || logoUrl;
    const newBranch: Branch = {
      id: uuidv4(),
      organizationId: 'org-fpm-global',
      name,
      branchCode: branchCode.toUpperCase(),
      address,
      city,
      state,
      country: country || 'Nigeria',
      phone,
      email,
      branchPastorName,
      logoUrl: sanitizedLogo,
      coverImageUrl: sanitizedCover,
      imageUrl: sanitizedCover,
      status: 'active',
      isHeadquarters: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.branches.push(newBranch);
    await persistBranch(newBranch).catch(err => console.warn('[PERSIST BRANCH ERROR]', err.message));
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'BRANCH_CREATED', 'branch', newBranch.id, req.user?.userId, null, newBranch);
    return res.status(201).json(newBranch);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateBranchHandler = async (req: Request, res: Response) => {
  const isSuperAdmin = req.user?.adminLevel === 'super_admin';
  const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

  // HODs and other roles without branch_admin or super_admin cannot edit church branches
  if (!isSuperAdmin && !isBranchAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Branch Administrator or Super Administrator privileges required to edit church branch details. Heads of Department cannot edit branch settings.'
    });
  }

  if (!isSuperAdmin && req.user?.branchId !== req.params.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to modify another branch.' });
  }
  const branch = db.branches.find(b => b.id === req.params.id);
  if (!branch) return res.status(404).json({ success: false, error: 'Branch not found.' });

  // Whitelist allowable mutable fields to prevent mass assignment of id, createdAt, or unauthorized elevation
  const { name, branchCode, code, address, city, state, country, phone, email, branchPastorName, pastorName, branchPastorId, logoUrl, coverImageUrl, imageUrl, status } = req.body;
  if (name !== undefined) branch.name = String(name).trim();
  if (branchCode !== undefined || code !== undefined) branch.branchCode = String(branchCode || code).trim().toUpperCase();
  if (address !== undefined) branch.address = String(address).trim();
  if (city !== undefined) branch.city = String(city).trim();
  if (state !== undefined) branch.state = String(state).trim();
  if (country !== undefined) branch.country = String(country).trim();
  if (phone !== undefined) branch.phone = String(phone).trim();
  if (email !== undefined) branch.email = String(email).trim().toLowerCase();
  if (branchPastorName !== undefined || pastorName !== undefined) branch.branchPastorName = String(branchPastorName || pastorName).trim();
  if (branchPastorId !== undefined) branch.branchPastorId = String(branchPastorId).trim();
  if (logoUrl !== undefined) branch.logoUrl = sanitizeMediaUrl(logoUrl) || logoUrl;
  if (coverImageUrl !== undefined || imageUrl !== undefined) {
    const newCover = sanitizeMediaUrl(coverImageUrl ?? imageUrl);
    branch.coverImageUrl = newCover;
    branch.imageUrl = newCover;
  }
  if (status !== undefined) branch.status = status;

  // Only Super Admin can change headquarters status
  if (isSuperAdmin && req.body.isHeadquarters !== undefined) {
    branch.isHeadquarters = Boolean(req.body.isHeadquarters);
  }

  branch.updatedAt = new Date().toISOString();
  await persistBranch(branch).catch(err => console.warn('[PERSIST BRANCH ERROR]', err.message));
  AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'BRANCH_UPDATED', 'branch', branch.id, req.user?.userId, null, branch);
  return res.json(branch);
};

export const deleteBranchHandler = async (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super Administrator privileges required to manage branches.' });
    }
    const { id } = req.params;
    const branch = db.branches.find(b => b.id === id);
    if (!branch) return res.status(404).json({ success: false, error: 'Branch not found.' });

    if (branch.isHeadquarters) {
      return res.status(400).json({ success: false, error: 'Headquarters branch cannot be deleted or archived.' });
    }

    const hasMembers = db.members.some(m => m.primaryBranchId === id);
    const hasServices = db.services.some(s => s.branchId === id && s.status !== 'archived');
    const hasEvents = db.events.some(e => e.branchId === id && e.status !== 'archived');
    const hasAttendance = db.attendanceRecords.some(a => a.branchId === id);

    const hasDependencies = hasMembers || hasServices || hasEvents || hasAttendance;

    if (hasDependencies) {
      branch.status = 'archived';
      branch.updatedAt = new Date().toISOString();
      await persistBranch(branch).catch(err => console.warn('[PERSIST BRANCH ERROR]', err.message));
      AuditService.log(
        req.user?.fullName || 'Admin',
        req.user?.roleName || 'admin',
        'BRANCH_ARCHIVED',
        'branch',
        branch.id,
        req.user?.userId,
        { status: 'active' },
        { status: 'archived', reason: 'Archived due to existing dependent records' }
      );
      return res.json({
        success: true,
        message: 'Branch has active members, services, or attendance records. It has been safely archived.',
        action: 'archived',
        branch
      });
    }

    const idx = db.branches.findIndex(b => b.id === id);
    db.branches.splice(idx, 1);
    await persistDelete('branches', id).catch(err => console.warn('[DELETE BRANCH ERROR]', err.message));
    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'BRANCH_DELETED',
      'branch',
      id,
      req.user?.userId,
      branch,
      null
    );
    return res.json({ success: true, message: 'Branch permanently deleted.', action: 'deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// DEPARTMENTS & ROLES CONTROLLER
// =============================================================================

/**
 * Ensures that a department has strictly ONLY ONE Head of Department (HOD).
 * If a new HOD is appointed:
 * 1. The new HOD's worker record in this department has positionName set to 'Head of Department'.
 * 2. ANY OTHER worker in this department who previously held an HOD position is reset to 'Worker'.
 * 3. Department hodId and hodName are updated and persisted.
 */
export async function enforceSingleDepartmentHod(departmentId: string, newHodUserId: string, newHodName?: string): Promise<void> {
  const dept = db.departments.find(d => d.id === departmentId);
  if (!dept) return;

  dept.hodId = newHodUserId;
  if (newHodName) dept.hodName = newHodName;
  const user = db.users.find(u => u.id === newHodUserId);
  if (user) dept.hodEmail = user.email;

  const promises: Promise<any>[] = [];

  // 1. Ensure the new HOD's worker record (if exists) is linked to this department and has HOD position
  const targetMember = db.members.find(m => m.userId === newHodUserId);
  let targetWorkerId: string | undefined;
  if (targetMember) {
    const hodWorker = db.workers.find(w => w.memberId === targetMember.id);
    if (hodWorker) {
      targetWorkerId = hodWorker.id;
      hodWorker.departmentId = departmentId;
      hodWorker.positionName = 'Head of Department';
      hodWorker.updatedAt = new Date().toISOString();
      promises.push(persistWorker(hodWorker).catch(err => console.warn('[PERSIST WORKER ERROR]', err.message)));
    }
  }

  // 2. Demote any other worker in this department who held an HOD/Director position
  const deptWorkers = db.workers.filter(w => w.departmentId === departmentId);
  deptWorkers.forEach(w => {
    if (targetWorkerId && w.id === targetWorkerId) return;

    const member = db.members.find(m => m.id === w.memberId);
    if (member && member.userId === newHodUserId) {
      w.positionName = 'Head of Department';
      w.updatedAt = new Date().toISOString();
      promises.push(persistWorker(w).catch(err => console.warn('[PERSIST WORKER ERROR]', err.message)));
      return;
    }

    const pos = (w.positionName || '').toLowerCase();
    if (pos.includes('head') || pos.includes('hod') || pos.includes('director')) {
      w.positionName = 'Worker';
      w.updatedAt = new Date().toISOString();
      promises.push(persistWorker(w).catch(err => console.warn('[PERSIST WORKER ERROR]', err.message)));
    }
  });

  dept.updatedAt = new Date().toISOString();
  promises.push(persistDepartment(dept).catch(err => console.warn('[PERSIST DEPT ERROR]', err.message)));
  await Promise.all(promises);
}

export async function clearDepartmentHod(departmentId: string): Promise<void> {
  const dept = db.departments.find(d => d.id === departmentId);
  if (!dept) return;

  dept.hodId = undefined;
  dept.hodName = undefined;
  dept.hodEmail = undefined;

  const promises: Promise<any>[] = [];
  const deptWorkers = db.workers.filter(w => w.departmentId === departmentId);
  deptWorkers.forEach(w => {
    const pos = (w.positionName || '').toLowerCase();
    if (pos.includes('head') || pos.includes('hod') || pos.includes('director')) {
      w.positionName = 'Worker';
      w.updatedAt = new Date().toISOString();
      promises.push(persistWorker(w).catch(err => console.warn('[PERSIST WORKER ERROR]', err.message)));
    }
  });

  dept.updatedAt = new Date().toISOString();
  promises.push(persistDepartment(dept).catch(err => console.warn('[PERSIST DEPT ERROR]', err.message)));
  await Promise.all(promises);
}

export interface HodResolutionResult {
  isValid: boolean;
  error?: string;
  statusCode?: number;
  hodUserId?: string;
  hodMemberId?: string;
  hodName?: string;
  hodEmail?: string;
}

export function validateAndResolveHod(
  hodEmail: string | undefined | null,
  targetBranchId: string | undefined,
  callerUser: any
): HodResolutionResult {
  if (hodEmail === undefined || hodEmail === null || hodEmail.trim() === '') {
    return { isValid: true };
  }

  const cleanEmail = hodEmail.trim().toLowerCase();

  // 1. Confirm that the email belongs to an existing user
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return {
      isValid: false,
      statusCode: 400,
      error: `No registered member found with email address: "${cleanEmail}".`
    };
  }

  // 2. Prevent suspended, rejected, or otherwise ineligible accounts from being assigned
  if (user.accountStatus !== 'active') {
    return {
      isValid: false,
      statusCode: 400,
      error: `Cannot assign HOD: The account for "${user.email}" is ${user.accountStatus}. Only active member accounts can be assigned as Head of Department.`
    };
  }

  // 3. Find associated member profile
  const member = db.members.find(m => m.userId === user.id);
  if (!member) {
    return {
      isValid: false,
      statusCode: 400,
      error: `No member profile found for user account: "${cleanEmail}".`
    };
  }

  // 4. Confirm that the member has the appropriate HOD role assigned in their member profile
  const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
  const isHodRole = member.primaryRoleId === IDS.ROLE_HOD ||
    role?.code === 'HOD' ||
    (role?.name && role.name.toLowerCase() === 'hod') ||
    (role?.name && role.name.toLowerCase().includes('head of department'));

  if (!isHodRole) {
    const currentRoleName = role?.name || 'Member';
    return {
      isValid: false,
      statusCode: 400,
      error: `Member "${member.firstName} ${member.lastName}" (${user.email}) does not have the HOD role assigned in their member profile (current role: "${currentRoleName}"). Please update their role to HOD under Members before assigning them as Head of Department.`
    };
  }

  // 5. Enforce branch isolation and permissions
  const isSuperAdmin = callerUser?.adminLevel === 'super_admin';
  const isBranchAdmin = callerUser?.adminLevel === 'branch_admin';

  // If caller is branch admin, caller can only assign members from their own branch
  if (isBranchAdmin && !isSuperAdmin && callerUser?.branchId && member.primaryBranchId !== callerUser.branchId) {
    return {
      isValid: false,
      statusCode: 403,
      error: 'Branch isolation violation: As a Branch Administrator, you can only assign members belonging to your assigned branch as Head of Department.'
    };
  }

  // If department belongs to a specific branch, member must belong to that branch
  if (targetBranchId && member.primaryBranchId && member.primaryBranchId !== targetBranchId) {
    const deptBranch = db.branches.find(b => b.id === targetBranchId);
    const memberBranch = db.branches.find(b => b.id === member.primaryBranchId);
    return {
      isValid: false,
      statusCode: 400,
      error: `Cannot assign HOD: Member "${member.firstName} ${member.lastName}" belongs to "${memberBranch?.name || 'another branch'}", but this department belongs to "${deptBranch?.name || 'another branch'}". Heads of Department must be members of the department's branch.`
    };
  }

  const fullName = `${member.firstName} ${member.lastName}`.trim();
  return {
    isValid: true,
    hodUserId: user.id,
    hodMemberId: member.id,
    hodName: fullName,
    hodEmail: user.email
  };
}

export const getDepartmentsHandler = (req: Request, res: Response) => {
  const { branchId, includeArchived } = req.query;
  let depts = db.departments;
  if (!includeArchived || includeArchived === 'false') {
    depts = depts.filter(d => d.status !== 'archived');
  }
  if (branchId) {
    const branchSpecific = depts.filter(d => d.branchId === branchId);
    // If the selected branch has specific departments, use them; otherwise fallback to global/HQ
    depts = branchSpecific.length > 0 ? branchSpecific : depts.filter(d => !d.branchId || d.branchId === IDS.BRANCH_HQ);
  }

  // Ensure hodEmail is always populated if an HOD is assigned
  const enriched = depts.map(d => {
    if (!d.hodEmail && d.hodId) {
      const u = db.users.find(user => user.id === d.hodId);
      if (u) {
        d.hodEmail = u.email;
      } else {
        const m = db.members.find(mem => mem.id === d.hodId || mem.userId === d.hodId);
        if (m) {
          const mu = db.users.find(user => user.id === m.userId);
          if (mu) d.hodEmail = mu.email;
        }
      }
    }
    return d;
  });

  // Strict deduplication by normalized department name: each distinct department is returned ONCE
  const seen = new Set<string>();
  const deduplicated: typeof enriched = [];
  for (const dept of enriched) {
    const normalizedName = dept.name.trim().toLowerCase();
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      deduplicated.push(dept);
    }
  }

  return res.json(deduplicated);
};

export const lookupHodHandler = (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const branchId = req.query.branchId as string;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email parameter is required.' });
    }

    const effectiveBranchId = req.user?.adminLevel === 'super_admin' ? branchId : req.user?.branchId;
    const validation = validateAndResolveHod(email, effectiveBranchId, req.user);

    if (!validation.isValid) {
      const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      const member = user ? db.members.find(m => m.userId === user.id) : undefined;
      const role = member ? db.ministryRoles.find(r => r.id === member.primaryRoleId) : undefined;
      const branch = member ? db.branches.find(b => b.id === member.primaryBranchId) : undefined;

      return res.status(200).json({
        success: false,
        eligible: false,
        error: validation.error,
        member: user && member ? {
          userId: user.id,
          memberId: member.id,
          email: user.email,
          fullName: `${member.firstName} ${member.lastName}`.trim(),
          roleName: role?.name || 'Member',
          roleCode: role?.code || 'MEMBER',
          accountStatus: user.accountStatus,
          branchId: member.primaryBranchId,
          branchName: branch?.name || 'Unknown Branch'
        } : null
      });
    }

    const branch = db.branches.find(b => b.id === effectiveBranchId);
    return res.json({
      success: true,
      eligible: true,
      member: {
        userId: validation.hodUserId,
        memberId: validation.hodMemberId,
        email: validation.hodEmail,
        fullName: validation.hodName,
        roleName: 'HOD',
        roleCode: 'HOD',
        branchId: effectiveBranchId,
        branchName: branch?.name || 'HQ'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getEligibleHodsHandler = (req: Request, res: Response) => {
  try {
    const queryStr = ((req.query.query as string) || '').trim().toLowerCase();
    const branchId = req.query.branchId as string;
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const effectiveBranchId = isSuperAdmin ? branchId : req.user?.branchId;

    const list = db.members
      .map(member => {
        const user = db.users.find(u => u.id === member.userId);
        if (!user) return null;

        const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
        const branch = db.branches.find(b => b.id === member.primaryBranchId);
        const isHodRole = member.primaryRoleId === IDS.ROLE_HOD ||
          role?.code === 'HOD' ||
          (role?.name && role.name.toLowerCase() === 'hod') ||
          (role?.name && role.name.toLowerCase().includes('head of department'));

        const isBranchMatch = !effectiveBranchId || member.primaryBranchId === effectiveBranchId;
        const isActive = user.accountStatus === 'active';
        const isEligible = isHodRole && isActive && isBranchMatch;

        let ineligibilityReason: string | undefined;
        if (!isActive) {
          ineligibilityReason = `Account is ${user.accountStatus}`;
        } else if (!isHodRole) {
          ineligibilityReason = `Role is "${role?.name || 'Member'}" (requires HOD role)`;
        } else if (!isBranchMatch) {
          ineligibilityReason = `Belongs to ${branch?.name || 'another branch'}`;
        }

        return {
          userId: user.id,
          memberId: member.id,
          email: user.email,
          fullName: `${member.firstName} ${member.lastName}`.trim(),
          firstName: member.firstName,
          lastName: member.lastName,
          roleName: role?.name || 'Member',
          roleCode: role?.code || 'MEMBER',
          accountStatus: user.accountStatus,
          branchId: member.primaryBranchId,
          branchName: branch?.name || 'HQ',
          isHodRole,
          isEligible,
          ineligibilityReason
        };
      })
      .filter((m): m is NonNullable<typeof m> => {
        if (!m) return false;
        if (!queryStr) return true;
        return (
          m.email.toLowerCase().includes(queryStr) ||
          m.fullName.toLowerCase().includes(queryStr)
        );
      });

    // Sort: eligible first, then alphabetical by fullName
    list.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return res.json(list.slice(0, 20));
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createDepartmentHandler = async (req: Request, res: Response) => {
  const isSuperAdmin = req.user?.adminLevel === 'super_admin';
  const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

  // An HOD cannot add a department unless they are also a Branch Administrator or Super Administrator
  if (!isSuperAdmin && !isBranchAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Branch Administrator or Super Administrator privileges required to create a new department. Heads of Department cannot add departments unless they are also a Branch Administrator.'
    });
  }

  const { name, code, description, hodName, hodId, hodEmail, branchId } = req.body;
  if (!name || !code) return res.status(400).json({ success: false, error: 'Name and Code are required.' });

  // If not super admin, department must belong to caller's branch
  const effectiveBranchId = isSuperAdmin ? (branchId || req.user?.branchId) : req.user?.branchId;

  let resolvedHodId: string | undefined = hodId;
  let resolvedHodName: string | undefined = hodName;
  let resolvedHodEmail: string | undefined;

  // Validate and resolve HOD by email if provided
  if (hodEmail !== undefined && hodEmail !== null && hodEmail.trim() !== '') {
    const validation = validateAndResolveHod(hodEmail, effectiveBranchId, req.user);
    if (!validation.isValid) {
      return res.status(validation.statusCode || 400).json({
        success: false,
        error: validation.error
      });
    }
    resolvedHodId = validation.hodUserId;
    resolvedHodName = validation.hodName;
    resolvedHodEmail = validation.hodEmail;
  } else if (resolvedHodId) {
    const u = db.users.find(usr => usr.id === resolvedHodId);
    if (u) resolvedHodEmail = u.email;
  }

  const newDeptId = uuidv4();
  const newDept: Department = {
    id: newDeptId,
    name,
    code: code.toUpperCase(),
    description,
    hodName: resolvedHodName,
    hodId: resolvedHodId,
    hodEmail: resolvedHodEmail,
    branchId: effectiveBranchId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.departments.push(newDept);
  await persistDepartment(newDept).catch(err => console.warn('[PERSIST DEPT ERROR]', err.message));

  // Single HOD enforcement if hodId resolved
  if (resolvedHodId) {
    await enforceSingleDepartmentHod(newDeptId, resolvedHodId, resolvedHodName);
  }

  AuditService.log(
    req.user?.fullName || 'Admin',
    req.user?.roleName || 'admin',
    'DEPARTMENT_CREATED',
    'department',
    newDept.id,
    req.user?.userId,
    null,
    newDept
  );
  return res.status(201).json(newDept);
};

export const updateDepartmentHandler = async (req: Request, res: Response) => {
  try {
    const dept = db.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found.' });

    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    // Check if user is HOD of this specific department
    const isHodOfThisDept = dept.hodId === req.user?.userId ||
      req.user?.workerDetails?.departmentId === dept.id ||
      db.workers.some(w => {
        const m = db.members.find(mem => mem.id === w.memberId);
        return m?.userId === req.user?.userId && w.departmentId === dept.id &&
          (w.positionName?.toLowerCase().includes('head') || w.positionName?.toLowerCase().includes('hod'));
      });

    // An HOD can ONLY edit their own department
    if (!isSuperAdmin && !isBranchAdmin && !isHodOfThisDept) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. As a Head of Department, you can only edit your own assigned department.'
      });
    }

    // Branch isolation for branch admin
    if (isBranchAdmin && !isSuperAdmin && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify departments outside your branch.' });
    }

    // If caller is an HOD without branch admin/super admin privileges:
    // They cannot reassign HOD or transfer department across branches
    if (!isSuperAdmin && !isBranchAdmin) {
      if ((req.body.hodId !== undefined && req.body.hodId !== dept.hodId) ||
          (req.body.hodEmail !== undefined && req.body.hodEmail !== dept.hodEmail)) {
        return res.status(403).json({
          success: false,
          error: 'Only Branch Administrators or Super Administrators can appoint or change the Head of Department.'
        });
      }
      if (req.body.branchId !== undefined && req.body.branchId !== dept.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Heads of Department cannot transfer departments across branches.'
        });
      }
    }

    const { name, code, description, hodName, hodId, hodEmail, status } = req.body;
    if (name) dept.name = name;
    if (code) dept.code = code.toUpperCase();
    if (description !== undefined) dept.description = description;

    // HOD Assignment handling
    if (isSuperAdmin || isBranchAdmin) {
      if (hodEmail !== undefined) {
        if (hodEmail === null || hodEmail.trim() === '') {
          // Clear HOD
          dept.hodId = undefined;
          dept.hodName = undefined;
          dept.hodEmail = undefined;
          await clearDepartmentHod(dept.id);
        } else {
          const validation = validateAndResolveHod(hodEmail, dept.branchId, req.user);
          if (!validation.isValid) {
            return res.status(validation.statusCode || 400).json({
              success: false,
              error: validation.error
            });
          }
          dept.hodId = validation.hodUserId;
          dept.hodName = validation.hodName;
          dept.hodEmail = validation.hodEmail;
          await enforceSingleDepartmentHod(dept.id, validation.hodUserId!, validation.hodName);
        }
      } else if (hodId !== undefined) {
        if (hodId) {
          const resolvedName = hodName || (() => {
            const m = db.members.find(mem => mem.userId === hodId);
            return m ? `${m.firstName} ${m.lastName}` : dept.hodName;
          })();
          const u = db.users.find(usr => usr.id === hodId);
          dept.hodId = hodId;
          dept.hodName = resolvedName;
          dept.hodEmail = u?.email;
          await enforceSingleDepartmentHod(dept.id, hodId, resolvedName);
        } else {
          dept.hodId = undefined;
          dept.hodName = undefined;
          dept.hodEmail = undefined;
          await clearDepartmentHod(dept.id);
        }
      } else if (hodName !== undefined) {
        dept.hodName = hodName;
      }
    }

    if (status && (isSuperAdmin || isBranchAdmin)) dept.status = status;
    dept.updatedAt = new Date().toISOString();
    await persistDepartment(dept).catch(err => console.warn('[PERSIST DEPT ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'DEPARTMENT_UPDATED',
      'department',
      dept.id,
      req.user?.userId,
      null,
      dept
    );

    return res.json(dept);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteDepartmentHandler = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    // HODs cannot delete or archive departments
    if (!isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Branch Administrator or Super Administrator privileges required to delete or archive a department.'
      });
    }

    const dept = db.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found.' });

    if (!isSuperAdmin && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete departments outside your branch.' });
    }

    const hasWorkers = db.workers.some(w => w.departmentId === req.params.id && w.workerStatus !== 'archived');
    if (hasWorkers) {
      dept.status = 'archived';
      dept.updatedAt = new Date().toISOString();
      await persistDepartment(dept).catch(err => console.warn('[PERSIST DEPT ERROR]', err.message));
      AuditService.log(
        req.user?.fullName || 'Admin',
        req.user?.roleName || 'admin',
        'DEPARTMENT_ARCHIVED',
        'department',
        dept.id,
        req.user?.userId,
        { status: 'active' },
        { status: 'archived', reason: 'Active workers assigned' }
      );
      return res.json({
        success: true,
        message: 'Department has assigned workers. It has been safely archived.',
        action: 'archived',
        department: dept
      });
    }

    const idx = db.departments.findIndex(d => d.id === req.params.id);
    db.departments.splice(idx, 1);
    await persistDelete('departments', req.params.id).catch(err => console.warn('[DELETE DEPT ERROR]', err.message));
    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'DEPARTMENT_DELETED',
      'department',
      req.params.id,
      req.user?.userId,
      dept,
      null
    );
    return res.json({ success: true, message: 'Department permanently deleted.', action: 'deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDepartmentPositionsHandler = (req: Request, res: Response) => {
  const positions = db.departmentPositions.filter(p => p.departmentId === req.params.id);
  return res.json(positions);
};

export const createPositionHandler = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Position name is required.' });

    const dept = db.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found.' });

    if (req.user?.adminLevel !== 'super_admin' && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify departments outside your branch.' });
    }

    const newPos: DepartmentPosition = {
      id: uuidv4(),
      departmentId: dept.id,
      name,
      description,
      createdAt: new Date().toISOString()
    };
    db.departmentPositions.push(newPos);
    await persistDepartmentPosition(newPos).catch(err => console.warn('[PERSIST POS ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'POSITION_CREATED',
      'position',
      newPos.id,
      req.user?.userId,
      null,
      newPos
    );

    return res.status(201).json(newPos);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deletePositionHandler = async (req: Request, res: Response) => {
  try {
    const pos = db.departmentPositions.find(p => p.id === req.params.positionId);
    if (!pos) return res.status(404).json({ success: false, error: 'Position not found.' });

    const dept = db.departments.find(d => d.id === pos.departmentId);
    if (dept && req.user?.adminLevel !== 'super_admin' && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify departments outside your branch.' });
    }

    const hasAssigned = db.workers.some(w => w.positionId === pos.id && w.workerStatus !== 'archived');
    if (hasAssigned) {
      return res.status(400).json({ success: false, error: 'Cannot delete position currently assigned to active workers. Please reassign them first.' });
    }

    const idx = db.departmentPositions.findIndex(p => p.id === pos.id);
    db.departmentPositions.splice(idx, 1);
    await persistDelete('department_positions', pos.id).catch(err => console.warn('[DELETE POS ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'POSITION_DELETED',
      'position',
      pos.id,
      req.user?.userId,
      pos,
      null
    );

    return res.json({ success: true, message: 'Position deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getRolesHandler = (req: Request, res: Response) => {
  const { forRegistration } = req.query;
  if (forRegistration === 'true') {
    return res.json(db.ministryRoles.filter(r => r.code !== 'SUPER_ADMIN'));
  }
  return res.json(db.ministryRoles);
};

export const createRoleHandler = async (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only Super Administrators can create ministry roles.' });
    }
    const { name, code, description, hierarchyLevel, permissions } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, error: 'Role name and code are required.' });

    const existing = db.ministryRoles.find(r => r.code === code.toUpperCase());
    if (existing) {
      return res.status(400).json({ success: false, error: `Role code '${code}' already exists.` });
    }

    const newRole: MinistryRole = {
      id: uuidv4(),
      name,
      code: code.toUpperCase() as any,
      description,
      hierarchyLevel: hierarchyLevel ? Number(hierarchyLevel) : 7,
      permissions: permissions || ['feed:read', 'events:read'],
      isSystemRole: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.ministryRoles.push(newRole);
    await persistRole(newRole).catch(err => console.warn('[PERSIST ROLE ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'ROLE_CREATED',
      'role',
      newRole.id,
      req.user?.userId,
      null,
      newRole
    );

    return res.status(201).json(newRole);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateRoleHandler = async (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only Super Administrators can update ministry roles.' });
    }
    const role = db.ministryRoles.find(r => r.id === req.params.id);
    if (!role) return res.status(404).json({ success: false, error: 'Ministry role not found.' });

    const { name, description, hierarchyLevel, permissions, isActive } = req.body;

    if (role.isSystemRole) {
      if (hierarchyLevel !== undefined && hierarchyLevel !== role.hierarchyLevel) {
        return res.status(400).json({ success: false, error: 'System role hierarchy level cannot be altered to protect organizational integrity.' });
      }
    } else {
      if (hierarchyLevel !== undefined) role.hierarchyLevel = Number(hierarchyLevel);
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = !!isActive;
    role.updatedAt = new Date().toISOString();
    await persistRole(role).catch(err => console.warn('[PERSIST ROLE ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'ROLE_UPDATED',
      'role',
      role.id,
      req.user?.userId,
      null,
      role
    );

    return res.json(role);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteRoleHandler = async (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only Super Administrators can delete ministry roles.' });
    }
    const role = db.ministryRoles.find(r => r.id === req.params.id);
    if (!role) return res.status(404).json({ success: false, error: 'Ministry role not found.' });

    if (role.isSystemRole) {
      return res.status(400).json({ success: false, error: 'System roles cannot be deleted.' });
    }

    const hasMembers = db.members.some(m => m.primaryRoleId === req.params.id);
    if (hasMembers) {
      return res.status(400).json({ success: false, error: 'Cannot delete ministry role currently assigned to members. Please reassign them first.' });
    }

    const idx = db.ministryRoles.findIndex(r => r.id === req.params.id);
    db.ministryRoles.splice(idx, 1);
    await persistDelete('ministry_roles', role.id).catch(err => console.warn('[DELETE ROLE ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'ROLE_DELETED',
      'role',
      role.id,
      req.user?.userId,
      role,
      null
    );

    return res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// APPROVALS & MEMBERS CONTROLLER
// =============================================================================
export const getPendingApprovalsHandler = (req: Request, res: Response) => {
  const branchId = req.user?.adminLevel === 'super_admin' ? (req.query.branchId as string) : req.user?.branchId;
  const approvals = MemberService.getPendingApprovals(branchId);
  return res.json(approvals);
};

export const approveMemberHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = await MemberService.approveMember(userId, adminId, adminName, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const rejectMemberHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = await MemberService.rejectMember(userId, adminId, adminName, reason, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const requestChangesHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ success: false, error: 'Instructions/notes are required.' });
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = await MemberService.requestChanges(userId, adminId, adminName, notes, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const listMembersHandler = (req: Request, res: Response) => {
  const cleanParam = (val: any) => (val && val !== 'undefined' && val !== 'null' && val !== '' ? String(val) : undefined);
  const search = cleanParam(req.query.search);
  const branchId = cleanParam(req.query.branchId);
  const roleId = cleanParam(req.query.roleId);
  const departmentId = cleanParam(req.query.departmentId);
  const status = cleanParam(req.query.status) as any;

  const targetBranch = req.user?.adminLevel === 'super_admin' ? branchId : req.user?.branchId;
  const members = MemberService.listMembers({
    search,
    branchId: targetBranch,
    roleId,
    departmentId,
    status
  });
  return res.json(members);
};

export const createMemberHandler = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const payload = {
      ...req.body,
      primaryBranchId: req.body.primaryBranchId || req.body.branchId,
      primaryRoleId: req.body.primaryRoleId || req.body.roleId
    };
    const newMember = await MemberService.createMember(payload, adminId, adminName, adminScope);
    return res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateMemberStatusHandler = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = await MemberService.updateAccountStatus(req.params.id, status, adminId, adminName, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateMemberAssignmentHandler = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = await MemberService.updateChurchAssignment(req.params.id, req.body, adminId, adminName, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const getMemberByIdHandler = (req: Request, res: Response) => {
  const member = db.members.find(m => m.id === req.params.id);
  if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

  // Branch isolation
  if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== member.primaryBranchId) {
    return res.status(403).json({ success: false, error: 'Branch isolation violation: Access denied to members of other branches.' });
  }

  const user = db.users.find(u => u.id === member.userId);
  const branch = db.branches.find(b => b.id === member.primaryBranchId);
  const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
  const worker = db.workers.find(w => w.memberId === member.id);
  const dept = worker ? db.departments.find(d => d.id === worker.departmentId) : null;
  const pos = worker?.positionId ? db.departmentPositions.find(p => p.id === worker.positionId) : null;

  return res.json({
    ...member,
    email: user?.email,
    phone: user?.phone,
    accountStatus: user?.accountStatus,
    branchName: branch?.name,
    roleName: role?.name,
    roleCode: role?.code,
    worker: worker ? {
      ...worker,
      departmentName: dept?.name,
      positionName: pos?.name || worker.positionName
    } : null
  });
};

export const updateMemberHandler = async (req: Request, res: Response) => {
  try {
    const member = db.members.find(m => m.id === req.params.id);
    if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

    const user = db.users.find(u => u.id === member.userId);
    const role = db.ministryRoles.find(r => r.id === member.primaryRoleId);
    const isTargetAdmin = user?.adminLevel === 'super_admin' || role?.code === 'SUPER_ADMIN' || role?.name === 'Administrator' || role?.id === IDS.ROLE_SUPER_ADMIN;

    // Only Administrator can edit an Administrator
    if (isTargetAdmin && req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Only an Administrator has the privilege to edit an Administrator account.' });
    }

    // Branch isolation
    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== member.primaryBranchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify members of other branches.' });
    }

    const {
      firstName, middleName, lastName, gender, dateOfBirth,
      residentialAddress, emergencyContactName, emergencyContactPhone,
      profilePictureUrl, email, phone
    } = req.body;

    if (firstName) member.firstName = firstName;
    if (middleName !== undefined) member.middleName = middleName;
    if (lastName) member.lastName = lastName;
    if (gender) member.gender = gender;
    if (dateOfBirth !== undefined) member.dateOfBirth = dateOfBirth;
    if (residentialAddress !== undefined) member.residentialAddress = residentialAddress;
    if (emergencyContactName !== undefined) member.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) member.emergencyContactPhone = emergencyContactPhone;
    if (profilePictureUrl !== undefined) member.profilePictureUrl = profilePictureUrl;
    member.updatedAt = new Date().toISOString();
    await persistMember(member).catch(err => console.warn('[PERSIST MEMBER ERROR]', err.message));

    if (user) {
      if (email) user.email = email;
      if (phone) user.phone = phone;
      user.updatedAt = new Date().toISOString();
      await persistUser(user).catch(err => console.warn('[PERSIST USER ERROR]', err.message));
    }

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'MEMBER_UPDATED',
      'member',
      member.id,
      req.user?.userId,
      null,
      member
    );

    return res.json({ success: true, member });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteMemberHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let member = db.members.find(m => m.id === id);
    const memberUserId = member?.userId;
    let user = memberUserId ? db.users.find(u => u.id === memberUserId) : db.users.find(u => u.id === id);
    if (!member && user) {
      member = db.members.find(m => m.userId === user.id);
    }

    if (!member && !user) {
      return res.status(404).json({ success: false, error: 'Member not found.' });
    }

    const role = member ? db.ministryRoles.find(r => r.id === member.primaryRoleId) : null;
    const isTargetAdmin = user?.adminLevel === 'super_admin' || role?.code === 'SUPER_ADMIN' || role?.name === 'Administrator' || role?.id === IDS.ROLE_SUPER_ADMIN;

    // Only Administrator can delete an Administrator
    if (isTargetAdmin) {
      if (req.user?.adminLevel !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Access denied: Only an Administrator has the privilege to delete an Administrator.' });
      }
      if (user?.id === req.user?.userId) {
        return res.status(400).json({ success: false, error: 'Cannot delete your own Administrator account.' });
      }
      const otherActiveAdmins = db.users.filter(u => u.adminLevel === 'super_admin' && u.accountStatus === 'active' && u.id !== user?.id);
      if (otherActiveAdmins.length === 0) {
        return res.status(400).json({ success: false, error: 'Operation blocked: Cannot delete the sole active Administrator of the organization.' });
      }
    }

    // Branch isolation check for branch admins
    if (req.user?.adminLevel !== 'super_admin' && member && req.user?.branchId !== member.primaryBranchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot delete members of other branches.' });
    }

    const deletePromises: Promise<any>[] = [];

    // Delete associated worker record
    if (member) {
      const workerIdx = db.workers.findIndex(w => w.memberId === member.id);
      if (workerIdx !== -1) {
        const worker = db.workers[workerIdx];
        db.workers.splice(workerIdx, 1);
        deletePromises.push(persistDelete('workers', worker.id));
      }

      // Delete member record
      const memberIdx = db.members.findIndex(m => m.id === member.id);
      if (memberIdx !== -1) {
        const member = db.members[memberIdx];
        db.members.splice(memberIdx, 1);
        deletePromises.push(persistDelete('members', member.id));
      }
    }

    // Delete user record
    if (user) {
      const userIdx = db.users.findIndex(u => u.id === user.id);
      if (userIdx !== -1) {
        const user = db.users[userIdx];
        db.users.splice(userIdx, 1);
        deletePromises.push(persistDelete('users', user.id));
      }
    }

    await Promise.all(deletePromises).catch(err => console.warn('[DELETE MEMBER DB ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'MEMBER_DELETED',
      'member',
      member?.id || user?.id || id,
      req.user?.userId,
      null,
      { memberName: member ? `${member.firstName} ${member.lastName}` : 'User', email: user?.email }
    );

    return res.json({ success: true, message: 'Member deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const listWorkersHandler = (req: Request, res: Response) => {
  const cleanParam = (val: any) => (val && val !== 'undefined' && val !== 'null' && val !== '' ? String(val) : undefined);
  const search = cleanParam(req.query.search);
  const branchId = cleanParam(req.query.branchId);
  const departmentId = cleanParam(req.query.departmentId);
  const status = cleanParam(req.query.status);

  const callerBranch = req.user?.adminLevel === 'super_admin' ? branchId : req.user?.branchId;

  let workers = db.workers.map(w => {
    const member = db.members.find(m => m.id === w.memberId);
    const user = member ? db.users.find(u => u.id === member.userId) : null;
    const branch = member ? db.branches.find(b => b.id === member.primaryBranchId) : null;
    const dept = db.departments.find(d => d.id === w.departmentId);
    const pos = w.positionId ? db.departmentPositions.find(p => p.id === w.positionId) : null;

    return {
      ...w,
      fullName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
      email: user?.email || '',
      phone: user?.phone || '',
      branchId: member?.primaryBranchId || '',
      branchName: branch?.name || '',
      departmentName: dept?.name || '',
      positionName: pos?.name || w.positionName || 'Member of Department'
    };
  });

  if (callerBranch) {
    workers = workers.filter(w => w.branchId === callerBranch);
  }
  if (departmentId) {
    workers = workers.filter(w => w.departmentId === departmentId);
  }
  if (status) {
    workers = workers.filter(w => w.workerStatus === status);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    workers = workers.filter(w =>
      w.fullName.toLowerCase().includes(q) ||
      w.workerIdCode.toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      w.phone.toLowerCase().includes(q)
    );
  }

  return res.json(workers);
};

export const getWorkerByIdHandler = (req: Request, res: Response) => {
  const w = db.workers.find(wk => wk.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, error: 'Worker record not found.' });

  const member = db.members.find(m => m.id === w.memberId);
  if (req.user?.adminLevel !== 'super_admin' && member && member.primaryBranchId !== req.user?.branchId) {
    return res.status(403).json({ success: false, error: 'Branch isolation violation: Access denied.' });
  }

  const user = member ? db.users.find(u => u.id === member.userId) : null;
  const branch = member ? db.branches.find(b => b.id === member.primaryBranchId) : null;
  const dept = db.departments.find(d => d.id === w.departmentId);
  const pos = w.positionId ? db.departmentPositions.find(p => p.id === w.positionId) : null;

  return res.json({
    ...w,
    fullName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
    email: user?.email || '',
    phone: user?.phone || '',
    branchId: member?.primaryBranchId || '',
    branchName: branch?.name || '',
    departmentName: dept?.name || '',
    positionName: pos?.name || w.positionName
  });
};

export const updateWorkerHandler = async (req: Request, res: Response) => {
  try {
    const worker = db.workers.find(w => w.id === req.params.id);
    if (!worker) return res.status(404).json({ success: false, error: 'Worker not found.' });

    const member = db.members.find(m => m.id === worker.memberId);
    if (req.user?.adminLevel !== 'super_admin' && member && member.primaryBranchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify worker in another branch.' });
    }

    const { departmentId, positionId, positionName, workerStatus } = req.body;
    const targetDeptId = departmentId || worker.departmentId;

    if (departmentId) {
      const dept = db.departments.find(d => d.id === departmentId);
      if (!dept) return res.status(400).json({ success: false, error: 'Selected department does not exist.' });
      worker.departmentId = departmentId;
    }
    if (positionId !== undefined) worker.positionId = positionId;
    if (positionName !== undefined) {
      worker.positionName = positionName;
      // Single HOD policy: if worker is appointed HOD, demote other HOD in this dept
      const posLower = positionName.toLowerCase();
      if (posLower.includes('head') || posLower.includes('hod')) {
        if (member) {
          await enforceSingleDepartmentHod(targetDeptId, member.userId, `${member.firstName} ${member.lastName}`);
        }
      }
    }
    if (workerStatus) worker.workerStatus = workerStatus;
    worker.updatedAt = new Date().toISOString();
    await persistWorker(worker).catch(err => console.warn('[PERSIST WORKER ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'WORKER_UPDATED',
      'worker',
      worker.id,
      req.user?.userId,
      null,
      worker
    );

    return res.json({ success: true, worker });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// ATTENDANCE CONTROLLER
// =============================================================================
export const clockInHandler = async (req: Request, res: Response) => {
  try {
    const { workerIdentifier, serviceId, method, pin, qrCodeToken, scannedPayload } = req.body;
    // If workerIdentifier not supplied in body, default to logged in worker's ID
    const resolvedIdentifier = workerIdentifier || req.user?.workerDetails?.workerId;

    let resolvedServiceId = serviceId;
    if (!resolvedServiceId && (scannedPayload || qrCodeToken)) {
      const raw = ((scannedPayload || qrCodeToken) as string).trim();
      if (raw.startsWith('FPM-SVC:')) {
        resolvedServiceId = raw.substring('FPM-SVC:'.length).trim();
      } else if (raw.startsWith('FPM-SVC-')) {
        resolvedServiceId = raw.substring('FPM-SVC-'.length).trim();
      } else if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          resolvedServiceId = parsed.serviceId || parsed.id;
        } catch (_) {}
      } else {
        const svc = db.services.find(s => s.id === raw || s.qrCodeToken === raw);
        if (svc) resolvedServiceId = svc.id;
      }
    }

    if (!resolvedIdentifier || !resolvedServiceId || !method) {
      return res.status(400).json({ success: false, error: 'Worker identifier, service ID, and clock-in method are required.' });
    }
    const record = await AttendanceService.clockIn({
      workerIdentifier: resolvedIdentifier,
      serviceId: resolvedServiceId,
      method,
      pin,
      qrCodeToken,
      scannedPayload
    });
    return res.status(201).json({ success: true, record });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const clockOutHandler = (req: Request, res: Response) => {
  try {
    const { attendanceId, source } = req.body;
    if (!attendanceId) return res.status(400).json({ success: false, error: 'Attendance ID is required.' });

    const caller = req.user ? {
      userId: req.user.userId,
      isAdmin: req.user.isAdmin,
      adminLevel: req.user.adminLevel,
      branchId: req.user.branchId
    } : undefined;

    const record = AttendanceService.clockOut(attendanceId, source || 'manual', caller);
    return res.json({ success: true, record });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') ? 403 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
};

export const triggerAutoClockOutHandler = (req: Request, res: Response) => {
  const count = AttendanceService.autoClockOutExpiredSessions();
  return res.json({ success: true, clockedOutCount: count });
};

export const markAbsencesHandler = (req: Request, res: Response) => {
  try {
    const { serviceId, date } = req.body;
    if (!serviceId) return res.status(400).json({ success: false, error: 'Service ID is required.' });
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const count = AttendanceService.markAbsences(serviceId, date, adminScope);
    return res.json({ success: true, absencesMarked: count });
  } catch (err: any) {
    const status = err.message?.includes('Branch isolation') ? 403 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
};

export const excuseAbsenceHandler = (req: Request, res: Response) => {
  try {
    const { attendanceId, reason } = req.body;
    if (!attendanceId || !reason) return res.status(400).json({ success: false, error: 'Attendance ID and reason are required.' });
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const record = AttendanceService.excuseAbsence(attendanceId, adminId, adminName, reason, adminScope);
    return res.json({ success: true, record });
  } catch (err: any) {
    const status = err.message?.includes('Branch isolation') ? 403 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
};


export const getAttendanceDashboardHandler = (req: Request, res: Response) => {
  const branchId = req.user?.adminLevel === 'super_admin' ? (req.query.branchId as string) : req.user?.branchId;
  const dateStr = req.query.date as string;
  const dashboard = AttendanceService.getDashboardMetrics(branchId, dateStr);
  return res.json(dashboard);
};

export const getAttendanceMatrixHandler = (req: Request, res: Response) => {
  const branchId = req.user?.adminLevel === 'super_admin' ? (req.query.branchId as string) : req.user?.branchId;
  const yearMonth = req.query.month as string;
  const matrix = AttendanceService.getAttendanceMatrix(branchId, yearMonth);
  return res.json(matrix);
};

export const exportAttendanceCsvHandler = (req: Request, res: Response) => {
  const branchId = req.user?.adminLevel === 'super_admin' ? (req.query.branchId as string) : req.user?.branchId;
  const yearMonth = req.query.month as string;
  const csvContent = AttendanceService.exportAttendanceCsv(branchId, yearMonth);
  const matrix = AttendanceService.getAttendanceMatrix(branchId, yearMonth);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=fpm_attendance_${matrix.yearMonth}.csv`);
  return res.send(csvContent);
};

export const getMyAttendanceHistoryHandler = (req: Request, res: Response) => {
  const worker = db.workers.find(w => w.memberId === req.user?.memberId);
  if (!worker) return res.json({ records: [], summary: { total: 0, present: 0, late: 0, rate: 0 } });

  const records = db.attendanceRecords
    .filter(r => r.workerId === worker.id)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
    .map(r => {
      const s = db.services.find(svc => svc.id === r.serviceId);
      return {
        ...r,
        serviceName: s?.name || 'Service'
      };
    });

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const total = records.length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return res.json({
    workerCode: worker.workerIdCode,
    records,
    summary: { total, present, late, rate }
  });
};

// =============================================================================
// SERVICES SCHEDULE CONTROLLER
// =============================================================================
export const getServicesHandler = (req: Request, res: Response) => {
  const { branchId, includeArchived } = req.query;
  let services = db.services;
  if (!includeArchived || includeArchived === 'false') {
    services = services.filter(s => s.status !== 'archived');
  }
  if (branchId) {
    services = services.filter(s => s.branchId === branchId);
  }
  return res.json(services);
};

export const createServiceHandler = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    if (!isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Branch Administrator or Super Administrator privileges required to create church services. Heads of Department cannot add services.'
      });
    }

    const { branchId, name, dayOfWeek, startTime, expectedEndTime, gracePeriodMinutes, earliestClockInMinutes, attendanceDurationHours, liveStreamUrl, imageUrl } = req.body;
    if (!branchId || !name || !dayOfWeek || !startTime || !expectedEndTime) {
      return res.status(400).json({ success: false, error: 'Branch, name, day, start time, and end time are required.' });
    }

    // Branch isolation: branch admins can only create services for their own branch
    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: You can only create services for your assigned branch.' });
    }

    const serviceId = uuidv4();
    const newService: ServiceSchedule = {
      id: serviceId,
      branchId,
      name,
      dayOfWeek,
      startTime,
      expectedEndTime,
      gracePeriodMinutes: gracePeriodMinutes || 15,
      earliestClockInMinutes: earliestClockInMinutes || 60,
      attendanceDurationHours: attendanceDurationHours || 4.0,
      liveStreamUrl: liveStreamUrl ? liveStreamUrl.trim() : undefined,
      imageUrl: imageUrl ? imageUrl.trim() : undefined,
      qrCodeToken: `FPM-SVC-${serviceId}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.services.push(newService);
    await persistService(newService).catch(err => console.warn('[PERSIST SERVICE ERROR]', err.message));
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'SERVICE_CREATED', 'service', newService.id, req.user?.userId, null, newService);
    return res.status(201).json(newService);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateServiceHandler = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    if (!isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Branch Administrator or Super Administrator privileges required to edit church services. Heads of Department cannot edit services.'
      });
    }

    const service = db.services.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    // Branch isolation
    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== service.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify services of other branches.' });
    }

    const { name, dayOfWeek, startTime, expectedEndTime, gracePeriodMinutes, earliestClockInMinutes, attendanceDurationHours, liveStreamUrl, imageUrl, status } = req.body;
    if (name) service.name = name;
    if (dayOfWeek) service.dayOfWeek = dayOfWeek;
    if (startTime) service.startTime = startTime;
    if (expectedEndTime) service.expectedEndTime = expectedEndTime;
    if (gracePeriodMinutes !== undefined) service.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (earliestClockInMinutes !== undefined) service.earliestClockInMinutes = Number(earliestClockInMinutes);
    if (attendanceDurationHours !== undefined) service.attendanceDurationHours = Number(attendanceDurationHours);
    if (liveStreamUrl !== undefined) service.liveStreamUrl = liveStreamUrl ? liveStreamUrl.trim() : undefined;
    if (imageUrl !== undefined) service.imageUrl = imageUrl ? imageUrl.trim() : undefined;
    if (status) service.status = status;
    service.updatedAt = new Date().toISOString();
    await persistService(service).catch(err => console.warn('[PERSIST SERVICE ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'SERVICE_UPDATED',
      'service',
      service.id,
      req.user?.userId,
      null,
      service
    );

    return res.json(service);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteServiceHandler = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    if (!isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Branch Administrator or Super Administrator privileges required to delete church services. Heads of Department cannot delete services.'
      });
    }

    const service = db.services.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== service.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot delete services of other branches.' });
    }

    const hasAttendance = db.attendanceRecords.some(a => a.serviceId === req.params.id);
    if (hasAttendance) {
      service.status = 'archived';
      service.updatedAt = new Date().toISOString();
      await persistService(service).catch(err => console.warn('[PERSIST SERVICE ERROR]', err.message));
      AuditService.log(
        req.user?.fullName || 'Admin',
        req.user?.roleName || 'admin',
        'SERVICE_ARCHIVED',
        'service',
        service.id,
        req.user?.userId,
        { status: 'active' },
        { status: 'archived', reason: 'Archived due to historical attendance records' }
      );
      return res.json({
        success: true,
        message: 'Service has historical attendance records and has been safely archived.',
        action: 'archived',
        service
      });
    }

    const idx = db.services.findIndex(s => s.id === req.params.id);
    db.services.splice(idx, 1);
    await persistDelete('services', req.params.id).catch(err => console.warn('[DELETE SERVICE ERROR]', err.message));
    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'SERVICE_DELETED',
      'service',
      req.params.id,
      req.user?.userId,
      service,
      null
    );
    return res.json({ success: true, message: 'Service permanently deleted.', action: 'deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// EVENTS CONTROLLER
// =============================================================================
export const getEventsHandler = (req: Request, res: Response) => {
  const { category, branchId, includeArchived } = req.query;
  let events = db.events;
  if (!includeArchived || includeArchived === 'false') {
    events = events.filter(e => e.status !== 'archived');
  } else {
    events = events.filter(e => e.status === 'published' || req.user?.isAdmin);
  }
  if (category) events = events.filter(e => e.category === category);
  if (branchId) events = events.filter(e => !e.branchId || e.branchId === branchId);

  const userId = req.user?.userId;
  const result = events.map(e => {
    const isUserRegistered = userId ? db.eventRegistrations.some(r => r.eventId === e.id && r.userId === userId) : false;
    return {
      ...e,
      isUserRegistered
    };
  });

  return res.json(result);
};

export const getEventByIdHandler = (req: Request, res: Response) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const isRegistered = req.user?.userId ? db.eventRegistrations.some(r => r.eventId === event.id && r.userId === req.user?.userId) : false;
  return res.json({ ...event, isUserRegistered: isRegistered });
};

export const createEventHandler = async (req: Request, res: Response) => {
  try {
    const { title, description, bannerUrl, startDatetime, endDatetime, location, speaker, category, registrationRequired, registrationCapacity, branchId } = req.body;
    if (!title || !description || !startDatetime || !endDatetime || !location || !category) {
      return res.status(400).json({ success: false, error: 'Title, description, dates, location, and category are required.' });
    }

    // Branch isolation: branch admins can only create events for their own branch
    const effectiveBranchId = req.user?.adminLevel === 'super_admin' ? branchId : req.user?.branchId;
    if (req.user?.adminLevel !== 'super_admin' && branchId && branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: You can only create events for your assigned branch.' });
    }

    const newEvent: EventItem = {
      id: uuidv4(),
      branchId: effectiveBranchId,
      title,
      description,
      bannerUrl,
      startDatetime,
      endDatetime,
      location,
      speaker,
      category,
      registrationRequired: !!registrationRequired,
      registrationCapacity: registrationCapacity ? Number(registrationCapacity) : undefined,
      currentRegistrationsCount: 0,
      targetScope: effectiveBranchId ? 'branch' : 'all',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.events.push(newEvent);
    await persistEvent(newEvent).catch(err => console.warn('[PERSIST EVENT ERROR]', err.message));
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'EVENT_CREATED', 'event', newEvent.id, req.user?.userId, null, newEvent);
    return res.status(201).json(newEvent);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateEventHandler = async (req: Request, res: Response) => {
  try {
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });

    if (req.user?.adminLevel !== 'super_admin' && event.branchId && event.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify events of other branches.' });
    }

    const {
      title, description, bannerUrl, startDatetime, endDatetime,
      location, speaker, category, registrationRequired, registrationCapacity, status
    } = req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (bannerUrl !== undefined) event.bannerUrl = bannerUrl;
    if (startDatetime) event.startDatetime = startDatetime;
    if (endDatetime) event.endDatetime = endDatetime;
    if (location) event.location = location;
    if (speaker !== undefined) event.speaker = speaker;
    if (category) event.category = category;
    if (registrationRequired !== undefined) event.registrationRequired = !!registrationRequired;
    if (registrationCapacity !== undefined) event.registrationCapacity = Number(registrationCapacity);
    if (status) event.status = status;
    event.updatedAt = new Date().toISOString();
    await persistEvent(event).catch(err => console.warn('[PERSIST EVENT ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'EVENT_UPDATED',
      'event',
      event.id,
      req.user?.userId,
      null,
      event
    );

    return res.json(event);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteEventHandler = async (req: Request, res: Response) => {
  try {
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });

    if (req.user?.adminLevel !== 'super_admin' && event.branchId && event.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot delete events of other branches.' });
    }

    event.status = 'archived';
    event.updatedAt = new Date().toISOString();
    await persistEvent(event).catch(err => console.warn('[PERSIST EVENT ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'EVENT_ARCHIVED',
      'event',
      event.id,
      req.user?.userId,
      { status: 'published' },
      { status: 'archived' }
    );

    return res.json({ success: true, message: 'Event archived successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getEventRegistrationsHandler = (req: Request, res: Response) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  if (req.user?.adminLevel !== 'super_admin' && event.branchId && event.branchId !== req.user?.branchId) {
    return res.status(403).json({ error: 'Branch isolation violation: Access denied.' });
  }

  const registrations = db.eventRegistrations
    .filter(r => r.eventId === req.params.id)
    .map(r => {
      const user = db.users.find(u => u.id === r.userId);
      const member = db.members.find(m => m.userId === r.userId);
      return {
        ...r,
        fullName: member ? `${member.firstName} ${member.lastName}` : 'Anonymous Member',
        email: user?.email || '',
        phone: user?.phone || ''
      };
    });

  return res.json(registrations);
};

export const registerForEventHandler = (req: Request, res: Response) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const userId = req.user?.userId || 'ANON_USER';

  // Check if already registered
  const alreadyRegistered = db.eventRegistrations.some(r => r.eventId === event.id && r.userId === userId);
  if (alreadyRegistered) {
    return res.status(400).json({ error: 'You are already registered for this event.' });
  }

  // Check capacity limit
  if (event.registrationCapacity && event.currentRegistrationsCount >= event.registrationCapacity) {
    return res.status(400).json({ error: 'Event registration is full. Capacity reached.' });
  }

  db.eventRegistrations.push({
    id: uuidv4(),
    eventId: event.id,
    userId,
    registeredAt: new Date().toISOString()
  });
  event.currentRegistrationsCount += 1;
  return res.json({ success: true, message: 'Successfully registered for event.' });
};

export const cancelEventRegistrationHandler = (req: Request, res: Response) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const userId = req.user?.userId || 'ANON_USER';

  const regIndex = db.eventRegistrations.findIndex(r => r.eventId === event.id && r.userId === userId);
  if (regIndex === -1) {
    return res.status(400).json({ error: 'You are not registered for this event.' });
  }

  db.eventRegistrations.splice(regIndex, 1);
  if (event.currentRegistrationsCount > 0) {
    event.currentRegistrationsCount -= 1;
  }
  return res.json({ success: true, message: 'Successfully cancelled event registration.' });
};

// =============================================================================
// SOCIAL CHURCH FEED CONTROLLER
// =============================================================================
export const getFeedHandler = (req: Request, res: Response) => {
  const posts = db.posts
    .filter(p => p.status !== 'archived')
    .map(p => {
      const postReactions = db.reactions.filter(r => r.postId === p.id);
      const postComments = db.comments.filter(c => c.postId === p.id);
      const userReaction = req.user ? postReactions.find(r => r.userId === req.user?.userId)?.reactionType : undefined;
      return {
        ...p,
        reactions: postReactions,
        comments: postComments,
        userReaction
      };
    });
  return res.json(posts);
};

export const createPostHandler = async (req: Request, res: Response) => {
  try {
    const { title, content, scriptureReference, postType, visibility, branchId, mediaUrls, allowComments } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required.' });

    // Official announcements allow Amen reactions only, comments are disabled.
    // General posts allow comments if permitted by admin (defaults to true).
    const effectiveAllowComments = postType === 'announcement'
      ? false
      : (allowComments !== undefined ? !!allowComments : true);

    const newPost: PostItem = {
      id: uuidv4(),
      authorId: req.user?.userId || IDS.USER_ADMIN,
      authorName: req.user?.fullName || "Faith Preachers Ministries Int'l",
      branchId: branchId || req.user?.branchId,
      visibility: visibility || 'all',
      title,
      content,
      scriptureReference,
      postType: postType || 'post',
      isPinned: false,
      likesCount: 0,
      commentsCount: 0,
      mediaUrls: mediaUrls || [],
      allowComments: effectiveAllowComments,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.posts.unshift(newPost);
    await persistPost(newPost).catch(err => console.warn('[PERSIST POST ERROR]', err.message));
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'POST_CREATED', 'post', newPost.id, req.user?.userId, null, newPost);
    return res.status(201).json(newPost);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updatePostHandler = async (req: Request, res: Response) => {
  try {
    const post = db.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const isAuthor = post.authorId === req.user?.userId;
    const isAdmin = req.user?.isAdmin;
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to edit this post.' });
    }

    const { title, content, scriptureReference, mediaUrls, isPinned, status, allowComments } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (scriptureReference !== undefined) post.scriptureReference = scriptureReference;
    if (mediaUrls !== undefined) post.mediaUrls = mediaUrls;
    if (isPinned !== undefined && isAdmin) post.isPinned = !!isPinned;
    if (status !== undefined) post.status = status;
    if (allowComments !== undefined) {
      post.allowComments = post.postType === 'announcement' ? false : !!allowComments;
    }
    post.updatedAt = new Date().toISOString();
    await persistPost(post).catch(err => console.warn('[PERSIST POST ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'User',
      req.user?.roleName || 'member',
      'POST_UPDATED',
      'post',
      post.id,
      req.user?.userId,
      null,
      post
    );

    return res.json(post);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deletePostHandler = async (req: Request, res: Response) => {
  try {
    const post = db.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const isAuthor = post.authorId === req.user?.userId;
    const isAdmin = req.user?.isAdmin;
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    post.status = 'archived';
    post.updatedAt = new Date().toISOString();
    await persistPost(post).catch(err => console.warn('[PERSIST POST ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'User',
      req.user?.roleName || 'member',
      'POST_ARCHIVED',
      'post',
      post.id,
      req.user?.userId,
      { status: 'published' },
      { status: 'archived' }
    );

    return res.json({ success: true, message: 'Post removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reactToPostHandler = (req: Request, res: Response) => {
  const { postId } = req.params;
  const { reactionType } = req.body;
  const userId = req.user?.userId || IDS.USER_ADMIN;

  const post = db.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  // Official announcements only permit Amen / like reaction
  if (post.postType === 'announcement') {
    if (reactionType && reactionType !== 'amen' && reactionType !== 'like') {
      return res.status(400).json({ error: 'Only Amen reactions are permitted on official announcements.' });
    }
  }

  const normalizedReaction = post.postType === 'announcement' ? 'amen' : (reactionType || 'like');

  const existingIdx = db.reactions.findIndex(r => r.postId === postId && r.userId === userId);
  if (existingIdx >= 0) {
    if (db.reactions[existingIdx].reactionType === normalizedReaction) {
      db.reactions.splice(existingIdx, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      db.reactions[existingIdx].reactionType = normalizedReaction;
    }
  } else {
    db.reactions.push({
      id: uuidv4(),
      postId,
      userId,
      reactionType: normalizedReaction,
      createdAt: new Date().toISOString()
    });
    post.likesCount += 1;
  }
  return res.json({ success: true, likesCount: post.likesCount });
};

export const commentOnPostHandler = (req: Request, res: Response) => {
  const { postId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required.' });

  const post = db.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (post.postType === 'announcement') {
    return res.status(403).json({ error: 'Comments are not permitted on announcements.' });
  }

  if (post.allowComments === false) {
    return res.status(403).json({ error: 'Comments are turned off for this post.' });
  }

  const newComment = {
    id: uuidv4(),
    postId,
    userId: req.user?.userId || IDS.USER_ADMIN,
    userName: req.user?.fullName || 'Member',
    content,
    createdAt: new Date().toISOString()
  };
  db.comments.push(newComment);
  post.commentsCount += 1;
  return res.status(201).json(newComment);
};

// =============================================================================
// SERVICE HIGHLIGHTS CONTROLLER
// =============================================================================
export const getHighlightsHandler = (req: Request, res: Response) => {
  return res.json(db.serviceHighlights.filter(h => h.isPublished));
};

export const createHighlightHandler = async (req: Request, res: Response) => {
  try {
    const { branchId, title, speaker, summary, scripture, keyPoints, quote, photos, videoUrl } = req.body;
    const finalSpeaker = speaker || req.body.preacher;
    const finalSummary = summary || req.body.summaryNotes;
    const finalScripture = scripture || req.body.keyScripture;
    const rawPhotos = Array.isArray(photos) ? photos : (Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls : (photos ? [photos] : []));
    if (rawPhotos.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 pictures allowed per sermon recap.' });
    }
    const finalPhotos = rawPhotos.slice(0, 5);

    if (!title || !finalSpeaker || !finalSummary) {
      return res.status(400).json({ error: 'Title, speaker, and summary are required.' });
    }
    const newHighlight = {
      id: uuidv4(),
      branchId: branchId || IDS.BRANCH_HQ,
      highlightDate: new Date().toISOString().split('T')[0],
      title,
      speaker: finalSpeaker,
      summary: finalSummary,
      scripture: finalScripture,
      keyPoints: keyPoints || [],
      quote,
      photos: finalPhotos,
      videoUrl: typeof videoUrl === 'string' ? videoUrl : undefined,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.serviceHighlights.unshift(newHighlight);
    await persistServiceHighlight(newHighlight).catch(err => console.warn('[PERSIST HIGHLIGHT ERROR]', err.message));
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'HIGHLIGHT_CREATED', 'highlight', newHighlight.id, req.user?.userId, null, newHighlight);
    return res.status(201).json(newHighlight);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateHighlightHandler = async (req: Request, res: Response) => {
  try {
    const highlight = db.serviceHighlights.find(h => h.id === req.params.id);
    if (!highlight) return res.status(404).json({ error: 'Highlight not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== highlight.branchId) {
      return res.status(403).json({ error: 'Branch isolation violation: Cannot modify highlights of other branches.' });
    }

    const { title, speaker, summary, scripture, keyPoints, quote, photos, videoUrl, isPublished } = req.body;
    const finalSpeaker = speaker || req.body.preacher;
    const finalSummary = summary || req.body.summaryNotes;
    const finalScripture = scripture !== undefined ? scripture : req.body.keyScripture;
    const finalPhotos = photos !== undefined ? photos : req.body.mediaUrls;

    if (title) highlight.title = title;
    if (finalSpeaker) highlight.speaker = finalSpeaker;
    if (finalSummary) highlight.summary = finalSummary;
    if (finalScripture !== undefined) highlight.scripture = finalScripture;
    if (keyPoints !== undefined) highlight.keyPoints = keyPoints;
    if (quote !== undefined) highlight.quote = quote;
    if (finalPhotos !== undefined) {
      const parsedPhotos = Array.isArray(finalPhotos) ? finalPhotos : [finalPhotos];
      if (parsedPhotos.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 pictures allowed per sermon recap.' });
      }
      highlight.photos = parsedPhotos.slice(0, 5);
    }
    if (videoUrl !== undefined) highlight.videoUrl = typeof videoUrl === 'string' ? videoUrl : undefined;
    if (isPublished !== undefined) highlight.isPublished = !!isPublished;
    highlight.updatedAt = new Date().toISOString();
    await persistServiceHighlight(highlight).catch(err => console.warn('[PERSIST HIGHLIGHT ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'HIGHLIGHT_UPDATED',
      'highlight',
      highlight.id,
      req.user?.userId,
      null,
      highlight
    );

    return res.json(highlight);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteHighlightHandler = async (req: Request, res: Response) => {
  try {
    const highlight = db.serviceHighlights.find(h => h.id === req.params.id);
    if (!highlight) return res.status(404).json({ error: 'Highlight not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== highlight.branchId) {
      return res.status(403).json({ error: 'Branch isolation violation: Cannot delete highlights of other branches.' });
    }

    const idx = db.serviceHighlights.findIndex(h => h.id === req.params.id);
    db.serviceHighlights.splice(idx, 1);
    await persistDelete('service_highlights', req.params.id).catch(err => console.warn('[DELETE HIGHLIGHT ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'HIGHLIGHT_DELETED',
      'highlight',
      highlight.id,
      req.user?.userId,
      highlight,
      null
    );

    return res.json({ success: true, message: 'Highlight removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// TESTIMONIES CONTROLLER
// =============================================================================
export const getApprovedTestimoniesHandler = (req: Request, res: Response) => {
  const approved = db.testimonies.filter(t => t.status === 'approved' && t.allowPublish);
  return res.json(approved);
};

export const getTestimoniesQueueHandler = (req: Request, res: Response) => {
  return res.json(db.testimonies);
};

export const submitTestimonyHandler = async (req: Request, res: Response) => {
  try {
    const generalSettings = SettingsService.getSettings();
    if (!generalSettings.registration.allowTestimonies || !generalSettings.media.allowMemberTestimonies) {
      return res.status(403).json({ error: 'Testimony submissions are currently paused by administration.' });
    }

    const { title, content, category, photoUrl, videoUrl, allowPublish } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

    const member = db.members.find(m => m.id === req.user?.memberId);
    const branch = member ? db.branches.find(b => b.id === member.primaryBranchId) : undefined;

    const newTestimony: TestimonyItem = {
      id: uuidv4(),
      memberId: req.user?.memberId || IDS.MEMBER_GRACE,
      authorName: req.user?.fullName || 'Faith Preachers Member',
      branchId: req.user?.branchId || IDS.BRANCH_HQ,
      branchName: branch?.name || 'Cathedral of Grace (HQ)',
      title,
      content,
      category: category || 'General',
      photoUrl,
      videoUrl,
      allowPublish: !!allowPublish,
      status: 'pending_review',
      isFeaturedOnFeed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.testimonies.unshift(newTestimony);
    await persistTestimony(newTestimony).catch(err => console.warn('[PERSIST TESTIMONY ERROR]', err.message));
    return res.status(201).json({
      success: true,
      message: 'Your testimony has been submitted and is awaiting pastoral review.',
      testimony: newTestimony
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reviewTestimonyHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, requestChangesNotes, isFeaturedOnFeed } = req.body;
    const testimony = db.testimonies.find(t => t.id === id);
    if (!testimony) return res.status(404).json({ error: 'Testimony not found.' });

    testimony.status = status;
    testimony.rejectionReason = rejectionReason;
    testimony.requestChangesNotes = requestChangesNotes;
    if (isFeaturedOnFeed !== undefined) testimony.isFeaturedOnFeed = !!isFeaturedOnFeed;
    testimony.reviewedBy = req.user?.userId || IDS.USER_ADMIN;
    testimony.reviewedAt = new Date().toISOString();
    testimony.updatedAt = new Date().toISOString();
    await persistTestimony(testimony).catch(err => console.warn('[PERSIST TESTIMONY ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      'admin',
      `TESTIMONY_${status.toUpperCase()}`,
      'testimony',
      id,
      req.user?.userId,
      null,
      { status, isFeaturedOnFeed }
    );

    return res.json({ success: true, testimony });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteTestimonyHandler = async (req: Request, res: Response) => {
  try {
    const testimony = db.testimonies.find(t => t.id === req.params.id);
    if (!testimony) return res.status(404).json({ error: 'Testimony not found.' });

    const isAuthor = testimony.memberId === req.user?.memberId;
    const isAdmin = req.user?.isAdmin;

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this testimony.' });
    }

    if (isAdmin && req.user?.adminLevel !== 'super_admin' && !isAuthor && req.user?.branchId !== testimony.branchId) {
      return res.status(403).json({ error: 'Branch isolation violation: Cannot delete testimony from another branch.' });
    }

    const idx = db.testimonies.findIndex(t => t.id === req.params.id);
    db.testimonies.splice(idx, 1);
    await persistDelete('testimonies', req.params.id).catch(err => console.warn('[DELETE TESTIMONY ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'User',
      req.user?.roleName || 'member',
      'TESTIMONY_DELETED',
      'testimony',
      testimony.id,
      req.user?.userId,
      testimony,
      null
    );

    return res.json({ success: true, message: 'Testimony successfully removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// NOTIFICATIONS CONTROLLER
// =============================================================================
export const getNotificationsHandler = (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userMemberId = req.user?.memberId;
  const userBranchId = req.user?.branchId;
  const userRoleId = req.user?.roleId;

  const member = userMemberId ? db.members.find(m => m.id === userMemberId) : null;
  const worker = userMemberId ? db.workers.find(w => w.memberId === userMemberId) : null;
  const userDeptId = worker?.departmentId;
  const isWorker = !!worker || !!member?.isWorker;

  const relevant = db.notifications.filter(n => {
    if (n.targetScope === 'entire_church' || n.targetScope === 'all') return true;
    if (n.targetScope === 'branch' && n.targetId === userBranchId) return true;
    if (n.targetScope === 'ministry_role' && n.targetId === userRoleId) return true;
    if (n.targetScope === 'department' && n.targetId === userDeptId) return true;
    if (n.targetScope === 'workers' && isWorker) return true;
    if (n.targetScope === 'specific_member' && (n.targetId === userMemberId || n.targetId === userId)) return true;
    return false;
  }).map(n => {
    const isRead = db.notificationReads.some(r => r.notificationId === n.id && r.userId === userId);
    return { ...n, isRead };
  });

  return res.json(relevant);
};

export const broadcastNotificationHandler = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.adminLevel === 'super_admin';
    const isBranchAdmin = req.user?.adminLevel === 'branch_admin';

    if (!isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Branch Administrator or Super Administrator privileges required to broadcast push notifications. Heads of Department cannot broadcast notifications.'
      });
    }

    const { title, body, notificationType, targetScope, targetId, actionUrl } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });

    const newNotification: NotificationItem = {
      id: uuidv4(),
      title,
      body,
      notificationType: notificationType || 'announcement',
      targetScope: targetScope || 'entire_church',
      targetId,
      actionUrl,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(newNotification);
    await persistNotification(newNotification).catch(err => console.warn('[PERSIST NOTIFICATION ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      'admin',
      'NOTIFICATION_BROADCAST',
      'notification',
      newNotification.id,
      req.user?.userId,
      null,
      { title, targetScope, targetId }
    );

    return res.status(201).json(newNotification);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const markNotificationReadHandler = (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId || IDS.USER_ADMIN;
  if (!db.notificationReads.some(r => r.notificationId === id && r.userId === userId)) {
    db.notificationReads.push({ notificationId: id, userId, isRead: true });
  }
  return res.json({ success: true });
};

export const deleteNotificationHandler = async (req: Request, res: Response) => {
  try {
    const notif = db.notifications.find(n => n.id === req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });

    const idx = db.notifications.findIndex(n => n.id === req.params.id);
    db.notifications.splice(idx, 1);
    await persistDelete('notifications', req.params.id).catch(err => console.warn('[DELETE NOTIFICATION ERROR]', err.message));

    AuditService.log(
      req.user?.fullName || 'Admin',
      req.user?.roleName || 'admin',
      'NOTIFICATION_DELETED',
      'notification',
      req.params.id,
      req.user?.userId,
      notif,
      null
    );

    return res.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// AUDIT LOGS CONTROLLER
// =============================================================================
export const getAuditLogsHandler = (req: Request, res: Response) => {
  const logs = AuditService.getLogs(100);
  return res.json(logs);
};

// =============================================================================
// SETTINGS CONTROLLER
// =============================================================================
export const getSettingsHandler = (req: Request, res: Response) => {
  const branchId = (req.query.branchId as string) || req.user?.branchId;
  const settings = SettingsService.getSettingsForBranch(branchId);
  return res.json({
    ...settings.attendance,
    ...settings
  });
};

export const updateSettingsHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const updated = SettingsService.updateSettings(req.body, user);
    return res.json({
      ...updated.attendance,
      ...updated
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes('privileges required') || err.message?.includes('Only Super Administrators');
    return res.status(isForbidden ? 403 : 400).json({
      success: false,
      error: err.message || 'Failed to update settings.'
    });
  }
};

export const getSystemHealthHandler = async (req: Request, res: Response) => {
  try {
    const health = await SettingsService.getSystemHealth();
    return res.json({ success: true, ...health });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve system health metrics.' });
  }
};

// =============================================================================
// MEDIA CONTROLLER (SUPABASE STORAGE)
// =============================================================================
export const uploadMediaHandler = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No media file provided.' });
    }

    const { entityType, entityId, branchId } = req.body;
    if (!entityType) {
      return res.status(400).json({ success: false, error: 'entityType is required.' });
    }

    const mediaSettings = SettingsService.getSettings().media;
    if (file.size > mediaSettings.maxUploadSizeMb * 1024 * 1024) {
      return res.status(400).json({ success: false, error: `File size exceeds the maximum permitted limit of ${mediaSettings.maxUploadSizeMb} MB.` });
    }
    if (mediaSettings.allowedImageFormats.length > 0 && !mediaSettings.allowedImageFormats.includes(file.mimetype) && !file.mimetype.startsWith('video/')) {
      return res.status(400).json({ success: false, error: `File type ${file.mimetype} is not permitted. Allowed formats: ${mediaSettings.allowedImageFormats.join(', ')}.` });
    }
    if (entityType === 'sunday_moment' && !mediaSettings.allowMemberMomentsUpload && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Member image uploads for Sunday Moments are currently disabled.' });
    }

    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const protocol = req.protocol || 'http';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    const mediaItem = await StorageService.uploadImage({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entityType,
      entityId,
      branchId,
      baseUrl,
      userId: req.user?.userId || 'system',
      userFullName: req.user?.fullName || 'Unknown User',
      userRole: req.user?.roleName || 'member',
      adminLevel: req.user?.adminLevel,
      userBranchId: req.user?.branchId,
      isAdmin: req.user?.isAdmin
    });

    return res.status(201).json({ success: true, media: mediaItem });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const uploadAvatarHandler = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image file provided.' });
    }

    // Strict 10MB ceiling enforcement (10,485,760 bytes)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Profile photo exceeds 10MB limit. Please select an image under 10MB.' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, error: 'Only image files (JPEG, PNG, WEBP) are allowed for profile photos.' });
    }

    // Magic-byte inspection for authentic binary image headers
    const isJpeg = file.buffer.length >= 3 && file.buffer[0] === 0xFF && file.buffer[1] === 0xD8 && file.buffer[2] === 0xFF;
    const isPng = file.buffer.length >= 8 && file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && file.buffer[2] === 0x4E && file.buffer[3] === 0x47;
    const isWebp = file.buffer.length >= 12 && file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image file signature. Only authentic JPEG, PNG, or WEBP images are accepted.'
      });
    }

    const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
    const protocol = req.protocol || 'http';
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    const mediaItem = await StorageService.uploadImage({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entityType: 'profile',
      baseUrl,
      userId: 'registration-applicant',
      userFullName: 'Applicant',
      userRole: 'member'
    });

    return res.status(201).json({ success: true, publicUrl: mediaItem.publicUrl, media: mediaItem });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteMediaHandler = async (req: Request, res: Response) => {
  try {
    const result = await StorageService.deleteMedia(req.params.id, {
      userId: req.user?.userId || 'system',
      userFullName: req.user?.fullName || 'Unknown User',
      userRole: req.user?.roleName || 'member',
      adminLevel: req.user?.adminLevel,
      branchId: req.user?.branchId
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const listMediaHandler = (req: Request, res: Response) => {
  const { entityType, entityId, branchId } = req.query;
  const items = StorageService.listMedia({
    entityType: entityType as any,
    entityId: entityId as string,
    branchId: branchId as string
  });
  return res.json(items);
};

export const getDbStatusHandler = async (req: Request, res: Response) => {
  try {
    const { checkConnection } = await import('../db');
    const status = await checkConnection();
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, avoid leaking internal database engine versions, counts, or raw connection strings
    if (isProduction) {
      return res.json({
        success: true,
        database: 'supabase_postgresql',
        connected: status.connected,
        timestamp: status.timestamp
      });
    }

    return res.json({
      success: true,
      database: 'supabase_postgresql',
      connected: status.connected,
      version: status.version,
      timestamp: status.timestamp,
      error: status.error,
      counts: {
        branches: db.branches.length,
        users: db.users.length,
        members: db.members.length,
        workers: db.workers.length,
        services: db.services.length,
        attendanceRecords: db.attendanceRecords.length,
        events: db.events.length,
        posts: db.posts.length,
        highlights: db.serviceHighlights.length,
        testimonies: db.testimonies.length,
        notifications: db.notifications.length,
        mediaFiles: db.mediaFiles.length,
        auditLogs: db.auditLogs.length,
        departmentReports: db.departmentReports?.length || 0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Database status check failed' });
  }
};

// =============================================================================
// DEPARTMENT REPORTS CONTROLLER
// =============================================================================

/**
 * Checks whether the given user is an HOD for any department or a specific department.
 */
function isUserHod(user: any, departmentId?: string): boolean {
  if (!user) return false;
  const roleCode = user.roleCode?.toUpperCase();
  const isHodRole = roleCode === 'HOD' || user.roleName?.toLowerCase().includes('head of department');

  if (departmentId) {
    const dept = db.departments.find(d => d.id === departmentId);
    if (dept && (dept.hodId === user.userId || dept.hodName?.toLowerCase() === user.fullName?.toLowerCase())) {
      return true;
    }
    const worker = db.workers.find(w => {
      const m = db.members.find(mem => mem.id === w.memberId);
      return m?.userId === user.userId && w.departmentId === departmentId;
    });
    if (worker) {
      const pos = (worker.positionName || '').toLowerCase();
      if (pos.includes('head') || pos.includes('hod') || pos.includes('director') || pos.includes('lead') || pos.includes('coordinator')) {
        return true;
      }
    }
    return isHodRole;
  }

  // Check generally if user is HOD of any department
  const isDeptHod = db.departments.some(d => d.hodId === user.userId || d.hodName?.toLowerCase() === user.fullName?.toLowerCase());
  if (isDeptHod || isHodRole) return true;

  const userWorkers = db.workers.filter(w => {
    const m = db.members.find(mem => mem.id === w.memberId);
    return m?.userId === user.userId;
  });
  return userWorkers.some(w => {
    const pos = (w.positionName || '').toLowerCase();
    return pos.includes('head') || pos.includes('hod') || pos.includes('director') || pos.includes('lead') || pos.includes('coordinator');
  });
}

function isPastorOrAdmin(user: any): boolean {
  if (!user) return false;
  if (user.isAdmin || user.adminLevel === 'super_admin' || user.adminLevel === 'branch_admin') return true;
  const roleCode = user.roleCode?.toUpperCase();
  return roleCode === 'BRANCH_PASTOR' || roleCode === 'ASSOCIATE_PASTOR' || roleCode === 'PASTOR' || roleCode === 'SENIOR_PASTOR';
}

export const getDepartmentReportsHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isBranchPastor = isPastorOrAdmin(user);
    const isHod = isUserHod(user);

    if (!isSuperAdmin && !isBranchPastor && !isHod) {
      return res.status(403).json({
        success: false,
        error: 'Only Heads of Department, Branch Pastors, and Administrators can access departmental reports.'
      });
    }

    const { departmentId, branchId, reportType, status, startDate, endDate } = req.query;

    let reports = [...(db.departmentReports || [])];

    // Branch / Department scoping:
    if (isSuperAdmin) {
      if (branchId) {
        reports = reports.filter(r => r.branchId === branchId);
      }
    } else if (isBranchPastor) {
      reports = reports.filter(r => r.branchId === user.branchId);
    } else if (isHod) {
      const hodDeptIds = db.departments
        .filter(d => isUserHod(user, d.id))
        .map(d => d.id);
      
      reports = reports.filter(r => 
        hodDeptIds.includes(r.departmentId) || 
        r.submittedBy === user.userId ||
        (user.workerDetails?.departmentId && r.departmentId === user.workerDetails.departmentId)
      );
    }

    // Additional query filters
    if (departmentId) {
      reports = reports.filter(r => r.departmentId === departmentId);
    }
    if (reportType) {
      reports = reports.filter(r => r.reportType === reportType);
    }
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    if (startDate) {
      reports = reports.filter(r => r.reportDate >= (startDate as string));
    }
    if (endDate) {
      reports = reports.filter(r => r.reportDate <= (endDate as string));
    }

    // Enrich with current names if missing
    reports = reports.map(r => ({
      ...r,
      departmentName: r.departmentName || db.departments.find(d => d.id === r.departmentId)?.name || 'Department',
      branchName: r.branchName || db.branches.find(b => b.id === r.branchId)?.name || 'Branch'
    }));

    // Sort descending by reportDate
    reports.sort((a, b) => (b.reportDate > a.reportDate ? 1 : b.reportDate < a.reportDate ? -1 : 0));

    return res.json(reports);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDepartmentReportByIdHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const report = (db.departmentReports || []).find(r => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Department report not found.' });
    }

    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isBranchPastor = isPastorOrAdmin(user) && report.branchId === user.branchId;
    const isSubmittingHod = report.submittedBy === user.userId || isUserHod(user, report.departmentId);

    if (!isSuperAdmin && !isBranchPastor && !isSubmittingHod) {
      return res.status(403).json({ success: false, error: 'Access denied to this report.' });
    }

    const enrichedReport = {
      ...report,
      departmentName: report.departmentName || db.departments.find(d => d.id === report.departmentId)?.name || 'Department',
      branchName: report.branchName || db.branches.find(b => b.id === report.branchId)?.name || 'Branch'
    };

    return res.json(enrichedReport);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createDepartmentReportHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    let {
      departmentId,
      branchId,
      title,
      reportType,
      reportDate,
      attendanceCount,
      summary,
      achievements,
      challenges,
      prayerRequests,
      budgetNotes
    } = req.body;

    // Auto-resolve departmentId if missing
    if (!departmentId) {
      if (user.workerDetails?.departmentId) {
        departmentId = user.workerDetails.departmentId;
      } else {
        const userHodDept = db.departments.find(d => isUserHod(user, d.id));
        if (userHodDept) {
          departmentId = userHodDept.id;
        }
      }
    }

    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'Department ID is required.' });
    }

    const dept = db.departments.find(d => d.id === departmentId);
    if (!dept) {
      return res.status(404).json({ success: false, error: 'Department not found.' });
    }

    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isBranchPastor = isPastorOrAdmin(user);
    const isHod = isUserHod(user, departmentId);

    if (!isSuperAdmin && !isBranchPastor && !isHod) {
      return res.status(403).json({
        success: false,
        error: 'Only the Head of Department, Branch Pastor, or Super Administrator can submit reports for this department.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Report title is required.' });
    }
    if (!summary || !summary.trim()) {
      return res.status(400).json({ success: false, error: 'Report summary is required.' });
    }

    const targetBranchId = branchId || dept.branchId || user.branchId || IDS.BRANCH_HQ;
    const branch = db.branches.find(b => b.id === targetBranchId);

    const now = new Date().toISOString();
    const newReport: DepartmentReport = {
      id: uuidv4(),
      departmentId,
      departmentName: dept.name,
      branchId: targetBranchId,
      branchName: branch?.name || 'Cathedral of Grace (HQ)',
      title: title.trim(),
      reportType: reportType || 'weekly',
      reportDate: reportDate || now.split('T')[0],
      attendanceCount: attendanceCount !== undefined && attendanceCount !== null ? Number(attendanceCount) : undefined,
      summary: summary.trim(),
      achievements: achievements?.trim() || undefined,
      challenges: challenges?.trim() || undefined,
      prayerRequests: prayerRequests?.trim() || undefined,
      budgetNotes: budgetNotes?.trim() || undefined,
      status: 'submitted',
      submittedBy: user.userId,
      submittedByName: user.fullName || 'HOD',
      createdAt: now,
      updatedAt: now
    };

    if (!db.departmentReports) {
      db.departmentReports = [];
    }
    db.departmentReports.unshift(newReport);

    // Persist to Postgres
    await persistDepartmentReport(newReport);

    // Log audit trail
    AuditService.log(
      user.fullName,
      user.roleName,
      'SUBMIT_DEPARTMENT_REPORT',
      'department_report',
      newReport.id,
      newReport.id
    );

    // Create notification for Branch Pastor & Super Admin
    const notif: NotificationItem = {
      id: uuidv4(),
      title: `New Report: ${dept.name}`,
      body: `${user.fullName} submitted a ${newReport.reportType} report for ${dept.name}: "${newReport.title}".`,
      notificationType: 'reminder',
      targetScope: 'branch',
      targetId: targetBranchId,
      actionUrl: '/reports',
      createdAt: now
    };
    db.notifications.unshift(notif);

    return res.status(201).json({
      success: true,
      message: 'Department report submitted successfully.',
      report: newReport
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const reviewDepartmentReportHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isPastor = isPastorOrAdmin(user);

    if (!isSuperAdmin && !isPastor) {
      return res.status(403).json({
        success: false,
        error: 'Only Branch Pastors and Super Administrators can review departmental reports.'
      });
    }

    const report = (db.departmentReports || []).find(r => r.id === req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Department report not found.' });
    }

    // Branch scope check: Branch Pastors can only review reports in their branch
    if (!isSuperAdmin && report.branchId !== user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'You may only review reports submitted for your branch.'
      });
    }

    const { reviewNotes, status } = req.body;
    const now = new Date().toISOString();

    report.status = status === 'acknowledged' ? 'acknowledged' : 'reviewed';
    if (reviewNotes !== undefined) {
      report.reviewNotes = reviewNotes.trim();
    }
    report.reviewedBy = user.userId;
    report.reviewedByName = user.fullName;
    report.reviewedAt = now;
    report.updatedAt = now;

    await persistDepartmentReport(report);

    AuditService.log(
      user.fullName,
      user.roleName,
      'REVIEW_DEPARTMENT_REPORT',
      'department_report',
      report.id,
      report.id
    );

    // Notify submitting HOD
    const notif: NotificationItem = {
      id: uuidv4(),
      title: `Report Reviewed: ${report.title}`,
      body: `${user.fullName} has reviewed your report for ${report.departmentName || 'your department'}.${report.reviewNotes ? ` Note: "${report.reviewNotes}"` : ''}`,
      notificationType: 'announcement',
      targetScope: 'specific_member',
      targetId: report.submittedBy,
      actionUrl: '/reports',
      createdAt: now
    };
    db.notifications.unshift(notif);

    return res.json({
      success: true,
      message: 'Report reviewed successfully.',
      report
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteDepartmentReportHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const reportIndex = (db.departmentReports || []).findIndex(r => r.id === req.params.id);
    if (reportIndex === -1) {
      return res.status(404).json({ success: false, error: 'Department report not found.' });
    }

    const report = db.departmentReports[reportIndex];
    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isSubmitter = report.submittedBy === user.userId && report.status === 'submitted';

    if (!isSuperAdmin && !isSubmitter) {
      return res.status(403).json({
        success: false,
        error: 'Only Super Administrators or the author of an unreviewed report can delete it.'
      });
    }

    db.departmentReports.splice(reportIndex, 1);
    await persistDelete('department_reports', req.params.id);

    AuditService.log(
      user.fullName,
      user.roleName,
      'DELETE_DEPARTMENT_REPORT',
      'department_report',
      req.params.id,
      req.params.id
    );

    return res.json({ success: true, message: 'Department report deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// SUNDAY MOMENTS CONTROLLER
// =============================================================================
export const getSundayMomentsHandler = (req: Request, res: Response) => {
  try {
    const { branchId, sundayDate } = req.query as { branchId?: string; sundayDate?: string };
    let moments = [...(db.sundayMoments || [])];

    if (branchId) {
      moments = moments.filter(m => m.branchId === branchId);
    }

    if (sundayDate) {
      moments = moments.filter(m => m.sundayDate === sundayDate);
    }

    // Regular members only see approved moments; admins can see pending
    const user = req.user;
    const isBranchAdminOrHigher = user?.adminLevel === 'super_admin' || 
      (user?.adminLevel === 'branch_admin' && (!branchId || user.branchId === branchId));

    if (!isBranchAdminOrHigher) {
      moments = moments.filter(m => m.status === 'approved');
    }

    // Sort by createdAt descending
    moments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const sanitized = moments.map(m => ({
      ...m,
      mediaUrl: sanitizeMediaUrl(m.mediaUrl) || m.mediaUrl,
      thumbnailUrl: sanitizeMediaUrl(m.thumbnailUrl || m.mediaUrl) || m.thumbnailUrl || m.mediaUrl
    }));

    return res.json(sanitized);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createSundayMomentHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { branchId, mediaUrl, thumbnailUrl, caption, sundayDate } = req.body;
    if (!branchId || !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Branch ID and media URL are required.' });
    }

    // Enforce branch-level authorization
    const isSuperAdmin = user.adminLevel === 'super_admin';
    const userBranch = user.branchId;

    if (!isSuperAdmin && userBranch && userBranch !== branchId) {
      return res.status(403).json({
        success: false,
        error: 'Branch isolation violation: You can only upload Sunday moments for your assigned branch.'
      });
    }

    // Calculate recent Sunday date if not provided
    let calculatedSunday = sundayDate;
    if (!calculatedSunday) {
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 0 : day;
      const recentSunday = new Date(now);
      recentSunday.setDate(now.getDate() - diff);
      calculatedSunday = recentSunday.toISOString().split('T')[0];
    }

    const sanitizedMedia = sanitizeMediaUrl(mediaUrl) || mediaUrl;
    const sanitizedThumb = sanitizeMediaUrl(thumbnailUrl || mediaUrl) || sanitizedMedia;

    const newMoment: SundayMoment = {
      id: uuidv4(),
      branchId,
      uploadedBy: user.userId,
      uploadedByName: user.fullName || 'Church Member',
      uploadedByRole: user.roleName || 'Member',
      mediaUrl: sanitizedMedia,
      thumbnailUrl: sanitizedThumb,
      caption: caption ? String(caption).trim() : undefined,
      sundayDate: calculatedSunday,
      status: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!db.sundayMoments) {
      db.sundayMoments = [];
    }
    db.sundayMoments.unshift(newMoment);

    await persistSundayMoment(newMoment).catch(err => console.warn('[PERSIST SUNDAY MOMENT ERROR]', err.message));

    AuditService.log(
      user.fullName,
      user.roleName,
      'SUNDAY_MOMENT_CREATED',
      'sunday_moment',
      newMoment.id,
      user.userId,
      null,
      newMoment
    );

    return res.status(201).json(newMoment);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteSundayMomentHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });

    const { id } = req.params;
    const momentIndex = (db.sundayMoments || []).findIndex(m => m.id === id);
    if (momentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Sunday moment not found.' });
    }

    const moment = db.sundayMoments[momentIndex];
    const isOwner = moment.uploadedBy === user.userId;
    const isSuperAdmin = user.adminLevel === 'super_admin';
    const isBranchAdmin = user.adminLevel === 'branch_admin' && user.branchId === moment.branchId;

    if (!isOwner && !isSuperAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this Sunday moment. Members cannot delete other members uploads.'
      });
    }

    db.sundayMoments.splice(momentIndex, 1);
    await deleteSundayMomentFromDb(id).catch(err => console.warn('[DELETE SUNDAY MOMENT ERROR]', err.message));

    AuditService.log(
      user.fullName,
      user.roleName,
      'SUNDAY_MOMENT_DELETED',
      'sunday_moment',
      id,
      user.userId
    );

    return res.json({ success: true, message: 'Sunday moment deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =============================================================================
// FINANCE CONTROLLER
// =============================================================================
export const getFinanceCategoriesHandler = (req: Request, res: Response) => {
  try {
    const categories = FinanceService.getCategories();
    return res.json({ success: true, ...categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getFinanceDashboardHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to access finance module.' });
    }

    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);
    const branchId = req.query.branchId as string;

    const summary = FinanceService.getDashboardSummary(branchId, year, month, user);
    return res.json({ success: true, ...summary });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceTransactionsHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to access finance module.' });
    }

    const {
      branchId,
      transactionType,
      category,
      paymentMethod,
      status,
      startDate,
      endDate,
      month,
      year,
      search,
      page,
      limit
    } = req.query;

    const result = FinanceService.getTransactions({
      branchId: branchId as string,
      transactionType: transactionType as 'income' | 'expense',
      category: category as string,
      paymentMethod: paymentMethod as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      month: month as string,
      year: year as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined
    }, user);

    return res.json({ success: true, ...result });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceTransactionByIdHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const tx = FinanceService.getTransactionById(req.params.id, user);
    return res.json({ success: true, transaction: tx });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : err.message?.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const createFinanceTransactionHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to record financial transactions.' });
    }

    const tx = await FinanceService.createTransaction(req.body, user);
    return res.status(201).json({ success: true, transaction: tx });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const updateFinanceTransactionHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to edit financial transactions.' });
    }

    const tx = await FinanceService.updateTransaction(req.params.id, req.body, user);
    return res.json({ success: true, transaction: tx });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : err.message?.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const voidFinanceTransactionHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to void financial transactions.' });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Void reason is required.' });
    }

    const tx = await FinanceService.voidTransaction(req.params.id, reason, user);
    return res.json({ success: true, transaction: tx });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : err.message?.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceOpeningBalanceHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);
    const branchId = req.query.branchId as string;

    const data = FinanceService.getOpeningBalanceRecord(branchId, year, month, user);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const setFinanceOpeningBalanceHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const { branchId, year, month, amount, notes } = req.body;
    if (!branchId || !year || !month || amount === undefined) {
      return res.status(400).json({ success: false, error: 'branchId, year, month, and amount are required.' });
    }

    const record = await FinanceService.setInitialOpeningBalance(
      branchId,
      parseInt(year, 10),
      parseInt(month, 10),
      parseFloat(amount),
      notes,
      user
    );

    return res.json({ success: true, openingBalance: record });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 400;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceMonthlyStatementHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);
    const branchId = req.query.branchId as string;

    const statement = FinanceService.getMonthlyStatement(branchId, year, month, user);
    return res.json({ success: true, ...statement });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceAnnualStatementHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const branchId = req.query.branchId as string;

    const statement = FinanceService.getAnnualStatement(branchId, year, user);
    return res.json({ success: true, ...statement });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const getFinanceCategoryAnalysisHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const type = (req.query.type as 'income' | 'expense') || 'income';
    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const branchId = req.query.branchId as string;

    const analysis = FinanceService.getCategoryAnalysis(type, branchId, year, month, user);
    return res.json({ success: true, ...analysis });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};

export const exportFinanceReportHandler = (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized.' });
    if (!FinanceService.isAuthorized(user)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }

    const reportType = (req.query.reportType as any) || 'monthly_statement';
    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || (now.getMonth() + 1);
    const branchId = req.query.branchId as string;
    const format = req.query.format as string;

    const report = FinanceService.exportReportCsv(reportType, branchId, year, month, user);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      return res.send(report.content);
    }

    return res.json({ success: true, ...report });
  } catch (err: any) {
    const statusCode = err.message?.includes('Forbidden') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
};


