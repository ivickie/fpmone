import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mockDb';
import { AttendanceRecord, AttendanceStatus, ClockInMethod, ClockOutSource } from '../types';
import { AuditService } from './auditService';
import { persistAttendanceRecord } from '../db/sync';

export interface ClockInParams {
  workerIdentifier: string; // Worker ID (UUID), Worker Code (e.g. FPM-0001), or QR Token
  serviceId: string;
  method: ClockInMethod;
  pin?: string;
  qrCodeToken?: string;
  scannedPayload?: string;
  overrideTimestamp?: Date;
}

export class AttendanceService {
  /**
   * Authoritative Server-Side Clock In
   */
  public static async clockIn(params: ClockInParams): Promise<AttendanceRecord> {
    const serverNow = params.overrideTimestamp || new Date();
    const serverTimestamp = serverNow.toISOString();
    const todayDate = serverTimestamp.split('T')[0];

    // 1. Resolve Worker
    const worker = db.workers.find(w => 
      w.id === params.workerIdentifier ||
      w.workerIdCode.toUpperCase() === params.workerIdentifier.toUpperCase() ||
      w.qrCodeToken === params.workerIdentifier
    );

    if (!worker) {
      throw new Error('Invalid Worker ID or QR code.');
    }

    // 2. Validate Worker and User Account Status
    if (worker.workerStatus !== 'active') {
      throw new Error(`Worker status is ${worker.workerStatus}. Clock-in not permitted.`);
    }

    const member = db.members.find(m => m.id === worker.memberId);
    if (!member) {
      throw new Error('Associated member record not found.');
    }

    const user = db.users.find(u => u.id === member.userId);
    if (!user || user.accountStatus !== 'active') {
      throw new Error('User account is not active.');
    }

    // 3. If PIN method is used, verify PIN
    if (params.method === 'pin') {
      if (!params.pin) {
        throw new Error('Worker security PIN is required for PIN clock-in.');
      }
      const isPinValid = await bcrypt.compare(params.pin, worker.pinHash);
      if (!isPinValid) {
        throw new Error('Invalid Worker security PIN.');
      }
    }

    // 4. Resolve Service
    const service = db.services.find(s => s.id === params.serviceId && s.status === 'active');
    if (!service) {
      throw new Error('Service schedule not found or inactive.');
    }

    // Branch Alignment Validation: Worker must belong to the service's branch
    if (member.primaryBranchId !== service.branchId) {
      const workerBranch = db.branches.find(b => b.id === member.primaryBranchId);
      throw new Error(`Branch mismatch: Worker is assigned to ${workerBranch?.name || 'another branch'} and cannot clock in for ${service.name}.`);
    }

    // Validate QR code match if method is qr/qr_scan and token/payload provided
    if ((params.method === 'qr' || params.method === 'qr_scan') && (params.qrCodeToken || params.scannedPayload)) {
      const payload = (params.scannedPayload || params.qrCodeToken || '').trim();
      const isValid = 
        payload === service.id ||
        payload === `FPM-SVC:${service.id}` ||
        payload === `FPM-SVC-${service.id}` ||
        (service.qrCodeToken && payload === service.qrCodeToken) ||
        (payload.includes(service.id));
      if (!isValid && service.qrCodeToken) {
        throw new Error(`Scanned QR badge does not match schedule for ${service.name}.`);
      }
    }

    // 5. Prevent Duplicate Clock-in
    const existing = db.attendanceRecords.find(r => 
      r.workerId === worker.id &&
      r.serviceId === service.id &&
      r.serviceDate === todayDate
    );

    if (existing && existing.clockInTime) {
      throw new Error(`Duplicate clock-in detected: Worker already clocked in for this service today at ${new Date(existing.clockInTime).toLocaleTimeString()}.`);
    }

    // 6. Calculate Punctuality (Grace Period)
    // Construct expected service start time on server date in UTC to ensure deterministic evaluation across all server timezones
    const [startH, startM] = service.startTime.split(':').map(Number);
    const [year, month, day] = todayDate.split('-').map(Number);
    const serviceStartTime = new Date(Date.UTC(year, month - 1, day, startH, startM, 0, 0));

    const gracePeriodMs = (service.gracePeriodMinutes || 15) * 60 * 1000;
    const graceCutoffTime = new Date(serviceStartTime.getTime() + gracePeriodMs);

    let calculatedStatus: AttendanceStatus = 'present';
    if (serverNow.getTime() > graceCutoffTime.getTime()) {
      calculatedStatus = 'late';
    }

    // 7. Record or Update Attendance
    let record: AttendanceRecord;
    if (existing) {
      // If an absent record was pre-generated, update it
      existing.clockInTime = serverTimestamp;
      existing.clockInMethod = params.method;
      existing.status = calculatedStatus;
      existing.updatedAt = serverTimestamp;
      record = existing;
    } else {
      record = {
        id: uuidv4(),
        workerId: worker.id,
        serviceId: service.id,
        branchId: service.branchId,
        serviceDate: todayDate,
        clockInTime: serverTimestamp,
        clockInMethod: params.method,
        status: calculatedStatus,
        isAutoClockOut: false,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp
      };
      db.attendanceRecords.push(record);
    }
    persistAttendanceRecord(record).catch(() => {});

    // Log to Audit Trail
    AuditService.log(
      `${member.firstName} ${member.lastName}`,
      'worker',
      'WORKER_CLOCK_IN',
      'attendance',
      record.id,
      user.id,
      null,
      {
        workerCode: worker.workerIdCode,
        service: service.name,
        status: calculatedStatus,
        method: params.method,
        serverTime: serverTimestamp
      }
    );

    return record;
  }

