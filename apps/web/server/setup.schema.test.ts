import { describe, expect, it } from 'vitest';
import { ValidateDbResponseSchema } from './setup.schema';

// Regression: the API's POST /setup/validate-db returns `{ ok: true }`.
// The web action previously validated against {message} | {initialized,inProgress}
// which never matched, throwing a Zod union error on every validation.
describe('ValidateDbResponseSchema', () => {
  it('accepts the API validate-db response shape { ok: true }', () => {
    expect(ValidateDbResponseSchema.parse({ ok: true })).toEqual({ ok: true });
  });
});
