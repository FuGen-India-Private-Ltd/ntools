export interface FancyStyle {
  id: string;
  name: string;
  category: 'Math' | 'Enclosed' | 'Transform' | 'Decorated';
  sample: string;
  transform: (text: string) => string;
}

// Math offset helpers
function mapChar(c: string, upperStart: number, lowerStart: number, digitStart?: number, exceptions: Record<string, number> = {}): string {
  const code = c.charCodeAt(0);
  if (exceptions[c]) {
    return String.fromCodePoint(exceptions[c]);
  }
  // Uppercase A-Z (65-90)
  if (code >= 65 && code <= 90) {
    return String.fromCodePoint(upperStart + (code - 65));
  }
  // Lowercase a-z (97-122)
  if (code >= 97 && code <= 122) {
    return String.fromCodePoint(lowerStart + (code - 97));
  }
  // Digits 0-9 (48-57)
  if (digitStart !== undefined && code >= 48 && code <= 57) {
    return String.fromCodePoint(digitStart + (code - 48));
  }
  return c;
}

function transformString(text: string, fn: (c: string) => string): string {
  return Array.from(text).map(fn).join('');
}

const SMALL_CAPS_MAP: Record<string, string> = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
  j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ',
  s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
  A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ғ', G: 'ɢ', H: 'ʜ', I: 'ɪ',
  J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ǫ', R: 'ʀ',
  S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ',
};

const UPSIDE_DOWN_MAP: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ',
  j: 'ɾ', k: 'ʞ', l: 'ן', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
  s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  A: '∀', B: '𐐒', C: 'Ɔ', D: 'ᗡ', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I',
  J: 'ſ', K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ',
  S: 'S', T: '┴', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
  '0': '0', '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6',
  '.': '˙', ',': "'", '\'': ',', '"': '„', '!': '¡', '?': '¿', '<': '>', '>': '<',
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '&': '⅋', '_': '‾'
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ',
  'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ',
  't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ',
  'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ',
  'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ',
  'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

