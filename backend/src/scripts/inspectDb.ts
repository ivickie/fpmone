import { query } from '../db';

async function inspectDb() {
  try {
    const users = await query('SELECT id, email, phone, account_status, created_at FROM users WHERE account_status = $1', ['pending']);
    console.log('Pending users in DB count:', users.rows.length);
    console.log('Pending users in DB:', JSON.stringify(users.rows, null, 2));
    for (const u of users.rows) {
      const mem = await query('SELECT * FROM members WHERE user_id = $1', [u.id]);
      console.log('Member for user', u.id, ':', JSON.stringify(mem.rows, null, 2));
    }
    const notifs = await query("SELECT id, title, body, created_at FROM notifications WHERE title LIKE '%Approval%' OR title LIKE '%Registration%' ORDER BY created_at DESC");
    console.log('Registration notifications:', JSON.stringify(notifs.rows, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
inspectDb();
