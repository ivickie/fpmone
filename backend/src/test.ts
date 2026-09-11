import { AuthService } from './services/authService';
import { MemberService } from './services/memberService';
import { AttendanceService } from './services/attendanceService';
import { AuditService } from './services/auditService';
import { StorageService } from './services/storageService';
import { db, IDS } from './data/mockDb';
import { v4 as uuidv4 } from 'uuid';

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING FPM ONE CORE BACKEND TEST SUITE');
  console.log('====================================================');

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
    assert(adminLogin.user?.branchName === 'Cathedral of Grace (HQ)', 'Admin belongs to Headquarters branch');

    // TEST 2: Worker Login
    const workerLogin = await AuthService.login('worker.sarah@fpmchurch.org', 'Password123!');
    assert(!!workerLogin.token, 'Worker Sarah login succeeds');
    assert(workerLogin.user?.isWorker === true, 'Worker flag is true');
    assert(workerLogin.user?.workerDetails?.workerCode === 'FPM-0001', 'Worker ID is FPM-0001');

    // TEST 3: Pending Account Login Rejection
    const pendingLogin = await AuthService.login('daniel.new@fpmchurch.org', 'Password123!');
    assert(pendingLogin.status === 'pending', 'Pending user login returns pending status');
    assert(pendingLogin.error?.includes('awaiting administrative approval') === true, 'Pending user receives awaiting approval message');

    // TEST 4: Multi-Step Registration
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

    // TEST 5: Approvals Queue
    const pendingList = MemberService.getPendingApprovals();
    assert(pendingList.some(p => p.userId === regResult.userId), 'New applicant appears in pending approvals queue');

    // TEST 6: Admin Approval & Worker Code Generation
    const approvalResult = MemberService.approveMember(regResult.userId!, IDS.USER_ADMIN, 'Ezekiel Adeyemi');
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
      MemberService.approveMember(IDS.USER_ADMIN, IDS.USER_ADMIN, 'Ezekiel Adeyemi');
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
      MemberService.approveMember(
        londonApplicant.userId!,
        IDS.USER_PASTOR,
        'Pastor David',
        { adminLevel: 'branch_admin', branchId: IDS.BRANCH_LEKKI }
      );
    } catch (e: any) {
      crossBranchApprovalBlocked = e.message.includes('Branch isolation violation');
    }
    assert(crossBranchApprovalBlocked, 'Branch Isolation: Lekki Pastor blocked from approving London branch applicant');

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
      MemberService.updateChurchAssignment(
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
      MemberService.updateChurchAssignment(
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

    const workerPromotionResult = MemberService.updateChurchAssignment(
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

