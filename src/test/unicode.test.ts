import { describe, it, expect } from 'vitest';
import {
  textToUnicode,
  unicodeToText,
  textToEncodings,
  inspectCharacter,
  computeTextMetrics,
  segmentGraphemes,
  getCodePoints,
} from '../lib/unicode';

describe('Unicode Conversion Engine', () => {
  describe('Basic ASCII & Empty String handling', () => {
    it('handles empty input gracefully', () => {
      expect(textToUnicode('')).toBe('');
      expect(unicodeToText('')).toEqual({ text: '', codePoints: [], warnings: [] });
      expect(computeTextMetrics('')).toEqual({
        charCount: 0,
        codePointCount: 0,
        graphemeCount: 0,
        utf8ByteCount: 0,
        nonAsciiCount: 0,
        hasSurrogatePairs: false,
        hasCombiningMarks: false,
      });
    });

    it('converts ASCII text to U+ code points correctly', () => {
      const result = textToUnicode('ABC');
      expect(result).toBe('U+0041 U+0042 U+0043');
    });

    it('respects formatting options (prefix, base, delimiter, uppercase)', () => {
      expect(textToUnicode('AB', { prefix: '\\u', delimiter: 'comma' })).toBe('\\u0041,\\u0042');
      expect(textToUnicode('AB', { prefix: '0x', delimiter: 'comma-space' })).toBe('0x0041, 0x0042');
      expect(textToUnicode('AB', { base: 'dec', delimiter: 'space' })).toBe('65 66');
      expect(textToUnicode('AB', { base: 'bin', delimiter: 'space' })).toBe('01000001 01000010');
      expect(textToUnicode('ab', { prefix: 'none', uppercase: false })).toBe('0061 0062');
    });
  });

  describe('Astral Plane & Emoji Handling (Surrogate Pairs)', () => {
    it('correctly calculates code points for supplementary plane emojis (e.g. 🚀 U+1F680)', () => {
      const text = '🚀';
      const codePoints = getCodePoints(text);
      expect(codePoints).toEqual([0x1F680]);
      expect(textToUnicode(text)).toBe('U+1F680');
      expect(text.length).toBe(2); // 2 UTF-16 code units (surrogate pair)
      expect(codePoints.length).toBe(1); // 1 scalar value
    });

    it('segments multi-character graphemes and emojis correctly', () => {
      const text = '👨‍👩‍👧‍👦';
      const graphemes = segmentGraphemes(text);
      expect(graphemes.length).toBe(1);

      const metrics = computeTextMetrics(text);
      expect(metrics.graphemeCount).toBe(1);
      expect(metrics.hasSurrogatePairs).toBe(true);
    });

    it('encodes UTF-8 and UTF-16 bytes accurately for emojis', () => {
      const enc = textToEncodings('🚀');
      expect(enc.utf8.hex).toBe('F0 9F 9A 80');
      expect(enc.utf8.bytes).toEqual([0xF0, 0x9F, 0x9A, 0x80]);
      expect(enc.utf16.hex).toBe('\\uD83D \\uDE80');
      expect(enc.utf16.hasSurrogates).toBe(true);
      expect(enc.utf32.hex).toBe('0x0001F680');
    });
  });

  describe('Combining Characters & Diacritics', () => {
    it('handles combining diacritical marks', () => {
      const combining = 'e\u0301';
      const graphemes = segmentGraphemes(combining);
      expect(graphemes.length).toBe(1);

      const cps = getCodePoints(combining);
      expect(cps).toEqual([0x0065, 0x0301]);

      const metrics = computeTextMetrics(combining);
      expect(metrics.hasCombiningMarks).toBe(true);
      expect(metrics.nonAsciiCount).toBe(1);
    });
  });

  describe('Unicode to Text Parsing', () => {
    it('parses U+ prefixed hex code points', () => {
      const res = unicodeToText('U+0048 U+0065 U+006C U+006C U+006F');
      expect(res.text).toBe('Hello');
      expect(res.error).toBeUndefined();
    });

    it('parses \\u and \\u{} escape sequences', () => {
      const res = unicodeToText('\\u0048\\u0069\\u0020\\u{1F600}');
      expect(res.text).toBe('Hi 😀');
    });

    it('parses 0x hex and comma separated values', () => {
      const res = unicodeToText('0x41, 0x42, 0x43');
      expect(res.text).toBe('ABC');
    });

    it('parses HTML numeric entities', () => {
      const res1 = unicodeToText('&#65; &#66; &#67;');
      expect(res1.text).toBe('ABC');

      const res2 = unicodeToText('&#x1F680;');
      expect(res2.text).toBe('🚀');
    });

    it('flags invalid code points and returns warning without crashing', () => {
      const res = unicodeToText('U+0041 U+FFFFFF U+0042');
      expect(res.text).toBe('AB');
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('handles malformed string gracefully', () => {
      const res = unicodeToText('zzzz invalid gibberish $$$');
      expect(res.error).toBeDefined();
    });
  });

  describe('Character Inspector', () => {
    it('inspects ASCII characters properly', () => {
      const info = inspectCharacter('A');
      expect(info.codePoint).toBe(65);
      expect(info.hex).toBe('U+0041');
      expect(info.name).toBe('LATIN CAPITAL LETTER A');
      expect(info.block).toBe('Basic Latin (ASCII)');
      expect(info.category).toBe('Lu');
      expect(info.isAscii).toBe(true);
      expect(info.isSurrogatePair).toBe(false);
    });

    it('inspects Astral Emoji characters properly', () => {
      const info = inspectCharacter('🚀');
      expect(info.codePoint).toBe(0x1F680);
      expect(info.hex).toBe('U+1F680');
      expect(info.isAscii).toBe(false);
      expect(info.isSurrogatePair).toBe(true);
      expect(info.highSurrogate).toBe('U+D83D');
      expect(info.lowSurrogate).toBe('U+DE80');
      expect(info.utf8BytesHex).toEqual(['F0', '9F', '9A', '80']);
    });
  });
});
