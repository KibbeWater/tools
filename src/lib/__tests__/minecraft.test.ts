import { describe, expect, test } from 'vitest';
import { commandsAcross, dataRange, getRelease, MC_RELEASES, packMeta, rangeForPackMeta, rangeLabel } from '../minecraft';

const range = (from: string, to: string) => ({ from: getRelease(from), to: getRelease(to) });

describe('packMeta', () => {
  test('one old version writes only pack_format', () => {
    expect(packMeta(range('1.19.4', '1.19.4'), 'resource', 'd')).toEqual({ description: 'd', pack_format: 13 });
  });

  test('one new version writes only min_format and max_format', () => {
    expect(packMeta(range('26.3', '26.3'), 'resource', 'd')).toEqual({ description: 'd', min_format: [97, 1], max_format: [97, 1] });
  });

  test('an old range that never reaches 1.20.2 can only name one format', () => {
    expect(packMeta(range('1.16 – 1.16.1', '1.19.4'), 'resource', 'd')).toEqual({ description: 'd', pack_format: 5 });
  });

  test('a range reaching 1.20.2 adds supported_formats', () => {
    expect(packMeta(range('1.16 – 1.16.1', '1.20.3 – 1.20.4'), 'resource', 'd')).toEqual({
      description: 'd',
      pack_format: 5,
      supported_formats: [5, 22],
    });
  });

  test('a range across 1.21.9 writes every generation of fields', () => {
    expect(packMeta(range('1.20 – 1.20.1', '1.21.11'), 'resource', 'd')).toEqual({
      description: 'd',
      pack_format: 15,
      supported_formats: [15, 75],
      min_format: 15,
      max_format: [75, 0],
    });
  });

  test('datapacks use their own threshold (82)', () => {
    // 1.21.9's data format is 88, so the whole range is on the new fields.
    expect(packMeta(range('1.21.9 – 1.21.10', '26.3'), 'data', 'd')).toEqual({ description: 'd', min_format: [88, 0], max_format: [121, 0] });
    expect(packMeta(range('1.21.7 – 1.21.8', '1.21.9 – 1.21.10'), 'data', 'd')).toEqual({
      description: 'd',
      pack_format: 81,
      supported_formats: [81, 88],
      min_format: 81,
      max_format: [88, 0],
    });
  });
});

describe('rangeForPackMeta', () => {
  test('reads each generation of fields back to the range that wrote them', () => {
    for (const [from, to] of [
      ['1.19.4', '1.19.4'],
      ['1.16 – 1.16.1', '1.20.3 – 1.20.4'],
      ['1.20 – 1.20.1', '1.21.11'],
      ['1.21.9 – 1.21.10', '26.3'],
    ] as const) {
      const r = rangeForPackMeta(packMeta(range(from, to), 'resource', ''));
      expect([r.from.id, r.to.id]).toEqual([from, to]);
    }
  });

  test('accepts the object form of supported_formats', () => {
    const r = rangeForPackMeta({ pack_format: 18, supported_formats: { min_inclusive: 18, max_inclusive: 34 } });
    expect([r.from.id, r.to.id]).toEqual(['1.20.2', '1.21 – 1.21.1']);
  });
});

describe('ranges', () => {
  test('dataRange starts at 1.21, or is null when the range never gets there', () => {
    expect(dataRange(range('1.20 – 1.20.1', '1.21.4'))?.from.id).toBe('1.21 – 1.21.1');
    expect(dataRange(range('1.16 – 1.16.1', '1.20.5 – 1.20.6'))).toBeNull();
  });

  test('rangeLabel joins the outer versions', () => {
    expect(rangeLabel(range('1.20 – 1.20.1', '1.21.4'))).toBe('1.20 – 1.21.4');
    expect(rangeLabel(range('1.21.4', '1.21.4'))).toBe('1.21.4');
  });

  test('commandsAcross splits only when the range spans the change', () => {
    const make = (v: { id: string }) => v.id;
    expect(commandsAcross(range('1.21.5', '26.3'), '1.21.5', MC_RELEASES, make)).toEqual([{ versions: null, command: '26.3' }]);
    expect(commandsAcross(range('1.21 – 1.21.1', '26.3'), '1.21.5', MC_RELEASES, make)).toEqual([
      { versions: '1.21.5 – 26.3', command: '26.3' },
      { versions: '1.21 – 1.21.4', command: '1.21.4' },
    ]);
  });
});
