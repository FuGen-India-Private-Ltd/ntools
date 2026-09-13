import { describe, it, expect } from 'vitest';
import {
  kannadaAsciiToUnicode,
  kannadaUnicodeToAscii,
  shreeLipiToUnicode,
  detectKannadaFont,
  convertKannadaText,
} from '../lib/kannadaConverter';

describe('Comprehensive Multi-Font Kannada Converter & Engine Suite', () => {
  describe('Nudi / Baraha ASCII ⇄ Unicode Conversion', () => {
    it('converts independent vowels accurately', () => {
      const ascii = 'C D E F G H IÄ J K L M N O CA CB';
      const unicode = 'ಅ ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ ಅಂ ಅಃ';
      expect(kannadaAsciiToUnicode(ascii)).toBe(unicode);
      expect(kannadaUnicodeToAscii(unicode)).toBe(ascii);
    });

    it('converts complex conjuncts: "ಕನ್ನಡ" (PÀ£ÀßqÀ)', () => {
      expect(kannadaAsciiToUnicode('PÀ£ÀßqÀ')).toBe('ಕನ್ನಡ');
      expect(kannadaUnicodeToAscii('ಕನ್ನಡ')).toBe('PÀ£ÀßqÀ');
    });

    it('converts "ನಮಸ್ಕಾರ" (£ÀªÀÄ¸ÁÌgÀ)', () => {
      expect(kannadaAsciiToUnicode('£ÀªÀÄ¸ÁÌgÀ')).toBe('ನಮಸ್ಕಾರ');
      expect(kannadaUnicodeToAscii('ನಮಸ್ಕಾರ')).toBe('£ÀªÀÄ¸ÁÌgÀ');
    });

    it('converts "ತಿಮ್ಮಿ" (w«Ää)', () => {
      expect(kannadaAsciiToUnicode('w«Ää')).toBe('ತಿಮ್ಮಿ');
      expect(kannadaUnicodeToAscii('ತಿಮ್ಮಿ')).toBe('w«Ää');
    });

    it('converts Arkavattu: "ಕರ್ನಾಟಕ" (PÀ£ÁðlPÀ)', () => {
      expect(kannadaAsciiToUnicode('PÀ£ÁðlPÀ')).toBe('ಕರ್ನಾಟಕ');
      expect(kannadaUnicodeToAscii('ಕರ್ನಾಟಕ')).toBe('PÀ£ÁðlPÀ');
    });

    it('converts long vowel signs: "ಕೋಟಿ" (PÉÆÃn) and "ಬೇಟೆ" (¨ÉÃmÉ)', () => {
      expect(kannadaAsciiToUnicode('PÉÆÃn')).toBe('ಕೋಟಿ');
      expect(kannadaAsciiToUnicode('¨ÉÃmÉ')).toBe('ಬೇಟೆ');
      expect(kannadaUnicodeToAscii('ಕೋಟಿ')).toBe('PÉÆÃn');
      expect(kannadaUnicodeToAscii('ಬೇಟೆ')).toBe('¨ÉÃmÉ');
    });

    it('converts full sentence: "ಕನ್ನಡ ನಾಡು ಸುಂದರ ನಾಡು"', () => {
      const ascii = 'PÀ£ÀßqÀ £ÁqÀÄ ¸ÀÄAzÀgÀ £ÁqÀÄ';
      const unicode = 'ಕನ್ನಡ ನಾಡು ಸುಂದರ ನಾಡು';
      expect(kannadaAsciiToUnicode(ascii)).toBe(unicode);
      expect(kannadaUnicodeToAscii(unicode)).toBe(ascii);
    });
  });

  describe('Shree-Lipi (Shree-Kan) ➔ Unicode Conversion', () => {
    it('converts independent vowels in Shree-Lipi format', () => {
      // Shree-Lipi independent vowels
      expect(shreeLipiToUnicode('\u0041 \u0042 \u0043 \u0044 \u0045 \u0046 \u0047 \u0048 \u0049 \u004A \u004B \u004C'))
        .toBe('ಅ ಆ ಇ ಈ ಉ ಊ ಎ ಏ ಐ ಒ ಓ ಔ');
    });

    it('converts basic consonants in Shree-Lipi format', () => {
      expect(shreeLipiToUnicode('\u0050 \u0057 \u0061 \u0067 \u00F1 \u00A8 \u00AE \u00B1 \u00B8 \u00CA \u00C3 \u00C6 \u00D3 \u00D6 \u00D9'))
        .toBe('ಕ ಗ ಚ ಜ ತ ದ ನ ಪ ಬ ವ ರ ಲ ಸ ಹ ಳ');
    });

    it('converts special combos: "ಶ್ರೀ" (\u005D), "ಕಿ" (\u0051)', () => {
      expect(shreeLipiToUnicode('\u005D')).toBe('ಶ್ರೀ');
      expect(shreeLipiToUnicode('\u0051')).toBe('ಕಿ');
    });
  });

  describe('Font Auto-Detection', () => {
    it('detects Unicode Kannada text', () => {
      expect(detectKannadaFont('ಕನ್ನಡ ನಾಡು')).toBe('unicode');
      expect(detectKannadaFont('ನಮಸ್ಕಾರ')).toBe('unicode');
    });

    it('detects Nudi / Baraha ASCII text', () => {
      expect(detectKannadaFont('PÀ£ÀßqÀ £ÁqÀÄ')).toBe('nudi');
      expect(detectKannadaFont('£ÀªÀÄ¸ÁÌgÀ')).toBe('nudi');
    });

    it('auto-converts with dispatcher correctly', () => {
      const res1 = convertKannadaText('PÀ£ÀßqÀ £ÁqÀÄ', 'auto');
      expect(res1.outputText).toBe('ಕನ್ನಡ ನಾಡು');
      expect(res1.effectiveMode).toBe('nudi-to-unicode');

      const res2 = convertKannadaText('ಕನ್ನಡ ನಾಡು', 'auto');
      expect(res2.outputText).toBe('PÀ£ÀßqÀ £ÁqÀÄ');
      expect(res2.effectiveMode).toBe('unicode-to-nudi');
    });
  });
});
