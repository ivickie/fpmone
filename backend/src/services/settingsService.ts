import { db, IDS } from '../data/mockDb';
import { AuditService } from './auditService';
import { AttendanceService } from './attendanceService';
import { StorageService } from './storageService';
import { checkConnection } from '../db';

export interface OrganizationSettings {
  name: string;
  shortName: string;
  logoUrl: string;
  primaryEmail: string;
  phone: string;
  websiteUrl: string;
  headquartersAddress: string;
  motto: string;
}

export interface RegionalSettings {
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultCurrency: string;
  firstDayOfWeek: 'Sunday' | 'Monday';
}

export interface RegistrationSettings {
  allowRegistrations: boolean;
  registrationPausedMessage: string;
  requireApproval: boolean;
  requiredFields: string[];
  allowTestimonies: boolean;
}

export interface AttendanceSettingsConfig {
  id: string;
  branchId?: string;
  defaultGracePeriodMinutes: number;
  autoClockOutHours: number;
  manualClockOutEnabled: boolean;
  earliestClockInMinutes: number;
  allowBiometricClockIn: boolean;
  allowQrClockIn: boolean;
  allowPinClockIn: boolean;
  allowCorrections: boolean;
  requireCorrectionReason: boolean;
  updatedAt: string;
}

export interface FinanceSettingsConfig {
  financeEnabled: boolean;
  defaultCurrency: string;
  financialYearStartMonth: number;
  defaultPaymentMethods: string[];
  allowEditTransactions: boolean;
  requireEditReason: boolean;
}

export interface NotificationSettingsConfig {
  notifyOnNewRegistration: boolean;
  notifyOnMemberApproval: boolean;
  notifyOnUpcomingEvents: boolean;
  notifyOnAttendance: boolean;
  notifyOnTestimonies: boolean;
}

export interface MediaSettingsConfig {
  maxUploadSizeMb: number;
  allowedImageFormats: string[];
  allowMemberTestimonies: boolean;
  allowMemberMomentsUpload: boolean;
}

export interface SecuritySettingsConfig {
  sessionLifetimeHours: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  rateLimitWindowMinutes: number;
  rateLimitMaxRequests: number;
}

export interface GeneralSettings {
  organization: OrganizationSettings;
  regional: RegionalSettings;
  registration: RegistrationSettings;
  attendance: AttendanceSettingsConfig;
  finance: FinanceSettingsConfig;
  notifications: NotificationSettingsConfig;
  media: MediaSettingsConfig;
  security: SecuritySettingsConfig;
  updatedAt: string;
}

export interface BranchSettingsOverrides {
  timezone?: string;
  currency?: string;
  attendance?: Partial<AttendanceSettingsConfig>;
}

export class SettingsService {
  private static settings: GeneralSettings = {
    organization: {
      name: "Faith Preachers Ministries Int'l",
      shortName: "FPM Global",
      logoUrl: "/church-logo.png",
      primaryEmail: "info@faithpreachers.org",
      phone: "+234 800 000 0001",
      websiteUrl: "https://faithpreachers.org",
      headquartersAddress: "Behind Dangote Flour Mills, Off Asa Dam Road, Ilorin, Kwara State.",
      motto: "Impacting lives with the word of Faith"
    },
    regional: {
      defaultTimezone: "Africa/Lagos",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "12h",
      defaultCurrency: "NGN",
      firstDayOfWeek: "Sunday"
    },
    registration: {
      allowRegistrations: true,
      registrationPausedMessage: "New member registration is temporarily paused. Please contact church administration.",
      requireApproval: true,
      requiredFields: ["phone", "residenceAddress", "gender", "dateOfBirth"],
      allowTestimonies: true
    },
    attendance: {
      id: "att-settings-global",
      branchId: IDS.BRANCH_HQ,
      defaultGracePeriodMinutes: 15,
      autoClockOutHours: 4.0,
      manualClockOutEnabled: true,
      earliestClockInMinutes: 60,
      allowBiometricClockIn: true,
      allowQrClockIn: true,
      allowPinClockIn: true,
      allowCorrections: true,
      requireCorrectionReason: true,
      updatedAt: "2024-01-01T00:00:00Z"
    },
    finance: {
      financeEnabled: true,
      defaultCurrency: "NGN",
      financialYearStartMonth: 1,
      defaultPaymentMethods: ["cash", "bank_transfer", "pos", "cheque", "online"],
      allowEditTransactions: true,
      requireEditReason: true
    },
    notifications: {
      notifyOnNewRegistration: true,
      notifyOnMemberApproval: true,
      notifyOnUpcomingEvents: true,
      notifyOnAttendance: true,
      notifyOnTestimonies: true
    },
    media: {
      maxUploadSizeMb: 10,
      allowedImageFormats: ["image/jpeg", "image/png", "image/webp"],
      allowMemberTestimonies: true,
      allowMemberMomentsUpload: true
    },
    security: {
      sessionLifetimeHours: 24,
      maxFailedLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      rateLimitWindowMinutes: 15,
      rateLimitMaxRequests: 100
    },
    updatedAt: new Date().toISOString()
  };

