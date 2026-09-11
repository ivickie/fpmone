import fs from 'fs';
import path from 'path';
import { pool, query } from '../db';

async function runMigration() {
  console.log('====================================================');
  console.log('  FPM ONE — SUPABASE POSTGRESQL MIGRATION RUNNER');
  console.log('====================================================');

  const databaseDir = path.resolve(__dirname, '../../database');
  const schemaPath = path.join(databaseDir, 'schema.sql');
  const functionsPath = path.join(databaseDir, 'functions.sql');
  const seedPath = path.join(databaseDir, 'seed.sql');

  try {
    // 1. Check connection
    console.log('[1/4] Connecting to Supabase PostgreSQL database...');
    const connCheck = await query('SELECT NOW() as now, version() as v');
    console.log(`  Connected successfully at ${connCheck.rows[0].now}`);
    console.log(`  Engine: ${connCheck.rows[0].v.split(' ')[0]} ${connCheck.rows[0].v.split(' ')[1]}`);

    // 2. Execute schema.sql
    console.log('\n[2/4] Applying Relational Schema (schema.sql)...');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await query(schemaSql);
    console.log('  Schema applied successfully (all tables, sequences, indexes, RLS created).');

    // 3. Execute functions.sql
    console.log('\n[3/4] Installing Stored Functions & Triggers (functions.sql)...');
    if (!fs.existsSync(functionsPath)) {
      throw new Error(`functions.sql not found at ${functionsPath}`);
    }
    const functionsSql = fs.readFileSync(functionsPath, 'utf8');
    await query(functionsSql);
    console.log('  Functions installed successfully (clock-in, clock-out, approval procedures ready).');

    // 4. Execute seed.sql
    console.log('\n[4/4] Seeding Initial Church Production Data (seed.sql)...');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at ${seedPath}`);
    }
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await query(seedSql);
    console.log('  Seed data inserted successfully.');

    // 5. Verification: Count records in key tables
    console.log('\n====================================================');
    console.log('  DATABASE PROVISIONING SUMMARY');
    console.log('====================================================');

    const tables = [
      'organizations',
      'branches',
      'ministry_roles',
      'departments',
      'department_positions',
      'users',
      'members',
      'workers',
      'services',
      'attendance_settings',
      'attendance_records',
      'events',
      'posts',
      'service_highlights',
      'testimonies',
      'notifications',
      'audit_logs'
    ];

    for (const table of tables) {
      const countRes = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  - ${table.padEnd(25)} : ${countRes.rows[0].count} records`);
    }

    console.log('\nMigration complete! Supabase database is ready.');
  } catch (err: any) {
    console.error('\n[MIGRATION ERROR] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
