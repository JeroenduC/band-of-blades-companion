#!/usr/bin/env tsx
/**
 * Seed script — creates a clean test environment with 8 known users
 * and a single campaign with all roles assigned.
 *
 * Usage:
 *   npm run seed:test
 *
 * WARNING: This DELETES ALL existing data (campaigns, memberships, profiles)
 * and ALL auth users before recreating everything from scratch. Only run
 * against a development/test Supabase project, never against production.
 *
 * After running, use the printed invite code to test the join flow
 * with the newplayer@test.nl account.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Load .env.local ────────────────────────────────────────────────────────────
// tsx doesn't auto-load Next.js env files, so we parse it manually.
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
  // If .env.local doesn't exist, rely on environment variables being set externally
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

// ── Test users ─────────────────────────────────────────────────────────────────

const PASSWORD = 'testtest';

const CAMPAIGN_MEMBERS = [
  { email: 'gm@test.nl',           displayName: 'GM',           role: 'GM'            },
  { email: 'commander@test.nl',     displayName: 'Commander',    role: 'COMMANDER'     },
  { email: 'marshal@test.nl',       displayName: 'Marshal',      role: 'MARSHAL'       },
  { email: 'quartermaster@test.nl', displayName: 'Quartermaster',role: 'QUARTERMASTER' },
  { email: 'lorekeeper@test.nl',    displayName: 'Lorekeeper',   role: 'LOREKEEPER'    },
  { email: 'spymaster@test.nl',     displayName: 'Spymaster',    role: 'SPYMASTER'     },
  { email: 'soldier@test.nl',       displayName: 'Soldier',      role: 'SOLDIER'       },
] as const;

// Newplayer is created but NOT added to the campaign — for testing the join flow.
const NEW_PLAYER = { email: 'newplayer@test.nl', displayName: 'New Player' };

// ── Invite code ────────────────────────────────────────────────────────────────
// Same algorithm as src/server/actions/campaign.ts — excluding visually
// ambiguous characters (0/O, 1/I/L) to reduce join errors.
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`  ${msg}`);
}

function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

// ── Step 1: Delete all data ────────────────────────────────────────────────────

async function deleteAllData() {
  section('Deleting existing data');

  // Delete in foreign-key order: dependents first.
  const tables = [
    'campaign_phase_log',
    'back_at_camp_scenes',
    'campaign_memberships',
    'campaigns',
    'profiles',
  ] as const;

  for (const table of tables) {
    // neq trick: delete all rows by matching on a column that is never null
    const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      // Ignore "no rows" errors — table may already be empty
      if (!error.message.includes('0 rows')) {
        console.error(`  Failed to delete ${table}: ${error.message}`);
        process.exit(1);
      }
    }
    log(`✓ ${table} cleared`);
  }
}

// ── Step 2: Delete all auth users ─────────────────────────────────────────────

async function deleteAllAuthUsers() {
  section('Deleting auth users');

  // List all users — paginate if necessary (unlikely in dev, but correct).
  let page = 1;
  let total = 0;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error(`  Failed to list auth users: ${error.message}`);
      process.exit(1);
    }
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

// ── Step 3 + 4: Create users ───────────────────────────────────────────────────

async function createUsers(): Promise<Map<string, string>> {
  section('Creating test users');

  // Returns a map of email → user UUID
  const userIds = new Map<string, string>();

  const allUsers = [...CAMPAIGN_MEMBERS, NEW_PLAYER];

  for (const u of allUsers) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,              // skip the confirmation email
      user_metadata: { display_name: u.displayName },
    });

    if (error || !data.user) {
      console.error(`  Failed to create ${u.email}: ${error?.message}`);
      process.exit(1);
    }

    userIds.set(u.email, data.user.id);

    // Upsert profile — the DB trigger may create it automatically, but we
    // explicitly set display_name here to guarantee the correct value.
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

// ── Step 5: Create campaign ────────────────────────────────────────────────────

async function createCampaign(): Promise<{ id: string; inviteCode: string }> {
  section('Creating campaign');

  // Retry up to 5 times to get a unique invite code (mirrors app logic).
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
    .insert({ name: 'Test Campaign', invite_code: inviteCode })
    .select()
    .single();

  if (error || !campaign) {
    console.error(`  Failed to create campaign: ${error?.message}`);
    process.exit(1);
  }

  log(`✓ "Test Campaign" created`);
  log(`  id: ${campaign.id}`);
  log(`  invite_code: ${inviteCode}`);

  return { id: campaign.id, inviteCode };
}

// ── Step 6: Assign memberships ────────────────────────────────────────────────

async function assignMemberships(campaignId: string, userIds: Map<string, string>) {
  section('Assigning memberships');

  for (const member of CAMPAIGN_MEMBERS) {
    const userId = userIds.get(member.email);
    if (!userId) {
      console.error(`  No user ID found for ${member.email}`);
      process.exit(1);
    }

    const { error } = await db.from('campaign_memberships').insert({
      user_id: userId,
      campaign_id: campaignId,
      role: member.role,
      rank: 'PRIMARY',
    });

    if (error) {
      console.error(`  Failed to assign ${member.email}: ${error.message}`);
      process.exit(1);
    }

    log(`✓ ${member.displayName} → ${member.role} (PRIMARY)`);
  }

  log(`  (newplayer@test.nl left unassigned — use invite code to test join flow)`);
}

// ── Step 7: Seed back-at-camp scenes ─────────────────────────────────────────

async function seedScenes(campaignId: string) {
  section('Seeding Back at Camp scenes');

  const { error } = await db.rpc('seed_back_at_camp_scenes', {
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error(`  Failed to seed scenes: ${error.message}`);
    process.exit(1);
  }

  log(`✓ Back at Camp scenes seeded`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Band of Blades — Seed Test Environment  ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\n⚠  This will DELETE all existing data and users.');

  await deleteAllData();
  await deleteAllAuthUsers();
  const userIds = await createUsers();
  const { id: campaignId, inviteCode } = await createCampaign();
  await assignMemberships(campaignId, userIds);
  await seedScenes(campaignId);

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Done! Test environment ready.           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\nTest accounts (password: testtest)');
  console.log('  gm@test.nl            → GM');
  console.log('  commander@test.nl     → Commander');
  console.log('  marshal@test.nl       → Marshal');
  console.log('  quartermaster@test.nl → Quartermaster');
  console.log('  lorekeeper@test.nl    → Lorekeeper');
  console.log('  spymaster@test.nl     → Spymaster');
  console.log('  soldier@test.nl       → Soldier');
  console.log('  newplayer@test.nl     → (no campaign — use invite code below)');
  console.log(`\nInvite code: ${inviteCode}`);
  console.log('');
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
