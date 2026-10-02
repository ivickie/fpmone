import bcrypt from 'bcryptjs';
import { query } from '../db';
import { IDS } from '../data/mockDb';

const PASSWORD_PLAIN = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD_PLAIN, 10);

interface BranchAccount {
  userId: string;
  memberId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  branchId: string;
  branchName: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  accountType: 'Branch Pastor' | 'Branch Admin';
}

const ACCOUNTS: BranchAccount[] = [
  // 1. Ilorin Branch (Headquarters)
  {
    userId: 'c2222222-2222-2222-2222-222222222222',
    memberId: 'e2222222-2222-2222-2222-222222222222',
    email: 'pastor.ilorin@faithpreachers.org',
    phone: '+2348030000001',
    firstName: 'Tosin',
    lastName: 'Jaiyeola',
    branchId: IDS.BRANCH_HQ,
    branchName: 'Ilorin Branch (Headquarters)',
    roleId: IDS.ROLE_BRANCH_PASTOR,
    roleCode: 'BRANCH_PASTOR',
    roleName: 'Branch Pastor',
    accountType: 'Branch Pastor'
  },
  {
    userId: 'c8888888-1111-1111-1111-000000000001',
    memberId: 'e8888888-1111-1111-1111-000000000001',
    email: 'admin.ilorin@faithpreachers.org',
    phone: '+2348030000002',
    firstName: 'Ilorin',
    lastName: 'Branch Admin',
    branchId: IDS.BRANCH_HQ,
    branchName: 'Ilorin Branch (Headquarters)',
    roleId: IDS.ROLE_BRANCH_ADMIN,
    roleCode: 'BRANCH_ADMIN',
    roleName: 'Branch Administrator',
    accountType: 'Branch Admin'
  },

  // 2. Lagos Branch
  {
    userId: 'c2222222-2222-2222-2222-000000000001',
    memberId: 'e2222222-2222-2222-2222-000000000001',
    email: 'pastor.lagos@faithpreachers.org',
    phone: '+2348030000003',
    firstName: 'Sam',
    lastName: 'Jaiyeola',
    branchId: IDS.BRANCH_LAGOS,
    branchName: 'Lagos Branch',
    roleId: IDS.ROLE_BRANCH_PASTOR,
    roleCode: 'BRANCH_PASTOR',
    roleName: 'Branch Pastor',
    accountType: 'Branch Pastor'
  },
  {
    userId: 'c8888888-2222-2222-2222-000000000002',
    memberId: 'e8888888-2222-2222-2222-000000000002',
    email: 'admin.lagos@faithpreachers.org',
    phone: '+2348030000004',
    firstName: 'Lagos',
    lastName: 'Branch Admin',
    branchId: IDS.BRANCH_LAGOS,
    branchName: 'Lagos Branch',
    roleId: IDS.ROLE_BRANCH_ADMIN,
    roleCode: 'BRANCH_ADMIN',
    roleName: 'Branch Administrator',
    accountType: 'Branch Admin'
  },

  // 3. Abuja Branch
  {
    userId: 'c2222222-4444-4444-4444-000000000001',
    memberId: 'e2222222-4444-4444-4444-000000000001',
    email: 'pastor.abuja@faithpreachers.org',
    phone: '+2348030000005',
    firstName: 'Pastor',
    lastName: 'Kesh',
    branchId: IDS.BRANCH_ABUJA,
    branchName: 'Abuja Branch',
    roleId: IDS.ROLE_BRANCH_PASTOR,
    roleCode: 'BRANCH_PASTOR',
    roleName: 'Branch Pastor',
    accountType: 'Branch Pastor'
  },
  {
    userId: 'c8888888-4444-4444-4444-000000000003',
    memberId: 'e8888888-4444-4444-4444-000000000003',
    email: 'admin.abuja@faithpreachers.org',
    phone: '+2348030000006',
    firstName: 'Abuja',
    lastName: 'Branch Admin',
    branchId: IDS.BRANCH_ABUJA,
    branchName: 'Abuja Branch',
    roleId: IDS.ROLE_BRANCH_ADMIN,
    roleCode: 'BRANCH_ADMIN',
    roleName: 'Branch Administrator',
    accountType: 'Branch Admin'
  },

  // 4. UK Branch
  {
    userId: 'c2222222-3333-3333-3333-000000000001',
    memberId: 'e2222222-3333-3333-3333-000000000001',
    email: 'pastor.uk@faithpreachers.org',
    phone: '+447946000001',
    firstName: 'Pastor',
    lastName: 'Seye',
    branchId: IDS.BRANCH_UK,
    branchName: 'UK Branch',
    roleId: IDS.ROLE_BRANCH_PASTOR,
    roleCode: 'BRANCH_PASTOR',
    roleName: 'Branch Pastor',
    accountType: 'Branch Pastor'
  },
  {
    userId: 'c8888888-3333-3333-3333-000000000004',
    memberId: 'e8888888-3333-3333-3333-000000000004',
    email: 'admin.uk@faithpreachers.org',
    phone: '+447946000002',
    firstName: 'UK',
    lastName: 'Branch Admin',
    branchId: IDS.BRANCH_UK,
    branchName: 'UK Branch',
    roleId: IDS.ROLE_BRANCH_ADMIN,
    roleCode: 'BRANCH_ADMIN',
    roleName: 'Branch Administrator',
    accountType: 'Branch Admin'
  },

  // 5. Canada Branch
  {
    userId: 'c2222222-5555-5555-5555-000000000001',
    memberId: 'e2222222-5555-5555-5555-000000000001',
    email: 'pastor.canada@faithpreachers.org',
    phone: '+19055550001',
    firstName: 'Seun',
    lastName: 'Otuyemi',
    branchId: IDS.BRANCH_CAN,
    branchName: 'Canada Branch',
    roleId: IDS.ROLE_BRANCH_PASTOR,
    roleCode: 'BRANCH_PASTOR',
    roleName: 'Branch Pastor',
    accountType: 'Branch Pastor'
  },
  {
    userId: 'c8888888-5555-5555-5555-000000000005',
    memberId: 'e8888888-5555-5555-5555-000000000005',
    email: 'admin.canada@faithpreachers.org',
    phone: '+19055550002',
    firstName: 'Canada',
    lastName: 'Branch Admin',
    branchId: IDS.BRANCH_CAN,
    branchName: 'Canada Branch',
    roleId: IDS.ROLE_BRANCH_ADMIN,
    roleCode: 'BRANCH_ADMIN',
    roleName: 'Branch Administrator',
    accountType: 'Branch Admin'
  }
];

