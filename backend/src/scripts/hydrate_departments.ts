import { query } from '../db';

interface DeptTemplate {
  name: string;
  code: string;
  description: string;
  defaultHodName?: string;
  defaultHodId?: string;
}

const DEPARTMENT_TEMPLATES: DeptTemplate[] = [
  {
    name: 'Choir (Voices of Faith)',
    code: 'CHOIR',
    description: 'Leading praise, worship and sacred choral orchestration',
    defaultHodName: 'Sister Rachel Adams'
  },
  {
    name: 'Media & Technology',
    code: 'MEDIA',
    description: 'Multi-camera broadcast, audio engineering, live streaming, visuals',
    defaultHodName: 'Brother John Mensah'
  },
  {
    name: 'Ushering & Protocol',
    code: 'USHER',
    description: 'Sanctuary seating coordination, orderliness, guest hospitality',
    defaultHodName: 'Deacon Paul Eke'
  },
  {
    name: 'Security & Logistics',
    code: 'SEC',
    description: 'Sanctuary security, traffic coordination, emergency response',
    defaultHodName: 'Brother James Obi'
  },
  {
    name: 'Prayer & Intercession',
    code: 'PRAYER',
    description: 'Intercessory prayer tower, prayer chains, spiritual support',
    defaultHodName: 'Pastor Deborah Mark'
  },
  {
    name: 'Welfare & Hospitality',
    code: 'WELFARE',
    description: 'Benevolence, community food distribution, visitor welcome, member care',
    defaultHodName: 'Deaconess Comfort Eze'
  },
  {
    name: 'Children & Teens Church',
    code: 'CHILDREN',
    description: 'Sunday school curriculum, youth discipleship, biblical foundational classes',
    defaultHodName: 'Pastor Gloria Daniels'
  },
  {
    name: 'Pastoral Care Unit',
    code: 'PCU',
    description: 'Pastoral counseling, new convert integration, member visitation and compassionate oversight',
    defaultHodName: 'Pastor Tosin Jaiyeola'
  }
];

interface BranchConfig {
  branchId: string;
  branchName: string;
  prefix: string;
}

const BRANCHES: BranchConfig[] = [
  {
    branchId: 'b1111111-1111-1111-1111-111111111111',
    branchName: 'Ilorin Branch (Headquarters)',
    prefix: '1111'
  },
  {
    branchId: 'b2222222-2222-2222-2222-222222222222',
    branchName: 'Lagos Branch',
    prefix: '2222'
  },
  {
    branchId: 'b4444444-4444-4444-4444-444444444444',
    branchName: 'Abuja Branch',
    prefix: '4444'
  },
  {
    branchId: 'b3333333-3333-3333-3333-333333333333',
    branchName: 'UK Branch',
    prefix: '3333'
  },
  {
    branchId: '79e616a5-050c-4adc-a8a2-3102f432b542',
    branchName: 'Canada Branch',
    prefix: '5555'
  }
];

function getDepartmentId(prefix: string, index: number): string {
  // If HQ, preserve the existing canonical IDs for backward compatibility
  if (prefix === '1111') {
    const hqIds = [
      'd1111111-1111-1111-1111-111111111111',
      'd2222222-2222-2222-2222-222222222222',
      'd3333333-3333-3333-3333-333333333333',
      'd4444444-4444-4444-4444-444444444444',
      'd5555555-5555-5555-5555-555555555555',
      'd6666666-6666-6666-6666-666666666666',
      'd7777777-7777-7777-7777-777777777777',
      'd8888888-8888-8888-8888-888888888888'
    ];
    return hqIds[index];
  }

  const dDigit = index + 1;
  const firstPart = 'd' + String(dDigit).repeat(7);
  const seq = String(dDigit).padStart(12, '0');
  return `${firstPart}-${prefix}-${prefix}-${prefix}-${seq}`;
}

async function hydrateDepartments() {
  console.log('--- Starting FPM Global Departments Hydration across All Branches ---');

  // 1. Remove orphaned test departments (e.g. PROJ from test runs) that have no foreign key dependencies
  try {
    const deleted = await query(`
      DELETE FROM departments
      WHERE code = 'PROJ'
        AND id NOT IN (SELECT DISTINCT department_id FROM workers WHERE department_id IS NOT NULL)
        AND id NOT IN (SELECT DISTINCT department_id FROM department_positions WHERE department_id IS NOT NULL)
    `);
    console.log(`Cleaned up ${deleted.rowCount || 0} orphaned test departments.`);
  } catch (err: any) {
    console.warn('Orphaned test cleanup note:', err.message);
  }

  // 2. Hydrate each branch with all 8 departments
  let totalUpserted = 0;
  for (const branch of BRANCHES) {
    console.log(`\n=== Hydrating departments for ${branch.branchName} (${branch.branchId}) ===`);

    for (let i = 0; i < DEPARTMENT_TEMPLATES.length; i++) {
      const template = DEPARTMENT_TEMPLATES[i];
      const deptId = getDepartmentId(branch.prefix, i);
      const isHQ = branch.prefix === '1111';

      const hodName = isHQ ? template.defaultHodName : null;
      const hodId = isHQ && i === 0 ? 'c3333333-3333-3333-3333-333333333333' : (isHQ && i === 1 ? 'c5555555-5555-5555-5555-555555555555' : null);

      console.log(`  -> [${template.code}] ${template.name} (ID: ${deptId})`);

      await query(`
        INSERT INTO departments (
          id, branch_id, name, code, description, hod_name, hod_id, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          branch_id = EXCLUDED.branch_id,
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          description = EXCLUDED.description,
          hod_name = COALESCE(departments.hod_name, EXCLUDED.hod_name),
          hod_id = COALESCE(departments.hod_id, EXCLUDED.hod_id),
          status = 'active',
          updated_at = NOW()
      `, [
        deptId, branch.branchId, template.name, template.code,
        template.description, hodName, hodId
      ]);
      totalUpserted++;
    }
  }

  console.log(`\nSuccessfully hydrated/upserted ${totalUpserted} departments across ${BRANCHES.length} branches!`);

  // 3. Verify counts per branch in PostgreSQL
  const branchCounts = await query(`
    SELECT b.name as branch_name, b.branch_code, COUNT(d.id) as department_count
    FROM branches b
    LEFT JOIN departments d ON d.branch_id = b.id AND d.status = 'active'
    GROUP BY b.id, b.name, b.branch_code, b.is_headquarters
    ORDER BY b.is_headquarters DESC, b.name ASC
  `);

  console.log('\n--- Department Counts by Branch in PostgreSQL ---');
  console.table(branchCounts.rows);

  const sampleDepts = await query(`
    SELECT d.id, b.name as branch_name, d.name as department_name, d.code, d.hod_name, d.status
    FROM departments d
    JOIN branches b ON b.id = d.branch_id
    ORDER BY b.is_headquarters DESC, b.name ASC, d.name ASC
  `);

  console.log(`\n--- All Active Departments in PostgreSQL (Total: ${sampleDepts.rows.length}) ---`);
  console.table(sampleDepts.rows);

  process.exit(0);
}

hydrateDepartments().catch(err => {
  console.error('Departments hydration error:', err);
  process.exit(1);
});
