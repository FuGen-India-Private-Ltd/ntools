// Client-Side Offline PowerPoint (.pptx) to PDF Converter
// Preserves slide presentation layouts, shape geometries, colored cards, borders, typography, and embedded slide images

import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { sanitizeTypography, safePdfAsciiText } from './unicodeSanitizer';

export interface PptxRun {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  fontSizePt: number;
  color: [number, number, number];
}

export interface PptxParagraph {
  runs: PptxRun[];
  text: string;
  isBullet: boolean;
  align: 'left' | 'center' | 'right';
}

export interface PptxShape {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fillColor?: [number, number, number];
  borderColor?: [number, number, number];
  paragraphs: PptxParagraph[];
  isTitle?: boolean;
}

export interface PptxImage {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  dataUrl: string;
  format: 'PNG' | 'JPEG';
}

export interface PptxSlideData {
  slideNumber: number;
  title?: string;
  paragraphs: string[];
  rawText: string;
  shapes: PptxShape[];
  images: PptxImage[];
  bgColor?: [number, number, number];
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

function parseHexColor(
  hexStr: string | null | undefined,
  defaultColor: [number, number, number] = [30, 41, 59]
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

// 1 mm = 36,000 EMUs
const EMU_PER_MM = 36000;

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
  } catch {
    throw new Error('Unable to read PowerPoint presentation. Please ensure it is a valid .pptx file.');
  }

  const slides: PptxSlideData[] = [];
  const slideXmlPaths: { path: string; num: number; relsPath: string }[] = [];

