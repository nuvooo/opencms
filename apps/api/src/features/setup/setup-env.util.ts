import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves the path to the API's `.env` file (the installer's own cwd).
 */
export const getEnvPath = (): string => join(process.cwd(), '.env');

/**
 * Parses a `.env` file body into a key/value map. Mirrors the (intentionally
 * small) subset of dotenv semantics used by {@link SetupEnvService}: `#`
 * comments and blank lines are ignored and surrounding double quotes are
 * stripped. Kept dependency-free so it can run in `main.ts` before Nest (and
 * therefore `@nestjs/config`) is bootstrapped.
 */
const parseEnvFile = (content: string): Map<string, string> => {
  const map = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
};

/**
 * Whether the first-run installer has already completed. The persisted
 * `SETUP_COMPLETE=true` flag in `.env` is the single source of truth so the
 * boot decision never depends on a reachable database.
 */
export const isSetupComplete = (envPath: string = getEnvPath()): boolean => {
  if (process.env.SETUP_COMPLETE === 'true') return true;
  if (!existsSync(envPath)) return false;
  return (
    parseEnvFile(readFileSync(envPath, 'utf-8')).get('SETUP_COMPLETE') ===
    'true'
  );
};

/**
 * Re-reads the `.env` file (written by the installer phase) into `process.env`,
 * overriding stale values, so the subsequently-created full application sees
 * the freshly chosen database configuration. `@nestjs/config` does not override
 * existing `process.env` entries, hence the explicit reload here.
 */
export const reloadEnv = (envPath: string = getEnvPath()): void => {
  if (!existsSync(envPath)) return;
  for (const [key, value] of parseEnvFile(readFileSync(envPath, 'utf-8'))) {
    process.env[key] = value;
  }
};
