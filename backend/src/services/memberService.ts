import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mockDb';
import { Member, User, Worker, AccountStatus } from '../types';
import { AuditService } from './auditService';
import { persistUser, persistMember, persistWorker, persistNotification } from '../db/sync';

export class MemberService {
  /**
   * Fetch All Pending Member Approvals
   */
  public static getPendingApprovals(branchId?: string) {
    const pendingUsers = db.users.filter(u => u.accountStatus === 'pending');
    return pendingUsers.map(u => {
      const member = db.members.find(m => m.userId === u.id);
      const branch = member ? db.branches.find(b => b.id === member.primaryBranchId) : undefined;
      const role = member ? db.ministryRoles.find(r => r.id === member.primaryRoleId) : undefined;

      return {
        userId: u.id,
        email: u.email,
        phone: u.phone,
        registrationDate: u.createdAt,
        accountStatus: u.accountStatus,
        requestChangesNotes: u.requestChangesNotes,
        memberId: member?.id,
        firstName: member?.firstName || '',
        middleName: member?.middleName || '',
        lastName: member?.lastName || '',
        fullName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        gender: member?.gender,
        dateOfBirth: member?.dateOfBirth,
        residentialAddress: member?.residentialAddress,
        profilePictureUrl: member?.profilePictureUrl,
        emergencyContactName: member?.emergencyContactName,
        emergencyContactPhone: member?.emergencyContactPhone,
        isWorker: !!member?.isWorker,
        branchId: member?.primaryBranchId,
        branchName: branch?.name || 'HQ',
        roleId: member?.primaryRoleId,
        roleName: role?.name || 'Member'
      };
    }).filter(item => !branchId || item.branchId === branchId);
  }

  /**
   * Approve Member Registration
   */
  public static approveMember(
    userId: string,
    adminId: string,
    adminName: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    if (userId === adminId) {
      throw new Error('Administrators cannot approve their own registration.');
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const member = db.members.find(m => m.userId === userId);
    if (!member) throw new Error('Member profile not found.');

    // Branch isolation enforcement
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (member.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only approve members belonging to your assigned branch.');
      }
    }

    const prevState = { accountStatus: user.accountStatus };
    const now = new Date().toISOString();

    user.accountStatus = 'active';
    user.rejectionReason = undefined;
    user.requestChangesNotes = undefined;
    user.updatedAt = now;

    member.approvedBy = adminId;
    member.approvedAt = now;
    member.updatedAt = now;

    let workerRecord: Worker | undefined;

    // If registered as worker, generate Worker profile
    if (member.isWorker) {
      let existingWorker = db.workers.find(w => w.memberId === member.id);
      if (!existingWorker) {
        const workerCode = db.getNextWorkerCode(); // e.g. FPM-0004
        const defaultDept = db.departments.find(d => d.branchId === member.primaryBranchId) || db.departments[0];
        
        existingWorker = {
          id: uuidv4(),
          memberId: member.id,
          workerIdCode: workerCode,
          pinHash: bcrypt.hashSync('1234', 10), // default temporary PIN
          departmentId: defaultDept ? defaultDept.id : db.departments[0].id,
          positionName: 'Worker',
          dateStartedServing: now.split('T')[0],
          workerStatus: 'active',
          qrCodeToken: `FPM-QR-${workerCode}-${uuidv4().substring(0, 8)}`,
          biometricEnabled: true,
          createdAt: now,
          updatedAt: now
        };
        db.workers.push(existingWorker);
        persistWorker(existingWorker).catch(() => {});
      }
      workerRecord = existingWorker;
    }

    persistUser(user).catch(() => {});
    persistMember(member).catch(() => {});

    // Audit log
    AuditService.log(
      adminName,
      'admin',
      'MEMBER_APPROVED',
      'user',
      userId,
      adminId,
      prevState,
      {
        accountStatus: 'active',
        isWorker: member.isWorker,
        workerCode: workerRecord?.workerIdCode
      }
    );

    // Send push notification to the member
    db.notifications.unshift({
      id: uuidv4(),
      title: 'Registration Approved!',
      body: `Welcome to Faith Preachers Ministry! Your account is now active.${workerRecord ? ` Your Worker ID is ${workerRecord.workerIdCode}.` : ''}`,
      notificationType: 'registration_approved',
      targetScope: 'specific_member',
      targetId: member.id,
      createdAt: now
    });

    return {
      success: true,
      message: 'Member approved successfully.',
      workerCode: workerRecord?.workerIdCode
    };
  }

