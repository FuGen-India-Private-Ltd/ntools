// Client-Side Word Document (.docx) to PDF Converter
// Parses paragraphs, headings, formatting (bold, italic, colors, font sizes), lists, and creates high-fidelity PDF documents with zero watermarks

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { sanitizeTypography, safePdfAsciiText } from './unicodeSanitizer';

export interface DocxRun {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number; // in pt
  color: [number, number, number]; // [R, G, B]
}

export interface DocxParagraph {
  text: string;
  runs: DocxRun[];
  isHeading: boolean;
  headingLevel: number;
  isBullet: boolean;
  spaceBefore: number; // mm
  spaceAfter: number; // mm
  lineSpacing: number; // mm
  align: 'left' | 'center' | 'right' | 'justify';
}

export interface DocxToPdfOptions {
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includePageNumbers?: boolean;
  documentTitle?: string;
}

export interface DocxToPdfResult {
  pdfBlob: Blob;
  pdfFileName: string;
  paragraphCount: number;
  wordCount: number;
  paragraphs: DocxParagraph[];
}

function parseHexColor(hexStr: string | null | undefined, defaultColor: [number, number, number] = [15, 23, 42]): [number, number, number] {
  if (!hexStr || hexStr === 'auto' || hexStr.length < 6) {
    return defaultColor;
  }
  const cleanHex = hexStr.replace(/^#/, '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return defaultColor;
  }
  return [r, g, b];
}

function decodeXmlText(text: string): string {
  const raw = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return sanitizeTypography(raw);
}

