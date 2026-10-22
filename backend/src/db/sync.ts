import { query } from './index';
import { 
  User, Member, Worker, Branch, MinistryRole, Department, DepartmentPosition,
  ServiceSchedule, AttendanceRecord, AttendanceSettings, EventItem, PostItem,
  ServiceHighlightItem, TestimonyItem, NotificationItem, AuditLogItem, MediaItem,
  DepartmentReport, FinanceTransaction, FinanceOpeningBalance, SundayMoment, SundayMomentLike,
  EmailVerificationRecord, PasswordResetRecord,
  BibleQuestion, BibleDailyChallenge, BibleUserProgress, BibleUserStats, BibleBadge, BibleUserBadgeRecord, BibleGameSettings
} from '../types';
import { FcmService } from '../services/fcmService';

export const sanitizeMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  // Rewrite localhost / LAN / relative uploads paths to Supabase Storage public CDN
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5000\/uploads\/(fpm-media\/)?/i.test(trimmed)) {
    return trimmed.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5000\/uploads\/(fpm-media\/)?/i,
      'https://ykibiaaohlodgcxpyfdm.supabase.co/storage/v1/object/public/fpm-media/'
    );
  }
  if (/^\/?uploads\/(fpm-media\/)?/i.test(trimmed)) {
    return trimmed.replace(
      /^\/?uploads\/(fpm-media\/)?/i,
      'https://ykibiaaohlodgcxpyfdm.supabase.co/storage/v1/object/public/fpm-media/'
    );
  }
  return trimmed;
};

let schemaMigrationsDone = false;
let schemaMigrationsPromise: Promise<void> | null = null;

export async function runSchemaMigrationsOnce(): Promise<void> {
  if (schemaMigrationsDone) return;
  if (schemaMigrationsPromise) return schemaMigrationsPromise;

  schemaMigrationsPromise = (async () => {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS system_mutations (
          id INT PRIMARY KEY,
          mutated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          entity_type TEXT
        );

        ALTER TABLE services ADD COLUMN IF NOT EXISTS live_stream_url TEXT;
        ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT TRUE;

        ALTER TABLE branches ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
        ALTER TABLE branches ADD COLUMN IF NOT EXISTS image_url TEXT;

        CREATE TABLE IF NOT EXISTS sunday_moments (
          id UUID PRIMARY KEY,
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          uploaded_by UUID NOT NULL,
          uploaded_by_name VARCHAR(255),
          uploaded_by_role VARCHAR(100),
          media_url TEXT NOT NULL,
          thumbnail_url TEXT,
          caption TEXT,
          sunday_date DATE NOT NULL,
          status VARCHAR(50) DEFAULT 'approved',
          published_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          approved_by UUID,
          rejected_by UUID,
          rejection_reason TEXT,
          creator_source VARCHAR(20) DEFAULT 'member',
          likes_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS approved_by UUID;
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS rejected_by UUID;
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS creator_source VARCHAR(20) DEFAULT 'member';
        ALTER TABLE sunday_moments ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_sunday_moments_branch ON sunday_moments(branch_id);
        CREATE INDEX IF NOT EXISTS idx_sunday_moments_date ON sunday_moments(sunday_date DESC);
        CREATE INDEX IF NOT EXISTS idx_sunday_moments_created ON sunday_moments(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sunday_moments_expires ON sunday_moments(expires_at DESC);

        CREATE TABLE IF NOT EXISTS sunday_moment_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          moment_id UUID NOT NULL REFERENCES sunday_moments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(moment_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_moment_likes_moment ON sunday_moment_likes(moment_id);
        CREATE INDEX IF NOT EXISTS idx_moment_likes_user ON sunday_moment_likes(user_id);

        ALTER TABLE sunday_moments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sunday_moment_likes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_mutations ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS system_settings (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sunday_moments' AND policyname = 'Public published sunday moments read'
          ) THEN
            CREATE POLICY "Public published sunday moments read" ON public.sunday_moments FOR SELECT TO public USING (status = 'approved');
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sunday_moment_likes' AND policyname = 'Public sunday moment likes read'
          ) THEN
            CREATE POLICY "Public sunday moment likes read" ON public.sunday_moment_likes FOR SELECT TO public USING (true);
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'Public system settings read'
          ) THEN
            CREATE POLICY "Public system settings read" ON public.system_settings FOR SELECT TO public USING (true);
          END IF;
        END $$;

        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS email_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          otp_hash VARCHAR(255) NOT NULL,
          attempts_count INT NOT NULL DEFAULT 0,
          max_attempts INT NOT NULL DEFAULT 5,
          expires_at TIMESTAMPTZ NOT NULL,
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address VARCHAR(45)
        );
        CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at DESC);
        ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address VARCHAR(45)
        );
        ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS attempts_count INT NOT NULL DEFAULT 0;
        ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5;
        ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
        ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS reset_auth_token_hash VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
        CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at DESC);
        CREATE INDEX IF NOT EXISTS idx_password_resets_auth_token ON password_resets(reset_auth_token_hash);
        ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS finance_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
          category VARCHAR(100) NOT NULL,
          amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
          transaction_date DATE NOT NULL,
          description TEXT NOT NULL,
          reference_number VARCHAR(100),
          payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'voided')),
          void_reason TEXT,
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_by_name VARCHAR(255) NOT NULL,
          updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
          updated_by_name VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_finance_tx_branch ON finance_transactions(branch_id);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_date ON finance_transactions(transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_type ON finance_transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_status ON finance_transactions(status);

        CREATE TABLE IF NOT EXISTS finance_opening_balances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          year INT NOT NULL,
          month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
          amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
          is_initial BOOLEAN NOT NULL DEFAULT FALSE,
          notes TEXT,
          established_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          established_by_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_branch_year_month UNIQUE(branch_id, year, month)
        );
        CREATE INDEX IF NOT EXISTS idx_finance_opening_branch ON finance_opening_balances(branch_id, year, month);

        CREATE TABLE IF NOT EXISTS device_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          device_token TEXT NOT NULL UNIQUE,
          platform TEXT NOT NULL DEFAULT 'android',
          branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_device_tokens_branch ON device_tokens(branch_id);
        ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE finance_opening_balances ENABLE ROW LEVEL SECURITY;
        ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'Users can manage their own device tokens'
          ) THEN
            CREATE POLICY "Users can manage their own device tokens" ON public.device_tokens
              FOR ALL TO authenticated
              USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_tokens' AND policyname = 'Service role full access on device_tokens'
          ) THEN
            CREATE POLICY "Service role full access on device_tokens" ON public.device_tokens
              FOR ALL TO service_role
              USING (true)
              WITH CHECK (true);
          END IF;
        END $$;

        -- BIBLE CHALLENGE GAME TABLES
        CREATE TABLE IF NOT EXISTS bible_game_questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question_text TEXT NOT NULL,
          options JSONB NOT NULL,
          correct_option_index INT NOT NULL,
          explanation TEXT NOT NULL,
          bible_reference VARCHAR(150) NOT NULL,
          category VARCHAR(50) NOT NULL,
          difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
          status VARCHAR(20) NOT NULL DEFAULT 'published',
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_by_name VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bg_questions_status ON bible_game_questions(status);
        CREATE INDEX IF NOT EXISTS idx_bg_questions_category ON bible_game_questions(category);

        CREATE TABLE IF NOT EXISTS bible_game_daily_challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          challenge_date DATE NOT NULL UNIQUE,
          question_ids JSONB NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'published',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bg_challenges_date ON bible_game_daily_challenges(challenge_date DESC);

        CREATE TABLE IF NOT EXISTS bible_game_user_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          challenge_date DATE NOT NULL,
          challenge_id UUID NOT NULL REFERENCES bible_game_daily_challenges(id) ON DELETE CASCADE,
          current_question_index INT NOT NULL DEFAULT 0,
          answers JSONB NOT NULL DEFAULT '[]'::jsonb,
          score INT NOT NULL DEFAULT 0,
          xp_awarded INT NOT NULL DEFAULT 0,
          is_completed BOOLEAN NOT NULL DEFAULT FALSE,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_bg_user_challenge_date UNIQUE (user_id, challenge_date)
        );
        CREATE INDEX IF NOT EXISTS idx_bg_progress_user ON bible_game_user_progress(user_id);
        CREATE INDEX IF NOT EXISTS idx_bg_progress_date ON bible_game_user_progress(challenge_date);

        CREATE TABLE IF NOT EXISTS bible_game_user_stats (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
          cumulative_xp INT NOT NULL DEFAULT 0,
          level INT NOT NULL DEFAULT 1,
          current_streak INT NOT NULL DEFAULT 0,
          best_streak INT NOT NULL DEFAULT 0,
          last_completed_date DATE,
          total_challenges_completed INT NOT NULL DEFAULT 0,
          perfect_scores_count INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_bg_stats_xp ON bible_game_user_stats(cumulative_xp DESC);

        CREATE TABLE IF NOT EXISTS bible_game_badges (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          icon VARCHAR(50) NOT NULL,
          xp_reward INT NOT NULL DEFAULT 0,
          display_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS bible_game_user_badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          badge_id VARCHAR(50) NOT NULL REFERENCES bible_game_badges(id) ON DELETE CASCADE,
          awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          challenge_date DATE,
          CONSTRAINT uq_bg_user_badge UNIQUE (user_id, badge_id)
        );

        CREATE TABLE IF NOT EXISTS bible_game_settings (
          key VARCHAR(50) PRIMARY KEY,
          value JSONB NOT NULL,
          description TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE bible_game_questions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_daily_challenges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_user_progress ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_user_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_badges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_user_badges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bible_game_settings ENABLE ROW LEVEL SECURITY;

        -- Timed questions & decimal XP migrations
        ALTER TABLE bible_game_user_progress ADD COLUMN IF NOT EXISTS active_question_index INT;
        ALTER TABLE bible_game_user_progress ADD COLUMN IF NOT EXISTS active_question_started_at TIMESTAMPTZ;
        ALTER TABLE bible_game_user_progress ADD COLUMN IF NOT EXISTS active_question_deadline_at TIMESTAMPTZ;
        ALTER TABLE bible_game_user_progress ADD COLUMN IF NOT EXISTS total_response_time_ms INT NOT NULL DEFAULT 0;
        ALTER TABLE bible_game_user_progress ALTER COLUMN xp_awarded TYPE NUMERIC(6, 1);
        ALTER TABLE bible_game_user_stats ALTER COLUMN cumulative_xp TYPE NUMERIC(8, 1);
        -- Schema setup complete
      `);
      schemaMigrationsDone = true;
    } catch (err: any) {
      console.warn('[DB SCHEMA MIGRATION]', err.message);
    }
  })();
  return schemaMigrationsPromise;
}

export async function recordSystemMutation(entityType: string = 'general'): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO system_mutations (id, mutated_at, entity_type)
      VALUES (1, NOW(), $1)
      ON CONFLICT (id) DO UPDATE SET mutated_at = NOW(), entity_type = EXCLUDED.entity_type
    `, [entityType]);
  } catch (err: any) {
    // Non-blocking mutation notification
  }
}

