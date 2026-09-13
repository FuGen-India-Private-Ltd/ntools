import { SPECIAL_NAMES } from './unicodeData';

export type AsciiFormat = 'dec' | 'hex' | 'bin' | 'oct';
export type NonAsciiMode = 'highlight' | 'replace' | 'transliterate' | 'escape';

export interface AsciiConversionOptions {
  format?: AsciiFormat;
  delimiter?: 'space' | 'comma' | 'comma-space' | 'newline' | 'none';
  nonAsciiMode?: NonAsciiMode;
  replacementChar?: string;
  prefix?: string;
}

export interface NonAsciiItem {
  index: number;
  char: string;
  codePoint: number;
  hex: string;
  transliteration?: string;
}

export interface AsciiConversionResult {
  output: string;
  hasNonAscii: boolean;
  nonAsciiItems: NonAsciiItem[];
  charCount: number;
  asciiCount: number;
  transliteratedPreview?: string;
}

// Transliteration map for popular non-ASCII characters to ASCII equivalents
const TRANSLITERATION_MAP: Record<string, string> = {
  // Diacritics / Accents
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a', 'ā': 'a', 'ą': 'a',
  'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A', 'Ā': 'A', 'Ą': 'A',
  'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ē': 'e', 'ę': 'e', 'ě': 'e',
  'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E', 'Ē': 'E', 'Ę': 'E', 'Ě': 'E',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ī': 'i', 'į': 'i',
  'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I', 'Ī': 'I', 'Į': 'I',
  'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ō': 'o',
  'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Õ': 'O', 'Ø': 'O', 'Ō': 'O',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ū': 'u', 'ų': 'u',
  'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U', 'Ū': 'U', 'Ų': 'U',
  'ý': 'y', 'ÿ': 'y', 'Ý': 'Y',
  'ñ': 'n', 'Ñ': 'N', 'ń': 'n', 'Ń': 'N',
  'ç': 'c', 'Ç': 'C', 'ć': 'c', 'Ć': 'C', 'č': 'c', 'Č': 'C',
  'š': 's', 'Š': 'S', 'ś': 's', 'Ś': 'S', 'ş': 's', 'Ş': 'S',
  'ž': 'z', 'Ž': 'Z', 'ź': 'z', 'Ź': 'Z', 'ż': 'z', 'Ż': 'Z',
  'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE',
  'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'TH',

  // Punctuation & Quotes
  '“': '"', '”': '"', '„': '"', '«': '"', '»': '"',
  '‘': "'", '’': "'", '‚': "'", '`': "'", '´': "'",
  '—': '--', '–': '-', '―': '--', '…': '...',
  '•': '*', '·': '*', '†': '+', '‡': '++',
  '©': '(C)', '®': '(R)', '™': '(TM)', '№': 'No.',
  '°': ' deg', '§': 'Sec.', '¶': 'P',

  // Currencies
  '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', '₩': 'KRW', '₽': 'RUB', '¢': 'c',

  // Math
  '×': '*', '÷': '/', '±': '+/-', '≠': '!=', '≤': '<=', '≥': '>=', '≈': '~',
  '∞': 'inf', '√': 'sqrt', '∑': 'sum', '∏': 'prod', 'π': 'pi',
};

/**
 * Transliterates non-ASCII characters to closest ASCII representations
 */
export function transliterateToAscii(text: string): string {
  let result = '';
  for (const char of text) {
    if (char.charCodeAt(0) <= 127) {
      result += char;
    } else if (TRANSLITERATION_MAP[char]) {
      result += TRANSLITERATION_MAP[char];
    } else {
      // Try NFD decomposition to remove accents
      const decomposed = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (decomposed.charCodeAt(0) <= 127) {
        result += decomposed;
      } else {
        result += '?';
      }
    }
  }
  return result;
}

/**
 * Detects all non-ASCII characters and their positions in text
 */
export function findNonAsciiCharacters(text: string): NonAsciiItem[] {
  const nonAscii: NonAsciiItem[] = [];
  let index = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp > 127) {
      nonAscii.push({
        index,
        char,
        codePoint: cp,
        hex: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
        transliteration: TRANSLITERATION_MAP[char] || (char.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '?'),
      });
    }
    index += char.length;
  }
  return nonAscii;
}

/**
 * Converts text into formatted ASCII values with non-ASCII handling
 */
