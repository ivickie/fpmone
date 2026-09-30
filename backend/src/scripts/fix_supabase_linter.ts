import { query, pool } from '../db';

async function applyLinterFixes() {
  console.log('====================================================');
  console.log('  APPLYING SUPABASE LINTER REMEDIATIONS');
  console.log('  (RLS SECURITY, PERMISSIVE POLICIES, STORAGE LISTING)');
  console.log('====================================================');

  // 1. Fix RLS Disabled on Public Tables (rls_disabled_in_public)
  console.log('\n[1/4] Enabling RLS on Finance Module Tables...');
  const financeStatements = [
    `ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE public.finance_opening_balances ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow authenticated manage finance_transactions" ON public.finance_transactions;`,
    `DROP POLICY IF EXISTS "Allow authenticated manage finance_opening_balances" ON public.finance_opening_balances;`
  ];

  for (const stmt of financeStatements) {
    await query(stmt);
  }
  console.log('  -> RLS enabled on finance_transactions and finance_opening_balances.');

  // 2. Fix Overly Permissive RLS Policies (rls_policy_always_true)
  console.log('\n[2/4] Remediating Overly Permissive Policies (rls_policy_always_true)...');
  const permissivePolicyRemediations = [
    // attendance_settings: Read-only for authenticated, write reserved for system/admin via backend
    `DROP POLICY IF EXISTS "Allow authenticated manage attendance_settings" ON public.attendance_settings;`,

    // department_reports: Read-only for authenticated, write managed through backend API
    `DROP POLICY IF EXISTS "Allow authenticated manage department_reports" ON public.department_reports;`,

    // user_ministry_roles: Read-only for authenticated, role assignment managed through backend API
    `DROP POLICY IF EXISTS "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles;`,

    // post_media: Read-only for public/authenticated, media attachment managed through backend API
    `DROP POLICY IF EXISTS "Allow authenticated manage post_media" ON public.post_media;`,

    // notification_reads: Scope mutations strictly to the user's own records (user_id = auth.uid())
    `DROP POLICY IF EXISTS "Allow authenticated manage notification_reads" ON public.notification_reads;`,
    `DROP POLICY IF EXISTS "Allow authenticated insert notification_reads" ON public.notification_reads;`,
    `DROP POLICY IF EXISTS "Allow authenticated update notification_reads" ON public.notification_reads;`,
    `DROP POLICY IF EXISTS "Allow authenticated delete notification_reads" ON public.notification_reads;`,
    `CREATE POLICY "Allow authenticated insert notification_reads" ON public.notification_reads 
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());`,
    `CREATE POLICY "Allow authenticated update notification_reads" ON public.notification_reads 
        FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`,
    `CREATE POLICY "Allow authenticated delete notification_reads" ON public.notification_reads 
        FOR DELETE TO authenticated USING (user_id = auth.uid());`,

    // saved_posts: Scope mutations strictly to the user's own records (user_id = auth.uid())
    `DROP POLICY IF EXISTS "Allow authenticated manage saved_posts" ON public.saved_posts;`,
    `DROP POLICY IF EXISTS "Allow authenticated insert saved_posts" ON public.saved_posts;`,
    `DROP POLICY IF EXISTS "Allow authenticated delete saved_posts" ON public.saved_posts;`,
    `CREATE POLICY "Allow authenticated insert saved_posts" ON public.saved_posts 
        FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());`,
    `CREATE POLICY "Allow authenticated delete saved_posts" ON public.saved_posts 
        FOR DELETE TO authenticated USING (user_id = auth.uid());`
  ];

  for (const stmt of permissivePolicyRemediations) {
    await query(stmt);
  }
  console.log('  -> Overly permissive policies replaced with secure scoped rules.');

  // 3. Fix Storage Bucket Public Listing Warning (public_bucket_allows_listing)
  console.log('\n[3/4] Remediating Storage Bucket "fpm-media" Listing Policy (public_bucket_allows_listing)...');
  const storageStatements = [
    `DROP POLICY IF EXISTS "Public Read Access fpm-media" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Authenticated Read Access fpm-media" ON storage.objects;`
  ];

  for (const stmt of storageStatements) {
    await query(stmt);
  }
  console.log('  -> Broad SELECT policy dropped from storage.objects. Direct URL downloads continue to work via public bucket.');

  // 4. Function Search Path Hardening (Ensure clean search_path across all functions)
  console.log('\n[4/4] Verifying Function search_path...');
  const funcStatements = [
    `ALTER FUNCTION public.generate_next_worker_id() SET search_path = public, pg_temp;`,
    `ALTER FUNCTION public.record_worker_clock_in(UUID, UUID, VARCHAR) SET search_path = public, pg_temp;`,
    `ALTER FUNCTION public.record_worker_clock_out(UUID, VARCHAR) SET search_path = public, pg_temp;`,
    `ALTER FUNCTION public.auto_clock_out_expired_sessions() SET search_path = public, pg_temp;`,
    `ALTER FUNCTION public.mark_service_absences(UUID, DATE) SET search_path = public, pg_temp;`,
    `ALTER FUNCTION public.approve_member_registration(UUID, UUID) SET search_path = public, pg_temp;`
  ];

  for (const stmt of funcStatements) {
    await query(stmt);
  }
  console.log('  -> search_path verified on all 6 functions.');

  // Verification
  console.log('\n====================================================');
  console.log('  POST-REMEDIATION VERIFICATION');
  console.log('====================================================');

  const checkTables = await query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('finance_transactions', 'finance_opening_balances', 'user_ministry_roles', 'attendance_settings', 'department_reports', 'post_media', 'saved_posts', 'notification_reads')
    ORDER BY tablename;
  `);
  console.log('Tables RLS Status:');
  checkTables.rows.forEach((r: any) => console.log(`  - ${r.tablename.padEnd(30)} : RLS ${r.rowsecurity ? 'ENABLED (PASS)' : 'DISABLED (FAIL)'}`));

  const checkPolicies = await query(`
    SELECT tablename, policyname, cmd, roles, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('attendance_settings', 'department_reports', 'user_ministry_roles', 'post_media', 'notification_reads', 'saved_posts', 'finance_transactions', 'finance_opening_balances')
    ORDER BY tablename, policyname;
  `);
  console.log('\nPublic Table Policies:');
  checkPolicies.rows.forEach((r: any) => {
    console.log(`  - [${r.tablename}] "${r.policyname}" | CMD: ${r.cmd} | ROLES: ${r.roles} | USING: ${r.qual} | CHECK: ${r.with_check}`);
  });

  const checkStoragePolicies = await query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%fpm-media%';
  `);
  console.log('\nStorage Policies for fpm-media:');
  checkStoragePolicies.rows.forEach((r: any) => console.log(`  - ${r.policyname} | ${r.cmd} | ${r.roles}`));

  console.log('\nAll linter remediation statements applied successfully!');
  await pool.end();
}

applyLinterFixes().catch(err => {
  console.error('\n[REMEDIATION ERROR]', err);
  process.exit(1);
});
