// Client-Side Word Document (.docx) to PDF Converter
// Preserves document layouts, headings, typography, tables, cell borders, shading, lists, and embedded images

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

export interface DocxTableCell {
  text: string;
  paragraphs: DocxParagraph[];
  widthDxa?: number;
  bgColor?: [number, number, number];
  colSpan?: number;
}

export interface DocxTableRow {
  cells: DocxTableCell[];
  isHeader?: boolean;
}

export interface DocxTable {
  rows: DocxTableRow[];
  colCount: number;
}

export interface DocxImageItem {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  widthMm: number;
  heightMm: number;
}

export type DocxBlockElement =
  | { type: 'paragraph'; paragraph: DocxParagraph }
  | { type: 'table'; table: DocxTable }
  | { type: 'image'; image: DocxImageItem }
  | { type: 'pageBreak' };

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
  tableCount: number;
  imageCount: number;
  paragraphs: DocxParagraph[];
}

function parseHexColor(
  hexStr: string | null | undefined,
  defaultColor: [number, number, number] = [15, 23, 42]
): [number, number, number] {
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

function parseSingleParagraphXml(pXml: string): DocxParagraph {
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
  let spaceAfter = isHeading ? 4.5 : 3.0;
  let lineSpacing = isHeading ? 6.5 : 5.0;
  const spacingMatch = pXml.match(/<w:spacing\s+([^>]*)\/>/i);
  if (spacingMatch) {
    const attrStr = spacingMatch[1];
    const afterM = attrStr.match(/w:after="(\d+)"/i);
    if (afterM) {
      const dxa = parseInt(afterM[1], 10);
      if (!isNaN(dxa)) spaceAfter = Math.max(1.0, (dxa / 20) * 0.3528);
    }
    const beforeM = attrStr.match(/w:before="(\d+)"/i);
    if (beforeM) {
      const dxa = parseInt(beforeM[1], 10);
      if (!isNaN(dxa)) spaceBefore = Math.max(0, (dxa / 20) * 0.3528);
    }
  }

  // Bullets
  const numPrMatch = pXml.match(/<w:numPr>[\s\S]*?<\/w:numPr>/i);
  const isBullet = Boolean(numPrMatch);

  // Runs
  const runs: DocxRun[] = [];
  const runMatches = pXml.match(/<w:r(?:\s+[^>]*)?>[\s\S]*?<\/w:r>/gi) || [];

  for (const rXml of runMatches) {
    const rPrMatch = rXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/i);
    const rPr = rPrMatch ? rPrMatch[1] : '';

    const isBold = Boolean(rPr.match(/<w:b(?:\s+[^>]*|\/>|>)/i));
    const isItalic = Boolean(rPr.match(/<w:i(?:\s+[^>]*|\/>|>)/i));

    let fontSize = isHeading ? (headingLevel === 1 ? 17 : headingLevel === 2 ? 14 : 12) : 10.5;
    const szMatch = rPr.match(/<w:sz\s+[^>]*w:val="(\d+)"/i);
    if (szMatch) {
      const halfPt = parseInt(szMatch[1], 10);
      if (!isNaN(halfPt)) fontSize = halfPt / 2;
    }

    let color: [number, number, number] = isHeading ? [15, 23, 42] : [30, 41, 59];
    const colorMatch = rPr.match(/<w:color\s+[^>]*w:val="([^"]*)"/i);
    if (colorMatch) {
      color = parseHexColor(colorMatch[1], color);
    }

    const tMatches = rXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi) || [];
    let runText = '';
    for (const tXml of tMatches) {
      const raw = tXml.replace(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/i, '$1');
      runText += decodeXmlText(raw);
    }

    if (runText) {
      runs.push({
        text: runText,
        isBold,
        isItalic,
        fontSize,
        color,
      });
    }
  }

  const paragraphText = runs.map((r) => r.text).join('');
  return {
    text: paragraphText,
    runs,
    isHeading,
    headingLevel,
    isBullet,
    spaceBefore,
    spaceAfter,
    lineSpacing,
    align,
  };
}

