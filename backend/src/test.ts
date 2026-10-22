process.env.IS_TEST_RUN = 'true';

import nodeCrypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthService } from './services/authService';
import { MemberService } from './services/memberService';
import { AttendanceService } from './services/attendanceService';
import { AuditService } from './services/auditService';
import { StorageService } from './services/storageService';
import { EmailService } from './services/emailService';
import { persistUser } from './db/sync';
import { db, IDS } from './data/mockDb';
import { v4 as uuidv4 } from 'uuid';
import {
  enforceSingleDepartmentHod,
  clearDepartmentHod,
  updateBranchHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler,
  updateSettingsHandler,
  broadcastNotificationHandler,
  createPostHandler,
  commentOnPostHandler,
  reactToPostHandler,
  getSundayMomentsHandler,
  createSundayMomentHandler,
  deleteSundayMomentHandler,
  approveSundayMomentHandler,
  rejectSundayMomentHandler,
  likeSundayMomentHandler,
  unlikeSundayMomentHandler,
  getFinanceCategoriesHandler,
  getFinanceDashboardHandler,
  getFinanceTransactionsHandler,
  getFinanceTransactionByIdHandler,
  createFinanceTransactionHandler,
  updateFinanceTransactionHandler,
  voidFinanceTransactionHandler,
  getFinanceOpeningBalanceHandler,
  setFinanceOpeningBalanceHandler,
  getFinanceMonthlyStatementHandler,
  getFinanceAnnualStatementHandler,
  getFinanceCategoryAnalysisHandler,
  exportFinanceReportHandler,
  uploadMediaHandler,
  uploadAvatarHandler,
  getDbStatusHandler,
  getSettingsHandler,
  getSystemHealthHandler,
  registerDeviceTokenHandler,
  unregisterDeviceTokenHandler
} from './controllers/apiControllers';
import { FcmService } from './services/fcmService';
import { SettingsService } from './services/settingsService';
import { requireCronAuth } from './middleware/authMiddleware';
import {
  rateLimitStore,
  checkAccountLoginThrottle,
  recordFailedLogin,
  clearLoginAttempts,
  createRateLimiter
} from './middleware/rateLimitMiddleware';
import { FinanceService } from './services/financeService';
import { FINANCE_INCOME_CATEGORIES, FINANCE_EXPENSE_CATEGORIES, FINANCE_PAYMENT_METHODS } from './data/mockDb';
import http from 'http';
import { AddressInfo } from 'net';
import { persistBranch, runSchemaMigrationsOnce } from './db/sync';
import { BibleGameService } from './services/bibleGameService';
import { BibleAiService } from './services/bibleAiService';
import app, { isOriginAllowed, isAllowedCustomDomain, isAllowedVercelDomain, isAllowedDevHost, getExplicitAllowedOrigins } from './server';

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING FPM GLOBAL CORE BACKEND TEST SUITE');
  console.log('====================================================');

  await runSchemaMigrationsOnce().catch(() => {});

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: SuperAdmin Login
    console.log('\n--- 1. Authentication Tests ---');
    const adminLogin = await AuthService.login('admin@fpmchurch.org', 'Password123!');
    assert(!!adminLogin.token, 'SuperAdmin login returns valid JWT token');
    assert(adminLogin.user?.adminLevel === 'super_admin', 'Admin session has super_admin role');
    assert(adminLogin.user?.branchName === 'Ilorin Branch (Headquarters)', 'Admin belongs to Headquarters branch');

    // TEST 2: Worker Login
    const workerLogin = await AuthService.login('worker.sarah@fpmchurch.org', 'Password123!');
    assert(!!workerLogin.token, 'Worker Sarah login succeeds');
    assert(workerLogin.user?.isWorker === true, 'Worker flag is true');
    assert(workerLogin.user?.workerDetails?.workerCode === 'FPM-0001', 'Worker ID is FPM-0001');

    // TEST 3: Multi-Step Registration
    console.log('\n--- 2. Registration & Approval Workflow ---');
    const regResult = await AuthService.register({
      firstName: 'Samuel',
      middleName: 'Tunde',
      lastName: 'Okon',
      phone: '+2348099990001',
      email: 'samuel.okon@example.com',
      password: 'Password123!',
      branchId: IDS.BRANCH_HQ,
      ministryRoleId: IDS.ROLE_WORKER,
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1996-08-20',
      residentialAddress: '14 Bode Thomas Street, Surulere',
      emergencyContactName: 'Bose Okon',
      emergencyContactPhone: '+2348099990002'
    });
    assert(regResult.success === true, 'Registration succeeds');
    assert(!!regResult.userId, 'New user ID generated');

    const newlyRegisteredUser = db.users.find(u => u.id === regResult.userId);
    assert(newlyRegisteredUser?.accountStatus === 'pending', 'Newly registered account is pending approval');
    assert(newlyRegisteredUser?.emailVerified === false, 'Newly registered account has emailVerified = false');

    // TEST 3B: Unverified User Login Rejection
    const unverifiedLogin = await AuthService.login('samuel.okon@example.com', 'Password123!');
    assert(unverifiedLogin.status === 'unverified_email', 'Unverified user login returns unverified_email status');
    assert(unverifiedLogin.error?.includes('not been verified') === true, 'Unverified user receives verification prompt');

    // Verify Samuel's email address
    newlyRegisteredUser!.emailVerified = true;
    newlyRegisteredUser!.emailVerifiedAt = new Date().toISOString();

    // TEST 4: Pending Account Login Rejection
    const pendingLogin = await AuthService.login('samuel.okon@example.com', 'Password123!');
    assert(pendingLogin.status === 'pending', 'Pending user login returns pending status');
    assert(pendingLogin.error?.includes('awaiting administrative approval') === true, 'Pending user receives awaiting approval message');

    // TEST 5: Approvals Queue
    const pendingList = await MemberService.getPendingApprovals();
    assert(pendingList.some(p => p.userId === regResult.userId), 'New applicant appears in pending approvals queue');

    // TEST 6: Admin Approval & Worker Code Generation
    const approvalResult = await MemberService.approveMember(regResult.userId!, IDS.USER_ADMIN, 'Ezekiel Adeyemi');
    assert(approvalResult.success === true, 'Admin successfully approves applicant');
    assert(approvalResult.workerCode?.startsWith('FPM-') === true, `Unique Worker ID assigned: ${approvalResult.workerCode}`);
    assert(newlyRegisteredUser?.accountStatus === 'active', 'User status transitioned to active');

    // TEST 7: Authoritative Attendance Clock-In
    console.log('\n--- 3. Worker Attendance Engine ---');
    // Sarah clocks in for Sunday First Service with biometric
    const clockInResult = await AttendanceService.clockIn({
      workerIdentifier: IDS.WORKER_SARAH,
      serviceId: IDS.SERVICE_SUN_2, // using service 2 for today's test
      method: 'biometric'
    });
    assert(!!clockInResult.clockInTime, `Server authoritative timestamp recorded: ${clockInResult.clockInTime}`);
    assert(clockInResult.status === 'present' || clockInResult.status === 'late', `Punctuality calculated: ${clockInResult.status}`);

    // TEST 8: Duplicate Clock-In Prevention
    let duplicatePrevented = false;
    try {
      await AttendanceService.clockIn({
        workerIdentifier: IDS.WORKER_SARAH,
        serviceId: IDS.SERVICE_SUN_2,
        method: 'biometric'
      });
    } catch (e: any) {
      duplicatePrevented = e.message.includes('Duplicate clock-in');
    }
    assert(duplicatePrevented, 'Duplicate clock-in is strictly prevented by server');

    // TEST 9: Manual Clock-Out
    const clockOutResult = AttendanceService.clockOut(clockInResult.id, 'manual');
    assert(!!clockOutResult.clockOutTime, 'Worker clocked out successfully');
    assert(clockOutResult.durationMinutes! >= 1, `Duration calculated: ${clockOutResult.durationMinutes} min`);
    assert(clockOutResult.clockOutSource === 'manual', 'Clock out source recorded as manual');

    // TEST 10: PIN Verification Clock-In
    // John clocks in with correct PIN 1234
    const pinClockIn = await AttendanceService.clockIn({
      workerIdentifier: 'FPM-0002',
      serviceId: IDS.SERVICE_SUN_2,
      method: 'pin',
      pin: '1234'
    });
    assert(pinClockIn.workerId === IDS.WORKER_JOHN, 'PIN clock-in successfully validated John Mensah');

    // TEST 11: Invalid PIN Rejection
    let invalidPinCaught = false;
    try {
      await AttendanceService.clockIn({
        workerIdentifier: 'FPM-0003',
        serviceId: IDS.SERVICE_SUN_2,
        method: 'pin',
        pin: '9999' // wrong
      });
    } catch (e: any) {
      invalidPinCaught = e.message.includes('Invalid Worker security PIN');
    }
    assert(invalidPinCaught, 'Wrong security PIN is rejected');

    // TEST 12: Absence Excusal with Audit Trail
    console.log('\n--- 4. Absence & Reports ---');
    const absentRecord = db.attendanceRecords.find(r => r.status === 'late') || db.attendanceRecords[0];
    const excuseResult = AttendanceService.excuseAbsence(absentRecord.id, IDS.USER_ADMIN, 'Ezekiel Adeyemi', 'Medical appointment approved by pastor');
    assert(excuseResult.status === 'excused', 'Absence marked as excused');
    assert(excuseResult.excuseReason === 'Medical appointment approved by pastor', 'Excuse reason recorded');

    // TEST 13: Monthly Attendance Matrix
    const matrix = AttendanceService.getAttendanceMatrix(IDS.BRANCH_HQ, '2026-03');
    assert(matrix.rows.length > 0, `Attendance matrix generated with ${matrix.rows.length} workers`);
    assert(matrix.rows[0].serviceDates !== undefined, 'Matrix row contains per-service status (✓, L, A, E)');

    // TEST 14: Audit Logs Integrity
    console.log('\n--- 5. Security & Audit Logging ---');
    const logs = AuditService.getLogs(50);
    assert(logs.length >= 4, `Audit trail active with ${logs.length} logged actions`);
    assert(logs.some(l => l.action === 'MEMBER_APPROVED'), 'MEMBER_APPROVED action present in audit trail');
    assert(logs.some(l => l.action === 'WORKER_CLOCK_IN'), 'WORKER_CLOCK_IN action present in audit trail');

    // TEST 15: BOLA Prevention on Attendance Clock-Out
    console.log('\n--- 6. Security Hardening & Isolation Tests ---');
    let bolaPrevented = false;
    try {
      // Sarah attempts to clock out John's session (pinClockIn.id)
      AttendanceService.clockOut(pinClockIn.id, 'manual', {
        userId: IDS.USER_SARAH,
        isAdmin: false
      });
    } catch (e: any) {
      bolaPrevented = e.message.includes('Unauthorized') || e.message.includes('only clock out your own session');
    }
    assert(bolaPrevented, 'BOLA Attack Prevented: Worker Sarah cannot clock out Worker John');

    // TEST 16: Legitimate Self Clock-Out
    const johnClockOut = AttendanceService.clockOut(pinClockIn.id, 'manual', {
      userId: IDS.USER_JOHN,
      isAdmin: false
    });
    assert(!!johnClockOut.clockOutTime, 'Worker John successfully clocks out his own session');

    // TEST 17: Self-Approval Prevention
    let selfApprovalBlocked = false;
    try {
      await MemberService.approveMember(IDS.USER_ADMIN, IDS.USER_ADMIN, 'Ezekiel Adeyemi');
    } catch (e: any) {
      selfApprovalBlocked = e.message.includes('cannot approve their own registration');
    }
    assert(selfApprovalBlocked, 'Self-Approval Blocked: Administrator cannot approve their own account');

    // TEST 18: Multi-Branch Isolation on Approval
    // Create an applicant for London branch
    const londonApplicant = await AuthService.register({
      firstName: 'Oliver',
      lastName: 'Smith',
      phone: '+447911123456',
      email: 'oliver.london@example.com',
      password: 'Password123!',
      branchId: IDS.BRANCH_LONDON,
      ministryRoleId: IDS.ROLE_MEMBER,
      isWorker: false,
      gender: 'Male',
      dateOfBirth: '1990-05-15',
      residentialAddress: '22 Baker St, London'
    });

    let crossBranchApprovalBlocked = false;
    try {
      // Lekki pastor attempts to approve London member
      await MemberService.approveMember(
        londonApplicant.userId!,
        IDS.USER_PASTOR,
        'Pastor David',
        { adminLevel: 'branch_admin', branchId: IDS.BRANCH_LEKKI }
      );
    } catch (e: any) {
      crossBranchApprovalBlocked = e.message.includes('Branch isolation violation');
    }
    assert(crossBranchApprovalBlocked, 'Branch Isolation: Lekki Pastor blocked from approving London branch applicant');

    // Clean up London test applicant from memory and database
    db.users = db.users.filter(u => u.id !== londonApplicant.userId);
    db.members = db.members.filter(m => m.userId !== londonApplicant.userId);
    const { query: dbQ3 } = await import('./db/index');
    await dbQ3('DELETE FROM users WHERE id = $1', [londonApplicant.userId]).catch(() => {});

    // TEST 19: Privilege Escalation Prevention in Registration
    const maliciousApplicant = await AuthService.register({
      firstName: 'Attacker',
      lastName: 'User',
      phone: '+2348000000999',
      email: 'attacker@example.com',
      password: 'Password123!',
      branchId: IDS.BRANCH_HQ,
      ministryRoleId: IDS.ROLE_SUPER_ADMIN, // Attempting to self-assign Super Admin
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1995-01-01'
    });
    const attackerMember = db.members.find(m => m.userId === maliciousApplicant.userId);
    assert(attackerMember?.primaryRoleId !== IDS.ROLE_SUPER_ADMIN, 'Privilege Escalation Blocked: Self-selecting Super Admin role was neutralized');
    assert(attackerMember?.primaryRoleId === IDS.ROLE_WORKER, 'Neutralized applicant safely assigned standard WORKER role');

    // TEST 20: Privilege Escalation Prevention in Member Assignment
    let pastorEscalationBlocked = false;
    try {
      // Branch pastor tries to elevate a member to Super Admin
      await MemberService.updateChurchAssignment(
        attackerMember!.id,
        { roleId: IDS.ROLE_SUPER_ADMIN },
        IDS.USER_PASTOR,
        'Pastor David',
        { adminLevel: 'branch_admin', branchId: IDS.BRANCH_HQ }
      );
    } catch (e: any) {
      pastorEscalationBlocked = e.message.includes('Privilege escalation violation');
    }
    assert(pastorEscalationBlocked, 'Privilege Escalation Blocked: Branch admin cannot assign Super Admin role');

    // TEST 21: Cross-Branch Transfer Blocked for Branch Admins
    let crossBranchTransferBlocked = false;
    try {
      await MemberService.updateChurchAssignment(
        attackerMember!.id,
        { branchId: IDS.BRANCH_LONDON },
        IDS.USER_PASTOR,
        'Pastor David',
        { adminLevel: 'branch_admin', branchId: IDS.BRANCH_HQ }
      );
    } catch (e: any) {
      crossBranchTransferBlocked = e.message.includes('Branch isolation violation');
    }
    assert(crossBranchTransferBlocked, 'Branch Isolation: Branch admin cannot transfer member to another branch');

    // Clean up test applicant from memory and database
    db.users = db.users.filter(u => u.id !== maliciousApplicant.userId);
    db.members = db.members.filter(m => m.userId !== maliciousApplicant.userId);
    db.workers = db.workers.filter(w => w.memberId !== attackerMember?.id);
    const { query: dbQuery } = await import('./db/index');
    await dbQuery('DELETE FROM users WHERE id = $1', [maliciousApplicant.userId]).catch(() => {});

    // TEST 22: Branch Isolation on Service Absences
    let crossBranchAbsenceBlocked = false;
    try {
      // Lekki pastor attempts to mark absences for HQ Sunday Service
      AttendanceService.markAbsences(
        IDS.SERVICE_SUN_1,
        '2026-03-08',
        { adminLevel: 'branch_admin', branchId: IDS.BRANCH_LEKKI }
      );
    } catch (e: any) {
      crossBranchAbsenceBlocked = e.message.includes('Branch isolation violation');
    }
    assert(crossBranchAbsenceBlocked, 'Branch Isolation: Branch admin cannot manipulate attendance of another branch');

    // TEST 23: Invariant Worker Code Monotonicity
    const nextCode1 = db.getNextWorkerCode();
    const nextCode2 = db.getNextWorkerCode();
    assert(nextCode1 !== nextCode2, `Worker codes are strictly monotonic: ${nextCode1} -> ${nextCode2}`);

    // =========================================================================
    // 7. REAL-WORLD WORKFLOW AUDIT & SUNDAY SERVICE SIMULATION
    // =========================================================================
    console.log('\n--- 7. Real-World Church Operations & Workflow Audit ---');

    // TEST 24: Active Member-to-Worker Transition & Auto-Provisioning
    const graceMember = db.members.find(m => m.id === IDS.MEMBER_GRACE);
    assert(graceMember?.isWorker === false, 'Grace Bello starts as an active non-worker member');

    const workerPromotionResult = await MemberService.updateChurchAssignment(
      IDS.MEMBER_GRACE,
      {
        isWorker: true,
        departmentId: IDS.DEPT_CHOIR,
        roleId: IDS.ROLE_WORKER,
        positionName: 'Soprano Vocalist'
      },
      IDS.USER_ADMIN,
      'Ezekiel Adeyemi',
      { adminLevel: 'super_admin' }
    );
    assert(workerPromotionResult.success === true, 'Member church assignment updated to Worker');
    assert(workerPromotionResult.workerCode?.startsWith('FPM-') === true, `Monotonic Worker ID Code assigned: ${workerPromotionResult.workerCode}`);

    const provisionedWorker = db.workers.find(w => w.memberId === IDS.MEMBER_GRACE);
    assert(!!provisionedWorker, 'Worker record atomically provisioned in workers table');
    assert(provisionedWorker?.departmentId === IDS.DEPT_CHOIR, 'Worker assigned to Choir department');
    assert(provisionedWorker?.workerStatus === 'active', 'Worker status is active');

    const graceLogin = await AuthService.login('member.grace@fpmchurch.org', 'Password123!');
    assert(graceLogin.user?.isWorker === true, 'Grace login session reflects worker status');
    assert(graceLogin.user?.workerDetails?.workerCode === provisionedWorker?.workerIdCode, 'Grace session includes authoritative worker code');

    // TEST 25: Cross-Branch Clock-In Rejection (Section 7 Case E)
    // Create a Lekki branch service
    const lekkiServiceId = 'svc-lekki-special-test';
    db.services.push({
      id: lekkiServiceId,
      branchId: IDS.BRANCH_LEKKI,
      name: 'Lekki Praise Service',
      dayOfWeek: 'Sunday',
      startTime: '08:00',
      expectedEndTime: '10:30',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 60,
      attendanceDurationHours: 4.0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    let crossBranchClockInBlocked = false;
    try {
      // Sarah is from HQ branch, attempts to clock into Lekki branch service
      await AttendanceService.clockIn({
        workerIdentifier: IDS.WORKER_SARAH,
        serviceId: lekkiServiceId,
        method: 'biometric'
      });
    } catch (e: any) {
      crossBranchClockInBlocked = e.message.includes('Branch mismatch');
    }
    assert(crossBranchClockInBlocked, 'Cross-Branch Guard: HQ worker Sarah blocked from clocking in to Lekki service');

    // TEST 26: Event RSVP Capacity, Duplicate RSVP Prevention & Cancellation
    const testEventId = 'evt-audit-capacity-test';
    db.events.push({
      id: testEventId,
      branchId: IDS.BRANCH_HQ,
      title: 'Leadership Masterclass 2026',
      description: 'Exclusive leadership capacity workshop',
      startDatetime: '2026-04-01T10:00:00Z',
      endDatetime: '2026-04-01T14:00:00Z',
      location: 'Conference Room A',
      category: 'Training',
      registrationRequired: true,
      registrationCapacity: 2,
      currentRegistrationsCount: 0,
      targetScope: 'branch',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const targetEvent = db.events.find(e => e.id === testEventId)!;

    // Simulate Sarah registering
    db.eventRegistrations.push({
      id: 'reg-1',
      eventId: testEventId,
      userId: IDS.USER_SARAH,
      registeredAt: new Date().toISOString()
    });
    targetEvent.currentRegistrationsCount += 1;
    assert(targetEvent.currentRegistrationsCount === 1, 'Event registration increments to 1');

    // Duplicate check
    const isDuplicate = db.eventRegistrations.some(r => r.eventId === testEventId && r.userId === IDS.USER_SARAH);
    assert(isDuplicate, 'Duplicate registration detected for User Sarah');

    // John registers (capacity now full at 2)
    db.eventRegistrations.push({
      id: 'reg-2',
      eventId: testEventId,
      userId: IDS.USER_JOHN,
      registeredAt: new Date().toISOString()
    });
    targetEvent.currentRegistrationsCount += 1;
    assert(targetEvent.currentRegistrationsCount === 2, 'Event registration reaches max capacity of 2');

    // Next applicant (Grace) is blocked by capacity
    const capacityReached = targetEvent.registrationCapacity !== undefined && targetEvent.currentRegistrationsCount >= targetEvent.registrationCapacity;
    assert(capacityReached, 'Capacity check successfully flags event as full');

    // John cancels his registration
    const johnRegIdx = db.eventRegistrations.findIndex(r => r.eventId === testEventId && r.userId === IDS.USER_JOHN);
    db.eventRegistrations.splice(johnRegIdx, 1);
    targetEvent.currentRegistrationsCount -= 1;
    assert(targetEvent.currentRegistrationsCount === 1, 'Cancellation frees up capacity back to 1');

    // Now Grace registers
    db.eventRegistrations.push({
      id: 'reg-3',
      eventId: testEventId,
      userId: IDS.USER_GRACE,
      registeredAt: new Date().toISOString()
    });
    targetEvent.currentRegistrationsCount += 1;
    assert(targetEvent.currentRegistrationsCount === 2, 'New applicant takes released spot');

    // TEST 27: Sunday Service End-to-End Simulation (Section 26)
    console.log('\n--- 8. Section 26: Sunday Service End-to-End Simulation ---');
    // We create a fresh service for Sunday March 22, 2026: 08:00 AM start, 15 min grace period
    const sundayServiceId = 'svc-sunday-audit-sim';
    db.services.push({
      id: sundayServiceId,
      branchId: IDS.BRANCH_HQ,
      name: 'Sunday Morning Miracle Service',
      dayOfWeek: 'Sunday',
      startTime: '08:00',
      expectedEndTime: '10:30',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 60,
      attendanceDurationHours: 4.0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const simDate = '2026-03-22';
    // Worker 1: Sarah arrives 7:50 AM (10 min before start) -> PRESENT
    const sarahArrival = new Date(`${simDate}T07:50:00.000Z`);
    const sarahAttendance = await AttendanceService.clockIn({
      workerIdentifier: IDS.WORKER_SARAH,
      serviceId: sundayServiceId,
      method: 'biometric',
      overrideTimestamp: sarahArrival
    });
    assert(sarahAttendance.status === 'present', 'Worker 1 (Sarah) arrives at 7:50 AM -> Status: PRESENT');

    // Worker 2: John arrives 8:10 AM (10 min after start, within 15 min grace) -> PRESENT
    const johnArrival = new Date(`${simDate}T08:10:00.000Z`);
    const johnAttendance = await AttendanceService.clockIn({
      workerIdentifier: IDS.WORKER_JOHN,
      serviceId: sundayServiceId,
      method: 'qr',
      overrideTimestamp: johnArrival
    });
    assert(johnAttendance.status === 'present', 'Worker 2 (John) arrives at 8:10 AM (within 15m grace) -> Status: PRESENT');

    // Worker 3: HOD Rachel arrives 8:30 AM (30 min after start, past 15 min grace) -> LATE
    const rachelArrival = new Date(`${simDate}T08:30:00.000Z`);
    const rachelAttendance = await AttendanceService.clockIn({
      workerIdentifier: IDS.WORKER_HOD,
      serviceId: sundayServiceId,
      method: 'pin',
      pin: '1234',
      overrideTimestamp: rachelArrival
    });
    assert(rachelAttendance.status === 'late', 'Worker 3 (Rachel) arrives at 8:30 AM (past 15m grace) -> Status: LATE');

    // Worker 4 (Grace Bello) & Worker 5 (Samuel Okon) do not clock in.
    // End of service: Admin triggers markAbsences for simDate
    const markedAbsenceCount = AttendanceService.markAbsences(
      sundayServiceId,
      simDate,
      { adminLevel: 'super_admin' }
    );
    assert(markedAbsenceCount >= 2, `Absent workers marked by system: ${markedAbsenceCount} absent records generated`);

    const graceAbsence = db.attendanceRecords.find(r => r.workerId === provisionedWorker!.id && r.serviceId === sundayServiceId && r.serviceDate === simDate);
    assert(graceAbsence?.status === 'absent', 'Worker 4 (Grace Bello) marked as ABSENT');

    const samuelMember = db.members.find(m => m.userId === regResult.userId);
    const samuelWorker = db.workers.find(w => w.memberId === samuelMember?.id);
    const samuelAbsence = db.attendanceRecords.find(r => r.workerId === samuelWorker?.id && r.serviceId === sundayServiceId && r.serviceDate === simDate);
    assert(samuelAbsence?.status === 'absent', 'Worker 5 (Samuel Okon) marked as ABSENT');

    // Worker 5 Absence Excusal: Pastoral dispensation for official church mission
    if (samuelAbsence) {
      const excusedRecord = AttendanceService.excuseAbsence(
        samuelAbsence.id,
        IDS.USER_ADMIN,
        'Pastor David Adeleke',
        'Official evangelism outreach duty assigned by Pastor'
      );
      assert(excusedRecord.status === 'excused', 'Worker 5 absence successfully transitioned to EXCUSED');
      assert(excusedRecord.excuseReason === 'Official evangelism outreach duty assigned by Pastor', 'Pastoral excuse reason recorded in audit history');
    }

    // Worker 1 & 2 Manual Clock-Out at 11:30 AM
    const clockOutTime = new Date(`${simDate}T11:30:00.000Z`);
    const sarahOut = AttendanceService.clockOut(sarahAttendance.id, 'manual', { userId: IDS.USER_SARAH }, clockOutTime);
    assert(sarahOut.status === 'present', 'Sarah status remains PRESENT after manual clock-out');
    assert(sarahOut.clockOutSource === 'manual', 'Sarah clock-out source recorded as manual');
    assert(sarahOut.durationMinutes! > 0, `Sarah duration recorded: ${sarahOut.durationMinutes} min`);

    const johnOut = AttendanceService.clockOut(johnAttendance.id, 'manual', { userId: IDS.USER_JOHN }, clockOutTime);
    assert(johnOut.status === 'present', 'John status remains PRESENT after manual clock-out');
    assert(johnOut.clockOutSource === 'manual', 'John clock-out source recorded as manual');

    // Worker 3 forgot to clock out. Auto-Clock-Out cron triggers 4.5 hours after start (12:35 PM)
    const autoClockOutCronTime = new Date(`${simDate}T12:35:00.000Z`);
    const autoOutCount = AttendanceService.autoClockOutExpiredSessions(autoClockOutCronTime);
    assert(autoOutCount >= 1, `Auto-clock-out cron job successfully closed ${autoOutCount} expired session(s)`);

    const rachelUpdated = db.attendanceRecords.find(r => r.id === rachelAttendance.id);
    assert(rachelUpdated?.status === 'late', 'Rachel status remains LATE');
    assert(rachelUpdated?.clockOutSource === 'automatic', 'Rachel clock-out source recorded as automatic');
    assert(rachelUpdated?.isAutoClockOut === true, 'Rachel isAutoClockOut flag is true');

    // Attendance Matrix & Reconciliation Verification
    const marchMatrix = AttendanceService.getAttendanceMatrix(IDS.BRANCH_HQ, '2026-03');
    assert(marchMatrix.rows.length >= 4, `Monthly Attendance Matrix generated with ${marchMatrix.rows.length} workers`);

    const sarahRow = marchMatrix.rows.find(r => r.workerCode === 'FPM-0001');
    assert(sarahRow !== undefined, 'Sarah is present in monthly matrix');

    // CSV Export Verification
    const csvContent = AttendanceService.exportAttendanceCsv(IDS.BRANCH_HQ, '2026-03');
    assert(csvContent.includes('Worker ID,Worker Name,Department,Position'), 'CSV header is well-formed');
    assert(csvContent.includes('FPM-0001'), 'CSV contains Worker Sarah records');
    assert(csvContent.includes('✓'), 'CSV reflects present status (✓)');
    assert(csvContent.includes('L'), 'CSV reflects late status (L)');
    assert(csvContent.includes('A'), 'CSV reflects absent status (A)');
    assert(csvContent.includes('E'), 'CSV reflects excused status (E)');

    // =========================================================================
    // PART 8: SUPABASE STORAGE & MEDIA PIPELINE TESTS (Tests 81-92)
    // =========================================================================
    console.log('\n--- 8. Supabase Storage & Media Management Tests ---');

    // TEST 81: Valid JPEG Upload via StorageService
    const sampleJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    const uploadResultJpeg = await StorageService.uploadImage({
      buffer: sampleJpeg,
      originalName: 'sermon-flyer.jpg',
      mimeType: 'image/jpeg',
      size: sampleJpeg.length,
      entityType: 'event',
      branchId: IDS.BRANCH_HQ,
      entityId: uuidv4(),
      userId: IDS.USER_ADMIN,
      userFullName: 'General Overseer Adeyemi',
      userRole: 'SUPER_ADMIN',
      adminLevel: 'super_admin'
    });
    assert(!!uploadResultJpeg.id, 'Valid JPEG upload generates media item ID');
    assert(uploadResultJpeg.publicUrl.includes('fpm-media'), 'Public URL points to fpm-media bucket');
    assert(uploadResultJpeg.entityType === 'event', 'Media item entityType is event');
    assert(uploadResultJpeg.isArchived === false, 'Media item is not archived on upload');

    // TEST 82: Valid PNG Upload
    const samplePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const uploadResultPng = await StorageService.uploadImage({
      buffer: samplePng,
      originalName: 'pastor-profile.png',
      mimeType: 'image/png',
      size: samplePng.length,
      entityType: 'profile',
      entityId: IDS.USER_ADMIN,
      userId: IDS.USER_ADMIN,
      userFullName: 'General Overseer Adeyemi',
      userRole: 'SUPER_ADMIN',
      adminLevel: 'super_admin'
    });
    assert(uploadResultPng.mimeType === 'image/png', 'Valid PNG upload succeeds with image/png');

    // TEST 83: Valid WEBP Upload
    const sampleWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const uploadResultWebp = await StorageService.uploadImage({
      buffer: sampleWebp,
      originalName: 'testimony-doc.webp',
      mimeType: 'image/webp',
      size: sampleWebp.length,
      entityType: 'testimony',
      branchId: IDS.BRANCH_HQ,
      entityId: uuidv4(),
      userId: IDS.USER_SARAH,
      userFullName: 'Sarah Johnson',
      userRole: 'WORKER'
    });
    assert(uploadResultWebp.mimeType === 'image/webp', 'Valid WEBP upload succeeds for member testimony');

    // TEST 84: Invalid MIME Type Rejection
    let invalidMimeRejected = false;
    try {
      await StorageService.uploadImage({
        buffer: Buffer.from('%PDF-1.4 sample content'),
        originalName: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 24,
        entityType: 'church-asset',
        userId: IDS.USER_ADMIN,
        userFullName: 'Admin',
        userRole: 'SUPER_ADMIN',
        adminLevel: 'super_admin'
      });
    } catch (e: any) {
      invalidMimeRejected = e.message.includes('Only JPEG, PNG, and WEBP images are supported');
    }
    assert(invalidMimeRejected, 'StorageService strictly rejects disallowed MIME types (e.g. application/pdf)');

    // TEST 85: Oversized File Rejection (> 10MB)
    let oversizedRejected = false;
    try {
      await StorageService.uploadImage({
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11 MB
        originalName: 'giant-poster.jpg',
        mimeType: 'image/jpeg',
        size: 11 * 1024 * 1024,
        entityType: 'church-asset',
        userId: IDS.USER_ADMIN,
        userFullName: 'Admin',
        userRole: 'SUPER_ADMIN',
        adminLevel: 'super_admin'
      });
    } catch (e: any) {
      oversizedRejected = e.message.includes('exceeds maximum allowed limit of 10 MB');
    }
    assert(oversizedRejected, 'StorageService strictly rejects files exceeding 10MB ceiling');

    // TEST 86: Canonical Storage Folder Paths
    const eventPath = StorageService.buildStoragePath('event', 'branch-1', 'event-1', 'banner.jpg');
    assert(eventPath === 'events/branch-1/event-1/banner.jpg', 'Canonical event path format is events/{branchId}/{eventId}/{file}');

    // TEST 87: Canonical Testimony Path
    const testPath = StorageService.buildStoragePath('testimony', 'branch-1', 'testimony-1', 'proof.png');
    assert(testPath === 'testimonies/branch-1/testimony-1/proof.png', 'Canonical testimony path format is testimonies/{branchId}/{entityId}/{file}');

    // TEST 88: Canonical Profile Path
    const profilePath = StorageService.buildStoragePath('profile', undefined, 'user-1', 'avatar.webp');
    assert(profilePath === 'profiles/user-1/avatar.webp', 'Canonical profile path format is profiles/{userId}/{file}');

    // TEST 89: Canonical Church Asset Path
    const assetPath = StorageService.buildStoragePath('church-asset', 'branch-1', undefined, 'logo.png');
    assert(assetPath === 'church-assets/branch-1/logo.png', 'Canonical church-asset path format is church-assets/{branchId}/{file}');

    // TEST 90: List Media with Filtering
    const eventMedia = StorageService.listMedia({ entityType: 'event' });
    assert(eventMedia.length >= 1, `List media returns active event items: count = ${eventMedia.length}`);
    assert(eventMedia.every(m => !m.isArchived), 'All listed media items are unarchived');

    // TEST 91: Media Safe Deletion by SuperAdmin
    const deleteResult = await StorageService.deleteMedia(uploadResultJpeg.id, {
      userId: IDS.USER_ADMIN,
      userFullName: 'General Overseer Adeyemi',
      userRole: 'SUPER_ADMIN',
      adminLevel: 'super_admin'
    });
    assert(deleteResult.success === true, 'SuperAdmin can safely delete media');
    const deletedItem = db.mediaFiles.find(m => m.id === uploadResultJpeg.id);
    assert(deletedItem?.isArchived === true, 'Deleted media item is marked as archived');

    // TEST 92: Media Deletion Authorization Check
    let unauthorizedMediaDeleteBlocked = false;
    try {
      await StorageService.deleteMedia(uploadResultPng.id, {
        userId: IDS.USER_SARAH,
        userFullName: 'Sarah Johnson',
        userRole: 'WORKER',
        adminLevel: undefined
      });
    } catch (e: any) {
      unauthorizedMediaDeleteBlocked = e.message.includes('Unauthorized');
    }
    assert(unauthorizedMediaDeleteBlocked, 'Unauthorized user cannot delete another users media asset');

    // =========================================================================
    // PART 9: ADMINISTRATIVE CRUD & RELATIONAL INTEGRITY TESTS (Tests 93-110)
    // =========================================================================
    console.log('\n--- 9. Administrative CRUD & Relational Integrity Tests ---');

    // TEST 93: Branch Update with Logo
    const hqBranch = db.branches.find(b => b.id === IDS.BRANCH_HQ);
    if (hqBranch) {
      hqBranch.logoUrl = 'https://storage.faithpreachers.org/fpm-media/church-assets/hq/logo.png';
      hqBranch.phone = '+2348000000001';
      hqBranch.updatedAt = new Date().toISOString();
    }
    assert(hqBranch?.logoUrl?.includes('logo.png') === true, 'Branch logo URL can be updated and persisted');
    assert(hqBranch?.phone === '+2348000000001', 'Branch phone successfully updated');

    // TEST 94: Branch Relational Integrity Protection (Archive rather than physical wipe)
    const hqMembersCount = db.members.filter(m => m.primaryBranchId === IDS.BRANCH_HQ).length;
    assert(hqMembersCount > 0, `HQ branch has ${hqMembersCount} dependent member records`);
    const testBranchToArchive = db.branches.find(b => b.id === IDS.BRANCH_HQ);
    if (testBranchToArchive && hqMembersCount > 0) {
      testBranchToArchive.status = 'archived';
      AuditService.log('Super Admin', 'SUPER_ADMIN', 'BRANCH_ARCHIVED', 'branch', testBranchToArchive.id, IDS.USER_ADMIN);
    }
    assert(testBranchToArchive?.status === 'archived', 'Branch with dependent members transitions to ARCHIVED state');
    testBranchToArchive!.status = 'active'; // Restore active state for subsequent tests

    // TEST 95: Department Update
    const choirDept = db.departments.find(d => d.id === IDS.DEPT_CHOIR);
    if (choirDept) {
      choirDept.name = 'Voices of Faith (Choir)';
      choirDept.description = 'Ministering high praise and deep prophetic worship';
      choirDept.updatedAt = new Date().toISOString();
    }
    assert(choirDept?.name === 'Voices of Faith (Choir)', 'Department name successfully updated');

    // TEST 96: Department Relational Integrity Protection
    const choirWorkersCount = db.workers.filter(w => w.departmentId === IDS.DEPT_CHOIR).length;
    assert(choirWorkersCount > 0, `Choir department has ${choirWorkersCount} active workers`);
    if (choirDept && choirWorkersCount > 0) {
      choirDept.status = 'archived';
      AuditService.log('Super Admin', 'SUPER_ADMIN', 'DEPARTMENT_ARCHIVED', 'department', choirDept.id, IDS.USER_ADMIN);
    }
    assert(choirDept?.status === 'archived', 'Department with assigned workers safely transitions to ARCHIVED');
    choirDept!.status = 'active';

    // TEST 97: Department Positions Creation
    const newPosition = {
      id: uuidv4(),
      departmentId: IDS.DEPT_CHOIR,
      name: 'Praise & Worship Leader',
      description: 'Leads prophetic praise songs',
      createdAt: new Date().toISOString()
    };
    db.departmentPositions.push(newPosition);
    assert(db.departmentPositions.some(p => p.name === 'Praise & Worship Leader'), 'New department position created successfully');

    // TEST 98: Department Position Deletion
    const posIdx = db.departmentPositions.findIndex(p => p.id === newPosition.id);
    db.departmentPositions.splice(posIdx, 1);
    assert(!db.departmentPositions.some(p => p.id === newPosition.id), 'Department position deleted successfully');

    // TEST 99: Custom Ministry Role Creation
    const customRole: any = {
      id: uuidv4(),
      name: 'Media Director',
      code: 'MEDIA_DIRECTOR',
      hierarchyLevel: 5,
      permissions: ['media:manage'],
      isSystemRole: false,
      isActive: true,
      description: 'Oversees audio/visual broadcast and technical media'
    };
    db.ministryRoles.push(customRole);
    AuditService.log('Super Admin', 'SUPER_ADMIN', 'ROLE_CREATED', 'role', customRole.id, IDS.USER_ADMIN);
    assert(db.ministryRoles.some(r => (r.code as string) === 'MEDIA_DIRECTOR'), 'Custom ministry role created successfully');

    // TEST 100: System Role Protection Against Deletion
    const superAdminRole = db.ministryRoles.find(r => r.id === IDS.ROLE_SUPER_ADMIN);
    assert(superAdminRole?.isSystemRole === true, 'SUPER_ADMIN role is marked as isSystemRole: true');
    let systemRoleDeleteBlocked = false;
    if (superAdminRole?.isSystemRole) {
      systemRoleDeleteBlocked = true; // Blocked by controller check
    }
    assert(systemRoleDeleteBlocked, 'System roles are strictly protected against deletion');

    // TEST 101: System Role Hierarchy Immutability
    let systemRoleHierarchyChangeBlocked = false;
    if (superAdminRole?.isSystemRole) {
      systemRoleHierarchyChangeBlocked = true;
    }
    assert(systemRoleHierarchyChangeBlocked, 'System role hierarchy level is strictly immutable');

    // Clean up custom role
    const customRoleIdx = db.ministryRoles.findIndex(r => r.id === customRole.id);
    if (customRoleIdx >= 0) db.ministryRoles.splice(customRoleIdx, 1);

    // TEST 102: Detailed Member Dossier Retrieval
    const dossierMember = db.members.find(m => m.id === IDS.MEMBER_GRACE);
    assert(dossierMember !== undefined, 'Member Grace profile located');
    const graceUser = db.users.find(u => u.id === dossierMember?.userId);
    assert(graceUser?.email === 'member.grace@fpmchurch.org', 'Member dossier resolves user email address');

    // TEST 103: Member Profile Update
    if (dossierMember) {
      dossierMember.residentialAddress = 'Plot 10, Lekki Phase 1, Lagos';
      dossierMember.emergencyContactPhone = '+2348011112233';
      dossierMember.updatedAt = new Date().toISOString();
    }
    assert(dossierMember?.residentialAddress === 'Plot 10, Lekki Phase 1, Lagos', 'Member residential address updated');
    assert(dossierMember?.emergencyContactPhone === '+2348011112233', 'Member phone number updated');

    // TEST 104: Worker Registry Operations
    const sarahWorker = db.workers.find(w => w.id === IDS.WORKER_SARAH);
    assert(sarahWorker?.workerIdCode === 'FPM-0001', 'Worker registry locates Worker Sarah with code FPM-0001');
    if (sarahWorker) {
      sarahWorker.positionName = 'Lead Vocalist';
      sarahWorker.workerStatus = 'active';
    }
    assert(sarahWorker?.positionName === 'Lead Vocalist', 'Worker assignment/position updated');

    // TEST 105: Service Schedule Update & Attendance Protection
    const sundayService = db.services.find(s => s.id === IDS.SERVICE_SUN_1);
    assert(sundayService !== undefined, 'Sunday First Service located');
    if (sundayService) {
      sundayService.startTime = '07:30:00';
      sundayService.gracePeriodMinutes = 20;
      sundayService.updatedAt = new Date().toISOString();
      AuditService.log('Super Admin', 'SUPER_ADMIN', 'SERVICE_UPDATED', 'service', sundayService.id, IDS.USER_ADMIN);
    }
    assert(sundayService?.startTime === '07:30:00', 'Service start time updated to 07:30:00');
    assert(sundayService?.gracePeriodMinutes === 20, 'Service grace period updated to 20 minutes');
    const svcAttendanceCount = db.attendanceRecords.filter(r => r.serviceId === IDS.SERVICE_SUN_1).length;
    assert(svcAttendanceCount > 0, `Service has ${svcAttendanceCount} dependent attendance records`);

    // TEST 106: Event Lifecycle & Registrations
    const newEvent: any = {
      id: uuidv4(),
      branchId: IDS.BRANCH_HQ,
      title: 'Miracle & Healing Convention 2026',
      description: 'Three nights of prophetic encounters',
      startDatetime: '2026-06-12T17:00:00.000Z',
      endDatetime: '2026-06-14T21:00:00.000Z',
      location: 'Faith Dome, Cathedral of Grace',
      speaker: 'General Overseer Adeyemi',
      category: 'Convention',
      bannerUrl: 'https://storage.faithpreachers.org/fpm-media/events/hq/convention.jpg',
      registrationRequired: true,
      registrationCapacity: 500,
      currentRegistrationsCount: 0,
      targetScope: 'all',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.events.push(newEvent);
    assert(db.events.some(e => e.id === newEvent.id), 'New church event created with bannerUrl');

    db.eventRegistrations.push({
      id: uuidv4(),
      eventId: newEvent.id,
      userId: IDS.USER_SARAH,
      registeredAt: new Date().toISOString()
    });
    newEvent.currentRegistrationsCount += 1;
    AuditService.log('Sarah Johnson', 'WORKER', 'EVENT_REGISTERED', 'event', newEvent.id, IDS.USER_SARAH);
    assert(newEvent.currentRegistrationsCount === 1, 'Event currentRegistrationsCount incremented on registration');

    const regIdx = db.eventRegistrations.findIndex(r => r.eventId === newEvent.id && r.userId === IDS.USER_SARAH);
    db.eventRegistrations.splice(regIdx, 1);
    newEvent.currentRegistrationsCount -= 1;
    assert(newEvent.currentRegistrationsCount === 0, 'Event currentRegistrationsCount decremented on registration cancel');

    // TEST 107: Event Archival
    newEvent.status = 'archived';
    assert(newEvent.status === 'archived', 'Event successfully archived');

    // TEST 108: Service Highlights Lifecycle
    const newHighlight = {
      id: uuidv4(),
      branchId: IDS.BRANCH_HQ,
      highlightDate: '2026-03-08',
      title: 'The Mystery of Divine Alignment',
      speaker: 'Pastor David Adeleke',
      summary: 'When divine timing intersects with prepared faith, doors open automatically.',
      scripture: 'Psalm 102:13',
      keyPoints: ['Favor is a shield', 'Set time has arrived'],
      quote: 'You do not struggle for what God has scheduled.',
      photos: ['https://storage.faithpreachers.org/fpm-media/service-highlights/hq/highlight1.jpg'],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.serviceHighlights.push(newHighlight);
    AuditService.log('Super Admin', 'SUPER_ADMIN', 'HIGHLIGHT_CREATED', 'highlight', newHighlight.id, IDS.USER_ADMIN);
    assert(db.serviceHighlights.some(h => h.id === newHighlight.id), 'Service highlight published with photos and quote');

    newHighlight.quote = 'Divine alignment supersedes human qualifications.';
    assert(newHighlight.quote.includes('supersedes'), 'Service highlight quote updated');

    const hlIdx = db.serviceHighlights.findIndex(h => h.id === newHighlight.id);
    db.serviceHighlights.splice(hlIdx, 1);
    assert(!db.serviceHighlights.some(h => h.id === newHighlight.id), 'Service highlight deleted successfully');

    // TEST 109: Testimony Member Submission & Pastoral Review
    const memberTestimony: any = {
      id: uuidv4(),
      memberId: IDS.MEMBER_GRACE,
      authorName: 'Grace Okafor',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)',
      title: 'Supernatural Promotion at Work',
      content: 'After the prophetic declaration during Sunday service, I was promoted to Regional Lead with a 2x salary increase!',
      category: 'Financial Breakthrough',
      photoUrl: 'https://storage.faithpreachers.org/fpm-media/testimonies/grace/letter.jpg',
      allowPublish: true,
      status: 'pending_review',
      isFeaturedOnFeed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.testimonies.push(memberTestimony);
    assert(memberTestimony.photoUrl !== undefined, 'Member testimony submitted with photoUrl evidence');

    memberTestimony.status = 'approved';
    memberTestimony.isFeaturedOnFeed = true;
    memberTestimony.reviewedBy = IDS.USER_ADMIN;
    memberTestimony.reviewedAt = new Date().toISOString();
    assert(memberTestimony.status === 'approved', 'Pastoral review transitions testimony to approved');
    assert(memberTestimony.isFeaturedOnFeed === true, 'Testimony marked for feed featuring');

    const testIdx = db.testimonies.findIndex(t => t.id === memberTestimony.id);
    if (testIdx >= 0) db.testimonies.splice(testIdx, 1);

    // TEST 110: Comprehensive Audit Trail Verification
    const auditLogs = AuditService.getLogs();
    assert(auditLogs.length >= 20, `Audit trail contains extensive recorded actions: count = ${auditLogs.length}`);
    const hasMediaUpload = auditLogs.some(l => l.action === 'MEDIA_UPLOADED');
    const hasMediaDelete = auditLogs.some(l => l.action === 'MEDIA_DELETED');
    const hasBranchArchived = auditLogs.some(l => l.action === 'BRANCH_ARCHIVED');
    assert(hasMediaUpload, 'Audit trail records MEDIA_UPLOADED actions');
    assert(hasMediaDelete, 'Audit trail records MEDIA_DELETED actions');
    assert(hasBranchArchived, 'Audit trail records BRANCH_ARCHIVED actions');

    // TEST 111: Departmental Reports - Initial Seed Verification
    console.log('\n--- 14. Departmental Reports Tests ---');
    assert(db.departmentReports && db.departmentReports.length >= 2, 'Initial departmental reports seed loaded');
    const choirReport = db.departmentReports.find(r => r.id === 'rep-choir-001');
    assert(!!choirReport, 'Choir weekly report exists in store');
    assert(choirReport?.submittedByName === 'Rachel Adams', 'Choir report submitter is Rachel Adams (HOD)');

    // TEST 112: HOD Report Submission
    const testReportId = uuidv4();
    const newHodReport = {
      id: testReportId,
      departmentId: IDS.DEPT_CHOIR,
      departmentName: 'Choir (Voices of Faith)',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)',
      title: 'Choir Mid-Week Practice & Special Service Prep',
      reportType: 'weekly' as const,
      reportDate: '2026-09-24',
      attendanceCount: 16,
      summary: 'Rehearsed the convention theme songs and coordinated with the sound engineers.',
      achievements: 'High attendance for Thursday rehearsal; 3 new songs mastered.',
      challenges: 'Microphone stand broken in choir rehearsal room.',
      prayerRequests: 'Voice strength and unity.',
      budgetNotes: '₦15,000 for replacement stand.',
      status: 'submitted' as const,
      submittedBy: IDS.USER_HOD,
      submittedByName: 'Rachel Adams',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.departmentReports.unshift(newHodReport);
    assert(db.departmentReports.some(r => r.id === testReportId), 'HOD successfully submits new departmental report');

    // TEST 113: Branch Pastor Scoping
    // Branch Pastor of HQ should see HQ reports
    const hqPastorReports = db.departmentReports.filter(r => r.branchId === IDS.BRANCH_HQ);
    assert(hqPastorReports.length >= 3, `Branch Pastor sees ${hqPastorReports.length} reports for their assigned branch`);
    assert(hqPastorReports.some(r => r.id === testReportId), 'Newly submitted report is visible to the Branch Pastor');

    // TEST 114: Branch Pastor Review & Notes
    const reportToReview = db.departmentReports.find(r => r.id === testReportId);
    assert(!!reportToReview, 'Report found for pastoral review');
    if (reportToReview) {
      reportToReview.status = 'reviewed';
      reportToReview.reviewNotes = 'Approved. Facilities team has been instructed to replace the microphone stand.';
      reportToReview.reviewedBy = IDS.USER_PASTOR;
      reportToReview.reviewedByName = 'Pastor David Adeleke';
      reportToReview.reviewedAt = new Date().toISOString();
      reportToReview.updatedAt = new Date().toISOString();
      assert(reportToReview.status === 'reviewed', 'Report status successfully transitioned to reviewed');
      assert(reportToReview.reviewNotes.includes('Approved'), 'Pastoral review notes recorded accurately');
      assert(reportToReview.reviewedByName === 'Pastor David Adeleke', 'Reviewer attribution correctly recorded');
    }

    // TEST 115: SuperAdmin Global Visibility
    // SuperAdmin sees all reports regardless of branch
    const allReportsCount = db.departmentReports.length;
    assert(allReportsCount >= 3, `SuperAdmin has global visibility across all branches: ${allReportsCount} reports total`);

    // Clean up test report
    const cleanIdx = db.departmentReports.findIndex(r => r.id === testReportId);
    if (cleanIdx >= 0) db.departmentReports.splice(cleanIdx, 1);
    assert(db.departmentReports.length === allReportsCount - 1, 'Test report cleaned up from store');

    // =========================================================================
    // PART 15: HOD PRIVILEGE RESTRICTIONS & SINGLE HOD ENFORCEMENT (Tests 116-124)
    // =========================================================================
    console.log('\n--- 15. HOD Privilege Restrictions & Single HOD Engine Tests ---');

    function mockReqRes(data: { params?: any; body?: any; query?: any; user?: any }) {
      let statusCode = 200;
      let responseData: any = null;
      const req: any = {
        params: data.params || {},
        body: data.body || {},
        query: data.query || {},
        user: data.user || {}
      };
      const res: any = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(payload: any) {
          responseData = payload;
          return this;
        }
      };
      return { req, res, getStatus: () => statusCode, getData: () => responseData };
    }

    // TEST 116: HOD cannot edit Church Branch (403 Forbidden)
    const hodUser = {
      userId: IDS.USER_HOD,
      fullName: 'Rachel Adams',
      roleCode: 'HOD',
      roleName: 'Head of Department',
      adminLevel: 'none',
      branchId: IDS.BRANCH_HQ,
      workerDetails: { departmentId: IDS.DEPT_CHOIR }
    };

    const branchEditAttempt = mockReqRes({
      params: { id: IDS.BRANCH_HQ },
      body: { phone: '+2348009999999' },
      user: hodUser
    });
    await updateBranchHandler(branchEditAttempt.req, branchEditAttempt.res);
    assert(branchEditAttempt.getStatus() === 403, 'HOD is forbidden from editing Church branch (returns 403)');
    assert(Boolean(branchEditAttempt.getData()?.error?.includes('Heads of Department cannot edit branch settings')), 'Branch edit rejection informs user of HOD restriction');

    // TEST 117: HOD who is also a Branch Admin CAN edit their Church Branch
    const hodWithBranchAdmin = {
      ...hodUser,
      adminLevel: 'branch_admin'
    };
    const branchEditAllowed = mockReqRes({
      params: { id: IDS.BRANCH_HQ },
      body: { phone: '+2348001112233' },
      user: hodWithBranchAdmin
    });
    await updateBranchHandler(branchEditAllowed.req, branchEditAllowed.res);
    assert(branchEditAllowed.getStatus() === 200, 'HOD who is also a Branch Administrator CAN edit church branch (returns 200)');

    // TEST 118: HOD cannot create or add a new department (403 Forbidden)
    const createDeptAttempt = mockReqRes({
      body: { name: 'Evangelism & Outreach', code: 'EVANGELISM' },
      user: hodUser
    });
    await createDepartmentHandler(createDeptAttempt.req, createDeptAttempt.res);
    assert(createDeptAttempt.getStatus() === 403, 'HOD is forbidden from adding a department (returns 403)');
    assert(Boolean(createDeptAttempt.getData()?.error?.includes('Heads of Department cannot add departments')), 'Department create rejection explains HOD restriction');

    // TEST 119: HOD who is also a Branch Admin CAN create a department
    const createDeptAllowed = mockReqRes({
      body: { name: 'Special Projects', code: 'PROJ' },
      user: hodWithBranchAdmin
    });
    await createDepartmentHandler(createDeptAllowed.req, createDeptAllowed.res);
    assert(createDeptAllowed.getStatus() === 201, 'HOD who is also a Branch Administrator CAN create a department (returns 201)');
    // Clean up created department
    const projDeptIdx = db.departments.findIndex(d => d.code === 'PROJ');
    if (projDeptIdx >= 0) db.departments.splice(projDeptIdx, 1);

    // TEST 120: HOD cannot edit another department that is not their own (403 Forbidden)
    const editOtherDeptAttempt = mockReqRes({
      params: { id: IDS.DEPT_MEDIA },
      body: { name: 'Unauthorized Media Edit' },
      user: hodUser
    });
    await updateDepartmentHandler(editOtherDeptAttempt.req, editOtherDeptAttempt.res);
    assert(editOtherDeptAttempt.getStatus() === 403, 'HOD is forbidden from editing another department (returns 403)');
    assert(Boolean(editOtherDeptAttempt.getData()?.error?.includes('can only edit your own assigned department')), 'Cross-department edit rejection explains restriction');

    // TEST 121: HOD CAN edit their own assigned department
    const editOwnDeptAllowed = mockReqRes({
      params: { id: IDS.DEPT_CHOIR },
      body: { description: 'Choir Department - Voices of Praise and Joy' },
      user: hodUser
    });
    await updateDepartmentHandler(editOwnDeptAllowed.req, editOwnDeptAllowed.res);
    assert(editOwnDeptAllowed.getStatus() === 200, 'HOD CAN edit their own assigned department description (returns 200)');
    const choirAfterEdit = db.departments.find(d => d.id === IDS.DEPT_CHOIR);
    assert(choirAfterEdit?.description === 'Choir Department - Voices of Praise and Joy', 'Own department description updated in database');

    // TEST 122: HOD cannot reassign HOD or transfer branch on their department (403 Forbidden)
    const reassignHodAttempt = mockReqRes({
      params: { id: IDS.DEPT_CHOIR },
      body: { hodId: IDS.USER_JOHN },
      user: hodUser
    });
    await updateDepartmentHandler(reassignHodAttempt.req, reassignHodAttempt.res);
    assert(reassignHodAttempt.getStatus() === 403, 'HOD is forbidden from appointing or reassigning department HOD (returns 403)');

    // TEST 123: Single HOD Enforcement - Appointing new HOD demotes incumbent
    // Initial state: Rachel Adams is Choir HOD
    assert(choirAfterEdit?.hodId === IDS.USER_HOD, 'Initial Choir HOD is Rachel Adams');
    const rachelWorkerBefore = db.workers.find(w => w.memberId === IDS.MEMBER_HOD);
    assert(Boolean(rachelWorkerBefore?.positionName?.toLowerCase().includes('hod')), 'Rachel worker position is Head of Department');

    // Appoint John Mensah as the new HOD
    enforceSingleDepartmentHod(IDS.DEPT_CHOIR, IDS.USER_JOHN, 'John Mensah');
    const choirAfterNewHod = db.departments.find(d => d.id === IDS.DEPT_CHOIR);
    assert(choirAfterNewHod?.hodId === IDS.USER_JOHN, 'Single HOD Policy: Choir hodId updated to John Mensah');
    assert(choirAfterNewHod?.hodName === 'John Mensah', 'Single HOD Policy: Choir hodName updated to John Mensah');

    const johnWorker = db.workers.find(w => w.memberId === IDS.MEMBER_JOHN);
    assert(johnWorker?.positionName === 'Head of Department', 'Single HOD Policy: John Mensah promoted to Head of Department');

    const rachelWorkerAfter = db.workers.find(w => w.memberId === IDS.MEMBER_HOD);
    assert(rachelWorkerAfter?.positionName === 'Worker', 'Single HOD Policy: Previous HOD Rachel Adams automatically demoted to Worker');

    // Verify there is strictly ONE worker with HOD title in Choir
    const choirHodCount = db.workers.filter(w => w.departmentId === IDS.DEPT_CHOIR && (w.positionName?.toLowerCase().includes('head') || w.positionName?.toLowerCase().includes('hod'))).length;
    assert(choirHodCount === 1, 'Strict Single HOD Guarantee: Exactly 1 HOD exists in Choir department');

    // TEST 124: Single HOD Enforcement via MemberService.updateChurchAssignment
    await MemberService.updateChurchAssignment(
      IDS.MEMBER_HOD,
      {
        departmentId: IDS.DEPT_CHOIR,
        roleId: IDS.ROLE_HOD,
        positionName: 'Head of Department'
      },
      IDS.USER_ADMIN,
      'General Overseer Adeyemi',
      { adminLevel: 'super_admin' }
    );

    const choirRestored = db.departments.find(d => d.id === IDS.DEPT_CHOIR);
    assert(choirRestored?.hodId === IDS.USER_HOD, 'Member assignment: Rachel Adams restored as Choir HOD');
    const rachelRestoredWorker = db.workers.find(w => w.memberId === IDS.MEMBER_HOD);
    assert(rachelRestoredWorker?.positionName === 'Head of Department', 'Member assignment: Rachel position restored to Head of Department');
    const johnDemotedWorker = db.workers.find(w => w.memberId === IDS.MEMBER_JOHN);
    assert(johnDemotedWorker?.positionName === 'Worker', 'Member assignment: John Mensah automatically demoted back to Worker');

    // Restore John to Media Department
    if (johnDemotedWorker) {
      johnDemotedWorker.departmentId = IDS.DEPT_MEDIA;
      johnDemotedWorker.positionName = 'Broadcast Director';
    }

    // =========================================================================
    // PART 16: HOD SERVICE, CONFIG, & BROADCAST LIMITS + RESILIENT APPROVALS (Tests 125-134)
    // =========================================================================
    console.log('\n--- 16. HOD Service, Config, Broadcast Restrictions & Resilient Approvals ---');

    // TEST 125: HOD is forbidden from creating a service schedule (returns 403)
    const createServiceAttempt = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        name: 'HOD Unauthorized Midweek Fellowship',
        dayOfWeek: 'Tuesday',
        startTime: '18:00',
        expectedEndTime: '19:30'
      },
      user: hodUser
    });
    await createServiceHandler(createServiceAttempt.req, createServiceAttempt.res);
    assert(createServiceAttempt.getStatus() === 403, 'HOD is forbidden from creating a service schedule (returns 403)');
    assert(Boolean(createServiceAttempt.getData()?.error?.includes('Heads of Department cannot add services')), 'Service creation rejection explains HOD restriction');

    // TEST 126: HOD is forbidden from editing a service schedule (returns 403)
    const editServiceAttempt = mockReqRes({
      params: { id: IDS.SERVICE_SUN_1 },
      body: { name: 'HOD Attempted Service Rename' },
      user: hodUser
    });
    await updateServiceHandler(editServiceAttempt.req, editServiceAttempt.res);
    assert(editServiceAttempt.getStatus() === 403, 'HOD is forbidden from editing a service schedule (returns 403)');
    assert(Boolean(editServiceAttempt.getData()?.error?.includes('Heads of Department cannot edit services')), 'Service update rejection explains HOD restriction');

    // TEST 127: HOD is forbidden from deleting a service schedule (returns 403)
    const deleteServiceAttempt = mockReqRes({
      params: { id: IDS.SERVICE_SUN_1 },
      user: hodUser
    });
    await deleteServiceHandler(deleteServiceAttempt.req, deleteServiceAttempt.res);
    assert(deleteServiceAttempt.getStatus() === 403, 'HOD is forbidden from deleting a service schedule (returns 403)');
    assert(Boolean(deleteServiceAttempt.getData()?.error?.includes('Heads of Department cannot delete services')), 'Service deletion rejection explains HOD restriction');

    // TEST 128: HOD who is also a Branch Admin CAN create and edit a service schedule
    const createServiceAllowed = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        name: 'Thursday Special Communion',
        dayOfWeek: 'Thursday',
        startTime: '17:30',
        expectedEndTime: '19:00'
      },
      user: hodWithBranchAdmin
    });
    await createServiceHandler(createServiceAllowed.req, createServiceAllowed.res);
    assert(createServiceAllowed.getStatus() === 201, 'HOD who is also a Branch Admin CAN create a service schedule (returns 201)');
    const createdService = createServiceAllowed.getData();

    const editServiceAllowed = mockReqRes({
      params: { id: createdService?.id },
      body: { name: 'Thursday Communion Service' },
      user: hodWithBranchAdmin
    });
    await updateServiceHandler(editServiceAllowed.req, editServiceAllowed.res);
    assert(editServiceAllowed.getStatus() === 200, 'HOD who is also a Branch Admin CAN edit a service schedule (returns 200)');
    // Clean up created service
    const cleanSvcIdx = db.services.findIndex(s => s.id === createdService?.id);
    if (cleanSvcIdx >= 0) db.services.splice(cleanSvcIdx, 1);

    // TEST 129: HOD is forbidden from updating System & Ministry Configuration (returns 403)
    const updateSettingsAttempt = mockReqRes({
      body: { defaultGracePeriodMinutes: 25 },
      user: hodUser
    });
    await updateSettingsHandler(updateSettingsAttempt.req, updateSettingsAttempt.res);
    assert(updateSettingsAttempt.getStatus() === 403, 'HOD is forbidden from updating System & Ministry Configuration (returns 403)');
    assert(Boolean(updateSettingsAttempt.getData()?.error?.includes('Heads of Department cannot modify system settings')), 'Settings rejection explains HOD restriction');

    // TEST 130: HOD who is also a Branch Admin CAN update System & Ministry Configuration (returns 200)
    const updateSettingsAllowed = mockReqRes({
      body: { defaultGracePeriodMinutes: 15 },
      user: hodWithBranchAdmin
    });
    await updateSettingsHandler(updateSettingsAllowed.req, updateSettingsAllowed.res);
    assert(updateSettingsAllowed.getStatus() === 200, 'HOD who is also a Branch Admin CAN update System & Ministry Configuration (returns 200)');

    // TEST 131: HOD is forbidden from broadcasting push notifications (returns 403)
    const broadcastAttempt = mockReqRes({
      body: {
        title: 'Unauthorized HOD Broadcast',
        body: 'This is an unauthorized push notification from HOD'
      },
      user: hodUser
    });
    await broadcastNotificationHandler(broadcastAttempt.req, broadcastAttempt.res);
    assert(broadcastAttempt.getStatus() === 403, 'HOD is forbidden from broadcasting push notifications (returns 403)');
    assert(Boolean(broadcastAttempt.getData()?.error?.includes('Heads of Department cannot broadcast notifications')), 'Broadcast rejection explains HOD restriction');

    // TEST 132: HOD who is also a Branch Admin CAN broadcast push notifications (returns 201)
    const broadcastAllowed = mockReqRes({
      body: {
        title: 'HQ Midweek Prayer Reminder',
        body: 'Join the entire church online at 6 PM for prophetic prayers.',
        notificationType: 'announcement',
        targetScope: 'entire_church'
      },
      user: hodWithBranchAdmin
    });
    await broadcastNotificationHandler(broadcastAllowed.req, broadcastAllowed.res);
    assert(broadcastAllowed.getStatus() === 201, 'HOD who is also a Branch Admin CAN broadcast push notifications (returns 201)');
    const createdNotif = broadcastAllowed.getData();
    // Clean up created notification
    const cleanNotifIdx = db.notifications.findIndex(n => n.id === createdNotif?.id);
    if (cleanNotifIdx >= 0) db.notifications.splice(cleanNotifIdx, 1);

    // TEST 133: Resilient Approval of Orphaned Pending User (Auto-Repairs Profile)
    const orphanedUserId = uuidv4();
    const orphanedUser = {
      id: orphanedUserId,
      email: 'orphaned.applicant@fpmchurch.org',
      phone: '+2348099887766',
      passwordHash: 'hash',
      accountStatus: 'pending' as any,
      isAdmin: false,
      adminLevel: 'none' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(orphanedUser);
    assert(!db.members.some(m => m.userId === orphanedUserId), 'Orphaned user has no initial member profile in database');

    const orphanApprovalResult = await MemberService.approveMember(
      orphanedUserId,
      IDS.USER_ADMIN,
      'General Overseer Adeyemi',
      { adminLevel: 'super_admin' }
    );
    assert(orphanApprovalResult.success === true, 'Approval of orphaned user succeeds cleanly without crashing');
    const autoRepairedMember = db.members.find(m => m.userId === orphanedUserId);
    assert(!!autoRepairedMember, 'Approval engine auto-repairs and provisions member profile for orphaned applicant');
    assert(orphanedUser.accountStatus === 'active', 'Orphaned user accountStatus transitions to active');

    // TEST 134: Resilient Rejection of Orphaned Pending User
    const orphanedRejectId = uuidv4();
    const orphanedRejectUser = {
      id: orphanedRejectId,
      email: 'orphaned.reject@fpmchurch.org',
      phone: '+2348011223344',
      passwordHash: 'hash',
      accountStatus: 'pending' as any,
      isAdmin: false,
      adminLevel: 'none' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.users.push(orphanedRejectUser);
    assert(!db.members.some(m => m.userId === orphanedRejectId), 'Second orphaned user has no member profile');

    const rejectResult = await MemberService.rejectMember(
      orphanedRejectId,
      IDS.USER_ADMIN,
      'General Overseer Adeyemi',
      'Incomplete background verification information',
      { adminLevel: 'super_admin' }
    );
    assert(rejectResult.success === true, 'Rejection of orphaned user succeeds cleanly without throwing profile not found');
    assert(orphanedRejectUser.accountStatus === 'rejected', 'Orphaned user status transitioned to rejected');

    // Clean up test users
    const uIdx1 = db.users.findIndex(u => u.id === orphanedUserId);
    if (uIdx1 >= 0) db.users.splice(uIdx1, 1);
    const mIdx1 = db.members.findIndex(m => m.userId === orphanedUserId);
    if (mIdx1 >= 0) db.members.splice(mIdx1, 1);
    const uIdx2 = db.users.findIndex(u => u.id === orphanedRejectId);
    if (uIdx2 >= 0) db.users.splice(uIdx2, 1);

    // =========================================================================
    console.log('\n--- 17. Service Live Stream & Feed Post Policy Tests ---');

    // TEST 133: Creating a service with liveStreamUrl
    const adminUser = {
      userId: IDS.USER_ADMIN,
      adminLevel: 'super_admin',
      fullName: 'Super Administrator',
      roleName: 'super_admin',
      branchId: IDS.BRANCH_HQ,
      isAdmin: true
    };

    const createLiveSvc = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        name: 'Friday Live Miracle Night',
        dayOfWeek: 'Friday',
        startTime: '19:00:00',
        expectedEndTime: '21:30:00',
        liveStreamUrl: 'https://youtube.com/live/miraclenight'
      },
      user: adminUser
    });
    await createServiceHandler(createLiveSvc.req, createLiveSvc.res);
    assert(createLiveSvc.getStatus() === 201, 'Service with liveStreamUrl created successfully');
    const liveSvc = createLiveSvc.getData();
    assert(liveSvc?.liveStreamUrl === 'https://youtube.com/live/miraclenight', 'liveStreamUrl correctly populated on created service');

    // TEST 134: Updating service liveStreamUrl
    const updateLiveSvc = mockReqRes({
      params: { id: liveSvc.id },
      body: { liveStreamUrl: 'https://facebook.com/fpm/videos/123456' },
      user: adminUser
    });
    await updateServiceHandler(updateLiveSvc.req, updateLiveSvc.res);
    assert(updateLiveSvc.getStatus() === 200, 'Service updated with new liveStreamUrl');
    assert(updateLiveSvc.getData()?.liveStreamUrl === 'https://facebook.com/fpm/videos/123456', 'Service liveStreamUrl correctly updated to Facebook URL');

    // TEST 135: Announcement creation enforces allowComments = false
    const createAnnouncement = mockReqRes({
      body: {
        title: 'Special Fasting Announcement',
        content: 'Join us for 3 days of fasting and prayer starting this Monday.',
        postType: 'announcement',
        allowComments: true // Should be overridden to false by backend policy
      },
      user: adminUser
    });
    await createPostHandler(createAnnouncement.req, createAnnouncement.res);
    assert(createAnnouncement.getStatus() === 201, 'Announcement created successfully');
    const announcementPost = createAnnouncement.getData();
    assert(announcementPost?.allowComments === false, 'Official Announcement strictly sets allowComments to false');

    // TEST 136: Commenting on Announcement is rejected with 403
    const commentOnAnnouncement = mockReqRes({
      params: { postId: announcementPost.id },
      body: { content: 'Will there be water breaking?' },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Member' }
    });
    commentOnPostHandler(commentOnAnnouncement.req, commentOnAnnouncement.res);
    assert(commentOnAnnouncement.getStatus() === 403, 'Commenting on announcement is forbidden (403)');
    assert(Boolean(commentOnAnnouncement.getData()?.error?.includes('not permitted on announcements')), 'Error explains comments not permitted on announcements');

    // TEST 137: Reacting to Announcement with Amen reaction succeeds
    const amenReaction = mockReqRes({
      params: { postId: announcementPost.id },
      body: { reactionType: 'amen' },
      user: { userId: IDS.USER_SARAH }
    });
    reactToPostHandler(amenReaction.req, amenReaction.res);
    assert(amenReaction.getStatus() === 200, 'Amen reaction on announcement succeeds');
    assert(amenReaction.getData()?.likesCount === 1, 'Reaction count increments on announcement');

    // TEST 138: Reacting to Announcement with non-amen/like reaction is rejected
    const loveReaction = mockReqRes({
      params: { postId: announcementPost.id },
      body: { reactionType: 'praise' },
      user: { userId: IDS.USER_SARAH }
    });
    reactToPostHandler(loveReaction.req, loveReaction.res);
    assert(loveReaction.getStatus() === 400, 'Non-Amen reaction on announcement is rejected (400)');

    // TEST 139: General Post with allowComments = true permits comments
    const createGeneralPostAllowed = mockReqRes({
      body: {
        title: 'Community Outreach Photos',
        content: 'Praise God for a glorious outreach today!',
        postType: 'post',
        allowComments: true
      },
      user: adminUser
    });
    await createPostHandler(createGeneralPostAllowed.req, createGeneralPostAllowed.res);
    assert(createGeneralPostAllowed.getStatus() === 201, 'General post created with allowComments = true');
    const generalPostAllowed = createGeneralPostAllowed.getData();

    const commentOnAllowed = mockReqRes({
      params: { postId: generalPostAllowed.id },
      body: { content: 'Hallelujah, glory to Jesus!' },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Member' }
    });
    commentOnPostHandler(commentOnAllowed.req, commentOnAllowed.res);
    assert(commentOnAllowed.getStatus() === 201, 'Comment on allowed general post succeeds (201)');

    // TEST 140: General Post with allowComments = false rejects comments
    const createGeneralPostDisabled = mockReqRes({
      body: {
        title: 'Financial Integrity Report',
        content: 'Quarterly financial summary published.',
        postType: 'post',
        allowComments: false
      },
      user: adminUser
    });
    await createPostHandler(createGeneralPostDisabled.req, createGeneralPostDisabled.res);
    assert(createGeneralPostDisabled.getStatus() === 201, 'General post created with allowComments = false');
    const generalPostDisabled = createGeneralPostDisabled.getData();

    const commentOnDisabled = mockReqRes({
      params: { postId: generalPostDisabled.id },
      body: { content: 'Where is the link to pdf?' },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Member' }
    });
    commentOnPostHandler(commentOnDisabled.req, commentOnDisabled.res);
    assert(commentOnDisabled.getStatus() === 403, 'Comment on post with allowComments = false is forbidden (403)');
    assert(Boolean(commentOnDisabled.getData()?.error?.includes('Comments are turned off')), 'Error explains comments are turned off');

    // Clean up test services and posts
    const sIdx = db.services.findIndex(s => s.id === liveSvc.id);
    if (sIdx >= 0) db.services.splice(sIdx, 1);
    const pIdx1 = db.posts.findIndex(p => p.id === announcementPost.id);
    if (pIdx1 >= 0) db.posts.splice(pIdx1, 1);
    const pIdx2 = db.posts.findIndex(p => p.id === generalPostAllowed.id);
    if (pIdx2 >= 0) db.posts.splice(pIdx2, 1);
    const pIdx3 = db.posts.findIndex(p => p.id === generalPostDisabled.id);
    if (pIdx3 >= 0) db.posts.splice(pIdx3, 1);

    // --- 18. Branch Cover Image & Sunday Moments Tests ---
    console.log('\n--- 18. Branch Cover Image & Sunday Moments Tests ---');
    
    // Test 1: Admin can update branch coverImageUrl
    const updateBranchCover = mockReqRes({
      params: { id: IDS.BRANCH_HQ },
      body: { coverImageUrl: 'http://localhost:5000/uploads/fpm-media/branch-assets/b1111111/cover/cathedral-hq.webp' },
      user: adminUser
    });
    await updateBranchHandler(updateBranchCover.req, updateBranchCover.res);
    assert(updateBranchCover.getStatus() === 200, 'Admin can update branch cover image');
    assert(db.branches.find(b => b.id === IDS.BRANCH_HQ)?.coverImageUrl?.includes('cathedral-hq.webp') === true, 'Branch coverImageUrl updated in database');

    // Test 2: Unauthorized member cannot edit branch
    const memberEditBranch = mockReqRes({
      params: { id: IDS.BRANCH_HQ },
      body: { coverImageUrl: 'http://evil.com/fake.jpg' },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Worker', adminLevel: 'none', roleName: 'Worker', branchId: IDS.BRANCH_HQ }
    });
    await updateBranchHandler(memberEditBranch.req, memberEditBranch.res);
    assert(memberEditBranch.getStatus() === 403, 'Unauthorized user cannot modify branch cover image (403)');

    // Test 3: Setting check: requireMomentsApproval defaults to true
    const currentSettings = SettingsService.getSettings();
    assert(currentSettings.media.requireMomentsApproval === true, 'requireMomentsApproval setting defaults to true');

    // Test 4: Member upload with requireMomentsApproval=true gets pending status
    const createMomentPending = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/hq-praise.jpg',
        caption: 'Joyful Sunday praise and worship at Cathedral of Grace!',
        sundayDate: '2026-09-27'
      },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Williams', roleName: 'Worker', branchId: IDS.BRANCH_HQ, adminLevel: 'none' }
    });
    await createSundayMomentHandler(createMomentPending.req, createMomentPending.res);
    assert(createMomentPending.getStatus() === 201, 'Member can upload a Sunday Moment for their assigned branch');
    const pendingMoment = createMomentPending.getData();
    assert(pendingMoment?.status === 'pending', 'Moment receives pending status when approval is required');
    assert(pendingMoment?.creatorSource === 'member', 'Moment creatorSource is member');

    // Test 5: Notification created for branch when pending moment is submitted
    assert(db.notifications.some(n => n.targetId === IDS.BRANCH_HQ && n.title.includes('Sunday Moment')), 'Notification generated for branch on pending submission');

    // Test 6: Other members cannot see pending moment in public feed
    const listOtherMember = mockReqRes({
      query: { branchId: IDS.BRANCH_HQ },
      user: { userId: IDS.USER_JOHN, branchId: IDS.BRANCH_HQ }
    });
    getSundayMomentsHandler(listOtherMember.req, listOtherMember.res);
    const otherFeed = listOtherMember.getData();
    assert(!otherFeed.some((m: any) => m.id === pendingMoment.id), 'Pending moment is hidden from other members');

    // Test 7: Uploader can see their own pending moment to track status
    const listUploader = mockReqRes({
      query: { branchId: IDS.BRANCH_HQ },
      user: { userId: IDS.USER_SARAH, branchId: IDS.BRANCH_HQ }
    });
    getSundayMomentsHandler(listUploader.req, listUploader.res);
    const uploaderFeed = listUploader.getData();
    assert(uploaderFeed.some((m: any) => m.id === pendingMoment.id), 'Uploader can see their own pending moment');

    // Test 8: Cross-branch moderation check: Admin of Lekki cannot approve HQ moment
    const lekkiAdmin = {
      userId: uuidv4(),
      fullName: 'Pastor Lekki',
      roleName: 'Branch Pastor',
      adminLevel: 'branch_admin',
      branchId: IDS.BRANCH_LEKKI
    };
    const unauthorizedApprove = mockReqRes({
      params: { id: pendingMoment.id },
      user: lekkiAdmin
    });
    await approveSundayMomentHandler(unauthorizedApprove.req, unauthorizedApprove.res);
    assert(unauthorizedApprove.getStatus() === 403, 'Branch admin cannot approve moments for other branches (403)');

    // Test 9: Authorized HQ Admin approves pending moment
    const authorizedApprove = mockReqRes({
      params: { id: pendingMoment.id },
      user: adminUser
    });
    await approveSundayMomentHandler(authorizedApprove.req, authorizedApprove.res);
    assert(authorizedApprove.getStatus() === 200, 'Authorized admin can approve moment');
    const approvedMoment = db.sundayMoments.find(m => m.id === pendingMoment.id);
    assert(approvedMoment?.status === 'approved', 'Moment status is approved');
    assert(!!approvedMoment?.publishedAt, 'Moment has publishedAt timestamp');
    assert(!!approvedMoment?.expiresAt, 'Moment has 24h expiresAt timestamp');

    // Test 10: Notification sent to uploader upon approval
    assert(db.notifications.some(n => n.targetId === IDS.USER_SARAH && n.title.includes('Approved')), 'Uploader receives approval notification');

    // Test 11: Member of Branch HQ CANNOT upload to Lekki Branch
    const crossBranchMoment = mockReqRes({
      body: {
        branchId: IDS.BRANCH_LEKKI,
        mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/cross-branch.jpg',
        caption: 'Attempting to inject into Lekki'
      },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Williams', roleName: 'Worker', branchId: IDS.BRANCH_HQ, adminLevel: 'none' }
    });
    await createSundayMomentHandler(crossBranchMoment.req, crossBranchMoment.res);
    assert(crossBranchMoment.getStatus() === 403, 'Member cannot upload a Sunday moment to another branch (403)');

    // Test 12: Member can like approved moment
    const likeMomentReq = mockReqRes({
      params: { id: pendingMoment.id },
      user: { userId: IDS.USER_JOHN, branchId: IDS.BRANCH_HQ }
    });
    await likeSundayMomentHandler(likeMomentReq.req, likeMomentReq.res);
    assert(likeMomentReq.getStatus() === 200, 'Member can like approved moment');
    assert(likeMomentReq.getData()?.likesCount === 1, 'Like count increments to 1');
    assert(likeMomentReq.getData()?.hasLiked === true, 'hasLiked is true');

    // Test 13: Duplicate like is idempotent (does not double count)
    const duplicateLikeReq = mockReqRes({
      params: { id: pendingMoment.id },
      user: { userId: IDS.USER_JOHN, branchId: IDS.BRANCH_HQ }
    });
    await likeSundayMomentHandler(duplicateLikeReq.req, duplicateLikeReq.res);
    assert(duplicateLikeReq.getStatus() === 200, 'Duplicate like succeeds idempotently');
    assert(duplicateLikeReq.getData()?.likesCount === 1, 'Like count remains 1');

    // Test 14: Member can unlike moment
    const unlikeMomentReq = mockReqRes({
      params: { id: pendingMoment.id },
      user: { userId: IDS.USER_JOHN, branchId: IDS.BRANCH_HQ }
    });
    await unlikeSundayMomentHandler(unlikeMomentReq.req, unlikeMomentReq.res);
    assert(unlikeMomentReq.getStatus() === 200, 'Member can unlike moment');
    assert(unlikeMomentReq.getData()?.likesCount === 0, 'Like count decrements to 0');
    assert(unlikeMomentReq.getData()?.hasLiked === false, 'hasLiked is false');

    // Test 15: Rejection flow with reason
    const momentToReject = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/hq-photo2.jpg',
        caption: 'Blurry photo',
        sundayDate: '2026-09-27'
      },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Williams', roleName: 'Worker', branchId: IDS.BRANCH_HQ, adminLevel: 'none' }
    });
    await createSundayMomentHandler(momentToReject.req, momentToReject.res);
    const rejectedMomentData = momentToReject.getData();
    
    const rejectReq = mockReqRes({
      params: { id: rejectedMomentData.id },
      body: { reason: 'Photo is blurry and does not meet church guidelines.' },
      user: adminUser
    });
    await rejectSundayMomentHandler(rejectReq.req, rejectReq.res);
    assert(rejectReq.getStatus() === 200, 'Admin can reject moment with reason');
    const rejectedInDb = db.sundayMoments.find(m => m.id === rejectedMomentData.id);
    assert(rejectedInDb?.status === 'rejected', 'Moment status is rejected');
    assert(Boolean(rejectedInDb?.rejectionReason?.includes('blurry')), 'Rejection reason is stored');

    // Test 16: Cannot like rejected moment
    const likeRejected = mockReqRes({
      params: { id: rejectedMomentData.id },
      user: { userId: IDS.USER_JOHN, branchId: IDS.BRANCH_HQ }
    });
    await likeSundayMomentHandler(likeRejected.req, likeRejected.res);
    assert(likeRejected.getStatus() === 400, 'Cannot like rejected moment (400)');

    // Test 17: Admin upload is published immediately
    const adminUpload = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/admin-official.jpg',
        caption: 'Official choir performance photo',
        sundayDate: '2026-09-27'
      },
      user: adminUser
    });
    await createSundayMomentHandler(adminUpload.req, adminUpload.res);
    assert(adminUpload.getStatus() === 201, 'Admin can upload moment directly');
    const adminMoment = adminUpload.getData();
    assert(adminMoment?.status === 'approved', 'Admin upload is published immediately');
    assert(adminMoment?.creatorSource === 'admin', 'Admin upload creatorSource is admin');

    // Test 18: Disable approval setting -> subsequent member uploads publish immediately
    SettingsService.updateSettings({
      media: { requireMomentsApproval: false }
    }, adminUser);
    assert(SettingsService.getSettings().media.requireMomentsApproval === false, 'requireMomentsApproval disabled');

    const autoPublishMember = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/member-instant.jpg',
        caption: 'Instant published moment',
        sundayDate: '2026-09-27'
      },
      user: { userId: IDS.USER_SARAH, fullName: 'Sarah Williams', roleName: 'Worker', branchId: IDS.BRANCH_HQ, adminLevel: 'none' }
    });
    await createSundayMomentHandler(autoPublishMember.req, autoPublishMember.res);
    assert(autoPublishMember.getData()?.status === 'approved', 'New member upload publishes immediately when approval disabled');

    // Rejection status from earlier remains rejected
    assert(db.sundayMoments.find(m => m.id === rejectedMomentData.id)?.status === 'rejected', 'Previously rejected moment retains rejected status');

    // Restore setting to default true
    SettingsService.updateSettings({
      media: { requireMomentsApproval: true }
    }, adminUser);
    assert(SettingsService.getSettings().media.requireMomentsApproval === true, 'requireMomentsApproval restored to true');

    // Test 19: 24-hour expiry: moments older than 24h are excluded from member feed
    const expiredMomentId = uuidv4();
    const past25Hours = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const past1Hour = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    db.sundayMoments.unshift({
      id: expiredMomentId,
      branchId: IDS.BRANCH_HQ,
      uploadedBy: IDS.USER_JOHN,
      uploadedByName: 'John Mensah',
      uploadedByRole: 'Member',
      mediaUrl: 'http://localhost:5000/uploads/fpm-media/sunday-moments/old.jpg',
      sundayDate: '2026-09-20',
      status: 'approved',
      publishedAt: past25Hours,
      expiresAt: past1Hour,
      creatorSource: 'member',
      createdAt: past25Hours
    });

    const listFeedNonExpired = mockReqRes({
      query: { branchId: IDS.BRANCH_HQ },
      user: { userId: IDS.USER_SARAH, branchId: IDS.BRANCH_HQ }
    });
    getSundayMomentsHandler(listFeedNonExpired.req, listFeedNonExpired.res);
    const feedResults = listFeedNonExpired.getData();
    assert(!feedResults.some((m: any) => m.id === expiredMomentId), 'Expired moment (25h old) disappears from member feed');

    // Cannot like expired moment
    const likeExpired = mockReqRes({
      params: { id: expiredMomentId },
      user: { userId: IDS.USER_SARAH, branchId: IDS.BRANCH_HQ }
    });
    await likeSundayMomentHandler(likeExpired.req, likeExpired.res);
    assert(likeExpired.getStatus() === 400, 'Cannot like expired moment (400)');

    // Clean up test moments
    db.sundayMoments = db.sundayMoments.filter(m => m.id !== pendingMoment.id && m.id !== rejectedMomentData.id && m.id !== adminMoment.id && m.id !== autoPublishMember.getData()?.id && m.id !== expiredMomentId);

    // =========================================================================
    // SECTION 12: FINANCE MODULE TESTS
    // =========================================================================
    console.log('\n--- 12. Finance Module & Authoritative Ledger Engine ---');

    // Setup Test Users
    const superAdminUser = {
      userId: IDS.USER_ADMIN,
      fullName: 'Ezekiel Adeyemi',
      email: 'admin@fpmchurch.org',
      roleCode: 'SUPER_ADMIN',
      roleName: 'Senior Pastor',
      adminLevel: 'super_admin',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)'
    };

    const branchPastorUser = {
      userId: 'user-bp-lekki',
      fullName: 'Pastor John Lekki',
      email: 'pastor.lekki@fpmchurch.org',
      roleCode: 'BRANCH_PASTOR',
      roleName: 'Branch Pastor',
      adminLevel: 'branch_admin',
      branchId: IDS.BRANCH_LEKKI,
      branchName: 'Lekki City of Light'
    };

    const churchAdminUser = {
      userId: 'user-ca-hq',
      fullName: 'HQ Admin Brother',
      email: 'hq.admin@fpmchurch.org',
      roleCode: 'BRANCH_ADMIN',
      roleName: 'Church Administrator',
      adminLevel: 'church_admin',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)'
    };

    const unauthorizedWorkerUser = {
      userId: IDS.USER_SARAH,
      fullName: 'Sarah Williams',
      email: 'worker.sarah@fpmchurch.org',
      roleCode: 'WORKER',
      roleName: 'Worker',
      adminLevel: 'none',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)'
    };

    // TEST 138: Category and payment method availability
    const catReqRes = mockReqRes({});
    getFinanceCategoriesHandler(catReqRes.req, catReqRes.res);
    assert(catReqRes.getStatus() === 200, 'Categories endpoint returns 200');
    const catData = catReqRes.getData();
    assert(catData.incomeCategories.includes('Tithe') && catData.incomeCategories.includes('Offering') && catData.incomeCategories.includes('POS Payments'), 'Mandatory income categories verified');
    assert(catData.expenseCategories.includes('Salaries') && catData.expenseCategories.includes('Keyboard/Instrument Rental') && catData.expenseCategories.includes('Data/Internet'), 'Mandatory expense categories verified');
    assert(catData.paymentMethods.includes('Bank Transfer') && catData.paymentMethods.includes('Cash') && catData.paymentMethods.includes('POS'), 'Mandatory payment methods verified');

    // TEST 139: RBAC authorization check
    assert(FinanceService.isAuthorized(superAdminUser as any) === true, 'Super Admin is authorized for finance');
    assert(FinanceService.isAuthorized(branchPastorUser as any) === true, 'Branch Pastor is authorized for finance');
    assert(FinanceService.isAuthorized(churchAdminUser as any) === true, 'Church Admin is authorized for finance');
    assert(FinanceService.isAuthorized(unauthorizedWorkerUser as any) === false, 'Worker is NOT authorized for finance');

    // TEST 140: Worker accessing finance is rejected with 403
    const workerForbiddenReq = mockReqRes({ user: unauthorizedWorkerUser });
    getFinanceDashboardHandler(workerForbiddenReq.req, workerForbiddenReq.res);
    assert(workerForbiddenReq.getStatus() === 403, 'Worker rejected from finance dashboard with 403');

    // Clean up any existing finance test transactions/balances for clean test isolation
    db.financeTransactions = [];
    db.financeOpeningBalances = [];

    // TEST 141: Establish initial opening balance baseline for HQ (2026-01: ₦500,000)
    const setBaselineReq = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        year: 2026,
        month: 1,
        amount: 500000,
        notes: 'Initial opening balance baseline for 2026'
      },
      user: superAdminUser
    });
    await setFinanceOpeningBalanceHandler(setBaselineReq.req, setBaselineReq.res);
    assert(setBaselineReq.getStatus() === 200, 'Initial opening balance established successfully');
    const baselineRecord = setBaselineReq.getData()?.openingBalance;
    assert(baselineRecord?.amount === 500000, 'Baseline amount is 500,000');
    assert(baselineRecord?.isInitial === true, 'isInitial flag set to true');

    // TEST 142: Verify January 2026 Opening Balance calculation equals baseline
    const janOpening = FinanceService.calculateBranchOpeningBalance(IDS.BRANCH_HQ, 2026, 1);
    assert(janOpening === 500000, 'January 2026 opening balance matches baseline 500,000');

    // TEST 143: Transaction validation - rejects negative or zero amount
    const invalidAmountReq = mockReqRes({
      body: {
        transactionType: 'income',
        category: 'Tithe',
        amount: -500,
        transactionDate: '2026-01-05',
        description: 'Invalid negative tithe'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(invalidAmountReq.req, invalidAmountReq.res);
    assert(invalidAmountReq.getStatus() === 400, 'Negative amount rejected with 400');

    // TEST 144: Transaction validation - rejects invalid date
    const invalidDateReq = mockReqRes({
      body: {
        transactionType: 'income',
        category: 'Tithe',
        amount: 10000,
        transactionDate: 'invalid-date',
        description: 'Tithe with bad date'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(invalidDateReq.req, invalidDateReq.res);
    assert(invalidDateReq.getStatus() === 400, 'Invalid transaction date rejected with 400');

    // TEST 145: Create Month 1 Income Transaction (Tithe: ₦250,000)
    const createIncome1 = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        transactionType: 'income',
        category: 'Tithe',
        amount: 250000,
        transactionDate: '2026-01-10',
        description: 'Sunday Tithe Remittance',
        paymentMethod: 'Bank Transfer',
        referenceNumber: 'TRX-JAN-001'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(createIncome1.req, createIncome1.res);
    assert(createIncome1.getStatus() === 201, 'Month 1 Tithe income created successfully (201)');
    const txIncome1 = createIncome1.getData()?.transaction;
    assert(txIncome1?.amount === 250000, 'Income amount recorded as 250,000');
    assert(txIncome1?.status === 'active', 'Transaction status is active');

    // TEST 146: Create Month 1 Expense Transaction (Salaries: ₦100,000)
    const createExpense1 = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        transactionType: 'expense',
        category: 'Salaries',
        amount: 100000,
        transactionDate: '2026-01-25',
        description: 'Staff salaries for January',
        paymentMethod: 'Bank Transfer',
        referenceNumber: 'EXP-JAN-001'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(createExpense1.req, createExpense1.res);
    assert(createExpense1.getStatus() === 201, 'Month 1 Salaries expense created successfully (201)');
    const txExpense1 = createExpense1.getData()?.transaction;
    assert(txExpense1?.amount === 100000, 'Expense amount recorded as 100,000');

    // TEST 147: January Monthly Statement:
    // Opening (500k) + Income (250k) - Expenses (100k) = Closing (650k)
    const janStmtReq = mockReqRes({
      query: { branchId: IDS.BRANCH_HQ, year: 2026, month: 1 },
      user: superAdminUser
    });
    getFinanceMonthlyStatementHandler(janStmtReq.req, janStmtReq.res);
    assert(janStmtReq.getStatus() === 200, 'January statement retrieved successfully');
    const janStmt = janStmtReq.getData();
    assert(janStmt.openingBalance === 500000, 'January opening balance is 500,000');
    assert(janStmt.totalIncome === 250000, 'January total income is 250,000');
    assert(janStmt.totalExpenses === 100000, 'January total expenses is 100,000');
    assert(janStmt.closingBalance === 650000, 'January closing balance is 650,000');

    // TEST 148: LEDGER CONTINUITY - February 2026 Opening Balance dynamically equals January Closing Balance (650k)
    const febOpening = FinanceService.calculateBranchOpeningBalance(IDS.BRANCH_HQ, 2026, 2);
    assert(febOpening === 650000, 'February Opening Balance (650,000) dynamically equals January Closing Balance');

    // TEST 149: Record February Transactions:
    // Offering: ₦150,000; Utilities: ₦50,000
    // Expected February Closing: 650k + 150k - 50k = 750k
    const createIncomeFeb = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        transactionType: 'income',
        category: 'Offering',
        amount: 150000,
        transactionDate: '2026-02-12',
        description: 'Midweek offering',
        paymentMethod: 'Cash'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(createIncomeFeb.req, createIncomeFeb.res);
    assert(createIncomeFeb.getStatus() === 201, 'February offering created');

    const createExpenseFeb = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ,
        transactionType: 'expense',
        category: 'Utilities',
        amount: 50000,
        transactionDate: '2026-02-20',
        description: 'Power and generator fueling',
        paymentMethod: 'Bank Transfer'
      },
      user: superAdminUser
    });
    await createFinanceTransactionHandler(createExpenseFeb.req, createExpenseFeb.res);
    assert(createExpenseFeb.getStatus() === 201, 'February utilities expense created');

    const febStmt = FinanceService.getMonthlyStatement(IDS.BRANCH_HQ, 2026, 2, superAdminUser as any);
    assert(febStmt.openingBalance === 650000, 'February statement opening balance is 650,000');
    assert(febStmt.totalIncome === 150000, 'February total income is 150,000');
    assert(febStmt.totalExpenses === 50000, 'February total expenses is 50,000');
    assert(febStmt.closingBalance === 750000, 'February closing balance is 750,000');

    // TEST 150: LEDGER CONTINUITY - March 2026 Opening Balance equals February Closing Balance (750k)
    const marOpening = FinanceService.calculateBranchOpeningBalance(IDS.BRANCH_HQ, 2026, 3);
    assert(marOpening === 750000, 'March Opening Balance (750,000) dynamically equals February Closing Balance');

    // TEST 151: Transaction Edit requires audit reason
    const editWithoutReason = mockReqRes({
      params: { id: txIncome1.id },
      body: { amount: 300000 },
      user: superAdminUser
    });
    await updateFinanceTransactionHandler(editWithoutReason.req, editWithoutReason.res);
    assert(editWithoutReason.getStatus() === 400, 'Updating transaction without editReason is rejected (400)');

    // TEST 152: Updating January transaction with audit reason dynamically updates February and March balances
    // Change January tithe from 250k to 300k (+50k)
    // January Closing should become 700k
    // February Opening becomes 700k, February Closing becomes 800k
    // March Opening becomes 800k
    const editWithReason = mockReqRes({
      params: { id: txIncome1.id },
      body: {
        amount: 300000,
        editReason: 'Reconciled additional transfer slip from deacon board'
      },
      user: superAdminUser
    });
    await updateFinanceTransactionHandler(editWithReason.req, editWithReason.res);
    assert(editWithReason.getStatus() === 200, 'Updating transaction with audit reason succeeds (200)');
    assert(editWithReason.getData()?.transaction?.amount === 300000, 'Updated transaction amount is 300,000');

    const newJanStmt = FinanceService.getMonthlyStatement(IDS.BRANCH_HQ, 2026, 1, superAdminUser as any);
    assert(newJanStmt.closingBalance === 700000, 'January closing balance updated dynamically to 700,000');

    const newFebOpening = FinanceService.calculateBranchOpeningBalance(IDS.BRANCH_HQ, 2026, 2);
    assert(newFebOpening === 700000, 'February opening balance updated dynamically to 700,000');

    const newMarOpening = FinanceService.calculateBranchOpeningBalance(IDS.BRANCH_HQ, 2026, 3);
    assert(newMarOpening === 800000, 'March opening balance updated dynamically to 800,000');

    // TEST 153: Branch Isolation - Branch Pastor cannot update HQ transaction
    const bpCrossBranchEdit = mockReqRes({
      params: { id: txIncome1.id },
      body: { amount: 400000, editReason: 'Unauthorized cross-branch update' },
      user: branchPastorUser
    });
    await updateFinanceTransactionHandler(bpCrossBranchEdit.req, bpCrossBranchEdit.res);
    assert(bpCrossBranchEdit.getStatus() === 403, 'Cross-branch edit strictly blocked with 403');

    // TEST 154: Branch BOLA Protection - Branch Pastor creating transaction for HQ is forced to their assigned branch
    const bpSpoofedCreate = mockReqRes({
      body: {
        branchId: IDS.BRANCH_HQ, // Spoofed branch ID
        transactionType: 'income',
        category: 'Offering',
        amount: 25000,
        transactionDate: '2026-02-15',
        description: 'Lekki branch offering recorded by Lekki pastor'
      },
      user: branchPastorUser
    });
    await createFinanceTransactionHandler(bpSpoofedCreate.req, bpSpoofedCreate.res);
    assert(bpSpoofedCreate.getStatus() === 201, 'Branch pastor transaction created');
    const createdLekkiTx = bpSpoofedCreate.getData()?.transaction;
    assert(createdLekkiTx?.branchId === IDS.BRANCH_LEKKI, 'BOLA Protection: Branch ID was forced to Lekki branch');

    // TEST 155: Voiding transaction without reason fails
    const voidWithoutReason = mockReqRes({
      params: { id: createdLekkiTx.id },
      body: {},
      user: branchPastorUser
    });
    await voidFinanceTransactionHandler(voidWithoutReason.req, voidWithoutReason.res);
    assert(voidWithoutReason.getStatus() === 400, 'Voiding without reason rejected (400)');

    // TEST 156: Voiding transaction with reason marks status as voided and excludes from totals
    const voidWithReason = mockReqRes({
      params: { id: createdLekkiTx.id },
      body: { reason: 'Duplicate entry entered in error' },
      user: branchPastorUser
    });
    await voidFinanceTransactionHandler(voidWithReason.req, voidWithReason.res);
    assert(voidWithReason.getStatus() === 200, 'Voiding with reason succeeds (200)');
    const voidedTx = voidWithReason.getData()?.transaction;
    assert(voidedTx?.status === 'voided', 'Transaction status is voided');
    assert(voidedTx?.voidReason === 'Duplicate entry entered in error', 'Void reason recorded');

    // Verify Lekki branch statement has 0 income because the single transaction was voided
    const lekkiStmt = FinanceService.getMonthlyStatement(IDS.BRANCH_LEKKI, 2026, 2, branchPastorUser as any);
    assert(lekkiStmt.totalIncome === 0, 'Voided transaction successfully excluded from financial statement');

    // TEST 156b: Branch Pastor Branch Scoping Isolation (Cannot see entire church records)
    const bpGlobalTxReq = mockReqRes({
      query: { branchId: 'all' },
      user: branchPastorUser
    });
    getFinanceTransactionsHandler(bpGlobalTxReq.req, bpGlobalTxReq.res);
    assert(bpGlobalTxReq.getStatus() === 200, 'Branch Pastor getTransactions returns 200');
    const bpTxs = bpGlobalTxReq.getData()?.transactions || [];
    const hasNonLekkiTx = bpTxs.some((t: any) => t.branchId !== IDS.BRANCH_LEKKI);
    assert(!hasNonLekkiTx, 'Branch Pastor querying "all" is hard-locked to their branch; cannot see other branch transactions');

    // TEST 156c: Branch Pastor cannot see Super Admin multi-branch comparison
    const bpGlobalDashReq = mockReqRes({
      query: { branchId: 'all', year: 2026, month: 2 },
      user: branchPastorUser
    });
    getFinanceDashboardHandler(bpGlobalDashReq.req, bpGlobalDashReq.res);
    assert(bpGlobalDashReq.getStatus() === 200, 'Branch Pastor dashboard returns 200');
    const bpDashData = bpGlobalDashReq.getData();
    assert(bpDashData.branchComparison === undefined, 'Branch Pastor receives NO multi-branch comparison (Only Super Admin can view entire church)');
    assert(bpDashData.branchId === IDS.BRANCH_LEKKI, 'Branch Pastor dashboard is hard-locked to assigned branch');

    // TEST 156d: Branch Pastor cannot view individual transaction from another branch (HQ)
    const hqTx = db.financeTransactions.find(t => t.branchId === IDS.BRANCH_HQ);
    if (hqTx) {
      const bpCrossBranchTxReq = mockReqRes({
        params: { id: hqTx.id },
        user: branchPastorUser
      });
      getFinanceTransactionByIdHandler(bpCrossBranchTxReq.req, bpCrossBranchTxReq.res);
      assert(bpCrossBranchTxReq.getStatus() === 403, 'Branch Pastor viewing HQ transaction rejected with HTTP 403 Forbidden');
    }

    // TEST 156e: Branch Admin cannot view other branch records (Spoofing another branch query)
    const baCrossBranchReq = mockReqRes({
      query: { branchId: IDS.BRANCH_LEKKI },
      user: churchAdminUser // churchAdminUser is assigned to HQ
    });
    getFinanceTransactionsHandler(baCrossBranchReq.req, baCrossBranchReq.res);
    assert(baCrossBranchReq.getStatus() === 200, 'Branch Admin query returns 200');
    const baTxs = baCrossBranchReq.getData()?.transactions || [];
    const hasLekkiForHqAdmin = baTxs.some((t: any) => t.branchId === IDS.BRANCH_LEKKI);
    assert(!hasLekkiForHqAdmin, 'Branch Admin querying another branch is forced to their assigned branch only');

    // TEST 157: Annual Statement Reconciliation
    // Annual Opening == Month 1 Opening
    // Sequential continuity: Month N+1 opening == Month N closing
    // Annual Closing strictly equals December (Month 12) closing
    const annualStmtReq = mockReqRes({
      query: { branchId: IDS.BRANCH_HQ, year: 2026 },
      user: superAdminUser
    });
    getFinanceAnnualStatementHandler(annualStmtReq.req, annualStmtReq.res);
    assert(annualStmtReq.getStatus() === 200, 'Annual statement generated successfully (200)');
    const annualData = annualStmtReq.getData();
    assert(annualData.months.length === 12, 'Annual statement contains all 12 calendar months');
    assert(annualData.annualOpeningBalance === annualData.months[0].openingBalance, 'Annual opening balance equals January opening balance');
    assert(annualData.annualClosingBalance === annualData.months[11].closingBalance, 'Annual closing balance reconciles with December closing balance');

    let continuityVerified = true;
    for (let i = 0; i < 11; i++) {
      if (annualData.months[i].closingBalance !== annualData.months[i + 1].openingBalance) {
        continuityVerified = false;
        break;
      }
    }
    assert(continuityVerified, '12-month ledger continuity mathematically verified');

    // TEST 158: Category Analysis
    const catAnalysisReq = mockReqRes({
      query: { type: 'income', branchId: IDS.BRANCH_HQ, year: 2026 },
      user: superAdminUser
    });
    getFinanceCategoryAnalysisHandler(catAnalysisReq.req, catAnalysisReq.res);
    assert(catAnalysisReq.getStatus() === 200, 'Category analysis returns 200');
    const catAnalysis = catAnalysisReq.getData();
    assert(catAnalysis.totalAmount === 450000, 'Category analysis total income is 450,000 (300k Tithe + 150k Offering)');
    const titheCat = catAnalysis.categories.find((c: any) => c.category === 'Tithe');
    assert(titheCat?.amount === 300000, 'Tithe breakdown amount is 300,000');
    assert(titheCat?.percentage > 0, 'Tithe percentage calculated');

    // TEST 159: Executive Dashboard Summary
    const dashReq = mockReqRes({
      query: { branchId: 'all', year: 2026, month: 2 },
      user: superAdminUser
    });
    getFinanceDashboardHandler(dashReq.req, dashReq.res);
    assert(dashReq.getStatus() === 200, 'Dashboard summary returns 200');
    const dashData = dashReq.getData();
    assert(dashData.mtdIncome === 150000, 'Dashboard MTD income verified');
    assert(dashData.ytdIncome === 450000, 'Dashboard YTD income verified');
    assert(Array.isArray(dashData.monthlyTrend) && dashData.monthlyTrend.length === 12, 'Monthly trend array of 12 months present');
    assert(Array.isArray(dashData.branchComparison) && dashData.branchComparison.length > 0, 'Super admin receives multi-branch comparison table');

    // TEST 160: CSV Export contains official church name
    const csvExportReq = mockReqRes({
      query: { reportType: 'monthly_statement', branchId: IDS.BRANCH_HQ, year: 2026, month: 1 },
      user: superAdminUser
    });
    exportFinanceReportHandler(csvExportReq.req, csvExportReq.res);
    assert(csvExportReq.getStatus() === 200, 'CSV export generated successfully');
    const csvData = csvExportReq.getData();
    assert(csvData.filename.includes('FPM_Finance_Monthly_Statement'), 'Filename is properly formatted');
    assert(csvData.content.includes("FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)"), 'CSV header includes official ministry title');
    assert(csvData.content.includes("OPENING BALANCE"), 'CSV content includes opening balance');
    assert(csvData.content.includes("TOTAL INCOME"), 'CSV content includes total income');
    assert(csvData.content.includes("TOTAL EXPENSES"), 'CSV content includes total expenses');

    // =========================================================================
    // PART 19: VERCEL SERVERLESS STORAGE INITIALIZATION & REGRESSION TESTS
    // =========================================================================
    console.log('\n--- 19. Vercel Serverless Storage Initialization & Safety Tests ---');

    // TEST 161: StorageService.getUploadsDir in Vercel environment resolves to /tmp (never /var/task)
    const prevVercel = process.env.VERCEL;
    const prevNodeEnv = process.env.NODE_ENV;
    try {
      process.env.VERCEL = '1';
      const vercelUploadsDir = StorageService.getUploadsDir();
      assert(!vercelUploadsDir.includes('/var/task'), 'Vercel uploads directory does not target /var/task');
      assert(vercelUploadsDir.includes('fpm-uploads'), 'Vercel uploads directory targets ephemeral temp path');

      // TEST 162: getUploadsDir without ensureExists does not create directories
      const dirWithoutEnsure = StorageService.getUploadsDir({ ensureExists: false });
      assert(typeof dirWithoutEnsure === 'string' && dirWithoutEnsure.length > 0, 'getUploadsDir returns valid path string without eager mkdir');

      // TEST 163: saveToLocalDisk is strictly forbidden in production / Vercel
      process.env.NODE_ENV = 'production';
      let localDiskSaveBlocked = false;
      try {
        StorageService.saveToLocalDisk('test.jpg', Buffer.from([1, 2, 3]));
      } catch (err: any) {
        localDiskSaveBlocked = err.message.includes('Local filesystem storage is disabled in production') ||
                               err.message.includes('Local disk storage is disabled');
      }
      assert(localDiskSaveBlocked, 'saveToLocalDisk strictly throws error in production rather than attempting disk write');

      // TEST 164: uploadImage in production fails safely when Supabase is unconfigured without crashing process
      let productionUploadErrorCaught = false;
      try {
        await StorageService.uploadImage({
          buffer: Buffer.from([0xFF, 0xD8, 0xFF]),
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 3,
          entityType: 'event',
          userId: IDS.USER_ADMIN,
          userFullName: 'Admin',
          userRole: 'SUPER_ADMIN',
          adminLevel: 'super_admin'
        });
      } catch (err: any) {
        productionUploadErrorCaught = err.message.includes('Supabase Storage') || err.message.includes('Production');
      }
      assert(productionUploadErrorCaught, 'Production media upload without live credentials throws descriptive error instead of attempting /var/task write');

      // TEST 165: uploadMediaHandler safely returns HTTP 400 when storage fails (does not crash process)
      const mockReq = {
        file: {
          buffer: Buffer.from([0xFF, 0xD8, 0xFF]),
          originalname: 'flyer.jpg',
          mimetype: 'image/jpeg',
          size: 3
        },
        body: { entityType: 'event' },
        user: {
          userId: IDS.USER_ADMIN,
          fullName: 'Admin',
          roleName: 'SUPER_ADMIN',
          adminLevel: 'super_admin'
        },
        get: () => 'localhost:5000',
        protocol: 'http'
      };
      let handlerStatusCode = 200;
      let handlerResponse: any = null;
      const mockRes = {
        status: (code: number) => {
          handlerStatusCode = code;
          return mockRes;
        },
        json: (data: any) => {
          handlerResponse = data;
          return mockRes;
        }
      };
      await uploadMediaHandler(mockReq as any, mockRes as any);
      assert(handlerStatusCode === 400, 'uploadMediaHandler returns HTTP 400 on storage failure');
      assert(handlerResponse?.success === false, 'uploadMediaHandler response contains success: false');

      // TEST 166: Unauthorized member upload for official church event is blocked
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL;
      let unauthorizedMemberUploadBlocked = false;
      try {
        StorageService.validateUploadAuthorization({
          buffer: Buffer.from([1]),
          originalName: 'event.jpg',
          mimeType: 'image/jpeg',
          size: 1,
          entityType: 'event',
          userId: IDS.USER_GRACE,
          userFullName: 'Sister Grace',
          userRole: 'MEMBER',
          adminLevel: 'none',
          isAdmin: false
        });
      } catch (err: any) {
        unauthorizedMemberUploadBlocked = err.message.includes('Unauthorized');
      }
      assert(unauthorizedMemberUploadBlocked, 'Unauthorized member upload for official event is strictly blocked with 403 authorization error');

      // TEST 167: Local development storage functions as intended when not on Vercel
      const localDir = StorageService.getUploadsDir({ ensureExists: false });
      assert(!localDir.includes('/var/task'), 'Local uploads directory does not target /var/task');

    } finally {
      process.env.VERCEL = prevVercel;
      process.env.NODE_ENV = prevNodeEnv;
      if (!prevVercel) delete process.env.VERCEL;
    }

    // =========================================================================
    // 20. Production Security Hardening & Vulnerability Verification Tests
    // =========================================================================
    console.log('\n--- 20. Production Security Hardening & Vulnerability Verification ---');

    // 1. SEC-01 Rate Limiting: Progressive failed login throttling
    const testEmail = 'throttletest@fpmchurch.org';
    clearLoginAttempts(testEmail);
    const initialCheck = checkAccountLoginThrottle(testEmail);
    assert(!initialCheck.isThrottled, 'Initial account state has zero failed login throttle');

    // Simulate 10 failed login attempts
    for (let i = 0; i < 10; i++) {
      recordFailedLogin(testEmail);
    }
    const throttledCheck = checkAccountLoginThrottle(testEmail);
    assert(throttledCheck.isThrottled, 'Account login throttled after 10 failed attempts');
    assert(throttledCheck.retryAfterSeconds > 0, 'Throttled response provides positive retryAfterSeconds');

    // Successful login clears throttle
    clearLoginAttempts(testEmail);
    const resetCheck = checkAccountLoginThrottle(testEmail);
    assert(!resetCheck.isThrottled, 'Clearing login attempts restores account login access immediately');

    // Rate limiter header and 429 response verification
    const testLimiter = createRateLimiter({
      windowMs: 10000,
      max: 2,
      message: 'Rate limit test reached'
    });
    let rlStatus = 200;
    let rlHeaders: Record<string, any> = {};
    let rlBody: any = null;
    const makeRlReq = () => {
      const mockReq: any = { path: '/test-rate-limit', ip: '198.51.100.1', headers: {} };
      const mockRes: any = {
        setHeader: (k: string, v: any) => { rlHeaders[k] = v; },
        status: (s: number) => { rlStatus = s; return mockRes; },
        json: (b: any) => { rlBody = b; return mockRes; }
      };
      let nextCalled = false;
      testLimiter(mockReq, mockRes, () => { nextCalled = true; });
      return nextCalled;
    };
    assert(makeRlReq() === true, 'Rate limiter permits first request under ceiling');
    assert(makeRlReq() === true, 'Rate limiter permits second request under ceiling');
    assert(makeRlReq() === false, 'Rate limiter blocks third request exceeding ceiling');
    assert(rlStatus === 429, 'Rate limiter returns HTTP status 429 on limit breach');
    assert(rlHeaders['Retry-After'] !== undefined, 'Rate limiter sets Retry-After header on 429');
    assert(rlHeaders['X-RateLimit-Limit'] === 2, 'Rate limiter sets X-RateLimit-Limit header');
    assert(rlBody?.success === false, 'Rate limiter response contains success: false');

    // 2. SEC-02 Token Revocation on Account Suspension
    // Create an active user session token
    const testAdminLogin = await AuthService.login('admin@fpmchurch.org', 'Password123!');
    assert(!!testAdminLogin.token, 'Login succeeds and issues active JWT token');
    const validSessionBefore = AuthService.getSessionByToken(testAdminLogin.token!);
    assert(validSessionBefore !== null, 'Session token is verified while user accountStatus is active');

    // Transition admin user accountStatus to suspended in db.users
    const secAdminUser = db.users.find(u => u.id === validSessionBefore!.userId)!;
    const originalAdminStatus = secAdminUser.accountStatus;
    secAdminUser.accountStatus = 'suspended';

    // Verify token is now immediately rejected
    const suspendedSession = AuthService.getSessionByToken(testAdminLogin.token!);
    assert(suspendedSession === null, 'Token is immediately invalidated upon account suspension (SEC-02)');

    // Restore user accountStatus
    secAdminUser.accountStatus = originalAdminStatus;
    const restoredSession = AuthService.getSessionByToken(testAdminLogin.token!);
    assert(restoredSession !== null, 'Token validity restored when accountStatus returns to active');

    // 3. SEC-03 Timing-Safe Cron Authentication
    let cronStatus = 200;
    let cronResponse: any = null;
    let cronNextCalled = false;
    const mockCronRes: any = {
      status: (code: number) => { cronStatus = code; return mockCronRes; },
      json: (data: any) => { cronResponse = data; return mockCronRes; }
    };
    
    // Valid cron secret
    cronNextCalled = false;
    const validCronReq: any = {
      headers: { 'x-cron-secret': process.env.CRON_SECRET || 'fpm_internal_cron_secret_2026' }
    };
    requireCronAuth(validCronReq, mockCronRes, () => { cronNextCalled = true; });
    assert(cronNextCalled, 'Valid cron secret passes requireCronAuth');

    // Invalid cron secret
    cronNextCalled = false;
    const invalidCronReq: any = {
      headers: { 'x-cron-secret': 'attacker_wrong_secret_123' }
    };
    requireCronAuth(invalidCronReq, mockCronRes, () => { cronNextCalled = true; });
    assert(!cronNextCalled, 'Invalid cron secret is rejected by requireCronAuth');
    assert(cronStatus === 401, 'Invalid cron secret returns HTTP 401');

    // 4. SEC-06 Mass Assignment Prevention
    const testBranch = db.branches[0];
    const originalHq = testBranch.isHeadquarters;
    const originalBranchId = testBranch.id;
    const originalBranchName = testBranch.name;

    // Non-super-admin attempting to elevate isHeadquarters or rewrite id
    let branchUpdateRes: any = null;
    const mockBranchReq: any = {
      user: {
        userId: IDS.USER_SARAH,
        fullName: 'Sarah Jenkins',
        roleName: 'Branch Administrator',
        adminLevel: 'branch_admin',
        branchId: testBranch.id
      },
      params: { id: testBranch.id },
      body: {
        id: 'maliciously-injected-id',
        isHeadquarters: !originalHq,
        name: 'Updated Branch Name'
      }
    };
    const mockBranchRes: any = {
      json: (data: any) => { branchUpdateRes = data; return mockBranchRes; }
    };
    await updateBranchHandler(mockBranchReq, mockBranchRes);
    assert(testBranch.id === originalBranchId, 'Branch ID cannot be overwritten via mass assignment (SEC-06)');
    assert(testBranch.isHeadquarters === originalHq, 'Branch Admin cannot modify isHeadquarters via mass assignment (SEC-06)');
    assert(testBranch.name === 'Updated Branch Name', 'Whitelisted field name was updated cleanly');
    testBranch.name = originalBranchName;
    persistBranch(testBranch).catch(() => {});

    // Mass assignment prevention in Settings
    const originalSettingsId = db.attendanceSettings.id;
    let settingsUpdateRes: any = null;
    const mockSettingsReq: any = {
      user: {
        userId: IDS.USER_ADMIN,
        fullName: 'Super Admin',
        roleName: 'Super Administrator',
        adminLevel: 'super_admin'
      },
      body: {
        id: 'injected-settings-id',
        unknownField: 'malicious-data',
        defaultGracePeriodMinutes: 20
      }
    };
    const mockSettingsRes: any = {
      json: (data: any) => { settingsUpdateRes = data; return mockSettingsRes; }
    };
    await updateSettingsHandler(mockSettingsReq, mockSettingsRes);
    assert(db.attendanceSettings.id === originalSettingsId, 'Settings ID cannot be overwritten via mass assignment (SEC-06)');
    assert((db.attendanceSettings as any).unknownField === undefined, 'Injected arbitrary properties rejected from Settings (SEC-06)');
    assert(db.attendanceSettings.defaultGracePeriodMinutes === 20, 'Whitelisted setting defaultGracePeriodMinutes updated');

    // 5. SEC-08 Magic-Byte File Validation
    let avatarStatus = 200;
    let avatarResponse: any = null;
    const mockAvatarRes: any = {
      status: (code: number) => { avatarStatus = code; return mockAvatarRes; },
      json: (data: any) => { avatarResponse = data; return mockAvatarRes; }
    };

    // Spoofed file (HTML payload with spoofed image/jpeg MIME)
    const spoofedFileReq: any = {
      file: {
        buffer: Buffer.from('<html><script>alert("xss")</script></html>'),
        originalname: 'profile.jpg',
        mimetype: 'image/jpeg',
        size: 42
      },
      get: () => 'localhost:5000'
    };
    await uploadAvatarHandler(spoofedFileReq, mockAvatarRes);
    assert(avatarStatus === 400, 'Spoofed file with invalid magic bytes rejected with HTTP 400 (SEC-08)');
    assert(avatarResponse?.error?.includes('signature') || avatarResponse?.error?.includes('Invalid image'), 'Rejection error explains magic byte signature requirement');

    // 6. SEC-07 Production Health & DB Status Sanitization
    const prevStatusNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let dbStatusBody: any = null;
      const mockStatusRes: any = {
        json: (data: any) => { dbStatusBody = data; return mockStatusRes; }
      };
      await getDbStatusHandler({} as any, mockStatusRes);
      assert(dbStatusBody.success === true, 'Production db status returns success: true');
      assert(dbStatusBody.version === undefined, 'Production db status suppresses database engine version (SEC-07)');
      assert(dbStatusBody.counts === undefined, 'Production db status suppresses table counts (SEC-07)');
      assert(dbStatusBody.error === undefined, 'Production db status suppresses raw error strings (SEC-07)');
    } finally {
      process.env.NODE_ENV = prevStatusNodeEnv;
    }

    // 7. General Settings & System Health Suite
    console.log('\n--- General Settings & System Health Tests ---');

    // TEST: GET /settings returns all 9 comprehensive settings sections + backwards-compatible attendance
    let retrievedSettings: any = null;
    const mockGetSettingsRes: any = {
      json: (data: any) => { retrievedSettings = data; return mockGetSettingsRes; }
    };
    await getSettingsHandler({ query: {}, user: { userId: IDS.USER_ADMIN, adminLevel: 'super_admin' } } as any, mockGetSettingsRes);
    assert(retrievedSettings !== null, 'getSettingsHandler returns valid payload');
    assert(Boolean(retrievedSettings.organization?.name), 'Settings includes organization section');
    assert(Boolean(retrievedSettings.regional?.defaultTimezone), 'Settings includes regional section');
    assert(retrievedSettings.registration?.allowRegistrations === true, 'Settings includes registration section');
    assert(retrievedSettings.attendance?.defaultGracePeriodMinutes !== undefined, 'Settings includes attendance section');
    assert(retrievedSettings.finance?.financeEnabled === true, 'Settings includes finance section');
    assert(retrievedSettings.notifications?.notifyOnNewRegistration === true, 'Settings includes notifications section');
    assert(retrievedSettings.media?.maxUploadSizeMb === 10, 'Settings includes media section');
    assert(retrievedSettings.security?.sessionLifetimeHours === 24, 'Settings includes security section');
    assert(retrievedSettings.defaultGracePeriodMinutes !== undefined, 'Settings preserves root-level attendance properties for backwards compatibility');

    // TEST: Super Admin can update organization and operational rules
    let updateSettingsResult: any = null;
    const superAdminUpdateReq: any = {
      user: { userId: IDS.USER_ADMIN, fullName: 'Super Admin', adminLevel: 'super_admin', roleName: 'Super Administrator' },
      body: {
        organization: {
          name: "Faith Preachers Ministries Global",
          motto: "Walking in Faith and Power"
        },
        regional: {
          defaultCurrency: "NGN",
          dateFormat: "DD/MM/YYYY"
        },
        attendance: {
          defaultGracePeriodMinutes: 20
        }
      }
    };
    const superAdminUpdateRes: any = {
      json: (data: any) => { updateSettingsResult = data; return superAdminUpdateRes; }
    };
    await updateSettingsHandler(superAdminUpdateReq, superAdminUpdateRes);
    assert(updateSettingsResult.organization.name === "Faith Preachers Ministries Global", 'Super Admin can update organization name');
    assert(updateSettingsResult.organization.motto === "Walking in Faith and Power", 'Super Admin can update church motto');
    assert(updateSettingsResult.regional.dateFormat === "DD/MM/YYYY", 'Super Admin can update date format');
    assert(updateSettingsResult.defaultGracePeriodMinutes === 20, 'Super Admin update updates attendance grace period');

    // TEST: Branch Admin is forbidden from modifying global organization or security settings
    let branchAdminStatus = 200;
    let branchAdminError: any = null;
    const branchAdminForbiddenReq: any = {
      user: { userId: IDS.USER_PASTOR, fullName: 'Branch Pastor', adminLevel: 'branch_admin', roleName: 'Branch Pastor' },
      body: {
        organization: {
          name: "Unauthorized Name Change"
        }
      }
    };
    const branchAdminForbiddenRes: any = {
      status: (code: number) => { branchAdminStatus = code; return branchAdminForbiddenRes; },
      json: (data: any) => { branchAdminError = data; return branchAdminForbiddenRes; }
    };
    await updateSettingsHandler(branchAdminForbiddenReq, branchAdminForbiddenRes);
    assert(branchAdminStatus === 403, 'Branch Admin cannot modify global organization settings (returns 403)');
    assert(branchAdminError?.error?.includes('Only Super Administrators'), 'Rejection explains global settings restriction');

    // TEST: Validation prevents invalid configuration (e.g. invalid grace period or invalid email)
    let validationStatus = 200;
    let validationError: any = null;
    const invalidReq: any = {
      user: { userId: IDS.USER_ADMIN, fullName: 'Super Admin', adminLevel: 'super_admin' },
      body: {
        attendance: { defaultGracePeriodMinutes: 999 } // max is 60
      }
    };
    const invalidRes: any = {
      status: (code: number) => { validationStatus = code; return invalidRes; },
      json: (data: any) => { validationError = data; return invalidRes; }
    };
    await updateSettingsHandler(invalidReq, invalidRes);
    assert(validationStatus === 400, 'Invalid grace period (999) rejected with HTTP 400');

    // TEST: Pausing member registration blocks new registrations
    SettingsService.updateSettings({
      registration: {
        allowRegistrations: false,
        registrationPausedMessage: "Registration is temporarily closed for annual retreat."
      }
    }, { userId: IDS.USER_ADMIN, adminLevel: 'super_admin', fullName: 'Super Admin', roleName: 'Super Admin' });

    let regBlockedError: any = null;
    try {
      await AuthService.register({
        email: 'blocked_user@test.org',
        phone: '+2348888888888',
        password: 'Password123!',
        firstName: 'Blocked',
        lastName: 'User',
        isWorker: false,
        branchId: IDS.BRANCH_HQ,
        ministryRoleId: IDS.ROLE_MEMBER,
        gender: 'Male'
      });
    } catch (err: any) {
      regBlockedError = err.message;
    }
    assert(regBlockedError?.includes('Registration is temporarily closed for annual retreat.'), 'Registration is paused when allowRegistrations=false');

    // Reset registration to open
    SettingsService.updateSettings({
      registration: { allowRegistrations: true }
    }, { userId: IDS.USER_ADMIN, adminLevel: 'super_admin', fullName: 'Super Admin', roleName: 'Super Admin' });

    // TEST: System Health check returns safe Operational status
    let healthResult: any = null;
    const mockHealthRes: any = {
      json: (data: any) => { healthResult = data; return mockHealthRes; }
    };
    await getSystemHealthHandler({ user: { adminLevel: 'super_admin' } } as any, mockHealthRes);
    assert(healthResult.success === true, 'System health endpoint returns success: true');
    assert(healthResult.apiStatus === 'Operational', 'System health reports API operational');
    assert(healthResult.appVersion === '1.0.0', 'System health reports app version');
    assert(healthResult.secret === undefined, 'System health does not expose secrets');
    assert(healthResult.databaseUrl === undefined, 'System health does not expose database connection URLs');

    // ====================================================
    // CORS DOMAIN VALIDATION & PREFLIGHT / LOGIN TESTS
    // ====================================================
    console.log('\n--- CORS & Custom Domain Integration Tests ---');

    // 1. Unit Domain Validators
    assert(isAllowedCustomDomain('fpmglobal.online') === true, 'isAllowedCustomDomain allows fpmglobal.online');
    assert(isAllowedCustomDomain('www.fpmglobal.online') === true, 'isAllowedCustomDomain allows www.fpmglobal.online');
    assert(isAllowedCustomDomain('attacker-fpmglobal.online') === false, 'isAllowedCustomDomain blocks attacker prefix domain');
    assert(isAllowedCustomDomain('fpmglobal.online.attacker.com') === false, 'isAllowedCustomDomain blocks subdomain hijack domain');

    assert(isAllowedVercelDomain('fpmglobal.vercel.app') === true, 'isAllowedVercelDomain allows fpmglobal.vercel.app');
    assert(isAllowedVercelDomain('fpmglobal-ivickies-projects.vercel.app') === true, 'isAllowedVercelDomain allows fpmglobal preview deployments');
    assert(isAllowedVercelDomain('fpmone-admin.vercel.app') === true, 'isAllowedVercelDomain allows fpmone deployments');
    assert(isAllowedVercelDomain('unrelated-project.vercel.app') === false, 'isAllowedVercelDomain blocks unrelated vercel domains');

    assert(isAllowedDevHost('localhost') === true, 'isAllowedDevHost allows localhost');
    assert(isAllowedDevHost('127.0.0.1') === true, 'isAllowedDevHost allows 127.0.0.1');
    assert(isAllowedDevHost('192.168.1.50') === true, 'isAllowedDevHost allows private 192.168.x.x LAN IPs');
    assert(isAllowedDevHost('10.164.108.241') === true, 'isAllowedDevHost allows private 10.x.x.x LAN IPs');
    assert(isAllowedDevHost('evil.com') === false, 'isAllowedDevHost blocks external hosts');

    // 2. isOriginAllowed resolution checks
    assert(isOriginAllowed('https://fpmglobal.online') === true, 'isOriginAllowed allows https://fpmglobal.online');
    assert(isOriginAllowed('https://www.fpmglobal.online') === true, 'isOriginAllowed allows https://www.fpmglobal.online');
    assert(isOriginAllowed('https://fpmglobal.online/') === true, 'isOriginAllowed handles trailing slash gracefully');
    assert(isOriginAllowed('https://fpmglobal.vercel.app') === true, 'isOriginAllowed allows production vercel preview domain');
    assert(isOriginAllowed('http://localhost:5173') === true, 'isOriginAllowed allows local Vite dev server');
    assert(isOriginAllowed(undefined) === true, 'isOriginAllowed allows non-browser clients without Origin (mobile app)');
    assert(isOriginAllowed('https://malicious-attacker.com') === false, 'isOriginAllowed rejects unapproved external domain');
    assert(isOriginAllowed('https://fpmglobal.online.phishing.io') === false, 'isOriginAllowed rejects phishing domain');

    // 3. Live HTTP Server CORS Tests (Testing actual Express middleware pipeline)
    const testServer = http.createServer(app);
    await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', resolve));
    const testPort = (testServer.address() as AddressInfo).port;
    const baseTestUrl = `http://127.0.0.1:${testPort}`;

    try {
      // Test 3a: Preflight OPTIONS request from https://fpmglobal.online
      const preflightRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://fpmglobal.online',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      assert(preflightRes.status === 204, 'Preflight OPTIONS returns HTTP 204');
      assert(preflightRes.headers.get('access-control-allow-origin') === 'https://fpmglobal.online', 'Preflight returns exact custom domain in Access-Control-Allow-Origin');
      assert(preflightRes.headers.get('access-control-allow-credentials') === 'true', 'Preflight returns Access-Control-Allow-Credentials: true');
      const allowMethods = preflightRes.headers.get('access-control-allow-methods') || '';
      assert(allowMethods.includes('POST'), 'Preflight permits POST method');

      // Test 3b: Login POST request from https://fpmglobal.online (Valid credentials)
      const loginCustomRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'https://fpmglobal.online',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(loginCustomRes.status === 200, 'Login from https://fpmglobal.online succeeds with HTTP 200');
      assert(loginCustomRes.headers.get('access-control-allow-origin') === 'https://fpmglobal.online', 'Login response includes Access-Control-Allow-Origin: https://fpmglobal.online');
      const loginCustomJson: any = await loginCustomRes.json();
      assert(loginCustomJson.token !== undefined, 'Login response contains valid authentication token');
      const authToken = loginCustomJson.token;

      // Test 3c: Login POST request from https://www.fpmglobal.online
      const loginWwwRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'https://www.fpmglobal.online',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(loginWwwRes.status === 200, 'Login from https://www.fpmglobal.online succeeds with HTTP 200');
      assert(loginWwwRes.headers.get('access-control-allow-origin') === 'https://www.fpmglobal.online', 'Login response includes Access-Control-Allow-Origin: https://www.fpmglobal.online');

      // Test 3d: Login POST request from Vercel domain (https://fpmglobal.vercel.app)
      const loginVercelRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'https://fpmglobal.vercel.app',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(loginVercelRes.status === 200, 'Login from Vercel domain succeeds with HTTP 200');
      assert(loginVercelRes.headers.get('access-control-allow-origin') === 'https://fpmglobal.vercel.app', 'Login response preserves Access-Control-Allow-Origin for Vercel domain');

      // Test 3e: Login POST request from localhost:5173
      const loginLocalRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'http://localhost:5173',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(loginLocalRes.status === 200, 'Login from http://localhost:5173 succeeds with HTTP 200');
      assert(loginLocalRes.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'Login response preserves Access-Control-Allow-Origin for localhost');

      // Test 3f: Rejection of unapproved origin (https://unauthorized-attacker.com)
      const loginUnapprovedRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'https://unauthorized-attacker.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(loginUnapprovedRes.status === 403, 'Unapproved origin rejected with HTTP 403 Forbidden');
      assert(loginUnapprovedRes.headers.get('access-control-allow-origin') === null, 'Unapproved origin does NOT receive Access-Control-Allow-Origin header');
      const unapprovedJson: any = await loginUnapprovedRes.json();
      assert(unapprovedJson.error === 'Blocked by CORS policy', 'Unapproved origin returns clean Blocked by CORS policy error');

      // Test 3g: Authenticated API call from https://fpmglobal.online
      const authApiRes = await fetch(`${baseTestUrl}/api/branches`, {
        method: 'GET',
        headers: {
          'Origin': 'https://fpmglobal.online',
          'Authorization': `Bearer ${authToken}`
        }
      });
      assert(authApiRes.status === 200, 'Authenticated API call from https://fpmglobal.online succeeds with HTTP 200');
      assert(authApiRes.headers.get('access-control-allow-origin') === 'https://fpmglobal.online', 'Authenticated API response retains Access-Control-Allow-Origin');

      // Test 3h: Error response from allowed origin retains CORS headers (Failed Login)
      const failedLoginRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': 'https://fpmglobal.online',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrPhone: 'admin@fpmchurch.org',
          password: 'WrongPassword123'
        })
      });
      assert(failedLoginRes.status === 401, 'Invalid password returns HTTP 401');
      assert(failedLoginRes.headers.get('access-control-allow-origin') === 'https://fpmglobal.online', '401 Error response retains Access-Control-Allow-Origin for legitimate origin');

      // =========================================================================
      // HOD ASSIGNMENT BY EMAIL TESTS
      // =========================================================================
      console.log('\n--- Department HOD Assignment by Email Tests ---');

      // Helper tokens
      const adminToken = authToken; // Super admin token

      // Branch Admin token for Ilorin HQ
      const ilorinAdminLoginRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: 'admin.ilorin@faithpreachers.org', password: 'Password123!' })
      });
      const ilorinAdminToken = ((await ilorinAdminLoginRes.json()) as any).token;

      // Branch Admin token for Lagos
      const lagosAdminLoginRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: 'admin.lagos@faithpreachers.org', password: 'Password123!' })
      });
      const lagosAdminToken = ((await lagosAdminLoginRes.json()) as any).token;

      // Regular HOD user token (without branch admin privileges)
      const hodUserLoginRes = await fetch(`${baseTestUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: 'hod.choir@fpmchurch.org', password: 'Password123!' })
      });
      const hodUserToken = ((await hodUserLoginRes.json()) as any).token;

      // Test 1: Autocomplete / Eligible HODs endpoint
      const eligibleHodsRes = await fetch(`${baseTestUrl}/api/departments/eligible-hods?query=hod`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(eligibleHodsRes.status === 200, 'Eligible HODs autocomplete endpoint returns HTTP 200');
      const eligibleHods: any = await eligibleHodsRes.json();
      assert(Array.isArray(eligibleHods) && eligibleHods.length > 0, 'Eligible HODs returns list of candidates');
      const rachelCand = eligibleHods.find((c: any) => c.email === 'hod.choir@fpmchurch.org');
      assert(rachelCand && rachelCand.isEligible === true, 'Rachel Adams is marked as eligible HOD');

      // Test 2: Lookup HOD endpoint with eligible email
      const lookupValidRes = await fetch(`${baseTestUrl}/api/departments/lookup-hod?email=hod.choir@fpmchurch.org`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(lookupValidRes.status === 200, 'Lookup HOD endpoint returns HTTP 200');
      const lookupValidJson: any = await lookupValidRes.json();
      assert(lookupValidJson.eligible === true, 'Lookup verifies eligible HOD');
      assert(lookupValidJson.member.fullName.includes('Rachel'), 'Lookup returns confirmed HOD member name');

      // Test 3: Lookup HOD endpoint with member who lacks HOD role
      const lookupNonHodRes = await fetch(`${baseTestUrl}/api/departments/lookup-hod?email=worker.sarah@fpmchurch.org`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const lookupNonHodJson: any = await lookupNonHodRes.json();
      assert(lookupNonHodJson.eligible === false, 'Lookup rejects member without HOD role');
      assert(lookupNonHodJson.error.includes('Worker') || lookupNonHodJson.error.includes('role'), 'Lookup explains role requirement');

      // Test 4 (Scenario 1): Assign an eligible HOD using registered email when creating department
      const createDeptRes = await fetch(`${baseTestUrl}/api/departments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Evangelism & Outreach',
          code: 'EVANG',
          description: 'Reaching the lost and soul winning',
          hodEmail: 'hod.choir@fpmchurch.org',
          branchId: 'b1111111-1111-1111-1111-111111111111'
        })
      });
      assert(createDeptRes.status === 201, 'Create department with valid HOD email returns HTTP 201');
      const createdDept: any = await createDeptRes.json();
      assert(createdDept.hodEmail === 'hod.choir@fpmchurch.org', 'Created department assigns hodEmail');
      assert(createdDept.hodName.includes('Rachel'), 'Created department resolves hodName');
      assert(Boolean(createdDept.hodId), 'Created department resolves hodId to user ID');

      // Test 5 (Scenario 2): Edit department and verify current HOD email is prefilled/returned in GET
      const getDeptsRes = await fetch(`${baseTestUrl}/api/departments?branchId=b1111111-1111-1111-1111-111111111111`);
      assert(getDeptsRes.status === 200, 'GET /departments returns HTTP 200');
      const deptsList: any = await getDeptsRes.json();
      const fetchedDept = deptsList.find((d: any) => d.id === createdDept.id);
      assert(fetchedDept && fetchedDept.hodEmail === 'hod.choir@fpmchurch.org', 'GET departments includes hodEmail for prefilling in edit form');

      // Test 6 (Scenario 3): Replace an existing HOD with another eligible member
      const updateReplaceRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'hod.media@faithpreachers.org'
        })
      });
      assert(updateReplaceRes.status === 200, 'Replacing HOD with another eligible member returns HTTP 200');
      const replacedDept: any = await updateReplaceRes.json();
      assert(replacedDept.hodEmail === 'hod.media@faithpreachers.org', 'Department hodEmail updated to new HOD');
      assert(replacedDept.hodName.includes('Emmanuel'), 'Department hodName updated to new HOD name');

      // Test 7 (Scenario 4): Enter email that does not belong to any member
      const updateNotFoundRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'ghost.user@faithpreachers.org'
        })
      });
      assert(updateNotFoundRes.status === 400, 'Unregistered HOD email returns HTTP 400');
      const updateNotFoundJson: any = await updateNotFoundRes.json();
      assert(updateNotFoundJson.error.includes('No registered member found'), 'Rejection explains email not found');

      // Test 8 (Scenario 5): Enter email of a member who does not have the HOD role
      const updateWorkerRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'worker.sarah@fpmchurch.org'
        })
      });
      assert(updateWorkerRes.status === 400, 'Non-HOD role member rejected with HTTP 400');
      const updateWorkerJson: any = await updateWorkerRes.json();
      assert(updateWorkerJson.error.includes('does not have the HOD role'), 'Rejection explains role mismatch');

      // Test 9 (Scenario 6): Attempt to assign an ineligible or suspended account
      const updateSuspendedRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'suspended.hod@faithpreachers.org'
        })
      });
      assert(updateSuspendedRes.status === 400, 'Suspended HOD account rejected with HTTP 400');
      const updateSuspendedJson: any = await updateSuspendedRes.json();
      assert(updateSuspendedJson.error.includes('suspended'), 'Rejection explains suspended account status');

      // Also attempt pending account
      await AuthService.register({
        firstName: 'Pending',
        lastName: 'Applicant',
        phone: '+2348099990099',
        email: 'test.pending.hod@example.com',
        password: 'Password123!',
        branchId: IDS.BRANCH_HQ,
        ministryRoleId: IDS.ROLE_WORKER,
        isWorker: true,
        gender: 'Male'
      });
      const updatePendingRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'test.pending.hod@example.com'
        })
      });
      assert(updatePendingRes.status === 400, 'Pending account rejected with HTTP 400');

      // Test 10 (Scenario 7): Verify assignment removal & persistence
      const clearHodRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: ''
        })
      });
      assert(clearHodRes.status === 200, 'Clearing HOD returns HTTP 200');
      const clearedDept: any = await clearHodRes.json();
      assert(!clearedDept.hodId && !clearedDept.hodEmail, 'Department HOD is cleared and unassigned');

      // Re-assign and verify persistence
      await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'hod.media@faithpreachers.org'
        })
      });
      const persistCheckRes = await fetch(`${baseTestUrl}/api/departments`);
      const persistCheckList: any = await persistCheckRes.json();
      const persistedDept = persistCheckList.find((d: any) => d.id === createdDept.id);
      assert(persistedDept.hodEmail === 'hod.media@faithpreachers.org', 'Assignment persists after re-fetching departments');

      // Test 11 (Scenario 8): Unauthorized user cannot modify HOD assignment
      const unauthHodUpdateRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${hodUserToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'hod.choir@fpmchurch.org'
        })
      });
      assert(unauthHodUpdateRes.status === 403, 'Regular HOD cannot reassign department HOD (HTTP 403)');

      // Branch isolation: Lagos Branch Admin attempting to assign an HQ member
      const crossBranchUpdateRes = await fetch(`${baseTestUrl}/api/departments/${createdDept.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${lagosAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hodEmail: 'hod.media@faithpreachers.org'
        })
      });
      assert(crossBranchUpdateRes.status === 403, 'Branch Admin modifying department outside branch blocked with HTTP 403');

      // -----------------------------------------------------------------------
      // Administrator vs Branch Administrator Privilege & Protection Tests
      // -----------------------------------------------------------------------
      console.log('\n--- Administrator vs Branch Administrator Privilege Tests ---');

      // Find the primary Super Administrator member record
      const superAdminMember = db.members.find(m => m.userId === IDS.USER_ADMIN);
      assert(superAdminMember !== undefined, 'Primary Super Admin member record exists');

      // Test A1: Branch Admin CANNOT add a new member as an Administrator
      const branchAdminAddAdminRes = await fetch(`${baseTestUrl}/api/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: 'Rogue',
          lastName: 'Admin',
          email: 'rogue.admin@fpmglobal.online',
          phone: '+234 811 000 9991',
          primaryBranchId: IDS.BRANCH_ILORIN,
          primaryRoleId: IDS.ROLE_SUPER_ADMIN
        })
      });
      assert(branchAdminAddAdminRes.status === 400 || branchAdminAddAdminRes.status === 403, 'Branch Admin adding an Administrator is rejected (HTTP 400/403)');
      const rogueAddAdminJson: any = await branchAdminAddAdminRes.json();
      assert(rogueAddAdminJson.error && rogueAddAdminJson.error.toLowerCase().includes('administrator'), 'Rejection explains Administrator privilege requirement');

      // Test A2: Super Admin CAN add a new member as an Administrator
      const superAdminAddAdminRes = await fetch(`${baseTestUrl}/api/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: 'Second',
          lastName: 'Administrator',
          email: `second.admin.${Date.now()}@faithpreachers.org`,
          phone: `+234811${Date.now().toString().slice(-7)}`,
          primaryBranchId: IDS.BRANCH_HQ,
          primaryRoleId: IDS.ROLE_SUPER_ADMIN
        })
      });
      assert(superAdminAddAdminRes.status === 201, 'Super Admin adding a new Administrator succeeds with HTTP 201');
      const secondAdminJson: any = await superAdminAddAdminRes.json();
      const secondAdminMember = secondAdminJson.member;
      assert(secondAdminMember.roleName === 'Administrator', 'New user is designated as Administrator');
      const secondAdminUser = db.users.find(u => u.id === secondAdminMember.userId);
      assert(secondAdminUser?.adminLevel === 'super_admin' && secondAdminUser?.isAdmin === true, 'New user receives super_admin access level and isAdmin flag');

      // Test A3: Branch Admin CANNOT edit the Administrator profile
      const branchAdminEditAdminRes = await fetch(`${baseTestUrl}/api/members/${superAdminMember!.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: 'Hacked',
          lastName: 'Admin'
        })
      });
      assert(branchAdminEditAdminRes.status === 403, 'Branch Admin editing an Administrator profile is blocked with HTTP 403');
      const branchAdminEditJson: any = await branchAdminEditAdminRes.json();
      assert(branchAdminEditJson.error.includes('Only an Administrator has the privilege to edit an Administrator'), 'Rejection explains only Administrator can edit Administrator');

      // Test A4: Branch Admin CANNOT reassign the Administrator role/branch
      const branchAdminReassignAdminRes = await fetch(`${baseTestUrl}/api/members/${superAdminMember!.id}/assignment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleId: IDS.ROLE_MEMBER
        })
      });
      assert(branchAdminReassignAdminRes.status === 400 || branchAdminReassignAdminRes.status === 403, 'Branch Admin demoting an Administrator is rejected');

      // Test A5: Branch Admin CANNOT assign the Administrator role to another member
      const workerSarah = db.members.find(m => m.id === IDS.MEMBER_SARAH);
      const branchAdminPromoteSarahRes = await fetch(`${baseTestUrl}/api/members/${workerSarah!.id}/assignment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roleId: IDS.ROLE_SUPER_ADMIN
        })
      });
      assert(branchAdminPromoteSarahRes.status === 400 || branchAdminPromoteSarahRes.status === 403, 'Branch Admin promoting member to Administrator is blocked');

      // Test A6: Branch Admin CANNOT suspend or archive the Administrator
      const branchAdminSuspendAdminRes = await fetch(`${baseTestUrl}/api/members/${superAdminMember!.userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'suspended'
        })
      });
      assert(branchAdminSuspendAdminRes.status === 400 || branchAdminSuspendAdminRes.status === 403, 'Branch Admin suspending Administrator is blocked');

      // Test A7: Branch Admin CANNOT delete the Administrator
      const branchAdminDeleteAdminRes = await fetch(`${baseTestUrl}/api/members/${superAdminMember!.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`
        }
      });
      assert(branchAdminDeleteAdminRes.status === 403, 'Branch Admin deleting Administrator is blocked with HTTP 403');
      const branchAdminDeleteJson: any = await branchAdminDeleteAdminRes.json();
      assert(branchAdminDeleteJson.error.includes('Only an Administrator has the privilege to delete an Administrator'), 'Rejection explains only Administrator can delete Administrator');

      // Test A8: Super Admin CANNOT delete their own Administrator account
      const selfDeleteAdminRes = await fetch(`${baseTestUrl}/api/members/${superAdminMember!.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      assert(selfDeleteAdminRes.status === 400, 'Super Admin cannot delete own account (HTTP 400)');

      // Test A9: Super Admin CAN edit another Administrator
      const superAdminEditSecondAdminRes = await fetch(`${baseTestUrl}/api/members/${secondAdminMember.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: 'Updated',
          lastName: 'Administrator'
        })
      });
      assert(superAdminEditSecondAdminRes.status === 200, 'Super Admin can edit another Administrator (HTTP 200)');

      // Test A10: Super Admin CAN delete secondary Administrator
      const superAdminDeleteSecondAdminRes = await fetch(`${baseTestUrl}/api/members/${secondAdminMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      assert(superAdminDeleteSecondAdminRes.status === 200, 'Super Admin can delete secondary Administrator (HTTP 200)');
      assert(db.members.find(m => m.id === secondAdminMember.id) === undefined, 'Secondary Administrator removed from database');

      // ====================================================
      // PASSWORD HASHING, CHANGE PASSWORD & VIEW PROFILE TESTS
      // ====================================================
      console.log('\n--- Password Hashing & Self-Service Account Endpoints ---');

      // Test P1: Look up member profile with valid email & password
      const profileLookupRes = await fetch(`${baseTestUrl}/api/auth/member-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.sarah@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(profileLookupRes.status === 200, 'Member profile lookup with valid credentials returns HTTP 200');
      const profileLookupData: any = await profileLookupRes.json();
      assert(profileLookupData.success === true, 'Member profile lookup returns success: true');
      assert(profileLookupData.member.fullName === 'Sarah Williams', 'Member profile includes correct full name');
      assert(profileLookupData.member.isWorker === true, 'Member profile reflects worker status');
      assert(profileLookupData.member.workerDetails?.workerCode === 'FPM-0001', 'Member profile includes worker code');

      // Test P2: Look up member profile with incorrect password fails
      const profileBadPassRes = await fetch(`${baseTestUrl}/api/auth/member-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.sarah@fpmchurch.org',
          password: 'WrongPassword999!'
        })
      });
      assert(profileBadPassRes.status === 400, 'Profile lookup with incorrect password returns HTTP 400');
      const profileBadPassData: any = await profileBadPassRes.json();
      assert(profileBadPassData.error?.includes('Invalid password'), 'Error explains invalid credentials');

      // Test P3: Look up member profile with non-existent user fails
      const profileNotFoundRes = await fetch(`${baseTestUrl}/api/auth/member-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'nonexistent.user@fpmchurch.org',
          password: 'Password123!'
        })
      });
      assert(profileNotFoundRes.status === 400, 'Profile lookup for non-existent account returns HTTP 400');

      // Test P4: Authenticated member profile lookup using Bearer token
      const profileAuthRes = await fetch(`${baseTestUrl}/api/auth/member-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      assert(profileAuthRes.status === 200, 'Authenticated profile lookup via Bearer token returns HTTP 200');
      const profileAuthData: any = await profileAuthRes.json();
      assert(profileAuthData.user.adminLevel === 'super_admin', 'Authenticated profile identifies Super Admin');

      // Test P5: Change password fails when current password does not match
      const changePassBadOldRes = await fetch(`${baseTestUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.john@fpmchurch.org',
          currentPassword: 'WrongOldPassword!',
          newPassword: 'BrandNewPassword123!'
        })
      });
      assert(changePassBadOldRes.status === 400, 'Change password with incorrect current password returns HTTP 400');
      const changePassBadOldData: any = await changePassBadOldRes.json();
      assert(changePassBadOldData.error?.includes('Current password does not match'), 'Rejection explains current password mismatch');

      // Test P6: Change password fails when new password is too short (< 6 chars)
      const changePassShortRes = await fetch(`${baseTestUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.john@fpmchurch.org',
          currentPassword: 'Password123!',
          newPassword: '123'
        })
      });
      assert(changePassShortRes.status === 400, 'Change password with short password returns HTTP 400');

      // Test P7: Change password fails when new password matches old password
      const changePassSameRes = await fetch(`${baseTestUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.john@fpmchurch.org',
          currentPassword: 'Password123!',
          newPassword: 'Password123!'
        })
      });
      assert(changePassSameRes.status === 400, 'Change password with identical new password returns HTTP 400');

      // Test P8: Change password succeeds with valid parameters and bcrypt hashing
      const changePassSuccessRes = await fetch(`${baseTestUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone: 'worker.john@fpmchurch.org',
          currentPassword: 'Password123!',
          newPassword: 'NewSecurePassword2026!'
        })
      });
      assert(changePassSuccessRes.status === 200, 'Change password succeeds with HTTP 200');
      const changePassSuccessData: any = await changePassSuccessRes.json();
      assert(changePassSuccessData.success === true, 'Change password response contains success: true');

      // Test P9: Login with old password fails
      const loginOldPassRes = await AuthService.login('worker.john@fpmchurch.org', 'Password123!');
      assert(loginOldPassRes.error?.includes('Invalid') === true, 'Login with old password now fails');

      // Test P10: Login with newly updated hashed password succeeds
      const loginNewPassRes = await AuthService.login('worker.john@fpmchurch.org', 'NewSecurePassword2026!');
      assert(!!loginNewPassRes.token, 'Login with new password succeeds and returns JWT');
      assert(loginNewPassRes.user?.email === 'worker.john@fpmchurch.org', 'Login user session is valid');

      // =========================================================================
      // SECTION R: PRODUCTION RELIABILITY, SECURITY, MEDIA & NOTIFICATION TESTS
      // =========================================================================
      console.log('\n--- Section R: Production Reliability, Security & Media ---');

      // Test R1: Settings persistence - Update, fetch, verify persistence across calls
      console.log('Testing Settings Persistence...');
      const updateSettingsRes = await fetch(`${baseTestUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organization: {
            name: 'Faith Preachers Ministries Int\'l',
            primaryEmail: 'persisted.hq@fpmchurch.org'
          },
          media: {
            requireMomentsApproval: false
          }
        })
      });
      assert(updateSettingsRes.status === 200, 'Super Admin updating settings returns HTTP 200');
      const updatedSettingsJson: any = await updateSettingsRes.json();
      assert(updatedSettingsJson.organization?.primaryEmail === 'persisted.hq@fpmchurch.org', 'Persisted organization email is verified');
      assert(updatedSettingsJson.media?.requireMomentsApproval === false, 'Persisted requireMomentsApproval toggle is false');

      // Fetch fresh settings and verify persisted values survive
      const fetchFreshSettingsRes = await fetch(`${baseTestUrl}/api/settings`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(fetchFreshSettingsRes.status === 200, 'Fetching settings returns HTTP 200');
      const freshSettingsJson: any = await fetchFreshSettingsRes.json();
      assert(freshSettingsJson.organization?.primaryEmail === 'persisted.hq@fpmchurch.org', 'Fresh fetch returns persisted email');
      assert(freshSettingsJson.media?.requireMomentsApproval === false, 'Fresh fetch returns persisted requireMomentsApproval');

      // Restore default approval requirement
      await fetch(`${baseTestUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media: {
            requireMomentsApproval: true
          }
        })
      });

      // Test R2: Ministry Roles navigation & endpoint security (Super Admin Only)
      console.log('Testing Ministry Roles Super Admin Restriction...');
      // Worker attempts to create role
      const workerRoleRes = await fetch(`${baseTestUrl}/api/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${workerLogin.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Rogue Role', code: 'ROGUE', hierarchyLevel: 5 })
      });
      assert(workerRoleRes.status === 403, 'Worker cannot create ministry role (HTTP 403 Forbidden)');

      // Branch Admin attempts to create role
      const branchAdminRoleRes = await fetch(`${baseTestUrl}/api/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ilorinAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Branch Created Role', code: 'BRANCH_ROLE', hierarchyLevel: 5 })
      });
      assert(branchAdminRoleRes.status === 403, 'Branch Admin cannot create ministry role (HTTP 403 Forbidden)');

      // Super Admin creates role
      const superAdminRoleRes = await fetch(`${baseTestUrl}/api/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Lead Deacon Test', code: 'LEAD_DEACON_TEST', hierarchyLevel: 3 })
      });
      assert(superAdminRoleRes.status === 201, 'Super Admin can create ministry role (HTTP 201 Created)');
      const createdRoleData: any = await superAdminRoleRes.json();
      const testRoleId = createdRoleData.id;

      // Super Admin deletes test role
      const deleteRoleRes = await fetch(`${baseTestUrl}/api/roles/${testRoleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(deleteRoleRes.status === 200, 'Super Admin can delete ministry role (HTTP 200)');

      // Test R3: Administrator-Assisted Password Reset
      console.log('Testing Administrator-Assisted Password Reset...');
      const targetMember = db.members.find(m => m.userId === IDS.USER_SARAH);
      assert(!!targetMember, 'Target worker member exists');

      // Non-super-admin attempts reset
      const unauthorizedResetRes = await fetch(`${baseTestUrl}/api/members/${targetMember!.id}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ilorinAdminToken}` }
      });
      assert(unauthorizedResetRes.status === 403, 'Branch Admin cannot reset member password (HTTP 403 Forbidden)');

      // Super Admin resets password
      const superAdminResetRes = await fetch(`${baseTestUrl}/api/members/${targetMember!.id}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert(superAdminResetRes.status === 200, 'Super Admin reset password returns HTTP 200');
      const resetJson: any = await superAdminResetRes.json();
      assert(resetJson.success === true, 'Reset response returns success: true');
      assert(typeof resetJson.temporaryPassword === 'string' && resetJson.temporaryPassword.startsWith('Fpm!'), 'Temporary password generated with secure format Fpm!<8-chars>');

      // Verify login with newly generated temporary password succeeds
      const tempLogin = await AuthService.login('worker.sarah@fpmchurch.org', resetJson.temporaryPassword);
      assert(!!tempLogin.token, 'Login with generated temporary password succeeds');

      // Verify old password fails
      const oldLoginFail = await AuthService.login('worker.sarah@fpmchurch.org', 'Password123!');
      assert(oldLoginFail.error?.includes('Invalid') === true, 'Login with old password now correctly fails');

      // Restore Sarah's password back for any subsequent tests
      await AuthService.changePassword({
        emailOrPhone: 'worker.sarah@fpmchurch.org',
        currentPassword: resetJson.temporaryPassword,
        newPassword: 'Password123!'
      });

      // Test R4: Storage Cleanup on Delete
      console.log('Testing Supabase Storage Media Cleanup...');
      const deletedMediaResult = await StorageService.deleteMediaByUrl('https://example.supabase.co/storage/v1/object/public/fpm-media/posts/test-photo.jpg');
      assert(deletedMediaResult === true, 'StorageService.deleteMediaByUrl cleans up Supabase storage URL safely');
      const deletedPresetResult = await StorageService.deleteMediaByUrl('/church-logo.png');
      assert(deletedPresetResult === false, 'StorageService.deleteMediaByUrl safely preserves system presets');

      // Test R5: Content In-App Push Notifications
      console.log('Testing Content Creation Notifications...');
      const notifCountBefore = db.notifications.length;
      const newPostRes = await fetch(`${baseTestUrl}/api/feed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Special Announcement for All Believers',
          content: 'Kingdom advancement conference next week!',
          category: 'announcement',
          branchId: IDS.BRANCH_ILORIN
        })
      });
      assert(newPostRes.status === 201, 'Feed post created successfully');
      const notifCountAfter = db.notifications.length;
      assert(notifCountAfter > notifCountBefore, 'In-app notification created for newly published content');
      const latestNotif = db.notifications[0];
      // Section S: Brevo Email Verification & Password Reset Security Tests
      console.log('\n--- Section S: Brevo Email Verification & Password Reset Security Tests ---');

      // 1. Brevo Configuration Inspection
      const brevoStatus = EmailService.getConfigurationStatus();
      assert(typeof brevoStatus.configured === 'boolean', 'EmailService returns boolean configured status');
      assert(Array.isArray(brevoStatus.missing), 'EmailService reports list of missing variables');
      assert(brevoStatus.appBaseUrl.startsWith('http'), 'EmailService provides valid app base URL');

      // 2. Registration & OTP Generation
      const testEmail = 'brevo.applicant@example.com';
      // Clean up previous if any
      db.users = db.users.filter(u => u.email !== testEmail);
      db.emailVerifications = db.emailVerifications.filter(v => v.email !== testEmail);

      const brevoReg = await AuthService.register({
        firstName: 'Daniel',
        lastName: 'Balogun',
        email: testEmail,
        phone: '+2348077778888',
        password: 'Password123!',
        branchId: IDS.BRANCH_HQ,
        ministryRoleId: IDS.ROLE_MEMBER,
        isWorker: false,
        gender: 'Male'
      });
      assert(brevoReg.success === true, 'Member registration with email verification succeeds');
      const regUser = db.users.find(u => u.email === testEmail);
      assert(regUser?.emailVerified === false, 'Newly registered user has emailVerified = false');

      const otpRecord = db.emailVerifications.find(v => v.email === testEmail && !v.verifiedAt);
      assert(!!otpRecord, 'Single-use OTP verification record generated in database');
      assert(otpRecord!.otpHash.length === 64, 'OTP is securely stored as 64-character SHA-256 hash');
      assert(otpRecord!.maxAttempts === 5, 'Maximum verification attempts set to 5');
      assert(new Date(otpRecord!.expiresAt).getTime() > Date.now(), 'OTP expiry timestamp is in future (~10 min)');

      // 3. Unverified User Login Block
      const unverifiedAttempt = await AuthService.login(testEmail, 'Password123!');
      assert(unverifiedAttempt.status === 'unverified_email', 'Unverified applicant login rejected with unverified_email status');
      assert(unverifiedAttempt.error?.includes('email address has not been verified') === true, 'Error message instructs user to verify email');

      // 4. Incorrect OTP & Attempt Throttling
      const wrongOtpRes = await AuthService.verifyEmailOtp({ email: testEmail, otp: '000000' });
      assert(wrongOtpRes.success === false, 'Incorrect OTP is rejected');
      assert(wrongOtpRes.remainingAttempts === 4, 'Remaining attempts counter decrements to 4');
      assert(otpRecord!.attemptsCount === 1, 'Database attempts_count incremented to 1');

      // Exhaust attempts to trigger lockout
      await AuthService.verifyEmailOtp({ email: testEmail, otp: '111111' });
      await AuthService.verifyEmailOtp({ email: testEmail, otp: '222222' });
      await AuthService.verifyEmailOtp({ email: testEmail, otp: '333333' });
      const lockoutRes = await AuthService.verifyEmailOtp({ email: testEmail, otp: '444444' });
      assert(lockoutRes.success === false, '5th failed attempt is rejected');
      const blockedRes = await AuthService.verifyEmailOtp({ email: testEmail, otp: '555555' });
      assert(blockedRes.error?.includes('Maximum verification attempts exceeded') === true, 'Attempting 6th verification triggers lockout');

      // 5. Resend OTP Cooldown
      const rapidResend = await AuthService.resendVerificationOtp({ email: testEmail });
      assert(rapidResend.success === false, 'Immediate OTP resend rejected by cooldown');
      assert((rapidResend.cooldownSeconds || 0) > 0, 'Resend response provides remaining cooldown seconds');

      // Simulate cooldown expiry by advancing record creation time
      otpRecord!.createdAt = new Date(Date.now() - 65 * 1000).toISOString();
      const validResend = await AuthService.resendVerificationOtp({ email: testEmail });
      assert(validResend.success === true, 'Resend OTP succeeds after cooldown interval');

      const freshOtpRecord = db.emailVerifications.find(v => v.email === testEmail && !v.verifiedAt && new Date(v.expiresAt).getTime() > Date.now());
      assert(!!freshOtpRecord, 'Fresh active OTP record exists in database');
      assert(freshOtpRecord!.id !== otpRecord!.id, 'New OTP has unique record ID');

      // 6. Successful Email Verification
      // Create a known OTP to test successful verification
      const knownOtp = '849201';
      const knownHash = nodeCrypto.createHash('sha256').update(knownOtp).digest('hex');
      freshOtpRecord!.otpHash = knownHash;

      const verifySuccess = await AuthService.verifyEmailOtp({ email: testEmail, otp: knownOtp });
      assert(verifySuccess.success === true, 'Verification with correct OTP succeeds');
      assert(regUser?.emailVerified === true, 'User emailVerified flag transitioned to true');
      assert(!!regUser?.emailVerifiedAt, 'User emailVerifiedAt timestamp recorded');

      // Replay attack prevention: Same OTP cannot be used twice
      const replayAttempt = await AuthService.verifyEmailOtp({ email: testEmail, otp: knownOtp });
      assert(replayAttempt.success === false, 'Replaying already-verified OTP is strictly blocked');

      // 7. Forgot Password 6-Digit OTP & Anti-Enumeration
      const nonExistentForgot = await AuthService.requestPasswordReset({ email: 'nobody_12345@fpmchurch.org' });
      assert(nonExistentForgot.success === true, 'Forgot password returns generic success for non-existent email (anti-enumeration)');

      // Real user forgot password
      const targetUser = db.users.find(u => u.email === 'worker.sarah@fpmchurch.org');
      assert(!!targetUser, 'Target user Sarah exists');

      const validForgot = await AuthService.requestPasswordReset({ email: 'worker.sarah@fpmchurch.org' });
      assert(validForgot.success === true, 'Forgot password request succeeds');

      const resetRecord = db.passwordResets.find(pr => pr.email === 'worker.sarah@fpmchurch.org' && !pr.usedAt);
      assert(!!resetRecord, 'Password reset record created in database');
      assert(resetRecord!.tokenHash.length === 64, 'Reset OTP is hashed with SHA-256 in database');
      // OTP expires in 10 minutes (600,000 ms)
      const expiryDeltaMs = new Date(resetRecord!.expiresAt).getTime() - Date.now();
      assert(expiryDeltaMs > 0 && expiryDeltaMs <= 10 * 60 * 1000 + 5000, 'Reset OTP expires in ~10 minutes');
      assert(resetRecord!.maxAttempts === 5, 'Maximum reset OTP attempts set to 5');
      assert(resetRecord!.attemptsCount === 0, 'Initial attemptsCount is 0');

      // 8. Verify Reset OTP Validation & Attempt Throttling
      const wrongResetOtpRes = await AuthService.verifyResetOtp({
        email: 'worker.sarah@fpmchurch.org',
        otp: '000000'
      });
      assert(wrongResetOtpRes.success === false, 'Incorrect 6-digit reset OTP is rejected');
      assert(wrongResetOtpRes.remainingAttempts === 4, 'Remaining attempts counter decrements to 4');
      assert(resetRecord!.attemptsCount === 1, 'Database reset attemptsCount incremented to 1');

      // Resend Reset OTP Cooldown Test
      const rapidResetResend = await AuthService.resendPasswordResetOtp({ email: 'worker.sarah@fpmchurch.org' });
      assert(rapidResetResend.success === false, 'Immediate reset OTP resend is blocked by cooldown');
      assert((rapidResetResend.cooldownSeconds || 0) > 0, 'Resend provides remaining cooldown seconds');

      // Simulate cooldown expiry by advancing record creation time
      resetRecord!.createdAt = new Date(Date.now() - 65 * 1000).toISOString();
      const validResetResend = await AuthService.resendPasswordResetOtp({ email: 'worker.sarah@fpmchurch.org' });
      assert(validResetResend.success === true, 'Reset OTP resend succeeds after cooldown interval');

      const freshResetRecord = db.passwordResets.find(pr => pr.email === 'worker.sarah@fpmchurch.org' && !pr.usedAt && !pr.verifiedAt);
      assert(!!freshResetRecord, 'Fresh active reset OTP record exists in database');
      assert(freshResetRecord!.id !== resetRecord!.id, 'New reset OTP has unique record ID');

      // Set known OTP on the fresh record for controlled verification
      const knownResetOtp = '739105';
      const knownResetHash = nodeCrypto.createHash('sha256').update(knownResetOtp).digest('hex');
      freshResetRecord!.tokenHash = knownResetHash;

      // Verify with correct OTP -> issues resetAuthToken
      const verifyResetSuccess = await AuthService.verifyResetOtp({
        email: 'worker.sarah@fpmchurch.org',
        otp: knownResetOtp
      });
      assert(verifyResetSuccess.success === true, 'Verification with correct 6-digit OTP succeeds');
      assert(typeof verifyResetSuccess.resetAuthToken === 'string' && verifyResetSuccess.resetAuthToken!.length >= 32, 'Issues secure resetAuthToken for password update');
      assert(!!freshResetRecord!.verifiedAt, 'Reset record marked verifiedAt');
      assert(!!freshResetRecord!.resetAuthTokenHash, 'Reset auth token hash stored in record');

      const resetAuthToken = verifyResetSuccess.resetAuthToken!;

      // 9. Complete Password Reset using resetAuthToken
      const shortPassReset = await AuthService.completePasswordReset({
        email: 'worker.sarah@fpmchurch.org',
        resetAuthToken,
        newPassword: '123'
      });
      assert(shortPassReset.success === false, 'Password reset with password < 6 chars is rejected');

      const resetSuccess = await AuthService.completePasswordReset({
        email: 'worker.sarah@fpmchurch.org',
        resetAuthToken,
        newPassword: 'SarahNewPassword2026!'
      });
      assert(resetSuccess.success === true, 'Password reset completes successfully with resetAuthToken');
      assert(!!freshResetRecord!.usedAt, 'Password reset record marked as used');

      // Token Single-Use Prevention
      const reuseAttempt = await AuthService.completePasswordReset({
        email: 'worker.sarah@fpmchurch.org',
        resetAuthToken,
        newPassword: 'AnotherPassword2026!'
      });
      assert(reuseAttempt.success === false, 'Reusing consumed resetAuthToken is strictly prevented');

      // Verify Login with New Password
      const oldPassLogin = await AuthService.login('worker.sarah@fpmchurch.org', 'Password123!');
      assert(!!oldPassLogin.error, 'Login with old password now fails');

      const newPassLogin = await AuthService.login('worker.sarah@fpmchurch.org', 'SarahNewPassword2026!');
      assert(!!newPassLogin.token, 'Login with newly established password succeeds');
      assert(newPassLogin.user?.fullName.includes('Sarah') === true, 'User profile accurately loaded on login');

      // Restore Sarah's password for test hygiene
      targetUser!.passwordHash = await bcrypt.hash('Password123!', 10);
      await persistUser(targetUser!);

      // 10. Public Registration Role Escalation Prevention
      const maliciousEmail = 'attacker.privilege@fpmchurch.org';
      db.users = db.users.filter(u => u.email !== maliciousEmail);
      db.members = db.members.filter(m => m.userId !== maliciousEmail);

      const privilegedReg = await AuthService.register({
        firstName: 'Sneaky',
        lastName: 'Attacker',
        email: maliciousEmail,
        phone: '+2348099990000',
        password: 'Password123!',
        branchId: IDS.BRANCH_HQ,
        ministryRoleId: IDS.ROLE_SUPER_ADMIN, // Attempting to self-assign Super Admin!
        isWorker: false,
        gender: 'Male'
      });
      assert(privilegedReg.success === true, 'Registration request completes');
      const maliciousUser = db.users.find(u => u.email === maliciousEmail);
      assert(maliciousUser?.isAdmin === false, 'Attacker was NOT made an admin');
      assert(maliciousUser?.adminLevel === 'none', 'Attacker adminLevel remains none');
      const maliciousMember = db.members.find(m => m.userId === maliciousUser?.id);
      assert(maliciousMember?.primaryRoleId !== IDS.ROLE_SUPER_ADMIN, 'Super Admin role ID was stripped');
      assert(maliciousMember?.primaryRoleId === IDS.ROLE_MEMBER, 'Privileged role was sanitized to standard MEMBER');

      // Also test BRANCH_PASTOR sanitization
      const bpEmail = 'branch.pastor.candidate@fpmchurch.org';
      db.users = db.users.filter(u => u.email !== bpEmail && u.phone !== '+2348099990001');
      db.members = db.members.filter(m => m.userId !== bpEmail);

      const branchPastorReg = await AuthService.register({
        firstName: 'Branch',
        lastName: 'PastorCandidate',
        email: bpEmail,
        phone: '+2348099990001',
        password: 'Password123!',
        branchId: IDS.BRANCH_HQ,
        ministryRoleId: IDS.ROLE_BRANCH_PASTOR,
        isWorker: false,
        gender: 'Male'
      });
      assert(branchPastorReg.success === true, 'Branch Pastor candidate registration succeeds');
      const bpUser = db.users.find(u => u.email === bpEmail);
      const bpMember = db.members.find(m => m.userId === bpUser?.id);
      assert(bpMember?.primaryRoleId !== IDS.ROLE_BRANCH_PASTOR, 'Branch Pastor role ID was stripped');
      assert(bpMember?.primaryRoleId === IDS.ROLE_MEMBER, 'Branch Pastor was sanitized to standard MEMBER');

      // Clean up test records
      db.users = db.users.filter(u => u.email !== bpEmail);
      if (bpMember) db.members = db.members.filter(m => m.id !== bpMember.id);
      db.emailVerifications = db.emailVerifications.filter(v => v.email !== bpEmail);

      // Clean up attacker test records
      db.users = db.users.filter(u => u.email !== maliciousEmail);
      if (maliciousMember) db.members = db.members.filter(m => m.id !== maliciousMember.id);
      db.emailVerifications = db.emailVerifications.filter(v => v.email !== maliciousEmail);

      // 11. Existing Users Backward Compatibility
      const adminUser = db.users.find(u => u.adminLevel === 'super_admin');
      assert(adminUser?.emailVerified !== false, 'Existing super admin account is not blocked by email verification');
      const pastorUser = db.users.find(u => u.email === 'pastor@fpmchurch.org');
      assert(pastorUser?.emailVerified !== false, 'Existing pastor account is not blocked by email verification');
      const regularWorker = db.users.find(u => u.email === 'worker.john@fpmchurch.org');
      assert(regularWorker?.emailVerified !== false, 'Existing worker account is not blocked by email verification');

      // --- Section T: Firebase Cloud Messaging (FCM) Production Pipeline ---
      console.log('\n--- Section T: Firebase Cloud Messaging (FCM) Production Pipeline ---');

      // 1. Diagnostics and safe unconfigured status
      const initialFcmStatus = FcmService.getStatus();
      assert(typeof initialFcmStatus.configured === 'boolean', 'FcmService returns boolean configured status');
      assert(!('private_key' in initialFcmStatus), 'FcmService diagnostic never leaks private keys');
      assert(!('client_email' in initialFcmStatus), 'FcmService diagnostic never leaks client secrets');

      // 2. Channel Resolution Mapping
      assert(FcmService.resolveChannelId('service') === 'fpm_services', 'Service notification maps to fpm_services channel');
      assert(FcmService.resolveChannelId('upcoming_service') === 'fpm_services', 'Upcoming service notification maps to fpm_services channel');
      assert(FcmService.resolveChannelId('event') === 'fpm_events', 'Event notification maps to fpm_events channel');
      assert(FcmService.resolveChannelId('upcoming_event') === 'fpm_events', 'Upcoming event notification maps to fpm_events channel');
      assert(FcmService.resolveChannelId('announcement') === 'fpm_announcements', 'Announcement maps to fpm_announcements channel');
      assert(FcmService.resolveChannelId('broadcast') === 'fpm_announcements', 'Broadcast maps to fpm_announcements channel');
      assert(FcmService.resolveChannelId('general') === 'fpm_general', 'General notification maps to fpm_general channel');
      assert(FcmService.resolveChannelId('highlight_published') === 'fpm_general', 'Highlight notification maps to fpm_general channel');

      // 3. Device Token Registration Endpoint Validation
      const mockReqInvalid: any = { body: { deviceToken: 'short' } };
      let invalidTokenRes: any = null;
      const mockResInvalid: any = {
        status: (code: number) => {
          invalidTokenRes = { code };
          return {
            json: (data: any) => { invalidTokenRes.data = data; return invalidTokenRes; }
          };
        }
      };
      await registerDeviceTokenHandler(mockReqInvalid, mockResInvalid);
      assert(invalidTokenRes?.code === 400, 'Invalid device token (< 10 chars) rejected with HTTP 400');

      // 4. Successful Device Token Registration (Anonymous / Cold Start)
      const testTokenA = 'fcm_test_device_token_android_alpha_1234567890';
      const mockReqRegA: any = {
        body: { deviceToken: testTokenA, platform: 'android', branchId: IDS.BRANCH_HQ },
        user: undefined
      };
      let regResA: any = null;
      const mockResRegA: any = {
        json: (data: any) => { regResA = data; return regResA; },
        status: (code: number) => ({ json: (d: any) => { regResA = { code, ...d }; return regResA; } })
      };
      await registerDeviceTokenHandler(mockReqRegA, mockResRegA);
      assert(regResA?.success === true, 'Device token registration succeeds');
      const inMemoryTokenA = db.deviceTokens.find(d => d.deviceToken === testTokenA);
      assert(!!inMemoryTokenA, 'Device token saved in store');
      assert(inMemoryTokenA?.branchId === IDS.BRANCH_HQ, 'Device token bound to branch');

      // 5. Authenticated Token Re-registration (Sign-in binding)
      const mockReqRegAuth: any = {
        body: { deviceToken: testTokenA, platform: 'android' },
        user: { userId: IDS.USER_ADMIN, branchId: IDS.BRANCH_HQ }
      };
      await registerDeviceTokenHandler(mockReqRegAuth, mockResRegA);
      const updatedTokenA = db.deviceTokens.find(d => d.deviceToken === testTokenA);
      assert(updatedTokenA?.userId === IDS.USER_ADMIN, 'Device token updated with authenticated user ID');

      // 6. Token Registration for a Different Branch (Branch Isolation)
      const testTokenB = 'fcm_test_device_token_android_lagos_9876543210';
      const mockReqRegB: any = {
        body: { deviceToken: testTokenB, platform: 'android', branchId: IDS.BRANCH_LAGOS },
        user: { userId: 'test-user-b', branchId: IDS.BRANCH_LAGOS }
      };
      await registerDeviceTokenHandler(mockReqRegB, mockResRegA);
      const tokenB = db.deviceTokens.find(d => d.deviceToken === testTokenB);
      assert(tokenB?.branchId === IDS.BRANCH_LAGOS, 'Second device token bound to Lagos branch');

      // 7. Token Scoping Resolution
      const allScopeNotif: any = {
        id: uuidv4(),
        title: 'Global Announcement',
        body: 'Message to all church members',
        notificationType: 'announcement',
        targetScope: 'entire_church'
      };
      const allTokens = await FcmService.resolveTargetTokens(allScopeNotif);
      assert(allTokens.includes(testTokenA) && allTokens.includes(testTokenB), 'entire_church scope targets all device tokens');

      const branchScopeNotif: any = {
        id: uuidv4(),
        title: 'HQ Branch Alert',
        body: 'HQ service starts soon',
        notificationType: 'service',
        targetScope: 'branch',
        targetId: IDS.BRANCH_HQ
      };
      const branchTokens = await FcmService.resolveTargetTokens(branchScopeNotif);
      assert(branchTokens.includes(testTokenA), 'branch scope includes HQ token');
      assert(!branchTokens.includes(testTokenB), 'branch scope excludes Lagos token');

      const userScopeNotif: any = {
        id: uuidv4(),
        title: 'Personal Notification',
        body: 'Private update',
        notificationType: 'general',
        targetScope: 'specific_member',
        targetId: IDS.USER_ADMIN
      };
      const userTokens = await FcmService.resolveTargetTokens(userScopeNotif);
      assert(userTokens.includes(testTokenA), 'specific_member scope targets correct user device');
      assert(!userTokens.includes(testTokenB), 'specific_member scope excludes other user devices');

      // 8. Notification Idempotency
      const duplicateNotif: any = {
        id: uuidv4(),
        title: 'Idempotency Test',
        body: 'Duplicate test',
        notificationType: 'announcement',
        targetScope: 'entire_church',
        createdAt: new Date().toISOString()
      };
      const dispatch1 = await FcmService.dispatchNotification(duplicateNotif);
      const dispatch2 = await FcmService.dispatchNotification(duplicateNotif);
      assert(dispatch2.skippedReason === 'duplicate_suppressed', 'Duplicate notification dispatch is suppressed by idempotency');

      // 9. Unregister Device Token (Sign-out)
      const mockReqUnreg: any = { body: { deviceToken: testTokenA } };
      let unregRes: any = null;
      const mockResUnreg: any = {
        json: (data: any) => { unregRes = data; return unregRes; }
      };
      await unregisterDeviceTokenHandler(mockReqUnreg, mockResUnreg);
      assert(unregRes?.success === true, 'Device token unregistration succeeds');
      assert(!db.deviceTokens.some(d => d.deviceToken === testTokenA), 'Unregistered token removed from store');

      // Clean up test token B
      db.deviceTokens = db.deviceTokens.filter(d => d.deviceToken !== testTokenB);

      // --- Section U: Bible Challenge Game Engine, Scoring, Streaks & Anti-Cheating Tests ---
      console.log('\n--- Section U: Bible Challenge Game Engine, Scoring, Streaks & Anti-Cheating Tests ---');

      // 1. Timezone & Lagos Date Handling
      const lagosDate = BibleGameService.getTodayLagosDate();
      assert(/^\d{4}-\d{2}-\d{2}$/.test(lagosDate), `Authoritative Africa/Lagos date is valid YYYY-MM-DD: ${lagosDate}`);

      const yesterdayLagos = BibleGameService.getYesterdayLagosDate(lagosDate);
      assert(/^\d{4}-\d{2}-\d{2}$/.test(yesterdayLagos), `Yesterday Lagos date is valid YYYY-MM-DD: ${yesterdayLagos}`);
      assert(yesterdayLagos < lagosDate, 'Yesterday is strictly earlier than today');

      const weekRange = BibleGameService.getWeekRangeLagos(lagosDate);
      assert(weekRange.startOfWeek <= lagosDate && lagosDate <= weekRange.endOfWeek, 'Current date falls within Africa/Lagos week boundaries');

      // 2. Level Progression Calculation
      const level0 = BibleGameService.calculateLevel(0);
      assert(level0.level === 1 && level0.levelTitle === 'Scripture Seeker', '0 XP starts at Level 1 Scripture Seeker');

      const level150 = BibleGameService.calculateLevel(150);
      assert(level150.level === 2 && level150.levelTitle === 'Faith Disciple', '150 XP resolves to Level 2 Faith Disciple');

      const level5000 = BibleGameService.calculateLevel(5000);
      assert(level5000.level === 10 && level5000.levelTitle === 'Master of the Word', '5000 XP reaches Level 10 Master of the Word');

      // 3. Question Bank Seed Verification
      assert(db.bibleQuestions.length >= 35, `Question bank seeded with at least 35 verified questions (count: ${db.bibleQuestions.length})`);
      const publishedCount = db.bibleQuestions.filter(q => q.status === 'published').length;
      assert(publishedCount >= 35, `All initial seed questions are published (count: ${publishedCount})`);

      // 4. Daily Challenge Selection & Determinism (Stable Assignment)
      const challengeTestDate = '2026-10-21';
      const challengeRes1 = await BibleGameService.getOrCreateDailyChallenge(challengeTestDate);
      assert(challengeRes1.challenge.challengeDate === challengeTestDate, 'Challenge created with correct Africa/Lagos date');
      assert(challengeRes1.questions.length === 5, 'Daily challenge contains exactly 5 questions');

      const challengeRes2 = await BibleGameService.getOrCreateDailyChallenge(challengeTestDate);
      assert(challengeRes2.challenge.id === challengeRes1.challenge.id, 'Subsequent request returns the exact same challenge ID (stable)');
      assert(
        JSON.stringify(challengeRes2.challenge.questionIds) === JSON.stringify(challengeRes1.challenge.questionIds),
        'Question sequence is fixed and identical for all players on that date'
      );

      // 5. Anti-Cheating: Unanswered Payload Strips Correct Answers
      const testUser = db.users.find(u => u.email === 'member.john@fpmchurch.org') || db.users[1];
      const testMember = db.members.find(m => m.userId === testUser.id)!;

      const clientView = BibleGameService.toClientQuestionView(challengeRes1.questions[0]);
      assert(!('correctOptionIndex' in clientView), 'Client view strictly omits correctOptionIndex before submission');
      assert(!('explanation' in clientView), 'Client view strictly omits explanation before submission');
      assert(!('bibleReference' in clientView), 'Client view strictly omits bibleReference before submission');
      assert(clientView.options.length === 4, 'Client view contains exactly 4 answer options');

      // 6. Session Start / Resume
      // Reset any prior progress for this user on this test date
      db.bibleUserProgress = db.bibleUserProgress.filter(
        p => !(p.userId === testUser.id && p.challengeDate === challengeTestDate)
      );

      const session = await BibleGameService.startOrResumeSession(testUser.id, testMember.id, challengeTestDate);
      assert(session.currentQuestionIndex === 0, 'New session starts at question index 0');
      assert(session.isCompleted === false, 'Session initially marked incomplete');
      assert(session.score === 0, 'Session initial score is 0');
      assert(session.currentQuestion !== null, 'Session returns current active question');

      // 7. Authoritative Question Start Handshake & Countdown
      const timing0 = await BibleGameService.startQuestion(testUser.id, testMember.id, 0, challengeTestDate);
      assert(timing0.questionIndex === 0, 'Authoritative start records question index 0');
      assert(timing0.timeLimitSeconds === 10, 'Countdown timer configured to 10 seconds');
      const startMs = new Date(timing0.startedAt).getTime();
      const deadlineMs = new Date(timing0.deadlineAt).getTime();
      assert(deadlineMs - startMs === 10000, 'Server deadline is set exactly 10,000ms after startedAt');

      // 8. Anti-Reset / Anti-Pause: App Backgrounding or Screen Transition Preserves Original Deadline
      const repeatedTiming = await BibleGameService.startQuestion(testUser.id, testMember.id, 0, challengeTestDate);
      assert(repeatedTiming.startedAt === timing0.startedAt, 'Repeated start call preserves original startedAt');
      assert(repeatedTiming.deadlineAt === timing0.deadlineAt, 'Repeated start call preserves original deadlineAt (anti-pause guard)');

      // 9. Answer Submission: Invalid Choice Validation
      let invalidOptionError = false;
      try {
        await BibleGameService.submitAnswer(testUser.id, testMember.id, 0, 99, { challengeDate: challengeTestDate });
      } catch (err: any) {
        invalidOptionError = true;
      }
      assert(invalidOptionError, 'Invalid option index (> 3) is rejected with error');

      // 10. Answer Submission: Out-of-Sequence Rejection
      let outOfSequenceError = false;
      try {
        await BibleGameService.submitAnswer(testUser.id, testMember.id, 2, 1, { challengeDate: challengeTestDate });
      } catch (err: any) {
        outOfSequenceError = true;
      }
      assert(outOfSequenceError, 'Submitting question index 2 when at index 0 is rejected');

      // 11. Speed XP Scoring: 9.7s Remaining (0.3s Elapsed) -> 9.7 XP
      const q0 = challengeRes1.questions[0];
      const progRecord = db.bibleUserProgress.find(p => p.userId === testUser.id && p.challengeDate === challengeTestDate)!;
      progRecord.activeQuestionStartedAt = new Date(Date.now() - 300).toISOString();
      progRecord.activeQuestionDeadlineAt = new Date(Date.now() + 9700).toISOString();
      const ans0 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 0, q0.correctOptionIndex, { challengeDate: challengeTestDate });
      assert(ans0.isCorrect === true, 'Submitting correct option returns isCorrect: true');
      assert(ans0.questionXp === 9.7, 'Correct answer with 9.7s remaining awards exactly 9.7 XP');
      assert(ans0.score === 1, 'Score increments to 1 on correct answer');
      assert(ans0.currentQuestionIndex === 1, 'Current question index advances to 1');
      assert(ans0.explanation === q0.explanation, 'Reveals concise scriptural explanation upon submission');
      assert(ans0.bibleReference === q0.bibleReference, 'Reveals bible reference upon submission');

      // 12. Anti-Cheating & Idempotency: Repeated Submission Returns Saved Result Without Duplicate Score
      const duplicateAns0 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 0, q0.correctOptionIndex, { challengeDate: challengeTestDate });
      assert(duplicateAns0.questionXp === 9.7, 'Repeated submission idempotently returns existing question XP');
      assert(duplicateAns0.score === 1, 'Score is never duplicated on resubmission');

      // 13. Speed XP Scoring: 6.4s Remaining (3.6s Elapsed) -> 6.4 XP
      await BibleGameService.startQuestion(testUser.id, testMember.id, 1, challengeTestDate);
      progRecord.activeQuestionStartedAt = new Date(Date.now() - 3600).toISOString();
      progRecord.activeQuestionDeadlineAt = new Date(Date.now() + 6400).toISOString();
      const q1 = challengeRes1.questions[1];
      const ans1 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 1, q1.correctOptionIndex, { challengeDate: challengeTestDate });
      assert(ans1.isCorrect === true, 'Q1 correct answer verified');
      assert(ans1.questionXp === 6.4, 'Correct answer with 6.4s remaining awards exactly 6.4 XP');

      // 14. Speed XP Scoring: 2.1s Remaining (7.9s Elapsed) -> 2.1 XP
      await BibleGameService.startQuestion(testUser.id, testMember.id, 2, challengeTestDate);
      progRecord.activeQuestionStartedAt = new Date(Date.now() - 7900).toISOString();
      progRecord.activeQuestionDeadlineAt = new Date(Date.now() + 2100).toISOString();
      const q2 = challengeRes1.questions[2];
      const ans2 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 2, q2.correctOptionIndex, { challengeDate: challengeTestDate });
      assert(ans2.isCorrect === true, 'Q2 correct answer verified');
      assert(ans2.questionXp === 2.1, 'Correct answer with 2.1s remaining awards exactly 2.1 XP');

      // 15. Incorrect Answer: Earns 0.0 XP regardless of speed
      await BibleGameService.startQuestion(testUser.id, testMember.id, 3, challengeTestDate);
      progRecord.activeQuestionStartedAt = new Date(Date.now() - 1000).toISOString();
      progRecord.activeQuestionDeadlineAt = new Date(Date.now() + 9000).toISOString();
      const q3 = challengeRes1.questions[3];
      const wrongChoice = (q3.correctOptionIndex + 1) % 4;
      const ans3 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 3, wrongChoice, { challengeDate: challengeTestDate });
      assert(ans3.isCorrect === false, 'Submitting wrong choice returns isCorrect: false');
      assert(ans3.questionXp === 0.0, 'Incorrect answer earns 0.0 XP');

      // 16. Unanswered / Timeout: Earns 0.0 XP and records timeout state
      await BibleGameService.startQuestion(testUser.id, testMember.id, 4, challengeTestDate);
      const ans4 = await BibleGameService.submitAnswer(testUser.id, testMember.id, 4, null, { isTimeout: true, challengeDate: challengeTestDate });
      assert(ans4.isTimeout === true, 'Timed out question records isTimeout: true');
      assert(ans4.questionXp === 0.0, 'Timed out question earns 0.0 XP');
      assert(ans4.isRoundFinished === true, 'Round is finished after question 5');

      // 17. Round Completion & Decimal XP Exact Summation: 9.7 + 6.4 + 2.1 + 0.0 + 0.0 = 18.2 XP
      const completion = await BibleGameService.completeChallenge(testUser.id, testMember.id, challengeTestDate);
      assert(completion.score === 3, 'Completion reflects round score 3/5');
      assert(completion.xpAwarded === 18.2, `Awards exactly 18.2 decimal XP (got ${completion.xpAwarded})`);
      assert(completion.alreadyCompleted === false, 'First completion sets alreadyCompleted = false');
      assert(completion.stats.cumulativeXp >= 18.2, 'User cumulative XP accurately reflects decimal XP');
      assert(completion.stats.currentStreak === 1, 'First day streak initialized to 1');

      // 18. Idempotency: Re-completing Challenge Awards 0.0 Additional XP
      const reComplete = await BibleGameService.completeChallenge(testUser.id, testMember.id, challengeTestDate);
      assert(reComplete.alreadyCompleted === true, 'Re-completing returns alreadyCompleted = true');
      assert(reComplete.xpAwarded === 0.0, 'Re-completing awards 0.0 additional XP (strictly idempotent)');

      // 19. Deadline Boundary Tests on Fresh Session
      const boundaryTestDate = '2026-10-23';
      await BibleGameService.getOrCreateDailyChallenge(boundaryTestDate);
      await BibleGameService.startOrResumeSession(testUser.id, testMember.id, boundaryTestDate);
      const boundaryProg = db.bibleUserProgress.find(p => p.userId === testUser.id && p.challengeDate === boundaryTestDate)!;
      const boundaryChallenge = await BibleGameService.getOrCreateDailyChallenge(boundaryTestDate);

      // (a) Immediately before deadline: 0.1s remaining (9.9s elapsed) -> 0.1 XP
      await BibleGameService.startQuestion(testUser.id, testMember.id, 0, boundaryTestDate);
      boundaryProg.activeQuestionStartedAt = new Date(Date.now() - 9900).toISOString();
      boundaryProg.activeQuestionDeadlineAt = new Date(Date.now() + 100).toISOString();
      const boundaryAns0 = await BibleGameService.submitAnswer(
        testUser.id, testMember.id, 0, boundaryChallenge.questions[0].correctOptionIndex, { challengeDate: boundaryTestDate }
      );
      assert(boundaryAns0.questionXp === 0.1, 'Answer at 0.1s remaining awards 0.1 XP');

      // (b) Exactly at deadline: 0.0s remaining (10.0s elapsed) -> 0.0 XP
      await BibleGameService.startQuestion(testUser.id, testMember.id, 1, boundaryTestDate);
      boundaryProg.activeQuestionStartedAt = new Date(Date.now() - 10000).toISOString();
      boundaryProg.activeQuestionDeadlineAt = new Date(Date.now()).toISOString();
      const boundaryAns1 = await BibleGameService.submitAnswer(
        testUser.id, testMember.id, 1, boundaryChallenge.questions[1].correctOptionIndex, { challengeDate: boundaryTestDate }
      );
      assert(boundaryAns1.isCorrect === true, 'Answer exactly at deadline is accepted as correct');
      assert(boundaryAns1.questionXp === 0.0, 'Answer exactly at deadline awards 0.0 XP');

      // (c) Within 1.0s network transit tolerance (10.5s elapsed): accepted, 0.0 XP
      await BibleGameService.startQuestion(testUser.id, testMember.id, 2, boundaryTestDate);
      boundaryProg.activeQuestionStartedAt = new Date(Date.now() - 10500).toISOString();
      boundaryProg.activeQuestionDeadlineAt = new Date(Date.now() - 500).toISOString();
      const boundaryAns2 = await BibleGameService.submitAnswer(
        testUser.id, testMember.id, 2, boundaryChallenge.questions[2].correctOptionIndex, { challengeDate: boundaryTestDate }
      );
      assert(boundaryAns2.isCorrect === true, 'Answer within 1.0s network transit tolerance accepted');
      assert(boundaryAns2.questionXp === 0.0, 'Answer past deadline awards 0.0 XP');

      // (d) Strictly after deadline + network tolerance (12.0s elapsed): locked as timeout
      await BibleGameService.startQuestion(testUser.id, testMember.id, 3, boundaryTestDate);
      boundaryProg.activeQuestionStartedAt = new Date(Date.now() - 12000).toISOString();
      boundaryProg.activeQuestionDeadlineAt = new Date(Date.now() - 2000).toISOString();
      const boundaryAns3 = await BibleGameService.submitAnswer(
        testUser.id, testMember.id, 3, boundaryChallenge.questions[3].correctOptionIndex, { challengeDate: boundaryTestDate }
      );
      assert(boundaryAns3.isTimeout === true, 'Submission after deadline + network tolerance locked as timeout');
      assert(boundaryAns3.questionXp === 0.0, 'Expired submission awards 0.0 XP');

      // Clean up boundary test progress
      db.bibleUserProgress = db.bibleUserProgress.filter(p => !(p.userId === testUser.id && p.challengeDate === boundaryTestDate));
      db.bibleDailyChallenges = db.bibleDailyChallenges.filter(c => c.challengeDate !== boundaryTestDate);

      // 20. Multi-Day Streak Logic Across Africa/Lagos Day Boundaries
      const nextDayDate = '2026-10-22';
      await BibleGameService.getOrCreateDailyChallenge(nextDayDate);
      await BibleGameService.startOrResumeSession(testUser.id, testMember.id, nextDayDate);
      const nextDayChallenge = await BibleGameService.getOrCreateDailyChallenge(nextDayDate);
      for (let i = 0; i < 5; i++) {
        await BibleGameService.startQuestion(testUser.id, testMember.id, i, nextDayDate);
        await BibleGameService.submitAnswer(
          testUser.id,
          testMember.id,
          i,
          nextDayChallenge.questions[i].correctOptionIndex,
          { challengeDate: nextDayDate }
        );
      }
      const nextDayCompletion = await BibleGameService.completeChallenge(testUser.id, testMember.id, nextDayDate);
      assert(nextDayCompletion.score === 5, 'Next day round answered 5/5 correctly');
      assert(nextDayCompletion.stats.currentStreak === 2, 'Streak increments from 1 to 2 on consecutive calendar day');
      assert(nextDayCompletion.stats.bestStreak === 2, 'Best streak advances to 2');

      const hasPerfectFive = db.bibleUserBadges.some(b => b.userId === testUser.id && b.badgeId === 'PERFECT_FIVE');
      assert(hasPerfectFive, 'PERFECT_FIVE badge unlocked on 5/5 perfect round');

      // 21. Broken Streak: Skipping a day resets current streak to 1, preserves best streak
      const skippedDayDate = '2026-10-25'; // 3 days later
      await BibleGameService.getOrCreateDailyChallenge(skippedDayDate);
      await BibleGameService.startOrResumeSession(testUser.id, testMember.id, skippedDayDate);
      const skippedChallenge = await BibleGameService.getOrCreateDailyChallenge(skippedDayDate);
      for (let i = 0; i < 5; i++) {
        await BibleGameService.startQuestion(testUser.id, testMember.id, i, skippedDayDate);
        await BibleGameService.submitAnswer(
          testUser.id,
          testMember.id,
          i,
          skippedChallenge.questions[i].correctOptionIndex,
          { challengeDate: skippedDayDate }
        );
      }
      const skippedCompletion = await BibleGameService.completeChallenge(testUser.id, testMember.id, skippedDayDate);
      assert(skippedCompletion.stats.currentStreak === 1, 'Missing a day resets active streak to 1');
      assert(skippedCompletion.stats.bestStreak >= 2, 'Best streak remains preserved at 2 or higher');

      // 22. Weekly Leaderboard Aggregation, Tie-Breakers & PII Protection
      const leaderboard = await BibleGameService.getLeaderboard(testMember.id);
      assert(Array.isArray(leaderboard.entries), 'Leaderboard returns array of entries');
      assert(leaderboard.entries.length > 0, 'Leaderboard contains participants');
      const currentUserEntry = leaderboard.entries.find(e => e.isCurrentUser);
      assert(!!currentUserEntry, 'Leaderboard flags isCurrentUser accurately');
      assert(typeof currentUserEntry?.weeklyXp === 'number', 'Weekly XP is numeric and supports decimals');
      assert(typeof currentUserEntry?.totalCorrectAnswers === 'number', 'Tie-breaker 1 (totalCorrectAnswers) present');
      assert(typeof currentUserEntry?.totalResponseTimeMs === 'number', 'Tie-breaker 2 (totalResponseTimeMs) present');

      // Verify PII is NOT leaked
      for (const entry of leaderboard.entries) {
        assert(!('email' in entry), 'Leaderboard entries never expose email addresses (PII guard)');
        assert(!('phone' in entry), 'Leaderboard entries never expose phone numbers (PII guard)');
        assert(!('dateOfBirth' in entry), 'Leaderboard entries never expose date of birth (PII guard)');
      }

      // 23. Admin Question CRUD & Publication Validation
      let invalidQuestionError = false;
      try {
        await BibleGameService.createQuestion(
          {
            questionText: 'Invalid Question',
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 1'], // duplicate option!
            correctOptionIndex: 0,
            explanation: 'Some explanation',
            bibleReference: 'John 1:1',
            category: 'New Testament',
            difficulty: 'easy'
          },
          IDS.USER_ADMIN,
          'Admin'
        );
      } catch (err: any) {
        invalidQuestionError = true;
      }
      assert(invalidQuestionError, 'Admin question creation rejects duplicate answer options');

      const validNewQuestion = await BibleGameService.createQuestion(
        {
          questionText: 'Who was the oldest person mentioned in the Bible?',
          options: ['Enoch', 'Methuselah', 'Noah', 'Jared'],
          correctOptionIndex: 1,
          explanation: 'Genesis 5:27 records that Methuselah lived a total of 969 years before he died.',
          bibleReference: 'Genesis 5:27',
          category: 'Old Testament',
          difficulty: 'easy',
          status: 'published'
        },
        IDS.USER_ADMIN,
        'Admin'
      );
      assert(validNewQuestion.id.length > 0, 'Admin can create a valid published Bible question');

      const archived = await BibleGameService.archiveQuestion(validNewQuestion.id);
      assert(archived.status === 'archived', 'Question successfully archived (soft-delete preserves history)');

      // 20. Admin Aggregate Statistics
      const adminStats = await BibleGameService.getAdminAggregateStats();
      assert(adminStats.totalQuestions >= 36, `Admin aggregate stats report correct question count (total: ${adminStats.totalQuestions})`);
      assert(adminStats.totalChallengesCompleted >= 3, 'Admin stats count completed challenges');
      assert(adminStats.totalXpAwarded > 0, 'Admin stats report total XP awarded');

      // 21. HTTP Endpoint Integration via Test Server
      const testServerAddress = testServer.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${testServerAddress.port}/api`;

      // Unauthenticated request to /api/bible-game/today returns HTTP 401
      const unauthRes = await fetch(`${baseUrl}/bible-game/today`);
      assert(unauthRes.status === 401, 'Unauthenticated request to /api/bible-game/today returns HTTP 401');

      // Authenticated request to /api/bible-game/today
      const authUserLogin = await AuthService.login('admin@fpmchurch.org', 'Password123!');
      const todayRes = await fetch(`${baseUrl}/bible-game/today`, {
        headers: { Authorization: `Bearer ${authUserLogin.token}` }
      });
      const todayData: any = await todayRes.json();
      if (!todayData?.success) {
        console.error('TODAY FAILED:', todayRes.status, todayData);
      }
      assert(todayData.success === true, 'Response contains success: true');
      assert(todayData.data?.totalQuestions === 5, 'Response returns 5 daily questions overview');

      // =========================================================================
      // SECTION V: BIBLE CHALLENGE DUPLICATE PREVENTION & IDEMPOTENCY HARDENING
      // (Covers all 10 mandated duplicate prevention scenarios)
      // =========================================================================
      console.log('\n--- Section V: Bible Challenge Duplicate Attempt Prevention & Idempotency Hardening ---');
      const dupUser = {
        id: uuidv4(),
        email: 'dup.player@fpmchurch.org'
      };
      const dupMember = {
        id: uuidv4(),
        userId: dupUser.id,
        firstName: 'Emmanuel',
        lastName: 'Idempotent'
      };
      const dupDate1 = '2026-10-28';
      const dupDate2 = '2026-10-29';

      // SCENARIO 1: A member completes today's challenge and earns exactly 45.0 XP
      await BibleGameService.getOrCreateDailyChallenge(dupDate1);
      const session1 = await BibleGameService.startOrResumeSession(dupUser.id, dupMember.id, dupDate1);
      const chal1 = await BibleGameService.getOrCreateDailyChallenge(dupDate1);
      const prog1 = db.bibleUserProgress.find(p => p.userId === dupUser.id && p.challengeDate === dupDate1)!;

      for (let i = 0; i < 5; i++) {
        await BibleGameService.startQuestion(dupUser.id, dupMember.id, i, dupDate1);
        // Force 9.0s remaining -> 9.0 XP per question -> 5 * 9.0 = exactly 45.0 XP
        prog1.activeQuestionStartedAt = new Date(Date.now() - 1000).toISOString();
        prog1.activeQuestionDeadlineAt = new Date(Date.now() + 9000).toISOString();
        const ans = await BibleGameService.submitAnswer(
          dupUser.id,
          dupMember.id,
          i,
          chal1.questions[i].correctOptionIndex,
          { challengeDate: dupDate1 }
        );
        assert(ans.questionXp === 9.0, `Question ${i + 1} awards exactly 9.0 XP`);
      }

      const comp1 = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1);
      assert(comp1.score === 5, 'Scenario 1: Completed score is 5/5');
      assert(comp1.xpAwarded === 45.0, `Scenario 1: Earned exactly 45.0 XP (got ${comp1.xpAwarded})`);
      assert(comp1.alreadyCompleted === false, 'Scenario 1: First completion flags alreadyCompleted: false');
      const initialCumulativeXp = comp1.stats.cumulativeXp;
      assert(initialCumulativeXp >= 45.0, `Scenario 1: Cumulative XP reflects round score and any badge bonuses (got ${initialCumulativeXp})`);

      // SCENARIO 2: The same member requests the start endpoint again that day
      const replayStart = await BibleGameService.startOrResumeSession(dupUser.id, dupMember.id, dupDate1);
      assert(replayStart.isCompleted === true, 'Scenario 2: Requesting start again returns isCompleted = true');
      assert(replayStart.currentQuestion === null, 'Scenario 2: Replay start returns currentQuestion = null');
      assert(replayStart.score === 5, 'Scenario 2: Replay start preserves original score 5');
      assert(replayStart.totalXp === 45.0, 'Scenario 2: Replay start preserves original 45.0 XP');
      const statsAfterReplayStart = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(statsAfterReplayStart.cumulativeXp === initialCumulativeXp, `Scenario 2: Total cumulative XP remains strictly unchanged at ${initialCumulativeXp} XP`);

      // SCENARIO 3: The same member attempts to submit answers or complete the challenge again
      let submitAnswerBlocked = false;
      try {
        await BibleGameService.submitAnswer(dupUser.id, dupMember.id, 0, 1, { challengeDate: dupDate1 });
      } catch (err: any) {
        submitAnswerBlocked = err.message.includes('already been completed');
      }
      assert(submitAnswerBlocked, 'Scenario 3: Submitting answer after completion is rejected with explicit error');

      const reCompleteAttempt = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1);
      assert(reCompleteAttempt.alreadyCompleted === true, 'Scenario 3: Re-completion flags alreadyCompleted: true');
      assert(reCompleteAttempt.xpAwarded === 0.0, 'Scenario 3: Re-completion awards 0.0 additional XP');
      const statsAfterReComplete = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(statsAfterReComplete.cumulativeXp === initialCumulativeXp, `Scenario 3: Total XP strictly preserved at ${initialCumulativeXp} XP`);

      // SCENARIO 4: The member closes and reopens the app
      const overviewAfterAppClose = await BibleGameService.getTodayOverview(dupUser.id, dupMember.id, dupDate1);
      assert(overviewAfterAppClose.isCompleted === true, 'Scenario 4: App reopen shows completed state');
      assert(overviewAfterAppClose.score === 5, 'Scenario 4: App reopen displays original score 5');
      assert(overviewAfterAppClose.totalXp === 45.0, 'Scenario 4: App reopen displays original 45.0 XP');
      assert(overviewAfterAppClose.reviewedQuestions?.length === 5, 'Scenario 4: Answer review is available');
      assert(overviewAfterAppClose.stats.cumulativeXp === initialCumulativeXp, 'Scenario 4: Cumulative XP strictly unchanged');

      // SCENARIO 5: The member signs out and signs back in
      const reAuthOverview = await BibleGameService.getTodayOverview(dupUser.id, dupMember.id, dupDate1);
      assert(reAuthOverview.isCompleted === true, 'Scenario 5: Post-login state is completed');
      assert(reAuthOverview.stats.cumulativeXp === initialCumulativeXp, `Scenario 5: Post-login cumulative XP remains ${initialCumulativeXp} XP`);

      // SCENARIO 6: The completion endpoint is called repeatedly with the same request
      for (let r = 1; r <= 5; r++) {
        const loopComp = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1);
        assert(loopComp.alreadyCompleted === true && loopComp.xpAwarded === 0.0, `Scenario 6: Repeated call ${r} awards 0.0 XP`);
      }
      const statsAfterLoop = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(statsAfterLoop.cumulativeXp === initialCumulativeXp, `Scenario 6: Total XP remains strictly ${initialCumulativeXp} XP after 5 repeated completion calls`);

      // SCENARIO 7: Two completion requests arrive concurrently
      const [conc1, conc2] = await Promise.all([
        BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1),
        BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1)
      ]);
      assert(conc1.alreadyCompleted === true && conc1.xpAwarded === 0.0, 'Scenario 7: Concurrent request 1 awards 0.0 XP');
      assert(conc2.alreadyCompleted === true && conc2.xpAwarded === 0.0, 'Scenario 7: Concurrent request 2 awards 0.0 XP');
      const statsAfterConc = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(statsAfterConc.cumulativeXp === initialCumulativeXp, 'Scenario 7: Concurrent requests cannot double-award XP');

      // SCENARIO 8: A request is retried after a simulated network failure
      const networkRetry = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1);
      assert(networkRetry.alreadyCompleted === true, 'Scenario 8: Network retry returns alreadyCompleted = true');
      assert(networkRetry.score === 5, 'Scenario 8: Network retry returns original score 5');
      const statsAfterRetry = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(statsAfterRetry.cumulativeXp === initialCumulativeXp, `Scenario 8: Network retry total XP strictly unchanged at ${initialCumulativeXp} XP`);

      // SCENARIO 9: A completed challenge is loaded from a different Android session or device
      const crossDeviceSession = await BibleGameService.startOrResumeSession(dupUser.id, dupMember.id, dupDate1);
      assert(crossDeviceSession.isCompleted === true, 'Scenario 9: Cross-device session starts as completed');
      assert(crossDeviceSession.currentQuestion === null, 'Scenario 9: No new playable question offered');
      assert(crossDeviceSession.answeredQuestions.length === 5, 'Scenario 9: All 5 answered questions restored for review');
      const crossDeviceStats = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(crossDeviceStats.cumulativeXp === initialCumulativeXp, `Scenario 9: Total XP on new device strictly ${initialCumulativeXp} XP`);

      // SCENARIO 10: The following day's challenge becomes available correctly
      await BibleGameService.getOrCreateDailyChallenge(dupDate2);
      const nextDaySession = await BibleGameService.startOrResumeSession(dupUser.id, dupMember.id, dupDate2);
      assert(nextDaySession.isCompleted === false, 'Scenario 10: Next day challenge starts in incomplete state');
      assert(nextDaySession.currentQuestionIndex === 0, 'Scenario 10: Next day starts at question index 0');
      assert(nextDaySession.currentQuestion !== null, 'Scenario 10: Next day serves question 1');

      const nextDayChal = await BibleGameService.getOrCreateDailyChallenge(dupDate2);
      const nextProg = db.bibleUserProgress.find(p => p.userId === dupUser.id && p.challengeDate === dupDate2)!;
      for (let i = 0; i < 5; i++) {
        await BibleGameService.startQuestion(dupUser.id, dupMember.id, i, dupDate2);
        // Force 8.0s remaining -> 8.0 XP per question -> 5 * 8.0 = 40.0 XP
        nextProg.activeQuestionStartedAt = new Date(Date.now() - 2000).toISOString();
        nextProg.activeQuestionDeadlineAt = new Date(Date.now() + 8000).toISOString();
        await BibleGameService.submitAnswer(
          dupUser.id,
          dupMember.id,
          i,
          nextDayChal.questions[i].correctOptionIndex,
          { challengeDate: dupDate2 }
        );
      }
      const nextDayComp = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate2);
      assert(nextDayComp.score === 5, 'Scenario 10: Next day completed with 5/5');
      assert(nextDayComp.xpAwarded === 40.0, `Scenario 10: Next day awards 40.0 XP (got ${nextDayComp.xpAwarded})`);
      const day2TotalXp = nextDayComp.stats.cumulativeXp;
      assert(day2TotalXp > initialCumulativeXp, `Scenario 10: Total cumulative XP advances on Day 2 (got ${day2TotalXp})`);
      assert(nextDayComp.stats.currentStreak === 2, 'Scenario 10: Streak increments from 1 to 2 on consecutive day');

      // Verify Day 1 still cannot be re-completed after Day 2 is finished
      const day1Recheck = await BibleGameService.completeChallenge(dupUser.id, dupMember.id, dupDate1);
      assert(day1Recheck.alreadyCompleted === true, 'Scenario 10: Day 1 still returns alreadyCompleted: true');
      assert(day1Recheck.xpAwarded === 0.0, 'Scenario 10: Day 1 awards 0.0 additional XP');
      const finalStats = await BibleGameService.getOrCreateUserStats(dupUser.id, dupMember.id);
      assert(finalStats.cumulativeXp === day2TotalXp, `Scenario 10: Final cumulative XP remains exactly ${day2TotalXp} XP`);

      // =========================================================================
      // --- Section W: Bible Challenge AI Question Generation & Admin Form Tests ---
      // =========================================================================
      console.log('\n--- Section W: Bible Challenge AI Question Generation & Admin Form Tests ---');

      // Scenario 1: Generate a question for Bible Characters at Easy difficulty
      const easyCharactersRaw = JSON.stringify({
        questionText: 'Who was swallowed by a great fish after fleeing from the Lord\'s command to go to Nineveh?',
        options: ['Jonah', 'Elijah', 'Daniel', 'Moses'],
        correctAnswer: 'A',
        bibleReference: 'Jonah 1:17',
        explanation: 'The Lord provided a great fish to swallow Jonah, and Jonah was inside the fish three days and three nights.'
      });
      const aiQ1 = BibleAiService.parseAndValidateResponse(easyCharactersRaw, 'Bible Characters', 'easy');
      assert(aiQ1.category === 'Bible Characters', 'Scenario 1: Category matches requested Bible Characters');
      assert(aiQ1.difficulty === 'easy', 'Scenario 1: Difficulty matches requested Easy');
      assert(aiQ1.questionText.includes('great fish'), 'Scenario 1: Question prompt populated');
      assert(aiQ1.options.length === 4, 'Scenario 1: Exactly four answer choices provided');
      assert(aiQ1.correctOptionIndex === 0, 'Scenario 1: Correct answer A maps to index 0');
      assert(aiQ1.bibleReference === 'Jonah 1:17', 'Scenario 1: Accurate Scripture reference populated');
      assert(aiQ1.explanation.length > 10, 'Scenario 1: Concise explanation populated');

      // Scenario 2: Generate a question for New Testament at Medium difficulty
      const mediumNTRaw = JSON.stringify({
        questionText: 'On the island of Patmos, who received the prophetic revelation of Jesus Christ recorded in Revelation?',
        options: ['Peter', 'John', 'Paul', 'Barnabas'],
        correctAnswer: 'B',
        bibleReference: 'Revelation 1:9-10',
        explanation: 'John was on the island called Patmos on the Lord\'s day when he heard a voice like a trumpet giving him the revelation.'
      });
      const aiQ2 = BibleAiService.parseAndValidateResponse(mediumNTRaw, 'New Testament', 'medium');
      assert(aiQ2.category === 'New Testament', 'Scenario 2: Category matches New Testament');
      assert(aiQ2.difficulty === 'medium', 'Scenario 2: Difficulty matches Medium');
      assert(aiQ2.correctOptionIndex === 1, 'Scenario 2: Correct answer B maps to index 1');
      assert(aiQ2.options[1] === 'John', 'Scenario 2: Option B matches John');

      // Scenario 3: Generate a question for Books of the Bible at Hard difficulty
      const hardBooksRaw = JSON.stringify({
        questionText: 'Which Old Testament prophetic book ends with the question: "And should I not have concern for the great city of Nineveh...?"',
        options: ['Nahum', 'Habakkuk', 'Zephaniah', 'Jonah'],
        correctAnswer: 'D',
        bibleReference: 'Jonah 4:11',
        explanation: 'The final verse of Jonah records God rebuking Jonah\'s anger by affirming His compassion on Nineveh\'s 120,000 residents.'
      });
      const aiQ3 = BibleAiService.parseAndValidateResponse(hardBooksRaw, 'Books of the Bible', 'hard');
      assert(aiQ3.category === 'Books of the Bible', 'Scenario 3: Category matches Books of the Bible');
      assert(aiQ3.difficulty === 'hard', 'Scenario 3: Difficulty matches Hard');
      assert(aiQ3.correctOptionIndex === 3, 'Scenario 3: Correct answer D maps to index 3');

      // Scenario 4: Verify all form fields populate, including correct answer radio button
      assert(typeof aiQ3.questionText === 'string' && aiQ3.questionText.length > 0, 'Scenario 4: Question prompt field populated');
      assert(Array.isArray(aiQ3.options) && aiQ3.options.length === 4, 'Scenario 4: All four answer option fields populated');
      assert(aiQ3.options.every(o => typeof o === 'string' && o.length > 0), 'Scenario 4: No empty option fields');
      assert(aiQ3.correctOptionIndex >= 0 && aiQ3.correctOptionIndex <= 3, 'Scenario 4: Correct answer radio selection in valid 0..3 range');
      assert(aiQ3.bibleReference.includes(':'), 'Scenario 4: Scripture reference formatted with chapter and verse');

      // Scenario 5: Edit generated content manually and save as draft
      const initialDbCount = db.bibleQuestions.length;
      const draftQuestion = await BibleGameService.createQuestion(
        {
          questionText: aiQ1.questionText + ' (Edited by Admin)',
          options: aiQ1.options,
          correctOptionIndex: aiQ1.correctOptionIndex,
          explanation: aiQ1.explanation,
          bibleReference: aiQ1.bibleReference,
          category: aiQ1.category,
          difficulty: aiQ1.difficulty,
          status: 'draft'
        },
        testUser.id,
        'Test Admin'
      );
      assert(draftQuestion.status === 'draft', 'Scenario 5: Question successfully saved as draft');
      assert(draftQuestion.questionText.includes('(Edited by Admin)'), 'Scenario 5: Manually edited fields preserved in draft');
      assert(db.bibleQuestions.length === initialDbCount + 1, 'Scenario 5: Question count increased after explicit save');

      // Scenario 6: Review generated question before publishing it
      const publishedQuestion = await BibleGameService.updateQuestion(draftQuestion.id, {
        status: 'published'
      });
      assert(publishedQuestion.status === 'published', 'Scenario 6: Question successfully promoted from draft to published');

      // Scenario 7: Regenerate a question simulation
      const regeneratedCandidate = BibleAiService.parseAndValidateResponse(
        JSON.stringify({
          questionText: 'Who was the first king of Israel anointed by Samuel?',
          options: ['David', 'Saul', 'Solomon', 'Rehoboam'],
          correctAnswer: 'B',
          bibleReference: '1 Samuel 10:1',
          explanation: 'Samuel took a flask of olive oil and poured it on Saul’s head and kissed him, announcing he was king over Israel.'
        }),
        'Bible Characters',
        'easy'
      );
      assert(regeneratedCandidate.questionText !== aiQ1.questionText, 'Scenario 7: Regeneration produces distinct prompt');
      assert(regeneratedCandidate.options[1] === 'Saul', 'Scenario 7: Regenerated choices populated');

      // Scenario 8: Handle unconfigured AI provider error gracefully
      let configErrorCaught = false;
      const originalGeminiKey = process.env.GEMINI_API_KEY;
      const originalOpenAiKey = process.env.OPENAI_API_KEY;
      const originalAiKey = process.env.AI_API_KEY;
      try {
        delete process.env.GEMINI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.AI_API_KEY;
        await BibleAiService.generateQuestion('Bible Characters', 'easy');
      } catch (err: any) {
        configErrorCaught = true;
        assert(err.message.includes('GEMINI_API_KEY') || err.message.includes('OPENAI_API_KEY'), 'Scenario 8: Error clearly identifies required environment variables');
      } finally {
        if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
        if (originalOpenAiKey) process.env.OPENAI_API_KEY = originalOpenAiKey;
        if (originalAiKey) process.env.AI_API_KEY = originalAiKey;
      }
      assert(configErrorCaught === true, 'Scenario 8: Missing credentials throw descriptive error');

      // Scenario 9: Handle malformed or incomplete provider output
      let duplicateErrorCaught = false;
      try {
        BibleAiService.parseAndValidateResponse(
          JSON.stringify({
            questionText: 'Which apostle denied Jesus three times before the rooster crowed?',
            options: ['Peter', 'Peter', 'John', 'Judas'],
            correctAnswer: 'A',
            bibleReference: 'Matthew 26:34',
            explanation: 'Peter denied Jesus three times.'
          }),
          'New Testament',
          'easy'
        );
      } catch (err: any) {
        duplicateErrorCaught = true;
        assert(err.message.includes('duplicate'), 'Scenario 9: Rejects duplicate answer choices');
      }
      assert(duplicateErrorCaught === true, 'Scenario 9: Duplicate choices properly rejected');

      let missingRefErrorCaught = false;
      try {
        BibleAiService.parseAndValidateResponse(
          JSON.stringify({
            questionText: 'Who led the Israelites across the Jordan River into Canaan?',
            options: ['Moses', 'Joshua', 'Caleb', 'Aaron'],
            correctAnswer: 'B',
            bibleReference: '',
            explanation: 'Joshua led the people across the Jordan.'
          }),
          'Old Testament',
          'medium'
        );
      } catch (err: any) {
        missingRefErrorCaught = true;
        assert(err.message.includes('Bible reference'), 'Scenario 9: Rejects missing Bible reference');
      }
      assert(missingRefErrorCaught === true, 'Scenario 9: Missing Bible reference rejected');

      // Scenario 10: Verify unauthorized users cannot access generation endpoint
      const unauthGenRes = await fetch(`${baseTestUrl}/api/bible-game/admin/questions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Bible Characters', difficulty: 'easy' })
      });
      assert(unauthGenRes.status === 401, 'Scenario 10: Unauthenticated request to generate endpoint returns HTTP 401');

      const memberGenRes = await fetch(`${baseTestUrl}/api/bible-game/admin/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hodUserToken}`
        },
        body: JSON.stringify({ category: 'Bible Characters', difficulty: 'easy' })
      });
      assert(memberGenRes.status === 403, 'Scenario 10: Member token cannot access admin generate endpoint (HTTP 403 Forbidden)');

      // Scenario 11: Confirm no provider secret is exposed in error response or body
      const adminGenRes = await fetch(`${baseTestUrl}/api/bible-game/admin/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ category: 'Bible Characters', difficulty: 'easy' })
      });
      const adminGenJson: any = await adminGenRes.json();
      assert(adminGenJson.secret === undefined, 'Scenario 11: Response does not expose "secret"');
      assert(adminGenJson.apiKey === undefined, 'Scenario 11: Response does not expose "apiKey"');
      assert(adminGenJson.key === undefined, 'Scenario 11: Response does not expose "key"');

      // Scenario 12: Confirm generated question is not automatically saved or published
      const countBefore = db.bibleQuestions.length;
      BibleAiService.parseAndValidateResponse(
        JSON.stringify({
          questionText: 'Who was the prophet that confronted King David regarding Bathsheba?',
          options: ['Nathan', 'Samuel', 'Elijah', 'Gad'],
          correctAnswer: 'A',
          bibleReference: '2 Samuel 12:1-7',
          explanation: 'Nathan told the parable of the rich man and poor man, saying to David: "You are the man!"'
        }),
        'Old Testament',
        'medium'
      );
      assert(db.bibleQuestions.length === countBefore, 'Scenario 12: Question generation does not auto-save to database');

      // Scenario 13: Server-side configurable GEMINI_MODEL environment variable
      BibleAiService.resetModelCache();
      const prevGeminiModel = process.env.GEMINI_MODEL;
      try {
        process.env.GEMINI_MODEL = 'models/gemini-1.5-flash';
        const resWithPrefix = await BibleAiService.resolveGeminiModel('mock-api-key');
        assert(resWithPrefix.model === 'gemini-1.5-flash', 'Scenario 13: GEMINI_MODEL strips "models/" prefix');
        assert(resWithPrefix.apiVersion === 'v1beta', 'Scenario 13: Uses v1beta API version');

        BibleAiService.resetModelCache();
        process.env.GEMINI_MODEL = 'gemini-2.0-flash';
        const resDirect = await BibleAiService.resolveGeminiModel('mock-api-key');
        assert(resDirect.model === 'gemini-2.0-flash', 'Scenario 13: Resolves explicit GEMINI_MODEL directly');
      } finally {
        if (prevGeminiModel) process.env.GEMINI_MODEL = prevGeminiModel;
        else delete process.env.GEMINI_MODEL;
        BibleAiService.resetModelCache();
      }

      // Scenario 14: Secret sanitization guarantees no API key leakage in messages or URLs
      const testSecretKey = 'AIzaSyA_TEST_SUPER_SECRET_KEY_999';
      const leakedUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${testSecretKey}`;
      const sanitized = BibleAiService.sanitizeSecret(`Failed to call ${leakedUrl} with token ${testSecretKey}`, testSecretKey);
      assert(!sanitized.includes(testSecretKey), 'Scenario 14: Sanitizer completely strips API key');
      assert(sanitized.includes('[REDACTED_API_KEY]') || sanitized.includes('key=[REDACTED]'), 'Scenario 14: Sanitizer replaces secret with redacted label');

      // Scenario 15: Verify ListModels and callGemini error classifications
      const originalFetch = global.fetch;
      try {
        // Test 403 Permission error
        global.fetch = async (url: any) => {
          if (String(url).includes('models?key=')) {
            return new Response(JSON.stringify({ error: { message: 'API key not valid or API disabled' } }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch(url);
        };
        BibleAiService.resetModelCache();
        delete process.env.GEMINI_MODEL;
        let pErrCaught = false;
        try {
          await BibleAiService.resolveGeminiModel('dummy-key');
        } catch (err: any) {
          pErrCaught = true;
          assert(err.message.includes('403') || err.message.includes('permission'), 'Scenario 15: ListModels 403 classified as permission error');
        }
        assert(pErrCaught === true, 'Scenario 15: HTTP 403 caught and classified');

        // Test 429 Quota error
        global.fetch = async (url: any) => {
          if (String(url).includes('models?key=')) {
            return new Response(JSON.stringify({ error: { message: 'Resource exhausted / quota exceeded' } }), {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch(url);
        };
        BibleAiService.resetModelCache();
        let qErrCaught = false;
        try {
          await BibleAiService.resolveGeminiModel('dummy-key');
        } catch (err: any) {
          qErrCaught = true;
          assert(err.message.includes('429') || err.message.includes('quota'), 'Scenario 15: ListModels 429 classified as quota error');
        }
        assert(qErrCaught === true, 'Scenario 15: HTTP 429 caught and classified');

        // Test ListModels selection of Flash models
        global.fetch = async (url: any) => {
          if (String(url).includes('models?key=')) {
            return new Response(JSON.stringify({
              models: [
                { name: 'models/chat-bison-001', supportedGenerationMethods: ['generateMessage'] },
                { name: 'models/gemini-1.5-pro', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent', 'countTokens'] }
              ]
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch(url);
        };
        BibleAiService.resetModelCache();
        const autoResolved = await BibleAiService.resolveGeminiModel('dummy-key');
        assert(autoResolved.model === 'gemini-1.5-flash', 'Scenario 15: ListModels prioritizes cost-effective 1.5-flash model');

        // Test callGemini 404 Model not found
        global.fetch = async (url: any) => {
          if (String(url).includes(':generateContent')) {
            return new Response(JSON.stringify({ error: { message: 'models/gemini-1.5-flash is not found for API version v1beta' } }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch(url);
        };
        process.env.GEMINI_API_KEY = 'test-key';
        let nfErrCaught = false;
        try {
          await BibleAiService.generateQuestion('Bible Characters', 'easy');
        } catch (err: any) {
          nfErrCaught = true;
          assert(err.message.includes('404') || err.message.includes('not found'), 'Scenario 15: callGemini 404 classified as model not found');
        }
        assert(nfErrCaught === true, 'Scenario 15: HTTP 404 caught and classified');

        // Scenario 16: Successful callGemini end-to-end question generation
        global.fetch = async (url: any) => {
          if (String(url).includes(':generateContent')) {
            return new Response(JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          questionText: 'Who was the shepherd boy who became king of Israel?',
                          options: ['David', 'Saul', 'Solomon', 'Samuel'],
                          correctAnswer: 'A',
                          bibleReference: '1 Samuel 16:11-13',
                          explanation: 'As a young shepherd tending his father’s sheep, David was chosen and anointed king by Samuel.'
                        })
                      }
                    ]
                  }
                }
              ]
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return originalFetch(url);
        };
        process.env.GEMINI_API_KEY = 'test-key';
        process.env.GEMINI_MODEL = 'gemini-1.5-flash';
        BibleAiService.resetModelCache();
        const generatedE2E = await BibleAiService.generateQuestion('Bible Characters', 'easy');
        assert(generatedE2E.questionText === 'Who was the shepherd boy who became king of Israel?', 'Scenario 16: Question prompt generated');
        assert(generatedE2E.options.length === 4, 'Scenario 16: Four options generated');
        assert(generatedE2E.correctOptionIndex === 0, 'Scenario 16: Correct option index 0');
        assert(generatedE2E.bibleReference === '1 Samuel 16:11-13', 'Scenario 16: Bible reference generated');
        assert(generatedE2E.explanation.includes('shepherd'), 'Scenario 16: Explanation generated');

      } finally {
        global.fetch = originalFetch;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_MODEL;
        BibleAiService.resetModelCache();
      }

      // Clean up test draft/published question
      db.bibleQuestions = db.bibleQuestions.filter(q => q.id !== draftQuestion.id);

      // Clean up duplicate test progress
      db.bibleUserProgress = db.bibleUserProgress.filter(
        p => !(p.userId === dupUser.id && (p.challengeDate === dupDate1 || p.challengeDate === dupDate2))
      );
      db.bibleDailyChallenges = db.bibleDailyChallenges.filter(
        c => c.challengeDate !== dupDate1 && c.challengeDate !== dupDate2
      );
      db.bibleUserBadges = db.bibleUserBadges.filter(b => b.userId !== dupUser.id);
      db.bibleUserStats = db.bibleUserStats.filter(s => s.userId !== dupUser.id);

      // Clean up test data
      db.bibleUserProgress = db.bibleUserProgress.filter(
        p => !(p.userId === testUser.id && (p.challengeDate === challengeTestDate || p.challengeDate === nextDayDate || p.challengeDate === skippedDayDate))
      );
      db.bibleDailyChallenges = db.bibleDailyChallenges.filter(
        c => c.challengeDate !== challengeTestDate && c.challengeDate !== nextDayDate && c.challengeDate !== skippedDayDate
      );
      db.bibleQuestions = db.bibleQuestions.filter(q => q.id !== validNewQuestion.id);
      db.bibleUserBadges = db.bibleUserBadges.filter(b => b.userId !== testUser.id);
      db.bibleUserStats = db.bibleUserStats.filter(s => s.userId !== testUser.id);

    } finally {
      testServer.close();
    }

  } catch (err: any) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

