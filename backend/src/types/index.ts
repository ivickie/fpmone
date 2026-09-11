export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'archived';
export type AdminLevel = 'none' | 'branch_admin' | 'church_admin' | 'super_admin';
export type MinistryRoleCode = 'SUPER_ADMIN' | 'BRANCH_PASTOR' | 'ASSOCIATE_PASTOR' | 'PASTOR' | 'HOD' | 'WORKER' | 'MEMBER';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type ClockInMethod = 'pin' | 'qr' | 'qr_scan' | 'biometric' | 'manual_admin';
export type ClockOutSource = 'manual' | 'automatic' | 'admin';
export type PostVisibility = 'all' | 'branch' | 'department' | 'workers_only' | 'role';
export type TestimonyStatus = 'pending_review' | 'approved' | 'rejected' | 'changes_requested';

export interface User {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  accountStatus: AccountStatus;
  rejectionReason?: string;
  requestChangesNotes?: string;
  isAdmin: boolean;
  adminLevel: AdminLevel;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  userId: string;
  primaryBranchId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  primaryRoleId: string;
  isWorker: boolean;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  residentialAddress?: string;
  profilePictureUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Worker {
  id: string;
  memberId: string;
  workerIdCode: string; // e.g. FPM-0001
  pinHash: string;
  departmentId: string;
  positionId?: string;
  positionName: string;
  dateStartedServing: string;
  workerStatus: 'active' | 'inactive' | 'suspended' | 'archived';
  qrCodeToken: string;
  biometricEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  branchCode: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  branchPastorName?: string;
  branchPastorId?: string;
  logoUrl?: string;
  status: 'active' | 'inactive' | 'archived';
  isHeadquarters: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MinistryRole {
  id: string;
  name: string;
  code: MinistryRoleCode;
  description?: string;
  hierarchyLevel: number;
  permissions: string[];
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  branchId?: string; // null means church-wide
  name: string;
  code: string;
  description?: string;
  hodName?: string;
  hodId?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentPosition {
  id: string;
  departmentId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ServiceSchedule {
  id: string;
  branchId: string;
  name: string;
  dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // "08:00:00"
  expectedEndTime: string; // "10:30:00"
  gracePeriodMinutes: number; // default 15
  earliestClockInMinutes: number; // default 60
  attendanceDurationHours: number; // default 4.0
  applicableDepartmentIds?: string[];
  qrCodeToken?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  serviceId: string;
  branchId: string;
  serviceDate: string; // YYYY-MM-DD
  clockInTime?: string; // Authoritative server timestamp ISO
  clockOutTime?: string;
  durationMinutes?: number;
  clockInMethod?: ClockInMethod;
  clockOutSource?: ClockOutSource;
  status: AttendanceStatus;
  isAutoClockOut: boolean;
  excuseReason?: string;
  excusedBy?: string;
  excusedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSettings {
  id: string;
  branchId?: string;
  defaultGracePeriodMinutes: number;
  autoClockOutHours: number;
  manualClockOutEnabled: boolean;
  earliestClockInMinutes: number;
  allowBiometricClockIn: boolean;
  allowQrClockIn: boolean;
  allowPinClockIn: boolean;
  updatedAt: string;
}

export interface EventItem {
  id: string;
  branchId?: string; // null = all
  title: string;
  description: string;
  bannerUrl?: string;
  startDatetime: string;
  endDatetime: string;
  location: string;
  speaker?: string;
  category: string;
  registrationRequired: boolean;
  registrationCapacity?: number;
  currentRegistrationsCount: number;
  targetScope: 'all' | 'branch' | 'department' | 'role';
  status: 'draft' | 'published' | 'cancelled' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorName: string;
  branchId?: string;
  departmentId?: string;
  visibility: PostVisibility;
  title?: string;
  content: string;
  scriptureReference?: string;
  postType: 'post' | 'announcement' | 'scripture' | 'highlight';
  isPinned: boolean;
  likesCount: number;
  commentsCount: number;
  mediaUrls: string[];
  status?: 'published' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ReactionItem {
  id: string;
  postId: string;
  userId: string;
  reactionType: 'like' | 'amen' | 'love' | 'praise';
  createdAt: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface ServiceHighlightItem {
  id: string;
  serviceId?: string;
  branchId: string;
  highlightDate: string;
  title: string;
  speaker: string;
  summary: string;
  scripture?: string;
  keyPoints: string[];
  quote?: string;
  photos: string[];
  videoUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonyItem {
  id: string;
  memberId: string;
  authorName: string;
  branchId: string;
  branchName: string;
  title: string;
  content: string;
  category: string;
  photoUrl?: string;
  videoUrl?: string;
  allowPublish: boolean;
  status: TestimonyStatus;
  rejectionReason?: string;
  requestChangesNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isFeaturedOnFeed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  notificationType: string;
  targetScope: 'entire_church' | 'branch' | 'department' | 'ministry_role' | 'specific_member' | 'workers' | 'all';
  targetId?: string;
  actionUrl?: string;
  createdAt: string;
  isRead?: boolean;
}

export type MediaType = 'event' | 'feed' | 'highlight' | 'testimony' | 'profile' | 'church-asset';

export interface MediaItem {
  id: string;
  storagePath: string;
  publicUrl: string;
  entityType: MediaType;
  entityId?: string;
  uploadedBy: string;
  branchId?: string;
  mimeType: string;
  fileSize: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuthUserSession {
  userId: string;
  email: string;
  phone: string;
  accountStatus: AccountStatus;
  isAdmin: boolean;
  adminLevel: AdminLevel;
  memberId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  branchId: string;
  branchName: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  isWorker: boolean;
  workerDetails?: {
    workerId: string;
    workerCode: string;
    departmentId: string;
    departmentName: string;
    positionName: string;
    qrCodeToken: string;
  };
}

export interface RegistrationRequestDto {
  // Step 1: Account
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  // Step 2: Church Info
  branchId: string;
  ministryRoleId: string;
  isWorker: boolean;
  departmentId?: string;
  positionName?: string;
  dateStartedServing?: string;
  // Step 3: Personal Info
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  residentialAddress?: string;
  profilePictureUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
