// Client-Side Offline PDF Compressor Engine
// Traverses PDFRawStream XObjects, downsamples & re-encodes embedded images via Canvas, packs object streams, and removes redundancy

import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from 'pdf-lib';

export type PdfCompressionLevel = 'low' | 'medium' | 'high';

export interface PdfCompressionOptions {
  level: PdfCompressionLevel;
  targetSizeKb?: number; // e.g. 200 for government portals (< 200 KB)
}

export interface PdfCompressionResult {
  id: string;
  originalFileName: string;
  originalSize: number;
  compressedBlob: Blob;
  compressedSize: number;
  reductionPercentage: number;
  level: PdfCompressionLevel;
  pageCount: number;
  imagesOptimized?: number;
}

export const PDF_COMPRESSION_LEVELS: Record<
  PdfCompressionLevel,
  {
    name: string;
    description: string;
    badgeColor: string;
    estimatedSavings: string;
  }
> = {
  low: {
    name: 'Low Compression (High Quality)',
    description: 'Light image optimization and object stream packing. Best for text, official forms, and contracts.',
    badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    estimatedSavings: '20% – 40% reduction',
  },
  medium: {
    name: 'Medium Compression (Balanced)',
    description: 'Balanced canvas resampling and JPEG stream re-encoding. Recommended for general documents, scanned papers, and email attachments.',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    estimatedSavings: '40% – 65% reduction',
  },
  high: {
    name: 'High Compression (Maximum Savings)',
    description: 'Aggressive image downsampling and stream compression. Best for large PDF files that must fit strict portal limits.',
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30',
    estimatedSavings: '60% – 85% reduction',
  },
};

export const COMMON_TARGET_PRESETS = [
  { label: '< 200 KB', targetKb: 200, note: 'Govt & Job Portals' },
  { label: '< 500 KB', targetKb: 500, note: 'Applications & Forms' },
  { label: '< 1 MB', targetKb: 1024, note: 'Email Attachments' },
  { label: '< 2 MB', targetKb: 2048, note: 'Standard Uploads' },
];

/**
 * Re-encodes and downsamples raw image bytes via HTML5 Canvas
 */
async function recompressImageBytes(
  imageBytes: Uint8Array,
  quality: number,
  maxDimension: number
): Promise<{ compressedBytes: Uint8Array; width: number; height: number } | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  // Check format: JPEG magic bytes: 0xFF, 0xD8, 0xFF
  const isJpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
  // PNG magic bytes: 0x89, 0x50, 0x4E, 0x47
  const isPng =
    imageBytes[0] === 0x89 &&
    imageBytes[1] === 0x50 &&
    imageBytes[2] === 0x4e &&
    imageBytes[3] === 0x47;

  if (!isJpeg && !isPng) {
    return null;
  }

  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
  const blob = new Blob([imageBytes as any], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = objectUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width === 0 || height === 0) {
      return null;
    }

    // Downscale if larger than maxDimension
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill white background for clean JPEG without dark artifacts
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!compressedBlob) return null;

    const arrayBuffer = await compressedBlob.arrayBuffer();
    const compressedBytes = new Uint8Array(arrayBuffer);

    // Only return if it actually saves space
    if (compressedBytes.length < imageBytes.length * 0.95) {
      return { compressedBytes, width, height };
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses a PDF file 100% client-side:
 * - Traverses embedded XObject images and re-encodes them via Canvas
 * - Preserves all vector text, fonts, tables, and document layout
 * - Packs object streams and strips unreferenced metadata
 */
export async function compressPdfFile(
  file: File,
  options: PdfCompressionOptions = { level: 'medium' }
): Promise<PdfCompressionResult> {
  if (!file || file.size === 0) {
    throw new Error('Please select a valid non-empty PDF file.');
  }

  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // 1. Load the original PDF with safe parsing parameters
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(uint8, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: false,
    });
  } catch (loadErr: any) {
    try {
      pdfDoc = await PDFDocument.load(uint8, {
        ignoreEncryption: true,
      });
    } catch {
      throw new Error(
        'Unable to open PDF: The file may be password-protected or have an unsupported encryption format.'
      );
    }
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('The selected PDF contains no pages.');
  }

  // 2. Set Compression Parameters
  let quality = 0.70;
  let maxDimension = 1400;

  if (options.level === 'low') {
    quality = 0.85;
    maxDimension = 2048;
  } else if (options.level === 'high') {
    quality = 0.50;
    maxDimension = 1024;
  }

  // Adaptive Target Size limits
  if (options.targetSizeKb) {
    const targetBytes = options.targetSizeKb * 1024;
    if (originalSize > targetBytes) {
      const ratio = targetBytes / originalSize;
      if (ratio < 0.25) {
        quality = 0.38;
        maxDimension = 800;
      } else if (ratio < 0.5) {
        quality = 0.50;
        maxDimension = 1100;
      } else if (ratio < 0.75) {
        quality = 0.65;
        maxDimension = 1300;
      }
    }
  }

  let imagesOptimized = 0;

  // 3. Enumerate and Compress Embedded Image XObjects
  try {
    const indirectObjects = pdfDoc.context.enumerateIndirectObjects();

    for (const [, obj] of indirectObjects) {
      if (!(obj instanceof PDFRawStream)) continue;

      const dict = obj.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (subtype?.toString() !== '/Image') continue;

      const rawBytes = obj.contents;
      if (!rawBytes || rawBytes.length < 20000) {
        // Skip tiny icons or stamps under 20KB
        continue;
      }

      const recompressed = await recompressImageBytes(rawBytes, quality, maxDimension);
      if (recompressed) {
        const { compressedBytes, width, height } = recompressed;

        // Replace raw stream in-place
        (obj as any).contents = compressedBytes;

        dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
        dict.set(PDFName.of('Length'), PDFNumber.of(compressedBytes.length));
        dict.set(PDFName.of('Width'), PDFNumber.of(width));
        dict.set(PDFName.of('Height'), PDFNumber.of(height));
        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
        dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
        dict.delete(PDFName.of('DecodeParms'));

        imagesOptimized++;
      }
    }
  } catch (err) {
    console.warn('XObject image compression step encountered an issue, proceeding with stream optimization:', err);
  }

  // 4. Clean unneeded metadata
  try {
    if (options.level === 'high' || (options.targetSizeKb && originalSize > options.targetSizeKb * 1024)) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('nTools High-Fidelity Engine');
    }
  } catch {
    // Ignore metadata write error
  }

  // 5. Pack object streams
  let compressedBytes: Uint8Array;
  try {
    compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
  } catch {
    compressedBytes = await pdfDoc.save({
      useObjectStreams: false,
    });
  }

  let finalBlob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  let compressedSize = finalBlob.size;

  // If compression resulted in a larger file (rare, heavily pre-compressed), safely use original
  if (compressedSize >= originalSize) {
    finalBlob = file;
    compressedSize = originalSize;
  }

  const reductionPercentage =
    originalSize > 0 ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100)) : 0;

  return {
    id: `comp-${Date.now()}`,
    originalFileName: file.name,
    originalSize,
    compressedBlob: finalBlob,
    compressedSize,
    reductionPercentage,
    level: options.level,
    pageCount,
    imagesOptimized,
  };
}
