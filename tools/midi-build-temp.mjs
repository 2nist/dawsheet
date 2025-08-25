// Build the MIDI IIFE bundle in a temp directory to avoid sync-drive (OneDrive/Google Drive) locking on Windows
// Usage: node tools/midi-build-temp.mjs
import { cp, mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const srcDir = resolve(repoRoot, 'tools/midi-bundle');
const dstDirDist = resolve(srcDir, 'dist');

async function runCmd(cmd, args, cwd) {
  await new Promise((resolveP, rejectP) => {
    const shell = process.platform === 'win32' ? 'cmd' : 'bash';
    const shellArgs = process.platform === 'win32' ? ['/c', [cmd, ...args].join(' ')] : ['-lc', [cmd, ...args].join(' ')];
    const child = spawn(shell, shellArgs, { cwd, stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolveP() : rejectP(new Error(`${cmd} failed with code ${code}`)));
  });
}

async function ensureDir(p) {
  try { await mkdir(p, { recursive: true }); } catch {}
}

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main(){
  const tmpRoot = tmpdir();
  const workDir = join(tmpRoot, `dawsheet-midi-bundle-${Date.now()}`);
  await ensureDir(workDir);
  console.log('[midi-build-temp] Copying bundler to temp:', workDir);
  await cp(srcDir, workDir, { recursive: true, force: true, filter: (src) => !/node_modules[\\/]/i.test(src) });

  console.log('[midi-build-temp] Installing deps in temp...');
  await runCmd('npm', ['ci', '--no-audit', '--no-fund'], workDir).catch(async () => {
    // Fallback to npm i on environments where package-lock is absent
    await runCmd('npm', ['i', '--no-audit', '--no-fund'], workDir);
  });

  console.log('[midi-build-temp] Building...');
  await runCmd('npm', ['run', 'build'], workDir);

  const builtPath = resolve(workDir, 'dist/midi-iife.js');
  if (!await fileExists(builtPath)) throw new Error('Build did not produce dist/midi-iife.js');

  await ensureDir(dstDirDist);
  const outPath = resolve(dstDirDist, 'midi-iife.js');
  const js = await readFile(builtPath, 'utf8');
  await writeFile(outPath, js, 'utf8');
  console.log('[midi-build-temp] Copied artifact to', outPath);

  console.log('[midi-build-temp] Cleaning up temp...');
  await rm(workDir, { recursive: true, force: true }).catch(() => {});
}

main().catch(err => { console.error(err); process.exit(1); });
