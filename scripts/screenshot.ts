#!/usr/bin/env tsx
/**
 * Visual self-review screenshot tool for Claude Code.
 *
 * Usage:
 *   npx tsx scripts/screenshot.ts [path] [--output filename.png]
 *
 * Examples:
 *   npx tsx scripts/screenshot.ts /sign-in
 *   npx tsx scripts/screenshot.ts /dashboard/gm --output gm-dashboard.png
 *   npx tsx scripts/screenshot.ts                  (defaults to /)
 *
 * The script connects to the already-running dev or production server on
 * localhost:3000 (or BASE_URL env var), takes a full-page screenshot, and
 * saves it to screenshots/<filename>. Claude Code can then read the image
 * file to verify visual changes without asking the user.
 *
 * IMPORTANT: For self-review, always screenshot from a production build
 * (npm run build && PORT=3001 npm start) not just the dev server — the dev
 * server may serve fonts/CSS differently. Use BASE_URL=http://localhost:3001.
 *
 * If the dev server is not running, the script exits with a clear error.
 */

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUTPUT_DIR = resolve(process.cwd(), 'screenshots');

function parseArgs(): { path: string; output: string } {
  const args = process.argv.slice(2);
  let urlPath = '/';
  let output = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      output = args[++i];
    } else if (!args[i].startsWith('--')) {
      // On Windows with git bash, /sign-in may arrive as C:/Program Files/Git/sign-in.
      // Normalise: strip any Windows drive prefix and re-root as a URL path.
      let raw = args[i];
      const winDriveMatch = raw.match(/^[A-Za-z]:[/\\].*?([/\\].*)$/);
      if (winDriveMatch) {
        raw = winDriveMatch[1].replace(/\\/g, '/');
      }
      urlPath = raw.startsWith('/') ? raw : `/${raw}`;
    }
  }

  if (!output) {
    // Derive filename from path: /sign-in -> sign-in.png, / -> index.png
    const slug = urlPath === '/' ? 'index' : urlPath.replace(/^\//, '').replace(/\//g, '-');
    output = `${slug}.png`;
  }

  return { path: urlPath, output };
}

async function main() {
  const { path: urlPath, output } = parseArgs();
  const url = `${BASE_URL}${urlPath}`;
  const outputPath = resolve(OUTPUT_DIR, output);

  // Ensure the dev server is reachable before launching a browser
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error(`\nError: Dev server not reachable at ${url}`);
    console.error('Run "npm run dev" in a separate terminal first.\n');
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();

  console.log(`Screenshot saved: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
