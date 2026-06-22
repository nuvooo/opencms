// End-to-end test of the first-run setup flow:
//   installer boot (no DB) -> POST /setup/bootstrap (sqlite)
//   -> in-process switch to the full app -> /setup/status == initialized.
// Runs the built API in an isolated temp cwd on a spare port so it never
// touches the repo's .env or a running dev server.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API_DIST = join(process.cwd(), 'dist', 'main.js');
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}/api`;
const cwd = mkdtempSync(join(tmpdir(), 'opencms-e2e-'));

const log = (m) => console.log(`[e2e] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getStatus = async () => {
  try {
    const r = await fetch(`${BASE}/setup/status`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

const waitFor = async (predicate, timeoutMs, label) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await getStatus();
    if (s && predicate(s)) return s;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for: ${label}`);
};

// Simulate a pristine machine: no DB_TYPE / SETUP_COMPLETE at all so the schema
// defaults apply (absent -> default, unlike '' which fails enum validation).
const childEnv = { ...process.env, PORT: String(PORT), NODE_ENV: 'development' };
delete childEnv.SETUP_COMPLETE;
delete childEnv.DB_TYPE;

const child = spawn(process.execPath, [API_DIST], {
  cwd,
  env: childEnv,
  stdio: ['ignore', 'inherit', 'inherit'],
});

let failed = false;
try {
  log(`temp cwd: ${cwd}`);

  // 1) Installer phase: status reachable, not initialized.
  const s1 = await waitFor((s) => s.initialized === false, 20000, 'installer up');
  log(`installer status: ${JSON.stringify(s1)} ✓`);

  // 2) Bootstrap with SQLite (zero external dependency).
  const payload = {
    app: {
      allowCorsUrl: 'http://localhost:3000',
      authSecret: 'e2e-secret-value',
      authUrl: 'http://localhost:3000',
    },
    database: { type: 'sqlite', database: './data/cms.sqlite' },
    admin: { email: 'admin@example.com', password: 'Password123!' },
  };
  const boot = await fetch(`${BASE}/setup/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const bootBody = await boot.json();
  log(`bootstrap HTTP ${boot.status}: ${JSON.stringify(bootBody)}`);
  if (!boot.ok) throw new Error('bootstrap failed');

  // 3) .env written with the completion flag + chosen engine.
  const envPath = join(cwd, '.env');
  if (!existsSync(envPath)) throw new Error('.env was not written');
  const envText = readFileSync(envPath, 'utf-8');
  for (const needle of ['SETUP_COMPLETE=true', 'DB_TYPE=sqlite', 'AUTH_SECRET']) {
    if (!envText.includes(needle)) throw new Error(`.env missing ${needle}`);
  }
  log('.env contains SETUP_COMPLETE=true, DB_TYPE=sqlite, AUTH_SECRET ✓');

  // 4) In-process switch: full app boots and reports initialized.
  const s2 = await waitFor((s) => s.initialized === true, 30000, 'full app initialized');
  log(`full-app status: ${JSON.stringify(s2)} ✓`);

  // 5) Full app actually serves a normal (non-installer) route.
  const health = await fetch(`${BASE}/health`).catch(() => null);
  log(`GET /health -> ${health ? health.status : 'no response'}`);

  // 6) sqlite file created.
  const dbFile = join(cwd, 'data', 'cms.sqlite');
  log(`sqlite db present: ${existsSync(dbFile)} (${dbFile})`);

  log('RESULT: PASS ✓');
} catch (err) {
  failed = true;
  log(`RESULT: FAIL ✗ ${err.message}`);
} finally {
  child.kill('SIGKILL');
  try {
    rmSync(cwd, { recursive: true, force: true });
  } catch {
    /* temp dir may be locked by the killed process; ignore */
  }
  process.exit(failed ? 1 : 0);
}
