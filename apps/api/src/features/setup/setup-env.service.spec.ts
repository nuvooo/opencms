import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SetupEnvService } from './setup-env.service';

describe('SetupEnvService', () => {
  it('updates only allowlisted keys and preserves unknown keys', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');
    writeFileSync(
      envPath,
      'ALLOW_CORS_URL=http://old\nDB_HOST=old-host\nKEEP_ME=1\n',
      'utf-8',
    );

    const service = new SetupEnvService(envPath);
    service.writeAllowlisted({
      ALLOW_CORS_URL: 'http://localhost:3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'password',
      DB_NAME: 'cms',
      DB_SSL: 'false',
      AUTH_SECRET: 'secret123456',
      AUTH_URL: 'http://localhost:3000',
    });

    const updated = readFileSync(envPath, 'utf-8');
    expect(updated).toContain('ALLOW_CORS_URL=http://localhost:3000');
    expect(updated).toContain('DB_HOST=localhost');
    expect(updated).toContain('KEEP_ME=1');

    rmSync(root, { recursive: true, force: true });
  });

  it('creates a .env.bak backup before replacing .env', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');
    writeFileSync(envPath, 'DB_HOST=old\n', 'utf-8');

    const service = new SetupEnvService(envPath);
    service.writeAllowlisted({ DB_HOST: 'new-host' });

    const backup = readFileSync(join(root, '.env.bak'), 'utf-8');
    expect(backup).toContain('DB_HOST=old');

    rmSync(root, { recursive: true, force: true });
  });

  it('creates .env when absent and does not create a backup', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');

    const service = new SetupEnvService(envPath);
    service.writeAllowlisted({ DB_HOST: 'localhost' });

    const created = readFileSync(envPath, 'utf-8');
    expect(created).toContain('DB_HOST=localhost');

    const backupPath = join(root, '.env.bak');
    expect(() => readFileSync(backupPath, 'utf-8')).toThrow();

    rmSync(root, { recursive: true, force: true });
  });

  it('serializes and reads back values with spaces, hashes, quotes, and newlines', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-env-'));
    const envPath = join(root, '.env');

    const service = new SetupEnvService(envPath);
    const specialValue = 'line one\nline "two" with # hash and spaces';

    service.writeAllowlisted({ DB_PASSWORD: specialValue });
    const written = readFileSync(envPath, 'utf-8');
    expect(written).toContain(
      'DB_PASSWORD="line one\\nline \\\"two\\\" with # hash and spaces"',
    );

    service.writeAllowlisted({ DB_HOST: 'localhost' });
    const rewritten = readFileSync(envPath, 'utf-8');
    expect(rewritten).toContain(
      'DB_PASSWORD="line one\\nline \\\"two\\\" with # hash and spaces"',
    );
    expect(rewritten).toContain('DB_HOST=localhost');

    rmSync(root, { recursive: true, force: true });
  });
});
