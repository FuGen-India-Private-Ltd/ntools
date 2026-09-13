import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { compressPdfFile, PDF_COMPRESSION_LEVELS } from '../lib/pdfCompressor';

describe('PDF Compressor Engine Tests', () => {
  it('provides all 3 compression level profiles', () => {
    expect(PDF_COMPRESSION_LEVELS.low).toBeDefined();
    expect(PDF_COMPRESSION_LEVELS.medium).toBeDefined();
    expect(PDF_COMPRESSION_LEVELS.high).toBeDefined();
    expect(PDF_COMPRESSION_LEVELS.low.name).toContain('Low');
    expect(PDF_COMPRESSION_LEVELS.medium.name).toContain('Medium');
    expect(PDF_COMPRESSION_LEVELS.high.name).toContain('High');
  });

  it('compresses a real PDF document and returns valid blob', async () => {
    // Generate a test PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText('Kannada Converter & PDF Compression Test Document', { x: 50, y: 350 });
    const pdfBytes = await pdfDoc.save();

    const testFile = new File([pdfBytes.buffer as ArrayBuffer], 'test_document.pdf', { type: 'application/pdf' });

    const result = await compressPdfFile(testFile, { level: 'medium' });

    expect(result.originalFileName).toBe('test_document.pdf');
    expect(result.pageCount).toBe(1);
    expect(result.compressedBlob).toBeDefined();
    expect(result.compressedBlob.size).toBeGreaterThan(0);
    expect(result.compressedSize).toBeLessThanOrEqual(result.originalSize);
  });

  it('handles high compression level without throwing', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([500, 500]);
    const pdfBytes = await pdfDoc.save();
    const testFile = new File([pdfBytes.buffer as ArrayBuffer], 'high_comp.pdf', { type: 'application/pdf' });

    const result = await compressPdfFile(testFile, { level: 'high' });
    expect(result.level).toBe('high');
    expect(result.compressedBlob.size).toBeGreaterThan(0);
  });

  it('compresses multi-page documents across Low, Medium, and High levels', async () => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      const page = pdfDoc.addPage([600, 800]);
      page.drawText(`Page Content ${i + 1}`, { x: 50, y: 700 });
    }
    const pdfBytes = await pdfDoc.save();
    const testFile = new File([pdfBytes.buffer as ArrayBuffer], 'multipage_document.pdf', { type: 'application/pdf' });

    const lowRes = await compressPdfFile(testFile, { level: 'low' });
    expect(lowRes.pageCount).toBe(5);
    expect(lowRes.compressedBlob.size).toBeGreaterThan(0);

    const medRes = await compressPdfFile(testFile, { level: 'medium' });
    expect(medRes.pageCount).toBe(5);
    expect(medRes.compressedBlob.size).toBeGreaterThan(0);

    const highRes = await compressPdfFile(testFile, { level: 'high' });
    expect(highRes.pageCount).toBe(5);
    expect(highRes.compressedBlob.size).toBeGreaterThan(0);
  });
});
