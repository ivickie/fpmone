import { query } from '../db/index';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

interface UserRecord {
  user_id: string;
  email: string;
  phone: string;
  admin_level: string;
  is_admin: boolean;
  member_id: string;
  first_name: string;
  last_name: string;
  branch_name: string;
  role_name: string;
  role_code: string;
  worker_id_code?: string;
  position_name?: string;
}

// Generate a secure, readable random password
// E.g.: Fpm-8xK2#mQ! (12 chars, upper, lower, digits, symbols)
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  let pwd = 'Fpm'; // Brand prefix for easy recognition
  pwd += symbols[crypto.randomInt(0, symbols.length)];
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  return pwd;
}

async function main() {
  console.log('[RANDOMIZE] Connecting to Supabase PostgreSQL...');

  // Purge lingering test accounts if any
  await query("DELETE FROM users WHERE email LIKE '%second.admin%' OR email LIKE '%orphaned%' OR email LIKE '%attacker%'");

  const res = await query(`
    SELECT 
      u.id as user_id,
      u.email,
      u.phone,
      u.admin_level,
      u.is_admin,
      m.id as member_id,
      m.first_name,
      m.last_name,
      b.name as branch_name,
      r.name as role_name,
      r.code as role_code,
      w.worker_id_code,
      w.position_name
    FROM users u
    LEFT JOIN members m ON m.user_id = u.id
    LEFT JOIN branches b ON m.primary_branch_id = b.id
    LEFT JOIN ministry_roles r ON m.primary_role_id = r.id
    LEFT JOIN workers w ON w.member_id = m.id
    WHERE u.email NOT LIKE '%second.admin%' AND u.email NOT LIKE '%orphaned%' AND u.email NOT LIKE '%attacker%'
    ORDER BY 
      CASE 
        WHEN u.admin_level = 'super_admin' THEN 1
        WHEN r.code = 'BRANCH_PASTOR' THEN 2
        WHEN u.admin_level = 'branch_admin' THEN 3
        WHEN r.code = 'HOD' THEN 4
        WHEN r.code = 'WORKER' THEN 5
        ELSE 6
      END,
      b.name ASC,
      m.first_name ASC
  `);

  const users: UserRecord[] = res.rows;
  console.log(`[RANDOMIZE] Found ${users.length} users in database.`);

  const exportData: any[] = [];
  const updatePromises: Promise<any>[] = [];

  for (const user of users) {
    const plainPassword = generateSecurePassword();
    const passwordHash = bcrypt.hashSync(plainPassword, 10);

    const fullName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : (user.email.split('@')[0]);

    let accessType = 'Member';
    if (user.admin_level === 'super_admin') accessType = 'Super Administrator';
    else if (user.role_code === 'BRANCH_PASTOR') accessType = 'Branch Pastor';
    else if (user.admin_level === 'branch_admin') accessType = 'Branch Administrator';
    else if (user.role_code === 'HOD') accessType = 'Head of Department (HOD)';
    else if (user.worker_id_code) accessType = 'Worker';

    exportData.push({
      'S/N': exportData.length + 1,
      'Full Name': fullName,
      'Email (Login Username)': user.email,
      'Phone Number': user.phone || 'N/A',
      'Access Role': accessType,
      'Church Branch': user.branch_name || 'Faith Cathedral (HQ)',
      'Worker Code': user.worker_id_code || 'N/A',
      'Assigned Department': user.position_name || 'N/A',
      'New Generated Password': plainPassword,
      'Password Hash (bcrypt)': passwordHash
    });

    // Update in PostgreSQL
    updatePromises.push(
      query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, user.user_id]
      )
    );
  }

  await Promise.all(updatePromises);
  console.log('[RANDOMIZE] Successfully updated all password hashes in PostgreSQL!');

  // Create Excel Workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // S/N
    { wch: 26 }, // Full Name
    { wch: 34 }, // Email
    { wch: 18 }, // Phone
    { wch: 28 }, // Role
    { wch: 30 }, // Branch
    { wch: 14 }, // Worker Code
    { wch: 24 }, // Department
    { wch: 22 }, // Password
    { wch: 30 }  // Hash preview
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'FPM User Credentials');

  // Paths to save
  const rootDir = path.resolve(__dirname, '../../../');
  const xlsxPath = path.join(rootDir, 'FPM_Global_User_Credentials.xlsx');
  const csvPath = path.join(rootDir, 'FPM_Global_User_Credentials.csv');
  const jsonPath = path.join(rootDir, 'fpm_credentials.json');

  XLSX.writeFile(wb, xlsxPath);
  console.log('[EXPORT] Saved Excel workbook to:', xlsxPath);

  // Also write CSV
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log('[EXPORT] Saved CSV export to:', csvPath);

  // Also write JSON for programmatic reference
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');

  console.log('[EXPORT] Complete! Total credentials generated:', exportData.length);
  process.exit(0);
}

main().catch(err => {
  console.error('[RANDOMIZE ERROR]', err);
  process.exit(1);
});
