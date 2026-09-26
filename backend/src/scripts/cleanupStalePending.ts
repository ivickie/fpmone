import { query } from '../db';

async function runCleanup() {
  console.log('[CLEANUP] Starting purge of stale orphaned pending notifications and users...');
  
  const staleUserIds = [
    '52c4b9b1-cddc-4852-828f-22f503d9d2e3',
    '4172a803-5459-42f6-ac88-0331cc9ddfef'
  ];

  const staleNotifIds = [
    '1a9b78bb-e233-4d4b-8589-a9cc3f9d0dfe',
    'b1d99cea-c402-4a14-b104-82e8b0d2ac44'
  ];

  try {
    // 1. Delete notifications
    const delNotifRes = await query(
      `DELETE FROM notifications WHERE id = ANY($1::uuid[]) OR title LIKE '%Registration Awaiting Approval%' RETURNING id, title`,
      [staleNotifIds]
    );
    console.log(`[CLEANUP] Deleted ${delNotifRes.rowCount} notifications from database:`, delNotifRes.rows);

    // 2. Delete audit logs associated with these users
    await query(
      `DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[]) OR target_id = ANY($1::text[])`,
      [staleUserIds]
    );

    // 3. Delete members (if any exist)
    await query(
      `DELETE FROM members WHERE user_id = ANY($1::uuid[])`,
      [staleUserIds]
    );

    // 4. Delete users
    const delUsersRes = await query(
      `DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING id, email`,
      [staleUserIds]
    );
    console.log(`[CLEANUP] Deleted ${delUsersRes.rowCount} pending users from database:`, delUsersRes.rows);

    // Verify database state
    const remainingPendingUsers = await query(`SELECT id, email, account_status FROM users WHERE account_status = 'pending'`);
    console.log(`[CLEANUP] Remaining pending users in DB: ${remainingPendingUsers.rowCount}`);

    const remainingApprovalNotifs = await query(`SELECT id, title FROM notifications WHERE title LIKE '%Approval%'`);
    console.log(`[CLEANUP] Remaining approval notifications in DB: ${remainingApprovalNotifs.rowCount}`);

  } catch (err: any) {
    console.error('[CLEANUP ERROR]', err.message);
  }

  process.exit(0);
}

runCleanup();
