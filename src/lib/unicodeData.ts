// Unicode character properties, blocks, and category database

export interface UnicodeBlock {
  name: string;
  start: number;
  end: number;
}

export interface CharacterInfo {
  char: string;
  codePoint: number;
  hex: string;
  dec: number;
  name: string;
  block: string;
  category: string;
  categoryDesc: string;
  utf8BytesHex: string[];
  utf8BytesDec: number[];
  utf8BytesBin: string[];
  utf16UnitsHex: string[];
  isSurrogatePair: boolean;
  highSurrogate?: string;
  lowSurrogate?: string;
  htmlEntityDec: string;
  htmlEntityHex: string;
  urlEncoded: string;
  isAscii: boolean;
  isPrintable: boolean;
}

export const UNICODE_BLOCKS: UnicodeBlock[] = [
  { name: 'Basic Latin (ASCII)', start: 0x0000, end: 0x007F },
  { name: 'Latin-1 Supplement', start: 0x0080, end: 0x00FF },
  { name: 'Latin Extended-A', start: 0x0100, end: 0x017F },
  { name: 'Latin Extended-B', start: 0x0180, end: 0x024F },
  { name: 'IPA Extensions', start: 0x0250, end: 0x02AF },
  { name: 'Spacing Modifier Letters', start: 0x02B0, end: 0x02FF },
  { name: 'Combining Diacritical Marks', start: 0x0300, end: 0x036F },
  { name: 'Greek and Coptic', start: 0x0370, end: 0x03FF },
  { name: 'Cyrillic', start: 0x0400, end: 0x04FF },
  { name: 'Cyrillic Supplement', start: 0x0500, end: 0x052F },
  { name: 'Armenian', start: 0x0530, end: 0x058F },
  { name: 'Hebrew', start: 0x0590, end: 0x05FF },
  { name: 'Arabic', start: 0x0600, end: 0x06FF },
  { name: 'Syriac', start: 0x0700, end: 0x074F },
  { name: 'Thaana', start: 0x0780, end: 0x07BF },
  { name: 'Devanagari', start: 0x0900, end: 0x097F },
  { name: 'Bengali', start: 0x0980, end: 0x09FF },
  { name: 'Gurmukhi', start: 0x0A00, end: 0x0A7F },
  { name: 'Gujarati', start: 0x0A80, end: 0x0AFF },
  { name: 'Oriya', start: 0x0B00, end: 0x0B7F },
  { name: 'Tamil', start: 0x0B80, end: 0x0BFF },
  { name: 'Telugu', start: 0x0C00, end: 0x0C7F },
  { name: 'Kannada', start: 0x0C80, end: 0x0CFF },
  { name: 'Malayalam', start: 0x0D00, end: 0x0D7F },
  { name: 'Sinhala', start: 0x0D80, end: 0x0DFF },
  { name: 'Thai', start: 0x0E00, end: 0x0E7F },
  { name: 'Lao', start: 0x0E80, end: 0x0EFF },
  { name: 'Tibetan', start: 0x0F00, end: 0x0FFF },
  { name: 'Georgian', start: 0x10A0, end: 0x10FF },
  { name: 'Hangul Jamo', start: 0x1100, end: 0x11FF },
  { name: 'General Punctuation', start: 0x2000, end: 0x206F },
  { name: 'Superscripts and Subscripts', start: 0x2070, end: 0x209F },
  { name: 'Currency Symbols', start: 0x20A0, end: 0x20CF },
  { name: 'Combining Diacritical Marks for Symbols', start: 0x20D0, end: 0x20FF },
  { name: 'Letterlike Symbols', start: 0x2100, end: 0x214F },
  { name: 'Number Forms', start: 0x2150, end: 0x218F },
  { name: 'Arrows', start: 0x2190, end: 0x21FF },
  { name: 'Mathematical Operators', start: 0x2200, end: 0x22FF },
  { name: 'Miscellaneous Technical', start: 0x2300, end: 0x23FF },
  { name: 'Control Pictures', start: 0x2400, end: 0x243F },
  { name: 'Enclosed Alphanumerics', start: 0x2460, end: 0x24FF },
  { name: 'Box Drawing', start: 0x2500, end: 0x257F },
  { name: 'Block Elements', start: 0x2580, end: 0x259F },
  { name: 'Geometric Shapes', start: 0x25A0, end: 0x25FF },
  { name: 'Miscellaneous Symbols', start: 0x2600, end: 0x26FF },
  { name: 'Dingbats', start: 0x2700, end: 0x27BF },
  { name: 'Braille Patterns', start: 0x2800, end: 0x28FF },
  { name: 'CJK Radicals Supplement', start: 0x2E80, end: 0x2EFF },
  { name: 'CJK Unified Ideographs', start: 0x4E00, end: 0x9FFF },
  { name: 'Hangul Syllables', start: 0xAC00, end: 0xD7AF },
  { name: 'High Surrogates', start: 0xD800, end: 0xDB7F },
  { name: 'High Private Use Surrogates', start: 0xDB80, end: 0xDBFF },
  { name: 'Low Surrogates', start: 0xDC00, end: 0xDFFF },
  { name: 'Private Use Area', start: 0xE000, end: 0xF8FF },
  { name: 'Alphabetic Presentation Forms', start: 0xFB00, end: 0xFB4F },
  { name: 'Halfwidth and Fullwidth Forms', start: 0xFF00, end: 0xFFEF },
  { name: 'Linear B Syllabary', start: 0x10000, end: 0x1007F },
  { name: 'Musical Symbols', start: 0x1D100, end: 0x1D1FF },
  { name: 'Mathematical Alphanumeric Symbols', start: 0x1D400, end: 0x1D7FF },
  { name: 'Enclosed Alphanumeric Supplement', start: 0x1F100, end: 0x1F1FF },
  { name: 'Enclosed Ideographic Supplement', start: 0x1F200, end: 0x1F2FF },
  { name: 'Miscellaneous Symbols and Arrows', start: 0x1F300, end: 0x1F5FF },
  { name: 'Emoticons (Emoji)', start: 0x1F600, end: 0x1F64F },
  { name: 'Transport and Map Symbols', start: 0x1F680, end: 0x1F6FF },
  { name: 'Alchemical Symbols', start: 0x1F700, end: 0x1F77F },
  { name: 'Geometric Shapes Extended', start: 0x1F780, end: 0x1F7FF },
  { name: 'Supplemental Arrows-C', start: 0x1F800, end: 0x1F8FF },
  { name: 'Supplemental Symbols and Pictographs', start: 0x1F900, end: 0x1F9FF },
  { name: 'Symbols and Pictographs Extended-A', start: 0x1FA00, end: 0x1FA6F },
  { name: 'Symbols and Pictographs Extended-B', start: 0x1FA70, end: 0x1FAFF },
];

