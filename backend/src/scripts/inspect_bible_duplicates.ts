import { query, pool } from '../db';

async function run() {
  try {
    console.log('--- INSPECTING BIBLE GAME DATABASE RECORDS ---');
    
    // 1. Check duplicate progress rows for same (user_id, challenge_date)
    const dupRes = await query(`
      SELECT user_id, challenge_date, count(*) as count
      FROM bible_game_user_progress
      GROUP BY user_id, challenge_date
      HAVING count(*) > 1
    `);
    console.log(`Duplicate (user_id, challenge_date) pairs in bible_game_user_progress: ${dupRes.rows.length}`);
    if (dupRes.rows.length > 0) {
      console.log('Duplicates found:', JSON.stringify(dupRes.rows, null, 2));
    }

    // 2. Check all progress rows
    const allProgressRes = await query(`
      SELECT id, user_id, challenge_date, is_completed, score, xp_awarded, answers, completed_at, updated_at
      FROM bible_game_user_progress
      ORDER BY challenge_date DESC, updated_at DESC
    `);
    console.log(`Total bible_game_user_progress rows: ${allProgressRes.rows.length}`);
    for (const r of allProgressRes.rows) {
      console.log(`  Row: id=${r.id}, user=${r.user_id}, date=${r.challenge_date}, completed=${r.is_completed}, score=${r.score}, xp=${r.xp_awarded}, answers=${Array.isArray(r.answers) ? r.answers.length : 0}, completed_at=${r.completed_at}`);
    }

    // 3. Check all stats rows
    const statsRes = await query(`
      SELECT user_id, cumulative_xp, current_streak, best_streak, total_challenges_completed, perfect_scores_count, last_completed_date
      FROM bible_game_user_stats
    `);
    console.log(`Total bible_game_user_stats rows: ${statsRes.rows.length}`);
    for (const s of statsRes.rows) {
      console.log(`  Stats: user=${s.user_id}, cumulative_xp=${s.cumulative_xp}, streak=${s.current_streak}, best=${s.best_streak}, games=${s.total_challenges_completed}, perfect=${s.perfect_scores_count}, last_played=${s.last_completed_date}`);
    }

    // 4. Check for discrepancy between user_stats.cumulative_xp and sum of progress.xp_awarded
    const discrepancyRes = await query(`
      SELECT 
        s.user_id, 
        s.cumulative_xp as stats_xp,
        s.total_challenges_completed as stats_games,
        COALESCE(SUM(p.xp_awarded), 0) as progress_sum_xp,
        COUNT(CASE WHEN p.is_completed = true THEN 1 END) as completed_games_count
      FROM bible_game_user_stats s
      LEFT JOIN bible_game_user_progress p ON s.user_id = p.user_id
      GROUP BY s.user_id, s.cumulative_xp, s.total_challenges_completed
    `);
    console.log(`User XP comparison:`);
    for (const d of discrepancyRes.rows) {
      console.log(`  User: ${d.user_id} | stats_xp: ${d.stats_xp} vs progress_sum_xp: ${d.progress_sum_xp} | stats_games: ${d.stats_games} vs completed_games: ${d.completed_games_count}`);
    }

  } catch (err: any) {
    console.error('Error during inspection:', err);
  } finally {
    await pool.end();
  }
}

run();
