import { describe, it, expect } from 'vitest';
import { FANCY_STYLES } from '../lib/fancyStyles';
import {
  textToHtmlEntities,
  htmlEntitiesToText,
  textToBase64,
  base64ToText,
  textToUrlEncoding,
  urlEncodingToText,
} from '../lib/encoders';

describe('Fancy Text Transformations', () => {
  it('has at least 15 styles configured', () => {
    expect(FANCY_STYLES.length).toBeGreaterThanOrEqual(15);
  });

  it('transforms bold, italic, and double struck styles properly', () => {
    const bold = FANCY_STYLES.find(s => s.id === 'bold')!;
    expect(bold.transform('Hello 123')).toBe('𝐇𝐞𝐥𝐥𝐨 𝟏𝟐𝟑');

    const italic = FANCY_STYLES.find(s => s.id === 'italic')!;
    expect(italic.transform('Hello')).toBe('𝐻𝑒𝑙𝑙𝑜');

    const doubleStruck = FANCY_STYLES.find(s => s.id === 'double-struck')!;
    expect(doubleStruck.transform('ABC')).toBe('𝔸𝔹ℂ');

    const monospace = FANCY_STYLES.find(s => s.id === 'monospace')!;
    expect(monospace.transform('Code')).toBe('𝙲𝚘𝚍𝚎');
  });

  it('handles small caps, circled, and inverted', () => {
    const smallCaps = FANCY_STYLES.find(s => s.id === 'small-caps')!;
    expect(smallCaps.transform('hello')).toBe('ʜᴇʟʟᴏ');

    const circled = FANCY_STYLES.find(s => s.id === 'circled')!;
    expect(circled.transform('ABC 123')).toBe('ⒶⒷⒸ ①②③');

    const inverted = FANCY_STYLES.find(s => s.id === 'inverted')!;
    expect(inverted.transform('hello')).toBe('oןןǝɥ');
  });
});

describe('Web Encoders (HTML, Base64, URL)', () => {
  describe('HTML Entities', () => {
    it('encodes and decodes HTML entities', () => {
      const original = '<div class="test">© Café</div>';
      const encoded = textToHtmlEntities(original, 'hex');
      expect(encoded).toContain('&lt;');
      expect(encoded).toContain('&gt;');
      expect(encoded).toContain('&quot;');
      expect(encoded).toContain('&#xA9;'); // ©

      const decoded = htmlEntitiesToText(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe('Base64 Encoding', () => {
    it('encodes and decodes UTF-8 text with emojis to Base64', () => {
      const text = 'Hello 🚀 World! 👩🏽‍💻';
      const b64 = textToBase64(text);
      const decoded = base64ToText(b64);
      expect(decoded.text).toBe(text);
    });
  });

  describe('URL Percent-Encoding', () => {
    it('encodes and decodes URL strings', () => {
      const text = 'https://example.com/search?q=Unicode & ASCII 🚀';
      const encoded = textToUrlEncoding(text);
      const decoded = urlEncodingToText(encoded);
      expect(decoded.text).toBe(text);
    });
  });
});