function parseTableXml(tblXml: string): DocxTable {
  const rowMatches = tblXml.match(/<w:tr(?:\s+[^>]*)?>[\s\S]*?<\/w:tr>/gi) || [];
  const rows: DocxTableRow[] = [];
  let maxCols = 0;

  rowMatches.forEach((trXml, rIdx) => {
    const isHeader = rIdx === 0 || Boolean(trXml.match(/<w:tblHeader\s*\/>/i));
    const cellMatches = trXml.match(/<w:tc(?:\s+[^>]*)?>[\s\S]*?<\/w:tc>/gi) || [];
    const cells: DocxTableCell[] = [];

    cellMatches.forEach((tcXml) => {
      // Cell Shading (Background color)
      let bgColor: [number, number, number] | undefined = undefined;
      const shdMatch = tcXml.match(/<w:shd\s+[^>]*w:fill="([^"]*)"/i);
      if (shdMatch && shdMatch[1] && shdMatch[1] !== 'auto') {
        bgColor = parseHexColor(shdMatch[1]);
      } else if (isHeader) {
        bgColor = [241, 245, 249]; // slate-100 default header fill
      }

      // Cell Width (DXA)
      let widthDxa: number | undefined = undefined;
      const tcWMatch = tcXml.match(/<w:tcW\s+[^>]*w:w="(\d+)"/i);
      if (tcWMatch) {
        widthDxa = parseInt(tcWMatch[1], 10);
      }

      // Cell Paragraphs
      const pMatches = tcXml.match(/<w:p(?:\s+[^>]*)?>[\s\S]*?<\/w:p>/gi) || [];
      const cellParagraphs: DocxParagraph[] = [];

      for (const pXml of pMatches) {
        const p = parseSingleParagraphXml(pXml);
        if (p.text.trim()) {
          cellParagraphs.push(p);
        }
      }

      const cellText = cellParagraphs.map((p) => p.text).join('\n');
      cells.push({
        text: cellText,
        paragraphs: cellParagraphs,
        widthDxa,
        bgColor,
      });
    });

    if (cells.length > maxCols) {
      maxCols = cells.length;
    }

    if (cells.length > 0) {
      rows.push({
        cells,
        isHeader,
      });
    }
  });

  return {
    rows,
    colCount: maxCols,
  };
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
  } catch {
    throw new Error('Unable to read Word document. Please ensure it is a valid .docx file.');
  }

  const documentXmlEntry = zip.file('word/document.xml');
  if (!documentXmlEntry) {
    throw new Error('Invalid Word document: missing word/document.xml');
  }

  // Load relationship map for embedded images: word/_rels/document.xml.rels
  const relsEntry = zip.file('word/_rels/document.xml.rels');
  const imageRelMap = new Map<string, string>();
  if (relsEntry) {
    const relsXml = await relsEntry.async('string');
    const relTags = relsXml.match(/<Relationship\s+[^>]*\/>/gi) || [];
    for (const tag of relTags) {
      const idMatch = tag.match(/Id="([^"]*)"/i);
      const targetMatch = tag.match(/Target="([^"]*)"/i);
      const typeMatch = tag.match(/Type="([^"]*)"/i);
      if (idMatch && targetMatch && typeMatch && typeMatch[1].includes('image')) {
        let cleanTarget = targetMatch[1].replace(/^\//, '');
        if (!cleanTarget.startsWith('word/')) {
          cleanTarget = 'word/' + cleanTarget;
        }
        imageRelMap.set(idMatch[1], cleanTarget);
      }
    }
  }

  const xmlContent = await documentXmlEntry.async('string');

  // Sequential OpenXML Block Matcher for <w:body> children: <w:p> and <w:tbl>
  const blockRegex = /<w:p(?:\s+[^>]*)?>[\s\S]*?<\/w:p>|<w:tbl(?:\s+[^>]*)?>[\s\S]*?<\/w:tbl>/gi;
  const rawBlocks = xmlContent.match(blockRegex) || [];

  const elements: DocxBlockElement[] = [];
  const parsedParagraphs: DocxParagraph[] = [];
  let totalWords = 0;
  let tableCount = 0;
  let imageCount = 0;

  for (const blockXml of rawBlocks) {
    if (blockXml.startsWith('<w:tbl')) {
      // Table block
      const table = parseTableXml(blockXml);
      if (table.rows.length > 0) {
        elements.push({ type: 'table', table });
        tableCount++;
      }
    } else {
      // Paragraph block
      // Check for explicit page breaks
      if (blockXml.includes('<w:br w:type="page"/>')) {
        elements.push({ type: 'pageBreak' });
      }

      // Check for embedded images
      const blipMatch = blockXml.match(/<a:blip\s+[^>]*r:embed="([^"]*)"/i);
      if (blipMatch && imageRelMap.has(blipMatch[1])) {
        const imagePath = imageRelMap.get(blipMatch[1])!;
        const imageFile = zip.file(imagePath);
        if (imageFile) {
          try {
            const imgData = await imageFile.async('base64');
            const format = imagePath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
            elements.push({
              type: 'image',
              image: {
                dataUrl: `data:image/${format.toLowerCase()};base64,${imgData}`,
                format,
                widthMm: 120,
                heightMm: 75,
              },
            });
            imageCount++;
          } catch {
            // Ignore unreadable image data
          }
        }
      }

      const p = parseSingleParagraphXml(blockXml);
      if (p.text.trim() || p.runs.length > 0) {
        elements.push({ type: 'paragraph', paragraph: p });
        parsedParagraphs.push(p);

        const words = p.text.trim().split(/\s+/).filter(Boolean);
        totalWords += words.length;
      }
    }
  }

  // Generate High-Fidelity PDF using jsPDF
  const orientation = options.orientation || 'portrait';
  const format = options.pageSize || 'a4';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 18;
  const marginRight = 18;
  const marginTop = options.includeHeader ? 22 : 18;
  const marginBottom = options.includePageNumbers ? 18 : 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let currentY = marginTop;
  let pageNumber = 1;

  // Header drawing function
  const drawPageHeaderAndFooter = (pNum: number, totalP: number) => {
    if (options.includeHeader) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // slate-400
      const docTitle = safePdfAsciiText(
        options.documentTitle || file.name.replace(/\.docx$/i, '')
      );
      pdf.text(docTitle, marginLeft, 12);
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, 14, pageWidth - marginRight, 14);
    }

    if (options.includePageNumbers) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      const pageStr = `Page ${pNum} of ${totalP}`;
      pdf.text(pageStr, pageWidth - marginRight - pdf.getTextWidth(pageStr), pageHeight - 9);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);
    }
  };

  for (const el of elements) {
    if (el.type === 'pageBreak') {
      pdf.addPage(format, orientation);
      pageNumber++;
      currentY = marginTop;
      continue;
    }

    if (el.type === 'image') {
      const img = el.image;
      if (currentY + img.heightMm > pageHeight - marginBottom) {
        pdf.addPage(format, orientation);
        pageNumber++;
        currentY = marginTop;
      }

      try {
        const renderWidth = Math.min(img.widthMm, contentWidth);
        const renderHeight = (img.heightMm / img.widthMm) * renderWidth;
        const imgX = marginLeft + (contentWidth - renderWidth) / 2;
        pdf.addImage(img.dataUrl, img.format, imgX, currentY, renderWidth, renderHeight);
        currentY += renderHeight + 6;
      } catch {
        // Fallback if image format not supported by jsPDF
      }
      continue;
    }

    if (el.type === 'paragraph') {
      const p = el.paragraph;
      currentY += p.spaceBefore;

      let defaultFont = 'helvetica';
      let defaultStyle = 'normal';
      if (p.isHeading) {
        defaultStyle = 'bold';
      }

      pdf.setFont(defaultFont, defaultStyle);

      // Bullet rendering
      let bulletIndent = 0;
      if (p.isBullet) {
        bulletIndent = 6;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(71, 85, 105);
        if (currentY + 5 > pageHeight - marginBottom) {
          pdf.addPage(format, orientation);
          pageNumber++;
          currentY = marginTop;
        }
        pdf.text('•', marginLeft + 1.5, currentY + 3.8);
      }

      const availableWidth = contentWidth - bulletIndent;

      // Group paragraph text and calculate wrapped lines
      p.runs.forEach((run) => {
        if (!run.text.trim()) return;

        pdf.setFont(defaultFont, run.isBold && run.isItalic ? 'bolditalic' : run.isBold ? 'bold' : run.isItalic ? 'italic' : defaultStyle);
        pdf.setFontSize(run.fontSize);
        pdf.setTextColor(...run.color);

        const safeText = safePdfAsciiText(run.text);
        const wrappedLines = pdf.splitTextToSize(safeText, availableWidth);
        const lineH = Math.max(4.5, (run.fontSize * 0.3528) * 1.35);

        wrappedLines.forEach((line: string) => {
          if (currentY + lineH > pageHeight - marginBottom) {
            pdf.addPage(format, orientation);
            pageNumber++;
            currentY = marginTop;
          }

          let textX = marginLeft + bulletIndent;
          if (p.align === 'center') {
            const lineWidth = pdf.getTextWidth(line);
            textX = marginLeft + bulletIndent + (availableWidth - lineWidth) / 2;
          } else if (p.align === 'right') {
            const lineWidth = pdf.getTextWidth(line);
            textX = marginLeft + bulletIndent + (availableWidth - lineWidth);
          }

          pdf.text(line, textX, currentY + lineH * 0.75);
          currentY += lineH;
        });
      });

      currentY += p.spaceAfter;
      continue;
    }

    if (el.type === 'table') {
      const table = el.table;
      if (table.rows.length === 0) continue;

      const numCols = Math.max(1, table.colCount);
      const colWidth = contentWidth / numCols;
      const cellPadding = 2.5;

      currentY += 4; // Space before table

      table.rows.forEach((row, rIdx) => {
        // Compute wrapped lines for every cell in this row
        const cellLines: string[][] = [];
        for (let c = 0; c < numCols; c++) {
          const cell = row.cells[c];
          const rawVal = cell ? cell.text : '';
          const safeVal = safePdfAsciiText(rawVal);
          pdf.setFont('helvetica', row.isHeader ? 'bold' : 'normal');
          pdf.setFontSize(row.isHeader ? 9.5 : 8.5);
          const lines = pdf.splitTextToSize(safeVal, colWidth - cellPadding * 2);
          cellLines.push(lines.length > 0 ? lines : [' ']);
        }

        const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
        const lineHeight = 4.0;
        const rowHeight = Math.max(7.5, maxLines * lineHeight + cellPadding * 2);

        // Check for Page Overflow
        if (currentY + rowHeight > pageHeight - marginBottom) {
          pdf.addPage(format, orientation);
          pageNumber++;
          currentY = marginTop;
        }

        // Draw Cell Backgrounds & Borders
        for (let c = 0; c < numCols; c++) {
          const cell = row.cells[c];
          const cellX = marginLeft + c * colWidth;

          if (cell && cell.bgColor) {
            pdf.setFillColor(...cell.bgColor);
            pdf.rect(cellX, currentY, colWidth, rowHeight, 'F');
          } else if (row.isHeader) {
            pdf.setFillColor(241, 245, 249); // slate-100
            pdf.rect(cellX, currentY, colWidth, rowHeight, 'F');
          } else if (rIdx % 2 === 1) {
            pdf.setFillColor(250, 250, 250); // slight zebra
            pdf.rect(cellX, currentY, colWidth, rowHeight, 'F');
          }

          // Clean vector border
          pdf.setDrawColor(203, 213, 225); // slate-300
          pdf.setLineWidth(0.2);
          pdf.rect(cellX, currentY, colWidth, rowHeight, 'S');

          // Draw Cell Text
          pdf.setFont('helvetica', row.isHeader ? 'bold' : 'normal');
          pdf.setFontSize(row.isHeader ? 9 : 8.5);
          pdf.setTextColor(row.isHeader ? 15 : 51, row.isHeader ? 23 : 65, row.isHeader ? 42 : 85);

          const lines = cellLines[c];
          const startY = currentY + cellPadding + lineHeight * 0.75;
          lines.forEach((line, lIdx) => {
            if (!line.trim()) return;
            pdf.text(line, cellX + cellPadding, startY + lIdx * lineHeight);
          });
        }

        currentY += rowHeight;
      });

      currentY += 5; // Space after table
    }
  }

  // Stamp header & footer on all generated pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawPageHeaderAndFooter(p, totalPages);
  }

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.docx$/i, '');
  const pdfFileName = `${baseName}.pdf`;

  return {
    pdfBlob,
    pdfFileName,
    paragraphCount: parsedParagraphs.length,
    wordCount: totalWords,
    tableCount,
    imageCount,
    paragraphs: parsedParagraphs,
  };
}
