#!/usr/bin/env tsx
/**
 * Cleanup script — deletes ALL data and auth users from the Supabase project.
 * Complete reset to an empty state.
 *
 * Usage:
 *   npm run seed:clean
 *
 * WARNING: Only run against a development Supabase project, never production.
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

function log(msg: string) { console.log(`  ${msg}`); }
function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

async function deleteAllData() {
  section('Deleting all data');

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

async function main() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   Band of Blades — Clean Test Environment ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('\n⚠  This will DELETE all data and auth users.');

  await deleteAllData();
  await deleteAllAuthUsers();

  console.log('\n✓ Environment fully cleaned.\n');
}

main().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
