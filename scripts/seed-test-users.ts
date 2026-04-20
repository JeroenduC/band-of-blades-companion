#!/usr/bin/env tsx
/**
 * Seed script — creates a clean test environment with 3 campaigns,
 * each with a full player roster (8 users per campaign = 24 total).
 *
 * Usage:
 *   npm run seed:test
 *
 * WARNING: This DELETES ALL existing data and ALL auth users before
 * recreating everything from scratch. Only run against a development
 * Supabase project, never against production.
 *
 * User format:
 *   gm1@test.nl / testtest          → GM for Test Campaign Alpha
 *   commander1@test.nl / testtest   → Commander for Test Campaign Alpha
 *   ...
 *   gm2@test.nl / testtest          → GM for Test Campaign Beta
 *   ...
 *   gm3@test.nl / testtest          → GM for Test Campaign Gamma
 *   newplayer3@test.nl / testtest   → unassigned (join-flow testing)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Load .env.local ────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // Rely on environment variables being set externally
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Campaign definitions ───────────────────────────────────────────────────────

const PASSWORD = 'testtest';

interface CampaignDef {
  name: string;
  suffix: string; // '1', '2', '3'
}

const CAMPAIGNS: CampaignDef[] = [
  { name: 'Test Campaign Alpha', suffix: '1' },
  { name: 'Test Campaign Beta',  suffix: '2' },
  { name: 'Test Campaign Gamma', suffix: '3' },
];

const ROLES = [
  { role: 'GM',           label: 'GM'            },
  { role: 'COMMANDER',    label: 'Commander'     },
  { role: 'MARSHAL',      label: 'Marshal'       },
  { role: 'QUARTERMASTER',label: 'Quartermaster' },
  { role: 'LOREKEEPER',   label: 'Lorekeeper'    },
  { role: 'SPYMASTER',    label: 'Spymaster'     },
  { role: 'SOLDIER',      label: 'Soldier'       },
] as const;

function emailFor(role: string, suffix: string) {
  return `${role.toLowerCase()}${suffix}@test.nl`;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

// ── Logging helpers ────────────────────────────────────────────────────────────

function log(msg: string) { console.log(`  ${msg}`); }
function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

// ── Clean ──────────────────────────────────────────────────────────────────────

async function deleteAllData() {
  section('Deleting existing data');

  const tables = [
    'campaign_phase_log',
    'back_at_camp_scenes',
    'recruit_pool',
    'laborers',
    'long_term_projects',
    'alchemists',
    'mercies',
    'siege_weapons',
    'missions',
    'specialists',
    'squad_members',
    'squads',
    'spies',
    'spy_networks',
    'spy_long_term_assignments',
    'campaign_memberships',
    'campaigns',
    'profiles',
  ] as const;

  for (const table of tables) {
    const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
        log(`⚠ ${table} skipped (table not found — migration not applied yet)`);
        continue;
      }
      if (!error.message.includes('0 rows')) {
        console.error(`  Failed to delete ${table}: ${error.message}`);
        process.exit(1);
      }
    }
    log(`✓ ${table} cleared`);
  }
}

async function deleteAllAuthUsers() {
  section('Deleting auth users');

  let page = 1;
  let total = 0;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.error(`  Failed to list auth users: ${error.message}`); process.exit(1); }
    if (data.users.length === 0) break;

    for (const user of data.users) {
      const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`  Failed to delete user ${user.email}: ${deleteError.message}`);
        process.exit(1);
      }
      total++;
    }
    if (data.users.length < 1000) break;
    page++;
  }

  log(`✓ ${total} auth user(s) deleted`);
}

// ── Per-campaign seeding ───────────────────────────────────────────────────────

async function createUsersForCampaign(suffix: string): Promise<Map<string, string>> {
  const userIds = new Map<string, string>();

  const allUsers = [
    ...ROLES.map(({ role, label }) => ({
      email: emailFor(role, suffix),
      displayName: `${label} ${suffix}`,
    })),
    { email: `newplayer${suffix}@test.nl`, displayName: `New Player ${suffix}` },
  ];

  for (const u of allUsers) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: u.displayName },
    });

    if (error || !data.user) {
      console.error(`  Failed to create ${u.email}: ${error?.message}`);
      process.exit(1);
    }

    userIds.set(u.email, data.user.id);

    const { error: profileError } = await db
      .from('profiles')
      .upsert({ id: data.user.id, display_name: u.displayName });

    if (profileError) {
      console.error(`  Failed to upsert profile for ${u.email}: ${profileError.message}`);
      process.exit(1);
    }

    log(`✓ ${u.email}  (${u.displayName})`);
  }

  return userIds;
}

async function createCampaign(name: string, isFirst: boolean): Promise<{ id: string; inviteCode: string }> {
  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await db
      .from('campaigns')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  // First campaign starts at the very beginning (PHASE_COMPLETE).
  // This allows the GM to start the first phase from the dashboard.
  // Others start in the middle (Step 7) for testing downstream actions.
  const { data: campaign, error } = await db
    .from('campaigns')
    .insert({
      name,
      invite_code: inviteCode,
      current_location: isFirst ? 'western_front' : 'plainsworth',
      pressure: isFirst ? 0 : 3,
      intel: isFirst ? 0 : 2,
      time_clock_1: isFirst ? 0 : 5,
      horse_uses: isFirst ? 0 : 2,
      campaign_phase_state: isFirst ? 'PHASE_COMPLETE' : 'AWAITING_ADVANCE',
    })
    .select()
    .single();

  if (error || !campaign) {
    console.error(`  Failed to create campaign "${name}": ${error?.message}`);
    process.exit(1);
  }

  log(`✓ "${name}" created  (invite: ${inviteCode})`);
  return { id: campaign.id, inviteCode };
}

async function seedMissions(campaignId: string) {
  const { error } = await db.from('missions').insert([
    {
      campaign_id: campaignId,
      phase_number: 1,
      name: 'The Relic of Sunstrider',
      type: 'RELIGIOUS',
      objective: 'Recover the ancient relic before the Broken defile it.',
      rewards: { time: 2, morale: 1 },
      penalties: { time: -1 },
      threat_level: 2,
      status: 'GENERATED',
    },
    {
      campaign_id: campaignId,
      phase_number: 1,
      name: 'Supply Run to Westlake',
      type: 'SUPPLY',
      objective: 'Secure vital supplies for the winter.',
      rewards: { supply: 3 },
      penalties: { pressure: 1 },
      threat_level: 1,
      status: 'GENERATED',
    },
    {
      campaign_id: campaignId,
      phase_number: 1,
      name: 'Ambush at the Pass',
      type: 'ASSAULT',
      objective: 'Eliminate the undead scouts blocking our path.',
      rewards: { morale: 2, intel: 1 },
      penalties: { pressure: 2 },
      threat_level: 3,
      status: 'GENERATED',
    },
  ]);

  if (error) {
    console.error(`  Failed to seed missions: ${error.message}`);
    process.exit(1);
  }
  log('✓ 3 sample missions generated');
}

async function assignMemberships(campaignId: string, suffix: string, userIds: Map<string, string>) {
  for (const { role, label } of ROLES) {
    const email = emailFor(role, suffix);
    const userId = userIds.get(email);
    if (!userId) { console.error(`  No user ID for ${email}`); process.exit(1); }

    const { error } = await db.from('campaign_memberships').insert({
      user_id: userId,
      campaign_id: campaignId,
      role,
      rank: 'PRIMARY',
    });

    if (error) {
      console.error(`  Failed to assign ${email}: ${error.message}`);
      process.exit(1);
    }
    log(`✓ ${label} ${suffix} → ${role}`);
  }
  log(`  (newplayer${suffix}@test.nl left unassigned)`);
}

async function seedScenes(campaignId: string) {
  const { error } = await db.rpc('seed_back_at_camp_scenes', { p_campaign_id: campaignId });
  if (error) { console.error(`  Failed to seed scenes: ${error.message}`); process.exit(1); }
  log('✓ Back at Camp scenes seeded');
}

async function seedMateriel(campaignId: string, suffix: string) {
  const { error: le } = await db.from('laborers').insert({ campaign_id: campaignId, count: 2 });
  if (le) { console.error(`  Failed to seed laborers: ${le.message}`); process.exit(1); }

  const { error: ae } = await db.from('alchemists').insert([
    { campaign_id: campaignId, name: `Sister Vantia ${suffix}`, corruption: 3 },
    { campaign_id: campaignId, name: `Aldric the Grey ${suffix}`, corruption: 0 },
  ]);
  if (ae) { console.error(`  Failed to seed alchemists: ${ae.message}`); process.exit(1); }

  const { error: me } = await db.from('mercies').insert([
    { campaign_id: campaignId, name: `Healer Maren ${suffix}`, wounded: false },
  ]);
  if (me) { console.error(`  Failed to seed mercies: ${me.message}`); process.exit(1); }

  const { error: pe } = await db.from('long_term_projects').insert({
    campaign_id: campaignId,
    name: 'Field Fortifications',
    description: 'Construct defensive earthworks. When complete: -1 pressure on advance.',
    clock_size: 8,
    segments_filled: 3,
  });
  if (pe) { console.error(`  Failed to seed project: ${pe.message}`); process.exit(1); }

  log('✓ QM materiel: 2 laborers, 2 alchemists, 1 mercy, 1 project (3/8)');
}

async function seedPersonnel(campaignId: string) {
  const squads = [
    { name: 'Ember Wolves', motto: 'First Into the Fray', type: 'SOLDIER' },
    { name: 'Grinning Ravens', motto: 'We Laugh at Death', type: 'SOLDIER' },
    { name: 'Star Vipers', motto: 'In Darkness We Shine', type: 'SOLDIER' },
    { name: 'Shattered Lions', motto: 'Pride of the Legion', type: 'SOLDIER' },
    { name: 'Ghost Owls', motto: 'Calm Before the Storm', type: 'SOLDIER' },
    { name: 'Silver Stags', motto: 'No Matter the Cost', type: 'SOLDIER' },
  ];

  for (const s of squads) {
    const { data: squad, error: se } = await db.from('squads').insert({
      campaign_id: campaignId,
      ...s
    }).select().single();

    if (se) { console.error(`  Failed to seed squad ${s.name}: ${se.message}`); process.exit(1); }

    // Seed 3-5 members per squad
    const memberCount = Math.floor(Math.random() * 3) + 3;
    const heritages = ['Bartylla', 'Pannonia', 'Zemya', 'Akhoros'];
    const names = ['Kaelen', 'Mara', 'Jaxon', 'Lyra', 'Torin', 'Sela', 'Bram', 'Via', 'Dax', 'Kira'];

    for (let i = 0; i < memberCount; i++) {
      const { error: me } = await db.from('squad_members').insert({
        squad_id: squad.id,
        name: names[Math.floor(Math.random() * names.length)] + ' ' + (i + 1),
        heritage: heritages[Math.floor(Math.random() * heritages.length)],
        rank: Math.random() > 0.7 ? 'SOLDIER' : 'ROOKIE',
        status: 'ALIVE',
        harm: 0,
        stress: 0,
        xp: Math.floor(Math.random() * 3)
      });
      if (me) { console.error(`  Failed to seed squad member: ${me.message}`); process.exit(1); }
    }
  }

  const specialists = [
    { name: 'Kruge', class: 'HEAVY', heritage: 'Bartylla', stress: 2, status: 'AVAILABLE', xp: 4 },
    { name: 'Ana', class: 'MEDIC', heritage: 'Pannonia', stress: 0, status: 'AVAILABLE', xp: 2 },
    { name: 'Kael', class: 'OFFICER', heritage: 'Zemya', stress: 5, status: 'AVAILABLE', xp: 6 },
    { name: 'Thief', class: 'SCOUT', heritage: 'Akhoros', stress: 1, status: 'AVAILABLE', xp: 1 },
    { name: 'Eagle', class: 'SNIPER', heritage: 'Bartylla', stress: 3, status: 'AVAILABLE', xp: 3, harm_level_1_a: 'Twisted Ankle' },
  ];

  const { error: spe } = await db.from('specialists').insert(
    specialists.map(s => ({ ...s, campaign_id: campaignId }))
  );
  if (spe) { console.error(`  Failed to seed specialists: ${spe.message}`); process.exit(1); }

  log('✓ Personnel seeded: 6 squads, 5 specialists');
}

async function seedSpymaster(campaignId: string) {
  // Named spies
  const spies = [
    { name: 'Antoinette', rank: 'MASTER', status: 'AVAILABLE', specialty: 'automatically upgrades to Master when selected.', current_assignment: 'NONE', assignment_clock: 0 },
    { name: 'Bortis', rank: 'TRAINED', status: 'ON_ASSIGNMENT', current_assignment: 'EXPAND', assignment_clock: 3, specialty: '+1 segment on Expand Network rolls.' },
    { name: 'Crimson Vexing Gale', rank: 'TRAINED', status: 'DEAD', specialty: 'does not wound on any mission.', current_assignment: 'NONE', assignment_clock: 0 },
    { name: 'Igrid', rank: 'TRAINED', status: 'AVAILABLE', specialty: '+1 question when Interrogating.', current_assignment: 'NONE', assignment_clock: 0 },
  ];

  const { error: se } = await db.from('spies').insert(
    spies.map(s => ({ ...s, campaign_id: campaignId }))
  );
  if (se) { log(`⚠ Failed to seed spies: ${se.message}`); }

  const { error: ne } = await db.from('spy_networks').insert({
    campaign_id: campaignId,
    upgrades: ['Spy Network']
  });
  if (ne) { log(`⚠ Failed to seed spy network: ${ne.message}`); }

  log('✓ Spymaster: 2 active spies, 1 dead, network initialized');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Band of Blades — Seed Test Environment  ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\n⚠  This will DELETE all existing data and users.');

  await deleteAllData();
  await deleteAllAuthUsers();

  const results: Array<{ campaign: CampaignDef; inviteCode: string }> = [];

  for (let i = 0; i < CAMPAIGNS.length; i++) {
    const campaign = CAMPAIGNS[i];
    section(`Campaign: ${campaign.name}`);
    const userIds = await createUsersForCampaign(campaign.suffix);
    const { id, inviteCode } = await createCampaign(campaign.name, i === 0);
    await assignMemberships(id, campaign.suffix, userIds);
    await seedScenes(id);
    await seedMateriel(id, campaign.suffix);
    await seedPersonnel(id);
    await seedSpymaster(id);
    await seedMissions(id);
    results.push({ campaign, inviteCode });
  }

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Done! 3 test campaigns ready.           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\nAll passwords: testtest\n');

  for (const { campaign, inviteCode } of results) {
    const s = campaign.suffix;
    console.log(`  ${campaign.name}  (invite: ${inviteCode})`);
    console.log(`    gm${s}@test.nl            → GM`);
    console.log(`    commander${s}@test.nl     → Commander`);
    console.log(`    marshal${s}@test.nl       → Marshal`);
    console.log(`    quartermaster${s}@test.nl → Quartermaster`);
    console.log(`    lorekeeper${s}@test.nl    → Lorekeeper`);
    console.log(`    spymaster${s}@test.nl     → Spymaster`);
    console.log(`    soldier${s}@test.nl       → Soldier`);
    console.log(`    newplayer${s}@test.nl     → (unassigned, use invite above)`);
    console.log('');
  }
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