export const FANCY_STYLES: FancyStyle[] = [
  {
    id: 'bold',
    name: 'Bold (Serif)',
    category: 'Math',
    sample: '𝐁𝐨𝐥𝐝 𝐓𝐞𝐱𝐭',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D400, 0x1D41A, 0x1D7CE)),
  },
  {
    id: 'italic',
    name: 'Italic (Serif)',
    category: 'Math',
    sample: '𝐼𝑡𝑎𝑙𝑖𝑐 𝑇𝑒𝑥𝑡',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D434, 0x1D44E, undefined, { 'h': 0x210E })),
  },
  {
    id: 'bold-italic',
    name: 'Bold Italic',
    category: 'Math',
    sample: '𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D468, 0x1D482)),
  },
  {
    id: 'sans-serif',
    name: 'Sans-Serif',
    category: 'Math',
    sample: '𝖲𝖺𝗇𝗌-𝖲𝖾𝗋𝗂𝖿',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D5A0, 0x1D5BA, 0x1D7E2)),
  },
  {
    id: 'sans-bold',
    name: 'Sans-Serif Bold',
    category: 'Math',
    sample: '𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D5D4, 0x1D5EE, 0x1D7EC)),
  },
  {
    id: 'sans-italic',
    name: 'Sans-Serif Italic',
    category: 'Math',
    sample: '𝘚𝘢𝘯𝘴 𝘐𝘵𝘢𝘭𝘪𝘤',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D608, 0x1D622)),
  },
  {
    id: 'sans-bold-italic',
    name: 'Sans Bold Italic',
    category: 'Math',
    sample: '𝙎𝙖𝙣𝙨 𝘽𝙤𝙡𝙙 𝙄𝙩𝙖𝙡𝙞𝙘',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D63C, 0x1D656)),
  },
  {
    id: 'script',
    name: 'Script / Cursive',
    category: 'Math',
    sample: '𝒮𝒸𝓇𝒾𝓅𝓉 𝒯ℯ𝓍𝓉',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D49C, 0x1D4B6, undefined, {
      'B': 0x212C, 'E': 0x2130, 'F': 0x2131, 'H': 0x210B, 'I': 0x2110, 'L': 0x2112, 'M': 0x2133, 'R': 0x211B,
      'e': 0x212F, 'g': 0x210A, 'o': 0x2134
    })),
  },
  {
    id: 'bold-script',
    name: 'Bold Script',
    category: 'Math',
    sample: '𝓑𝓸𝓵𝓭 𝓢𝓬𝓻𝓲𝓹𝓽',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D4D0, 0x1D4EA)),
  },
  {
    id: 'fraktur',
    name: 'Fraktur / Gothic',
    category: 'Math',
    sample: '𝔉𝔯𝔞𝔨𝔱𝔲𝔯 𝔗𝔢𝔵𝔱',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D504, 0x1D51E, undefined, {
      'C': 0x212D, 'H': 0x210C, 'I': 0x2111, 'R': 0x211C, 'Z': 0x2128
    })),
  },
  {
    id: 'bold-fraktur',
    name: 'Bold Fraktur',
    category: 'Math',
    sample: '𝕭𝖔𝖑𝖉 𝕱𝖗𝖆𝖐𝖙𝖚𝖗',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D56C, 0x1D586)),
  },
  {
    id: 'double-struck',
    name: 'Double-Struck (Blackboard)',
    category: 'Math',
    sample: '𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D538, 0x1D552, 0x1D7D8, {
      'C': 0x2102, 'H': 0x210D, 'N': 0x2115, 'P': 0x2119, 'Q': 0x211A, 'R': 0x211D, 'Z': 0x2124
    })),
  },
  {
    id: 'monospace',
    name: 'Monospace',
    category: 'Math',
    sample: '𝙼𝚘𝚗𝚘𝚜𝚙𝚊𝚌𝚎',
    transform: (t) => transformString(t, c => mapChar(c, 0x1D670, 0x1D68A, 0x1D7F6)),
  },
  {
    id: 'small-caps',
    name: 'Small Caps',
    category: 'Transform',
    sample: 'sᴍᴀʟʟ ᴄᴀᴘs',
    transform: (t) => transformString(t, c => SMALL_CAPS_MAP[c] || c),
  },
  {
    id: 'circled',
    name: 'Circled',
    category: 'Enclosed',
    sample: 'Ⓒⓘⓡⓒⓛⓔⓓ',
    transform: (t) => transformString(t, c => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24B6 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24D0 + (code - 97));
      if (code >= 49 && code <= 57) return String.fromCodePoint(0x2460 + (code - 49));
      if (code === 48) return '⓪';
      return c;
    }),
  },
  {
    id: 'squared',
    name: 'Squared',
    category: 'Enclosed',
    sample: '🅂🅀🅄🄰🅁🄴🄳',
    transform: (t) => transformString(t, c => {
      const code = c.toUpperCase().charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x1F130 + (code - 65));
      return c;
    }),
  },
  {
    id: 'inverted',
    name: 'Upside Down / Inverted',
    category: 'Transform',
    sample: 'uʍop ǝpᴉsd∩',
    transform: (t) => Array.from(t).reverse().map(c => UPSIDE_DOWN_MAP[c] || c).join(''),
  },
  {
    id: 'superscript',
    name: 'Superscript',
    category: 'Transform',
    sample: 'ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ',
    transform: (t) => transformString(t, c => SUPERSCRIPT_MAP[c] || c),
  },
  {
    id: 'subscript',
    name: 'Subscript',
    category: 'Transform',
    sample: 'ₛᵤᵦₛ𝒸ᵣᵢₚₜ',
    transform: (t) => transformString(t, c => SUBSCRIPT_MAP[c] || c),
  },
  {
    id: 'fullwidth',
    name: 'Fullwidth (Aesthetic)',
    category: 'Transform',
    sample: 'Ｆｕｌｌｗｉｄｔｈ',
    transform: (t) => transformString(t, c => {
      const code = c.charCodeAt(0);
      if (code >= 33 && code <= 126) return String.fromCodePoint(0xFF01 + (code - 33));
      if (code === 32) return '\u3000';
      return c;
    }),
  },
  {
    id: 'strikethrough',
    name: 'Strikethrough',
    category: 'Decorated',
    sample: 'S̶t̶r̶i̶k̶e̶',
    transform: (t) => Array.from(t).map(c => c + '\u0336').join(''),
  },
  {
    id: 'underline',
    name: 'Underline',
    category: 'Decorated',
    sample: 'U̲n̲d̲e̲r̲l̲i̲n̲e̲',
    transform: (t) => Array.from(t).map(c => c + '\u0332').join(''),
  },
  {
    id: 'slash-through',
    name: 'Slash Through',
    category: 'Decorated',
    sample: 'S̷l̷a̷s̷h̷',
    transform: (t) => Array.from(t).map(c => c + '\u0337').join(''),
  },
];
