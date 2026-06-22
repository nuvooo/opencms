import { Injectable, Optional } from '@nestjs/common';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { SETUP_ENV_ALLOWLIST, type SetupEnvKey } from './setup.constants';

@Injectable()
export class SetupEnvService {
  constructor(
    @Optional() private readonly envPath: string = join(process.cwd(), '.env'),
  ) {}

  writeAllowlisted(values: Partial<Record<SetupEnvKey, string>>): void {
    const current = existsSync(this.envPath)
      ? readFileSync(this.envPath, 'utf-8')
      : '';
    const parsed = this.parseEnv(current);

    for (const key of SETUP_ENV_ALLOWLIST) {
      const incoming = values[key];
      if (typeof incoming === 'string') {
        parsed.set(key, incoming);
      }
    }

    const serialized = Array.from(parsed.entries())
      .map(([k, v]) => `${k}=${this.serializeEnvValue(v)}`)
      .join('\n')
      .concat('\n');

    const dir = dirname(this.envPath);
    const tmpPath = join(
      dir,
      `.env.tmp.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`,
    );
    const backupPath = join(dir, '.env.bak');

    if (existsSync(this.envPath)) {
      copyFileSync(this.envPath, backupPath);
    }

    writeFileSync(tmpPath, serialized, 'utf-8');
    renameSync(tmpPath, this.envPath);
  }

  private parseEnv(content: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      map.set(key, this.parseEnvValue(rawValue));
    }
    return map;
  }

  private parseEnvValue(raw: string): string {
    if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
      const inner = raw.slice(1, -1);
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    return raw;
  }

  private serializeEnvValue(value: string): string {
    const shouldQuote =
      value.length === 0 || /^\s|\s$/.test(value) || /[\s#"\n\r\t]/.test(value);

    if (!shouldQuote) {
      return value;
    }

    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/"/g, '\\"');

    return `"${escaped}"`;
  }
}