async function createBranchAccounts() {
  console.log('--- Starting Creation of Branch Pastor & Admin Accounts in Supabase PostgreSQL ---');

  for (const acc of ACCOUNTS) {
    console.log(`Processing [${acc.accountType}] for ${acc.branchName}: ${acc.email} (${acc.userId})`);

    // 1. Upsert User
    await query(`
      INSERT INTO users (
        id, email, phone, password_hash, account_status, is_admin, admin_level, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'active', true, 'branch_admin', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        account_status = 'active',
        is_admin = true,
        admin_level = 'branch_admin',
        updated_at = NOW()
    `, [acc.userId, acc.email, acc.phone, PASSWORD_HASH]);

    // 2. Upsert Member
    await query(`
      INSERT INTO members (
        id, user_id, primary_branch_id, first_name, last_name, primary_role_id,
        is_worker, approved_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, true, NOW(), NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        primary_branch_id = EXCLUDED.primary_branch_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        primary_role_id = EXCLUDED.primary_role_id,
        is_worker = true,
        updated_at = NOW()
    `, [acc.memberId, acc.userId, acc.branchId, acc.firstName, acc.lastName, acc.roleId]);

    // 3. If pastor, link branch_pastor_id in branches table
    if (acc.roleCode === 'BRANCH_PASTOR') {
      await query(`
        UPDATE branches
        SET branch_pastor_id = $1, branch_pastor_name = $2, updated_at = NOW()
        WHERE id = $3
      `, [acc.userId, `Pastor ${acc.firstName} ${acc.lastName}`.trim(), acc.branchId]);
    }
  }

  console.log('\n--- Accounts Successfully Created in Supabase! ---');

  // Verify accounts in DB
  const res = await query(`
    SELECT 
      b.name as branch,
      m.first_name || ' ' || m.last_name as full_name,
      r.name as role_name,
      u.email,
      u.phone,
      u.admin_level,
      u.account_status
    FROM users u
    JOIN members m ON m.user_id = u.id
    JOIN branches b ON b.id = m.primary_branch_id
    JOIN ministry_roles r ON r.id = m.primary_role_id
    WHERE r.code IN ('BRANCH_PASTOR', 'BRANCH_ADMIN')
    ORDER BY b.is_headquarters DESC, b.name ASC, r.code ASC
  `);

  console.table(res.rows);
  process.exit(0);
}

createBranchAccounts().catch(err => {
  console.error('Account creation error:', err);
  process.exit(1);
});