export function textToAscii(text: string, options: AsciiConversionOptions = {}): AsciiConversionResult {
  const {
    format = 'dec',
    delimiter = 'space',
    nonAsciiMode = 'highlight',
    replacementChar = '?',
  } = options;

  const nonAsciiItems = findNonAsciiCharacters(text);
  const hasNonAscii = nonAsciiItems.length > 0;
  const transliteratedPreview = hasNonAscii ? transliterateToAscii(text) : undefined;

  let processedText = text;
  if (nonAsciiMode === 'transliterate') {
    processedText = transliterateToAscii(text);
  } else if (nonAsciiMode === 'replace') {
    processedText = Array.from(text).map(ch => (ch.charCodeAt(0) > 127 ? replacementChar : ch)).join('');
  } else if (nonAsciiMode === 'escape') {
    processedText = Array.from(text).map(ch => {
      const cp = ch.codePointAt(0) ?? 0;
      if (cp <= 127) return ch;
      return cp <= 0xFF ? `\\x${cp.toString(16).padStart(2, '0')}` : `\\u${cp.toString(16).padStart(4, '0')}`;
    }).join('');
  }

  const formattedValues: string[] = [];
  let asciiCount = 0;

  for (let i = 0; i < processedText.length; i++) {
    const code = processedText.charCodeAt(i);
    if (code <= 127) asciiCount++;

    let val = '';
    switch (format) {
      case 'hex':
        val = code.toString(16).toUpperCase().padStart(2, '0');
        break;
      case 'bin':
        val = code.toString(2).padStart(8, '0');
        break;
      case 'oct':
        val = code.toString(8).padStart(3, '0');
        break;
      case 'dec':
      default:
        val = code.toString(10);
        break;
    }
    formattedValues.push(val);
  }

  let sep = ' ';
  if (delimiter === 'comma') sep = ',';
  if (delimiter === 'comma-space') sep = ', ';
  if (delimiter === 'newline') sep = '\n';
  if (delimiter === 'none') sep = '';

  return {
    output: formattedValues.join(sep),
    hasNonAscii,
    nonAsciiItems,
    charCount: text.length,
    asciiCount,
    transliteratedPreview,
  };
}

/**
 * Converts ASCII Decimal, Hex, Binary, or Octal numbers back to string
 */
export function asciiToText(input: string, format: AsciiFormat = 'dec'): {
  text: string;
  hasErrors: boolean;
  warnings: string[];
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: '', hasErrors: false, warnings: [] };
  }

  // Extract number tokens (handles commas, spaces, newlines, semicolons, 0x prefixes)
  const tokens = trimmed
    .replace(/0x/gi, '')
    .split(/[\s,;\n\r\t]+/)
    .filter(t => t.length > 0);

  const warnings: string[] = [];
  let result = '';

  let radix = 10;
  if (format === 'hex') radix = 16;
  if (format === 'bin') radix = 2;
  if (format === 'oct') radix = 8;

  for (const token of tokens) {
    const num = parseInt(token, radix);
    if (isNaN(num)) {
      warnings.push(`Invalid token "${token}" for ${format.toUpperCase()} format.`);
      continue;
    }

    if (num < 0 || num > 127) {
      if (num <= 255) {
        warnings.push(`Value ${num} is in Extended ASCII / Latin-1 range (128-255).`);
      } else {
        warnings.push(`Value ${num} exceeds ASCII range (0-127).`);
      }
    }

    result += String.fromCharCode(num);
  }

  return {
    text: result,
    hasErrors: warnings.length > 0,
    warnings,
  };
}

export interface AsciiTableEntry {
  dec: number;
  hex: string;
  oct: string;
  bin: string;
  char: string;
  description: string;
  isControl: boolean;
}

/**
 * Generates reference table of all standard 128 ASCII characters
 */
export function getAsciiTable(): AsciiTableEntry[] {
  const table: AsciiTableEntry[] = [];
  for (let i = 0; i <= 127; i++) {
    const isControl = i < 32 || i === 127;
    const char = isControl ? ' ' : String.fromCharCode(i);
    const desc = SPECIAL_NAMES[i] || `Printable: ${char}`;

    table.push({
      dec: i,
      hex: i.toString(16).toUpperCase().padStart(2, '0'),
      oct: i.toString(8).padStart(3, '0'),
      bin: i.toString(2).padStart(8, '0'),
      char: isControl ? `[${SPECIAL_NAMES[i]?.split(' ')[0] ?? 'CTL'}]` : char,
      description: desc,
      isControl,
    });
  }
  return table;
}
