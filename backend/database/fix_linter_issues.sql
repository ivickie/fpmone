-- =============================================================================
-- FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)
-- SUPABASE LINTER REMEDIATIONS (RLS SECURITY, PERMISSIVE POLICIES, STORAGE)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on Public Schema Tables (rls_disabled_in_public)
-- -----------------------------------------------------------------------------
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated manage finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Allow authenticated manage finance_opening_balances" ON public.finance_opening_balances;

ALTER TABLE public.user_ministry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Remediate Overly Permissive Policies (rls_policy_always_true)
-- -----------------------------------------------------------------------------
-- Drop overly permissive "FOR ALL ... USING (true) WITH CHECK (true)" policies
-- Keep public/authenticated SELECT where appropriate, and scope writes strictly.

-- attendance_settings: Read-only for authenticated, write reserved for system/admin via backend
DROP POLICY IF EXISTS "Allow authenticated manage attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Allow read attendance_settings" ON public.attendance_settings;
CREATE POLICY "Allow read attendance_settings" ON public.attendance_settings FOR SELECT USING (true);

-- department_reports: Read-only for authenticated, write managed through backend API
DROP POLICY IF EXISTS "Allow authenticated manage department_reports" ON public.department_reports;
DROP POLICY IF EXISTS "Allow read department_reports" ON public.department_reports;
CREATE POLICY "Allow read department_reports" ON public.department_reports FOR SELECT USING (true);

-- user_ministry_roles: Read-only for authenticated, role assignment managed through backend API
DROP POLICY IF EXISTS "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles;
DROP POLICY IF EXISTS "Allow read user_ministry_roles" ON public.user_ministry_roles;
CREATE POLICY "Allow read user_ministry_roles" ON public.user_ministry_roles FOR SELECT USING (true);

-- post_media: Read-only for public/authenticated, media attachments managed through backend API
DROP POLICY IF EXISTS "Allow authenticated manage post_media" ON public.post_media;
DROP POLICY IF EXISTS "Allow read post_media" ON public.post_media;
CREATE POLICY "Allow read post_media" ON public.post_media FOR SELECT USING (true);

-- notification_reads: Scope mutations strictly to the user's own records (user_id = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated manage notification_reads" ON public.notification_reads;
DROP POLICY IF EXISTS "Allow read notification_reads" ON public.notification_reads;
CREATE POLICY "Allow read notification_reads" ON public.notification_reads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert notification_reads" ON public.notification_reads;
DROP POLICY IF EXISTS "Allow authenticated update notification_reads" ON public.notification_reads;
DROP POLICY IF EXISTS "Allow authenticated delete notification_reads" ON public.notification_reads;
CREATE POLICY "Allow authenticated insert notification_reads" ON public.notification_reads 
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow authenticated update notification_reads" ON public.notification_reads 
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow authenticated delete notification_reads" ON public.notification_reads 
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- saved_posts: Scope mutations strictly to the user's own records (user_id = auth.uid())
DROP POLICY IF EXISTS "Allow authenticated manage saved_posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Allow read saved_posts" ON public.saved_posts;
CREATE POLICY "Allow read saved_posts" ON public.saved_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert saved_posts" ON public.saved_posts;
DROP POLICY IF EXISTS "Allow authenticated delete saved_posts" ON public.saved_posts;
CREATE POLICY "Allow authenticated insert saved_posts" ON public.saved_posts 
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow authenticated delete saved_posts" ON public.saved_posts 
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. Explicit Function Search Path Hardening (function_search_path_mutable)
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.generate_next_worker_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.record_worker_clock_in(UUID, UUID, VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_worker_clock_out(UUID, VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_clock_out_expired_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_service_absences(UUID, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.approve_member_registration(UUID, UUID) SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 4. Storage Bucket Listing Security (public_bucket_allows_listing)
-- -----------------------------------------------------------------------------
-- Drop broad SELECT policy on storage.objects to prevent unauthorized directory scraping
-- Note: Direct public downloads continue functioning unrestricted because bucket has public = true
DROP POLICY IF EXISTS "Public Read Access fpm-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access fpm-media" ON storage.objects;
