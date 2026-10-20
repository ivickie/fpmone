import fs from 'fs';
import path from 'path';
import { query, pool, withTransaction } from '../db';
import { StorageService } from '../services/storageService';

// Tables that MUST be preserved at all times
export const PROTECTED_TABLES = [
  'users',
  'members',
  'workers',
  'branches',
  'departments',
  'department_positions',
  'ministry_roles',
  'user_ministry_roles',
  'organizations',
  'attendance_settings',
  'system_settings',
  'password_resets',
  'email_verifications',
  'system_mutations'
];

// Operational tables to clear in strict dependency-aware order (children before parents)
export const OPERATIONAL_TABLES_ORDER = [
  'sunday_moment_likes',
  'sunday_moments',
  'notification_reads',
  'notifications',
  'event_registrations',
  'events',
  'comments',
  'reactions',
  'saved_posts',
  'post_media',
  'posts',
  'service_highlights',
  'attendance_records',
  'services',
  'testimonies',
  'department_reports',
  'finance_transactions',
  'finance_opening_balances',
  'audit_logs'
];

export async function createFullDatabaseBackup(): Promise<{ backupJsonPath: string; backupSqlPath: string; totalTables: number; totalRows: number }> {
  const backupsDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupJsonPath = path.join(backupsDir, `fpm_backup_pre_reset_${timestamp}.json`);
  const backupSqlPath = path.join(backupsDir, `fpm_backup_pre_reset_${timestamp}.sql`);

  console.log(`[BACKUP] Initiating complete database backup before operational reset...`);
  const tablesRes = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tableNames: string[] = tablesRes.rows.map(r => r.table_name);
  const backupData: Record<string, any[]> = {};
  let totalRows = 0;
  const sqlStatements: string[] = [
    `-- FPM Global Pre-Reset Database Backup`,
    `-- Timestamp: ${new Date().toISOString()}`,
    `-- Generated automatically by reset_operational_data.ts\n`
  ];

  for (const table of tableNames) {
    const rowsRes = await query(`SELECT * FROM "${table}"`);
    backupData[table] = rowsRes.rows;
    totalRows += rowsRes.rows.length;

    if (rowsRes.rows.length > 0) {
      sqlStatements.push(`-- Table: ${table} (${rowsRes.rows.length} rows)`);
      for (const row of rowsRes.rows) {
        const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number' || typeof v === 'boolean') return `${v}`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        sqlStatements.push(`INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
      }
      sqlStatements.push('');
    }
  }

  fs.writeFileSync(backupJsonPath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(backupSqlPath, sqlStatements.join('\n'), 'utf-8');

  // Verify backup exists and is non-empty
  const jsonStat = fs.statSync(backupJsonPath);
  const sqlStat = fs.statSync(backupSqlPath);
  if (jsonStat.size === 0 || sqlStat.size === 0) {
    throw new Error(`Backup verification failed: created backup files are empty!`);
  }

  console.log(`[BACKUP SUCCESS] Verified backup of ${tableNames.length} tables (${totalRows} total rows).`);
  console.log(`  JSON Backup: ${backupJsonPath} (${Math.round(jsonStat.size / 1024)} KB)`);
  console.log(`  SQL Backup:  ${backupSqlPath} (${Math.round(sqlStat.size / 1024)} KB)`);

  return { backupJsonPath, backupSqlPath, totalTables: tableNames.length, totalRows };
}

export async function runOperationalDataReset(execute: boolean = false) {
  console.log('================================================================');
  console.log(`  FPM GLOBAL OPERATIONAL DATA RESET — ${execute ? 'EXECUTION MODE' : 'DRY RUN'}`);
  console.log('================================================================');

  // Step 1: Pre-reset Inventory
  console.log('\n[PHASE 1] Analyzing current database state...');
  const protectedCounts: Record<string, number> = {};
  for (const t of PROTECTED_TABLES) {
    try {
      const res = await query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      protectedCounts[t] = parseInt(res.rows[0].cnt, 10);
    } catch {
      protectedCounts[t] = 0;
    }
  }

  console.log('\n--- PROTECTED ORGANIZATIONAL & IDENTITY DATA (WILL NEVER BE TOUCHED) ---');
  for (const [tbl, count] of Object.entries(protectedCounts)) {
    console.log(`  [PRESERVED] ${tbl.padEnd(28)} : ${count} rows`);
  }

  const operationalCounts: Record<string, number> = {};
  let totalOperationalRows = 0;
  for (const t of OPERATIONAL_TABLES_ORDER) {
    try {
      const res = await query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      const count = parseInt(res.rows[0].cnt, 10);
      operationalCounts[t] = count;
      totalOperationalRows += count;
    } catch {
      operationalCounts[t] = 0;
    }
  }

  // Also check operational media_items
  const mediaCountRes = await query(`
    SELECT COUNT(*) as cnt FROM media_items 
    WHERE entity_type IN ('event', 'testimony', 'highlight', 'feed', 'sunday-moment')
  `);
  const operationalMediaCount = parseInt(mediaCountRes.rows[0].cnt, 10);

  const preservedMediaRes = await query(`
    SELECT COUNT(*) as cnt FROM media_items 
    WHERE entity_type NOT IN ('event', 'testimony', 'highlight', 'feed', 'sunday-moment')
  `);
  const preservedMediaCount = parseInt(preservedMediaRes.rows[0].cnt, 10);

  console.log('\n--- OPERATIONAL RECORDS TO BE CLEARED ---');
  for (const [tbl, count] of Object.entries(operationalCounts)) {
    console.log(`  [TO CLEAR]  ${tbl.padEnd(28)} : ${count} rows`);
  }
  console.log(`  [TO CLEAR]  media_items (operational)   : ${operationalMediaCount} rows`);
  console.log(`  [PRESERVED] media_items (profiles/assets): ${preservedMediaCount} rows`);
  console.log(`\nTotal operational rows scheduled for removal: ${totalOperationalRows + operationalMediaCount}`);

  if (!execute) {
    console.log('\n>>> DRY RUN COMPLETED. No database changes were made.');
    console.log('>>> To execute the verified reset, rerun with the --execute flag.\n');
    return {
      dryRun: true,
      protectedCounts,
      operationalCounts,
      operationalMediaCount,
      preservedMediaCount,
      totalOperationalRows: totalOperationalRows + operationalMediaCount
    };
  }

  // Step 2: Full Database Backup before execution
  console.log('\n[PHASE 2] Executing safety backup...');
  const backupResult = await createFullDatabaseBackup();

  // Step 3: Fetch media URLs for exclusive operational storage cleanup
  console.log('\n[PHASE 3] Gathering operational media files for storage cleanup...');
  const opMediaUrlsRes = await query(`
    SELECT public_url, storage_path, entity_type FROM media_items 
    WHERE entity_type IN ('event', 'testimony', 'highlight', 'feed', 'sunday-moment')
  `);
  const opMomentsUrlsRes = await query(`SELECT media_url FROM sunday_moments`);
  const opMediaUrls: string[] = [
    ...opMediaUrlsRes.rows.map(r => r.public_url).filter(Boolean),
    ...opMomentsUrlsRes.rows.map(r => r.media_url).filter(Boolean)
  ];
  console.log(`Found ${opMediaUrls.length} operational media files to clean up from storage.`);

  // Step 4: Perform Database Deletion within Managed Transaction
  console.log('\n[PHASE 4] Performing atomic database reset inside transaction...');
  const deletedCounts: Record<string, number> = {};

  await withTransaction(async (client) => {
    for (const table of OPERATIONAL_TABLES_ORDER) {
      const delRes = await client.query(`DELETE FROM "${table}"`);
      deletedCounts[table] = delRes.rowCount || 0;
      console.log(`  Deleted ${deletedCounts[table]} rows from ${table}`);
    }

    // Delete operational media items
    const delMediaRes = await client.query(`
      DELETE FROM media_items 
      WHERE entity_type IN ('event', 'testimony', 'highlight', 'feed', 'sunday-moment')
    `);
    deletedCounts['media_items_operational'] = delMediaRes.rowCount || 0;
    console.log(`  Deleted ${deletedCounts['media_items_operational']} operational rows from media_items`);

    // Signal system mutation
    await client.query(`
      INSERT INTO system_mutations (id, mutated_at, entity_type)
      VALUES (1, NOW(), 'operational_reset')
      ON CONFLICT (id) DO UPDATE SET mutated_at = NOW(), entity_type = 'operational_reset';
    `);
  });

  console.log('[PHASE 4 SUCCESS] Database transaction committed successfully.');

  // Step 5: Clean up operational files from Supabase Storage
  console.log('\n[PHASE 5] Removing operational media from Supabase Storage...');
  let storageRemoved = 0;
  for (const url of opMediaUrls) {
    try {
      const removed = await StorageService.deleteMediaByUrl(url);
      if (removed) storageRemoved++;
    } catch (err: any) {
      console.warn(`[STORAGE CLEANUP WARNING] Could not remove ${url}:`, err.message);
    }
  }
  console.log(`Cleaned up ${storageRemoved} operational media items from Supabase Storage.`);

  // Step 6: Post-Reset Verification
  console.log('\n[PHASE 6] Verifying post-reset database state...');
  const postOperationalCounts: Record<string, number> = {};
  for (const t of OPERATIONAL_TABLES_ORDER) {
    const res = await query(`SELECT COUNT(*) as cnt FROM "${t}"`);
    postOperationalCounts[t] = parseInt(res.rows[0].cnt, 10);
  }

  const postProtectedCounts: Record<string, number> = {};
  for (const t of PROTECTED_TABLES) {
    const res = await query(`SELECT COUNT(*) as cnt FROM "${t}"`);
    postProtectedCounts[t] = parseInt(res.rows[0].cnt, 10);
  }

  console.log('\n--- POST-RESET VERIFICATION SUMMARY ---');
  let hasErrors = false;
  for (const [tbl, count] of Object.entries(postOperationalCounts)) {
    const status = count === 0 ? 'CLEARED (0 rows)' : `ERROR: ${count} rows remain!`;
    if (count !== 0) hasErrors = true;
    console.log(`  ${tbl.padEnd(28)} : ${status}`);
  }

  console.log('\n--- PROTECTED TABLES INTEGRITY CHECK ---');
  for (const [tbl, count] of Object.entries(postProtectedCounts)) {
    const initial = protectedCounts[tbl];
    const match = count === initial ? 'PERFECT MATCH' : `MISMATCH (Was: ${initial}, Now: ${count})`;
    if (count !== initial) hasErrors = true;
    console.log(`  ${tbl.padEnd(28)} : ${count} rows (${match})`);
  }

  if (hasErrors) {
    throw new Error('Post-reset verification found unexpected row counts or protected data alteration!');
  }

  console.log('\n================================================================');
  console.log('  OPERATIONAL DATA RESET COMPLETED AND VERIFIED 100% CLEAN!');
  console.log('================================================================\n');

  return {
    dryRun: false,
    backupResult,
    deletedCounts,
    protectedCounts: postProtectedCounts,
    storageRemoved
  };
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  try {
    await runOperationalDataReset(isExecute);
  } catch (err: any) {
    console.error('\n[FATAL RESET ERROR]:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
