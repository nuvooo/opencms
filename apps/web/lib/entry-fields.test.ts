import { describe, expect, it } from 'vitest';
import {
  buildActiveFields,
  initEnabledFromEntry,
  isFieldEnabled,
} from './entry-fields';

describe('isFieldEnabled', () => {
  it('returns true when the field is not in enabledFields (unknown)', () => {
    expect(isFieldEnabled({}, 'title')).toBe(true);
  });

  it('returns true when the field is explicitly set to true', () => {
    expect(isFieldEnabled({ title: true }, 'title')).toBe(true);
  });

  it('returns false only when the field is explicitly set to false', () => {
    expect(isFieldEnabled({ title: false }, 'title')).toBe(false);
  });

  it('returns true for a field not present even when other fields are false', () => {
    expect(isFieldEnabled({ other: false }, 'title')).toBe(true);
  });
});

describe('buildActiveFields', () => {
  const fields = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

  it('includes enabled fields and omits disabled ones', () => {
    const result = buildActiveFields(
      fields,
      { b: false },
      { a: 'x', b: 'y', c: 'z' },
    );
    expect(result).toEqual({ a: 'x', c: 'z' });
    expect('b' in result).toBe(false);
  });

  it('preserves an enabled-but-empty string field as empty string', () => {
    const result = buildActiveFields(fields, {}, { a: 'x', b: 'y', c: '' });
    expect(result['c']).toBe('');
  });

  it('fills in missing value as null for an enabled field', () => {
    const result = buildActiveFields(fields, {}, { a: 'x' });
    expect(result['b']).toBeNull();
    expect(result['c']).toBeNull();
  });

  it('returns empty object when all fields are disabled', () => {
    const result = buildActiveFields(
      fields,
      { a: false, b: false, c: false },
      { a: 'x', b: 'y', c: 'z' },
    );
    expect(result).toEqual({});
  });

  it('handles empty fields array', () => {
    expect(buildActiveFields([], {}, { a: 'x' })).toEqual({});
  });
});

describe('initEnabledFromEntry', () => {
  const fields = [{ name: 'title' }, { name: 'body' }, { name: 'draft' }];

  it('marks fields present in entryFields as true', () => {
    const result = initEnabledFromEntry(fields, { title: 'Hello', body: '' });
    expect(result['title']).toBe(true);
    expect(result['body']).toBe(true);
    expect(result['draft']).toBe(false);
  });

  it('treats null value as present (enabled)', () => {
    const result = initEnabledFromEntry(fields, { title: null });
    expect(result['title']).toBe(true);
  });

  it('treats zero as present (enabled)', () => {
    const result = initEnabledFromEntry(fields, { title: 0 });
    expect(result['title']).toBe(true);
  });

  it('treats false value as present (enabled)', () => {
    const result = initEnabledFromEntry(fields, { draft: false });
    expect(result['draft']).toBe(true);
  });

  it('handles null entryFields — all fields disabled', () => {
    const result = initEnabledFromEntry(fields, null);
    expect(result['title']).toBe(false);
    expect(result['body']).toBe(false);
    expect(result['draft']).toBe(false);
  });

  it('handles undefined entryFields — all fields disabled', () => {
    const result = initEnabledFromEntry(fields, undefined);
    expect(result['title']).toBe(false);
  });

  it('handles empty fields array', () => {
    expect(initEnabledFromEntry([], { title: 'x' })).toEqual({});
  });
});
