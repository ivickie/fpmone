import bcrypt from 'bcryptjs';
import { query } from '../db';
import { IDS } from '../data/mockDb';

const PASSWORD_PLAIN = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD_PLAIN, 10);

const HOD_ACCOUNTS = [
  {
    userId: 'c3333333-1111-1111-1111-000000000002',
    memberId: 'e3333333-1111-1111-1111-000000000002',
    email: 'hod.media@faithpreachers.org',
    phone: '+2348030000071',
    firstName: 'Emmanuel',
    lastName: 'Adeleke',
    branchId: IDS.BRANCH_HQ,
    roleId: IDS.ROLE_HOD,
    accountStatus: 'active'
  },
  {
    userId: 'c3333333-2222-2222-2222-000000000003',
    memberId: 'e3333333-2222-2222-2222-000000000003',
    email: 'hod.lagos@faithpreachers.org',
    phone: '+2348030000072',
    firstName: 'Peter',
    lastName: 'Obi',
    branchId: IDS.BRANCH_LAGOS,
    roleId: IDS.ROLE_HOD,
    accountStatus: 'active'
  },
  {
    userId: 'c3333333-9999-9999-9999-000000000004',
    memberId: 'e3333333-9999-9999-9999-000000000004',
    email: 'suspended.hod@faithpreachers.org',
    phone: '+2348030000073',
    firstName: 'Deborah',
    lastName: 'Vance',
    branchId: IDS.BRANCH_HQ,
    roleId: IDS.ROLE_HOD,
    accountStatus: 'suspended'
  }
];

async function seedHodAccounts() {
  console.log('Seeding HOD test accounts to database...');
  for (const acc of HOD_ACCOUNTS) {
    await query(`
      INSERT INTO users (id, email, phone, password_hash, account_status, is_admin, admin_level)
      VALUES ($1, $2, $3, $4, $5, FALSE, 'none')
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        account_status = EXCLUDED.account_status;
    `, [acc.userId, acc.email, acc.phone, PASSWORD_HASH, acc.accountStatus]);

    await query(`
      INSERT INTO members (id, user_id, primary_branch_id, first_name, middle_name, last_name, primary_role_id, is_worker, gender, residential_address)
      VALUES ($1, $2, $3, $4, '', $5, $6, TRUE, 'Male', 'Church Residence')
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        primary_branch_id = EXCLUDED.primary_branch_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        primary_role_id = EXCLUDED.primary_role_id;
    `, [acc.memberId, acc.userId, acc.branchId, acc.firstName, acc.lastName, acc.roleId]);

    console.log(`[OK] HOD ${acc.email} (${acc.firstName} ${acc.lastName}) synced.`);
  }
  console.log('HOD seeding complete.');
  process.exit(0);
}

seedHodAccounts().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