  /**
   * Reject Member Registration
   */
  public static rejectMember(
    userId: string,
    adminId: string,
    adminName: string,
    reason: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const member = db.members.find(m => m.userId === userId);
    if (!member) throw new Error('Member profile not found.');

    // Branch isolation enforcement
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (member.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only reject registrations belonging to your assigned branch.');
      }
    }

    const prevState = { accountStatus: user.accountStatus };
    const now = new Date().toISOString();

    user.accountStatus = 'rejected';
    user.rejectionReason = reason;
    user.updatedAt = now;

    AuditService.log(
      adminName,
      'admin',
      'MEMBER_REJECTED',
      'user',
      userId,
      adminId,
      prevState,
      { accountStatus: 'rejected', reason }
    );
    persistUser(user).catch(() => {});

    if (member) {
      db.notifications.unshift({
        id: uuidv4(),
        title: 'Registration Application Update',
        body: `Your registration could not be approved at this time: ${reason}`,
        notificationType: 'registration_rejected',
        targetScope: 'specific_member',
        targetId: member.id,
        createdAt: now
      });
    }

    return { success: true, message: 'Member registration rejected.' };
  }

  /**
   * Request Changes on Registration
   */
  public static requestChanges(
    userId: string,
    adminId: string,
    adminName: string,
    notes: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const member = db.members.find(m => m.userId === userId);
    if (!member) throw new Error('Member profile not found.');

    // Branch isolation enforcement
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (member.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only request changes for members belonging to your assigned branch.');
      }
    }

    const prevState = { requestChangesNotes: user.requestChangesNotes };
    const now = new Date().toISOString();

    user.requestChangesNotes = notes;
    user.updatedAt = now;
    persistUser(user).catch(() => {});

    AuditService.log(
      adminName,
      'admin',
      'MEMBER_CHANGES_REQUESTED',
      'user',
      userId,
      adminId,
      prevState,
      { notes }
    );

    if (member) {
      db.notifications.unshift({
        id: uuidv4(),
        title: 'Registration Update Needed',
        body: `Please review and update your information: ${notes}`,
        notificationType: 'registration_changes_requested',
        targetScope: 'specific_member',
        targetId: member.id,
        createdAt: now
      });
    }

    return { success: true, message: 'Changes requested from member.' };
  }

  /**
   * Query Member Directory with Granular Filter Parameters
   */
  public static listMembers(params: {
    branchId?: string;
    roleId?: string;
    departmentId?: string;
    status?: AccountStatus;
    search?: string;
  }) {
    let result = db.members.map(m => {
      const u = db.users.find(user => user.id === m.userId);
      const b = db.branches.find(branch => branch.id === m.primaryBranchId);
      const r = db.ministryRoles.find(role => role.id === m.primaryRoleId);
      const w = m.isWorker ? db.workers.find(worker => worker.memberId === m.id) : undefined;
      const d = w ? db.departments.find(dept => dept.id === w.departmentId) : undefined;

      return {
        id: m.id,
        userId: m.userId,
        fullName: `${m.firstName} ${m.middleName ? m.middleName + ' ' : ''}${m.lastName}`,
        firstName: m.firstName,
        middleName: m.middleName,
        lastName: m.lastName,
        email: u?.email || '',
        phone: u?.phone || '',
        gender: m.gender,
        dateOfBirth: m.dateOfBirth,
        address: m.residentialAddress,
        profilePictureUrl: m.profilePictureUrl,
        emergencyContactName: m.emergencyContactName,
        emergencyContactPhone: m.emergencyContactPhone,
        accountStatus: u?.accountStatus || 'active',
        branchId: m.primaryBranchId,
        branchName: b?.name || 'HQ',
        roleId: m.primaryRoleId,
        roleName: r?.name || 'Member',
        roleCode: r?.code || 'MEMBER',
        isWorker: m.isWorker,
        workerDetails: w ? {
          workerId: w.id,
          workerCode: w.workerIdCode,
          departmentId: w.departmentId,
          departmentName: d?.name || 'Unassigned',
          positionName: w.positionName,
          status: w.workerStatus,
          dateStartedServing: w.dateStartedServing,
          qrCodeToken: w.qrCodeToken
        } : undefined,
        registeredAt: u?.createdAt,
        approvedAt: m.approvedAt
      };
    });

    if (params.status) {
      result = result.filter(m => m.accountStatus === params.status);
    }
    if (params.branchId) {
      result = result.filter(m => m.branchId === params.branchId);
    }
    if (params.roleId) {
      result = result.filter(m => m.roleId === params.roleId);
    }
    if (params.departmentId) {
      result = result.filter(m => m.workerDetails?.departmentId === params.departmentId);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      result = result.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        (m.workerDetails && m.workerDetails.workerCode.toLowerCase().includes(q))
      );
    }

    return result;
  }

  /**
   * Update Member Account Status (Suspend, Activate, Archive)
   */
  public static updateAccountStatus(
    userId: string,
    newStatus: AccountStatus,
    adminId: string,
    adminName: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    if (userId === adminId && newStatus !== 'active') {
      throw new Error('Administrators cannot suspend or deactivate their own account.');
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    const member = db.members.find(m => m.userId === userId);
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (member && member.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only update member status within your assigned branch.');
      }
    }

    const prevState = { accountStatus: user.accountStatus };
    user.accountStatus = newStatus;
    user.updatedAt = new Date().toISOString();
    persistUser(user).catch(() => {});

    AuditService.log(
      adminName,
      'admin',
      `MEMBER_STATUS_${newStatus.toUpperCase()}`,
      'user',
      userId,
      adminId,
      prevState,
      { accountStatus: newStatus }
    );

    return { success: true, accountStatus: newStatus };
  }

  /**
   * Update Member Church Details (Branch, Role, Department)
   */
  public static updateChurchAssignment(
    memberId: string,
    data: { branchId?: string; roleId?: string; departmentId?: string; positionName?: string; isWorker?: boolean },
    adminId: string,
    adminName: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    const member = db.members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found.');

    // Branch isolation and privilege escalation enforcement
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (member.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only reassign members within your assigned branch.');
      }
      if (data.branchId && data.branchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: Branch administrators cannot transfer members outside their assigned branch.');
      }
      if (data.roleId) {
        const targetRole = db.ministryRoles.find(r => r.id === data.roleId);
        if (targetRole && (targetRole.code === 'SUPER_ADMIN' || targetRole.code === 'BRANCH_PASTOR' || targetRole.hierarchyLevel <= 2)) {
          throw new Error('Privilege escalation violation: Branch administrators cannot assign Super Admin or Branch Pastor roles.');
        }
      }
    }

    const prevState = {
      branchId: member.primaryBranchId,
      roleId: member.primaryRoleId,
      isWorker: member.isWorker
    };

    if (data.branchId) member.primaryBranchId = data.branchId;
    if (data.roleId) member.primaryRoleId = data.roleId;

    // Worker Onboarding: If transitioning to worker or assigned a department, provision Worker profile
    const targetRole = data.roleId ? db.ministryRoles.find(r => r.id === data.roleId) : undefined;
    const shouldBeWorker = data.isWorker === true || (targetRole && (targetRole.code === 'WORKER' || targetRole.code === 'HOD')) || !!data.departmentId;

    let workerRecord = db.workers.find(w => w.memberId === member.id);

    if (shouldBeWorker && !member.isWorker) {
      member.isWorker = true;
      if (!workerRecord) {
        const workerCode = db.getNextWorkerCode();
        const effectiveDeptId = data.departmentId || db.departments.find(d => d.branchId === member.primaryBranchId)?.id || db.departments[0].id;
        workerRecord = {
          id: uuidv4(),
          memberId: member.id,
          workerIdCode: workerCode,
          pinHash: bcrypt.hashSync('1234', 10),
          departmentId: effectiveDeptId,
          positionName: data.positionName || 'Worker',
          dateStartedServing: new Date().toISOString().split('T')[0],
          workerStatus: 'active',
          qrCodeToken: `FPM-QR-${workerCode}-${uuidv4().substring(0, 8)}`,
          biometricEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.workers.push(workerRecord);
        persistWorker(workerRecord).catch(() => {});
      }
    } else if (member.isWorker && workerRecord) {
      if (data.departmentId) workerRecord.departmentId = data.departmentId;
      if (data.positionName) workerRecord.positionName = data.positionName;
      workerRecord.updatedAt = new Date().toISOString();
      persistWorker(workerRecord).catch(() => {});
    }

    member.updatedAt = new Date().toISOString();
    persistMember(member).catch(() => {});

    AuditService.log(
      adminName,
      'admin',
      'MEMBER_ASSIGNMENT_UPDATED',
      'member',
      memberId,
      adminId,
      prevState,
      {
        ...data,
        isWorker: member.isWorker,
        workerCode: workerRecord?.workerIdCode
      }
    );

    return { 
      success: true, 
      member, 
      workerCode: workerRecord?.workerIdCode,
      workerId: workerRecord?.id
    };
  }

  /**
   * Directly Enroll / Create New Member (Admin & Pastoral Dashboard)
   */
  public static createMember(
    data: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      phone: string;
      gender?: 'Male' | 'Female' | 'Other';
      dateOfBirth?: string;
      residentialAddress?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      profilePictureUrl?: string;
      primaryBranchId: string;
      primaryRoleId?: string;
      departmentId?: string;
      positionName?: string;
      isWorker?: boolean;
      status?: AccountStatus;
      password?: string;
    },
    adminId: string,
    adminName: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ) {
    if (!data.firstName || !data.lastName) {
      throw new Error('First name and last name are required.');
    }
    if (!data.email || !data.phone) {
      throw new Error('Email address and phone number are required.');
    }
    if (!data.primaryBranchId) {
      throw new Error('Church branch selection is required.');
    }

    // Branch isolation check
    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (data.primaryBranchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only add members to your assigned branch.');
      }
    }

    // Check unique email and phone
    const normalizedEmail = data.email.toLowerCase().trim();
    if (db.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A user with this email address already exists.');
    }
    if (db.users.some(u => u.phone === data.phone.trim())) {
      throw new Error('A user with this phone number already exists.');
    }

    // Resolve Role
    const defaultRole = db.ministryRoles.find(r => r.code === 'MEMBER') || db.ministryRoles[0];
    const roleId = data.primaryRoleId || defaultRole.id;
    const role = db.ministryRoles.find(r => r.id === roleId) || defaultRole;
    const isWorker = data.isWorker !== undefined ? data.isWorker : (role.code !== 'MEMBER');

    const now = new Date().toISOString();
    const userId = uuidv4();
    const memberId = uuidv4();
    const accountStatus: AccountStatus = data.status || 'active';

    // 1. Create User
    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      phone: data.phone.trim(),
      passwordHash: bcrypt.hashSync(data.password || 'Password123!', 10),
      accountStatus,
      isAdmin: false,
      adminLevel: 'none',
      createdAt: now,
      updatedAt: now
    };
    db.users.push(newUser);
    persistUser(newUser).catch(() => {});

    // 2. Create Member
    const newMember: Member = {
      id: memberId,
      userId,
      primaryBranchId: data.primaryBranchId,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || undefined,
      lastName: data.lastName.trim(),
      gender: data.gender || 'Male',
      dateOfBirth: data.dateOfBirth || undefined,
      residentialAddress: data.residentialAddress || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactPhone: data.emergencyContactPhone || undefined,
      profilePictureUrl: data.profilePictureUrl || undefined,
      primaryRoleId: roleId,
      isWorker,
      approvedBy: accountStatus === 'active' ? adminId : undefined,
      approvedAt: accountStatus === 'active' ? now : undefined,
      createdAt: now,
      updatedAt: now
    };
    db.members.push(newMember);
    persistMember(newMember).catch(() => {});

    // 3. If worker, provision worker profile
    let workerRecord: Worker | undefined;
    if (isWorker) {
      const workerCode = db.getNextWorkerCode();
      const deptId = data.departmentId || (db.departments.find(d => d.branchId === data.primaryBranchId) || db.departments[0])?.id;

      workerRecord = {
        id: uuidv4(),
        memberId,
        workerIdCode: workerCode,
        pinHash: bcrypt.hashSync('1234', 10),
        departmentId: deptId || db.departments[0]?.id || '',
        positionName: data.positionName || 'Member of Department',
        dateStartedServing: now.split('T')[0],
        workerStatus: 'active',
        qrCodeToken: `FPM-QR-${workerCode}-${uuidv4().substring(0, 8)}`,
        biometricEnabled: true,
        createdAt: now,
        updatedAt: now
      };
      db.workers.push(workerRecord);
      persistWorker(workerRecord).catch(() => {});
    }

    // 4. Audit Log
    AuditService.log(
      adminName,
      'admin',
      'MEMBER_ENROLLED',
      'user',
      userId,
      adminId,
      null,
      {
        fullName: `${newMember.firstName} ${newMember.lastName}`,
        email: newUser.email,
        branchId: newMember.primaryBranchId,
        roleId: newMember.primaryRoleId,
        isWorker,
        workerCode: workerRecord?.workerIdCode
      }
    );

    const b = db.branches.find(branch => branch.id === newMember.primaryBranchId);
    const d = workerRecord ? db.departments.find(dept => dept.id === workerRecord?.departmentId) : undefined;

    return {
      id: memberId,
      userId,
      fullName: `${newMember.firstName} ${newMember.middleName ? newMember.middleName + ' ' : ''}${newMember.lastName}`,
      firstName: newMember.firstName,
      middleName: newMember.middleName,
      lastName: newMember.lastName,
      email: newUser.email,
      phone: newUser.phone,
      gender: newMember.gender,
      dateOfBirth: newMember.dateOfBirth,
      address: newMember.residentialAddress,
      profilePictureUrl: newMember.profilePictureUrl,
      accountStatus: newUser.accountStatus,
      branchId: newMember.primaryBranchId,
      branchName: b?.name || 'Headquarters',
      roleId: newMember.primaryRoleId,
      roleName: role?.name || 'Member',
      roleCode: role?.code || 'MEMBER',
      isWorker: newMember.isWorker,
      workerDetails: workerRecord ? {
        workerId: workerRecord.id,
        workerCode: workerRecord.workerIdCode,
        departmentId: workerRecord.departmentId,
        departmentName: d?.name || 'Unassigned',
        positionName: workerRecord.positionName,
        status: workerRecord.workerStatus,
        dateStartedServing: workerRecord.dateStartedServing,
        qrCodeToken: workerRecord.qrCodeToken
      } : undefined,
      registeredAt: newUser.createdAt,
      approvedAt: newMember.approvedAt
    };
  }
}


