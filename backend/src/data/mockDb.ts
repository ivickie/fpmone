import bcrypt from 'bcryptjs';
import { 
  User, Member, Worker, Branch, MinistryRole, Department, DepartmentPosition,
  ServiceSchedule, AttendanceRecord, AttendanceSettings, EventItem, PostItem,
  ReactionItem, CommentItem, ServiceHighlightItem, TestimonyItem, NotificationItem,
  AuditLogItem, MediaItem
} from '../types';

// Pre-compute bcrypt hashes for seed data
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);
const DEFAULT_PIN_HASH = bcrypt.hashSync('1234', 10);

// ID Constants
export const IDS = {
  BRANCH_HQ: 'b1111111-1111-1111-1111-111111111111',
  BRANCH_LEKKI: 'b2222222-2222-2222-2222-222222222222',
  BRANCH_LONDON: 'b3333333-3333-3333-3333-333333333333',
  BRANCH_HOUSTON: 'b4444444-4444-4444-4444-444444444444',

  ROLE_SUPER_ADMIN: 'a1111111-1111-1111-1111-111111111111',
  ROLE_BRANCH_PASTOR: 'a2222222-2222-2222-2222-222222222222',
  ROLE_ASSOCIATE_PASTOR: 'a3333333-3333-3333-3333-333333333333',
  ROLE_PASTOR: 'a4444444-4444-4444-4444-444444444444',
  ROLE_HOD: 'a5555555-5555-5555-5555-555555555555',
  ROLE_WORKER: 'a6666666-6666-6666-6666-666666666666',
  ROLE_MEMBER: 'a7777777-7777-7777-7777-777777777777',

  DEPT_CHOIR: 'd1111111-1111-1111-1111-111111111111',
  DEPT_MEDIA: 'd2222222-2222-2222-2222-222222222222',
  DEPT_USHERING: 'd3333333-3333-3333-3333-333333333333',
  DEPT_SECURITY: 'd4444444-4444-4444-4444-444444444444',
  DEPT_PRAYER: 'd5555555-5555-5555-5555-555555555555',
  DEPT_WELFARE: 'd6666666-6666-6666-6666-666666666666',
  DEPT_CHILDREN: 'd7777777-7777-7777-7777-777777777777',

  USER_ADMIN: 'c1111111-1111-1111-1111-111111111111',
  USER_PASTOR: 'c2222222-2222-2222-2222-222222222222',
  USER_HOD: 'c3333333-3333-3333-3333-333333333333',
  USER_SARAH: 'c4444444-4444-4444-4444-444444444444',
  USER_JOHN: 'c5555555-5555-5555-5555-555555555555',
  USER_GRACE: 'c6666666-6666-6666-6666-666666666666',
  USER_PENDING: 'c7777777-7777-7777-7777-777777777777',

  MEMBER_ADMIN: 'e1111111-1111-1111-1111-111111111111',
  MEMBER_PASTOR: 'e2222222-2222-2222-2222-222222222222',
  MEMBER_HOD: 'e3333333-3333-3333-3333-333333333333',
  MEMBER_SARAH: 'e4444444-4444-4444-4444-444444444444',
  MEMBER_JOHN: 'e5555555-5555-5555-5555-555555555555',
  MEMBER_GRACE: 'e6666666-6666-6666-6666-666666666666',
  MEMBER_PENDING: 'e7777777-7777-7777-7777-777777777777',

  WORKER_SARAH: 'f1111111-1111-1111-1111-111111111111',
  WORKER_JOHN: 'f2222222-2222-2222-2222-222222222222',
  WORKER_HOD: 'f3333333-3333-3333-3333-333333333333',

  SERVICE_SUN_1: '11111111-1111-1111-1111-111111111111',
  SERVICE_SUN_2: '22222222-2222-2222-2222-222222222222',
  SERVICE_WED: '33333333-3333-3333-3333-333333333333',
  SERVICE_FRI: '44444444-4444-4444-4444-444444444444',
  SERVICE_SAT_REHEARSAL: '55555555-5555-5555-5555-555555555555',
  SERVICE_SPECIAL_THANKSGIVING: '66666666-6666-6666-6666-666666666666'
};