  /**
   * Clock Out with Duration Calculation and BOLA Authorization Verification
   */
  public static clockOut(
    attendanceId: string,
    source: ClockOutSource = 'manual',
    caller?: { userId?: string; isAdmin?: boolean; adminLevel?: string; branchId?: string },
    overrideTimestamp?: Date
  ): AttendanceRecord {
    const record = db.attendanceRecords.find(r => r.id === attendanceId);
    if (!record) {
      throw new Error('Attendance record not found.');
    }

    // BOLA Authorization Check: User can only clock out own session unless authorized admin for that branch
    if (caller && caller.userId) {
      const worker = db.workers.find(w => w.id === record.workerId);
      const member = worker ? db.members.find(m => m.id === worker.memberId) : undefined;
      const isOwner = member?.userId === caller.userId;
      const isAuthorizedAdmin = caller.isAdmin && (caller.adminLevel === 'super_admin' || caller.branchId === record.branchId);

      if (!isOwner && !isAuthorizedAdmin) {
        throw new Error('Unauthorized. You can only clock out your own session or workers within your authorized branch.');
      }
    }

    if (!record.clockInTime) {
      throw new Error('Cannot clock out without prior clock-in.');
    }

    if (record.clockOutTime) {
      throw new Error(`Worker already clocked out at ${new Date(record.clockOutTime).toLocaleTimeString()}.`);
    }

    const serverNow = overrideTimestamp || new Date();
    const serverTimestamp = serverNow.toISOString();
    const clockInDate = new Date(record.clockInTime);
    const durationMinutes = Math.max(1, Math.round((serverNow.getTime() - clockInDate.getTime()) / (1000 * 60)));

    record.clockOutTime = serverTimestamp;
    record.durationMinutes = durationMinutes;
    record.clockOutSource = source;
    record.isAutoClockOut = (source === 'automatic');
    record.updatedAt = serverTimestamp;
    persistAttendanceRecord(record).catch(() => {});

    return record;
  }