  private static branchOverrides: Record<string, BranchSettingsOverrides> = {};

  /**
   * Returns current global general settings, keeping attendance in sync with mockDb.
   */
  public static getSettings(): GeneralSettings {
    // Keep attendance synchronized with db.attendanceSettings
    this.settings.attendance = {
      ...this.settings.attendance,
      ...db.attendanceSettings,
      allowCorrections: this.settings.attendance.allowCorrections !== false,
      requireCorrectionReason: this.settings.attendance.requireCorrectionReason !== false
    };
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Returns settings with branch overrides applied if present (Precedence: Branch override -> Global default).
   */
  public static getSettingsForBranch(branchId?: string): GeneralSettings {
    const globalSettings = this.getSettings();
    if (!branchId || !this.branchOverrides[branchId]) {
      return globalSettings;
    }

    const override = this.branchOverrides[branchId];
    return {
      ...globalSettings,
      regional: {
        ...globalSettings.regional,
        defaultTimezone: override.timezone || globalSettings.regional.defaultTimezone,
        defaultCurrency: override.currency || globalSettings.regional.defaultCurrency
      },
      attendance: {
        ...globalSettings.attendance,
        ...(override.attendance || {})
      }
    };
  }

  /**
   * Updates settings with strict access control and schema validation.
   */
  public static updateSettings(body: any, user: any): GeneralSettings {
    const isSuperAdmin = user?.adminLevel === 'super_admin' || user?.roleCode === 'SUPER_ADMIN';
    const isBranchAdmin = user?.adminLevel === 'branch_admin' || user?.adminLevel === 'church_admin' || user?.roleCode === 'BRANCH_ADMIN' || user?.roleCode === 'BRANCH_PASTOR';

    if (!isSuperAdmin && !isBranchAdmin) {
      throw new Error('Branch Administrator or Super Administrator privileges required to edit System & Ministry Configuration. Heads of Department cannot modify system settings.');
    }

    // Branch Admin can ONLY update attendance settings. All other categories require Super Admin.
    const hasGlobalSections = Boolean(
      body.organization ||
      body.regional ||
      body.registration ||
      body.finance ||
      body.notifications ||
      body.media ||
      body.security
    );

    if (!isSuperAdmin && hasGlobalSections) {
      throw new Error('Only Super Administrators are authorized to modify organization, regional, registration, finance, notifications, media, or security configuration.');
    }

    const previousState = JSON.parse(JSON.stringify(this.settings));

    // 1. Organization Settings
    if (isSuperAdmin && body.organization && typeof body.organization === 'object') {
      const org = body.organization;
      if (org.name && typeof org.name === 'string') this.settings.organization.name = org.name.trim();
      if (org.shortName && typeof org.shortName === 'string') this.settings.organization.shortName = org.shortName.trim();
      if (org.logoUrl && typeof org.logoUrl === 'string') this.settings.organization.logoUrl = org.logoUrl.trim();
      if (org.primaryEmail && typeof org.primaryEmail === 'string') {
        const email = org.primaryEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid organization contact email address.');
        this.settings.organization.primaryEmail = email;
      }
      if (org.phone && typeof org.phone === 'string') this.settings.organization.phone = org.phone.trim();
      if (org.websiteUrl && typeof org.websiteUrl === 'string') this.settings.organization.websiteUrl = org.websiteUrl.trim();
      if (org.headquartersAddress && typeof org.headquartersAddress === 'string') this.settings.organization.headquartersAddress = org.headquartersAddress.trim();
      if (org.motto && typeof org.motto === 'string') this.settings.organization.motto = org.motto.trim();
    }

    // 2. Regional Settings
    if (isSuperAdmin && body.regional && typeof body.regional === 'object') {
      const reg = body.regional;
      if (reg.defaultTimezone && typeof reg.defaultTimezone === 'string') this.settings.regional.defaultTimezone = reg.defaultTimezone.trim();
      if (reg.dateFormat && ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'].includes(reg.dateFormat)) this.settings.regional.dateFormat = reg.dateFormat;
      if (reg.timeFormat && ['12h', '24h'].includes(reg.timeFormat)) this.settings.regional.timeFormat = reg.timeFormat;
      if (reg.defaultCurrency && typeof reg.defaultCurrency === 'string') this.settings.regional.defaultCurrency = reg.defaultCurrency.trim().toUpperCase();
      if (reg.firstDayOfWeek && ['Sunday', 'Monday'].includes(reg.firstDayOfWeek)) this.settings.regional.firstDayOfWeek = reg.firstDayOfWeek;
    }

    // 3. Registration Settings
    if (isSuperAdmin && body.registration && typeof body.registration === 'object') {
      const reg = body.registration;
      if (reg.allowRegistrations !== undefined) this.settings.registration.allowRegistrations = Boolean(reg.allowRegistrations);
      if (reg.registrationPausedMessage && typeof reg.registrationPausedMessage === 'string') this.settings.registration.registrationPausedMessage = reg.registrationPausedMessage.trim();
      if (reg.requireApproval !== undefined) this.settings.registration.requireApproval = Boolean(reg.requireApproval);
      if (Array.isArray(reg.requiredFields)) {
        this.settings.registration.requiredFields = reg.requiredFields.filter((f: any) => typeof f === 'string');
      }
      if (reg.allowTestimonies !== undefined) this.settings.registration.allowTestimonies = Boolean(reg.allowTestimonies);
    }

    // 4. Attendance Settings (Supports both nested body.attendance and root-level fields for backwards compatibility)
    const attSource = (body.attendance && typeof body.attendance === 'object') ? body.attendance : body;
    const {
      defaultGracePeriodMinutes,
      autoClockOutHours,
      manualClockOutEnabled,
      earliestClockInMinutes,
      allowBiometricClockIn,
      allowQrClockIn,
      allowPinClockIn,
      allowCorrections,
      requireCorrectionReason
    } = attSource;

    if (defaultGracePeriodMinutes !== undefined) {
      const val = Number(defaultGracePeriodMinutes);
      if (isNaN(val) || val < 1 || val > 60) throw new Error('Default grace period must be between 1 and 60 minutes.');
      this.settings.attendance.defaultGracePeriodMinutes = Math.round(val);
      db.attendanceSettings.defaultGracePeriodMinutes = Math.round(val);
    }
    if (autoClockOutHours !== undefined) {
      const val = Number(autoClockOutHours);
      if (isNaN(val) || val < 0.5 || val > 24) throw new Error('Auto clock-out timeout must be between 0.5 and 24 hours.');
      this.settings.attendance.autoClockOutHours = val;
      db.attendanceSettings.autoClockOutHours = val;
    }
    if (manualClockOutEnabled !== undefined) {
      const val = Boolean(manualClockOutEnabled);
      this.settings.attendance.manualClockOutEnabled = val;
      db.attendanceSettings.manualClockOutEnabled = val;
    }
    if (earliestClockInMinutes !== undefined) {
      const val = Number(earliestClockInMinutes);
      if (isNaN(val) || val < 15 || val > 180) throw new Error('Earliest allowed clock-in must be between 15 and 180 minutes.');
      this.settings.attendance.earliestClockInMinutes = Math.round(val);
      db.attendanceSettings.earliestClockInMinutes = Math.round(val);
    }
    if (allowBiometricClockIn !== undefined) {
      const val = Boolean(allowBiometricClockIn);
      this.settings.attendance.allowBiometricClockIn = val;
      db.attendanceSettings.allowBiometricClockIn = val;
    }
    if (allowQrClockIn !== undefined) {
      const val = Boolean(allowQrClockIn);
      this.settings.attendance.allowQrClockIn = val;
      db.attendanceSettings.allowQrClockIn = val;
    }
    if (allowPinClockIn !== undefined) {
      const val = Boolean(allowPinClockIn);
      this.settings.attendance.allowPinClockIn = val;
      db.attendanceSettings.allowPinClockIn = val;
    }
    if (allowCorrections !== undefined) {
      this.settings.attendance.allowCorrections = Boolean(allowCorrections);
    }
    if (requireCorrectionReason !== undefined) {
      this.settings.attendance.requireCorrectionReason = Boolean(requireCorrectionReason);
    }

    // 5. Finance Settings
    if (isSuperAdmin && body.finance && typeof body.finance === 'object') {
      const fin = body.finance;
      if (fin.financeEnabled !== undefined) this.settings.finance.financeEnabled = Boolean(fin.financeEnabled);
      if (fin.defaultCurrency && typeof fin.defaultCurrency === 'string') this.settings.finance.defaultCurrency = fin.defaultCurrency.trim().toUpperCase();
      if (fin.financialYearStartMonth !== undefined) {
        const val = Number(fin.financialYearStartMonth);
        if (isNaN(val) || val < 1 || val > 12) throw new Error('Financial year start month must be between 1 and 12.');
        this.settings.finance.financialYearStartMonth = Math.round(val);
      }
      if (Array.isArray(fin.defaultPaymentMethods)) {
        this.settings.finance.defaultPaymentMethods = fin.defaultPaymentMethods.filter((m: any) => typeof m === 'string');
      }
      if (fin.allowEditTransactions !== undefined) this.settings.finance.allowEditTransactions = Boolean(fin.allowEditTransactions);
      if (fin.requireEditReason !== undefined) this.settings.finance.requireEditReason = Boolean(fin.requireEditReason);
    }

    // 6. Notifications Settings
    if (isSuperAdmin && body.notifications && typeof body.notifications === 'object') {
      const notif = body.notifications;
      if (notif.notifyOnNewRegistration !== undefined) this.settings.notifications.notifyOnNewRegistration = Boolean(notif.notifyOnNewRegistration);
      if (notif.notifyOnMemberApproval !== undefined) this.settings.notifications.notifyOnMemberApproval = Boolean(notif.notifyOnMemberApproval);
      if (notif.notifyOnUpcomingEvents !== undefined) this.settings.notifications.notifyOnUpcomingEvents = Boolean(notif.notifyOnUpcomingEvents);
      if (notif.notifyOnAttendance !== undefined) this.settings.notifications.notifyOnAttendance = Boolean(notif.notifyOnAttendance);
      if (notif.notifyOnTestimonies !== undefined) this.settings.notifications.notifyOnTestimonies = Boolean(notif.notifyOnTestimonies);
    }

    // 7. Media & Content Settings
    if (isSuperAdmin && body.media && typeof body.media === 'object') {
      const med = body.media;
      if (med.maxUploadSizeMb !== undefined) {
        const val = Number(med.maxUploadSizeMb);
        if (isNaN(val) || val < 1 || val > 50) throw new Error('Maximum upload size must be between 1 MB and 50 MB.');
        this.settings.media.maxUploadSizeMb = Math.round(val);
      }
      if (Array.isArray(med.allowedImageFormats)) {
        const allowedSafe = ['image/jpeg', 'image/png', 'image/webp'];
        this.settings.media.allowedImageFormats = med.allowedImageFormats.filter((f: any) => allowedSafe.includes(f));
      }
      if (med.allowMemberTestimonies !== undefined) this.settings.media.allowMemberTestimonies = Boolean(med.allowMemberTestimonies);
      if (med.allowMemberMomentsUpload !== undefined) this.settings.media.allowMemberMomentsUpload = Boolean(med.allowMemberMomentsUpload);
    }

    // 8. Security Settings
    if (isSuperAdmin && body.security && typeof body.security === 'object') {
      const sec = body.security;
      if (sec.sessionLifetimeHours !== undefined) {
        const val = Number(sec.sessionLifetimeHours);
        if (isNaN(val) || val < 1 || val > 168) throw new Error('Session lifetime must be between 1 and 168 hours.');
        this.settings.security.sessionLifetimeHours = Math.round(val);
      }
      if (sec.maxFailedLoginAttempts !== undefined) {
        const val = Number(sec.maxFailedLoginAttempts);
        if (isNaN(val) || val < 3 || val > 10) throw new Error('Maximum failed login attempts must be between 3 and 10.');
        this.settings.security.maxFailedLoginAttempts = Math.round(val);
      }
      if (sec.lockoutDurationMinutes !== undefined) {
        const val = Number(sec.lockoutDurationMinutes);
        if (isNaN(val) || val < 5 || val > 60) throw new Error('Lockout duration must be between 5 and 60 minutes.');
        this.settings.security.lockoutDurationMinutes = Math.round(val);
      }
      if (sec.rateLimitWindowMinutes !== undefined) {
        const val = Number(sec.rateLimitWindowMinutes);
        if (isNaN(val) || val < 1 || val > 60) throw new Error('Rate limit window must be between 1 and 60 minutes.');
        this.settings.security.rateLimitWindowMinutes = Math.round(val);
      }
      if (sec.rateLimitMaxRequests !== undefined) {
        const val = Number(sec.rateLimitMaxRequests);
        if (isNaN(val) || val < 50 || val > 1000) throw new Error('Rate limit requests must be between 50 and 1000.');
        this.settings.security.rateLimitMaxRequests = Math.round(val);
      }
    }

    const nowIso = new Date().toISOString();
    this.settings.updatedAt = nowIso;
    db.attendanceSettings.updatedAt = nowIso;

    // Log to immutable Audit Trail
    AuditService.log(
      user.fullName || 'System Administrator',
      user.roleName || user.adminLevel || 'Admin',
      'GENERAL_SETTINGS_UPDATE',
      'system_settings',
      'global',
      user.userId,
      previousState,
      this.settings
    );

    return this.getSettings();
  }

  /**
   * Safely checks system health without exposing connection strings, paths, or secrets.
   */
  public static async getSystemHealth(): Promise<{
    apiStatus: 'Operational' | 'Degraded' | 'Unavailable';
    dbStatus: 'Operational' | 'Degraded' | 'Unavailable';
    storageStatus: 'Operational' | 'Degraded' | 'Unavailable';
    lastAttendanceJobAt: string | null;
    appVersion: string;
    environment: string;
    uptimeSeconds: number;
    timestamp: string;
  }> {
    let dbStatus: 'Operational' | 'Degraded' | 'Unavailable' = 'Operational';
    try {
      const conn = await checkConnection();
      dbStatus = conn.connected ? 'Operational' : 'Degraded';
    } catch {
      dbStatus = 'Degraded';
    }

    let storageStatus: 'Operational' | 'Degraded' | 'Unavailable' = 'Operational';
    try {
      const client = (StorageService as any).getClient?.();
      if (client) {
        const { error } = await client.storage.from('fpm-media').list('', { limit: 1 });
        if (error) storageStatus = 'Degraded';
      }
    } catch {
      storageStatus = 'Degraded';
    }

    return {
      apiStatus: 'Operational',
      dbStatus,
      storageStatus,
      lastAttendanceJobAt: (AttendanceService as any).lastAutoClockOutRunAt || null,
      appVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }
}
