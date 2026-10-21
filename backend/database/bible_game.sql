-- =============================================================================
-- FAITH PREACHERS MINISTRIES INT'L - FPM GLOBAL
-- BIBLE CHALLENGE GAME RELATIONAL SCHEMA & MIGRATION
-- =============================================================================

-- 1. BIBLE GAME QUESTIONS
CREATE TABLE IF NOT EXISTS bible_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 strings: ["Choice A", "Choice B", "Choice C", "Choice D"]
    correct_option_index INT NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
    explanation TEXT NOT NULL,
    bible_reference VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'Bible Characters',
        'Old Testament',
        'New Testament',
        'Life and Teachings of Jesus',
        'Miracles and Parables',
        'Books of the Bible',
        'Scripture Knowledge'
    )),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_questions_status ON bible_game_questions(status);
CREATE INDEX IF NOT EXISTS idx_bg_questions_category ON bible_game_questions(category);
CREATE INDEX IF NOT EXISTS idx_bg_questions_difficulty ON bible_game_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_bg_questions_created ON bible_game_questions(created_at DESC);

-- 2. DAILY CHALLENGES (Authoritative calendar date in Africa/Lagos)
CREATE TABLE IF NOT EXISTS bible_game_daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_date DATE NOT NULL UNIQUE,
    question_ids JSONB NOT NULL, -- Array of 5 question UUIDs in fixed presentation order
    status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_challenges_date ON bible_game_daily_challenges(challenge_date DESC);

-- 3. USER GAME PROGRESS / SESSIONS
CREATE TABLE IF NOT EXISTS bible_game_user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    challenge_id UUID NOT NULL REFERENCES bible_game_daily_challenges(id) ON DELETE CASCADE,
    current_question_index INT NOT NULL DEFAULT 0 CHECK (current_question_index BETWEEN 0 AND 5),
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 5),
    xp_awarded INT NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bg_user_challenge_date UNIQUE (user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_bg_progress_user ON bible_game_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_progress_member ON bible_game_user_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_bg_progress_date ON bible_game_user_progress(challenge_date);
CREATE INDEX IF NOT EXISTS idx_bg_progress_completed ON bible_game_user_progress(is_completed, completed_at DESC);

-- 4. USER GAME STATISTICS
CREATE TABLE IF NOT EXISTS bible_game_user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    cumulative_xp INT NOT NULL DEFAULT 0 CHECK (cumulative_xp >= 0),
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    best_streak INT NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    last_completed_date DATE,
    total_challenges_completed INT NOT NULL DEFAULT 0,
    perfect_scores_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bg_stats_xp ON bible_game_user_stats(cumulative_xp DESC);
CREATE INDEX IF NOT EXISTS idx_bg_stats_member ON bible_game_user_stats(member_id);

-- 5. BADGES / ACHIEVEMENTS CATALOG
CREATE TABLE IF NOT EXISTS bible_game_badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    xp_reward INT NOT NULL DEFAULT 0,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. USER BADGE AWARDS
CREATE TABLE IF NOT EXISTS bible_game_user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL REFERENCES bible_game_badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    challenge_date DATE,
    CONSTRAINT uq_bg_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_bg_user_badges_user ON bible_game_user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_bg_user_badges_badge ON bible_game_user_badges(badge_id);

-- 7. GAME SETTINGS
CREATE TABLE IF NOT EXISTS bible_game_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial System Badges
INSERT INTO bible_game_badges (id, name, description, icon, xp_reward, display_order)
VALUES
    ('FIRST_STEPS', 'First Steps', 'Completed your first daily Bible challenge.', 'Footprints', 10, 1),
    ('PERFECT_FIVE', 'Perfect Five', 'Answered all 5 questions correctly in a challenge.', 'Award', 25, 2),
    ('STREAK_3', 'Three-Day Streak', 'Completed daily challenges on 3 consecutive days.', 'Flame', 15, 3),
    ('STREAK_7', 'Seven-Day Streak', 'Completed daily challenges on 7 consecutive days.', 'Zap', 30, 4),
    ('BIBLE_EXPLORER', 'Bible Explorer', 'Completed 25 daily Bible challenges.', 'Compass', 50, 5),
    ('CENTURION_XP', 'Centurion', 'Earned 100 or more cumulative XP in Scripture knowledge.', 'Shield', 20, 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    xp_reward = EXCLUDED.xp_reward,
    display_order = EXCLUDED.display_order;

-- Enable Row Level Security (RLS)
ALTER TABLE bible_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_game_settings ENABLE ROW LEVEL SECURITY;

-- Non-destructive RLS Policies for Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_game_badges' AND policyname = 'Public bible badges read'
    ) THEN
        CREATE POLICY "Public bible badges read" ON public.bible_game_badges FOR SELECT TO public USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_game_daily_challenges' AND policyname = 'Public daily challenges read'
    ) THEN
        CREATE POLICY "Public daily challenges read" ON public.bible_game_daily_challenges FOR SELECT TO public USING (status = 'published');
    END IF;
END $$;
