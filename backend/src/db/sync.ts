import { query } from './index';
import { 
  User, Member, Worker, Branch, MinistryRole, Department, DepartmentPosition,
  ServiceSchedule, AttendanceRecord, AttendanceSettings, EventItem, PostItem,
  ServiceHighlightItem, TestimonyItem, NotificationItem, AuditLogItem, MediaItem
} from '../types';

/**
 * Hydrates in-memory DatabaseStore with live records from Supabase PostgreSQL.
 */
export async function hydrateStoreFromPostgres(store: any): Promise<boolean> {
  try {
    const [
      branchesRes,
      rolesRes,
      deptsRes,
      posRes,
      usersRes,
      membersRes,
      workersRes,
      servicesRes,
      attSettingsRes,
      attRecordsRes,
      eventsRes,
      postsRes,
      highlightsRes,
      testimoniesRes,
      notifsRes,
      auditRes,
      mediaRes
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY name ASC'),
      query('SELECT * FROM ministry_roles ORDER BY hierarchy_level ASC'),
      query('SELECT * FROM departments ORDER BY name ASC'),
      query('SELECT * FROM department_positions ORDER BY name ASC'),
      query('SELECT * FROM users ORDER BY created_at ASC'),
      query('SELECT * FROM members ORDER BY created_at ASC'),
      query('SELECT * FROM workers ORDER BY created_at ASC'),
      query('SELECT * FROM services ORDER BY start_time ASC'),
      query('SELECT * FROM attendance_settings LIMIT 10'),
      query('SELECT * FROM attendance_records ORDER BY created_at DESC'),
      query('SELECT * FROM events ORDER BY start_datetime ASC'),
      query('SELECT * FROM posts ORDER BY created_at DESC'),
      query('SELECT * FROM service_highlights ORDER BY highlight_date DESC'),
      query('SELECT * FROM testimonies ORDER BY created_at DESC'),
      query('SELECT * FROM notifications ORDER BY created_at DESC'),
      query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500'),
      query('SELECT * FROM media_items ORDER BY created_at DESC')
    ]);

    if (branchesRes.rows.length > 0) {
      store.branches = branchesRes.rows.map((r: any): Branch => ({
        id: r.id,
        organizationId: r.organization_id,
        name: r.name,
        branchCode: r.branch_code,
        address: r.address,
        city: r.city,
        state: r.state || undefined,
        country: r.country,
        phone: r.phone || undefined,
        email: r.email || undefined,
        branchPastorName: r.branch_pastor_name || undefined,
        branchPastorId: r.branch_pastor_id || undefined,
        logoUrl: r.logo_url || undefined,
        status: r.status,
        isHeadquarters: !!r.is_headquarters,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (rolesRes.rows.length > 0) {
      store.ministryRoles = rolesRes.rows.map((r: any): MinistryRole => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || undefined,
        hierarchyLevel: r.hierarchy_level,
        permissions: Array.isArray(r.permissions) ? r.permissions : (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : ['*']),
        isSystemRole: !!r.is_system_role,
        isActive: !!r.is_active,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (deptsRes.rows.length > 0) {
      store.departments = deptsRes.rows.map((r: any): Department => ({
        id: r.id,
        branchId: r.branch_id || undefined,
        name: r.name,
        code: r.code,
        description: r.description || undefined,
        hodName: r.hod_name || undefined,
        hodId: r.hod_id || undefined,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (posRes.rows.length > 0) {
      store.departmentPositions = posRes.rows.map((r: any): DepartmentPosition => ({
        id: r.id,
        departmentId: r.department_id,
        name: r.name,
        description: r.description || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    if (usersRes.rows.length > 0) {
      store.users = usersRes.rows.map((r: any): User => ({
        id: r.id,
        email: r.email,
        phone: r.phone,
        passwordHash: r.password_hash,
        accountStatus: r.account_status,
        rejectionReason: r.rejection_reason || undefined,
        requestChangesNotes: r.request_changes_notes || undefined,
        isAdmin: !!r.is_admin,
        adminLevel: r.admin_level || 'none',
        lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (membersRes.rows.length > 0) {
      store.members = membersRes.rows.map((r: any): Member => ({
        id: r.id,
        userId: r.user_id,
        primaryBranchId: r.primary_branch_id,
        firstName: r.first_name,
        middleName: r.middle_name || undefined,
        lastName: r.last_name,
        primaryRoleId: r.primary_role_id,
        isWorker: !!r.is_worker,
        gender: r.gender || 'Other',
        dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : undefined,
        residentialAddress: r.residential_address || undefined,
        profilePictureUrl: r.profile_picture_url || undefined,
        emergencyContactName: r.emergency_contact_name || undefined,
        emergencyContactPhone: r.emergency_contact_phone || undefined,
        approvedBy: r.approved_by || undefined,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (workersRes.rows.length > 0) {
      store.workers = workersRes.rows.map((r: any): Worker => ({
        id: r.id,
        memberId: r.member_id,
        workerIdCode: r.worker_id_code,
        pinHash: r.pin_hash,
        departmentId: r.department_id,
        positionId: r.position_id || undefined,
        positionName: r.position_name || 'Worker',
        dateStartedServing: r.date_started_serving ? new Date(r.date_started_serving).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        workerStatus: r.worker_status || 'active',
        qrCodeToken: r.qr_code_token,
        biometricEnabled: !!r.biometric_enabled,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (servicesRes.rows.length > 0) {
      store.services = servicesRes.rows.map((r: any): ServiceSchedule => ({
        id: r.id,
        branchId: r.branch_id,
        name: r.name,
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        expectedEndTime: r.expected_end_time,
        gracePeriodMinutes: r.grace_period_minutes,
        earliestClockInMinutes: r.earliest_clock_in_minutes,
        attendanceDurationHours: Number(r.attendance_duration_hours) || 4.0,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (attSettingsRes.rows.length > 0) {
      store.attendanceSettings = attSettingsRes.rows.map((r: any): AttendanceSettings => ({
        id: r.id,
        branchId: r.branch_id || undefined,
        defaultGracePeriodMinutes: r.default_grace_period_minutes,
        autoClockOutHours: Number(r.auto_clock_out_hours) || 4.0,
        manualClockOutEnabled: !!r.manual_clock_out_enabled,
        earliestClockInMinutes: r.earliest_clock_in_minutes,
        allowBiometricClockIn: !!r.allow_biometric_clock_in,
        allowQrClockIn: !!r.allow_qr_clock_in,
        allowPinClockIn: !!r.allow_pin_clock_in,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (attRecordsRes.rows.length > 0) {
      store.attendanceRecords = attRecordsRes.rows.map((r: any): AttendanceRecord => ({
        id: r.id,
        workerId: r.worker_id,
        serviceId: r.service_id,
        branchId: r.branch_id,
        serviceDate: r.service_date ? new Date(r.service_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        clockInTime: r.clock_in_time ? new Date(r.clock_in_time).toISOString() : undefined,
        clockOutTime: r.clock_out_time ? new Date(r.clock_out_time).toISOString() : undefined,
        durationMinutes: r.duration_minutes || undefined,
        clockInMethod: r.clock_in_method || undefined,
        clockOutSource: r.clock_out_source || undefined,
        status: r.status,
        isAutoClockOut: !!r.is_auto_clock_out,
        excuseReason: r.excuse_reason || undefined,
        excusedBy: r.excused_by || undefined,
        excusedAt: r.excused_at ? new Date(r.excused_at).toISOString() : undefined,
        notes: r.notes || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (eventsRes.rows.length > 0) {
      store.events = eventsRes.rows.map((r: any): EventItem => ({
        id: r.id,
        branchId: r.branch_id || undefined,
        title: r.title,
        description: r.description,
        bannerUrl: r.banner_url || undefined,
        startDatetime: r.start_datetime ? new Date(r.start_datetime).toISOString() : new Date().toISOString(),
        endDatetime: r.end_datetime ? new Date(r.end_datetime).toISOString() : new Date().toISOString(),
        location: r.location,
        speaker: r.speaker || undefined,
        category: r.category,
        registrationRequired: !!r.registration_required,
        registrationCapacity: r.registration_capacity || undefined,
        currentRegistrationsCount: r.current_registrations_count || 0,
        targetScope: r.target_scope || 'all',
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (postsRes.rows.length > 0) {
      store.posts = postsRes.rows.map((r: any): PostItem => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.author_name,
        branchId: r.branch_id || undefined,
        departmentId: r.department_id || undefined,
        visibility: r.visibility || 'all',
        title: r.title || undefined,
        content: r.content,
        scriptureReference: r.scripture_reference || undefined,
        mediaUrls: Array.isArray(r.media_urls) ? r.media_urls : [],
        postType: r.post_type || 'post',
        isPinned: !!r.is_pinned,
        likesCount: r.likes_count || 0,
        commentsCount: r.comments_count || 0,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (highlightsRes.rows.length > 0) {
      store.serviceHighlights = highlightsRes.rows.map((r: any): ServiceHighlightItem => ({
        id: r.id,
        serviceId: r.service_id || undefined,
        branchId: r.branch_id,
        highlightDate: r.highlight_date ? new Date(r.highlight_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        title: r.title,
        speaker: r.speaker,
        summary: r.summary,
        scripture: r.scripture || undefined,
        keyPoints: Array.isArray(r.key_points) ? r.key_points : (typeof r.key_points === 'string' ? JSON.parse(r.key_points) : []),
        quote: r.quote || undefined,
        photos: Array.isArray(r.photos) ? r.photos : (typeof r.photos === 'string' ? JSON.parse(r.photos) : []),
        videoUrl: r.video_url || undefined,
        isPublished: !!r.is_published,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (testimoniesRes.rows.length > 0) {
      store.testimonies = testimoniesRes.rows.map((r: any): TestimonyItem => ({
        id: r.id,
        memberId: r.member_id,
        authorName: r.author_name || 'Church Member',
        branchId: r.branch_id,
        branchName: r.branch_name || 'Faith Cathedral HQ',
        title: r.title,
        content: r.content,
        category: r.category,
        photoUrl: r.photo_url || undefined,
        videoUrl: r.video_url || undefined,
        allowPublish: !!r.allow_publish,
        status: r.status,
        rejectionReason: r.rejection_reason || undefined,
        requestChangesNotes: r.request_changes_notes || undefined,
        reviewedBy: r.reviewed_by || undefined,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        isFeaturedOnFeed: !!r.is_featured_on_feed,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (notifsRes.rows.length > 0) {
      store.notifications = notifsRes.rows.map((r: any): NotificationItem => ({
        id: r.id,
        title: r.title,
        body: r.body,
        notificationType: r.notification_type,
        targetScope: r.target_scope,
        targetId: r.target_id || undefined,
        actionUrl: r.action_url || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    if (mediaRes.rows.length > 0) {
      store.mediaFiles = mediaRes.rows.map((r: any): MediaItem => ({
        id: r.id,
        storagePath: r.storage_path,
        publicUrl: r.public_url,
        entityType: r.entity_type,
        entityId: r.entity_id || undefined,
        uploadedBy: r.uploaded_by || undefined,
        branchId: r.branch_id || undefined,
        mimeType: r.mime_type,
        fileSize: Number(r.file_size) || 0,
        isArchived: !!r.is_archived,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (auditRes.rows.length > 0) {
      store.auditLogs = auditRes.rows.map((r: any): AuditLogItem => ({
        id: r.id,
        actorId: r.actor_id || undefined,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id || undefined,
        previousState: r.previous_state || undefined,
        newState: r.new_state || undefined,
        ipAddress: r.ip_address || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    console.log(`[DATABASE] Hydrated store from Supabase: ${store.branches.length} branches, ${store.users.length} users, ${store.members.length} members, ${store.workers.length} workers, ${store.services.length} services.`);
    return true;
  } catch (err: any) {
    console.error('[DATABASE] Hydration from Supabase encountered an issue, falling back to local seed state:', err.message);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Write-Through Persistence Helpers (Asynchronous & Resilient)
// -----------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export async function persistUser(user: User): Promise<void> {
  if (!isUuid(user.id)) return;
  try {
    await query(`
      INSERT INTO users (id, email, phone, password_hash, account_status, rejection_reason, request_changes_notes, is_admin, admin_level, last_login_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        account_status = EXCLUDED.account_status,
        rejection_reason = EXCLUDED.rejection_reason,
        request_changes_notes = EXCLUDED.request_changes_notes,
        is_admin = EXCLUDED.is_admin,
        admin_level = EXCLUDED.admin_level,
        last_login_at = EXCLUDED.last_login_at,
        updated_at = EXCLUDED.updated_at
    `, [
      user.id, user.email, user.phone, user.passwordHash, user.accountStatus,
      user.rejectionReason || null, user.requestChangesNotes || null,
      user.isAdmin, user.adminLevel, user.lastLoginAt || null,
      user.createdAt, user.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: users] ${err.message}`);
  }
}

export async function persistMember(member: Member): Promise<void> {
  if (!isUuid(member.id) || !isUuid(member.userId) || !isUuid(member.primaryBranchId)) return;
  try {
    await query(`
      INSERT INTO members (id, user_id, primary_branch_id, first_name, middle_name, last_name, primary_role_id, is_worker, gender, date_of_birth, residential_address, profile_picture_url, emergency_contact_name, emergency_contact_phone, approved_by, approved_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        primary_branch_id = EXCLUDED.primary_branch_id,
        first_name = EXCLUDED.first_name,
        middle_name = EXCLUDED.middle_name,
        last_name = EXCLUDED.last_name,
        primary_role_id = EXCLUDED.primary_role_id,
        is_worker = EXCLUDED.is_worker,
        gender = EXCLUDED.gender,
        date_of_birth = EXCLUDED.date_of_birth,
        residential_address = EXCLUDED.residential_address,
        profile_picture_url = EXCLUDED.profile_picture_url,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at,
        updated_at = EXCLUDED.updated_at
    `, [
      member.id, member.userId, member.primaryBranchId, member.firstName,
      member.middleName || null, member.lastName, member.primaryRoleId,
      member.isWorker, member.gender, member.dateOfBirth || null,
      member.residentialAddress || null, member.profilePictureUrl || null,
      member.emergencyContactName || null, member.emergencyContactPhone || null,
      member.approvedBy || null, member.approvedAt || null,
      member.createdAt, member.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: members] ${err.message}`);
  }
}

export async function persistWorker(worker: Worker): Promise<void> {
  if (!isUuid(worker.id) || !isUuid(worker.memberId) || !isUuid(worker.departmentId)) return;
  try {
    await query(`
      INSERT INTO workers (id, member_id, worker_id_code, pin_hash, department_id, position_id, position_name, date_started_serving, worker_status, qr_code_token, biometric_enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        department_id = EXCLUDED.department_id,
        position_id = EXCLUDED.position_id,
        position_name = EXCLUDED.position_name,
        worker_status = EXCLUDED.worker_status,
        qr_code_token = EXCLUDED.qr_code_token,
        biometric_enabled = EXCLUDED.biometric_enabled,
        updated_at = EXCLUDED.updated_at
    `, [
      worker.id, worker.memberId, worker.workerIdCode, worker.pinHash,
      worker.departmentId, worker.positionId || null, worker.positionName,
      worker.dateStartedServing, worker.workerStatus, worker.qrCodeToken,
      worker.biometricEnabled, worker.createdAt, worker.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: workers] ${err.message}`);
  }
}

export async function persistBranch(branch: Branch): Promise<void> {
  if (!isUuid(branch.id)) return;
  try {
    await query(`
      INSERT INTO branches (id, organization_id, name, branch_code, address, city, state, country, phone, email, branch_pastor_name, branch_pastor_id, logo_url, status, is_headquarters, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        branch_pastor_name = EXCLUDED.branch_pastor_name,
        branch_pastor_id = EXCLUDED.branch_pastor_id,
        logo_url = EXCLUDED.logo_url,
        status = EXCLUDED.status,
        is_headquarters = EXCLUDED.is_headquarters,
        updated_at = EXCLUDED.updated_at
    `, [
      branch.id, branch.organizationId, branch.name, branch.branchCode,
      branch.address, branch.city, branch.state || null, branch.country,
      branch.phone || null, branch.email || null, branch.branchPastorName || null,
      branch.branchPastorId || null, branch.logoUrl || null, branch.status,
      branch.isHeadquarters, branch.createdAt, branch.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: branches] ${err.message}`);
  }
}

export async function persistDepartment(dept: Department): Promise<void> {
  if (!isUuid(dept.id)) return;
  try {
    await query(`
      INSERT INTO departments (id, branch_id, name, code, description, hod_name, hod_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        hod_name = EXCLUDED.hod_name,
        hod_id = EXCLUDED.hod_id,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      dept.id, dept.branchId || null, dept.name, dept.code,
      dept.description || null, dept.hodName || null, dept.hodId || null,
      dept.status, dept.createdAt, dept.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: departments] ${err.message}`);
  }
}

export async function persistService(service: ServiceSchedule): Promise<void> {
  if (!isUuid(service.id) || !isUuid(service.branchId)) return;
  try {
    await query(`
      INSERT INTO services (id, branch_id, name, day_of_week, start_time, expected_end_time, grace_period_minutes, earliest_clock_in_minutes, attendance_duration_hours, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        day_of_week = EXCLUDED.day_of_week,
        start_time = EXCLUDED.start_time,
        expected_end_time = EXCLUDED.expected_end_time,
        grace_period_minutes = EXCLUDED.grace_period_minutes,
        earliest_clock_in_minutes = EXCLUDED.earliest_clock_in_minutes,
        attendance_duration_hours = EXCLUDED.attendance_duration_hours,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      service.id, service.branchId, service.name, service.dayOfWeek,
      service.startTime, service.expectedEndTime, service.gracePeriodMinutes,
      service.earliestClockInMinutes, service.attendanceDurationHours,
      service.status, service.createdAt, service.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: services] ${err.message}`);
  }
}

export async function persistAttendanceRecord(record: AttendanceRecord): Promise<void> {
  if (!isUuid(record.id) || !isUuid(record.workerId) || !isUuid(record.serviceId) || !isUuid(record.branchId)) return;
  try {
    await query(`
      INSERT INTO attendance_records (id, worker_id, service_id, branch_id, service_date, clock_in_time, clock_out_time, duration_minutes, clock_in_method, clock_out_source, status, is_auto_clock_out, excuse_reason, excused_by, excused_at, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        clock_in_time = EXCLUDED.clock_in_time,
        clock_out_time = EXCLUDED.clock_out_time,
        duration_minutes = EXCLUDED.duration_minutes,
        clock_in_method = EXCLUDED.clock_in_method,
        clock_out_source = EXCLUDED.clock_out_source,
        status = EXCLUDED.status,
        is_auto_clock_out = EXCLUDED.is_auto_clock_out,
        excuse_reason = EXCLUDED.excuse_reason,
        excused_by = EXCLUDED.excused_by,
        excused_at = EXCLUDED.excused_at,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `, [
      record.id, record.workerId, record.serviceId, record.branchId,
      record.serviceDate, record.clockInTime || null, record.clockOutTime || null,
      record.durationMinutes || null, record.clockInMethod || null,
      record.clockOutSource || null, record.status, record.isAutoClockOut,
      record.excuseReason || null, record.excusedBy || null, record.excusedAt || null,
      record.notes || null, record.createdAt, record.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: attendance_records] ${err.message}`);
  }
}

export async function persistEvent(event: EventItem): Promise<void> {
  if (!isUuid(event.id)) return;
  try {
    await query(`
      INSERT INTO events (id, branch_id, title, description, banner_url, start_datetime, end_datetime, location, speaker, category, registration_required, registration_capacity, current_registrations_count, target_scope, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        banner_url = EXCLUDED.banner_url,
        start_datetime = EXCLUDED.start_datetime,
        end_datetime = EXCLUDED.end_datetime,
        location = EXCLUDED.location,
        speaker = EXCLUDED.speaker,
        category = EXCLUDED.category,
        registration_required = EXCLUDED.registration_required,
        registration_capacity = EXCLUDED.registration_capacity,
        current_registrations_count = EXCLUDED.current_registrations_count,
        target_scope = EXCLUDED.target_scope,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      event.id, event.branchId || null, event.title, event.description,
      event.bannerUrl || null, event.startDatetime, event.endDatetime,
      event.location, event.speaker || null, event.category,
      event.registrationRequired, event.registrationCapacity || null,
      event.currentRegistrationsCount, event.targetScope, event.status,
      event.createdAt, event.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: events] ${err.message}`);
  }
}

export async function persistPost(post: PostItem): Promise<void> {
  if (!isUuid(post.id) || !isUuid(post.authorId)) return;
  try {
    await query(`
      INSERT INTO posts (id, author_id, author_name, branch_id, department_id, visibility, title, content, scripture_reference, post_type, is_pinned, likes_count, comments_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        author_name = EXCLUDED.author_name,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        scripture_reference = EXCLUDED.scripture_reference,
        is_pinned = EXCLUDED.is_pinned,
        likes_count = EXCLUDED.likes_count,
        comments_count = EXCLUDED.comments_count,
        updated_at = EXCLUDED.updated_at
    `, [
      post.id, post.authorId, post.authorName, post.branchId || null,
      post.departmentId || null, post.visibility, post.title || null,
      post.content, post.scriptureReference || null, post.postType,
      post.isPinned, post.likesCount, post.commentsCount,
      post.createdAt, post.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: posts] ${err.message}`);
  }
}

export async function persistServiceHighlight(highlight: ServiceHighlightItem): Promise<void> {
  if (!isUuid(highlight.id) || !isUuid(highlight.branchId)) return;
  try {
    await query(`
      INSERT INTO service_highlights (id, service_id, branch_id, highlight_date, title, speaker, summary, scripture, key_points, quote, photos, video_url, is_published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        speaker = EXCLUDED.speaker,
        summary = EXCLUDED.summary,
        scripture = EXCLUDED.scripture,
        key_points = EXCLUDED.key_points,
        quote = EXCLUDED.quote,
        photos = EXCLUDED.photos,
        video_url = EXCLUDED.video_url,
        is_published = EXCLUDED.is_published,
        updated_at = EXCLUDED.updated_at
    `, [
      highlight.id, highlight.serviceId || null, highlight.branchId,
      highlight.highlightDate, highlight.title, highlight.speaker,
      highlight.summary, highlight.scripture || null,
      JSON.stringify(highlight.keyPoints || []), highlight.quote || null,
      JSON.stringify(highlight.photos || []), highlight.videoUrl || null,
      highlight.isPublished, highlight.createdAt, highlight.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: service_highlights] ${err.message}`);
  }
}

export async function persistTestimony(testimony: TestimonyItem): Promise<void> {
  if (!isUuid(testimony.id) || !isUuid(testimony.memberId) || !isUuid(testimony.branchId)) return;
  try {
    await query(`
      INSERT INTO testimonies (id, member_id, branch_id, title, content, category, photo_url, video_url, allow_publish, status, rejection_reason, request_changes_notes, reviewed_by, reviewed_at, is_featured_on_feed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        photo_url = EXCLUDED.photo_url,
        video_url = EXCLUDED.video_url,
        allow_publish = EXCLUDED.allow_publish,
        status = EXCLUDED.status,
        rejection_reason = EXCLUDED.rejection_reason,
        request_changes_notes = EXCLUDED.request_changes_notes,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        is_featured_on_feed = EXCLUDED.is_featured_on_feed,
        updated_at = EXCLUDED.updated_at
    `, [
      testimony.id, testimony.memberId, testimony.branchId, testimony.title,
      testimony.content, testimony.category, testimony.photoUrl || null,
      testimony.videoUrl || null, testimony.allowPublish, testimony.status,
      testimony.rejectionReason || null, testimony.requestChangesNotes || null,
      testimony.reviewedBy || null, testimony.reviewedAt || null,
      testimony.isFeaturedOnFeed, testimony.createdAt, testimony.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: testimonies] ${err.message}`);
  }
}

export async function persistNotification(notif: NotificationItem): Promise<void> {
  if (!isUuid(notif.id)) return;
  try {
    await query(`
      INSERT INTO notifications (id, title, body, notification_type, target_scope, target_id, action_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      notif.id, notif.title, notif.body, notif.notificationType,
      notif.targetScope, notif.targetId || null, notif.actionUrl || null,
      notif.createdAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: notifications] ${err.message}`);
  }
}

export async function persistMediaItem(media: MediaItem): Promise<void> {
  if (!isUuid(media.id)) return;
  try {
    await query(`
      INSERT INTO media_items (id, storage_path, public_url, entity_type, entity_id, uploaded_by, branch_id, mime_type, file_size, is_archived, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        is_archived = EXCLUDED.is_archived,
        updated_at = EXCLUDED.updated_at
    `, [
      media.id, media.storagePath, media.publicUrl, media.entityType,
      media.entityId || null, media.uploadedBy || null, media.branchId || null,
      media.mimeType, media.fileSize, media.isArchived,
      media.createdAt, media.updatedAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: media_items] ${err.message}`);
  }
}

export async function persistAuditLog(log: AuditLogItem): Promise<void> {
  if (!isUuid(log.id)) return;
  try {
    await query(`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, target_type, target_id, previous_state, new_state, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      log.id, log.actorId || null, log.actorName, log.actorRole, log.action,
      log.targetType, log.targetId || null,
      log.previousState ? JSON.stringify(log.previousState) : null,
      log.newState ? JSON.stringify(log.newState) : null,
      log.ipAddress || null, log.userAgent || null, log.createdAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: audit_logs] ${err.message}`);
  }
}

export async function persistDelete(table: string, id: string): Promise<void> {
  if (!isUuid(id)) return;
  try {
    // Validate table name against safe whitelist
    const safeTables = [
      'branches', 'departments', 'department_positions', 'ministry_roles',
      'users', 'members', 'workers', 'services', 'attendance_records',
      'events', 'posts', 'comments', 'reactions', 'service_highlights',
      'testimonies', 'notifications', 'media_items'
    ];
    if (!safeTables.includes(table)) {
      throw new Error(`Invalid table name for persistDelete: ${table}`);
    }
    await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST DELETE ERROR: ${table}] ${err.message}`);
  }
}
