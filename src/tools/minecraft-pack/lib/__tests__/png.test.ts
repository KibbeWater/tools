import { describe, expect, test } from 'vitest';
import { isPng, stripPngMetadata } from '../png';
import { chunk, decodeRgba, fixture, makePng, makePngWithMetadata, pngChunks, textChunk, withExtraChunks } from './testkit';

const types = (bytes: Uint8Array) => pngChunks(bytes).map((c) => c.type);
const ancillary = (bytes: Uint8Array) => types(bytes).filter((t) => t[0] === t[0]!.toLowerCase());

describe('stripPngMetadata', () => {
  test('drops text, time, gamma and pixel-size chunks', () => {
    const input = makePngWithMetadata(8, 4);
    expect(ancillary(input)).toEqual(['tEXt', 'tEXt', 'tIME', 'gAMA', 'pHYs']);
    const out = stripPngMetadata(input);
    expect(ancillary(out)).toEqual([]);
    expect(types(out)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(new TextDecoder('latin1').decode(out)).not.toContain('Jane Private');
  });

  test('keeps every remaining chunk byte for byte, so CRCs stay valid', () => {
    const out = stripPngMetadata(makePngWithMetadata(8, 4));
    expect(pngChunks(out).every((c) => c.crcOk)).toBe(true);
  });

  test('leaves the pixels untouched', () => {
    const input = makePngWithMetadata(33, 17);
    expect(decodeRgba(stripPngMetadata(input))).toEqual(decodeRgba(input));
  });

  test('returns an already clean PNG as the same bytes', () => {
    const clean = makePng(8, 8);
    expect(stripPngMetadata(clean)).toBe(clean);
  });

  test('drops data hidden after IEND', () => {
    const png = makePng(4, 4);
    const out = stripPngMetadata(withExtraChunks(png, [], new TextEncoder().encode('PK\u0003\u0004 secret zip')));
    expect(out).toEqual(png);
  });

  test('drops animation chunks, leaving the still default image', () => {
    const png = makePng(4, 4);
    const input = withExtraChunks(png, [chunk('acTL', new Uint8Array(8)), chunk('fcTL', new Uint8Array(26))]);
    const out = stripPngMetadata(input);
    expect(types(out)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(decodeRgba(out)).toEqual(decodeRgba(png));
  });

  test('keeps unknown critical chunks rather than guess', () => {
    const input = withExtraChunks(makePng(4, 4), [chunk('XYZW', new Uint8Array([1, 2])), textChunk('a', 'b')]);
    expect(types(stripPngMetadata(input))).toEqual(['IHDR', 'XYZW', 'IDAT', 'IEND']);
  });

  test('leaves anything that is not a whole PNG alone', () => {
    const notPng = new TextEncoder().encode('{"not":"a png"}');
    expect(stripPngMetadata(notPng)).toBe(notPng);
    const truncated = makePngWithMetadata(8, 8).subarray(0, 60);
    expect(stripPngMetadata(truncated)).toBe(truncated);
    const noEnd = makePngWithMetadata(8, 8);
    const withoutIend = noEnd.subarray(0, noEnd.length - 12);
    expect(stripPngMetadata(withoutIend)).toBe(withoutIend);
    expect(isPng(new Uint8Array())).toBe(false);
  });

  // Real files from an image library (PIL), with text, iTXt, zTXt, iCCP, eXIf and pHYs.
  describe.each([
    ['rgba-meta.png'],
    ['palette-trns-meta.png'],
    ['rgb-trns-meta.png'],
    ['gray16-meta.png'],
    ['la-meta.png'],
  ])('%s', (name) => {
    const input = fixture(name);

    test('had metadata to begin with', () => {
      expect(ancillary(input).filter((t) => t !== 'tRNS').length).toBeGreaterThan(0);
    });

    test('decodes to the same pixels after stripping', () => {
      expect(decodeRgba(stripPngMetadata(input))).toEqual(decodeRgba(input));
    });

    test('keeps only critical chunks and tRNS', () => {
      const out = stripPngMetadata(input);
      expect(ancillary(out).every((t) => t === 'tRNS')).toBe(true);
      expect(ancillary(out).length).toBe(ancillary(input).filter((t) => t === 'tRNS').length);
      expect(pngChunks(out).every((c) => c.crcOk)).toBe(true);
    });
  });

  test('keeps transparency on palette images', () => {
    const out = stripPngMetadata(fixture('palette-trns-meta.png'));
    expect(types(out)).toContain('PLTE');
    expect(types(out)).toContain('tRNS');
    expect([...decodeRgba(out).data].some((v, i) => i % 4 === 3 && v < 255)).toBe(true);
  });
});