  /**
   * Automatic Clock-Out for Sessions Exceeding Limit (e.g. 4 Hours)
   */
  public static autoClockOutExpiredSessions(currentTime?: Date): number {
    const serverNow = currentTime || new Date();
    let count = 0;

    for (const record of db.attendanceRecords) {
      if (record.clockInTime && !record.clockOutTime) {
        const service = db.services.find(s => s.id === record.serviceId);
        const limitHours = service?.attendanceDurationHours || db.attendanceSettings.autoClockOutHours || 4.0;
        const limitMs = limitHours * 60 * 60 * 1000;

        const clockInDate = new Date(record.clockInTime);
        if (serverNow.getTime() - clockInDate.getTime() >= limitMs) {
          const autoOutDate = new Date(clockInDate.getTime() + limitMs);
          record.clockOutTime = autoOutDate.toISOString();
          record.durationMinutes = Math.round(limitHours * 60);
          record.clockOutSource = 'automatic';
          record.isAutoClockOut = true;
          record.updatedAt = serverNow.toISOString();
          persistAttendanceRecord(record).catch(() => {});
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Mark Absences for Expected Active Workers
   */
  public static markAbsences(
    serviceId: string,
    dateStr?: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ): number {
    const service = db.services.find(s => s.id === serviceId);
    if (!service) throw new Error('Service not found.');

    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (service.branchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only mark absences for services within your assigned branch.');
      }
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    let inserted = 0;

    const branchWorkers = db.workers.filter(w => {
      if (w.workerStatus !== 'active') return false;
      const m = db.members.find(mem => mem.id === w.memberId);
      return m && m.primaryBranchId === service.branchId;
    });

    for (const w of branchWorkers) {
      const existing = db.attendanceRecords.find(r => 
        r.workerId === w.id && r.serviceId === service.id && r.serviceDate === targetDate
      );
      if (!existing) {
        const absentRec: AttendanceRecord = {
          id: uuidv4(),
          workerId: w.id,
          serviceId: service.id,
          branchId: service.branchId,
          serviceDate: targetDate,
          status: 'absent',
          isAutoClockOut: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.attendanceRecords.push(absentRec);
        persistAttendanceRecord(absentRec).catch(() => {});
        inserted++;
      }
    }

    return inserted;
  }

  /**
   * Change Status to Excused with Reason and Audit Trail
   */
  public static excuseAbsence(
    attendanceId: string,
    adminId: string,
    adminName: string,
    reason: string,
    adminScope?: { adminLevel?: string; branchId?: string }
  ): AttendanceRecord {
    const record = db.attendanceRecords.find(r => r.id === attendanceId);
    if (!record) throw new Error('Attendance record not found.');

    if (adminScope && adminScope.adminLevel !== 'super_admin') {
      if (record.branchId !== adminScope.branchId) {
        throw new Error('Branch isolation violation: You can only excuse absences within your assigned branch.');
      }
    }

    const prevState = { status: record.status };
    record.status = 'excused';
    record.excuseReason = reason;
    record.excusedBy = adminId;
    record.excusedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    persistAttendanceRecord(record).catch(() => {});

    AuditService.log(
      adminName,
      'admin',
      'ATTENDANCE_EXCUSED',
      'attendance',
      record.id,
      adminId,
      prevState,
      { status: 'excused', reason }
    );

    return record;
  }


  /**
   * Real-Time Attendance Dashboard Metrics
   */
  public static getDashboardMetrics(branchId?: string, dateStr?: string) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    let records = db.attendanceRecords.filter(r => r.serviceDate === today);
    if (branchId) {
      records = records.filter(r => r.branchId === branchId);
    }

    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const activeClockedIn = records.filter(r => r.clockInTime && !r.clockOutTime).length;

    let expected = db.workers.filter(w => w.workerStatus === 'active');
    if (branchId) {
      expected = expected.filter(w => {
        const m = db.members.find(mem => mem.id === w.memberId);
        return m && m.primaryBranchId === branchId;
      });
    }

    const totalExpected = Math.max(expected.length, present + late + absent + excused);
    const attended = present + late;
    const ratePercent = totalExpected > 0 ? Math.round((attended / totalExpected) * 100) : 0;

    return {
      today,
      totalExpected,
      present,
      late,
      absent,
      excused,
      currentlyClockedIn: activeClockedIn,
      attendanceRate: ratePercent,
      recentRecords: records.map(r => {
        const w = db.workers.find(work => work.id === r.workerId);
        const m = w ? db.members.find(mem => mem.id === w.memberId) : undefined;
        const d = w ? db.departments.find(dept => dept.id === w.departmentId) : undefined;
        const s = db.services.find(svc => svc.id === r.serviceId);
        return {
          ...r,
          workerCode: w?.workerIdCode,
          workerName: m ? `${m.firstName} ${m.lastName}` : 'Unknown',
          departmentName: d?.name || 'General',
          serviceName: s?.name || 'Service'
        };
      })
    };
  }

  /**
   * Monthly Attendance Matrix Generator
   */
  public static getAttendanceMatrix(branchId?: string, yearMonth?: string) {
    const ym = yearMonth || new Date().toISOString().substring(0, 7); // e.g. 2026-03
    let workers = db.workers.filter(w => w.workerStatus === 'active');
    if (branchId) {
      workers = workers.filter(w => {
        const m = db.members.find(mem => mem.id === w.memberId);
        return m && m.primaryBranchId === branchId;
      });
    }

    // Filter attendance records in this month
    const monthRecords = db.attendanceRecords.filter(r => r.serviceDate.startsWith(ym));

    // Extract unique service dates sorted
    const serviceDates = Array.from(new Set(monthRecords.map(r => r.serviceDate))).sort();

    const matrixRows = workers.map(w => {
      const m = db.members.find(mem => mem.id === w.memberId);
      const d = db.departments.find(dept => dept.id === w.departmentId);
      const workerRecords = monthRecords.filter(r => r.workerId === w.id);

      const attendanceByDate: Record<string, { symbol: string; status: AttendanceStatus; clockIn?: string }> = {};
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let excusedCount = 0;
      let totalMinutes = 0;

      for (const date of serviceDates) {
        const rec = workerRecords.find(r => r.serviceDate === date);
        if (!rec) {
          attendanceByDate[date] = { symbol: 'A', status: 'absent' };
          absentCount++;
        } else if (rec.status === 'present') {
          attendanceByDate[date] = { symbol: '✓', status: 'present', clockIn: rec.clockInTime };
          presentCount++;
          totalMinutes += rec.durationMinutes || 180;
        } else if (rec.status === 'late') {
          attendanceByDate[date] = { symbol: 'L', status: 'late', clockIn: rec.clockInTime };
          lateCount++;
          totalMinutes += rec.durationMinutes || 180;
        } else if (rec.status === 'excused') {
          attendanceByDate[date] = { symbol: 'E', status: 'excused' };
          excusedCount++;
        } else {
          attendanceByDate[date] = { symbol: 'A', status: 'absent' };
          absentCount++;
        }
      }

      const totalExpected = serviceDates.length || 1;
      const rate = Math.round(((presentCount + lateCount) / totalExpected) * 100);
      const totalHours = (totalMinutes / 60).toFixed(1);

      return {
        workerId: w.id,
        workerCode: w.workerIdCode,
        workerName: m ? `${m.firstName} ${m.lastName}` : 'Unknown',
        department: d?.name || 'Choir',
        position: w.positionName,
        serviceDates: attendanceByDate,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        excused: excusedCount,
        attendanceRate: rate,
        totalHours: Number(totalHours)
      };
    });

    return {
      yearMonth: ym,
      dates: serviceDates,
      rows: matrixRows
    };
  }

  /**
   * Export Monthly Attendance as RFC-4180 Compliant CSV String
   */
  public static exportAttendanceCsv(branchId?: string, yearMonth?: string): string {
    const matrix = this.getAttendanceMatrix(branchId, yearMonth);
    const header = ['Worker ID', 'Worker Name', 'Department', 'Position', ...matrix.dates, 'Present', 'Late', 'Absent', 'Excused', 'Attendance Rate (%)', 'Total Hours'];
    const rows = matrix.rows.map(r => [
      `"${r.workerCode}"`,
      `"${r.workerName}"`,
      `"${r.department}"`,
      `"${r.position}"`,
      ...matrix.dates.map(d => `"${r.serviceDates[d]?.symbol || 'A'}"`),
      r.present,
      r.late,
      r.absent,
      r.excused,
      `${r.attendanceRate}%`,
      r.totalHours
    ]);
    return [header.join(','), ...rows.map(e => e.join(','))].join('\n');
  }
}
