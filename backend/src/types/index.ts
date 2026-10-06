export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'archived';
export type AdminLevel = 'none' | 'branch_admin' | 'church_admin' | 'super_admin';
export type MinistryRoleCode = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'BRANCH_PASTOR' | 'ASSOCIATE_PASTOR' | 'PASTOR' | 'HOD' | 'WORKER' | 'MEMBER';
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
  hasChangedDefaultPassword?: boolean;
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
  coverImageUrl?: string;
  imageUrl?: string;
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
  hodEmail?: string;
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
  liveStreamUrl?: string; // e.g. YouTube Live or Facebook Live stream URL
  imageUrl?: string; // Promotional service flyer or artwork banner URL
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
  allowComments?: boolean; // Allowed on General Posts if permitted by admin; false for announcements
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

export type MediaType = 'event' | 'feed' | 'highlight' | 'testimony' | 'profile' | 'church-asset' | 'branch' | 'sunday-moment';

export interface SundayMoment {
  id: string;
  branchId: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  sundayDate: string; // YYYY-MM-DD
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

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
  profilePictureUrl?: string;
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

export type ReportType = 'weekly' | 'monthly' | 'service' | 'special_event';
export type ReportStatus = 'submitted' | 'reviewed' | 'acknowledged';

export interface DepartmentReport {
  id: string;
  departmentId: string;
  departmentName?: string;
  branchId: string;
  branchName?: string;
  title: string;
  reportType: ReportType;
  reportDate: string;
  attendanceCount?: number;
  summary: string;
  achievements?: string;
  challenges?: string;
  prayerRequests?: string;
  budgetNotes?: string;
  status: ReportStatus;
  submittedBy: string;
  submittedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FINANCE MODULE TYPES
// =============================================================================

export type FinanceTransactionType = 'income' | 'expense';
export type FinanceTransactionStatus = 'active' | 'archived' | 'voided';

export interface FinanceTransaction {
  id: string;
  branchId: string;
  branchName?: string;
  transactionType: FinanceTransactionType;
  category: string;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  description: string;
  referenceNumber?: string;
  paymentMethod: string;
  status: FinanceTransactionStatus;
  voidReason?: string;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceOpeningBalance {
  id: string;
  branchId: string;
  branchName?: string;
  year: number;
  month: number; // 1-12
  amount: number;
  isInitial: boolean;
  notes?: string;
  establishedBy: string;
  establishedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinanceTransactionDto {
  branchId?: string;
  transactionType: FinanceTransactionType;
  category: string;
  amount: number;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  paymentMethod?: string;
}

export interface UpdateFinanceTransactionDto {
  category?: string;
  amount?: number;
  transactionDate?: string;
  description?: string;
  referenceNumber?: string;
  paymentMethod?: string;
  editReason: string;
}

export interface MonthlyFinancialStatement {
  branchId?: string;
  branchName: string;
  year: number;
  month: number;
  monthName: string;
  openingBalance: number;
  incomeCategories: Array<{ category: string; amount: number; count: number; percentage: number }>;
  totalIncome: number;
  expenseCategories: Array<{ category: string; amount: number; count: number; percentage: number }>;
  totalExpenses: number;
  closingBalance: number;
  netChange: number;
}

export interface AnnualFinancialStatement {
  branchId?: string;
  branchName: string;
  year: number;
  annualOpeningBalance: number;
  months: Array<{
    month: number;
    monthName: string;
    openingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
    netChange: number;
  }>;
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  annualClosingBalance: number;
}

export interface CategoryAnalysisItem {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface FinanceDashboardSummary {
  branchId?: string;
  branchName: string;
  period: { year: number; month: number; monthName: string };
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  closingBalance: number;
  mtdIncome: number;
  mtdExpenses: number;
  ytdIncome: number;
  ytdExpenses: number;
  ytdClosingBalance: number;
  recentTransactions: FinanceTransaction[];
  monthlyTrend: Array<{
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  branchComparison?: Array<{
    branchId: string;
    branchName: string;
    branchCode: string;
    openingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    closingBalance: number;
  }>;
}


