import { query, pool } from '../db';

async function main() {
  try {
    console.log('--- Inspecting PostgreSQL Schema ---');
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tableNames: string[] = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tableNames.length} tables in public schema:\n`, tableNames.join(', '));

    console.log('\n--- Row Counts per Table ---');
    const counts: Record<string, number> = {};
    for (const t of tableNames) {
      try {
        const countRes = await query(`SELECT COUNT(*) as cnt FROM "${t}"`);
        counts[t] = parseInt(countRes.rows[0].cnt, 10);
        console.log(`${t.padEnd(30)}: ${counts[t]} rows`);
      } catch (err: any) {
        console.log(`${t.padEnd(30)}: ERROR (${err.message})`);
      }
    }

    console.log('\n--- Foreign Key Dependencies ---');
    const fkRes = await query(`
      SELECT
        tc.table_name as dependent_table,
        kcu.column_name as foreign_key_column,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY ccu.table_name, tc.table_name;
    `);

    for (const row of fkRes.rows) {
      console.log(`${row.dependent_table}.${row.foreign_key_column} -> ${row.referenced_table}.${row.referenced_column}`);
    }

  } catch (err: any) {
    console.error('Database connection or query failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
