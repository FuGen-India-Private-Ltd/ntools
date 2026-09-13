import { describe, it, expect } from 'vitest';
import {
  textToAscii,
  asciiToText,
  findNonAsciiCharacters,
  transliterateToAscii,
  getAsciiTable,
} from '../lib/ascii';

describe('ASCII Conversion Engine', () => {
  describe('Text to ASCII Conversion', () => {
    it('converts ASCII text to decimal numbers correctly', () => {
      const res = textToAscii('Hello');
      expect(res.output).toBe('72 101 108 108 111');
      expect(res.hasNonAscii).toBe(false);
      expect(res.asciiCount).toBe(5);
    });

    it('converts to Hex, Binary, and Octal formats', () => {
      const hexRes = textToAscii('ABC', { format: 'hex' });
      expect(hexRes.output).toBe('41 42 43');

      const binRes = textToAscii('A', { format: 'bin' });
      expect(binRes.output).toBe('01000001');

      const octRes = textToAscii('A', { format: 'oct' });
      expect(octRes.output).toBe('101');
    });

    it('respects delimiters', () => {
      const commaRes = textToAscii('AB', { delimiter: 'comma-space' });
      expect(commaRes.output).toBe('65, 66');

      const newlineRes = textToAscii('AB', { delimiter: 'newline' });
      expect(newlineRes.output).toBe('65\n66');
    });
  });

  describe('Non-ASCII Detection & Transliteration', () => {
    it('flags non-ASCII characters accurately (e.g. Café, ña, €)', () => {
      const nonAscii = findNonAsciiCharacters('Café €50');
      expect(nonAscii.length).toBe(2);
      expect(nonAscii[0].char).toBe('é');
      expect(nonAscii[0].codePoint).toBe(233);
      expect(nonAscii[1].char).toBe('€');
      expect(nonAscii[1].codePoint).toBe(0x20AC);
    });

    it('transliterates accented characters to close ASCII matches', () => {
      expect(transliterateToAscii('Café Niño!')).toBe('Cafe Nino!');
      expect(transliterateToAscii('“Smart quotes” — dashes & €100')).toBe('"Smart quotes" -- dashes & EUR100');
    });

    it('replaces or escapes non-ASCII characters in modes', () => {
      const replaceRes = textToAscii('Hi 🚀', { nonAsciiMode: 'replace', replacementChar: '?' });
      expect(replaceRes.hasNonAscii).toBe(true);

      const translitRes = textToAscii('Café', { nonAsciiMode: 'transliterate' });
      expect(translitRes.output).toBe('67 97 102 101'); // C a f e
    });
  });

  describe('ASCII to Text Decoding', () => {
    it('decodes decimal ASCII numbers to text', () => {
      const res = asciiToText('72 101 108 108 111');
      expect(res.text).toBe('Hello');
      expect(res.hasErrors).toBe(false);
    });

    it('decodes hex ASCII tokens', () => {
      const res = asciiToText('0x48 0x65 0x6C 0x6C 0x6F', 'hex');
      expect(res.text).toBe('Hello');
    });

    it('decodes binary ASCII tokens', () => {
      const res = asciiToText('01001000 01101001', 'bin');
      expect(res.text).toBe('Hi');
    });

    it('warns when values exceed 127', () => {
      const res = asciiToText('65 200 66', 'dec');
      expect(res.hasErrors).toBe(true);
      expect(res.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('ASCII Table', () => {
    it('generates a full 128-character table from 0 to 127', () => {
      const table = getAsciiTable();
      expect(table.length).toBe(128);
      expect(table[0].dec).toBe(0);
      expect(table[0].isControl).toBe(true);
      expect(table[65].char).toBe('A');
      expect(table[65].hex).toBe('41');
      expect(table[127].dec).toBe(127);
    });
  });
});
