import { query, pool } from '../db';

async function checkMediaAndMoments() {
  try {
    const momentsRes = await query('SELECT id, branch_id, uploaded_by_name, caption, created_at, media_url FROM sunday_moments');
    console.log('--- Sunday Moments (Count: ' + momentsRes.rows.length + ') ---');
    console.log(JSON.stringify(momentsRes.rows, null, 2));

    const mediaRes = await query('SELECT id, branch_id, title, category, media_type, file_url, created_at FROM media_items LIMIT 25');
    console.log('--- Media Items (Sample 25 of ' + (await query('SELECT COUNT(*) FROM media_items')).rows[0].count + ') ---');
    console.log(JSON.stringify(mediaRes.rows, null, 2));

    const servicesRes = await query('SELECT id, branch_id, name, start_time, created_at FROM services LIMIT 10');
    console.log('--- Services (Sample 10) ---');
    console.log(JSON.stringify(servicesRes.rows, null, 2));

    const highlightsRes = await query('SELECT id, service_id, branch_id, title, highlight_date FROM service_highlights');
    console.log('--- Service Highlights ---');
    console.log(JSON.stringify(highlightsRes.rows, null, 2));

    const testimoniesRes = await query('SELECT id, title, member_id, status FROM testimonies');
    console.log('--- Testimonies ---');
    console.log(JSON.stringify(testimoniesRes.rows, null, 2));

    const eventsRes = await query('SELECT id, title, start_datetime FROM events');
    console.log('--- Events ---');
    console.log(JSON.stringify(eventsRes.rows, null, 2));

    const financeRes = await query('SELECT id, transaction_type, category, amount, transaction_date FROM finance_transactions LIMIT 10');
    console.log('--- Finance Transactions (Sample 10) ---');
    console.log(JSON.stringify(financeRes.rows, null, 2));

  } catch (err: any) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

checkMediaAndMoments();
