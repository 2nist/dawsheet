// Sync midi-iife.js into Apps Script html wrapper and optionally push via clasp
// Usage: node tools/sync-midi-iife.mjs [--push]
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = resolve(__dirname, '..');
const bundlePath = resolve(root, 'tools/midi-bundle/dist/midi-iife.js');
const gasHtmlPath = resolve(root, 'apps/gas/midi_iife.html');

async function run() {
  const js = await readFile(bundlePath, 'utf8');
  const wrapped = `<script>\n// --- BEGIN midi-iife.js (generated) ---\n${js}\n// --- END midi-iife.js ---\n</script>\n`;
  await writeFile(gasHtmlPath, wrapped, 'utf8');
  const push = process.argv.includes('--push');
  if (push) {
    await new Promise((resolveP, rejectP) => {
      const child = spawn(process.platform === 'win32' ? 'cmd' : 'bash', [process.platform === 'win32' ? '/c' : '-lc', 'cd apps/gas && clasp push'], { stdio: 'inherit' });
      child.on('exit', code => code === 0 ? resolveP() : rejectP(new Error(`clasp push failed: ${code}`)));
    });
  }
  console.log('Synced midi-iife.js into apps/gas/midi_iife.html' + (push ? ' and pushed.' : '.'));
}

run().catch(err => { console.error(err); process.exit(1); });
