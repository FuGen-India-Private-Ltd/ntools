// High-Performance Client-Side Image Compressor & Optimizer
// Multi-Format (JPEG, PNG, WebP), Target KB Limiter, Aspect Ratio Lock, and Batch ZIP

import JSZip from 'jszip';
import { downloadBlob } from './docxProcessor';

export type OutputImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImageCompressionOptions {
  quality: number; // 0 to 1 (e.g. 0.8 for 80%)
  format: OutputImageFormat;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  targetMaxKb?: number; // Optional limit (e.g. 500 for 500KB)
}

export interface CompressedImageItem {
  id: string;
  originalFile: File;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  compressedBlob: Blob;
  compressedSize: number;
  compressedWidth: number;
  compressedHeight: number;
  previewUrl: string;
  format: OutputImageFormat;
  reductionPercentage: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function compressSingleImage(
  file: File,
  options: ImageCompressionOptions
): Promise<CompressedImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const originalWidth = img.width;
          const originalHeight = img.height;

          let targetWidth = originalWidth;
          let targetHeight = originalHeight;

          if (options.maxWidth && options.maxWidth < originalWidth) {
            targetWidth = options.maxWidth;
            if (options.maintainAspectRatio !== false) {
              targetHeight = Math.round((originalHeight * targetWidth) / originalWidth);
            }
          }

          if (options.maxHeight && options.maxHeight < targetHeight) {
            targetHeight = options.maxHeight;
            if (options.maintainAspectRatio !== false) {
              targetWidth = Math.round((originalWidth * targetHeight) / originalHeight);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context is not available');
          }

          // Handle PNG transparency if saving as JPEG
          if (options.format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Determine quality, solving for targetMaxKb if specified
          let currentQuality = Math.min(Math.max(options.quality, 0.05), 1.0);

          let blob: Blob | null = await new Promise((res) =>
            canvas.toBlob(res, options.format, currentQuality)
          );

          if (!blob) {
            throw new Error('Failed to generate image blob');
          }

          // If target KB limit is set and output exceeds it, iteratively optimize
          if (options.targetMaxKb && options.format !== 'image/png') {
            const targetBytes = options.targetMaxKb * 1024;
            let iterations = 0;
            while (blob.size > targetBytes && currentQuality > 0.1 && iterations < 5) {
              iterations++;
              currentQuality = Math.max(0.08, currentQuality * 0.75);
              const nextBlob: Blob | null = await new Promise((res) =>
                canvas.toBlob(res, options.format, currentQuality)
              );
              if (nextBlob) {
                blob = nextBlob;
              }
            }
          }

          const reduction = Math.max(
            0,
            Math.round(((file.size - blob.size) / file.size) * 100)
          );

          const previewUrl = URL.createObjectURL(blob);

          resolve({
            id: Math.random().toString(36).substring(2, 9),
            originalFile: file,
            originalSize: file.size,
            originalWidth,
            originalHeight,
            compressedBlob: blob,
            compressedSize: blob.size,
            compressedWidth: targetWidth,
            compressedHeight: targetHeight,
            previewUrl,
            format: options.format,
            reductionPercentage: reduction,
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Invalid or corrupted image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function compressBatchImages(
  files: File[],
  options: ImageCompressionOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<CompressedImageItem[]> {
  const results: CompressedImageItem[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const item = await compressSingleImage(files[i], options);
      results.push(item);
    } catch (e) {
      console.warn(`Failed to compress ${files[i].name}`, e);
    }
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }
  return results;
}

export async function downloadBatchAsZip(
  items: CompressedImageItem[],
  zipFileName: string = 'Compressed_Images.zip'
) {
  const zip = new JSZip();

  items.forEach((item, index) => {
    let extension = 'jpg';
    if (item.format === 'image/png') extension = 'png';
    else if (item.format === 'image/webp') extension = 'webp';

    const baseName = item.originalFile.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_optimized_${index + 1}.${extension}`;
    zip.file(fileName, item.compressedBlob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipFileName);
}
