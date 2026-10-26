const { Pool } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const badges = [
  { id: 'FIRST_STEPS', name: 'First Steps', description: 'Completed your first daily Bible challenge.', icon: 'Footprints', xpReward: 10, displayOrder: 1 },
  { id: 'PERFECT_FIVE', name: 'Perfect Five', description: 'Answered all 5 questions correctly in a challenge.', icon: 'Award', xpReward: 25, displayOrder: 2 },
  { id: 'STREAK_3', name: 'Three-Day Streak', description: 'Completed daily challenges on 3 consecutive days.', icon: 'Flame', xpReward: 15, displayOrder: 3 },
  { id: 'STREAK_7', name: 'Seven-Day Streak', description: 'Completed daily challenges on 7 consecutive days.', icon: 'Zap', xpReward: 30, displayOrder: 4 },
  { id: 'BIBLE_EXPLORER', name: 'Bible Explorer', description: 'Completed 25 daily Bible challenges.', icon: 'Compass', xpReward: 50, displayOrder: 5 },
  { id: 'CENTURION_XP', name: 'Centurion', description: 'Earned 100 or more cumulative XP in Scripture knowledge.', icon: 'Shield', xpReward: 20, displayOrder: 6 }
];

async function seed() {
  for (const b of badges) {
    await pool.query(
      `INSERT INTO bible_game_badges (id, name, description, icon, xp_reward, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         xp_reward = EXCLUDED.xp_reward,
         display_order = EXCLUDED.display_order`,
      [b.id, b.name, b.description, b.icon, b.xpReward, b.displayOrder]
    );
  }
  const check = await pool.query('SELECT count(*) FROM bible_game_badges');
  console.log('Seeded bible_game_badges count:', check.rows[0].count);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  pool.end();
});
