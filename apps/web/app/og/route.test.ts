import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

// The route fetches its font via `fetch(new URL('./mono.ttf', import.meta.url))`.
// Under Vitest that URL resolves against the dev-server origin, which is not
// available in CI. Stub `fetch` to return the real font bytes from disk so the
// test is independent of any running server.
const fontData = readFileSync(join(process.cwd(), 'app', 'og', 'mono.ttf'));

describe('OG Image Route', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        arrayBuffer: async () =>
          fontData.buffer.slice(
            fontData.byteOffset,
            fontData.byteOffset + fontData.byteLength,
          ),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Returns a valid ImageResponse', async () => {
    const url = new URL(
      'http://localhost/api/og?title=Test+Title&description=Test+Desc',
    );
    const req = {
      nextUrl: url,
    } as unknown as NextRequest;

    const res = await GET(req);

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
