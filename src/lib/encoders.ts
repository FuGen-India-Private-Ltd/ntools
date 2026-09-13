// Web Encoders: HTML entities, Base64, URL percent-encoding, Punycode

const HTML_NAMED_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '¢': '&cent;',
  '§': '&sect;',
  '¶': '&para;',
  '•': '&bull;',
  '–': '&ndash;',
  '—': '&mdash;',
  '…': '&hellip;',
  '°': '&deg;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '≠': '&ne;',
  '≤': '&le;',
  '≥': '&ge;',
  '∞': '&infin;',
  '√': '&radic;',
  '≈': '&asymp;',
  ' ': '&nbsp;',
};

const HTML_ENTITY_REVERSE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&cent;': '¢',
  '&sect;': '§',
  '&para;': '¶',
  '&bull;': '•',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&deg;': '°',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&ne;': '≠',
  '&le;': '≤',
  '&ge;': '≥',
  '&infin;': '∞',
  '&radic;': '√',
  '&asymp;': '≈',
  '&nbsp;': ' ',
};

export type HtmlEntityMode = 'named' | 'dec' | 'hex' | 'all-hex' | 'all-dec';

export function textToHtmlEntities(text: string, mode: HtmlEntityMode = 'hex'): string {
  if (!text) return '';
  return Array.from(text).map(char => {
    const cp = char.codePointAt(0) ?? 0;

    if (mode === 'named' && HTML_NAMED_ENTITIES[char]) {
      return HTML_NAMED_ENTITIES[char];
    }

    if (mode === 'all-hex') {
      return `&#x${cp.toString(16).toUpperCase()};`;
    }

    if (mode === 'all-dec') {
      return `&#${cp};`;
    }

    // Default: encode non-ASCII + sensitive HTML chars
    if (char === '<' || char === '>' || char === '&' || char === '"' || char === "'") {
      return HTML_NAMED_ENTITIES[char] || `&#${cp};`;
    }

    if (cp > 127) {
      return mode === 'dec' ? `&#${cp};` : `&#x${cp.toString(16).toUpperCase()};`;
    }

    return char;
  }).join('');
}

export function htmlEntitiesToText(input: string): string {
  if (!input) return '';
  let result = input;

  // Replace named entities
  for (const [entity, char] of Object.entries(HTML_ENTITY_REVERSE)) {
    result = result.replaceAll(entity, char);
  }

  // Replace hex entities &#xHHHH;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return _;
    }
  });

  // Replace decimal entities &#NNNN;
  result = result.replace(/&#([0-9]+);/g, (_, dec) => {
    try {
      return String.fromCodePoint(parseInt(dec, 10));
    } catch {
      return _;
    }
  });

  return result;
}

export function textToBase64(text: string): string {
  if (!text) return '';
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToText(b64: string): { text: string; error?: string } {
  if (!b64.trim()) return { text: '' };
  try {
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const text = new TextDecoder().decode(bytes);
    return { text };
  } catch (err) {
    return { text: '', error: (err as Error).message };
  }
}

export function textToUrlEncoding(text: string, component: boolean = true): string {
  if (!text) return '';
  return component ? encodeURIComponent(text) : encodeURI(text);
}

export function urlEncodingToText(input: string): { text: string; error?: string } {
  if (!input) return { text: '' };
  try {
    return { text: decodeURIComponent(input) };
  } catch (err) {
    return { text: '', error: (err as Error).message };
  }
}