/**
 * Executes an array of async tasks with a maximum concurrency limit.
 * Helps prevent connection pool starvation during database hydration.
 */
async function runQueryBatch<T>(tasks: (() => Promise<T>)[], concurrency: number = 2): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const idx = currentIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Hydrates in-memory DatabaseStore with live records from Supabase PostgreSQL.
 */
export async function hydrateStoreFromPostgres(store: any): Promise<boolean> {
  try {
    // Run one-time non-destructive schema migrations
    await runSchemaMigrationsOnce();

    const [
      branchesRes,
      rolesRes,
      deptsRes,
      posRes,
      usersRes,
      membersRes,
      workersRes,
      servicesRes,
      attSettingsRes,
      attRecordsRes,
      eventsRes,
      postsRes,
      highlightsRes,
      testimoniesRes,
      notifsRes,
      auditRes,
      mediaRes,
      deptReportsRes,
      financeTxRes,
      financeBalancesRes,
      sundayMomentsRes,
      sundayMomentLikesRes,
      bibleQuestionsRes,
      bibleChallengesRes,
      bibleProgressRes,
      bibleStatsRes,
      bibleBadgesRes,
      bibleUserBadgesRes,
      bibleSettingsRes
    ] = await runQueryBatch([
      () => query('SELECT * FROM branches ORDER BY name ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM ministry_roles ORDER BY hierarchy_level ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM departments ORDER BY name ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM department_positions ORDER BY name ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM users ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM members ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM workers ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM services ORDER BY start_time ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM attendance_settings LIMIT 10').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM attendance_records ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM events ORDER BY start_datetime ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM posts ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM service_highlights ORDER BY highlight_date DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM testimonies ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM notifications ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM media_items ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM department_reports ORDER BY report_date DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM finance_transactions ORDER BY transaction_date DESC, created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM finance_opening_balances ORDER BY year ASC, month ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM sunday_moments ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM sunday_moment_likes ORDER BY created_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_questions ORDER BY created_at ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_daily_challenges ORDER BY challenge_date DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_user_progress ORDER BY challenge_date DESC, updated_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_user_stats ORDER BY cumulative_xp DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_badges ORDER BY display_order ASC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_user_badges ORDER BY awarded_at DESC').catch(() => ({ rows: [] })),
      () => query('SELECT * FROM bible_game_settings LIMIT 1').catch(() => ({ rows: [] }))
    ], 2);

    if (branchesRes.rows.length > 0) {
      store.branches = branchesRes.rows.map((r: any): Branch => ({
        id: r.id,
        organizationId: r.organization_id,
        name: r.name,
        branchCode: r.branch_code,
        address: r.address,
        city: r.city,
        state: r.state || undefined,
        country: r.country,
        phone: r.phone || undefined,
        email: r.email || undefined,
        branchPastorName: r.branch_pastor_name || undefined,
        branchPastorId: r.branch_pastor_id || undefined,
        logoUrl: sanitizeMediaUrl(r.logo_url) || r.logo_url || undefined,
        coverImageUrl: sanitizeMediaUrl(r.cover_image_url || r.image_url),
        imageUrl: sanitizeMediaUrl(r.image_url || r.cover_image_url),
        status: r.status,
        isHeadquarters: !!r.is_headquarters,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (rolesRes.rows.length > 0) {
      store.ministryRoles = rolesRes.rows.map((r: any): MinistryRole => ({
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || undefined,
        hierarchyLevel: r.hierarchy_level,
        permissions: Array.isArray(r.permissions) ? r.permissions : (typeof r.permissions === 'string' ? JSON.parse(r.permissions) : ['*']),
        isSystemRole: !!r.is_system_role,
        isActive: !!r.is_active,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (deptsRes.rows.length > 0) {
      const seenDeptKeys = new Set<string>();
      store.departments = deptsRes.rows
        .map((r: any): Department => ({
          id: r.id,
          branchId: r.branch_id || undefined,
          name: r.name,
          code: r.code,
          description: r.description || undefined,
          hodName: r.hod_name || undefined,
          hodId: r.hod_id || undefined,
          status: r.status,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        }))
        .filter((d: Department) => {
          const key = `${d.branchId || 'global'}:${d.name.trim().toLowerCase()}`;
          if (seenDeptKeys.has(key)) return false;
          seenDeptKeys.add(key);
          return true;
        });
    }

    if (posRes.rows.length > 0) {
      store.departmentPositions = posRes.rows.map((r: any): DepartmentPosition => ({
        id: r.id,
        departmentId: r.department_id,
        name: r.name,
        description: r.description || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    if (usersRes.rows.length > 0) {
      store.users = usersRes.rows.map((r: any): User => ({
        id: r.id,
        email: r.email,
        phone: r.phone,
        passwordHash: r.password_hash,
        accountStatus: r.account_status,
        rejectionReason: r.rejection_reason || undefined,
        requestChangesNotes: r.request_changes_notes || undefined,
        isAdmin: !!r.is_admin,
        adminLevel: r.admin_level || 'none',
        lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
        emailVerified: r.email_verified === null || r.email_verified === undefined ? true : !!r.email_verified,
        emailVerifiedAt: r.email_verified_at ? new Date(r.email_verified_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (membersRes.rows.length > 0) {
      store.members = membersRes.rows.map((r: any): Member => ({
        id: r.id,
        userId: r.user_id,
        primaryBranchId: r.primary_branch_id,
        firstName: r.first_name,
        middleName: r.middle_name || undefined,
        lastName: r.last_name,
        primaryRoleId: r.primary_role_id,
        isWorker: !!r.is_worker,
        gender: r.gender || 'Other',
        dateOfBirth: r.date_of_birth ? new Date(r.date_of_birth).toISOString().split('T')[0] : undefined,
        residentialAddress: r.residential_address || undefined,
        profilePictureUrl: sanitizeMediaUrl(r.profile_picture_url),
        emergencyContactName: r.emergency_contact_name || undefined,
        emergencyContactPhone: r.emergency_contact_phone || undefined,
        approvedBy: r.approved_by || undefined,
        approvedAt: r.approved_at ? new Date(r.approved_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (workersRes.rows.length > 0) {
      store.workers = workersRes.rows.map((r: any): Worker => ({
        id: r.id,
        memberId: r.member_id,
        workerIdCode: r.worker_id_code,
        pinHash: r.pin_hash,
        departmentId: r.department_id,
        positionId: r.position_id || undefined,
        positionName: r.position_name || 'Worker',
        dateStartedServing: r.date_started_serving ? new Date(r.date_started_serving).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        workerStatus: r.worker_status || 'active',
        qrCodeToken: r.qr_code_token,
        biometricEnabled: !!r.biometric_enabled,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (servicesRes && Array.isArray(servicesRes.rows)) {
      store.services = servicesRes.rows.map((r: any): ServiceSchedule => ({
        id: r.id,
        branchId: r.branch_id,
        name: r.name,
        dayOfWeek: r.day_of_week,
        startTime: r.start_time,
        expectedEndTime: r.expected_end_time,
        gracePeriodMinutes: r.grace_period_minutes,
        earliestClockInMinutes: r.earliest_clock_in_minutes,
        attendanceDurationHours: Number(r.attendance_duration_hours) || 4.0,
        liveStreamUrl: r.live_stream_url || undefined,
        imageUrl: sanitizeMediaUrl(r.image_url),
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (attSettingsRes && Array.isArray(attSettingsRes.rows) && attSettingsRes.rows.length > 0) {
      store.attendanceSettings = attSettingsRes.rows.map((r: any): AttendanceSettings => ({
        id: r.id,
        branchId: r.branch_id || undefined,
        defaultGracePeriodMinutes: r.default_grace_period_minutes,
        autoClockOutHours: Number(r.auto_clock_out_hours) || 4.0,
        manualClockOutEnabled: !!r.manual_clock_out_enabled,
        earliestClockInMinutes: r.earliest_clock_in_minutes,
        allowBiometricClockIn: !!r.allow_biometric_clock_in,
        allowQrClockIn: !!r.allow_qr_clock_in,
        allowPinClockIn: !!r.allow_pin_clock_in,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (attRecordsRes && Array.isArray(attRecordsRes.rows)) {
      store.attendanceRecords = attRecordsRes.rows.map((r: any): AttendanceRecord => ({
        id: r.id,
        workerId: r.worker_id,
        serviceId: r.service_id,
        branchId: r.branch_id,
        serviceDate: r.service_date ? new Date(r.service_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        clockInTime: r.clock_in_time ? new Date(r.clock_in_time).toISOString() : undefined,
        clockOutTime: r.clock_out_time ? new Date(r.clock_out_time).toISOString() : undefined,
        durationMinutes: r.duration_minutes || undefined,
        clockInMethod: r.clock_in_method || undefined,
        clockOutSource: r.clock_out_source || undefined,
        status: r.status,
        isAutoClockOut: !!r.is_auto_clock_out,
        excuseReason: r.excuse_reason || undefined,
        excusedBy: r.excused_by || undefined,
        excusedAt: r.excused_at ? new Date(r.excused_at).toISOString() : undefined,
        notes: r.notes || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (eventsRes && Array.isArray(eventsRes.rows)) {
      store.events = eventsRes.rows.map((r: any): EventItem => ({
        id: r.id,
        branchId: r.branch_id || undefined,
        title: r.title,
        description: r.description,
        bannerUrl: sanitizeMediaUrl(r.banner_url),
        startDatetime: r.start_datetime ? new Date(r.start_datetime).toISOString() : new Date().toISOString(),
        endDatetime: r.end_datetime ? new Date(r.end_datetime).toISOString() : new Date().toISOString(),
        location: r.location,
        speaker: r.speaker || undefined,
        category: r.category,
        registrationRequired: !!r.registration_required,
        registrationCapacity: r.registration_capacity || undefined,
        currentRegistrationsCount: r.current_registrations_count || 0,
        targetScope: r.target_scope || 'all',
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (postsRes && Array.isArray(postsRes.rows)) {
      store.posts = postsRes.rows.map((r: any): PostItem => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.author_name,
        branchId: r.branch_id || undefined,
        departmentId: r.department_id || undefined,
        visibility: r.visibility || 'all',
        title: r.title || undefined,
        content: r.content,
        scriptureReference: r.scripture_reference || undefined,
        mediaUrls: (Array.isArray(r.media_urls) ? r.media_urls : []).map((u: string) => sanitizeMediaUrl(u) || u),
        postType: r.post_type || 'post',
        isPinned: !!r.is_pinned,
        likesCount: r.likes_count || 0,
        commentsCount: r.comments_count || 0,
        allowComments: r.allow_comments !== undefined && r.allow_comments !== null ? !!r.allow_comments : (r.post_type !== 'announcement'),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (highlightsRes && Array.isArray(highlightsRes.rows)) {
      store.serviceHighlights = highlightsRes.rows.map((r: any): ServiceHighlightItem => ({
        id: r.id,
        serviceId: r.service_id || undefined,
        branchId: r.branch_id,
        highlightDate: r.highlight_date ? new Date(r.highlight_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        title: r.title,
        speaker: r.speaker,
        summary: r.summary,
        scripture: r.scripture || undefined,
        keyPoints: Array.isArray(r.key_points) ? r.key_points : (typeof r.key_points === 'string' ? JSON.parse(r.key_points) : []),
        quote: r.quote || undefined,
        photos: (Array.isArray(r.photos) ? r.photos : (typeof r.photos === 'string' ? JSON.parse(r.photos) : [])).map((u: string) => sanitizeMediaUrl(u) || u),
        videoUrl: sanitizeMediaUrl(r.video_url),
        isPublished: !!r.is_published,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (testimoniesRes && Array.isArray(testimoniesRes.rows)) {
      store.testimonies = testimoniesRes.rows.map((r: any): TestimonyItem => ({
        id: r.id,
        memberId: r.member_id,
        authorName: r.author_name || 'Church Member',
        branchId: r.branch_id,
        branchName: r.branch_name || 'Faith Cathedral HQ',
        title: r.title,
        content: r.content,
        category: r.category,
        photoUrl: sanitizeMediaUrl(r.photo_url),
        videoUrl: sanitizeMediaUrl(r.video_url),
        allowPublish: !!r.allow_publish,
        status: r.status,
        rejectionReason: r.rejection_reason || undefined,
        requestChangesNotes: r.request_changes_notes || undefined,
        reviewedBy: r.reviewed_by || undefined,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        isFeaturedOnFeed: !!r.is_featured_on_feed,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (notifsRes && Array.isArray(notifsRes.rows)) {
      store.notifications = notifsRes.rows.map((r: any): NotificationItem => ({
        id: r.id,
        title: r.title,
        body: r.body,
        notificationType: r.notification_type,
        targetScope: r.target_scope,
        targetId: r.target_id || undefined,
        actionUrl: r.action_url || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    if (mediaRes && Array.isArray(mediaRes.rows)) {
      store.mediaFiles = mediaRes.rows.map((r: any): MediaItem => ({
        id: r.id,
        storagePath: r.storage_path,
        publicUrl: sanitizeMediaUrl(r.public_url) || r.public_url,
        entityType: r.entity_type,
        entityId: r.entity_id || undefined,
        uploadedBy: r.uploaded_by || undefined,
        branchId: r.branch_id || undefined,
        mimeType: r.mime_type,
        fileSize: Number(r.file_size) || 0,
        isArchived: !!r.is_archived,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));

      for (const m of store.mediaFiles) {
        if (!m.isArchived && m.entityType === 'testimony' && m.entityId) {
          const t = store.testimonies.find((test: TestimonyItem) => test.id === m.entityId);
          if (t && !t.photoUrl) {
            t.photoUrl = m.publicUrl;
          }
        }
        if (!m.isArchived && (m.entityType === 'church-asset' || m.entityType === 'branch') && m.branchId) {
          const b = store.branches.find((br: Branch) => br.id === m.branchId);
          if (b && (!b.coverImageUrl || b.coverImageUrl === '')) {
            b.coverImageUrl = m.publicUrl;
            b.imageUrl = m.publicUrl;
          }
        }
      }
    }

    if (auditRes && Array.isArray(auditRes.rows)) {
      store.auditLogs = auditRes.rows.map((r: any): AuditLogItem => ({
        id: r.id,
        actorId: r.actor_id || undefined,
        actorName: r.actor_name,
        actorRole: r.actor_role,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id || undefined,
        previousState: r.previous_state || undefined,
        newState: r.new_state || undefined,
        ipAddress: r.ip_address || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    if (deptReportsRes && Array.isArray(deptReportsRes.rows)) {
      store.departmentReports = deptReportsRes.rows.map((r: any): DepartmentReport => ({
        id: r.id,
        departmentId: r.department_id,
        departmentName: store.departments?.find((d: any) => d.id === r.department_id)?.name,
        branchId: r.branch_id,
        branchName: store.branches?.find((b: any) => b.id === r.branch_id)?.name,
        title: r.title,
        reportType: r.report_type,
        reportDate: r.report_date ? new Date(r.report_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        attendanceCount: r.attendance_count !== null && r.attendance_count !== undefined ? Number(r.attendance_count) : undefined,
        summary: r.summary,
        achievements: r.achievements || undefined,
        challenges: r.challenges || undefined,
        prayerRequests: r.prayer_requests || undefined,
        budgetNotes: r.budget_notes || undefined,
        status: r.status,
        submittedBy: r.submitted_by,
        submittedByName: r.submitted_by_name || 'HOD',
        reviewedBy: r.reviewed_by || undefined,
        reviewedByName: store.members?.find((m: any) => m.userId === r.reviewed_by)?.firstName ? `${store.members.find((m: any) => m.userId === r.reviewed_by)?.firstName} ${store.members.find((m: any) => m.userId === r.reviewed_by)?.lastName}` : undefined,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : undefined,
        reviewNotes: r.review_notes || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (financeTxRes && Array.isArray(financeTxRes.rows)) {
      store.financeTransactions = financeTxRes.rows.map((r: any): FinanceTransaction => ({
        id: r.id,
        branchId: r.branch_id,
        branchName: store.branches?.find((b: any) => b.id === r.branch_id)?.name,
        transactionType: r.transaction_type,
        category: r.category,
        amount: Number(r.amount),
        transactionDate: r.transaction_date ? new Date(r.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: r.description,
        referenceNumber: r.reference_number || undefined,
        paymentMethod: r.payment_method || 'Bank Transfer',
        status: r.status,
        voidReason: r.void_reason || undefined,
        createdBy: r.created_by,
        createdByName: r.created_by_name || 'Admin',
        updatedBy: r.updated_by || undefined,
        updatedByName: r.updated_by_name || undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (financeBalancesRes && Array.isArray(financeBalancesRes.rows)) {
      store.financeOpeningBalances = financeBalancesRes.rows.map((r: any): FinanceOpeningBalance => ({
        id: r.id,
        branchId: r.branch_id,
        branchName: store.branches?.find((b: any) => b.id === r.branch_id)?.name,
        year: Number(r.year),
        month: Number(r.month),
        amount: Number(r.amount),
        isInitial: !!r.is_initial,
        notes: r.notes || undefined,
        establishedBy: r.established_by,
        establishedByName: r.established_by_name || 'Admin',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (sundayMomentsRes && Array.isArray(sundayMomentsRes.rows)) {
      store.sundayMoments = sundayMomentsRes.rows.map((r: any): SundayMoment => ({
        id: r.id,
        branchId: r.branch_id,
        uploadedBy: r.uploaded_by,
        uploadedByName: r.uploaded_by_name || 'Church Member',
        uploadedByRole: r.uploaded_by_role || 'Member',
        mediaUrl: sanitizeMediaUrl(r.media_url) || r.media_url,
        thumbnailUrl: sanitizeMediaUrl(r.thumbnail_url || r.media_url),
        caption: r.caption || undefined,
        sundayDate: r.sunday_date ? new Date(r.sunday_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: r.status || 'approved',
        publishedAt: r.published_at ? new Date(r.published_at).toISOString() : (r.status === 'approved' && r.created_at ? new Date(r.created_at).toISOString() : undefined),
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : (r.status === 'approved' && r.created_at ? new Date(new Date(r.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined),
        approvedBy: r.approved_by || undefined,
        rejectedBy: r.rejected_by || undefined,
        rejectionReason: r.rejection_reason || undefined,
        creatorSource: r.creator_source || 'member',
        likesCount: Number(r.likes_count || 0),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    } else {
      store.sundayMoments = [];
    }

    if (sundayMomentLikesRes && Array.isArray(sundayMomentLikesRes.rows)) {
      store.sundayMomentLikes = sundayMomentLikesRes.rows.map((r: any): SundayMomentLike => ({
        id: r.id,
        momentId: r.moment_id,
        userId: r.user_id,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    } else {
      store.sundayMomentLikes = [];
    }

    // Hydrate Bible Game tables
    if (bibleQuestionsRes && Array.isArray(bibleQuestionsRes.rows) && bibleQuestionsRes.rows.length > 0) {
      store.bibleQuestions = bibleQuestionsRes.rows.map((r: any): BibleQuestion => ({
        id: r.id,
        questionText: r.question_text,
        options: Array.isArray(r.options) ? r.options : (typeof r.options === 'string' ? JSON.parse(r.options) : []),
        correctOptionIndex: r.correct_option_index,
        explanation: r.explanation,
        bibleReference: r.bible_reference,
        difficulty: r.difficulty,
        category: r.category,
        status: r.status,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (bibleChallengesRes && Array.isArray(bibleChallengesRes.rows) && bibleChallengesRes.rows.length > 0) {
      store.bibleDailyChallenges = bibleChallengesRes.rows.map((r: any): BibleDailyChallenge => ({
        id: r.id,
        challengeDate: typeof r.challenge_date === 'string' ? r.challenge_date.substring(0, 10) : new Date(r.challenge_date).toISOString().substring(0, 10),
        questionIds: Array.isArray(r.question_ids) ? r.question_ids : (typeof r.question_ids === 'string' ? JSON.parse(r.question_ids) : []),
        status: r.status || 'published',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    }

    if (bibleProgressRes && Array.isArray(bibleProgressRes.rows)) {
      store.bibleUserProgress = bibleProgressRes.rows.map((r: any): BibleUserProgress => ({
        id: r.id,
        userId: r.user_id,
        memberId: r.member_id,
        challengeDate: typeof r.challenge_date === 'string' ? r.challenge_date.substring(0, 10) : new Date(r.challenge_date).toISOString().substring(0, 10),
        challengeId: r.challenge_id,
        currentQuestionIndex: r.current_question_index,
        activeQuestionIndex: r.active_question_index ?? undefined,
        activeQuestionStartedAt: r.active_question_started_at ? new Date(r.active_question_started_at).toISOString() : undefined,
        activeQuestionDeadlineAt: r.active_question_deadline_at ? new Date(r.active_question_deadline_at).toISOString() : undefined,
        answers: Array.isArray(r.answers) ? r.answers : (typeof r.answers === 'string' ? JSON.parse(r.answers) : []),
        score: r.score,
        totalResponseTimeMs: r.total_response_time_ms || 0,
        xpAwarded: Number(r.xp_awarded) || 0.0,
        isCompleted: Boolean(r.is_completed),
        startedAt: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
        completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      }));
    } else {
      store.bibleUserProgress = [];
    }

    if (bibleStatsRes && Array.isArray(bibleStatsRes.rows)) {
      const LEVEL_THRESHOLDS = [
        { level: 1, title: 'Scripture Seeker', minXp: 0, nextLevelXp: 100 },
        { level: 2, title: 'Faith Disciple', minXp: 100, nextLevelXp: 250 },
        { level: 3, title: 'Word Explorer', minXp: 250, nextLevelXp: 450 },
        { level: 4, title: 'Bible Student', minXp: 450, nextLevelXp: 700 },
        { level: 5, title: 'Truth Pursuer', minXp: 700, nextLevelXp: 1000 },
        { level: 6, title: 'Scripture Scholar', minXp: 1000, nextLevelXp: 1500 },
        { level: 7, title: 'Wisdom Champion', minXp: 1500, nextLevelXp: 2100 },
        { level: 8, title: 'Kingdom Ambassador', minXp: 2100, nextLevelXp: 3000 },
        { level: 9, title: 'Faith Giant', minXp: 3000, nextLevelXp: 4000 },
        { level: 10, title: 'Master of the Word', minXp: 4000, nextLevelXp: 5500 }
      ];

      store.bibleUserStats = bibleStatsRes.rows.map((r: any): BibleUserStats => {
        const cumulativeXp = Number(r.cumulative_xp) || 0.0;
        let matched = LEVEL_THRESHOLDS[0];
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
          if (cumulativeXp >= LEVEL_THRESHOLDS[i].minXp) {
            matched = LEVEL_THRESHOLDS[i];
            break;
          }
        }
        const xpInCurrentLevel = Math.round((cumulativeXp - matched.minXp) * 10) / 10;
        const xpForNextLevel = Math.round(Math.max(0, matched.nextLevelXp - cumulativeXp) * 10) / 10;

        return {
          userId: r.user_id,
          memberId: r.member_id,
          cumulativeXp,
          level: r.level || matched.level,
          levelTitle: matched.title,
          xpInCurrentLevel,
          xpForNextLevel,
          currentStreak: r.current_streak || 0,
          bestStreak: r.best_streak || 0,
          lastCompletedDate: r.last_completed_date ? (typeof r.last_completed_date === 'string' ? r.last_completed_date.substring(0, 10) : new Date(r.last_completed_date).toISOString().substring(0, 10)) : undefined,
          totalChallengesCompleted: r.total_challenges_completed || 0,
          perfectScoresCount: r.perfect_scores_count || 0,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        };
      });
    } else {
      store.bibleUserStats = [];
    }

    if (bibleBadgesRes && Array.isArray(bibleBadgesRes.rows) && bibleBadgesRes.rows.length > 0) {
      store.bibleBadges = bibleBadgesRes.rows.map((r: any): BibleBadge => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        xpReward: r.xp_reward,
        displayOrder: r.display_order
      }));
    }

    if (bibleUserBadgesRes && Array.isArray(bibleUserBadgesRes.rows)) {
      store.bibleUserBadges = bibleUserBadgesRes.rows.map((r: any): BibleUserBadgeRecord => ({
        id: r.id,
        userId: r.user_id,
        memberId: r.member_id,
        badgeId: r.badge_id,
        awardedAt: r.awarded_at ? new Date(r.awarded_at).toISOString() : new Date().toISOString(),
        challengeDate: r.challenge_date ? (typeof r.challenge_date === 'string' ? r.challenge_date.substring(0, 10) : new Date(r.challenge_date).toISOString().substring(0, 10)) : undefined
      }));
    } else {
      store.bibleUserBadges = [];
    }

    if (bibleSettingsRes && Array.isArray(bibleSettingsRes.rows) && bibleSettingsRes.rows.length > 0) {
      const r = bibleSettingsRes.rows[0];
      store.bibleSettings = {
        dailyQuestionCount: r.daily_question_count || 5,
        timeLimitSeconds: r.time_limit_seconds || 15,
        xpPerQuestion: Number(r.xp_per_question) || 10,
        speedBonusThresholdSeconds: r.speed_bonus_threshold_seconds || 5,
        speedBonusXp: Number(r.speed_bonus_xp) || 0
      };
    }

    console.log(`[DATABASE] Hydrated store from Supabase: ${store.branches.length} branches, ${store.users.length} users, ${store.members.length} members, ${store.workers.length} workers, ${store.services.length} services, ${store.financeTransactions?.length || 0} finance txs, ${store.sundayMoments?.length || 0} moments, ${store.sundayMomentLikes?.length || 0} moment likes, ${store.bibleUserProgress?.length || 0} bible progress rows, ${store.bibleUserStats?.length || 0} bible user stats.`);
    return true;
  } catch (err: any) {
    console.error('[DATABASE] Hydration from Supabase encountered an issue, falling back to local seed state:', err.message);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Write-Through Persistence Helpers (Asynchronous & Resilient)
// -----------------------------------------------------------------------------

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export const LEGACY_TESTIMONY_MAP: Record<string, string> = {
  't-1': 'de6300dc-a8b7-4e5d-a4c6-09e466d7373b',
  't-2': 'b5393d0e-16f9-4bd7-8c2a-6aaab37402ef',
  't-3': 'a4be349b-127c-42c1-8962-65a89e256314'
};

export function resolveTestimonyId(id?: string | null): string {
  if (!id) return '';
  return LEGACY_TESTIMONY_MAP[id] || id;
}

export async function persistUser(user: User): Promise<void> {
  if (!isUuid(user.id)) return;
  try {
    const safePasswordHash = user.passwordHash && user.passwordHash.trim().length > 0 ? user.passwordHash : null;
    const isEmailVerified = user.emailVerified !== undefined ? user.emailVerified : true;
    const updateRes = await query(`
      UPDATE users SET
        email = $2,
        phone = $3,
        password_hash = COALESCE($4, password_hash),
        account_status = $5,
        rejection_reason = $6,
        request_changes_notes = $7,
        is_admin = $8,
        admin_level = $9,
        last_login_at = $10,
        email_verified = $11,
        email_verified_at = $12,
        updated_at = $13
      WHERE id = $1
    `, [
      user.id, user.email, user.phone, safePasswordHash, user.accountStatus,
      user.rejectionReason || null, user.requestChangesNotes || null,
      user.isAdmin, user.adminLevel, user.lastLoginAt || null,
      isEmailVerified, user.emailVerifiedAt || null,
      user.updatedAt || new Date().toISOString()
    ]);

    if (!updateRes || updateRes.rowCount === 0) {
      await query(`
        INSERT INTO users (id, email, phone, password_hash, account_status, rejection_reason, request_changes_notes, is_admin, admin_level, last_login_at, email_verified, email_verified_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
          account_status = EXCLUDED.account_status,
          rejection_reason = EXCLUDED.rejection_reason,
          request_changes_notes = EXCLUDED.request_changes_notes,
          is_admin = EXCLUDED.is_admin,
          admin_level = EXCLUDED.admin_level,
          last_login_at = EXCLUDED.last_login_at,
          email_verified = EXCLUDED.email_verified,
          email_verified_at = EXCLUDED.email_verified_at,
          updated_at = EXCLUDED.updated_at
      `, [
        user.id, user.email, user.phone, safePasswordHash, user.accountStatus,
        user.rejectionReason || null, user.requestChangesNotes || null,
        user.isAdmin, user.adminLevel, user.lastLoginAt || null,
        isEmailVerified, user.emailVerifiedAt || null,
        user.createdAt, user.updatedAt
      ]);
    }
    await recordSystemMutation('users');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: users] ${err.message}`);
    throw err;
  }
}

export async function persistEmailVerification(record: EmailVerificationRecord): Promise<void> {
  try {
    await query(`
      INSERT INTO email_verifications (id, user_id, email, otp_hash, attempts_count, max_attempts, expires_at, verified_at, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        attempts_count = EXCLUDED.attempts_count,
        verified_at = EXCLUDED.verified_at
    `, [
      record.id, record.userId, record.email.toLowerCase(), record.otpHash,
      record.attemptsCount, record.maxAttempts, record.expiresAt,
      record.verifiedAt || null, record.ipAddress || null, record.createdAt
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: email_verifications] ${err.message}`);
  }
}

export async function persistPasswordReset(record: PasswordResetRecord): Promise<void> {
  try {
    await query(`
      INSERT INTO password_resets (id, user_id, email, token_hash, expires_at, used_at, ip_address, created_at, attempts_count, max_attempts, verified_at, reset_auth_token_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        used_at = EXCLUDED.used_at,
        attempts_count = EXCLUDED.attempts_count,
        verified_at = EXCLUDED.verified_at,
        reset_auth_token_hash = EXCLUDED.reset_auth_token_hash
    `, [
      record.id, record.userId, record.email.toLowerCase(), record.tokenHash,
      record.expiresAt, record.usedAt || null, record.ipAddress || null, record.createdAt,
      record.attemptsCount || 0, record.maxAttempts || 5, record.verifiedAt || null, record.resetAuthTokenHash || null
    ]);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: password_resets] ${err.message}`);
  }
}

export async function fetchActiveEmailVerification(email: string): Promise<EmailVerificationRecord | null> {
  try {
    const res = await query(`
      SELECT * FROM email_verifications
      WHERE LOWER(email) = LOWER($1) AND verified_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [email.trim()]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      email: r.email,
      otpHash: r.otp_hash,
      attemptsCount: r.attempts_count,
      maxAttempts: r.max_attempts,
      expiresAt: new Date(r.expires_at).toISOString(),
      verifiedAt: r.verified_at ? new Date(r.verified_at).toISOString() : undefined,
      ipAddress: r.ip_address || undefined,
      createdAt: new Date(r.created_at).toISOString()
    };
  } catch (err: any) {
    console.warn('[DB fetchActiveEmailVerification]', err.message);
    return null;
  }
}

export async function fetchActivePasswordReset(tokenHash: string): Promise<PasswordResetRecord | null> {
  try {
    const res = await query(`
      SELECT * FROM password_resets
      WHERE (token_hash = $1 OR reset_auth_token_hash = $1) AND used_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [tokenHash]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      email: r.email,
      tokenHash: r.token_hash,
      expiresAt: new Date(r.expires_at).toISOString(),
      usedAt: r.used_at ? new Date(r.used_at).toISOString() : undefined,
      verifiedAt: r.verified_at ? new Date(r.verified_at).toISOString() : undefined,
      attemptsCount: r.attempts_count,
      maxAttempts: r.max_attempts,
      resetAuthTokenHash: r.reset_auth_token_hash,
      ipAddress: r.ip_address || undefined,
      createdAt: new Date(r.created_at).toISOString()
    };
  } catch (err: any) {
    console.warn('[DB fetchActivePasswordReset]', err.message);
    return null;
  }
}

export async function fetchActivePasswordResetByEmail(email: string): Promise<PasswordResetRecord | null> {
  try {
    const res = await query(`
      SELECT * FROM password_resets
      WHERE LOWER(email) = LOWER($1) AND used_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [email.trim()]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      email: r.email,
      tokenHash: r.token_hash,
      expiresAt: new Date(r.expires_at).toISOString(),
      usedAt: r.used_at ? new Date(r.used_at).toISOString() : undefined,
      verifiedAt: r.verified_at ? new Date(r.verified_at).toISOString() : undefined,
      attemptsCount: r.attempts_count,
      maxAttempts: r.max_attempts,
      resetAuthTokenHash: r.reset_auth_token_hash,
      ipAddress: r.ip_address || undefined,
      createdAt: new Date(r.created_at).toISOString()
    };
  } catch (err: any) {
    console.warn('[DB fetchActivePasswordResetByEmail]', err.message);
    return null;
  }
}

export async function persistUserPassword(userId: string, passwordHash: string): Promise<void> {
  if (!isUuid(userId) || !passwordHash) return;
  try {
    await query(`
      UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1
    `, [userId, passwordHash]);
    await recordSystemMutation('users');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: user password] ${err.message}`);
    throw err;
  }
}

export async function persistSystemSettings(settings: any): Promise<void> {
  try {
    await query(`
      INSERT INTO system_settings (id, data, updated_at)
      VALUES ('global', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    `, [JSON.stringify(settings)]);
    await recordSystemMutation('system_settings');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: system_settings] ${err.message}`);
    throw err;
  }
}

export async function fetchSystemSettings(): Promise<any | null> {
  try {
    const res = await query('SELECT data, updated_at FROM system_settings WHERE id = $1', ['global']);
    if (res && res.rows && res.rows.length > 0 && res.rows[0].data) {
      const data = res.rows[0].data;
      if (res.rows[0].updated_at) {
        data.updatedAt = new Date(res.rows[0].updated_at).toISOString();
      }
      return data;
    }
    return null;
  } catch (err: any) {
    console.warn(`[DATABASE FETCH WARNING: system_settings] ${err.message}`);
    return null;
  }
}


export async function persistMember(member: Member): Promise<void> {
  if (!isUuid(member.id) || !isUuid(member.userId)) return;
  if (!member.primaryBranchId || !isUuid(member.primaryBranchId)) {
    member.primaryBranchId = 'b1111111-1111-1111-1111-111111111111';
  }
  try {
    const updateRes = await query(`
      UPDATE members SET
        primary_branch_id = $2,
        first_name = $3,
        middle_name = $4,
        last_name = $5,
        primary_role_id = $6,
        is_worker = $7,
        gender = $8,
        date_of_birth = $9,
        residential_address = $10,
        profile_picture_url = $11,
        emergency_contact_name = $12,
        emergency_contact_phone = $13,
        approved_by = $14,
        approved_at = $15,
        updated_at = $16
      WHERE id = $1
    `, [
      member.id, member.primaryBranchId, member.firstName,
      member.middleName || null, member.lastName, member.primaryRoleId,
      member.isWorker, member.gender, member.dateOfBirth || null,
      member.residentialAddress || null, member.profilePictureUrl || null,
      member.emergencyContactName || null, member.emergencyContactPhone || null,
      member.approvedBy || null, member.approvedAt || null,
      member.updatedAt || new Date().toISOString()
    ]);

    if (!updateRes || updateRes.rowCount === 0) {
      await query(`
        INSERT INTO members (id, user_id, primary_branch_id, first_name, middle_name, last_name, primary_role_id, is_worker, gender, date_of_birth, residential_address, profile_picture_url, emergency_contact_name, emergency_contact_phone, approved_by, approved_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          primary_branch_id = EXCLUDED.primary_branch_id,
          first_name = EXCLUDED.first_name,
          middle_name = EXCLUDED.middle_name,
          last_name = EXCLUDED.last_name,
          primary_role_id = EXCLUDED.primary_role_id,
          is_worker = EXCLUDED.is_worker,
          gender = EXCLUDED.gender,
          date_of_birth = EXCLUDED.date_of_birth,
          residential_address = EXCLUDED.residential_address,
          profile_picture_url = EXCLUDED.profile_picture_url,
          emergency_contact_name = EXCLUDED.emergency_contact_name,
          emergency_contact_phone = EXCLUDED.emergency_contact_phone,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          updated_at = EXCLUDED.updated_at
      `, [
        member.id, member.userId, member.primaryBranchId, member.firstName,
        member.middleName || null, member.lastName, member.primaryRoleId,
        member.isWorker, member.gender, member.dateOfBirth || null,
        member.residentialAddress || null, member.profilePictureUrl || null,
        member.emergencyContactName || null, member.emergencyContactPhone || null,
        member.approvedBy || null, member.approvedAt || null,
        member.createdAt, member.updatedAt
      ]);
    }
    await recordSystemMutation('members');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: members] ${err.message}`);
    throw err;
  }
}

export async function persistWorker(worker: Worker): Promise<void> {
  if (!isUuid(worker.id) || !isUuid(worker.memberId) || !isUuid(worker.departmentId)) return;
  try {
    await query(`
      INSERT INTO workers (id, member_id, worker_id_code, pin_hash, department_id, position_id, position_name, date_started_serving, worker_status, qr_code_token, biometric_enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        pin_hash = EXCLUDED.pin_hash,
        department_id = EXCLUDED.department_id,
        position_id = EXCLUDED.position_id,
        position_name = EXCLUDED.position_name,
        worker_status = EXCLUDED.worker_status,
        qr_code_token = EXCLUDED.qr_code_token,
        biometric_enabled = EXCLUDED.biometric_enabled,
        updated_at = EXCLUDED.updated_at
    `, [
      worker.id, worker.memberId, worker.workerIdCode, worker.pinHash,
      worker.departmentId, worker.positionId || null, worker.positionName,
      worker.dateStartedServing, worker.workerStatus, worker.qrCodeToken,
      worker.biometricEnabled, worker.createdAt, worker.updatedAt
    ]);
    await recordSystemMutation('workers');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: workers] ${err.message}`);
  }
}

export async function persistBranch(branch: Branch): Promise<void> {
  if (!isUuid(branch.id)) return;
  try {
    const orgId = isUuid(branch.organizationId) ? branch.organizationId : '00000000-0000-0000-0000-000000000001';
    const pastorId = isUuid(branch.branchPastorId) ? branch.branchPastorId : null;
    await query(`
      INSERT INTO branches (id, organization_id, name, branch_code, address, city, state, country, phone, email, branch_pastor_name, branch_pastor_id, logo_url, cover_image_url, image_url, status, is_headquarters, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        branch_code = EXCLUDED.branch_code,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        branch_pastor_name = EXCLUDED.branch_pastor_name,
        branch_pastor_id = EXCLUDED.branch_pastor_id,
        logo_url = EXCLUDED.logo_url,
        cover_image_url = EXCLUDED.cover_image_url,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        is_headquarters = EXCLUDED.is_headquarters,
        updated_at = EXCLUDED.updated_at
    `, [
      branch.id, orgId, branch.name, branch.branchCode,
      branch.address, branch.city, branch.state || null, branch.country,
      branch.phone || null, branch.email || null, branch.branchPastorName || null,
      pastorId, branch.logoUrl || null, branch.coverImageUrl || branch.imageUrl || null,
      branch.imageUrl || branch.coverImageUrl || null, branch.status,
      branch.isHeadquarters, branch.createdAt, branch.updatedAt
    ]);
    await recordSystemMutation('branches');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: branches] ${err.message}`);
  }
}

export async function persistDepartment(dept: Department): Promise<void> {
  if (!isUuid(dept.id)) return;
  try {
    const branchId = isUuid(dept.branchId) ? dept.branchId : null;
    const hodId = isUuid(dept.hodId) ? dept.hodId : null;
    await query(`
      INSERT INTO departments (id, branch_id, name, code, description, hod_name, hod_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        hod_name = EXCLUDED.hod_name,
        hod_id = EXCLUDED.hod_id,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      dept.id, branchId, dept.name, dept.code,
      dept.description || null, dept.hodName || null, hodId,
      dept.status, dept.createdAt, dept.updatedAt
    ]);
    await recordSystemMutation('departments');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: departments] ${err.message}`);
  }
}

export async function persistDepartmentPosition(pos: DepartmentPosition): Promise<void> {
  if (!isUuid(pos.id) || !isUuid(pos.departmentId)) return;
  try {
    await query(`
      INSERT INTO department_positions (id, department_id, name, description, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
    `, [pos.id, pos.departmentId, pos.name, pos.description || null, pos.createdAt]);
    await recordSystemMutation('department_positions');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: department_positions] ${err.message}`);
  }
}

export async function persistRole(role: MinistryRole): Promise<void> {
  if (!isUuid(role.id)) return;
  try {
    await query(`
      INSERT INTO ministry_roles (id, name, code, description, hierarchy_level, permissions, is_system_role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        hierarchy_level = EXCLUDED.hierarchy_level,
        permissions = EXCLUDED.permissions,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `, [
      role.id, role.name, role.code, role.description || null,
      role.hierarchyLevel, JSON.stringify(role.permissions || []),
      role.isSystemRole, role.isActive, role.createdAt, role.updatedAt
    ]);
    await recordSystemMutation('ministry_roles');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: ministry_roles] ${err.message}`);
  }
}

export async function persistService(service: ServiceSchedule): Promise<void> {
  if (!isUuid(service.id) || !isUuid(service.branchId)) return;
  try {
    await query(`
      INSERT INTO services (id, branch_id, name, day_of_week, start_time, expected_end_time, grace_period_minutes, earliest_clock_in_minutes, attendance_duration_hours, live_stream_url, image_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        day_of_week = EXCLUDED.day_of_week,
        start_time = EXCLUDED.start_time,
        expected_end_time = EXCLUDED.expected_end_time,
        grace_period_minutes = EXCLUDED.grace_period_minutes,
        earliest_clock_in_minutes = EXCLUDED.earliest_clock_in_minutes,
        attendance_duration_hours = EXCLUDED.attendance_duration_hours,
        live_stream_url = EXCLUDED.live_stream_url,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      service.id, service.branchId, service.name, service.dayOfWeek,
      service.startTime, service.expectedEndTime, service.gracePeriodMinutes,
      service.earliestClockInMinutes, service.attendanceDurationHours,
      service.liveStreamUrl || null, service.imageUrl || null, service.status, service.createdAt, service.updatedAt
    ]);
    await recordSystemMutation('services');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: services] ${err.message}`);
  }
}

export async function persistAttendanceRecord(record: AttendanceRecord): Promise<void> {
  if (!isUuid(record.id) || !isUuid(record.workerId) || !isUuid(record.serviceId) || !isUuid(record.branchId)) return;
  try {
    await query(`
      INSERT INTO attendance_records (id, worker_id, service_id, branch_id, service_date, clock_in_time, clock_out_time, duration_minutes, clock_in_method, clock_out_source, status, is_auto_clock_out, excuse_reason, excused_by, excused_at, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        clock_in_time = EXCLUDED.clock_in_time,
        clock_out_time = EXCLUDED.clock_out_time,
        duration_minutes = EXCLUDED.duration_minutes,
        clock_in_method = EXCLUDED.clock_in_method,
        clock_out_source = EXCLUDED.clock_out_source,
        status = EXCLUDED.status,
        is_auto_clock_out = EXCLUDED.is_auto_clock_out,
        excuse_reason = EXCLUDED.excuse_reason,
        excused_by = EXCLUDED.excused_by,
        excused_at = EXCLUDED.excused_at,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
    `, [
      record.id, record.workerId, record.serviceId, record.branchId,
      record.serviceDate, record.clockInTime || null, record.clockOutTime || null,
      record.durationMinutes || null, record.clockInMethod || null,
      record.clockOutSource || null, record.status, record.isAutoClockOut,
      record.excuseReason || null, record.excusedBy || null, record.excusedAt || null,
      record.notes || null, record.createdAt, record.updatedAt
    ]);
    await recordSystemMutation('attendance_records');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: attendance_records] ${err.message}`);
  }
}

export async function persistEvent(event: EventItem): Promise<void> {
  if (!isUuid(event.id)) return;
  try {
    const branchId = isUuid(event.branchId) ? event.branchId : null;
    await query(`
      INSERT INTO events (id, branch_id, title, description, banner_url, start_datetime, end_datetime, location, speaker, category, registration_required, registration_capacity, current_registrations_count, target_scope, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        banner_url = EXCLUDED.banner_url,
        start_datetime = EXCLUDED.start_datetime,
        end_datetime = EXCLUDED.end_datetime,
        location = EXCLUDED.location,
        speaker = EXCLUDED.speaker,
        category = EXCLUDED.category,
        registration_required = EXCLUDED.registration_required,
        registration_capacity = EXCLUDED.registration_capacity,
        current_registrations_count = EXCLUDED.current_registrations_count,
        target_scope = EXCLUDED.target_scope,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      event.id, branchId, event.title, event.description,
      event.bannerUrl || null, event.startDatetime, event.endDatetime,
      event.location, event.speaker || null, event.category,
      event.registrationRequired, event.registrationCapacity || null,
      event.currentRegistrationsCount, event.targetScope, event.status,
      event.createdAt, event.updatedAt
    ]);
    await recordSystemMutation('events');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: events] ${err.message}`);
  }
}

export async function persistPost(post: PostItem): Promise<void> {
  if (!isUuid(post.id)) return;
  const authorId = isUuid(post.authorId) ? post.authorId : 'c1111111-1111-1111-1111-111111111111';
  const branchId = isUuid(post.branchId) ? post.branchId : null;
  const deptId = isUuid(post.departmentId) ? post.departmentId : null;
  const allowComments = post.allowComments !== undefined ? post.allowComments : (post.postType !== 'announcement');
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  try {
    await query(`
      INSERT INTO posts (id, author_id, author_name, branch_id, department_id, visibility, title, content, scripture_reference, post_type, is_pinned, likes_count, comments_count, allow_comments, media_urls, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        author_name = EXCLUDED.author_name,
        branch_id = EXCLUDED.branch_id,
        department_id = EXCLUDED.department_id,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        scripture_reference = EXCLUDED.scripture_reference,
        is_pinned = EXCLUDED.is_pinned,
        likes_count = EXCLUDED.likes_count,
        comments_count = EXCLUDED.comments_count,
        allow_comments = EXCLUDED.allow_comments,
        media_urls = EXCLUDED.media_urls,
        updated_at = EXCLUDED.updated_at
    `, [
      post.id, authorId, post.authorName, branchId,
      deptId, post.visibility, post.title || null,
      post.content, post.scriptureReference || null, post.postType,
      post.isPinned, post.likesCount, post.commentsCount,
      allowComments, mediaUrls, post.createdAt, post.updatedAt
    ]);
    await recordSystemMutation('posts');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: posts] ${err.message}`);
  }
}

export async function persistServiceHighlight(highlight: ServiceHighlightItem): Promise<void> {
  if (!isUuid(highlight.id)) return;
  const branchId = isUuid(highlight.branchId) ? highlight.branchId : 'b1111111-1111-1111-1111-111111111111';
  const serviceId = isUuid(highlight.serviceId) ? highlight.serviceId : null;
  try {
    await query(`
      INSERT INTO service_highlights (id, service_id, branch_id, highlight_date, title, speaker, summary, scripture, key_points, quote, photos, video_url, is_published, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        service_id = EXCLUDED.service_id,
        branch_id = EXCLUDED.branch_id,
        title = EXCLUDED.title,
        speaker = EXCLUDED.speaker,
        summary = EXCLUDED.summary,
        scripture = EXCLUDED.scripture,
        key_points = EXCLUDED.key_points,
        quote = EXCLUDED.quote,
        photos = EXCLUDED.photos,
        video_url = EXCLUDED.video_url,
        is_published = EXCLUDED.is_published,
        updated_at = EXCLUDED.updated_at
    `, [
      highlight.id, serviceId, branchId,
      highlight.highlightDate, highlight.title, highlight.speaker,
      highlight.summary, highlight.scripture || null,
      JSON.stringify(highlight.keyPoints || []), highlight.quote || null,
      JSON.stringify(highlight.photos || []), highlight.videoUrl || null,
      highlight.isPublished, highlight.createdAt, highlight.updatedAt
    ]);
    await recordSystemMutation('service_highlights');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: service_highlights] ${err.message}`);
  }
}

export async function persistTestimony(testimony: TestimonyItem): Promise<void> {
  const resolvedId = resolveTestimonyId(testimony.id);
  if (!isUuid(resolvedId)) return;
  testimony.id = resolvedId;
  const memberId = isUuid(testimony.memberId) ? testimony.memberId : 'e1111111-1111-1111-1111-111111111111';
  const branchId = isUuid(testimony.branchId) ? testimony.branchId : 'b1111111-1111-1111-1111-111111111111';
  const reviewedBy = isUuid(testimony.reviewedBy) ? testimony.reviewedBy : null;
  try {
    await query(`
      INSERT INTO testimonies (id, member_id, branch_id, title, content, category, photo_url, video_url, allow_publish, status, rejection_reason, request_changes_notes, reviewed_by, reviewed_at, is_featured_on_feed, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        photo_url = EXCLUDED.photo_url,
        video_url = EXCLUDED.video_url,
        allow_publish = EXCLUDED.allow_publish,
        status = EXCLUDED.status,
        rejection_reason = EXCLUDED.rejection_reason,
        request_changes_notes = EXCLUDED.request_changes_notes,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        is_featured_on_feed = EXCLUDED.is_featured_on_feed,
        updated_at = EXCLUDED.updated_at
    `, [
      testimony.id, memberId, branchId, testimony.title,
      testimony.content, testimony.category, testimony.photoUrl || null,
      testimony.videoUrl || null, testimony.allowPublish, testimony.status,
      testimony.rejectionReason || null, testimony.requestChangesNotes || null,
      reviewedBy, testimony.reviewedAt || null,
      testimony.isFeaturedOnFeed, testimony.createdAt, testimony.updatedAt
    ]);
    await recordSystemMutation('testimonies');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: testimonies] ${err.message}`);
  }
}

export async function persistNotification(notif: NotificationItem): Promise<void> {
  if (!isUuid(notif.id)) return;
  const targetId = isUuid(notif.targetId) ? notif.targetId : null;
  const validTypes = [
    'announcement', 'registration_approved', 'registration_rejected', 
    'registration_changes_requested', 'upcoming_service', 'upcoming_event', 
    'event_reminder', 'attendance_confirmed', 'highlight_published', 
    'testimony_approved', 'admin_alert'
  ];
  const notifType = validTypes.includes(notif.notificationType) ? notif.notificationType : 'announcement';
  const targetScope = notif.targetScope === 'all' ? 'entire_church' : (notif.targetScope || 'entire_church');
  try {
    await query(`
      INSERT INTO notifications (id, title, body, notification_type, target_scope, target_id, action_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      notif.id, notif.title, notif.body, notifType,
      targetScope, targetId, notif.actionUrl || null,
      notif.createdAt
    ]);
    await recordSystemMutation('notifications');

    // Trigger FCM delivery to registered Android devices asynchronously
    FcmService.dispatchNotification(notif).catch(err => {
      console.warn('[FCM DISPATCH BACKGROUND ERROR]', err.message);
    });
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: notifications] ${err.message}`);
  }
}

export async function persistMediaItem(media: MediaItem): Promise<void> {
  if (!isUuid(media.id)) return;
  try {
    await query(`
      INSERT INTO media_items (id, storage_path, public_url, entity_type, entity_id, uploaded_by, branch_id, mime_type, file_size, is_archived, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        is_archived = EXCLUDED.is_archived,
        updated_at = EXCLUDED.updated_at
    `, [
      media.id, media.storagePath, media.publicUrl, media.entityType,
      media.entityId || null, media.uploadedBy || null, media.branchId || null,
      media.mimeType, media.fileSize, media.isArchived,
      media.createdAt, media.updatedAt
    ]);
    await recordSystemMutation('media_items');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: media_items] ${err.message}`);
  }
}

export async function persistAuditLog(log: AuditLogItem): Promise<void> {
  if (!isUuid(log.id)) return;
  try {
    await query(`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, target_type, target_id, previous_state, new_state, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      log.id, log.actorId || null, log.actorName, log.actorRole, log.action,
      log.targetType, log.targetId || null,
      log.previousState ? JSON.stringify(log.previousState) : null,
      log.newState ? JSON.stringify(log.newState) : null,
      log.ipAddress || null, log.userAgent || null, log.createdAt
    ]);
    await recordSystemMutation('audit_logs');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: audit_logs] ${err.message}`);
  }
}

export async function persistDepartmentReport(report: DepartmentReport): Promise<void> {
  if (!isUuid(report.id) || !isUuid(report.departmentId) || !isUuid(report.branchId) || !isUuid(report.submittedBy)) return;
  try {
    await query(`
      INSERT INTO department_reports (
        id, department_id, branch_id, title, report_type, report_date,
        attendance_count, summary, achievements, challenges, prayer_requests,
        budget_notes, status, submitted_by, submitted_by_name,
        reviewed_by, reviewed_at, review_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        report_type = EXCLUDED.report_type,
        report_date = EXCLUDED.report_date,
        attendance_count = EXCLUDED.attendance_count,
        summary = EXCLUDED.summary,
        achievements = EXCLUDED.achievements,
        challenges = EXCLUDED.challenges,
        prayer_requests = EXCLUDED.prayer_requests,
        budget_notes = EXCLUDED.budget_notes,
        status = EXCLUDED.status,
        reviewed_by = EXCLUDED.reviewed_by,
        reviewed_at = EXCLUDED.reviewed_at,
        review_notes = EXCLUDED.review_notes,
        updated_at = EXCLUDED.updated_at
    `, [
      report.id, report.departmentId, report.branchId, report.title,
      report.reportType, report.reportDate, report.attendanceCount ?? null,
      report.summary, report.achievements || null, report.challenges || null,
      report.prayerRequests || null, report.budgetNotes || null,
      report.status, report.submittedBy, report.submittedByName,
      report.reviewedBy || null, report.reviewedAt || null,
      report.reviewNotes || null, report.createdAt, report.updatedAt
    ]);
    await recordSystemMutation('department_reports');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: department_reports] ${err.message}`);
  }
}

export async function persistFinanceTransaction(tx: FinanceTransaction): Promise<void> {
  if (!isUuid(tx.id) || !isUuid(tx.branchId) || !isUuid(tx.createdBy)) return;
  const updatedBy = isUuid(tx.updatedBy) ? tx.updatedBy : null;
  try {
    await query(`
      INSERT INTO finance_transactions (
        id, branch_id, transaction_type, category, amount, transaction_date,
        description, reference_number, payment_method, status, void_reason,
        created_by, created_by_name, updated_by, updated_by_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        amount = EXCLUDED.amount,
        transaction_date = EXCLUDED.transaction_date,
        description = EXCLUDED.description,
        reference_number = EXCLUDED.reference_number,
        payment_method = EXCLUDED.payment_method,
        status = EXCLUDED.status,
        void_reason = EXCLUDED.void_reason,
        updated_by = EXCLUDED.updated_by,
        updated_by_name = EXCLUDED.updated_by_name,
        updated_at = EXCLUDED.updated_at
    `, [
      tx.id, tx.branchId, tx.transactionType, tx.category, tx.amount, tx.transactionDate,
      tx.description, tx.referenceNumber || null, tx.paymentMethod, tx.status, tx.voidReason || null,
      tx.createdBy, tx.createdByName, updatedBy, tx.updatedByName || null, tx.createdAt, tx.updatedAt
    ]);
    await recordSystemMutation('finance_transactions');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: finance_transactions] ${err.message}`);
  }
}

export async function persistFinanceOpeningBalance(ob: FinanceOpeningBalance): Promise<void> {
  if (!isUuid(ob.id) || !isUuid(ob.branchId) || !isUuid(ob.establishedBy)) return;
  try {
    await query(`
      INSERT INTO finance_opening_balances (
        id, branch_id, year, month, amount, is_initial, notes,
        established_by, established_by_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (branch_id, year, month) DO UPDATE SET
        amount = EXCLUDED.amount,
        is_initial = EXCLUDED.is_initial,
        notes = EXCLUDED.notes,
        established_by = EXCLUDED.established_by,
        established_by_name = EXCLUDED.established_by_name,
        updated_at = EXCLUDED.updated_at
    `, [
      ob.id, ob.branchId, ob.year, ob.month, ob.amount, ob.isInitial, ob.notes || null,
      ob.establishedBy, ob.establishedByName, ob.createdAt, ob.updatedAt
    ]);
    await recordSystemMutation('finance_opening_balances');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: finance_opening_balances] ${err.message}`);
  }
}

export async function persistSundayMoment(moment: SundayMoment): Promise<void> {
  if (!isUuid(moment.id)) return;
  const branchId = isUuid(moment.branchId) ? moment.branchId : 'b1111111-1111-1111-1111-111111111111';
  const uploadedBy = isUuid(moment.uploadedBy) ? moment.uploadedBy : 'c1111111-1111-1111-1111-111111111111';
  const approvedBy = moment.approvedBy && isUuid(moment.approvedBy) ? moment.approvedBy : null;
  const rejectedBy = moment.rejectedBy && isUuid(moment.rejectedBy) ? moment.rejectedBy : null;
  try {
    await query(`
      INSERT INTO sunday_moments (
        id, branch_id, uploaded_by, uploaded_by_name, uploaded_by_role,
        media_url, thumbnail_url, caption, sunday_date, status,
        published_at, expires_at, approved_by, rejected_by, rejection_reason,
        creator_source, likes_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        media_url = EXCLUDED.media_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        caption = EXCLUDED.caption,
        sunday_date = EXCLUDED.sunday_date,
        status = EXCLUDED.status,
        published_at = EXCLUDED.published_at,
        expires_at = EXCLUDED.expires_at,
        approved_by = EXCLUDED.approved_by,
        rejected_by = EXCLUDED.rejected_by,
        rejection_reason = EXCLUDED.rejection_reason,
        creator_source = EXCLUDED.creator_source,
        likes_count = EXCLUDED.likes_count,
        updated_at = EXCLUDED.updated_at
    `, [
      moment.id, branchId, uploadedBy,
      moment.uploadedByName || 'Church Member',
      moment.uploadedByRole || 'Member',
      sanitizeMediaUrl(moment.mediaUrl) || moment.mediaUrl,
      sanitizeMediaUrl(moment.thumbnailUrl || moment.mediaUrl),
      moment.caption || null,
      moment.sundayDate,
      moment.status || 'approved',
      moment.publishedAt || null,
      moment.expiresAt || null,
      approvedBy,
      rejectedBy,
      moment.rejectionReason || null,
      moment.creatorSource || 'member',
      moment.likesCount || 0,
      moment.createdAt,
      moment.updatedAt || moment.createdAt
    ]);
    await recordSystemMutation('sunday_moments');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: sunday_moments] ${err.message}`);
  }
}

export async function deleteSundayMomentFromDb(momentId: string): Promise<void> {
  return persistDelete('sunday_moments', momentId);
}

export async function persistSundayMomentLike(like: SundayMomentLike): Promise<void> {
  if (!isUuid(like.id) || !isUuid(like.momentId) || !isUuid(like.userId)) return;
  try {
    await query(`
      INSERT INTO sunday_moment_likes (id, moment_id, user_id, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (moment_id, user_id) DO NOTHING
    `, [like.id, like.momentId, like.userId, like.createdAt]);
    await recordSystemMutation('sunday_moment_likes');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST ERROR: sunday_moment_likes] ${err.message}`);
  }
}

export async function deleteSundayMomentLikeFromDb(momentId: string, userId: string): Promise<void> {
  if (!isUuid(momentId) || !isUuid(userId)) return;
  try {
    await query(`DELETE FROM sunday_moment_likes WHERE moment_id = $1 AND user_id = $2`, [momentId, userId]);
    await recordSystemMutation('sunday_moment_likes');
  } catch (err: any) {
    console.error(`[DATABASE PERSIST DELETE ERROR: sunday_moment_likes] ${err.message}`);
  }
}

export async function persistDelete(table: string, id: string): Promise<void> {
  const targetId = table === 'testimonies' ? resolveTestimonyId(id) : id;
  if (!isUuid(targetId)) return;
  try {
    // Validate table name against safe whitelist
    const safeTables = [
      'branches', 'departments', 'department_positions', 'ministry_roles',
      'users', 'members', 'workers', 'services', 'attendance_records',
      'events', 'posts', 'comments', 'reactions', 'service_highlights',
      'testimonies', 'notifications', 'media_items', 'department_reports',
      'finance_transactions', 'finance_opening_balances', 'sunday_moments',
      'sunday_moment_likes', 'bible_game_questions', 'bible_game_daily_challenges',
      'bible_game_user_progress', 'bible_game_user_stats', 'bible_game_badges',
      'bible_game_user_badges', 'bible_game_settings'
    ];
    if (!safeTables.includes(table)) {
      throw new Error(`Invalid table name for persistDelete: ${table}`);
    }
    await query(`DELETE FROM ${table} WHERE id = $1`, [targetId]);
    await recordSystemMutation(table);
  } catch (err: any) {
    console.error(`[DATABASE PERSIST DELETE ERROR: ${table}] ${err.message}`);
  }
}

export async function persistBibleQuestion(q: BibleQuestion): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_questions (
        id, question_text, options, correct_option_index, explanation,
        bible_reference, category, difficulty, status, created_by, created_by_name,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        question_text = EXCLUDED.question_text,
        options = EXCLUDED.options,
        correct_option_index = EXCLUDED.correct_option_index,
        explanation = EXCLUDED.explanation,
        bible_reference = EXCLUDED.bible_reference,
        category = EXCLUDED.category,
        difficulty = EXCLUDED.difficulty,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      q.id, q.questionText, JSON.stringify(q.options), q.correctOptionIndex,
      q.explanation, q.bibleReference, q.category, q.difficulty, q.status,
      q.createdBy || null, q.createdByName || null, q.createdAt, q.updatedAt
    ]);
    await recordSystemMutation('bible_game_questions');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_questions]', err.message);
  }
}

export async function persistBibleDailyChallenge(c: BibleDailyChallenge): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_daily_challenges (
        id, challenge_date, question_ids, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (challenge_date) DO UPDATE SET
        question_ids = EXCLUDED.question_ids,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `, [
      c.id, c.challengeDate, JSON.stringify(c.questionIds),
      c.status, c.createdAt, c.updatedAt
    ]);
    await recordSystemMutation('bible_game_daily_challenges');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_daily_challenges]', err.message);
  }
}

export async function persistBibleUserProgress(p: BibleUserProgress): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_user_progress (
        id, user_id, member_id, challenge_date, challenge_id,
        current_question_index, active_question_index, active_question_started_at,
        active_question_deadline_at, answers, score, total_response_time_ms,
        xp_awarded, is_completed, started_at, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (user_id, challenge_date) DO UPDATE SET
        current_question_index = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.current_question_index ELSE EXCLUDED.current_question_index END,
        active_question_index = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.active_question_index ELSE EXCLUDED.active_question_index END,
        active_question_started_at = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.active_question_started_at ELSE EXCLUDED.active_question_started_at END,
        active_question_deadline_at = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.active_question_deadline_at ELSE EXCLUDED.active_question_deadline_at END,
        answers = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.answers ELSE EXCLUDED.answers END,
        score = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.score ELSE EXCLUDED.score END,
        total_response_time_ms = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.total_response_time_ms ELSE EXCLUDED.total_response_time_ms END,
        xp_awarded = CASE WHEN bible_game_user_progress.is_completed THEN bible_game_user_progress.xp_awarded ELSE EXCLUDED.xp_awarded END,
        is_completed = (bible_game_user_progress.is_completed OR EXCLUDED.is_completed),
        completed_at = COALESCE(bible_game_user_progress.completed_at, EXCLUDED.completed_at),
        updated_at = EXCLUDED.updated_at
      WHERE bible_game_user_progress.is_completed = false OR EXCLUDED.is_completed = true
    `, [
      p.id, p.userId, p.memberId, p.challengeDate, p.challengeId,
      p.currentQuestionIndex, p.activeQuestionIndex ?? null,
      p.activeQuestionStartedAt || null, p.activeQuestionDeadlineAt || null,
      JSON.stringify(p.answers), p.score, p.totalResponseTimeMs || 0,
      p.xpAwarded, p.isCompleted, p.startedAt, p.completedAt || null,
      p.createdAt, p.updatedAt
    ]);
    await recordSystemMutation('bible_game_user_progress');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_user_progress]', err.message);
  }
}

export async function persistBibleUserStats(s: BibleUserStats): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_user_stats (
        user_id, member_id, cumulative_xp, level, current_streak,
        best_streak, last_completed_date, total_challenges_completed,
        perfect_scores_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        cumulative_xp = EXCLUDED.cumulative_xp,
        level = EXCLUDED.level,
        current_streak = EXCLUDED.current_streak,
        best_streak = EXCLUDED.best_streak,
        last_completed_date = EXCLUDED.last_completed_date,
        total_challenges_completed = EXCLUDED.total_challenges_completed,
        perfect_scores_count = EXCLUDED.perfect_scores_count,
        updated_at = EXCLUDED.updated_at
    `, [
      s.userId, s.memberId, s.cumulativeXp, s.level, s.currentStreak,
      s.bestStreak, s.lastCompletedDate || null, s.totalChallengesCompleted,
      s.perfectScoresCount, s.createdAt, s.updatedAt
    ]);
    await recordSystemMutation('bible_game_user_stats');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_user_stats]', err.message);
  }
}

export async function persistBibleUserBadge(b: BibleUserBadgeRecord): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_user_badges (
        id, user_id, member_id, badge_id, awarded_at, challenge_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `, [
      b.id, b.userId, b.memberId, b.badgeId, b.awardedAt, b.challengeDate || null
    ]);
    await recordSystemMutation('bible_game_user_badges');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_user_badges]', err.message);
  }
}

export async function persistBibleSettings(settings: BibleGameSettings): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') return;
  try {
    await query(`
      INSERT INTO bible_game_settings (key, value, description, updated_at)
      VALUES ('general', $1, 'Bible challenge gameplay rules & configuration', NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `, [JSON.stringify(settings)]);
    await recordSystemMutation('bible_game_settings');
  } catch (err: any) {
    console.error('[DATABASE PERSIST ERROR: bible_game_settings]', err.message);
  }
}
