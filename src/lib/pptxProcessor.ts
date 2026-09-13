// Client-Side Offline PowerPoint (.pptx) to PDF Converter
// Extracts exact slide content, titles, formatting, bullet points, and generates high-fidelity presentation PDFs without altering text

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { sanitizeTypography, safePdfAsciiText } from './unicodeSanitizer';

export interface PptxSlideData {
  slideNumber: number;
  title?: string;
  paragraphs: string[];
  rawText: string;
}

export interface PptxProcessResult {
  pdfBlob: Blob;
  pdfFileName: string;
  slideCount: number;
  slides: PptxSlideData[];
}

function decodeXmlEntities(str: string): string {
  const decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return sanitizeTypography(decoded);
}

export async function processPptxFile(file: File): Promise<PptxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Check for legacy binary PowerPoint 97-2003 (.ppt) magic bytes: D0 CF 11 E0
  const uint8 = new Uint8Array(arrayBuffer.slice(0, 8));
  if (uint8[0] === 0xd0 && uint8[1] === 0xcf && uint8[2] === 0x11 && uint8[3] === 0xe0) {
    throw new Error(
      'This is a legacy binary PowerPoint .ppt file (PowerPoint 97-2003). Please save it as modern .pptx or use a .pptx file for PDF conversion.'
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error('Unable to read PowerPoint presentation. Please ensure it is a valid .pptx file.');
  }

  const slides: PptxSlideData[] = [];
  const slideXmlPaths: { path: string; num: number }[] = [];

  // Identify all slide XML files and sort them in numerical order
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideXmlPaths.push({ path: relativePath, num: parseInt(match[1], 10) });
    }
  });

  slideXmlPaths.sort((a, b) => a.num - b.num);

  if (slideXmlPaths.length === 0) {
    throw new Error('No readable slides found in this PowerPoint presentation.');
  }

  for (const { path: slidePath, num: slideNumber } of slideXmlPaths) {
    const fileEntry = zip.file(slidePath);
    if (!fileEntry) continue;

    const xmlContent = await fileEntry.async('string');
    const slideParagraphs: string[] = [];

    // Universal regex extraction for paragraphs: <a:p>...</a:p>
    const pMatches = xmlContent.match(/<a:p(?:\s+[^>]*)?>[\s\S]*?<\/a:p>/gi) || [];

    for (const pXml of pMatches) {
      // Extract all text elements inside <a:t>...</a:t>
      const tMatches = pXml.match(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi) || [];
      let pText = '';
      for (const tXml of tMatches) {
        const rawContent = tXml.replace(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/i, '$1');
        pText += decodeXmlEntities(rawContent);
      }

      const trimmed = pText.trim();
      if (trimmed.length > 0) {
        slideParagraphs.push(trimmed);
      }
    }

    const title = slideParagraphs.length > 0 && slideParagraphs[0].length < 100 ? slideParagraphs[0] : undefined;

    slides.push({
      slideNumber,
      title,
      paragraphs: slideParagraphs,
      rawText: slideParagraphs.join('\n'),
    });
  }

  // Generate 16:9 Landscape Presentation PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm
  const marginX = 18;
  const marginY = 16;
  const contentWidth = pageWidth - marginX * 2;

  slides.forEach((slide, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'landscape');
    }

    // Clean modern slide background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle slide header bar
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(0, 0, pageWidth, 12, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139); // slate-500
    const safeFileName = safePdfAsciiText(file.name.toUpperCase());
    pdf.text(
      `SLIDE ${slide.slideNumber} OF ${slides.length} | ${safeFileName}`,
      marginX,
      8
    );

    let currentY = marginY + 6;
    const maxUsableY = pageHeight - marginY - 6;

    if (slide.paragraphs.length === 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(12);
      pdf.setTextColor(148, 163, 184);
      pdf.text('(Visual slide or diagrams only)', marginX, 60);
    } else {
      slide.paragraphs.forEach((paragraph, pIdx) => {
        if (currentY > maxUsableY) return;

        const safeParagraph = safePdfAsciiText(paragraph);

        // If first paragraph is short, treat as Title
        if (pIdx === 0 && safeParagraph.length < 90) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(19);
          pdf.setTextColor(15, 23, 42); // slate-900

          const lines = pdf.splitTextToSize(safeParagraph, contentWidth);
          pdf.text(lines, marginX, currentY);
          currentY += lines.length * 9.5 + 4;

          // Accent underline under slide title
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.4);
          pdf.line(marginX, currentY - 2, marginX + contentWidth, currentY - 2);
          currentY += 4;
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12.5);
          pdf.setTextColor(30, 41, 59); // slate-800

          const bulletPrefix = '- ';
          const lines = pdf.splitTextToSize(`${bulletPrefix}${safeParagraph}`, contentWidth - 4);
          pdf.text(lines, marginX, currentY);
          currentY += lines.length * 6.8 + 3.5;
        }
      });
    }

    // Clean neutral slide pagination (Zero watermarks)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Slide ${slide.slideNumber}`, pageWidth - marginX - 12, pageHeight - 8);
  });

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.(pptx|ppt)$/i, '');
  const pdfFileName = `${baseName}.pdf`;

  return {
    pdfBlob,
    pdfFileName,
    slideCount: slides.length,
    slides,
  };
}
