import { query } from '../db';

interface BranchSeed {
  id: string;
  organizationId: string;
  name: string;
  branchCode: string;
  address: string;
  city: string;
  state: string;
  country: string;
  branchPastorName: string;
  email: string;
  isHeadquarters: boolean;
  status: string;
}

const ORG_ID = '00000000-0000-0000-0000-000000000001';

const OFFICIAL_BRANCHES: BranchSeed[] = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    organizationId: ORG_ID,
    name: 'Ilorin Branch (Headquarters)',
    branchCode: 'FPM-HQ',
    address: 'Behind Dangote Flour Mills, Off Asa Dam Road, Ilorin, Kwara State.',
    city: 'Ilorin',
    state: 'Kwara State',
    country: 'Nigeria',
    branchPastorName: 'Pastor Tosin Jaiyeola',
    email: 'hq@faithpreachers.org',
    isHeadquarters: true,
    status: 'active'
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    organizationId: ORG_ID,
    name: 'Lagos Branch',
    branchCode: 'FPM-LAG',
    address: '82, New Ipaja Road, Beside Prestige Mall, Alimosho Bus stop, Iyana-Ipaja, Lagos',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    branchPastorName: 'Pastor Sam Jaiyeola',
    email: 'lagos@faithpreachers.org',
    isHeadquarters: false,
    status: 'active'
  },
  {
    id: 'b4444444-4444-4444-4444-444444444444',
    organizationId: ORG_ID,
    name: 'Abuja Branch',
    branchCode: 'FPM-ABJ',
    address: 'Edidas Residence Hotel, opposite Start Rite School, Zone E Apo, Abuja.',
    city: 'Abuja',
    state: 'Federal Capital Territory',
    country: 'Nigeria',
    branchPastorName: 'Pastor Kesh',
    email: 'abj@faithpreachers.org',
    isHeadquarters: false,
    status: 'active'
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    organizationId: ORG_ID,
    name: 'UK Branch',
    branchCode: 'FPM-UK',
    address: 'Hatfield Swim Centre Studio, Lemsford Road, Hatfield, Hertfordshire, England (AL10 0DH)',
    city: 'Hatfield',
    state: 'Hertfordshire',
    country: 'United Kingdom',
    branchPastorName: 'Pastor Seye',
    email: 'uk@faithpreachers.org',
    isHeadquarters: false,
    status: 'active'
  },
  {
    id: '79e616a5-050c-4adc-a8a2-3102f432b542',
    organizationId: ORG_ID,
    name: 'Canada Branch',
    branchCode: 'FPM-CAN',
    address: 'Program Room 2 Erin Meadows Community Centre, Mississauga, Ontario, Canada (L5M 527)',
    city: 'Mississauga',
    state: 'Ontario',
    country: 'Canada',
    branchPastorName: 'Pastor Seun Otuyemi',
    email: 'canada@faithpreachers.org',
    isHeadquarters: false,
    status: 'active'
  }
];

async function hydrateBranches() {
  console.log('--- Starting FPM Global Branches Hydration ---');

  // 1. Upsert each branch
  for (const b of OFFICIAL_BRANCHES) {
    console.log(`Upserting branch: ${b.name} (${b.branchCode}) [${b.id}]`);
    await query(`
      INSERT INTO branches (
        id, organization_id, name, branch_code, address, city, state, country,
        branch_pastor_name, email, is_headquarters, status, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        name = EXCLUDED.name,
        branch_code = EXCLUDED.branch_code,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        branch_pastor_name = EXCLUDED.branch_pastor_name,
        email = EXCLUDED.email,
        is_headquarters = EXCLUDED.is_headquarters,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [
      b.id, b.organizationId, b.name, b.branchCode, b.address, b.city,
      b.state, b.country, b.branchPastorName, b.email, b.isHeadquarters, b.status
    ]);
  }

  // 2. Update headquarters address in organizations table
  console.log('Updating organization headquarters address...');
  await query(`
    UPDATE organizations
    SET headquarters_address = $1, updated_at = NOW()
    WHERE id = $2
  `, ['Behind Dangote Flour Mills, Off Asa Dam Road, Ilorin, Kwara State.', ORG_ID]);

  // 3. Remove any branch that is not in the official 5
  const validIds = OFFICIAL_BRANCHES.map(b => b.id);
  const extraneous = await query(`
    SELECT id, name, branch_code FROM branches WHERE id NOT IN ($1, $2, $3, $4, $5)
  `, validIds);

  if (extraneous.rows.length > 0) {
    console.log(`Found ${extraneous.rows.length} extraneous branches to remove:`, extraneous.rows);
    await query(`
      DELETE FROM branches WHERE id NOT IN ($1, $2, $3, $4, $5)
    `, validIds);
  } else {
    console.log('No extraneous branches found. Exactly 5 official branches exist.');
  }

  // 4. Query and print final state
  const finalBranches = await query(`
    SELECT id, name, branch_code, address, city, state, country, branch_pastor_name, email, is_headquarters, status
    FROM branches
    ORDER BY is_headquarters DESC, name ASC
  `);

  console.log('\n--- Final Branches in PostgreSQL Database ---');
  console.table(finalBranches.rows);
  console.log('\nBranches hydration completed successfully!');
  process.exit(0);
}

hydrateBranches().catch(err => {
  console.error('Branches hydration error:', err);
  process.exit(1);
});