export class DatabaseStore {
  public branches: Branch[] = [
    {
      id: IDS.BRANCH_HQ,
      organizationId: 'org-fpm-global',
      name: 'Cathedral of Grace (HQ)',
      branchCode: 'FPM-HQ',
      address: '10 Victory Way, Ikeja',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
      phone: '+234 800 000 0001',
      email: 'hq@faithpreachers.org',
      branchPastorName: 'Pastor David Adeleke',
      branchPastorId: IDS.USER_PASTOR,
      logoUrl: 'http://localhost:5000/assets/church-logo.png',
      status: 'active',
      isHeadquarters: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.BRANCH_LEKKI,
      organizationId: 'org-fpm-global',
      name: 'Lekki City of Praise',
      branchCode: 'FPM-LEK',
      address: 'Plot 15 Admiralty Way, Lekki Phase 1',
      city: 'Lagos',
      state: 'Lagos State',
      country: 'Nigeria',
      phone: '+234 800 000 0002',
      email: 'lekki@faithpreachers.org',
      branchPastorName: 'Pastor Emmanuel Okafor',
      status: 'active',
      isHeadquarters: false,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z'
    },
    {
      id: IDS.BRANCH_LONDON,
      organizationId: 'org-fpm-global',
      name: 'London Glory Center',
      branchCode: 'FPM-LON',
      address: '44 Gracechurch Street',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      phone: '+44 20 7946 0001',
      email: 'london@faithpreachers.org',
      branchPastorName: 'Pastor Michael Davies',
      status: 'active',
      isHeadquarters: false,
      createdAt: '2024-03-01T00:00:00Z',
      updatedAt: '2024-03-01T00:00:00Z'
    },
    {
      id: IDS.BRANCH_HOUSTON,
      organizationId: 'org-fpm-global',
      name: 'Houston Faith Tabernacle',
      branchCode: 'FPM-HOU',
      address: '8820 Westheimer Road',
      city: 'Houston',
      state: 'Texas',
      country: 'United States',
      phone: '+1 713 555 0199',
      email: 'houston@faithpreachers.org',
      branchPastorName: 'Pastor Joshua Vance',
      status: 'active',
      isHeadquarters: false,
      createdAt: '2024-04-01T00:00:00Z',
      updatedAt: '2024-04-01T00:00:00Z'
    }
  ];

