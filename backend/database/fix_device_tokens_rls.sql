-- =============================================================================
-- FAITH PREACHERS MINISTRIES INT'L (FPM GLOBAL)
-- SUPABASE ADVISOR FIX: ENABLE RLS ON public.device_tokens
-- Linter Rule: rls_disabled_in_public (0013_rls_disabled_in_public)
-- =============================================================================

-- 1. Enable Row Level Security (RLS) on device_tokens
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to manage (view, insert, update, delete) their own tokens
DROP POLICY IF EXISTS "Users can manage their own device tokens" ON public.device_tokens;
CREATE POLICY "Users can manage their own device tokens"
  ON public.device_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow backend / service_role full access to device_tokens
DROP POLICY IF EXISTS "Service role full access on device_tokens" ON public.device_tokens;
CREATE POLICY "Service role full access on device_tokens"
  ON public.device_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
