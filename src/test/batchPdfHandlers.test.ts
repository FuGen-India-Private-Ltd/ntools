import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

describe('Multi-File PDF Batch Processing Suite', () => {
  it('creates multiple individual PDF documents and packages them into a ZIP archive', async () => {
    // 1. Generate 3 dummy PDF documents
    const filesToPackage: { fileName: string; blob: Blob }[] = [];

    for (let i = 1; i <= 3; i++) {
      const doc = await PDFDocument.create();
      const page = doc.addPage([400, 400]);
      page.drawText(`Document Page ${i}`);
      const bytes = await doc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      filesToPackage.push({
        fileName: `Document_${i}.pdf`,
        blob,
      });
    }

    expect(filesToPackage.length).toBe(3);

    // 2. Package into a ZIP archive using JSZip (the engine of saveMultipleFilesToPhone)
    const zip = new JSZip();
    for (const item of filesToPackage) {
      const buffer = await item.blob.arrayBuffer();
      zip.file(item.fileName, buffer);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(0);

    // 3. Verify ZIP contents
    const readZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const fileKeys = Object.keys(readZip.files);
    expect(fileKeys).toContain('Document_1.pdf');
    expect(fileKeys).toContain('Document_2.pdf');
    expect(fileKeys).toContain('Document_3.pdf');
  });

  it('merges multiple separate PDF documents into a single master PDF document', async () => {
    // 1. Create document A with 2 pages
    const docA = await PDFDocument.create();
    docA.addPage([500, 500]);
    docA.addPage([500, 500]);
    const bytesA = await docA.save();

    // 2. Create document B with 3 pages
    const docB = await PDFDocument.create();
    docB.addPage([500, 500]);
    docB.addPage([500, 500]);
    docB.addPage([500, 500]);
    const bytesB = await docB.save();

    // 3. Batch merge into 1 master document
    const masterDoc = await PDFDocument.create();

    const loadedA = await PDFDocument.load(bytesA);
    const pagesA = await masterDoc.copyPages(loadedA, loadedA.getPageIndices());
    pagesA.forEach((p) => masterDoc.addPage(p));

    const loadedB = await PDFDocument.load(bytesB);
    const pagesB = await masterDoc.copyPages(loadedB, loadedB.getPageIndices());
    pagesB.forEach((p) => masterDoc.addPage(p));

    expect(masterDoc.getPageCount()).toBe(5);

    const mergedBytes = await masterDoc.save();
    expect(mergedBytes.length).toBeGreaterThan(bytesA.length);
    expect(mergedBytes.length).toBeGreaterThan(bytesB.length);
  });
});
