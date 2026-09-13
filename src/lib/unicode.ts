import { getUnicodeBlock, getGeneralCategory, getCharacterName, CharacterInfo } from './unicodeData';

export type DelimiterType = 'space' | 'comma' | 'comma-space' | 'newline' | 'semicolon' | 'none';
export type PrefixType = 'U+' | '\\u' | '\\u{}' | '0x' | 'none' | '&#x;' | '&#;';
export type NumberBase = 'hex' | 'dec' | 'bin';

export interface UnicodeFormatOptions {
  prefix?: PrefixType;
  base?: NumberBase;
  delimiter?: DelimiterType;
  padHex?: boolean;
  uppercase?: boolean;
}

export interface GraphemeToken {
  grapheme: string;
  codePoints: number[];
  codePointsFormatted: string[];
  utf8Bytes: number[];
  utf8Hex: string;
  utf16Units: number[];
  utf16Hex: string;
  isAscii: boolean;
  hasCombining: boolean;
  isEmojiOrAstral: boolean;
  name: string;
}

export interface TextMetrics {
  charCount: number;
  codePointCount: number;
  graphemeCount: number;
  utf8ByteCount: number;
  nonAsciiCount: number;
  hasSurrogatePairs: boolean;
  hasCombiningMarks: boolean;
}

/**
 * Accurately segments string into grapheme clusters
 */
export function segmentGraphemes(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), s => s.segment);
  }
  return Array.from(text);
}

/**
 * Returns all Unicode code points for a string safely handling astral characters
 */
export function getCodePoints(text: string): number[] {
  const codePoints: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codePoints.push(cp);
    }
  }
  return codePoints;
}

/**
 * Formats a single code point number into desired prefix and format
 */
export function formatCodePoint(cp: number, options: UnicodeFormatOptions = {}): string {
  const {
    prefix = 'U+',
    base = 'hex',
    padHex = true,
    uppercase = true,
  } = options;

  if (base === 'dec') {
    if (prefix === '&#;') return `&#${cp};`;
    return cp.toString(10);
  }

  if (base === 'bin') {
    return cp.toString(2).padStart(8, '0');
  }

  let hex = cp.toString(16);
  if (uppercase) hex = hex.toUpperCase();
  if (padHex && hex.length < 4) {
    hex = hex.padStart(4, '0');
  }

  switch (prefix) {
    case 'U+':
      return `U+${hex}`;
    case '\\u':
      return cp <= 0xFFFF ? `\\u${hex.padStart(4, '0')}` : `\\u{${hex}}`;
    case '\\u{}':
      return `\\u{${hex}}`;
    case '0x':
      return `0x${hex}`;
    case '&#x;':
      return `&#x${hex};`;
    case 'none':
    default:
      return hex;
  }
}

export function getDelimiterString(delimiter: DelimiterType = 'space'): string {
  switch (delimiter) {
    case 'space': return ' ';
    case 'comma': return ',';
    case 'comma-space': return ', ';
    case 'newline': return '\n';
    case 'semicolon': return '; ';
    case 'none': return '';
    default: return ' ';
  }
}

/**
 * Convert text to formatted Unicode string based on options
 */
export function textToUnicode(text: string, options: UnicodeFormatOptions = {}): string {
  if (!text) return '';
  const codePoints = getCodePoints(text);
  const formatted = codePoints.map(cp => formatCodePoint(cp, options));
  const delimiter = getDelimiterString(options.delimiter ?? 'space');
  return formatted.join(delimiter);
}

/**
 * Parse various Unicode code point representations back to readable text
 */
