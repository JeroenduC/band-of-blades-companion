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

async function createCampaign(name: string): Promise<{ id: string; inviteCode: string }> {
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

  const { data: campaign, error } = await db
    .from('campaigns')
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (error || !campaign) {
    console.error(`  Failed to create campaign "${name}": ${error?.message}`);
    process.exit(1);
  }

  log(`✓ "${name}" created  (invite: ${inviteCode})`);
  return { id: campaign.id, inviteCode };
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

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Band of Blades — Seed Test Environment  ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\n⚠  This will DELETE all existing data and users.');

  await deleteAllData();
  await deleteAllAuthUsers();

  const results: Array<{ campaign: CampaignDef; inviteCode: string }> = [];

  for (const campaign of CAMPAIGNS) {
    section(`Campaign: ${campaign.name}`);
    const userIds = await createUsersForCampaign(campaign.suffix);
    const { id, inviteCode } = await createCampaign(campaign.name);
    await assignMemberships(id, campaign.suffix, userIds);
    await seedScenes(id);
    await seedMateriel(id, campaign.suffix);
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
