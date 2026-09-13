// Client-Side Offline PDF Merger Engine
// Combines multiple PDF documents into a single document with optional page range selection and rotation

import { PDFDocument, degrees } from 'pdf-lib';

export interface PdfMergeInputItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  pageRange?: string; // e.g. "all", "1-3, 5" (1-indexed)
  rotationDegrees?: 0 | 90 | 180 | 270;
}

export interface PdfMergeResult {
  mergedBlob: Blob;
  fileName: string;
  totalPageCount: number;
  totalSizeBytes: number;
}

/**
 * Parses a page range string like "1-3, 5, 8-10" or "all" into 0-indexed page numbers.
 */
export function parsePageRange(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim() || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const selectedPages = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          selectedPages.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        selectedPages.add(p - 1);
      }
    }
  }

  const sorted = Array.from(selectedPages).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i);
}

/**
 * Inspects a PDF file and returns its total page count.
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Merges multiple PDF files in the order provided.
 */
export async function mergePdfFiles(
  items: PdfMergeInputItem[],
  outputFileName = 'merged-document.pdf'
): Promise<PdfMergeResult> {
  if (!items || items.length < 2) {
    throw new Error('Please select at least 2 PDF files to combine.');
  }

  const mergedPdf = await PDFDocument.create();

  for (const item of items) {
    const arrayBuffer = await item.file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    const pagesToCopyIndices = parsePageRange(item.pageRange, totalPages);
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pagesToCopyIndices);

    for (const page of copiedPages) {
      if (item.rotationDegrees) {
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + item.rotationDegrees) % 360));
      }
      mergedPdf.addPage(page);
    }
  }

  const mergedBytes = await mergedPdf.save();
  const mergedBlob = new Blob([mergedBytes as any], { type: 'application/pdf' });

  return {
    mergedBlob,
    fileName: outputFileName.endsWith('.pdf') ? outputFileName : `${outputFileName}.pdf`,
    totalPageCount: mergedPdf.getPageCount(),
    totalSizeBytes: mergedBlob.size,
  };
}