export function unicodeToText(input: string): {
  text: string;
  codePoints: number[];
  error?: string;
  warnings: string[];
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: '', codePoints: [], warnings: [] };
  }

  const warnings: string[] = [];
  const codePoints: number[] = [];

  // Check if input contains consecutive \uXXXX escapes without spaces: e.g. \u0048\u0065\u006C
  const rawTokens: string[] = [];
  
  // Regex to extract all valid Unicode escape tokens or split delimiters
  const unicodeRegex = /(?:&#x[0-9A-Fa-f]+;|&#[0-9]+;|\\u\{[0-9A-Fa-f]+\}|\\u[0-9A-Fa-f]{4}|\\x[0-9A-Fa-f]{2}|[uU]\+[0-9A-Fa-f]+|0x[0-9A-Fa-f]+)/g;
  
  let hasExplicitPrefixes = unicodeRegex.test(trimmed);
  
  if (hasExplicitPrefixes) {
    const matches = trimmed.match(unicodeRegex);
    if (matches) {
      rawTokens.push(...matches);
    }
  } else {
    // Split by whitespace, comma, semicolon
    const splits = trimmed.split(/[\s,;\n\r\t]+/).filter(t => t.length > 0);
    for (const split of splits) {
      // Check if it's a valid hex or dec number
      if (/^[0-9A-Fa-f]+$/.test(split)) {
        rawTokens.push(split);
      } else {
        warnings.push(`Ignored invalid token "${split}".`);
      }
    }
  }

  if (rawTokens.length === 0) {
    return {
      text: '',
      codePoints: [],
      error: 'No valid Unicode code points found in input.',
      warnings,
    };
  }

  for (const raw of rawTokens) {
    let cp: number | null = null;

    if (raw.startsWith('&#x') && raw.endsWith(';')) {
      cp = parseInt(raw.slice(3, -1), 16);
    } else if (raw.startsWith('&#') && raw.endsWith(';')) {
      cp = parseInt(raw.slice(2, -1), 10);
    } else if (raw.startsWith('\\u{') && raw.endsWith('}')) {
      cp = parseInt(raw.slice(3, -1), 16);
    } else if (raw.startsWith('\\u') || raw.startsWith('\\x')) {
      cp = parseInt(raw.slice(2), 16);
    } else if (raw.toUpperCase().startsWith('U+')) {
      cp = parseInt(raw.slice(2), 16);
    } else if (raw.startsWith('0x') || raw.startsWith('0X')) {
      cp = parseInt(raw.slice(2), 16);
    } else {
      // Raw number: hex if contains A-F, or treat as hex if <= 10FFFF
      const hexVal = parseInt(raw, 16);
      cp = hexVal;
    }

    if (cp === null || isNaN(cp)) {
      warnings.push(`Token "${raw}" could not be parsed.`);
      continue;
    }

    if (cp < 0 || cp > 0x10FFFF) {
      warnings.push(`Code point ${raw} (0x${cp.toString(16)}) exceeds valid Unicode range (0x0000 - 0x10FFFF).`);
      continue;
    }

    if (cp >= 0xD800 && cp <= 0xDFFF) {
      warnings.push(`Code point U+${cp.toString(16).toUpperCase()} is a surrogate code point.`);
    }

    codePoints.push(cp);
  }

  if (codePoints.length === 0) {
    return {
      text: '',
      codePoints: [],
      error: 'Could not extract any valid Unicode code points.',
      warnings,
    };
  }

  try {
    const text = String.fromCodePoint(...codePoints);
    return { text, codePoints, warnings };
  } catch (err) {
    return {
      text: '',
      codePoints,
      error: `Failed to construct string: ${(err as Error).message}`,
      warnings,
    };
  }
}

/**
 * Computes detailed UTF-8, UTF-16, and UTF-32 byte/code unit encodings
 */
export function textToEncodings(text: string) {
  if (!text) {
    return {
      utf8: { hex: '', dec: '', bin: '', bytes: [] as number[] },
      utf16: { hex: '', dec: '', bin: '', units: [] as number[], hasSurrogates: false },
      utf32: { hex: '', dec: '', bin: '', codePoints: [] as number[] },
    };
  }

  const encoder = new TextEncoder();
  const utf8Bytes = Array.from(encoder.encode(text));
  const utf8Hex = utf8Bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  const utf8Dec = utf8Bytes.map(b => b.toString(10)).join(' ');
  const utf8Bin = utf8Bytes.map(b => b.toString(2).padStart(8, '0')).join(' ');

  const utf16Units: number[] = [];
  let hasSurrogates = false;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    utf16Units.push(unit);
    if (unit >= 0xD800 && unit <= 0xDFFF) {
      hasSurrogates = true;
    }
  }
  const utf16Hex = utf16Units.map(u => '\\u' + u.toString(16).toUpperCase().padStart(4, '0')).join(' ');
  const utf16Dec = utf16Units.map(u => u.toString(10)).join(' ');
  const utf16Bin = utf16Units.map(u => u.toString(2).padStart(16, '0')).join(' ');

  const codePoints = getCodePoints(text);
  const utf32Hex = codePoints.map(cp => '0x' + cp.toString(16).toUpperCase().padStart(8, '0')).join(' ');
  const utf32Dec = codePoints.map(cp => cp.toString(10)).join(' ');
  const utf32Bin = codePoints.map(cp => cp.toString(2).padStart(32, '0')).join(' ');

  return {
    utf8: { hex: utf8Hex, dec: utf8Dec, bin: utf8Bin, bytes: utf8Bytes },
    utf16: { hex: utf16Hex, dec: utf16Dec, bin: utf16Bin, units: utf16Units, hasSurrogates },
    utf32: { hex: utf32Hex, dec: utf32Dec, bin: utf32Bin, codePoints },
  };
}