  public ministryRoles: MinistryRole[] = [
    {
      id: IDS.ROLE_SUPER_ADMIN,
      name: 'Administrator',
      code: 'SUPER_ADMIN',
      description: 'Overall global administrative control of FPM ONE',
      hierarchyLevel: 1,
      permissions: ['*'],
      isSystemRole: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_BRANCH_PASTOR,
      name: 'Branch Pastor',
      code: 'BRANCH_PASTOR',
      description: 'Spiritual and administrative head of a branch/chapter',
      hierarchyLevel: 2,
      permissions: ['branch:read', 'branch:manage', 'attendance:view', 'members:view'],
      isSystemRole: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_ASSOCIATE_PASTOR,
      name: 'Associate Pastor',
      code: 'ASSOCIATE_PASTOR',
      description: 'Assistant pastoral minister in a branch',
      hierarchyLevel: 3,
      permissions: ['services:read', 'attendance:view', 'members:view'],
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_PASTOR,
      name: 'Pastor',
      code: 'PASTOR',
      description: 'Ordained minister of the gospel',
      hierarchyLevel: 4,
      permissions: ['services:read', 'members:view'],
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_HOD,
      name: 'HOD',
      code: 'HOD',
      description: 'Head of Department supervising departmental operations and workers',
      hierarchyLevel: 5,
      permissions: ['dept:attendance', 'dept:workers'],
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_WORKER,
      name: 'Worker',
      code: 'WORKER',
      description: 'Dedicated ministry worker serving in departments and services',
      hierarchyLevel: 6,
      permissions: ['worker:clock_in', 'worker:attendance'],
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.ROLE_MEMBER,
      name: 'Member',
      code: 'MEMBER',
      description: 'Valued member of Faith Preachers Ministry church family',
      hierarchyLevel: 7,
      permissions: ['feed:read', 'events:read', 'testimonies:submit'],
      isSystemRole: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  public departments: Department[] = [
    {
      id: IDS.DEPT_CHOIR,
      branchId: IDS.BRANCH_HQ,
      name: 'Choir (Voices of Faith)',
      code: 'CHOIR',
      description: 'Leading praise, worship and sacred choral orchestration',
      hodName: 'Sister Rachel Adams',
      hodId: IDS.USER_HOD,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_MEDIA,
      branchId: IDS.BRANCH_HQ,
      name: 'Media & Technology',
      code: 'MEDIA',
      description: 'Multi-camera broadcast, audio engineering, live streaming, visuals',
      hodName: 'Brother John Mensah',
      hodId: IDS.USER_JOHN,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_USHERING,
      branchId: IDS.BRANCH_HQ,
      name: 'Ushering & Protocol',
      code: 'USHER',
      description: 'Sanctuary seating coordination, orderliness, guest hospitality',
      hodName: 'Deacon Paul Eke',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_SECURITY,
      branchId: IDS.BRANCH_HQ,
      name: 'Security & Logistics',
      code: 'SEC',
      description: 'Sanctuary security, traffic coordination, emergency response',
      hodName: 'Brother James Obi',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_PRAYER,
      branchId: IDS.BRANCH_HQ,
      name: 'Prayer & Intercession',
      code: 'PRAYER',
      description: 'Intercessory prayer tower, prayer chains, spiritual support',
      hodName: 'Pastor Deborah Mark',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_WELFARE,
      branchId: IDS.BRANCH_HQ,
      name: 'Welfare & Hospitality',
      code: 'WELFARE',
      description: 'Benevolence, community food distribution, visitor welcome, member care',
      hodName: 'Deaconess Comfort Eze',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.DEPT_CHILDREN,
      branchId: IDS.BRANCH_HQ,
      name: 'Children & Teens Church',
      code: 'CHILDREN',
      description: 'Sunday school curriculum, youth discipleship, biblical foundational classes',
      hodName: 'Pastor Gloria Daniels',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  public departmentPositions: DepartmentPosition[] = [
    { id: 'dp1', departmentId: IDS.DEPT_CHOIR, name: 'Choir Director', description: 'Musical rehearsal and vocal leadership', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp2', departmentId: IDS.DEPT_CHOIR, name: 'Lead Vocalist', description: 'Soloist and worship minister', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp3', departmentId: IDS.DEPT_CHOIR, name: 'Instrumentalist', description: 'Keyboard, drums, bass, strings', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp4', departmentId: IDS.DEPT_MEDIA, name: 'Broadcast Director', description: 'Live video switcher operation', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp5', departmentId: IDS.DEPT_MEDIA, name: 'Camera Operator', description: 'Robotic and pedestal camera control', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp6', departmentId: IDS.DEPT_USHERING, name: 'Head Usher', description: 'Floor coordination and seating', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp7', departmentId: IDS.DEPT_WELFARE, name: 'Welfare Coordinator', description: 'Benevolence registry and distribution', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'dp8', departmentId: IDS.DEPT_CHILDREN, name: 'Teens Teacher', description: 'Discipleship teaching and youth mentoring', createdAt: '2024-01-01T00:00:00Z' }
  ];

  public users: User[] = [
    {
      id: IDS.USER_ADMIN,
      email: 'admin@fpmchurch.org',
      phone: '+2348000000010',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: true,
      adminLevel: 'super_admin',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_PASTOR,
      email: 'pastor.david@fpmchurch.org',
      phone: '+2348000000020',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: true,
      adminLevel: 'branch_admin',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_HOD,
      email: 'hod.choir@fpmchurch.org',
      phone: '+2348000000030',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_SARAH,
      email: 'worker.sarah@fpmchurch.org',
      phone: '+2348000000040',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_JOHN,
      email: 'worker.john@fpmchurch.org',
      phone: '+2348000000050',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_GRACE,
      email: 'member.grace@fpmchurch.org',
      phone: '+2348000000060',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'active',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.USER_PENDING,
      email: 'daniel.new@fpmchurch.org',
      phone: '+2348000000070',
      passwordHash: DEFAULT_PASSWORD_HASH,
      accountStatus: 'pending',
      isAdmin: false,
      adminLevel: 'none',
      createdAt: '2026-03-01T09:30:00Z',
      updatedAt: '2026-03-01T09:30:00Z'
    }
  ];

  public members: Member[] = [
    {
      id: IDS.MEMBER_ADMIN,
      userId: IDS.USER_ADMIN,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'Ezekiel',
      middleName: 'K.',
      lastName: 'Adeyemi',
      primaryRoleId: IDS.ROLE_SUPER_ADMIN,
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1982-05-14',
      residentialAddress: '15 Victoria Island Blvd, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      emergencyContactName: 'Grace Adeyemi',
      emergencyContactPhone: '+2348011112222',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_PASTOR,
      userId: IDS.USER_PASTOR,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'David',
      middleName: 'O.',
      lastName: 'Adeleke',
      primaryRoleId: IDS.ROLE_BRANCH_PASTOR,
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1976-11-23',
      residentialAddress: 'Cathedral Residence, Ikeja, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      emergencyContactName: 'Ruth Adeleke',
      emergencyContactPhone: '+2348022223333',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_HOD,
      userId: IDS.USER_HOD,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'Rachel',
      middleName: 'Ann',
      lastName: 'Adams',
      primaryRoleId: IDS.ROLE_HOD,
      isWorker: true,
      gender: 'Female',
      dateOfBirth: '1988-08-19',
      residentialAddress: '24 Opebi Street, Ikeja, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      emergencyContactName: 'Thomas Adams',
      emergencyContactPhone: '+2348033334444',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_SARAH,
      userId: IDS.USER_SARAH,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'Sarah',
      middleName: 'Blessing',
      lastName: 'Williams',
      primaryRoleId: IDS.ROLE_WORKER,
      isWorker: true,
      gender: 'Female',
      dateOfBirth: '1995-02-11',
      residentialAddress: '8 Allen Avenue, Ikeja, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      emergencyContactName: 'Samuel Williams',
      emergencyContactPhone: '+2348044445555',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_JOHN,
      userId: IDS.USER_JOHN,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'John',
      middleName: 'Kofi',
      lastName: 'Mensah',
      primaryRoleId: IDS.ROLE_WORKER,
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1992-09-30',
      residentialAddress: '12 Isaac John Street, GRA Ikeja',
      profilePictureUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
      emergencyContactName: 'Kofi Mensah Sr.',
      emergencyContactPhone: '+2348055556666',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_GRACE,
      userId: IDS.USER_GRACE,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'Grace',
      middleName: 'Oluwaseun',
      lastName: 'Bello',
      primaryRoleId: IDS.ROLE_MEMBER,
      isWorker: false,
      gender: 'Female',
      dateOfBirth: '1998-04-15',
      residentialAddress: '45 Maryland Crescent, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      emergencyContactName: 'Olumide Bello',
      emergencyContactPhone: '+2348066667777',
      approvedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.MEMBER_PENDING,
      userId: IDS.USER_PENDING,
      primaryBranchId: IDS.BRANCH_HQ,
      firstName: 'Daniel',
      middleName: 'Emeka',
      lastName: 'Nwosu',
      primaryRoleId: IDS.ROLE_WORKER,
      isWorker: true,
      gender: 'Male',
      dateOfBirth: '1994-07-21',
      residentialAddress: '33 Toyin Street, Ikeja, Lagos',
      profilePictureUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
      emergencyContactName: 'Chinyere Nwosu',
      emergencyContactPhone: '+2348077778888',
      createdAt: '2026-03-01T09:30:00Z',
      updatedAt: '2026-03-01T09:30:00Z'
    }
  ];

  public workers: Worker[] = [
    {
      id: IDS.WORKER_SARAH,
      memberId: IDS.MEMBER_SARAH,
      workerIdCode: 'FPM-0001',
      pinHash: DEFAULT_PIN_HASH,
      departmentId: IDS.DEPT_CHOIR,
      positionName: 'Lead Vocalist',
      dateStartedServing: '2022-01-15',
      workerStatus: 'active',
      qrCodeToken: 'FPM-QR-SARAH-0001',
      biometricEnabled: true,
      createdAt: '2022-01-15T00:00:00Z',
      updatedAt: '2022-01-15T00:00:00Z'
    },
    {
      id: IDS.WORKER_JOHN,
      memberId: IDS.MEMBER_JOHN,
      workerIdCode: 'FPM-0002',
      pinHash: DEFAULT_PIN_HASH,
      departmentId: IDS.DEPT_MEDIA,
      positionName: 'Broadcast Director',
      dateStartedServing: '2021-06-10',
      workerStatus: 'active',
      qrCodeToken: 'FPM-QR-JOHN-0002',
      biometricEnabled: true,
      createdAt: '2021-06-10T00:00:00Z',
      updatedAt: '2021-06-10T00:00:00Z'
    },
    {
      id: IDS.WORKER_HOD,
      memberId: IDS.MEMBER_HOD,
      workerIdCode: 'FPM-0003',
      pinHash: DEFAULT_PIN_HASH,
      departmentId: IDS.DEPT_CHOIR,
      positionName: 'Choir Director / HOD',
      dateStartedServing: '2019-03-01',
      workerStatus: 'active',
      qrCodeToken: 'FPM-QR-RACHEL-0003',
      biometricEnabled: true,
      createdAt: '2019-03-01T00:00:00Z',
      updatedAt: '2019-03-01T00:00:00Z'
    }
  ];

  public services: ServiceSchedule[] = [
    {
      id: IDS.SERVICE_SUN_1,
      branchId: IDS.BRANCH_HQ,
      name: 'Sunday First Service (Celebration of Grace)',
      dayOfWeek: 'Sunday',
      startTime: '08:00:00',
      expectedEndTime: '10:30:00',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 60,
      attendanceDurationHours: 4.0,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.SERVICE_SUN_2,
      branchId: IDS.BRANCH_HQ,
      name: 'Sunday Second Service (Victory Impartation)',
      dayOfWeek: 'Sunday',
      startTime: '10:45:00',
      expectedEndTime: '13:00:00',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 45,
      attendanceDurationHours: 4.0,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.SERVICE_WED,
      branchId: IDS.BRANCH_HQ,
      name: 'Wednesday Midweek Word Feast & Communion',
      dayOfWeek: 'Wednesday',
      startTime: '18:00:00',
      expectedEndTime: '20:00:00',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 45,
      attendanceDurationHours: 3.0,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.SERVICE_FRI,
      branchId: IDS.BRANCH_HQ,
      name: 'Friday Night of Dominion Vigil',
      dayOfWeek: 'Friday',
      startTime: '22:00:00',
      expectedEndTime: '02:30:00',
      gracePeriodMinutes: 20,
      earliestClockInMinutes: 60,
      attendanceDurationHours: 5.0,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.SERVICE_SAT_REHEARSAL,
      branchId: IDS.BRANCH_HQ,
      name: 'Saturday Departmental Rehearsal & Workers Meeting',
      dayOfWeek: 'Saturday',
      startTime: '16:00:00',
      expectedEndTime: '18:30:00',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 30,
      attendanceDurationHours: 3.0,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: IDS.SERVICE_SPECIAL_THANKSGIVING,
      branchId: IDS.BRANCH_HQ,
      name: 'Special Miracle & Thanksgiving Service',
      dayOfWeek: 'Sunday',
      startTime: '09:00:00',
      expectedEndTime: '12:30:00',
      gracePeriodMinutes: 15,
      earliestClockInMinutes: 60,
      attendanceDurationHours: 4.5,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  public attendanceSettings: AttendanceSettings = {
    id: 'att-settings-global',
    branchId: IDS.BRANCH_HQ,
    defaultGracePeriodMinutes: 15,
    autoClockOutHours: 4.0,
    manualClockOutEnabled: true,
    earliestClockInMinutes: 60,
    allowBiometricClockIn: true,
    allowQrClockIn: true,
    allowPinClockIn: true,
    updatedAt: '2024-01-01T00:00:00Z'
  };

  public attendanceRecords: AttendanceRecord[] = [
    {
      id: 'att-1',
      workerId: IDS.WORKER_SARAH,
      serviceId: IDS.SERVICE_SUN_1,
      branchId: IDS.BRANCH_HQ,
      serviceDate: '2026-03-01',
      clockInTime: '2026-03-01T07:54:12Z',
      clockOutTime: '2026-03-01T11:45:00Z',
      durationMinutes: 231,
      clockInMethod: 'biometric',
      clockOutSource: 'manual',
      status: 'present',
      isAutoClockOut: false,
      createdAt: '2026-03-01T07:54:12Z',
      updatedAt: '2026-03-01T11:45:00Z'
    },
    {
      id: 'att-2',
      workerId: IDS.WORKER_JOHN,
      serviceId: IDS.SERVICE_SUN_1,
      branchId: IDS.BRANCH_HQ,
      serviceDate: '2026-03-01',
      clockInTime: '2026-03-01T08:24:30Z',
      clockOutTime: '2026-03-01T12:00:00Z',
      durationMinutes: 215,
      clockInMethod: 'qr',
      clockOutSource: 'manual',
      status: 'late',
      isAutoClockOut: false,
      createdAt: '2026-03-01T08:24:30Z',
      updatedAt: '2026-03-01T12:00:00Z'
    },
    {
      id: 'att-3',
      workerId: IDS.WORKER_HOD,
      serviceId: IDS.SERVICE_SUN_1,
      branchId: IDS.BRANCH_HQ,
      serviceDate: '2026-03-01',
      clockInTime: '2026-03-01T07:42:15Z',
      clockOutTime: '2026-03-01T12:10:00Z',
      durationMinutes: 268,
      clockInMethod: 'pin',
      clockOutSource: 'manual',
      status: 'present',
      isAutoClockOut: false,
      createdAt: '2026-03-01T07:42:15Z',
      updatedAt: '2026-03-01T12:10:00Z'
    },
    {
      id: 'att-4',
      workerId: IDS.WORKER_SARAH,
      serviceId: IDS.SERVICE_WED,
      branchId: IDS.BRANCH_HQ,
      serviceDate: '2026-03-04',
      clockInTime: '2026-03-04T17:50:00Z',
      clockOutTime: '2026-03-04T20:15:00Z',
      durationMinutes: 145,
      clockInMethod: 'biometric',
      clockOutSource: 'manual',
      status: 'present',
      isAutoClockOut: false,
      createdAt: '2026-03-04T17:50:00Z',
      updatedAt: '2026-03-04T20:15:00Z'
    }
  ];

  public events: EventItem[] = [
    {
      id: 'evt-1',
      branchId: undefined, // All FPM
      title: 'FPM Annual Global Faith Convention 2026',
      description: 'A 5-day spiritual convergence of nations under open heavens featuring prophetic insights, healings, and miraculous testimonies.',
      bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
      startDatetime: '2026-10-15T09:00:00Z',
      endDatetime: '2026-10-19T21:00:00Z',
      location: 'Faith Cathedral Mega Auditorium, Lagos & Live Global Broadcast',
      speaker: 'Pastor David Adeleke & Guest Ministers',
      category: 'Convention',
      registrationRequired: true,
      registrationCapacity: 5000,
      currentRegistrationsCount: 1420,
      targetScope: 'all',
      status: 'published',
      createdAt: '2026-01-10T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z'
    },
    {
      id: 'evt-2',
      branchId: IDS.BRANCH_HQ,
      title: 'Kingdom Workers & Ministers Summit',
      description: 'An equipping retreat for all department workers, choir members, ushers, protocol, media personnel, and pastors.',
      bannerUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      startDatetime: '2026-09-25T08:00:00Z',
      endDatetime: '2026-09-26T17:00:00Z',
      location: 'Grace Multipurpose Hall, Cathedral of Grace, Ikeja',
      speaker: 'Pastor David Adeleke',
      category: 'Training',
      registrationRequired: true,
      registrationCapacity: 800,
      currentRegistrationsCount: 235,
      targetScope: 'role',
      status: 'published',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z'
    },
    {
      id: 'evt-3',
      branchId: IDS.BRANCH_LEKKI,
      title: 'Ignite Youth Worship & Power Encounter',
      description: 'An electrifying encounter for youths, teenagers, and young professionals passionate about Christ and purpose.',
      bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
      startDatetime: '2026-09-30T17:00:00Z',
      endDatetime: '2026-09-30T21:30:00Z',
      location: 'Lekki City of Praise Sanctuary',
      speaker: 'Pastor Emmanuel Okafor',
      category: 'Youth',
      registrationRequired: false,
      currentRegistrationsCount: 0,
      targetScope: 'branch',
      status: 'published',
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z'
    }
  ];

  public eventRegistrations: { id: string; eventId: string; userId: string; registeredAt: string }[] = [];

  public posts: PostItem[] = [
    {
      id: 'post-1',
      authorId: IDS.USER_PASTOR,
      authorName: 'Pastor David Adeleke',
      branchId: IDS.BRANCH_HQ,
      visibility: 'all',
      title: 'Welcome to the New Month of Supernatural Acceleration!',
      content: 'Beloved family of Faith Preachers Ministry, the Lord has declared this season as our appointed time for supernatural momentum and divine favor. Whatever seemed delayed is now entering divine acceleration. Be steadfast, serve with joy, and expect uncommon open doors!',
      scriptureReference: 'Amos 9:13',
      postType: 'announcement',
      isPinned: true,
      likesCount: 84,
      commentsCount: 16,
      mediaUrls: ['https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800'],
      createdAt: '2026-09-01T06:00:00Z',
      updatedAt: '2026-09-01T06:00:00Z'
    },
    {
      id: 'post-2',
      authorId: IDS.USER_PASTOR,
      authorName: 'Pastor David Adeleke',
      branchId: IDS.BRANCH_HQ,
      visibility: 'all',
      title: 'Keys to Supernatural Breakthrough in Challenging Times',
      content: 'Faith is not the absence of trials; faith is the unwavering anchor that speaks God\'s victory in the presence of challenges. When you confess God\'s word consistently, natural barriers yield to divine supremacy. Stay connected, keep your prayer altar burning!',
      scriptureReference: 'Hebrews 11:1-3',
      postType: 'post',
      isPinned: false,
      likesCount: 52,
      commentsCount: 9,
      mediaUrls: [],
      createdAt: '2026-09-05T12:00:00Z',
      updatedAt: '2026-09-05T12:00:00Z'
    }
  ];

  public reactions: ReactionItem[] = [
    { id: 'rx-1', postId: 'post-1', userId: IDS.USER_SARAH, reactionType: 'amen', createdAt: '2026-09-01T07:00:00Z' },
    { id: 'rx-2', postId: 'post-1', userId: IDS.USER_JOHN, reactionType: 'like', createdAt: '2026-09-01T07:15:00Z' },
    { id: 'rx-3', postId: 'post-1', userId: IDS.USER_GRACE, reactionType: 'amen', createdAt: '2026-09-01T08:00:00Z' }
  ];

  public comments: CommentItem[] = [
    { id: 'c-1', postId: 'post-1', userId: IDS.USER_SARAH, userName: 'Sarah Blessing Williams', content: 'Amen and Amen! I receive this prophetic word for my family!', createdAt: '2026-09-01T07:05:00Z' },
    { id: 'c-2', postId: 'post-1', userId: IDS.USER_GRACE, userName: 'Grace Oluwaseun Bello', content: 'Hallelujah! Ready for supernatural momentum!', createdAt: '2026-09-01T08:10:00Z' }
  ];

  public serviceHighlights: ServiceHighlightItem[] = [
    {
      id: 'hl-1',
      serviceId: IDS.SERVICE_SUN_1,
      branchId: IDS.BRANCH_HQ,
      highlightDate: '2026-09-06',
      title: 'Operating in the Supernatural Dimension',
      speaker: 'Pastor David Adeleke',
      summary: 'In this profound Sunday service, we unlocked the spiritual mechanics of dynamic faith. Faith responds to revelation, spoken decrees, and courageous obedience.',
      scripture: 'Mark 9:23 - Jesus said unto him, If thou canst believe, all things are possible to him that believeth.',
      keyPoints: [
        'Faith is an active spiritual force, never passive hoping.',
        'Your words frame your world - align your tongue with scripture.',
        'Consecration and joyful service preserve the anointing.'
      ],
      quote: 'When faith speaks from an enlightened spirit, natural laws submit to the supremacy of divine authority.',
      photos: ['https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=600'],
      isPublished: true,
      createdAt: '2026-09-06T14:30:00Z',
      updatedAt: '2026-09-06T14:30:00Z'
    }
  ];

  public testimonies: TestimonyItem[] = [
    {
      id: 't-1',
      memberId: IDS.MEMBER_GRACE,
      authorName: 'Grace Oluwaseun Bello',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)',
      title: 'Instant Healing from 7 Years of Severe Spinal Pain',
      content: 'For seven continuous years I battled degenerative spinal inflammation that prevented me from bending or lifting my child without acute pain. During the communion service last Sunday, as Pastor declared healing, warmth flowed through my back. The pain left instantly! Medical checks confirmed complete restoration!',
      category: 'Healing',
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      allowPublish: true,
      status: 'approved',
      reviewedBy: IDS.USER_ADMIN,
      reviewedAt: '2026-09-07T10:00:00Z',
      isFeaturedOnFeed: true,
      createdAt: '2026-09-06T18:00:00Z',
      updatedAt: '2026-09-07T10:00:00Z'
    },
    {
      id: 't-2',
      memberId: IDS.MEMBER_SARAH,
      authorName: 'Sarah Blessing Williams',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)',
      title: 'Miraculous International Employment & Relocation Sponsorship',
      content: 'After 2 years of constant job search post-graduation, I committed to serving in the choir faithfully every service. Two weeks ago, I received an unapplied job offer with a multinational firm in London with full visa sponsorship! God honors dedicated kingdom service!',
      category: 'Promotion',
      allowPublish: true,
      status: 'approved',
      reviewedBy: IDS.USER_ADMIN,
      reviewedAt: '2026-09-07T11:00:00Z',
      isFeaturedOnFeed: true,
      createdAt: '2026-09-07T09:00:00Z',
      updatedAt: '2026-09-07T11:00:00Z'
    },
    {
      id: 't-3',
      memberId: IDS.MEMBER_PENDING,
      authorName: 'Daniel Emeka Nwosu',
      branchId: IDS.BRANCH_HQ,
      branchName: 'Cathedral of Grace (HQ)',
      title: 'Safe Delivery of Twins Against Medical Odds',
      content: 'Specialists had warned of extreme complications during labor, but through the continuous prayer intercession of Faith Preachers Ministry, my wife delivered both twins safely with zero surgery!',
      category: 'Childbirth',
      allowPublish: true,
      status: 'pending_review',
      isFeaturedOnFeed: false,
      createdAt: '2026-09-08T15:30:00Z',
      updatedAt: '2026-09-08T15:30:00Z'
    }
  ];

  public notifications: NotificationItem[] = [
    {
      id: 'n-1',
      title: 'Welcome to FPM ONE',
      body: 'Faith Preachers Ministry mobile portal is officially live. Connect, serve, and grow with us!',
      notificationType: 'announcement',
      targetScope: 'entire_church',
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'n-2',
      title: 'Upcoming Service: Sunday Celebration of Grace',
      body: 'Join us this Sunday at 8:00 AM for an encounter of grace and victory at Cathedral of Grace.',
      notificationType: 'upcoming_service',
      targetScope: 'branch',
      targetId: IDS.BRANCH_HQ,
      createdAt: '2026-09-05T10:00:00Z'
    },
    {
      id: 'n-3',
      title: 'Workers Punctuality Reminder',
      body: 'All department workers are expected to clock in at least 15 minutes before service commences.',
      notificationType: 'admin_alert',
      targetScope: 'ministry_role',
      targetId: IDS.ROLE_WORKER,
      createdAt: '2026-09-05T14:00:00Z'
    }
  ];

  public notificationReads: { notificationId: string; userId: string; isRead: boolean }[] = [];

  public auditLogs: AuditLogItem[] = [
    {
      id: 'aud-1',
      actorName: 'System Setup',
      actorRole: 'system',
      action: 'SYSTEM_INITIALIZED',
      targetType: 'system',
      targetId: 'fpm-global',
      newState: { version: '1.0.0', status: 'ready' },
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'aud-2',
      actorId: IDS.USER_ADMIN,
      actorName: 'Ezekiel Adeyemi',
      actorRole: 'super_admin',
      action: 'BRANCH_CREATED',
      targetType: 'branch',
      targetId: IDS.BRANCH_HQ,
      newState: { name: 'Cathedral of Grace (HQ)', code: 'FPM-HQ' },
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];

  public mediaFiles: MediaItem[] = [];

  private workerCounter = 4;

  public getNextWorkerCode(): string {
    let maxFound = this.workerCounter;
    for (const w of this.workers) {
      const match = w.workerIdCode.match(/FPM-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= maxFound) {
          maxFound = val + 1;
        }
      }
    }
    const num = maxFound;
    this.workerCounter = maxFound + 1;
    return `FPM-${num.toString().padStart(4, '0')}`;
  }

  public async initFromPostgres(): Promise<boolean> {
    try {
      const { hydrateStoreFromPostgres } = await import('../db/sync');
      return await hydrateStoreFromPostgres(this);
    } catch (err: any) {
      console.warn('[DATABASE] Supabase PostgreSQL sync skipped or failed:', err.message);
      return false;
    }
  }
}

export const db = new DatabaseStore();
