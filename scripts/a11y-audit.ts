#!/usr/bin/env tsx
/**
 * Accessibility audit script — runs axe-core on all app pages and
 * reports WCAG 2.1 AA violations.
 *
 * Usage:
 *   npx tsx scripts/a11y-audit.ts
 *
 * Requires the dev server to be running (BASE_URL env, defaults to localhost:3009).
 * Uses the axe-core already installed as a transitive dependency.
 */

import { chromium, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3009';

// Pages to audit (skip dashboard pages — require auth)
const PAGES_TO_AUDIT = [
  { path: '/sign-in', name: 'Sign-in' },
  { path: '/sign-up', name: 'Sign-up' },
];

// Path to the axe-core bundle already present in node_modules
const AXE_PATH = resolve(process.cwd(), 'node_modules/axe-core/axe.min.js');

interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    failureSummary: string;
  }>;
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  const axeSource = readFileSync(AXE_PATH, 'utf8');
  await page.addScriptTag({ content: axeSource });

  const results = await page.evaluate(async () => {
    // @ts-ignore — axe is injected at runtime
    const r = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        // WCAG 2.1 A + AA rules only
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    });
    return r.violations;
  });

  return results as AxeViolation[];
}

async function main() {
  let hasViolations = false;

  // Verify server is reachable
  try {
    await fetch(`${BASE_URL}/sign-in`, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`\nError: Dev server not reachable at ${BASE_URL}`);
    console.error('Run "PORT=3009 npm run dev" in a separate terminal first.\n');
    process.exit(1);
  }

  const browser = await chromium.launch();

  for (const { path, name } of PAGES_TO_AUDIT) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });

    console.log(`\n── ${name} (${path}) ─────────────────────────────`);
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });

    const violations = await runAxe(page);
    await page.close();

    if (violations.length === 0) {
      console.log('  ✓  No violations');
    } else {
      hasViolations = true;
      for (const v of violations) {
        console.log(`\n  ✗  [${v.impact?.toUpperCase()}] ${v.id}`);
        console.log(`     ${v.help}`);
        console.log(`     ${v.helpUrl}`);
        for (const node of v.nodes.slice(0, 3)) {
          console.log(`     Element: ${node.html.slice(0, 120)}`);
          console.log(`     Fix:     ${node.failureSummary?.split('\n')[0]}`);
        }
      }
    }

    // Also run a mobile-sized check
    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 812 },
    });
    console.log(`\n  (mobile 375px)`);
    await mobilePage.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    const mobileViolations = await runAxe(mobilePage);
    await mobilePage.close();

    if (mobileViolations.length === 0) {
      console.log('  ✓  No violations');
    } else {
      // Only report violations unique to mobile (not already shown above)
      const desktopIds = new Set(violations.map((v) => v.id));
      const mobileOnly = mobileViolations.filter((v) => !desktopIds.has(v.id));
      if (mobileOnly.length === 0) {
        console.log('  ✓  Same violations as desktop (already reported)');
      } else {
        hasViolations = true;
        for (const v of mobileOnly) {
          console.log(`\n  ✗  [${v.impact?.toUpperCase()}] ${v.id} (mobile only)`);
          console.log(`     ${v.help}`);
        }
      }
    }
  }

  await browser.close();

  console.log('\n─────────────────────────────────────────────────');
  if (hasViolations) {
    console.log('RESULT: violations found — fix before marking for review\n');
    process.exit(1);
  } else {
    console.log('RESULT: all pages pass WCAG 2.1 AA ✓\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
