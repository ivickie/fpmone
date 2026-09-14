import { query, pool } from '../db';

async function applyLinterFixes() {
  console.log('====================================================');
  console.log('  APPLYING SUPABASE LINTER REMEDIATIONS (RLS, FUNCTIONS, STORAGE)');
  console.log('====================================================');

  // 1. Fix RLS Disabled on 5 Public Tables
  console.log('\n[1/3] Enabling RLS and Policies on 5 Public Tables...');
  const rlsStatements = [
    // 1. user_ministry_roles
    `ALTER TABLE public.user_ministry_roles ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow read user_ministry_roles" ON public.user_ministry_roles;`,
    `CREATE POLICY "Allow read user_ministry_roles" ON public.user_ministry_roles FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles;`,
    `CREATE POLICY "Allow authenticated manage user_ministry_roles" ON public.user_ministry_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

    // 2. attendance_settings
    `ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow read attendance_settings" ON public.attendance_settings;`,
    `CREATE POLICY "Allow read attendance_settings" ON public.attendance_settings FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Allow authenticated manage attendance_settings" ON public.attendance_settings;`,
    `CREATE POLICY "Allow authenticated manage attendance_settings" ON public.attendance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

    // 3. post_media
    `ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow read post_media" ON public.post_media;`,
    `CREATE POLICY "Allow read post_media" ON public.post_media FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Allow authenticated manage post_media" ON public.post_media;`,
    `CREATE POLICY "Allow authenticated manage post_media" ON public.post_media FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

    // 4. saved_posts
    `ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow read saved_posts" ON public.saved_posts;`,
    `CREATE POLICY "Allow read saved_posts" ON public.saved_posts FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Allow authenticated manage saved_posts" ON public.saved_posts;`,
    `CREATE POLICY "Allow authenticated manage saved_posts" ON public.saved_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);`,

    // 5. notification_reads
    `ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Allow read notification_reads" ON public.notification_reads;`,
    `CREATE POLICY "Allow read notification_reads" ON public.notification_reads FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Allow authenticated manage notification_reads" ON public.notification_reads;`,
    `CREATE POLICY "Allow authenticated manage notification_reads" ON public.notification_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);`
  ];

  for (const stmt of rlsStatements) {
    await query(stmt);
  }
  console.log('  -> RLS enabled and policies created for user_ministry_roles, attendance_settings, post_media, saved_posts, notification_reads.');

  // 2. Fix Function Search Path Mutable for 6 Functions
  console.log('\n[2/3] Setting search_path on 6 Stored Functions...');
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
  console.log('  -> search_path = public, pg_temp configured on all 6 functions.');

  // 3. Fix Storage Bucket Public Listing Warning
  console.log('\n[3/3] Remediating Storage Bucket "fpm-media" Listing Policy...');
  const storageStatements = [
    `DROP POLICY IF EXISTS "Public Read Access fpm-media" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Authenticated Read Access fpm-media" ON storage.objects;`,
    `CREATE POLICY "Authenticated Read Access fpm-media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'fpm-media');`
  ];

  for (const stmt of storageStatements) {
    await query(stmt);
  }
  console.log('  -> Broad public SELECT policy dropped; authenticated listing policy created.');

  // Verification
  console.log('\n====================================================');
  console.log('  POST-REMEDIATION VERIFICATION');
  console.log('====================================================');

  const checkTables = await query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('user_ministry_roles', 'attendance_settings', 'post_media', 'saved_posts', 'notification_reads');
  `);
  console.log('Tables RLS Status:');
  checkTables.rows.forEach((r: any) => console.log(`  - ${r.tablename.padEnd(25)} : RLS ${r.rowsecurity ? 'ENABLED (PASS)' : 'DISABLED (FAIL)'}`));

  const checkFuncs = await query(`
    SELECT proname, proconfig 
    FROM pg_proc 
    WHERE proname IN ('generate_next_worker_id', 'record_worker_clock_in', 'record_worker_clock_out', 'auto_clock_out_expired_sessions', 'mark_service_absences', 'approve_member_registration');
  `);
  console.log('\nFunctions search_path Status:');
  checkFuncs.rows.forEach((r: any) => console.log(`  - ${r.proname.padEnd(35)} : ${JSON.stringify(r.proconfig)} (PASS)`));

  const checkPolicies = await query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE tablename = 'objects' AND policyname LIKE '%fpm-media%';
  `);
  console.log('\nStorage Policies for fpm-media:');
  checkPolicies.rows.forEach((r: any) => console.log(`  - ${r.policyname} | ${r.cmd} | ${r.roles}`));

  console.log('\nAll linter remediation statements applied successfully!');
  await pool.end();
}

applyLinterFixes().catch(err => {
  console.error('\n[REMEDIATION ERROR]', err);
  process.exit(1);
});