export function inspectCharacter(char: string): CharacterInfo {
  const codePoint = char.codePointAt(0) ?? 0;
  const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
  const dec = codePoint;
  const block = getUnicodeBlock(codePoint);
  const category = getGeneralCategory(char, codePoint);
  const name = getCharacterName(char, codePoint);

  const encoder = new TextEncoder();
  const utf8Bytes = Array.from(encoder.encode(char));
  const utf8BytesHex = utf8Bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0'));
  const utf8BytesDec = utf8Bytes;
  const utf8BytesBin = utf8Bytes.map(b => b.toString(2).padStart(8, '0'));

  const utf16Units: number[] = [];
  for (let i = 0; i < char.length; i++) {
    utf16Units.push(char.charCodeAt(i));
  }
  const utf16UnitsHex = utf16Units.map(u => u.toString(16).toUpperCase().padStart(4, '0'));
  const isSurrogatePair = utf16Units.length > 1;

  let highSurrogate: string | undefined;
  let lowSurrogate: string | undefined;
  if (isSurrogatePair) {
    highSurrogate = `U+${utf16UnitsHex[0]}`;
    lowSurrogate = `U+${utf16UnitsHex[1]}`;
  }

  const htmlEntityDec = `&#${dec};`;
  const htmlEntityHex = `&#x${hex};`;
  const urlEncoded = encodeURIComponent(char);
  const isAscii = codePoint <= 0x7F;
  const isPrintable = codePoint >= 0x20 && codePoint !== 0x7F && category.code !== 'Cc' && category.code !== 'Cf';

  return {
    char,
    codePoint,
    hex: `U+${hex}`,
    dec,
    name,
    block,
    category: category.code,
    categoryDesc: category.name,
    utf8BytesHex,
    utf8BytesDec,
    utf8BytesBin,
    utf16UnitsHex,
    isSurrogatePair,
    highSurrogate,
    lowSurrogate,
    htmlEntityDec,
    htmlEntityHex,
    urlEncoded,
    isAscii,
    isPrintable,
  };
}

export function analyzeTextTokens(text: string): GraphemeToken[] {
  if (!text) return [];
  const graphemes = segmentGraphemes(text);
  const encoder = new TextEncoder();

  return graphemes.map(grapheme => {
    const codePoints: number[] = [];
    for (const ch of grapheme) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined) codePoints.push(cp);
    }

    const utf8Bytes = Array.from(encoder.encode(grapheme));
    const utf8Hex = utf8Bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    const utf16Units: number[] = [];
    for (let i = 0; i < grapheme.length; i++) {
      utf16Units.push(grapheme.charCodeAt(i));
    }
    const utf16Hex = utf16Units.map(u => u.toString(16).toUpperCase().padStart(4, '0')).join(' ');

    const isAscii = codePoints.every(cp => cp <= 0x7F);
    const hasCombining = codePoints.some(cp => cp >= 0x0300 && cp <= 0x036F);
    const isEmojiOrAstral = codePoints.some(cp => cp > 0xFFFF);
    const name = getCharacterName(grapheme, codePoints[0] ?? 0);

    return {
      grapheme,
      codePoints,
      codePointsFormatted: codePoints.map(cp => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`),
      utf8Bytes,
      utf8Hex,
      utf16Units,
      utf16Hex,
      isAscii,
      hasCombining,
      isEmojiOrAstral,
      name,
    };
  });
}

export function computeTextMetrics(text: string): TextMetrics {
  if (!text) {
    return {
      charCount: 0,
      codePointCount: 0,
      graphemeCount: 0,
      utf8ByteCount: 0,
      nonAsciiCount: 0,
      hasSurrogatePairs: false,
      hasCombiningMarks: false,
    };
  }

  const graphemes = segmentGraphemes(text);
  const codePoints = getCodePoints(text);
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(text);

  let nonAsciiCount = 0;
  let hasCombiningMarks = false;

  for (const cp of codePoints) {
    if (cp > 0x7F) nonAsciiCount++;
    if (cp >= 0x0300 && cp <= 0x036F) hasCombiningMarks = true;
  }

  return {
    charCount: text.length,
    codePointCount: codePoints.length,
    graphemeCount: graphemes.length,
    utf8ByteCount: utf8Bytes.length,
    nonAsciiCount,
    hasSurrogatePairs: text.length !== codePoints.length,
    hasCombiningMarks,
  };
}
