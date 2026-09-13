// Client-Side Offline Multi-Image to PDF Converter Engine
// Combines multiple images (JPEG, PNG, WebP, GIF) into high-fidelity multi-page PDF documents

import { jsPDF } from 'jspdf';
import { saveAndDownloadFile } from './fileDownloader';

export interface ImageToPdfItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export type PageFormatOption = 'fit' | 'a4_portrait' | 'a4_landscape' | 'letter_portrait';

export interface ImageToPdfOptions {
  pageFormat: PageFormatOption;
  marginMm: number; // 0, 5, 10
  quality: number; // 0.8 - 1.0
}

/**
 * Loads an image file and retrieves its dimensions and base64/object URL
 */
export async function loadImageDetails(file: File): Promise<ImageToPdfItem> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 600,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`Failed to decode image file: ${file.name}`));
    };
    img.src = previewUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  options: ImageToPdfOptions = { pageFormat: 'a4_portrait', marginMm: 5, quality: 0.95 }
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('Please select at least one image to create a PDF.');
  }

  // Create initial jsPDF instance
  let pdf: jsPDF | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dataUrl = await fileToDataUrl(item.file);
    const imgType = item.file.type.includes('png') ? 'PNG' : 'JPEG';

    let pageWidth = 210;
    let pageHeight = 297;
    let orientation: 'portrait' | 'landscape' = 'portrait';
    let pdfFormat: any = 'a4';

    if (options.pageFormat === 'fit') {
      // Convert pixels to mm (at 72 DPI: 1px = 0.3528 mm)
      pageWidth = Math.max(50, Math.round(item.width * 0.264583));
      pageHeight = Math.max(50, Math.round(item.height * 0.264583));
      orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';
      pdfFormat = [pageWidth, pageHeight];
    } else if (options.pageFormat === 'a4_landscape') {
      pageWidth = 297;
      pageHeight = 210;
      orientation = 'landscape';
      pdfFormat = 'a4';
    } else if (options.pageFormat === 'letter_portrait') {
      pageWidth = 215.9;
      pageHeight = 279.4;
      orientation = 'portrait';
      pdfFormat = 'letter';
    } else {
      // Default: A4 Portrait
      pageWidth = 210;
      pageHeight = 297;
      orientation = 'portrait';
      pdfFormat = 'a4';
    }

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pdfFormat,
      });
    } else {
      pdf!.addPage(pdfFormat, orientation);
    }

    const margin = options.pageFormat === 'fit' ? 0 : options.marginMm;
    const maxDrawW = pageWidth - margin * 2;
    const maxDrawH = pageHeight - margin * 2;

    // Calculate aspect ratio fit inside bounding box
    const imgAspect = item.width / item.height;
    const boxAspect = maxDrawW / maxDrawH;

    let drawW = maxDrawW;
    let drawH = maxDrawH;

    if (imgAspect > boxAspect) {
      drawW = maxDrawW;
      drawH = maxDrawW / imgAspect;
    } else {
      drawH = maxDrawH;
      drawW = maxDrawH * imgAspect;
    }

    const drawX = margin + (maxDrawW - drawW) / 2;
    const drawY = margin + (maxDrawH - drawH) / 2;

    pdf!.addImage(dataUrl, imgType, drawX, drawY, drawW, drawH, undefined, 'FAST');
  }

  return pdf!.output('blob');
}

export function downloadImagesPdf(pdfBlob: Blob, baseName: string = 'Combined_Images') {
  saveAndDownloadFile(pdfBlob, `${baseName}.pdf`, 'application/pdf');
}
