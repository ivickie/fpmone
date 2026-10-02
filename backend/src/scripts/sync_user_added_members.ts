import bcrypt from 'bcryptjs';
import { query } from '../db/index';

async function syncMembers() {
  console.log('[SYNC] Connecting to PostgreSQL to sync user-added members...');

  const PIN_HASH = bcrypt.hashSync('1234', 10);
  const ABUJA_BRANCH_ID = 'b4444444-4444-4444-4444-444444444444';
  const ROLE_HOD_ID = 'a5555555-5555-5555-5555-555555555555';
  const ROLE_WORKER_ID = 'a6666666-6666-6666-6666-666666666666';
  const ABUJA_CHOIR_DEPT_ID = 'd1111111-4444-4444-4444-000000000001';

  // 1. Sync Fela Durotoye
  // Check user
  let felaUser = (await query("SELECT id FROM users WHERE email = 'fela@fpmchurch.org'")).rows[0];
  if (!felaUser) {
    const res = await query(`
      INSERT INTO users (id, email, phone, password_hash, account_status, is_admin, admin_level, created_at, updated_at)
      VALUES (gen_random_uuid(), 'fela@fpmchurch.org', '+2348136004047', $1, 'active', false, 'none', NOW(), NOW())
      RETURNING id
    `, [bcrypt.hashSync('Password123!', 10)]);
    felaUser = res.rows[0];
  }
  const felaUserId = felaUser.id;
  console.log('[SYNC] Fela User ID:', felaUserId);

  // Check/Insert Fela Member
  let felaMem = (await query("SELECT id FROM members WHERE user_id = $1", [felaUserId])).rows[0];
  const felaMemberId = felaMem ? felaMem.id : '18fcadda-fd29-44e8-9d7e-744ab019cabe';
  if (!felaMem) {
    await query(`
      INSERT INTO members (
        id, user_id, primary_branch_id, first_name, last_name, primary_role_id,
        is_worker, gender, residential_address, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Fela', 'Durotoye', $4, true, 'Male', 'Mpape, Abuja', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        primary_branch_id = EXCLUDED.primary_branch_id,
        primary_role_id = EXCLUDED.primary_role_id,
        is_worker = true
    `, [felaMemberId, felaUserId, ABUJA_BRANCH_ID, ROLE_HOD_ID]);
    console.log('[SYNC] Fela Member created:', felaMemberId);
  }

  // Check/Insert Fela Worker
  await query(`
    INSERT INTO workers (
      id, member_id, worker_id_code, pin_hash, department_id,
      position_name, date_started_serving, worker_status, qr_code_token, biometric_enabled,
      created_at, updated_at
    ) VALUES (
      '4636f4d6-e6e9-4adf-aba5-35fba3e986e6', $1, 'FPM-0005', $2, $3,
      'Head of Department', '2026-10-02', 'active', 'FPM-QR-FPM-0005-bfd37cc8', true,
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      worker_id_code = EXCLUDED.worker_id_code,
      department_id = EXCLUDED.department_id,
      position_name = EXCLUDED.position_name,
      worker_status = 'active'
  `, [felaMemberId, PIN_HASH, ABUJA_CHOIR_DEPT_ID]);
  console.log('[SYNC] Fela Worker synced.');

  // Update Abuja Choir HOD
  await query(`
    UPDATE departments
    SET hod_id = $1, hod_name = 'Fela Durotoye', updated_at = NOW()
    WHERE id = $2
  `, [felaUserId, ABUJA_CHOIR_DEPT_ID]);
  console.log('[SYNC] Abuja Choir HOD set to Fela Durotoye.');

  // 2. Sync Victor Adeosun
  let victorUser = (await query("SELECT id FROM users WHERE email = 'victor@fpmchurch.org'")).rows[0];
  if (!victorUser) {
    const res = await query(`
      INSERT INTO users (id, email, phone, password_hash, account_status, is_admin, admin_level, created_at, updated_at)
      VALUES (gen_random_uuid(), 'victor@fpmchurch.org', '+2347037288929', $1, 'active', false, 'none', NOW(), NOW())
      RETURNING id
    `, [bcrypt.hashSync('Password123!', 10)]);
    victorUser = res.rows[0];
  }
  const victorUserId = victorUser.id;
  console.log('[SYNC] Victor User ID:', victorUserId);

  let victorMem = (await query("SELECT id FROM members WHERE user_id = $1", [victorUserId])).rows[0];
  const victorMemberId = victorMem ? victorMem.id : '0dbc4f20-00b0-41b3-876b-d80f60d1bf06';
  if (!victorMem) {
    await query(`
      INSERT INTO members (
        id, user_id, primary_branch_id, first_name, last_name, primary_role_id,
        is_worker, gender, residential_address, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Victor', 'Adeosun', $4, true, 'Male', 'Jikwoyi, Abuja', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        primary_branch_id = EXCLUDED.primary_branch_id,
        primary_role_id = EXCLUDED.primary_role_id,
        is_worker = true
    `, [victorMemberId, victorUserId, ABUJA_BRANCH_ID, ROLE_WORKER_ID]);
    console.log('[SYNC] Victor Member created:', victorMemberId);
  }

  // Insert Victor Worker
  await query(`
    INSERT INTO workers (
      id, member_id, worker_id_code, pin_hash, department_id,
      position_name, date_started_serving, worker_status, qr_code_token, biometric_enabled,
      created_at, updated_at
    ) VALUES (
      'cf0e009e-9d5a-4322-9535-900ae09674bc', $1, 'FPM-0006', $2, $3,
      'Bassist', '2026-10-02', 'active', 'FPM-QR-FPM-0006-ad7d67a0', true,
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      worker_id_code = EXCLUDED.worker_id_code,
      department_id = EXCLUDED.department_id,
      position_name = EXCLUDED.position_name,
      worker_status = 'active'
  `, [victorMemberId, PIN_HASH, ABUJA_CHOIR_DEPT_ID]);
  console.log('[SYNC] Victor Worker synced.');

  console.log('[SYNC] Successfully completed synchronization to Supabase PostgreSQL!');
  process.exit(0);
}

syncMembers().catch(err => {
  console.error('[SYNC ERROR]', err);
  process.exit(1);
});
