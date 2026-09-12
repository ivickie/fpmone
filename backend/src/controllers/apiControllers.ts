import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, IDS } from '../data/mockDb';
import { AuthService } from '../services/authService';
import { MemberService } from '../services/memberService';
import { AttendanceService } from '../services/attendanceService';
import { AuditService } from '../services/auditService';
import { StorageService } from '../services/storageService';
import {
  Branch, Department, DepartmentPosition, EventItem, PostItem,
  ServiceSchedule, TestimonyItem, NotificationItem, MinistryRole, MediaItem
} from '../types';
import { persistService } from '../db/sync';

// =============================================================================
// AUTH CONTROLLER
// =============================================================================
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Email/Phone and Password are required.' });
    }
    const result = await AuthService.login(emailOrPhone, password);
    if (result.error) {
      return res.status(result.status === 'pending' ? 403 : 401).json({
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
  return res.json(req.user);
};

export const updateProfileHandler = (req: Request, res: Response) => {
  try {
    const { phone, residentialAddress, emergencyContactName, emergencyContactPhone, profilePictureUrl } = req.body;
    const member = db.members.find(m => m.id === req.user?.memberId);
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    if (phone) {
      const user = db.users.find(u => u.id === req.user?.userId);
      if (user) user.phone = phone;
    }
    if (residentialAddress !== undefined) member.residentialAddress = residentialAddress;
    if (emergencyContactName !== undefined) member.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined) member.emergencyContactPhone = emergencyContactPhone;
    if (profilePictureUrl !== undefined) member.profilePictureUrl = profilePictureUrl;
    member.updatedAt = new Date().toISOString();

    return res.json({ success: true, member });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// =============================================================================
// BRANCHES CONTROLLER
// =============================================================================
export const getBranchesHandler = (req: Request, res: Response) => {
  return res.json(db.branches);
};

export const createBranchHandler = (req: Request, res: Response) => {
  try {
    if (req.user?.adminLevel !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super Administrator privileges required to create branches.' });
    }
    const { name, branchCode, address, city, state, country, phone, email, branchPastorName, logoUrl } = req.body;
    if (!name || !branchCode || !address || !city) {
      return res.status(400).json({ success: false, error: 'Name, branch code, address, and city are required.' });
    }
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
      logoUrl,
      status: 'active',
      isHeadquarters: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.branches.push(newBranch);
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'BRANCH_CREATED', 'branch', newBranch.id, req.user?.userId, null, newBranch);
    return res.status(201).json(newBranch);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateBranchHandler = (req: Request, res: Response) => {
  if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== req.params.id) {
    return res.status(403).json({ success: false, error: 'Unauthorized to modify another branch.' });
  }
  const branch = db.branches.find(b => b.id === req.params.id);
  if (!branch) return res.status(404).json({ success: false, error: 'Branch not found.' });
  Object.assign(branch, req.body, { updatedAt: new Date().toISOString() });
  AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'BRANCH_UPDATED', 'branch', branch.id, req.user?.userId, null, branch);
  return res.json(branch);
};

export const deleteBranchHandler = (req: Request, res: Response) => {
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
export const getDepartmentsHandler = (req: Request, res: Response) => {
  const { branchId, includeArchived } = req.query;
  let depts = db.departments;
  if (!includeArchived || includeArchived === 'false') {
    depts = depts.filter(d => d.status !== 'archived');
  }
  if (branchId) {
    depts = depts.filter(d => !d.branchId || d.branchId === branchId);
  }
  return res.json(depts);
};

export const createDepartmentHandler = (req: Request, res: Response) => {
  const { name, code, description, hodName, branchId } = req.body;
  if (!name || !code) return res.status(400).json({ success: false, error: 'Name and Code are required.' });

  // If not super admin, department must belong to caller's branch
  const effectiveBranchId = req.user?.adminLevel === 'super_admin' ? branchId : req.user?.branchId;

  const newDept: Department = {
    id: uuidv4(),
    name,
    code: code.toUpperCase(),
    description,
    hodName,
    branchId: effectiveBranchId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.departments.push(newDept);
  AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'DEPARTMENT_CREATED', 'department', newDept.id, req.user?.userId, null, newDept);
  return res.status(201).json(newDept);
};

export const updateDepartmentHandler = (req: Request, res: Response) => {
  try {
    const dept = db.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found.' });

    // Branch isolation
    if (req.user?.adminLevel !== 'super_admin' && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify departments outside your branch.' });
    }

    const { name, code, description, hodName, hodId, status } = req.body;
    if (name) dept.name = name;
    if (code) dept.code = code.toUpperCase();
    if (description !== undefined) dept.description = description;
    if (hodName !== undefined) dept.hodName = hodName;
    if (hodId !== undefined) dept.hodId = hodId;
    if (status) dept.status = status;
    dept.updatedAt = new Date().toISOString();

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

export const deleteDepartmentHandler = (req: Request, res: Response) => {
  try {
    const dept = db.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found.' });

    if (req.user?.adminLevel !== 'super_admin' && dept.branchId && dept.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete departments outside your branch.' });
    }

    const hasWorkers = db.workers.some(w => w.departmentId === req.params.id && w.workerStatus !== 'archived');
    if (hasWorkers) {
      dept.status = 'archived';
      dept.updatedAt = new Date().toISOString();
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

export const createPositionHandler = (req: Request, res: Response) => {
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

export const deletePositionHandler = (req: Request, res: Response) => {
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

export const createRoleHandler = (req: Request, res: Response) => {
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

export const updateRoleHandler = (req: Request, res: Response) => {
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

export const deleteRoleHandler = (req: Request, res: Response) => {
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

export const approveMemberHandler = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = MemberService.approveMember(userId, adminId, adminName, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const rejectMemberHandler = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, error: 'Rejection reason is required.' });
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = MemberService.rejectMember(userId, adminId, adminName, reason, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const requestChangesHandler = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ success: false, error: 'Instructions/notes are required.' });
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = MemberService.requestChanges(userId, adminId, adminName, notes, adminScope);
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

export const createMemberHandler = (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const payload = {
      ...req.body,
      primaryBranchId: req.body.primaryBranchId || req.body.branchId,
      primaryRoleId: req.body.primaryRoleId || req.body.roleId
    };
    const newMember = MemberService.createMember(payload, adminId, adminName, adminScope);
    return res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateMemberStatusHandler = (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = MemberService.updateAccountStatus(req.params.id, status, adminId, adminName, adminScope);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

export const updateMemberAssignmentHandler = (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId || IDS.USER_ADMIN;
    const adminName = req.user?.fullName || 'Administrator';
    const adminScope = req.user ? { adminLevel: req.user.adminLevel, branchId: req.user.branchId } : undefined;
    const result = MemberService.updateChurchAssignment(req.params.id, req.body, adminId, adminName, adminScope);
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

export const updateMemberHandler = (req: Request, res: Response) => {
  try {
    const member = db.members.find(m => m.id === req.params.id);
    if (!member) return res.status(404).json({ success: false, error: 'Member not found.' });

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

    const user = db.users.find(u => u.id === member.userId);
    if (user) {
      if (email) user.email = email;
      if (phone) user.phone = phone;
      user.updatedAt = new Date().toISOString();
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

export const updateWorkerHandler = (req: Request, res: Response) => {
  try {
    const worker = db.workers.find(w => w.id === req.params.id);
    if (!worker) return res.status(404).json({ success: false, error: 'Worker not found.' });

    const member = db.members.find(m => m.id === worker.memberId);
    if (req.user?.adminLevel !== 'super_admin' && member && member.primaryBranchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify worker in another branch.' });
    }

    const { departmentId, positionId, positionName, workerStatus } = req.body;
    if (departmentId) {
      const dept = db.departments.find(d => d.id === departmentId);
      if (!dept) return res.status(400).json({ success: false, error: 'Selected department does not exist.' });
      worker.departmentId = departmentId;
    }
    if (positionId !== undefined) worker.positionId = positionId;
    if (positionName !== undefined) worker.positionName = positionName;
    if (workerStatus) worker.workerStatus = workerStatus;
    worker.updatedAt = new Date().toISOString();

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

export const createServiceHandler = (req: Request, res: Response) => {
  try {
    const { branchId, name, dayOfWeek, startTime, expectedEndTime, gracePeriodMinutes, earliestClockInMinutes, attendanceDurationHours } = req.body;
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
      qrCodeToken: `FPM-SVC-${serviceId}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.services.push(newService);
    persistService(newService);
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'SERVICE_CREATED', 'service', newService.id, req.user?.userId, null, newService);
    return res.status(201).json(newService);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateServiceHandler = (req: Request, res: Response) => {
  try {
    const service = db.services.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    // Branch isolation
    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== service.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot modify services of other branches.' });
    }

    const { name, dayOfWeek, startTime, expectedEndTime, gracePeriodMinutes, earliestClockInMinutes, attendanceDurationHours, status } = req.body;
    if (name) service.name = name;
    if (dayOfWeek) service.dayOfWeek = dayOfWeek;
    if (startTime) service.startTime = startTime;
    if (expectedEndTime) service.expectedEndTime = expectedEndTime;
    if (gracePeriodMinutes !== undefined) service.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (earliestClockInMinutes !== undefined) service.earliestClockInMinutes = Number(earliestClockInMinutes);
    if (attendanceDurationHours !== undefined) service.attendanceDurationHours = Number(attendanceDurationHours);
    if (status) service.status = status;
    service.updatedAt = new Date().toISOString();

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

export const deleteServiceHandler = (req: Request, res: Response) => {
  try {
    const service = db.services.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== service.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot delete services of other branches.' });
    }

    const hasAttendance = db.attendanceRecords.some(a => a.serviceId === req.params.id);
    if (hasAttendance) {
      service.status = 'archived';
      service.updatedAt = new Date().toISOString();
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

export const createEventHandler = (req: Request, res: Response) => {
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
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'EVENT_CREATED', 'event', newEvent.id, req.user?.userId, null, newEvent);
    return res.status(201).json(newEvent);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateEventHandler = (req: Request, res: Response) => {
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

export const deleteEventHandler = (req: Request, res: Response) => {
  try {
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });

    if (req.user?.adminLevel !== 'super_admin' && event.branchId && event.branchId !== req.user?.branchId) {
      return res.status(403).json({ success: false, error: 'Branch isolation violation: Cannot delete events of other branches.' });
    }

    event.status = 'archived';
    event.updatedAt = new Date().toISOString();

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

export const createPostHandler = (req: Request, res: Response) => {
  try {
    const { title, content, scriptureReference, postType, visibility, branchId, mediaUrls } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required.' });

    const newPost: PostItem = {
      id: uuidv4(),
      authorId: req.user?.userId || IDS.USER_ADMIN,
      authorName: req.user?.fullName || 'Faith Preachers Ministry',
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
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.posts.unshift(newPost);
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'POST_CREATED', 'post', newPost.id, req.user?.userId, null, newPost);
    return res.status(201).json(newPost);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updatePostHandler = (req: Request, res: Response) => {
  try {
    const post = db.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const isAuthor = post.authorId === req.user?.userId;
    const isAdmin = req.user?.isAdmin;
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to edit this post.' });
    }

    const { title, content, scriptureReference, mediaUrls, isPinned, status } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (scriptureReference !== undefined) post.scriptureReference = scriptureReference;
    if (mediaUrls !== undefined) post.mediaUrls = mediaUrls;
    if (isPinned !== undefined && isAdmin) post.isPinned = !!isPinned;
    if (status !== undefined) post.status = status;
    post.updatedAt = new Date().toISOString();

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

export const deletePostHandler = (req: Request, res: Response) => {
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

  const existingIdx = db.reactions.findIndex(r => r.postId === postId && r.userId === userId);
  if (existingIdx >= 0) {
    if (db.reactions[existingIdx].reactionType === reactionType) {
      db.reactions.splice(existingIdx, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      db.reactions[existingIdx].reactionType = reactionType;
    }
  } else {
    db.reactions.push({
      id: uuidv4(),
      postId,
      userId,
      reactionType,
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

export const createHighlightHandler = (req: Request, res: Response) => {
  try {
    const { branchId, title, speaker, summary, scripture, keyPoints, quote, photos, videoUrl } = req.body;
    if (!title || !speaker || !summary) {
      return res.status(400).json({ error: 'Title, speaker, and summary are required.' });
    }
    const newHighlight = {
      id: uuidv4(),
      branchId: branchId || IDS.BRANCH_HQ,
      highlightDate: new Date().toISOString().split('T')[0],
      title,
      speaker,
      summary,
      scripture,
      keyPoints: keyPoints || [],
      quote,
      photos: photos || [],
      videoUrl,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.serviceHighlights.unshift(newHighlight);
    AuditService.log(req.user?.fullName || 'Admin', req.user?.roleName || 'admin', 'HIGHLIGHT_CREATED', 'highlight', newHighlight.id, req.user?.userId, null, newHighlight);
    return res.status(201).json(newHighlight);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateHighlightHandler = (req: Request, res: Response) => {
  try {
    const highlight = db.serviceHighlights.find(h => h.id === req.params.id);
    if (!highlight) return res.status(404).json({ error: 'Highlight not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== highlight.branchId) {
      return res.status(403).json({ error: 'Branch isolation violation: Cannot modify highlights of other branches.' });
    }

    const { title, speaker, summary, scripture, keyPoints, quote, photos, videoUrl, isPublished } = req.body;
    if (title) highlight.title = title;
    if (speaker) highlight.speaker = speaker;
    if (summary) highlight.summary = summary;
    if (scripture !== undefined) highlight.scripture = scripture;
    if (keyPoints !== undefined) highlight.keyPoints = keyPoints;
    if (quote !== undefined) highlight.quote = quote;
    if (photos !== undefined) highlight.photos = photos;
    if (videoUrl !== undefined) highlight.videoUrl = videoUrl;
    if (isPublished !== undefined) highlight.isPublished = !!isPublished;
    highlight.updatedAt = new Date().toISOString();

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

export const deleteHighlightHandler = (req: Request, res: Response) => {
  try {
    const highlight = db.serviceHighlights.find(h => h.id === req.params.id);
    if (!highlight) return res.status(404).json({ error: 'Highlight not found.' });

    if (req.user?.adminLevel !== 'super_admin' && req.user?.branchId !== highlight.branchId) {
      return res.status(403).json({ error: 'Branch isolation violation: Cannot delete highlights of other branches.' });
    }

    const idx = db.serviceHighlights.findIndex(h => h.id === req.params.id);
    db.serviceHighlights.splice(idx, 1);

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

export const submitTestimonyHandler = (req: Request, res: Response) => {
  try {
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
    return res.status(201).json({
      success: true,
      message: 'Your testimony has been submitted and is awaiting pastoral review.',
      testimony: newTestimony
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const reviewTestimonyHandler = (req: Request, res: Response) => {
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

export const deleteTestimonyHandler = (req: Request, res: Response) => {
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

export const broadcastNotificationHandler = (req: Request, res: Response) => {
  try {
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

export const deleteNotificationHandler = (req: Request, res: Response) => {
  try {
    const notif = db.notifications.find(n => n.id === req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });

    const idx = db.notifications.findIndex(n => n.id === req.params.id);
    db.notifications.splice(idx, 1);

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
  return res.json(db.attendanceSettings);
};

export const updateSettingsHandler = (req: Request, res: Response) => {
  Object.assign(db.attendanceSettings, req.body, { updatedAt: new Date().toISOString() });
  return res.json(db.attendanceSettings);
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

    const mediaItem = await StorageService.uploadImage({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entityType,
      entityId,
      branchId,
      userId: req.user?.userId || 'system',
      userFullName: req.user?.fullName || 'Unknown User',
      userRole: req.user?.roleName || 'member',
      adminLevel: req.user?.adminLevel,
      userBranchId: req.user?.branchId
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

    // Strict 1MB ceiling enforcement (1,048,576 bytes)
    if (file.size > 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Profile photo exceeds 1MB limit. Please select an image under 1MB.' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, error: 'Only image files (JPEG, PNG, WEBP) are allowed for profile photos.' });
    }

    const mediaItem = await StorageService.uploadImage({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      entityType: 'profile',
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
        auditLogs: db.auditLogs.length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