export const GENERAL_CATEGORIES: Record<string, string> = {
  Lu: 'Uppercase Letter',
  Ll: 'Lowercase Letter',
  Lt: 'Titlecase Letter',
  Lm: 'Modifier Letter',
  Lo: 'Other Letter',
  Mn: 'Nonspacing Mark (Combining)',
  Mc: 'Spacing Mark',
  Me: 'Enclosing Mark',
  Nd: 'Decimal Number',
  Nl: 'Letter Number',
  No: 'Other Number',
  Pc: 'Connector Punctuation',
  Pd: 'Dash Punctuation',
  Ps: 'Open Punctuation',
  Pe: 'Close Punctuation',
  Pi: 'Initial Quote Punctuation',
  Pf: 'Final Quote Punctuation',
  Po: 'Other Punctuation',
  Sm: 'Math Symbol',
  Sc: 'Currency Symbol',
  Sk: 'Modifier Symbol',
  So: 'Other Symbol',
  Zs: 'Space Separator',
  Zl: 'Line Separator',
  Zp: 'Paragraph Separator',
  Cc: 'Control Character',
  Cf: 'Format Character',
  Cs: 'Surrogate Code Point',
  Co: 'Private Use',
  Cn: 'Unassigned',
};

// Common ASCII & Unicode Character Names Lookup
export const SPECIAL_NAMES: Record<number, string> = {
  0x0000: 'NULL (NUL)',
  0x0001: 'START OF HEADING (SOH)',
  0x0002: 'START OF TEXT (STX)',
  0x0003: 'END OF TEXT (ETX)',
  0x0004: 'END OF TRANSMISSION (EOT)',
  0x0005: 'ENQUIRY (ENQ)',
  0x0006: 'ACKNOWLEDGE (ACK)',
  0x0007: 'ALERT / BELL (BEL)',
  0x0008: 'BACKSPACE (BS)',
  0x0009: 'CHARACTER TABULATION (TAB)',
  0x000A: 'LINE FEED (LF / \\n)',
  0x000B: 'LINE TABULATION (VT)',
  0x000C: 'FORM FEED (FF)',
  0x000D: 'CARRIAGE RETURN (CR / \\r)',
  0x000E: 'SHIFT OUT (SO)',
  0x000F: 'SHIFT IN (SI)',
  0x0010: 'DATA LINK ESCAPE (DLE)',
  0x0011: 'DEVICE CONTROL ONE (DC1)',
  0x0012: 'DEVICE CONTROL TWO (DC2)',
  0x0013: 'DEVICE CONTROL THREE (DC3)',
  0x0014: 'DEVICE CONTROL FOUR (DC4)',
  0x0015: 'NEGATIVE ACKNOWLEDGE (NAK)',
  0x0016: 'SYNCHRONOUS IDLE (SYN)',
  0x0017: 'END OF TRANSMISSION BLOCK (ETB)',
  0x0018: 'CANCEL (CAN)',
  0x0019: 'END OF MEDIUM (EM)',
  0x001A: 'SUBSTITUTE (SUB)',
  0x001B: 'ESCAPE (ESC)',
  0x001C: 'FILE SEPARATOR (FS)',
  0x001D: 'GROUP SEPARATOR (GS)',
  0x001E: 'RECORD SEPARATOR (RS)',
  0x001F: 'UNIT SEPARATOR (US)',
  0x0020: 'SPACE',
  0x0021: 'EXCLAMATION MARK',
  0x0022: 'QUOTATION MARK',
  0x0023: 'NUMBER SIGN (#)',
  0x0024: 'DOLLAR SIGN ($)',
  0x0025: 'PERCENT SIGN (%)',
  0x0026: 'AMPERSAND (&)',
  0x0027: 'APOSTROPHE (\')',
  0x0028: 'LEFT PARENTHESIS',
  0x0029: 'RIGHT PARENTHESIS',
  0x002A: 'ASTERISK (*)',
  0x002B: 'PLUS SIGN (+)',
  0x002C: 'COMMA (,)',
  0x002D: 'HYPHEN-MINUS (-)',
  0x002E: 'FULL STOP (.)',
  0x002F: 'SOLIDUS (/)',
  0x003A: 'COLON (:)',
  0x003B: 'SEMICOLON (;)',
  0x003C: 'LESS-THAN SIGN (<)',
  0x003D: 'EQUALS SIGN (=)',
  0x003E: 'GREATER-THAN SIGN (>)',
  0x003F: 'QUESTION MARK (?)',
  0x0040: 'COMMERCIAL AT (@)',
  0x005B: 'LEFT SQUARE BRACKET ([)',
  0x005C: 'REVERSE SOLIDUS (\\)',
  0x005D: 'RIGHT SQUARE BRACKET (])',
  0x005E: 'CIRCUMFLEX ACCENT (^)',
  0x005F: 'LOW LINE (_)',
  0x0060: 'GRAVE ACCENT (`)',
  0x007B: 'LEFT CURLY BRACKET ({)',
  0x007C: 'VERTICAL LINE (|)',
  0x007D: 'RIGHT CURLY BRACKET (})',
  0x007E: 'TILDE (~)',
  0x007F: 'DELETE (DEL)',
  0x00A0: 'NO-BREAK SPACE',
  0x00A9: 'COPYRIGHT SIGN (©)',
  0x00AE: 'REGISTERED SIGN (®)',
  0x200B: 'ZERO WIDTH SPACE (ZWSP)',
  0x200C: 'ZERO WIDTH NON-JOINER (ZWNJ)',
  0x200D: 'ZERO WIDTH JOINER (ZWJ)',
  0xFEFF: 'ZERO WIDTH NO-BREAK SPACE / BYTE ORDER MARK (BOM)',
  0xFFFD: 'REPLACEMENT CHARACTER ()',
  0x1F600: 'GRINNING FACE (😀)',
  0x1F602: 'FACE WITH TEARS OF JOY (😂)',
  0x1F680: 'ROCKET (🚀)',
  0x2728: 'SPARKLES (✨)',
  0x1F525: 'FIRE (🔥)',
  0x1F44D: 'THUMBS UP SIGN (👍)',
  0x2764: 'HEAVY BLACK HEART (❤)',
};

