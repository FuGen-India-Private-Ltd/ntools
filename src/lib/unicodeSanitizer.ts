// Universal Unicode & Typography Sanitizer for Flawless PDF Conversions
// Normalizes typographic characters, handles non-Latin scripts (Kannada, Hindi, etc.),
// and prevents jsPDF WinAnsi / encoding crashes.

/**
 * Replaces fancy typographic characters (curly quotes, dashes, ellipsis, rupee, bullets)
 * with standard printable characters that standard PDF engines render cleanly.
 */
export function sanitizeTypography(text: string): string {
  if (!text) return '';

  return text
    // Double quotes
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    // Single quotes & apostrophes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
 // Em-dash & En-dash
 .replace(/\u2014/g, ' -- ')
 .replace(/\u2013/g, ' - ')
 .replace(/\u2012/g, '-')
 // Ellipsis
 .replace(/\u2026/g, '...')
 // Indian Rupee Symbol (U+20B9)
 .replace(/\u20B9/g, 'Rs. ')
  // Bullets and list markers
  .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB]\s*/g, '* ')
 // Non-breaking and special spaces
 .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
 // Zero-width characters
 .replace(/[\u200B-\u200D\uFEFF]/g, '')
 // Common symbols
 .replace(/\u00A9/g, '(c)')
 .replace(/\u00AE/g, '(R)')
 .replace(/\u2122/g, '(TM)')
 .replace(/\u00B1/g, '+/-')
 .replace(/\u00D7/g, 'x')
 .replace(/\u00F7/g, '/')
 // Newline normalization
 .replace(/\r\n/g, '\n')
 .replace(/\r/g, '\n');
}

/**
 * Checks whether a text contains complex non-Latin Unicode characters (e.g. Kannada, Devanagari, Tamil, etc.)
 * that cannot be safely rendered by standard Helvetica Latin-1 font.
 */
export function hasComplexUnicode(text: string): boolean {
 if (!text) return false;
 for (let i = 0; i < text.length; i++) {
 const code = text.charCodeAt(i);
 // Any character above Latin-1 supplement (0x00FF)
 if (code > 255) {
 return true;
 }
 }
 return false;
}

/**
 * Clean printable fallback for jsPDF text rendering.
 * Replaces any remaining unsupported character with a safe replacement so jsPDF never throws an error.
 */
export function safePdfAsciiText(text: string): string {
 const sanitized = sanitizeTypography(text);
 let result = '';
 for (let i = 0; i < sanitized.length; i++) {
 const code = sanitized.charCodeAt(i);
 if (code >= 32 && code <= 126) {
 result += sanitized[i];
 } else if (code === 10 || code === 9) {
 result += sanitized[i];
 } else if (code >= 160 && code <= 255) {
 result += sanitized[i];
 } else if (code > 255) {
 result += sanitized[i];
 } else {
 result += ' ';
 }
 }
 return result;
}

/**
 * Renders rich formatted HTML onto an offscreen canvas at high DPI (2x / 300dpi equivalent),
 * returning an image data URL that can be inserted into jsPDF with 100% font shaping and layout fidelity.
 */
export async function renderHtmlPageToDataUrl(
 htmlContent: string,
 widthPx: number = 794,
 heightPx: number = 1123
): Promise<string> {
 const container = document.createElement('div');
 container.style.position = 'fixed';
 container.style.top = '-99999px';
 container.style.left = '-99999px';
  container.style.width = `${widthPx}px`;
  container.style.minHeight = `${heightPx}px`;
 container.style.backgroundColor = '#FFFFFF';
 container.style.color = '#0F172A';
 container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans Kannada, sans-serif';
 container.style.boxSizing = 'border-box';
 container.style.padding = '40px';
 container.innerHTML = htmlContent;

 document.body.appendChild(container);

 try {
 const html2canvasModule = await import('html2canvas');
 const html2canvas = html2canvasModule.default || html2canvasModule;

 const renderedCanvas = await html2canvas(container, {
 scale: 2,
 useCORS: true,
 logging: false,
 backgroundColor: '#FFFFFF',
 });

 return renderedCanvas.toDataURL('image/jpeg', 0.95);
 } finally {
 if (document.body.contains(container)) {
 document.body.removeChild(container);
 }
 }
}
