-- =============================================================================
-- FAITH PREACHERS MINISTRY (FPM ONE)
-- SUPABASE LINTER REMEDIATIONS (RLS, SEARCH PATH, STORAGE OBJECTS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on Public Schema Tables (rls_disabled_in_public)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_ministry_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read user_ministry_roles" ON public.user_ministry_roles;
CREATE POLICY "Allow read user_ministry_roles" ON public.user_ministry_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles;
CREATE POLICY "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read attendance_settings" ON public.attendance_settings;
CREATE POLICY "Allow read attendance_settings" ON public.attendance_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage attendance_settings" ON public.attendance_settings;
CREATE POLICY "Allow authenticated manage attendance_settings" ON public.attendance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read post_media" ON public.post_media;
CREATE POLICY "Allow read post_media" ON public.post_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage post_media" ON public.post_media;
CREATE POLICY "Allow authenticated manage post_media" ON public.post_media FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read saved_posts" ON public.saved_posts;
CREATE POLICY "Allow read saved_posts" ON public.saved_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage saved_posts" ON public.saved_posts;
CREATE POLICY "Allow authenticated manage saved_posts" ON public.saved_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read notification_reads" ON public.notification_reads;
CREATE POLICY "Allow read notification_reads" ON public.notification_reads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated manage notification_reads" ON public.notification_reads;
CREATE POLICY "Allow authenticated manage notification_reads" ON public.notification_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. Explicit Function Search Path Hardening (function_search_path_mutable)
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.generate_next_worker_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.record_worker_clock_in(UUID, UUID, VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_worker_clock_out(UUID, VARCHAR) SET search_path = public, pg_temp;
ALTER FUNCTION public.auto_clock_out_expired_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_service_absences(UUID, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION public.approve_member_registration(UUID, UUID) SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 3. Storage Bucket Listing Security (public_bucket_allows_listing)
-- -----------------------------------------------------------------------------
-- Drop broad public SELECT policy on storage.objects to prevent unauthorized directory scraping
-- Note: Direct public downloads continue functioning unrestricted because bucket has public = true
DROP POLICY IF EXISTS "Public Read Access fpm-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Read Access fpm-media" ON storage.objects;
CREATE POLICY "Authenticated Read Access fpm-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fpm-media');