export async function convertDocxToPdf(
  file: File,
  options: DocxToPdfOptions = {}
): Promise<DocxToPdfResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Check for legacy binary Word 97-2003 (.doc) magic bytes: D0 CF 11 E0
  const uint8 = new Uint8Array(arrayBuffer.slice(0, 8));
  if (uint8[0] === 0xd0 && uint8[1] === 0xcf && uint8[2] === 0x11 && uint8[3] === 0xe0) {
    throw new Error(
      'This is a legacy binary Word .doc file (Word 97-2003). Please save it as modern .docx or use a .docx file for PDF conversion.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error('Unable to read Word document. Please ensure it is a valid .docx file.');
  }

  const documentXmlEntry = zip.file('word/document.xml');
  if (!documentXmlEntry) {
    throw new Error('Invalid Word document: missing word/document.xml');
  }

  const xmlContent = await documentXmlEntry.async('string');
  const parsedParagraphs: DocxParagraph[] = [];
  let totalWords = 0;

  // Universal regex-based OpenXML parser (100% environment agnostic)
  const paragraphMatches = xmlContent.match(/<w:p(?:\s+[^>]*)?>[\s\S]*?<\/w:p>/gi) || [];

  for (const pXml of paragraphMatches) {
    // Check Headings
    let isHeading = false;
    let headingLevel = 0;
    const pStyleMatch = pXml.match(/<w:pStyle\s+[^>]*w:val="([^"]*)"/i);
    if (pStyleMatch) {
      const val = pStyleMatch[1];
      if (/heading\s*1/i.test(val) || val === '1') {
        isHeading = true;
        headingLevel = 1;
      } else if (/heading\s*2/i.test(val) || val === '2') {
        isHeading = true;
        headingLevel = 2;
      } else if (/heading\s*3/i.test(val) || val === '3') {
        isHeading = true;
        headingLevel = 3;
      } else if (/title/i.test(val)) {
        isHeading = true;
        headingLevel = 1;
      }
    }

    // Alignment
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';
    const jcMatch = pXml.match(/<w:jc\s+[^>]*w:val="([^"]*)"/i);
    if (jcMatch) {
      const jcVal = jcMatch[1];
      if (jcVal === 'center') align = 'center';
      else if (jcVal === 'right') align = 'right';
      else if (jcVal === 'both') align = 'justify';
    }

    // Spacing
    let spaceBefore = 0;
    let spaceAfter = 3.5;
    let lineSpacing = 5.5;
    const spacingMatch = pXml.match(/<w:spacing\s+([^>]*)\/>/i);
    if (spacingMatch) {
      const attrStr = spacingMatch[1];
      const afterM = attrStr.match(/w:after="(\d+)"/i);
      if (afterM) {
        const dxa = parseInt(afterM[1], 10);
        if (!isNaN(dxa)) spaceAfter = Math.max(1.5, (dxa / 20) * 0.3528);
      }
      const beforeM = attrStr.match(/w:before="(\d+)"/i);
      if (beforeM) {
        const dxa = parseInt(beforeM[1], 10);
        if (!isNaN(dxa)) spaceBefore = Math.max(0, (dxa / 20) * 0.3528);
      }
    }

    // Bullet list check
    const isBullet = /<w:numPr/i.test(pXml);

    // Extract text runs
    const runMatches = pXml.match(/<w:r(?:\s+[^>]*)?>[\s\S]*?<\/w:r>/gi) || [];
    const runs: DocxRun[] = [];
    let pFullText = '';

    for (const rXml of runMatches) {
      const tMatches = rXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi) || [];
      let runText = '';
      for (const tXml of tMatches) {
        const textContent = tXml.replace(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/i, '$1');
        runText += decodeXmlText(textContent);
      }

      if (!runText) continue;
      pFullText += runText;

      const isBold = /<w:b(?:\s+[^>]*)?\/>/i.test(rXml) || /<w:b\s+[^>]*w:val="1"/i.test(rXml);
      const isItalic = /<w:i(?:\s+[^>]*)?\/>/i.test(rXml) || /<w:i\s+[^>]*w:val="1"/i.test(rXml);

      // Font size (w:sz in half-points)
      let fontSize = isHeading ? (headingLevel === 1 ? 18 : headingLevel === 2 ? 14 : 12) : 11;
      const szMatch = rXml.match(/<w:sz\s+[^>]*w:val="(\d+)"/i);
      if (szMatch) {
        const halfPts = parseInt(szMatch[1], 10);
        if (!isNaN(halfPts)) {
          fontSize = Math.round(halfPts / 2);
        }
      }

      // Font color
      let colorVal: string | null = null;
      const colorMatch = rXml.match(/<w:color\s+[^>]*w:val="([0-9a-fA-F]{6})"/i);
      if (colorMatch) {
        colorVal = colorMatch[1];
      }
      const defaultColor: [number, number, number] = isHeading ? [15, 23, 42] : [30, 41, 59];
      const color = parseHexColor(colorVal, defaultColor);

      runs.push({
        text: runText,
        isBold,
        isItalic,
        fontSize,
        color,
      });
    }

    const trimmed = pFullText.trim();
    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter(Boolean);
      totalWords += words.length;

      parsedParagraphs.push({
        text: trimmed,
        runs,
        isHeading,
        headingLevel,
        isBullet,
        spaceBefore,
        spaceAfter,
        lineSpacing,
        align,
      });
    }
  }

  // Generate PDF via jsPDF with 100% clean output (zero watermarks)
  const orientation = options.orientation || 'portrait';
  const format = options.pageSize || 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let currentY = marginTop;

  const addHeaderFooter = (pageNo: number) => {
    if (options.includeHeader && options.documentTitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(safePdfAsciiText(options.documentTitle.toUpperCase()), marginLeft, 12);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(marginLeft, 15, pageWidth - marginRight, 15);
    }

    if (options.includePageNumbers !== false) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${pageNo}`, pageWidth - marginRight - 14, pageHeight - 10);
    }
  };

  let pageNumber = 1;
  addHeaderFooter(pageNumber);

  for (const para of parsedParagraphs) {
    currentY += para.spaceBefore;

    const primaryRun = para.runs[0] || {
      fontSize: 11,
      isBold: false,
      isItalic: false,
      color: [30, 41, 59] as [number, number, number],
    };

    let fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal';
    if (primaryRun.isBold && primaryRun.isItalic) fontStyle = 'bolditalic';
    else if (primaryRun.isBold) fontStyle = 'bold';
    else if (primaryRun.isItalic) fontStyle = 'italic';

    pdf.setFont('helvetica', fontStyle);
    pdf.setFontSize(primaryRun.fontSize);
    pdf.setTextColor(primaryRun.color[0], primaryRun.color[1], primaryRun.color[2]);

    const prefix = para.isBullet ? '*   ' : '';
    const printableText = safePdfAsciiText(prefix + para.text);
    const lines = pdf.splitTextToSize(printableText, contentWidth);
    const lineSpacingMm = Math.max(4.5, (primaryRun.fontSize * 0.3528) * 1.35);
    const requiredHeight = lines.length * lineSpacingMm + para.spaceAfter;

    // Check if new page needed
    if (currentY + requiredHeight > pageHeight - marginBottom) {
      pdf.addPage(format, orientation);
      pageNumber++;
      addHeaderFooter(pageNumber);
      currentY = marginTop;
    }

    let startX = marginLeft;
    if (para.align === 'center') {
      startX = marginLeft + contentWidth / 2;
    } else if (para.align === 'right') {
      startX = pageWidth - marginRight;
    }

    lines.forEach((lineText: string, lIdx: number) => {
      pdf.text(lineText, startX, currentY + lIdx * lineSpacingMm, {
        align: para.align === 'center' ? 'center' : para.align === 'right' ? 'right' : 'left',
      });
    });

    currentY += requiredHeight;
  }

  const generatedBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.docx$/i, '');
  const outPdfFileName = `${baseName}.pdf`;

  return {
    pdfBlob: generatedBlob,
    pdfFileName: outPdfFileName,
    paragraphCount: parsedParagraphs.length,
    wordCount: totalWords,
    paragraphs: parsedParagraphs,
  };
}