export function getUnicodeBlock(codePoint: number): string {
  for (const block of UNICODE_BLOCKS) {
    if (codePoint >= block.start && codePoint <= block.end) {
      return block.name;
    }
  }
  return 'Unknown Block';
}

export function getGeneralCategory(char: string, codePoint: number): { code: string; name: string } {
  if (codePoint < 0x20 || codePoint === 0x7F) {
    return { code: 'Cc', name: GENERAL_CATEGORIES['Cc'] };
  }
  if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
    return { code: 'Cs', name: GENERAL_CATEGORIES['Cs'] };
  }
  if (codePoint >= 0xE000 && codePoint <= 0xF8FF) {
    return { code: 'Co', name: GENERAL_CATEGORIES['Co'] };
  }

  // Regex testing for general category
  if (/\p{Lu}/u.test(char)) return { code: 'Lu', name: GENERAL_CATEGORIES['Lu'] };
  if (/\p{Ll}/u.test(char)) return { code: 'Ll', name: GENERAL_CATEGORIES['Ll'] };
  if (/\p{Lt}/u.test(char)) return { code: 'Lt', name: GENERAL_CATEGORIES['Lt'] };
  if (/\p{Lm}/u.test(char)) return { code: 'Lm', name: GENERAL_CATEGORIES['Lm'] };
  if (/\p{Lo}/u.test(char)) return { code: 'Lo', name: GENERAL_CATEGORIES['Lo'] };
  if (/\p{Mn}/u.test(char)) return { code: 'Mn', name: GENERAL_CATEGORIES['Mn'] };
  if (/\p{Mc}/u.test(char)) return { code: 'Mc', name: GENERAL_CATEGORIES['Mc'] };
  if (/\p{Me}/u.test(char)) return { code: 'Me', name: GENERAL_CATEGORIES['Me'] };
  if (/\p{Nd}/u.test(char)) return { code: 'Nd', name: GENERAL_CATEGORIES['Nd'] };
  if (/\p{Nl}/u.test(char)) return { code: 'Nl', name: GENERAL_CATEGORIES['Nl'] };
  if (/\p{No}/u.test(char)) return { code: 'No', name: GENERAL_CATEGORIES['No'] };
  if (/\p{Sm}/u.test(char)) return { code: 'Sm', name: GENERAL_CATEGORIES['Sm'] };
  if (/\p{Sc}/u.test(char)) return { code: 'Sc', name: GENERAL_CATEGORIES['Sc'] };
  if (/\p{Sk}/u.test(char)) return { code: 'Sk', name: GENERAL_CATEGORIES['Sk'] };
  if (/\p{So}/u.test(char)) return { code: 'So', name: GENERAL_CATEGORIES['So'] };
  if (/\p{Pc}/u.test(char)) return { code: 'Pc', name: GENERAL_CATEGORIES['Pc'] };
  if (/\p{Pd}/u.test(char)) return { code: 'Pd', name: GENERAL_CATEGORIES['Pd'] };
  if (/\p{Ps}/u.test(char)) return { code: 'Ps', name: GENERAL_CATEGORIES['Ps'] };
  if (/\p{Pe}/u.test(char)) return { code: 'Pe', name: GENERAL_CATEGORIES['Pe'] };
  if (/\p{Pi}/u.test(char)) return { code: 'Pi', name: GENERAL_CATEGORIES['Pi'] };
  if (/\p{Pf}/u.test(char)) return { code: 'Pf', name: GENERAL_CATEGORIES['Pf'] };
  if (/\p{Po}/u.test(char)) return { code: 'Po', name: GENERAL_CATEGORIES['Po'] };
  if (/\p{Zs}/u.test(char)) return { code: 'Zs', name: GENERAL_CATEGORIES['Zs'] };
  if (/\p{Zl}/u.test(char)) return { code: 'Zl', name: GENERAL_CATEGORIES['Zl'] };
  if (/\p{Zp}/u.test(char)) return { code: 'Zp', name: GENERAL_CATEGORIES['Zp'] };

  return { code: 'Cn', name: 'Other / Unassigned' };
}

export function getCharacterName(_char: string, codePoint: number): string {
  if (SPECIAL_NAMES[codePoint]) {
    return SPECIAL_NAMES[codePoint];
  }

  // Digits
  if (codePoint >= 0x0030 && codePoint <= 0x0039) {
    return `DIGIT ${String.fromCharCode(codePoint)}`;
  }
  // Latin Upper
  if (codePoint >= 0x0041 && codePoint <= 0x005A) {
    return `LATIN CAPITAL LETTER ${String.fromCharCode(codePoint)}`;
  }
  // Latin Lower
  if (codePoint >= 0x0061 && codePoint <= 0x007A) {
    return `LATIN SMALL LETTER ${String.fromCharCode(codePoint).toUpperCase()}`;
  }

  // Unicode block fallbacks
  const block = getUnicodeBlock(codePoint);
  return `${block.toUpperCase()} (U+${codePoint.toString(16).toUpperCase().padStart(4, '0')})`;
}
