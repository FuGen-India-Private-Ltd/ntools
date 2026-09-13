// Client-Side Offline Word Document (.docx) & Plain Text (.txt) Processor
// Converts font encodings while strictly preserving all run/paragraph styling, formatting, tables, images

import JSZip from 'jszip';
import { convertKannadaText, FontMode } from './kannadaConverter';

export interface DocxProcessResult {
  blob: Blob;
  fileName: string;
  charCount: number;
  wordCount: number;
}

import { saveAndDownloadFile } from './fileDownloader';

export function downloadBlob(blob: Blob, fileName: string) {
  saveAndDownloadFile(blob, fileName);
}

export async function processDocxFile(
  file: File,
  fontMode: FontMode = 'auto'
): Promise<DocxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let totalChars = 0;
  let totalWords = 0;

  // List of XML files in docx that contain printable text runs
  const targetXmlPaths: string[] = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.startsWith('word/') &&
      (relativePath.endsWith('document.xml') ||
        relativePath.includes('header') ||
        relativePath.includes('footer') ||
        relativePath.includes('footnotes') ||
        relativePath.includes('endnotes'))
    ) {
      targetXmlPaths.push(relativePath);
    }
  });

  for (const xmlPath of targetXmlPaths) {
    const fileEntry = zip.file(xmlPath);
    if (!fileEntry) continue;

    const xmlContent = await fileEntry.async('string');

    // Replace text inside <w:t> and <w:t ...>...</w:t> tags
    const updatedXml = xmlContent.replace(
      /(<w:t(?:\s+[^>]*)?>)([\s\S]*?)(<\/w:t>)/g,
      (_match, openTag, textContent, closeTag) => {
        if (!textContent) return `${openTag}${closeTag}`;

        const decodedText = decodeXmlEntities(textContent);
        const { outputText } = convertKannadaText(decodedText, fontMode);

        totalChars += outputText.length;
        const words = outputText.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;

        const encodedOutput = encodeXmlEntities(outputText);
        return `${openTag}${encodedOutput}${closeTag}`;
      }
    );

    // Update legacy font family references to standard Kannada font
    const fontUpdatedXml = updatedXml
      .replace(/w:ascii="([^"]*(?:Nudi|Baraha|Shree|KP-Rao|BRH)[^"]*)"/gi, 'w:ascii="Noto Sans Kannada"')
      .replace(/w:hAnsi="([^"]*(?:Nudi|Baraha|Shree|KP-Rao|BRH)[^"]*)"/gi, 'w:hAnsi="Noto Sans Kannada"')
      .replace(/w:cs="([^"]*(?:Nudi|Baraha|Shree|KP-Rao|BRH)[^"]*)"/gi, 'w:cs="Noto Sans Kannada"');

    zip.file(xmlPath, fontUpdatedXml);
  }

  const generatedBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const originalName = file.name.replace(/\.docx$/i, '');
  const outFileName = `${originalName}_Unicode.docx`;

  return {
    blob: generatedBlob,
    fileName: outFileName,
    charCount: totalChars,
    wordCount: totalWords,
  };
}

export async function processTxtFile(
  file: File,
  fontMode: FontMode = 'auto'
): Promise<{ text: string; fileName: string; blob: Blob }> {
  const content = await file.text();
  const { outputText } = convertKannadaText(content, fontMode);

  const originalName = file.name.replace(/\.txt$/i, '');
  const outFileName = `${originalName}_Unicode.txt`;
  const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });

  return {
    text: outputText,
    fileName: outFileName,
    blob,
  };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function encodeXmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