  // Identify all slide XML files and sort them in numerical order
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      slideXmlPaths.push({
        path: relativePath,
        num,
        relsPath: `ppt/slides/_rels/slide${num}.xml.rels`,
      });
    }
  });

  slideXmlPaths.sort((a, b) => a.num - b.num);

  if (slideXmlPaths.length === 0) {
    throw new Error('No readable slides found in this PowerPoint presentation.');
  }

  // Determine Presentation Dimensions (default 16:9 widescreen: 12192000 x 6858000 EMUs)
  let slideWidthEmu = 12192000;
  let slideHeightEmu = 6858000;
  const presEntry = zip.file('ppt/presentation.xml');
  if (presEntry) {
    const presXml = await presEntry.async('string');
    const sldSzMatch = presXml.match(/<p:sldSz\s+[^>]*cx="(\d+)"\s+cy="(\d+)"/i);
    if (sldSzMatch) {
      slideWidthEmu = parseInt(sldSzMatch[1], 10) || slideWidthEmu;
      slideHeightEmu = parseInt(sldSzMatch[2], 10) || slideHeightEmu;
    }
  }

  // Standard A4 Landscape PDF canvas: 297mm x 210mm
  const pdfPageWidth = 297;
  const pdfPageHeight = 210;
  const canvasMarginX = 14;
  const canvasMarginY = 12;
  const usableWidthMm = pdfPageWidth - canvasMarginX * 2;
  const usableHeightMm = pdfPageHeight - canvasMarginY * 2;

  // Coordinate mapping scale from PPTX EMU to PDF mm
  const scaleX = usableWidthMm / (slideWidthEmu / EMU_PER_MM);
  const scaleY = usableHeightMm / (slideHeightEmu / EMU_PER_MM);
  const scale = Math.min(scaleX, scaleY);

  const offsetX = canvasMarginX + (usableWidthMm - (slideWidthEmu / EMU_PER_MM) * scale) / 2;
  const offsetY = canvasMarginY + (usableHeightMm - (slideHeightEmu / EMU_PER_MM) * scale) / 2;

  for (const { path: slidePath, num: slideNumber, relsPath } of slideXmlPaths) {
    const fileEntry = zip.file(slidePath);
    if (!fileEntry) continue;

    const xmlContent = await fileEntry.async('string');

    // Parse image relationships for this slide
    const imageRelMap = new Map<string, string>();
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      const relsXml = await relsFile.async('string');
      const relMatches = relsXml.match(/<Relationship\s+[^>]*\/>/gi) || [];
      for (const rXml of relMatches) {
        const idMatch = rXml.match(/Id="([^"]*)"/i);
        const targetMatch = rXml.match(/Target="([^"]*)"/i);
        const typeMatch = rXml.match(/Type="([^"]*)"/i);
        if (idMatch && targetMatch && typeMatch && typeMatch[1].includes('image')) {
          let cleanTarget = targetMatch[1].replace(/^\.\.\//, 'ppt/');
          imageRelMap.set(idMatch[1], cleanTarget);
        }
      }
    }

    const slideShapes: PptxShape[] = [];
    const slideImages: PptxImage[] = [];
    const slideParagraphTexts: string[] = [];

    // 1. Extract Shapes: <p:sp>
    const shapeMatches = xmlContent.match(/<p:sp>[\s\S]*?<\/p:sp>/gi) || [];

    for (const spXml of shapeMatches) {
      // Geometry transform
      const offMatch = spXml.match(/<a:off\s+[^>]*x="(-?\d+)"\s+y="(-?\d+)"/i);
      const extMatch = spXml.match(/<a:ext\s+[^>]*cx="(\d+)"\s+cy="(\d+)"/i);

      let xMm = 15;
      let yMm = 20;
      let widthMm = 120;
      let heightMm = 40;

      if (offMatch && extMatch) {
        const rawX = parseInt(offMatch[1], 10);
        const rawY = parseInt(offMatch[2], 10);
        const rawCx = parseInt(extMatch[1], 10);
        const rawCy = parseInt(extMatch[2], 10);

        xMm = offsetX + (rawX / EMU_PER_MM) * scale;
        yMm = offsetY + (rawY / EMU_PER_MM) * scale;
        widthMm = Math.max(15, (rawCx / EMU_PER_MM) * scale);
        heightMm = Math.max(8, (rawCy / EMU_PER_MM) * scale);
      }

      // Background Fill Color
      let fillColor: [number, number, number] | undefined = undefined;
      const spPrMatch = spXml.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/i);
      const spPr = spPrMatch ? spPrMatch[1] : '';

      const fillMatch = spPr.match(/<a:solidFill>[\s\S]*?<a:srgbClr\s+[^>]*val="([A-F0-9]{6})"/i);
      if (fillMatch) {
        fillColor = parseHexColor(fillMatch[1]);
      }

      // Border Color
      let borderColor: [number, number, number] | undefined = undefined;
      const lnMatch = spPr.match(/<a:ln[\s\S]*?<a:srgbClr\s+[^>]*val="([A-F0-9]{6})"/i);
      if (lnMatch) {
        borderColor = parseHexColor(lnMatch[1]);
      }

      // Check if title placeholder
      const nvSpPr = spXml.match(/<p:nvSpPr>[\s\S]*?<\/p:nvSpPr>/i)?.[0] || '';
      const isTitle = Boolean(nvSpPr.match(/type="title"|type="ctrTitle"/i));

      // Paragraphs & Runs inside shape
      const pMatches = spXml.match(/<a:p(?:\s+[^>]*)?>[\s\S]*?<\/a:p>/gi) || [];
      const paragraphs: PptxParagraph[] = [];

      for (const pXml of pMatches) {
        const pPrMatch = pXml.match(/<a:pPr(?:\s+[^>]*)?>([\s\S]*?)<\/a:pPr>/i);
        const pPr = pPrMatch ? pPrMatch[1] : '';

        let align: 'left' | 'center' | 'right' = isTitle ? 'center' : 'left';
        if (pPr.includes('algn="ctr"')) align = 'center';
        else if (pPr.includes('algn="r"')) align = 'right';
        else if (pPr.includes('algn="l"')) align = 'left';

        const isBullet = Boolean(pPr.match(/<a:buChar|<a:buAutoNum/i));

        const runMatches = pXml.match(/<a:r(?:\s+[^>]*)?>[\s\S]*?<\/a:r>/gi) || [];
        const runs: PptxRun[] = [];

        for (const rXml of runMatches) {
          const rPr = rXml.match(/<a:rPr(?:\s+[^>]*)?>([\s\S]*?)<\/a:rPr>/i)?.[1] || '';
          const isBold = Boolean(rPr.match(/b="1"|<a:b\/>/i)) || isTitle;
          const isItalic = Boolean(rPr.match(/i="1"|<a:i\/>/i));

          let fontSizePt = isTitle ? 20 : 11;
          const szMatch = rPr.match(/sz="(\d+)"/i);
          if (szMatch) {
            fontSizePt = Math.max(8, parseInt(szMatch[1], 10) / 100);
          }

          let color: [number, number, number] = isTitle ? [15, 23, 42] : [51, 65, 85];
          const colorMatch = rPr.match(/<a:srgbClr\s+[^>]*val="([A-F0-9]{6})"/i);
          if (colorMatch) {
            color = parseHexColor(colorMatch[1], color);
          }

          const tMatches = rXml.match(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/gi) || [];
          let runText = '';
          for (const tXml of tMatches) {
            const rawContent = tXml.replace(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/i, '$1');
            runText += decodeXmlEntities(rawContent);
          }

          if (runText) {
            runs.push({
              text: runText,
              isBold,
              isItalic,
              fontSizePt,
              color,
            });
          }
        }

        const fullPText = runs.map((r) => r.text).join('').trim();
        if (fullPText) {
          paragraphs.push({
            runs,
            text: fullPText,
            isBullet,
            align,
          });
          slideParagraphTexts.push(fullPText);
        }
      }

      if (paragraphs.length > 0 || fillColor || borderColor) {
        slideShapes.push({
          xMm,
          yMm,
          widthMm,
          heightMm,
          fillColor,
          borderColor,
          paragraphs,
          isTitle,
        });
      }
    }

    // 2. Extract Embedded Pictures: <p:pic>
    const picMatches = xmlContent.match(/<p:pic>[\s\S]*?<\/p:pic>/gi) || [];
    for (const picXml of picMatches) {
      const blipMatch = picXml.match(/<a:blip\s+[^>]*r:embed="([^"]*)"/i);
      const offMatch = picXml.match(/<a:off\s+[^>]*x="(-?\d+)"\s+y="(-?\d+)"/i);
      const extMatch = picXml.match(/<a:ext\s+[^>]*cx="(\d+)"\s+cy="(\d+)"/i);

      if (blipMatch && imageRelMap.has(blipMatch[1])) {
        const imagePath = imageRelMap.get(blipMatch[1])!;
        const imgEntry = zip.file(imagePath);
        if (imgEntry) {
          try {
            const rawBase64 = await imgEntry.async('base64');
            const format = imagePath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';

            let xMm = 20;
            let yMm = 30;
            let widthMm = 80;
            let heightMm = 60;

            if (offMatch && extMatch) {
              const rawX = parseInt(offMatch[1], 10);
              const rawY = parseInt(offMatch[2], 10);
              const rawCx = parseInt(extMatch[1], 10);
              const rawCy = parseInt(extMatch[2], 10);
              xMm = offsetX + (rawX / EMU_PER_MM) * scale;
              yMm = offsetY + (rawY / EMU_PER_MM) * scale;
              widthMm = Math.max(10, (rawCx / EMU_PER_MM) * scale);
              heightMm = Math.max(10, (rawCy / EMU_PER_MM) * scale);
            }

            slideImages.push({
              xMm,
              yMm,
              widthMm,
              heightMm,
              dataUrl: `data:image/${format.toLowerCase()};base64,${rawBase64}`,
              format,
            });
          } catch {
            // Ignore unreadable picture
          }
        }
      }
    }

    const titleShape = slideShapes.find((s) => s.isTitle);
    const title = titleShape?.paragraphs[0]?.text || slideParagraphTexts[0];

    slides.push({
      slideNumber,
      title,
      paragraphs: slideParagraphTexts,
      rawText: slideParagraphTexts.join('\n'),
      shapes: slideShapes,
      images: slideImages,
    });
  }

  // Generate 16:9 Landscape Presentation PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  slides.forEach((slide, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'landscape');
    }

    // 1. Clean slide canvas background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pdfPageWidth, pdfPageHeight, 'F');

    // Subtle modern outer slide frame
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.5);
    pdf.rect(6, 6, pdfPageWidth - 12, pdfPageHeight - 12, 'S');

    // 2. Top slide header bar
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(6, 6, pdfPageWidth - 12, 11, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184); // slate-400
    const safeName = safePdfAsciiText(file.name.toUpperCase().replace(/\.PPTX$/i, ''));
    pdf.text(safeName, 12, 13.5);

    const slideNumStr = `SLIDE ${slide.slideNumber} OF ${slides.length}`;
    pdf.text(slideNumStr, pdfPageWidth - 12 - pdf.getTextWidth(slideNumStr), 13.5);

    // 3. Render Slide Embedded Images
    slide.images.forEach((img) => {
      try {
        pdf.addImage(img.dataUrl, img.format, img.xMm, img.yMm, img.widthMm, img.heightMm);
      } catch {
        // Fallback gracefully
      }
    });

    // 4. Render Slide Shapes, Cards, and Text Blocks
    if (slide.shapes.length > 0) {
      slide.shapes.forEach((shape) => {
        // Draw shape background fill
        if (shape.fillColor) {
          pdf.setFillColor(...shape.fillColor);
          pdf.roundedRect(shape.xMm, shape.yMm, shape.widthMm, shape.heightMm, 2, 2, 'F');
        }

        // Draw shape border
        if (shape.borderColor) {
          pdf.setDrawColor(...shape.borderColor);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(shape.xMm, shape.yMm, shape.widthMm, shape.heightMm, 2, 2, 'S');
        }

        // Render text lines inside shape
        let currentTextY = shape.yMm + (shape.isTitle ? 6 : 4.5);
        const paddingX = 3.0;

        shape.paragraphs.forEach((p) => {
          let defaultFont = 'helvetica';
          let defaultStyle = shape.isTitle ? 'bold' : 'normal';

          let bulletOffset = 0;
          if (p.isBullet) {
            bulletOffset = 4.5;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text('•', shape.xMm + paddingX, currentTextY + 2);
          }

          const maxTextW = Math.max(10, shape.widthMm - paddingX * 2 - bulletOffset);

          p.runs.forEach((run) => {
            pdf.setFont(
              defaultFont,
              run.isBold && run.isItalic ? 'bolditalic' : run.isBold ? 'bold' : run.isItalic ? 'italic' : defaultStyle
            );
            pdf.setFontSize(Math.min(22, Math.max(7.5, run.fontSizePt)));
            pdf.setTextColor(...run.color);

            const safeText = safePdfAsciiText(run.text);
            const wrapped = pdf.splitTextToSize(safeText, maxTextW);
            const lineH = Math.max(3.8, run.fontSizePt * 0.42);

            wrapped.forEach((line: string) => {
              let drawX = shape.xMm + paddingX + bulletOffset;
              if (p.align === 'center') {
                const lineW = pdf.getTextWidth(line);
                drawX = shape.xMm + paddingX + bulletOffset + Math.max(0, (maxTextW - lineW) / 2);
              } else if (p.align === 'right') {
                const lineW = pdf.getTextWidth(line);
                drawX = shape.xMm + paddingX + bulletOffset + Math.max(0, maxTextW - lineW);
              }

              pdf.text(line, drawX, currentTextY + lineH * 0.7);
              currentTextY += lineH;
            });
          });

          currentTextY += 1.5;
        });
      });
    } else {
      // Fallback layout if presentation has unpositioned raw text
      let currentY = 28;
      if (slide.title) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(15, 23, 42);
        pdf.text(safePdfAsciiText(slide.title), 18, currentY);
        currentY += 10;
      }

      slide.paragraphs.forEach((pText) => {
        if (pText === slide.title) return;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(51, 65, 85);
        const wrapped = pdf.splitTextToSize(safePdfAsciiText(pText), pdfPageWidth - 36);
        wrapped.forEach((line: string) => {
          pdf.text(line, 18, currentY);
          currentY += 5.5;
        });
        currentY += 2;
      });
    }
  });

  const pdfBlob = pdf.output('blob');
  const baseName = file.name.replace(/\.pptx$/i, '');
  const pdfFileName = `${baseName}.pdf`;

  return {
    pdfBlob,
    pdfFileName,
    slideCount: slides.length,
    slides,
  };
}
