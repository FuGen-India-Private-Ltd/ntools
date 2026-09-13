// Client-Side Offline PDF Splitter & Page Extractor Engine
// Extracts pages, splits into single-page PDFs, or packages split pages into a ZIP archive

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { parsePageRange } from './pdfMerger';

export interface PdfSplitOptions {
  mode: 'range' | 'extract-all';
  pageRange?: string; // e.g. "1-4, 7"
  customFileName?: string;
}

export interface PdfSplitResult {
  blob: Blob;
  fileName: string;
  isZip: boolean;
  pageCount: number;
}

/**
 * Splits or extracts pages from a PDF file completely offline.
 */
export async function splitPdfFile(
  file: File,
  options: PdfSplitOptions
): Promise<PdfSplitResult> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (totalPages === 0) {
    throw new Error('This PDF has no readable pages.');
  }

  const baseName = file.name.replace(/\.pdf$/i, '');

  if (options.mode === 'range') {
    const indices = parsePageRange(options.pageRange, totalPages);
    if (indices.length === 0) {
      throw new Error('No valid pages found in the specified range.');
    }

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const fileName = options.customFileName?.trim()
      ? (options.customFileName.endsWith('.pdf') ? options.customFileName : `${options.customFileName}.pdf`)
      : `${baseName}-extracted.pdf`;

    return {
      blob,
      fileName,
      isZip: false,
      pageCount: newPdf.getPageCount(),
    };
  }

  // Extract all pages into a ZIP containing separate single-page PDFs
  const zip = new JSZip();

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(sourcePdf, [i]);
    singleDoc.addPage(page);

    const singleBytes = await singleDoc.save();
    const padIndex = String(i + 1).padStart(String(totalPages).length, '0');
    zip.file(`${baseName}-page-${padIndex}.pdf`, singleBytes);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    blob: zipBlob,
    fileName: `${baseName}-pages.zip`,
    isZip: true,
    pageCount: totalPages,
  };
}
